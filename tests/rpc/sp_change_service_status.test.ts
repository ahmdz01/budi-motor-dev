import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestCustomer } from '../helpers/createTestCustomer';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_change_service_status', () => {
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let kasir: Awaited<ReturnType<typeof createTestUser>>;
  let mekanikA: Awaited<ReturnType<typeof createTestUser>>;
  let mekanikB: Awaited<ReturnType<typeof createTestUser>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;

  const serviceIds: string[] = [];

  beforeAll(async () => {
    admin = await createTestUser({ roleCode: 'admin', name: 'Test Admin' });
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
    mekanikA = await createTestUser({ roleCode: 'mekanik', name: 'Test Mekanik A' });
    mekanikB = await createTestUser({ roleCode: 'mekanik', name: 'Test Mekanik B' });
    customer = await createTestCustomer();
  });

  afterAll(async () => {
    for (const id of serviceIds) {
      await supabaseAdmin.from('service_status_history').delete().eq('service_id', id);
      await supabaseAdmin.from('services').delete().eq('id', id);
    }
    await customer.cleanup();
    await mekanikB.cleanup();
    await mekanikA.cleanup();
    await kasir.cleanup();
    await admin.cleanup();
  });

  async function createWaitingService() {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Test status transisi',
      p_customer_type_used: 'service',
    });
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);
    return serviceId;
  }

  it('Kasir bisa assign mekanik: Waiting -> In Progress', async () => {
    const serviceId = await createWaitingService();

    const { data, error } = await kasir.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanikA.userId,
    });

    expect(error).toBeNull();
    expect(data![0].status).toBe('in_progress');

    const { data: service } = await supabaseAdmin
      .from('services')
      .select('status, mechanic_id')
      .eq('id', serviceId)
      .single();

    expect(service!.status).toBe('in_progress');
    expect(service!.mechanic_id).toBe(mekanikA.userId);
  });

  it('Assign mekanik TANPA pilih mekanik ditolak', async () => {
    const serviceId = await createWaitingService();

    const { error } = await kasir.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: null,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Mekanik wajib dipilih');
  });

  it('Mekanik yang ditugaskan bisa selesaikan servis: In Progress -> Completed', async () => {
    const serviceId = await createWaitingService();
    await kasir.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanikA.userId,
    });

    const { data, error } = await mekanikA.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'completed',
    });

    expect(error).toBeNull();
    expect(data![0].status).toBe('completed');
  });

  it('Mekanik LAIN (bukan yang ditugaskan) TIDAK BOLEH selesaikan servis', async () => {
    const serviceId = await createWaitingService();
    await kasir.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanikA.userId,
    });

    const { error } = await mekanikB.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'completed',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Admin/Owner boleh batalkan servis dari status Waiting, WAJIB isi alasan', async () => {
    const serviceId = await createWaitingService();

    const withoutReason = await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'cancelled',
    });
    expect(withoutReason.error).not.toBeNull();
    expect(withoutReason.error!.message).toContain('Alasan pembatalan wajib diisi');

    const { data, error } = await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'cancelled',
      p_reason: 'Pelanggan batal, motor dibawa pulang',
    });

    expect(error).toBeNull();
    expect(data![0].status).toBe('cancelled');
  });

  it('Kasir TIDAK BOLEH batalkan servis (hanya Owner/Admin/Super Admin)', async () => {
    const serviceId = await createWaitingService();

    const { error } = await kasir.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'cancelled',
      p_reason: 'Coba batalkan oleh kasir',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Transisi status yang tidak valid ditolak (misal Completed -> In Progress)', async () => {
    const serviceId = await createWaitingService();
    await kasir.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanikA.userId,
    });
    await mekanikA.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'completed',
    });

    const { error } = await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanikA.userId,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('tidak diizinkan');
  });
});