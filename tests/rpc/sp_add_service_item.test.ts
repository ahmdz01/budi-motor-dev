import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestProduct } from '../helpers/createTestProduct';
import { createTestCustomer } from '../helpers/createTestCustomer';
import { seedStock } from '../helpers/seedStock';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_add_service_item', () => {
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let kasir: Awaited<ReturnType<typeof createTestUser>>;
  let mekanikA: Awaited<ReturnType<typeof createTestUser>>;
  let mekanikB: Awaited<ReturnType<typeof createTestUser>>;
  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;

  const serviceIds: string[] = [];

  beforeAll(async () => {
    admin = await createTestUser({ roleCode: 'admin', name: 'Test Admin' });
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
    mekanikA = await createTestUser({ roleCode: 'mekanik', name: 'Test Mekanik A' });
    mekanikB = await createTestUser({ roleCode: 'mekanik', name: 'Test Mekanik B' });
    product = await createTestProduct({ createdBy: admin.userId });
    customer = await createTestCustomer();
    // Modal Rp30.000/pcs, stok 10 — cukup untuk beberapa test.
    await seedStock(admin.client, product.productId, 10, 30000);
  });

  afterAll(async () => {
    for (const id of serviceIds) {
      await supabaseAdmin.from('service_status_history').delete().eq('service_id', id);
      await supabaseAdmin
        .from('stock_consumptions')
        .delete()
        .in(
          'service_item_id',
          (
            await supabaseAdmin.from('service_items').select('id').eq('service_id', id)
          ).data?.map((i) => i.id) ?? []
        );
      await supabaseAdmin.from('service_items').delete().eq('service_id', id);
      await supabaseAdmin.from('services').delete().eq('id', id);
    }
    await customer.cleanup();
    await product.cleanup();
    await mekanikB.cleanup();
    await mekanikA.cleanup();
    await kasir.cleanup();
    await admin.cleanup();
  });

  async function createInProgressService(mechanicId: string) {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Test tambah item',
      p_customer_type_used: 'service',
    });
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mechanicId,
    });

    return serviceId;
  }

  it('Mekanik yang ditugaskan bisa tambah item produk, stok FIFO terpotong', async () => {
    const serviceId = await createInProgressService(mekanikA.userId);

    const { data, error } = await mekanikA.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'product',
      p_product_id: product.productId,
      p_qty: 3,
    });

    expect(error).toBeNull();
    expect(data![0].subtotal).toBe(3 * 55000); // harga tier 'service'

    const { data: batches } = await supabaseAdmin
      .from('inventory_batches')
      .select('qty_sisa')
      .eq('product_id', product.productId)
      .eq('status', 'active');

    const totalSisa = batches!.reduce((sum, b) => sum + b.qty_sisa, 0);
    expect(totalSisa).toBe(7); // 10 - 3
  });

  it('Mekanik bisa tambah item jasa (labor) dengan harga manual', async () => {
    const serviceId = await createInProgressService(mekanikA.userId);

    const { data, error } = await mekanikA.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'labor',
      p_name: 'Jasa bongkar mesin',
      p_price: 50000,
      p_qty: 1,
    });

    expect(error).toBeNull();
    expect(data![0].subtotal).toBe(50000);
  });

  it('Mekanik LAIN (bukan yang ditugaskan) TIDAK BOLEH tambah item', async () => {
    const serviceId = await createInProgressService(mekanikA.userId);

    const { error } = await mekanikB.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'labor',
      p_name: 'Jasa nyelonong',
      p_price: 10000,
      p_qty: 1,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Stok tidak cukup ditolak dengan pesan jelas', async () => {
    const serviceId = await createInProgressService(mekanikA.userId);

    const { error } = await mekanikA.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'product',
      p_product_id: product.productId,
      p_qty: 999,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Stok tidak cukup');
  });

  it('Item TIDAK BOLEH ditambah kalau servis belum berstatus Dikerjakan', async () => {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Servis masih Waiting',
      p_customer_type_used: 'service',
    });
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    const { error } = await mekanikA.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'labor',
      p_name: 'Jasa apapun',
      p_price: 10000,
      p_qty: 1,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Dikerjakan');
  });
});