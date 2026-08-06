import type { SupabaseClient } from '@supabase/supabase-js';

// Sengaja pakai sp_stock_opname_adjust, BUKAN sp_record_purchase —
// sesuai aturan yang sudah dipelajari: stok awal/seed bukan pembelian
// riil dari supplier, jadi tidak boleh bikin catatan hutang palsu.
export async function seedStock(
  client: SupabaseClient,
  productId: string,
  qty: number,
  hargaBeli: number
) {
  const { error } = await client.rpc('sp_stock_opname_adjust', {
    p_scope_type: 'manual',
    p_scope_value: 'Test Seed',
    p_items: [
      {
        product_id: productId,
        stok_fisik: qty,
        harga_beli_baru: hargaBeli,
        reason: 'Seed stok untuk automated test',
      },
    ],
  });

  if (error) throw new Error(`Gagal seed stok: ${error.message}`);
}