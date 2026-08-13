import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestProduct } from '../helpers/createTestProduct';
import { createTestCustomer } from '../helpers/createTestCustomer';
import { seedStock } from '../helpers/seedStock';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_send_service_estimate', () => {
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
    await seedStock(admin.client, product.productId, 10, 30000);
  });

  afterAll(async () => {
    for (const id of serviceIds) {
      await supabaseAdmin.from('service_status_history').delete().eq('service_id', id);
      await supabaseAdmin.from('service_items').delete().eq('service_id', id);
      await supabaseAdmin.from('services').delete().eq('id', id);
    }
    await customer.cleanup();
    await product.cleanup();
    await mekanik.cleanup();
    await kasir.cleanup();
    await admin.cleanup();
  });

  async function createInProgressServiceWithItem() {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Test estimasi',
      p_customer_type_used: 'service',
    });
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanik.userId,
    });

    await mekanik.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'labor',
      p_name: 'Jasa servis besar',
      p_price: 100000,
      p_qty: 1,
    });

    return serviceId;
  }

  // CATATAN: test ini DIDUGA akan gagal karena sp_send_service_estimate
  // (migrasi 0023) diduga kena Kelas Bug #1 — RETURNS TABLE (status
  // varchar) membuat "status" jadi OUT parameter, sementara query
  // "select status into v_current_status from public.services" di
  // dalam function TIDAK pakai alias tabel. Kalau test ini gagal
  // dengan pesan "ambiguous", itu MENGKONFIRMASI bug, BUKAN test yang
  // salah tulis — jangan diubah supaya "lolos", laporkan ke saya.
  it('Kasir bisa kirim estimasi, status jadi Menunggu Persetujuan', async () => {
    const serviceId = await createInProgressServiceWithItem();

    const { data, error } = await kasir.client.rpc('sp_send_service_estimate', {
      p_service_id: serviceId,
      p_notes: 'Estimasi awal',
    });

    expect(error).toBeNull();
    expect(data![0].status).toBe('pending_approval');
  });

  it('Estimasi TIDAK BOLEH dikirim kalau belum ada item sama sekali', async () => {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Belum ada item',
      p_customer_type_used: 'service',
    });
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanik.userId,
    });

    const { error } = await kasir.client.rpc('sp_send_service_estimate', {
      p_service_id: serviceId,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Tambahkan minimal 1 item');
  });

  it('Mekanik TIDAK BOLEH kirim estimasi (bukan tugasnya)', async () => {
    const serviceId = await createInProgressServiceWithItem();

    const { error } = await mekanik.client.rpc('sp_send_service_estimate', {
      p_service_id: serviceId,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });
});