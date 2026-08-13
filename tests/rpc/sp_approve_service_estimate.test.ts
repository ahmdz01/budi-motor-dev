import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestProduct } from '../helpers/createTestProduct';
import { createTestCustomer } from '../helpers/createTestCustomer';
import { seedStock } from '../helpers/seedStock';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_approve_service_estimate', () => {
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

  async function createPendingApprovalService() {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Test approval',
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
      p_name: 'Jasa untuk approval',
      p_price: 80000,
      p_qty: 1,
    });

    await kasir.client.rpc('sp_send_service_estimate', { p_service_id: serviceId });

    return serviceId;
  }

  // CATATAN: sama seperti sp_send_service_estimate, RPC ini juga
  // RETURNS TABLE (status varchar) dengan query tanpa alias di
  // dalamnya — diduga kena bug ambiguous-column yang sama.
  it('Kasir catat pelanggan SETUJU, status balik ke Dikerjakan', async () => {
    const serviceId = await createPendingApprovalService();

    const { data, error } = await kasir.client.rpc('sp_approve_service_estimate', {
      p_service_id: serviceId,
      p_approved: true,
    });

    expect(error).toBeNull();
    expect(data![0].status).toBe('in_progress');
  });

  it('Kasir catat pelanggan TOLAK, status tetap balik ke Dikerjakan (bukan dibatalkan)', async () => {
    const serviceId = await createPendingApprovalService();

    const { data, error } = await kasir.client.rpc('sp_approve_service_estimate', {
      p_service_id: serviceId,
      p_approved: false,
      p_reason: 'Harga terlalu mahal menurut pelanggan',
    });

    expect(error).toBeNull();
    expect(data![0].status).toBe('in_progress');

    const { data: history } = await supabaseAdmin
      .from('service_status_history')
      .select('reason')
      .eq('service_id', serviceId)
      .eq('status_to', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(history!.reason).toContain('menolak');
  });

  it('TIDAK BOLEH approve servis yang statusnya bukan Menunggu Persetujuan', async () => {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Masih waiting',
      p_customer_type_used: 'service',
    });
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    const { error } = await kasir.client.rpc('sp_approve_service_estimate', {
      p_service_id: serviceId,
      p_approved: true,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('menunggu persetujuan');
  });
});