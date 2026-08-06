import { supabaseAdmin } from './supabaseTestClients';

export async function createTestSupplier() {
  const name = `TEST_SUPPLIER_${Date.now()}`;

  const { data: supplier, error } = await supabaseAdmin
    .from('suppliers')
    .insert({ name, default_payment_term_days: 30 })
    .select('id')
    .single();

  if (error) throw new Error(`Gagal membuat test supplier: ${error.message}`);

  return {
    supplierId: supplier.id,
    async cleanup() {
      await supabaseAdmin.from('suppliers').delete().eq('id', supplier.id);
    },
  };
}