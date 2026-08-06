import { supabaseAdmin } from './supabaseTestClients';

export async function createTestCustomer() {
  const phoneNumber = `0000${Date.now()}c`;

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .insert({ phone_number: phoneNumber, name: 'Test Customer', customer_type: 'service' })
    .select('id')
    .single();

  if (error) throw new Error(`Gagal membuat test customer: ${error.message}`);

  return {
    customerId: customer.id,
    async cleanup() {
      await supabaseAdmin.from('customers').delete().eq('id', customer.id);
    },
  };
}