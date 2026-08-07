import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestProduct } from '../helpers/createTestProduct';
import { createTestSupplier } from '../helpers/createTestSupplier';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_record_purchase', () => {
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let kasir: Awaited<ReturnType<typeof createTestUser>>;
  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let product2: Awaited<ReturnType<typeof createTestProduct>>;
  let supplier: Awaited<ReturnType<typeof createTestSupplier>>;

  const purchaseIds: string[] = [];

  beforeAll(async () => {
    admin = await createTestUser({ roleCode: 'admin', name: 'Test Admin' });
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
    product = await createTestProduct({ createdBy: admin.userId });
    product2 = await createTestProduct({ createdBy: admin.userId });
    supplier = await createTestSupplier();
  });

  afterAll(async () => {
    for (const purchaseId of purchaseIds) {
      const { data: items } = await supabaseAdmin
        .from('purchase_items')
        .select('id')
        .eq('purchase_id', purchaseId);
      const itemIds = items?.map((i) => i.id) ?? [];
      if (itemIds.length > 0) {
        await supabaseAdmin.from('inventory_batches').delete().in('purchase_item_id', itemIds);
      }

      await supabaseAdmin
        .from('financial_ledger')
        .delete()
        .eq('reference_type', 'purchase')
        .eq('reference_id', purchaseId);
      await supabaseAdmin.from('supplier_debts').delete().eq('purchase_id', purchaseId);
      await supabaseAdmin.from('purchase_items').delete().eq('purchase_id', purchaseId);
      await supabaseAdmin.from('purchases').delete().eq('id', purchaseId);
    }
    await supplier.cleanup();
    await product2.cleanup();
    await product.cleanup();
    await kasir.cleanup();
    await admin.cleanup();
  });

  it('Pembelian LUNAS: batch stok masuk, TIDAK ada hutang, ledger restock tercatat negatif', async () => {
    const { data, error } = await admin.client.rpc('sp_record_purchase', {
      p_client_uuid: crypto.randomUUID(),
      p_supplier_id: supplier.supplierId,
      p_purchase_date: new Date().toISOString().slice(0, 10),
      p_items: [{ product_id: product.productId, qty: 10, unit_price: 8000 }],
      p_amount_paid: 80000,
    });

    expect(error).toBeNull();
    const purchaseId = data![0].purchase_id;
    purchaseIds.push(purchaseId);

    const { data: purchaseRow } = await supabaseAdmin
      .from('purchases')
      .select('payment_status, total_amount, amount_paid')
      .eq('id', purchaseId)
      .single();
    expect(purchaseRow!.payment_status).toBe('paid');
    expect(Number(purchaseRow!.total_amount)).toBe(80000);

    const { data: debt } = await supabaseAdmin
      .from('supplier_debts')
      .select('id')
      .eq('purchase_id', purchaseId)
      .maybeSingle();
    expect(debt).toBeNull();

    const { data: batch } = await supabaseAdmin
      .from('inventory_batches')
      .select('qty_awal, qty_sisa, harga_beli, status')
      .eq('product_id', product.productId)
      .eq('source_type', 'purchase')
      .order('received_at', { ascending: false })
      .limit(1)
      .single();
    expect(batch!.qty_awal).toBe(10);
    expect(batch!.qty_sisa).toBe(10);
    expect(Number(batch!.harga_beli)).toBe(8000);
    expect(batch!.status).toBe('active');

    const { data: ledger } = await supabaseAdmin
      .from('financial_ledger')
      .select('category, amount')
      .eq('reference_type', 'purchase')
      .eq('reference_id', purchaseId)
      .single();
    expect(ledger!.category).toBe('restock');
    expect(Number(ledger!.amount)).toBe(-80000);
  });

  it('Pembelian SEBAGIAN: status partial, hutang dibuat, due_date fallback dari default_payment_term_days supplier', async () => {
    const purchaseDate = new Date().toISOString().slice(0, 10);

    const { data, error } = await admin.client.rpc('sp_record_purchase', {
      p_client_uuid: crypto.randomUUID(),
      p_supplier_id: supplier.supplierId,
      p_purchase_date: purchaseDate,
      p_items: [{ product_id: product.productId, qty: 10, unit_price: 8000 }], // total 80.000
      p_amount_paid: 30000,
      // p_due_date TIDAK diisi -> harus fallback ke purchase_date + default_payment_term_days (30 hari)
    });

    expect(error).toBeNull();
    const purchaseId = data![0].purchase_id;
    purchaseIds.push(purchaseId);

    const { data: purchaseRow } = await supabaseAdmin
      .from('purchases')
      .select('payment_status')
      .eq('id', purchaseId)
      .single();
    expect(purchaseRow!.payment_status).toBe('partial');

    const expectedDueDate = new Date(purchaseDate);
    expectedDueDate.setDate(expectedDueDate.getDate() + 30);
    const expectedDueDateStr = expectedDueDate.toISOString().slice(0, 10);

    const { data: debt } = await supabaseAdmin
      .from('supplier_debts')
      .select('total_tagihan, total_dibayar, due_date, status')
      .eq('purchase_id', purchaseId)
      .single();
    expect(Number(debt!.total_tagihan)).toBe(80000);
    expect(Number(debt!.total_dibayar)).toBe(30000);
    expect(debt!.due_date).toBe(expectedDueDateStr);
    expect(debt!.status).toBe('unpaid');
  });

  it('Pembelian TANPA BAYAR sama sekali: status unpaid, hutang dibuat, TIDAK ada entry ledger restock', async () => {
    const { data, error } = await admin.client.rpc('sp_record_purchase', {
      p_client_uuid: crypto.randomUUID(),
      p_supplier_id: supplier.supplierId,
      p_purchase_date: new Date().toISOString().slice(0, 10),
      p_items: [{ product_id: product.productId, qty: 5, unit_price: 8000 }],
      p_amount_paid: 0,
    });

    expect(error).toBeNull();
    const purchaseId = data![0].purchase_id;
    purchaseIds.push(purchaseId);

    const { data: purchaseRow } = await supabaseAdmin
      .from('purchases')
      .select('payment_status')
      .eq('id', purchaseId)
      .single();
    expect(purchaseRow!.payment_status).toBe('unpaid');

    const { data: debt } = await supabaseAdmin
      .from('supplier_debts')
      .select('id')
      .eq('purchase_id', purchaseId)
      .maybeSingle();
    expect(debt).not.toBeNull();

    const { data: ledger } = await supabaseAdmin
      .from('financial_ledger')
      .select('id')
      .eq('reference_type', 'purchase')
      .eq('reference_id', purchaseId)
      .maybeSingle();
    expect(ledger).toBeNull(); // belum ada uang keluar sama sekali -> tidak boleh ada catatan ledger
  });

  it('Kasir TIDAK BOLEH input Barang Masuk (bukan tugasnya, cuma Owner/Admin/Super Admin)', async () => {
    const { error } = await kasir.client.rpc('sp_record_purchase', {
      p_client_uuid: crypto.randomUUID(),
      p_supplier_id: supplier.supplierId,
      p_purchase_date: new Date().toISOString().slice(0, 10),
      p_items: [{ product_id: product.productId, qty: 1, unit_price: 8000 }],
      p_amount_paid: 8000,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Daftar barang kosong ditolak', async () => {
    const { error } = await admin.client.rpc('sp_record_purchase', {
      p_client_uuid: crypto.randomUUID(),
      p_supplier_id: supplier.supplierId,
      p_purchase_date: new Date().toISOString().slice(0, 10),
      p_items: [],
      p_amount_paid: 0,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Minimal 1 barang');
  });

  it('Jumlah dibayar melebihi total pembelian ditolak', async () => {
    const { error } = await admin.client.rpc('sp_record_purchase', {
      p_client_uuid: crypto.randomUUID(),
      p_supplier_id: supplier.supplierId,
      p_purchase_date: new Date().toISOString().slice(0, 10),
      p_items: [{ product_id: product.productId, qty: 1, unit_price: 8000 }], // total 8.000
      p_amount_paid: 9000, // lebih besar dari total
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Jumlah dibayar tidak valid');
  });

  it('Multi-item: 2 produk berbeda dalam 1 pembelian, total & batch masing-masing benar', async () => {
    const { data, error } = await admin.client.rpc('sp_record_purchase', {
      p_client_uuid: crypto.randomUUID(),
      p_supplier_id: supplier.supplierId,
      p_purchase_date: new Date().toISOString().slice(0, 10),
      p_items: [
        { product_id: product.productId, qty: 4, unit_price: 8000 }, // 32.000
        { product_id: product2.productId, qty: 3, unit_price: 15000 }, // 45.000
      ],
      p_amount_paid: 77000, // pas lunas
    });

    expect(error).toBeNull();
    const purchaseId = data![0].purchase_id;
    purchaseIds.push(purchaseId);

    const { data: purchaseRow } = await supabaseAdmin
      .from('purchases')
      .select('total_amount, payment_status')
      .eq('id', purchaseId)
      .single();
    expect(Number(purchaseRow!.total_amount)).toBe(77000);
    expect(purchaseRow!.payment_status).toBe('paid');

    const { data: batch1 } = await supabaseAdmin
      .from('inventory_batches')
      .select('qty_awal, harga_beli')
      .eq('product_id', product.productId)
      .eq('source_type', 'purchase')
      .order('received_at', { ascending: false })
      .limit(1)
      .single();
    expect(batch1!.qty_awal).toBe(4);
    expect(Number(batch1!.harga_beli)).toBe(8000);

    const { data: batch2 } = await supabaseAdmin
      .from('inventory_batches')
      .select('qty_awal, harga_beli')
      .eq('product_id', product2.productId)
      .eq('source_type', 'purchase')
      .order('received_at', { ascending: false })
      .limit(1)
      .single();
    expect(batch2!.qty_awal).toBe(3);
    expect(Number(batch2!.harga_beli)).toBe(15000);
  });

  // Test ini SENGAJA tidak berasumsi RPC sudah benar atau salah — dia
  // memanggil 2x dengan client_uuid sama, lalu melaporkan HASIL SEBENARNYA
  // dengan jelas. Kalau ternyata tidak idempotent, test ini GAGAL dengan
  // pesan diagnostik lengkap (bukan cuma "expected X received Y" yang
  // membingungkan) — supaya langsung kelihatan ini temuan arsitektur,
  // bukan sekadar assertion yang salah.
  it('client_uuid sama dipanggil 2x WAJIB idempotent (tidak boleh dobel/gagal)', async () => {
    const clientUuid = crypto.randomUUID();
    const params = {
      p_client_uuid: clientUuid,
      p_supplier_id: supplier.supplierId,
      p_purchase_date: new Date().toISOString().slice(0, 10),
      p_items: [{ product_id: product.productId, qty: 3, unit_price: 10000 }],
      p_amount_paid: 30000,
    };

    const first = await admin.client.rpc('sp_record_purchase', params);
    expect(first.error).toBeNull();
    const firstPurchaseId = first.data![0].purchase_id;
    purchaseIds.push(firstPurchaseId);

    const second = await admin.client.rpc('sp_record_purchase', params);

    if (second.error) {
      throw new Error(
        `BUG ARSITEKTUR TERKONFIRMASI: sp_record_purchase TIDAK idempotent. ` +
          `Panggilan kedua dengan client_uuid sama (${clientUuid}) gagal: "${second.error.message}". ` +
          `Ini melanggar prinsip wajib "RPC yang menerima client_uuid WAJIB idempotent" — ` +
          `berisiko nyata kalau nanti fitur ini dipakai lewat offline queue (retry jaringan bisa ` +
          `bikin Barang Masuk tercatat dobel). Perbaikan: tambahkan blok pengecekan ` +
          `"select ... where client_uuid = p_client_uuid; if found then return existing" di awal ` +
          `function, pola yang sama seperti sp_create_pos_transaction (lihat migrasi 0032).`
      );
    }

    expect(second.data![0].purchase_id).toBe(firstPurchaseId);

    const { data: allPurchases } = await supabaseAdmin
      .from('purchases')
      .select('id')
      .eq('client_uuid', clientUuid);
    expect(allPurchases!.length).toBe(1);
  });
});
