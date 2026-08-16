import { supabaseAdmin } from './supabaseTestClients';

interface TestProductOptions {
  createdBy: string;
  prices?: { general: number; service: number; workshop: number };
}

export async function createTestProduct({
  createdBy,
  prices = { general: 50000, service: 55000, workshop: 45000 },
}: TestProductOptions) {
  const name = `TEST_PRODUCT_${Date.now()}`;

  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .insert({ name, created_by: createdBy })
    .select('id')
    .single();

  if (productError) throw new Error(`Gagal membuat test product: ${productError.message}`);

  const { error: priceError } = await supabaseAdmin.from('product_prices').insert([
    { product_id: product.id, price_type: 'general', price_value: prices.general, updated_by: createdBy },
    { product_id: product.id, price_type: 'service', price_value: prices.service, updated_by: createdBy },
    { product_id: product.id, price_type: 'workshop', price_value: prices.workshop, updated_by: createdBy },
  ]);

  if (priceError) throw new Error(`Gagal membuat harga test product: ${priceError.message}`);

  return {
    productId: product.id,
    name,
    prices,
    async cleanup() {
      // Urutan penting: hapus anak (batch/consumptions) sebelum produknya.
      await supabaseAdmin.from('product_prices').delete().eq('product_id', product.id);
      await supabaseAdmin.from('inventory_batches').delete().eq('product_id', product.id);
      await supabaseAdmin.from('products').delete().eq('id', product.id);
    },
  };
}