import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestProduct } from '../helpers/createTestProduct';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_stock_opname_adjust', () => {
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let kasir: Awaited<ReturnType<typeof createTestUser>>;

  const products: Array<Awaited<ReturnType<typeof createTestProduct>>> = [];
  const sessionIds: string[] = [];

  beforeAll(async () => {
    admin = await createTestUser({ roleCode: 'admin', name: 'Test Admin' });
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
  });

  afterAll(async () => {
    // stock_opname_items WAJIB dihapus dulu — dia yang referensi ke
    // product_id DAN ke inventory_batches (lewat adjustment_batch_id),
    // jadi harus hilang sebelum batch/produknya dihapus.
    for (const p of products) {
      await supabaseAdmin.from('stock_opname_items').delete().eq('product_id', p.productId);
    }
    for (const sessionId of sessionIds) {
      await supabaseAdmin.from('stock_opname_sessions').delete().eq('id', sessionId);
    }
    for (const p of products) {
      await p.cleanup();
    }
    await kasir.cleanup();
    await admin.cleanup();
  });

  async function newProduct() {
    const p = await createTestProduct({ createdBy: admin.userId });
    products.push(p);
    return p;
  }

  async function totalStok(productId: string) {
    const { data } = await supabaseAdmin
      .from('inventory_batches')
      .select('qty_sisa')
      .eq('product_id', productId)
      .eq('status', 'active');
    return (data ?? []).reduce((sum, r) => sum + r.qty_sisa, 0);
  }

  it('Kasir TIDAK BOLEH melakukan stock opname (bukan tugasnya)', async () => {
    const product = await newProduct();

    const { error } = await kasir.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [{ product_id: product.productId, stok_fisik: 5, harga_beli_baru: 10000 }],
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Daftar barang kosong ditolak', async () => {
    const { error } = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [],
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Minimal 1 barang');
  });

  it('Stok fisik negatif ditolak', async () => {
    const product = await newProduct();

    const { error } = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [{ product_id: product.productId, stok_fisik: -1, harga_beli_baru: 10000 }],
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('tidak boleh negatif');
  });

  it('Selisih LEBIH tanpa harga_beli_baru ditolak', async () => {
    const product = await newProduct(); // stok sistem awal = 0

    const { error } = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [{ product_id: product.productId, stok_fisik: 10, reason: 'Lupa isi harga' }], // tanpa harga_beli_baru
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Harga beli wajib diisi');
  });

  it('Stok Awal dari 0 (selisih lebih): batch baru dibuat sesuai harga_beli_baru', async () => {
    const product = await newProduct();

    const { data, error } = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Stok Awal Test',
      p_items: [
        {
          product_id: product.productId,
          stok_fisik: 20,
          harga_beli_baru: 10000,
          reason: 'Stok awal',
        },
      ],
    });

    expect(error).toBeNull();
    const sessionId = data![0].session_id;
    sessionIds.push(sessionId);

    const { data: session } = await supabaseAdmin
      .from('stock_opname_sessions')
      .select('status, scope_value')
      .eq('id', sessionId)
      .single();
    expect(session!.status).toBe('completed');
    expect(session!.scope_value).toBe('Stok Awal Test');

    const { data: item } = await supabaseAdmin
      .from('stock_opname_items')
      .select('stok_sistem, stok_fisik, selisih, adjustment_batch_id')
      .eq('session_id', sessionId)
      .eq('product_id', product.productId)
      .single();
    expect(item!.stok_sistem).toBe(0);
    expect(item!.stok_fisik).toBe(20);
    expect(item!.selisih).toBe(20);
    expect(item!.adjustment_batch_id).toBeTruthy();

    const { data: batch } = await supabaseAdmin
      .from('inventory_batches')
      .select('source_type, qty_awal, qty_sisa, harga_beli, status')
      .eq('id', item!.adjustment_batch_id)
      .single();
    expect(batch!.source_type).toBe('adjustment');
    expect(batch!.qty_awal).toBe(20);
    expect(batch!.qty_sisa).toBe(20);
    expect(Number(batch!.harga_beli)).toBe(10000);
    expect(batch!.status).toBe('active');

    expect(await totalStok(product.productId)).toBe(20);
  });

  it('Selisih PAS (stok fisik = stok sistem): TIDAK ada batch baru, adjustment_batch_id null', async () => {
    const product = await newProduct();

    // Opname pertama: bikin stok jadi 15.
    const first = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [{ product_id: product.productId, stok_fisik: 15, harga_beli_baru: 9000 }],
    });
    sessionIds.push(first.data![0].session_id);

    const { data: batchesBefore } = await supabaseAdmin
      .from('inventory_batches')
      .select('id')
      .eq('product_id', product.productId);
    const jumlahBatchSebelum = batchesBefore!.length;

    // Opname kedua: fisik dihitung lagi, hasilnya SAMA (15) -> selisih 0.
    const second = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [{ product_id: product.productId, stok_fisik: 15, reason: 'Cek ulang, sesuai' }],
    });
    expect(second.error).toBeNull();
    sessionIds.push(second.data![0].session_id);

    const { data: item } = await supabaseAdmin
      .from('stock_opname_items')
      .select('stok_sistem, stok_fisik, selisih, adjustment_batch_id')
      .eq('session_id', second.data![0].session_id)
      .eq('product_id', product.productId)
      .single();
    expect(item!.stok_sistem).toBe(15);
    expect(item!.selisih).toBe(0);
    expect(item!.adjustment_batch_id).toBeNull();

    const { data: batchesAfter } = await supabaseAdmin
      .from('inventory_batches')
      .select('id')
      .eq('product_id', product.productId);
    expect(batchesAfter!.length).toBe(jumlahBatchSebelum); // tidak ada batch baru
    expect(await totalStok(product.productId)).toBe(15);
  });

  it('Selisih KURANG, cukup dari 1 batch: qty_sisa berkurang, batch tetap active', async () => {
    const product = await newProduct();

    const seed = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [{ product_id: product.productId, stok_fisik: 10, harga_beli_baru: 8000 }],
    });
    sessionIds.push(seed.data![0].session_id);

    const { data, error } = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [
        { product_id: product.productId, stok_fisik: 6, reason: 'Ada barang rusak/hilang' },
      ],
    });
    expect(error).toBeNull();
    sessionIds.push(data![0].session_id);

    const { data: batch } = await supabaseAdmin
      .from('inventory_batches')
      .select('qty_sisa, status')
      .eq('product_id', product.productId)
      .single();
    expect(batch!.qty_sisa).toBe(6);
    expect(batch!.status).toBe('active'); // belum habis, jadi tetap active

    expect(await totalStok(product.productId)).toBe(6);
  });

  it('Selisih KURANG lintas 2 batch (FIFO): batch pertama habis (depleted), sisanya diambil dari batch kedua', async () => {
    const product = await newProduct();

    // Batch A: 5 unit @ 8.000 (dibuat lebih dulu).
    const seedA = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [{ product_id: product.productId, stok_fisik: 5, harga_beli_baru: 8000 }],
    });
    sessionIds.push(seedA.data![0].session_id);

    // Batch B: nambah 7 unit lagi @ 15.000 (stok sistem 5 -> fisik 12, selisih +7).
    const seedB = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [{ product_id: product.productId, stok_fisik: 12, harga_beli_baru: 15000 }],
    });
    sessionIds.push(seedB.data![0].session_id);

    const { data: batchesSetelahSeed } = await supabaseAdmin
      .from('inventory_batches')
      .select('id, harga_beli, received_at')
      .eq('product_id', product.productId)
      .order('received_at', { ascending: true });
    expect(batchesSetelahSeed).toHaveLength(2);
    const batchAId = batchesSetelahSeed![0].id;
    const batchBId = batchesSetelahSeed![1].id;

    // Opname: fisik ternyata cuma 3 (dari total 12) -> selisih -9.
    // Harus habiskan batch A (5) dulu, baru ambil 4 dari batch B.
    const { data, error } = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'manual',
      p_scope_value: 'Test',
      p_items: [
        { product_id: product.productId, stok_fisik: 3, reason: 'Selisih besar, dicek ulang' },
      ],
    });
    expect(error).toBeNull();
    sessionIds.push(data![0].session_id);

    const { data: batchA } = await supabaseAdmin
      .from('inventory_batches')
      .select('qty_sisa, status')
      .eq('id', batchAId)
      .single();
    expect(batchA!.qty_sisa).toBe(0);
    expect(batchA!.status).toBe('depleted');

    const { data: batchB } = await supabaseAdmin
      .from('inventory_batches')
      .select('qty_sisa, status')
      .eq('id', batchBId)
      .single();
    expect(batchB!.qty_sisa).toBe(3);
    expect(batchB!.status).toBe('active');

    const { data: item } = await supabaseAdmin
      .from('stock_opname_items')
      .select('reason, adjustment_batch_id')
      .eq('session_id', data![0].session_id)
      .eq('product_id', product.productId)
      .single();
    expect(item!.reason).toContain('Dikurangi dari 2 batch (FIFO)');
    expect(item!.adjustment_batch_id).toBe(batchBId); // batch TERAKHIR yang disentuh

    expect(await totalStok(product.productId)).toBe(3);
  });

  it('Multi-item dalam 1 sesi: beberapa produk diproses sekaligus dengan session_id yang sama', async () => {
    const productA = await newProduct();
    const productB = await newProduct();

    const { data, error } = await admin.client.rpc('sp_stock_opname_adjust', {
      p_scope_type: 'category',
      p_scope_value: 'Oli & Sparepart',
      p_items: [
        { product_id: productA.productId, stok_fisik: 8, harga_beli_baru: 7000 },
        { product_id: productB.productId, stok_fisik: 4, harga_beli_baru: 9000 },
      ],
    });

    expect(error).toBeNull();
    const sessionId = data![0].session_id;
    sessionIds.push(sessionId);

    const { data: items } = await supabaseAdmin
      .from('stock_opname_items')
      .select('product_id, session_id, stok_fisik')
      .eq('session_id', sessionId)
      .order('stok_fisik', { ascending: false });

    expect(items).toHaveLength(2);
    expect(items!.every((i) => i.session_id === sessionId)).toBe(true);
    expect(items![0].product_id).toBe(productA.productId);
    expect(items![0].stok_fisik).toBe(8);
    expect(items![1].product_id).toBe(productB.productId);
    expect(items![1].stok_fisik).toBe(4);

    expect(await totalStok(productA.productId)).toBe(8);
    expect(await totalStok(productB.productId)).toBe(4);
  });
});
