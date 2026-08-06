import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestProduct } from '../helpers/createTestProduct';
import { createTestCustomer } from '../helpers/createTestCustomer';
import { seedStock } from '../helpers/seedStock';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_confirm_service_payment', () => {
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let kasir: Awaited<ReturnType<typeof createTestUser>>;
  let mekanik: Awaited<ReturnType<typeof createTestUser>>;
  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;

  const serviceIds: string[] = [];

  beforeAll(async () => {
    admin = await createTestUser({ roleCode: 'admin', name: 'Test Admin' });
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
    mekanik = await createTestUser({ roleCode: 'mekanik', name: 'Test Mekanik' });
    product = await createTestProduct({ createdBy: admin.userId });
    customer = await createTestCustomer();
    // Modal Rp30.000/pcs.
    await seedStock(admin.client, product.productId, 10, 30000);
  });

  afterAll(async () => {
    for (const id of serviceIds) {
      await supabaseAdmin.from('service_status_history').delete().eq('service_id', id);
      await supabaseAdmin.from('service_items').delete().eq('service_id', id);
      await supabaseAdmin
        .from('transaction_items')
        .delete()
        .in(
          'transaction_id',
          (
            await supabaseAdmin.from('transactions').select('id').eq('service_id', id)
          ).data?.map((t) => t.id) ?? []
        );
      await supabaseAdmin.from('transactions').delete().eq('service_id', id);
      await supabaseAdmin.from('services').delete().eq('id', id);
    }
    await customer.cleanup();
    await product.cleanup();
    await mekanik.cleanup();
    await kasir.cleanup();
    await admin.cleanup();
  });

  async function createReadyService() {
    const { data: created, error: createError } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Ganti oli dan servis ringan',
      p_customer_type_used: 'service',
      p_is_warranty_claim: false,
    });
    if (createError) throw new Error(`sp_create_service gagal: ${createError.message}`);
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    const assign = await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanik.userId,
    });
    if (assign.error) {
      throw new Error(`sp_change_service_status (waiting->in_progress) gagal: ${assign.error.message}`);
    }

    const addProduct = await mekanik.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'product',
      p_product_id: product.productId,
      p_qty: 2,
    });
    if (addProduct.error) {
      throw new Error(`sp_add_service_item (produk) gagal: ${addProduct.error.message}`);
    }

    const addLabor = await mekanik.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'labor',
      p_name: 'Jasa ganti oli',
      p_price: 20000,
      p_qty: 1,
    });
    if (addLabor.error) {
      throw new Error(`sp_add_service_item (jasa) gagal: ${addLabor.error.message}`);
    }

    const complete = await mekanik.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'completed',
    });
    if (complete.error) {
      throw new Error(`sp_change_service_status (in_progress->completed) gagal: ${complete.error.message}`);
    }

    return serviceId;
  }

  it('Kasir bisa konfirmasi pembayaran servis, transaksi masuk Source of Truth', async () => {
    const serviceId = await createReadyService();

    const { data, error } = await kasir.client.rpc('sp_confirm_service_payment', {
      p_service_id: serviceId,
      p_client_uuid: crypto.randomUUID(),
      p_payment_method: 'cash',
      p_amount_received: 120000, // (2 x 50.000) + 20.000
    });

    expect(error).toBeNull();
    expect(data![0].total_amount).toBe(120000);
    expect(data![0].change_amount).toBe(0);

    const { data: tx } = await admin.client
      .from('transactions')
      .select('source, service_id, total_amount')
      .eq('id', data![0].transaction_id)
      .single();

    expect(tx!.source).toBe('service');
    expect(tx!.service_id).toBe(serviceId);

    const { data: ledger } = await admin.client
      .from('financial_ledger')
      .select('category, amount')
      .eq('reference_type', 'transaction')
      .eq('reference_id', data![0].transaction_id);

    const cashEntry = ledger!.find((l) => l.category === 'cash');
    const profitEntry = ledger!.find((l) => l.category === 'profit');

    expect(cashEntry!.amount).toBe(120000);
    // Profit = 120.000 - HPP produk (2 x 30.000 = 60.000) - HPP jasa (0) = 60.000.
    expect(Number(profitEntry!.amount)).toBe(60000);
  });

  it('Mekanik TIDAK BOLEH konfirmasi pembayaran (bukan tugasnya)', async () => {
    const serviceId = await createReadyService();

    const { error } = await mekanik.client.rpc('sp_confirm_service_payment', {
      p_service_id: serviceId,
      p_client_uuid: crypto.randomUUID(),
      p_payment_method: 'cash',
      p_amount_received: 120000,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Servis yang belum Selesai (in_progress) ditolak saat konfirmasi bayar', async () => {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Servis belum selesai',
      p_customer_type_used: 'service',
    });
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanik.userId,
    });

    const { error } = await kasir.client.rpc('sp_confirm_service_payment', {
      p_service_id: serviceId,
      p_client_uuid: crypto.randomUUID(),
      p_payment_method: 'cash',
      p_amount_received: 100000,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Selesai');
  });

  it('client_uuid dipanggil 2x TIDAK membuat transaksi ganda (idempotency)', async () => {
    const serviceId = await createReadyService();
    const clientUuid = crypto.randomUUID();

    const first = await kasir.client.rpc('sp_confirm_service_payment', {
      p_service_id: serviceId,
      p_client_uuid: clientUuid,
      p_payment_method: 'cash',
      p_amount_received: 120000,
    });

    const second = await kasir.client.rpc('sp_confirm_service_payment', {
      p_service_id: serviceId,
      p_client_uuid: clientUuid,
      p_payment_method: 'cash',
      p_amount_received: 120000,
    });

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(second.data![0].transaction_id).toBe(first.data![0].transaction_id);

    const { count } = await admin.client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', serviceId)
      .eq('source', 'service');

    expect(count).toBe(1);
  });
});