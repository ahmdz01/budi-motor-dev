import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestCustomer } from '../helpers/createTestCustomer';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_create_service', () => {
  let kasir: Awaited<ReturnType<typeof createTestUser>>;
  let mekanik: Awaited<ReturnType<typeof createTestUser>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;

  const serviceIds: string[] = [];

  beforeAll(async () => {
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
    mekanik = await createTestUser({ roleCode: 'mekanik', name: 'Test Mekanik' });
    customer = await createTestCustomer();
  });

  afterAll(async () => {
    for (const id of serviceIds) {
      await supabaseAdmin.from('service_status_history').delete().eq('service_id', id);
      await supabaseAdmin.from('services').delete().eq('id', id);
    }
    await customer.cleanup();
    await mekanik.cleanup();
    await kasir.cleanup();
  });

  it('Kasir bisa terima kendaraan servis, status awal Waiting', async () => {
    const { data, error } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Motor tidak mau starter',
      p_customer_type_used: 'service',
      p_is_warranty_claim: false,
    });

    expect(error).toBeNull();
    const serviceId = data![0].service_id;
    serviceIds.push(serviceId);

    const { data: service } = await supabaseAdmin
      .from('services')
      .select('status, complaint')
      .eq('id', serviceId)
      .single();

    expect(service!.status).toBe('waiting');
    expect(service!.complaint).toBe('Motor tidak mau starter');

    const { data: history } = await supabaseAdmin
      .from('service_status_history')
      .select('status_from, status_to')
      .eq('service_id', serviceId)
      .single();

    expect(history!.status_from).toBeNull();
    expect(history!.status_to).toBe('waiting');
  });

  it('Mekanik TIDAK BOLEH terima kendaraan servis (bukan tugasnya)', async () => {
    const { error } = await mekanik.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Ganti oli',
      p_customer_type_used: 'service',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Keluhan kosong ditolak', async () => {
    const { error } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'ab',
      p_customer_type_used: 'service',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Keluhan');
  });

  it('client_uuid dipanggil 2x TIDAK membuat servis ganda (idempotency)', async () => {
    const clientUuid = crypto.randomUUID();

    const first = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: clientUuid,
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Servis idempotency test',
      p_customer_type_used: 'service',
    });
    serviceIds.push(first.data![0].service_id);

    const second = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: clientUuid,
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Servis idempotency test',
      p_customer_type_used: 'service',
    });

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(second.data![0].service_id).toBe(first.data![0].service_id);
  });
});