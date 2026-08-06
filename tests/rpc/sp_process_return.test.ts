import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestProduct } from '../helpers/createTestProduct';
import { createTestCustomer } from '../helpers/createTestCustomer';
import { seedStock } from '../helpers/seedStock';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_process_return', () => {
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let kasir: Awaited<ReturnType<typeof createTestUser>>;
  let mekanik: Awaited<ReturnType<typeof createTestUser>>;
  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let customer: Awaited<ReturnType<typeof createTestCustomer>>;

  const posTransactionIds: string[] = [];
  const serviceIds: string[] = [];

  beforeAll(async () => {
    admin = await createTestUser({ roleCode: 'admin', name: 'Test Admin' });
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
    mekanik = await createTestUser({ roleCode: 'mekanik', name: 'Test Mekanik' });
    product = await createTestProduct({ createdBy: admin.userId });
    customer = await createTestCustomer();
    // Modal Rp30.000/pcs, stok cukup besar karena dipakai banyak skenario.
    await seedStock(admin.client, product.productId, 50, 30000);
  });

  afterAll(async () => {
    for (const txId of posTransactionIds) {
      const { data: items } = await supabaseAdmin
        .from('transaction_items')
        .select('id')
        .eq('transaction_id', txId);
      const itemIds = items?.map((i) => i.id) ?? [];
      if (itemIds.length > 0) {
        await supabaseAdmin.from('returns').delete().in('transaction_item_id', itemIds);
        await supabaseAdmin.from('stock_consumptions').delete().in('transaction_item_id', itemIds);
      }
      await supabaseAdmin.from('transaction_items').delete().eq('transaction_id', txId);
      await supabaseAdmin.from('transactions').delete().eq('id', txId);
    }

    for (const id of serviceIds) {
      const { data: items } = await supabaseAdmin.from('service_items').select('id').eq('service_id', id);
      const itemIds = items?.map((i) => i.id) ?? [];
      if (itemIds.length > 0) {
        await supabaseAdmin.from('returns').delete().in('service_item_id', itemIds);
        await supabaseAdmin.from('stock_consumptions').delete().in('service_item_id', itemIds);
      }
      await supabaseAdmin.from('service_status_history').delete().eq('service_id', id);
      await supabaseAdmin.from('service_items').delete().eq('service_id', id);

      const { data: txs } = await supabaseAdmin.from('transactions').select('id').eq('service_id', id);
      const txIds = txs?.map((t) => t.id) ?? [];
      if (txIds.length > 0) {
        await supabaseAdmin.from('transaction_items').delete().in('transaction_id', txIds);
      }
      await supabaseAdmin.from('transactions').delete().eq('service_id', id);
      await supabaseAdmin.from('services').delete().eq('id', id);
    }

    await customer.cleanup();
    await product.cleanup();
    await mekanik.cleanup();
    await kasir.cleanup();
    await admin.cleanup();
  });

  async function totalStok() {
    const { data } = await supabaseAdmin
      .from('inventory_batches')
      .select('qty_sisa')
      .eq('product_id', product.productId)
      .eq('status', 'active');
    return (data ?? []).reduce((sum, r) => sum + r.qty_sisa, 0);
  }

  // Bikin transaksi POS Lunas (POS selalu langsung 'paid' saat dibuat),
  // return id transaksi + id transaction_item produknya.
  async function createPaidPosTransaction(qty: number) {
    const { data, error } = await kasir.client.rpc('sp_create_pos_transaction', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: null,
      p_customer_type_used: 'general',
      p_items: [{ product_id: product.productId, qty }],
      p_payment_method: 'cash',
      p_amount_received: qty * product.prices.general,
    });
    if (error) throw new Error(`sp_create_pos_transaction gagal: ${error.message}`);
    const transactionId = data![0].transaction_id;
    posTransactionIds.push(transactionId);

    const { data: item, error: itemError } = await supabaseAdmin
      .from('transaction_items')
      .select('id')
      .eq('transaction_id', transactionId)
      .eq('item_type', 'product')
      .single();
    if (itemError || !item) throw new Error(`Gagal ambil transaction_item: ${itemError?.message}`);

    return { transactionId, transactionItemId: item.id as string };
  }

  // Rangkaian lengkap sampai servis Lunas (sama seperti helper di
  // sp_confirm_service_payment.test.ts), lalu kembalikan service_item_id
  // produknya untuk diretur.
  async function createPaidServiceWithProductItem(qty: number) {
    const { data: created, error: createError } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Servis untuk test retur',
      p_customer_type_used: 'service',
      p_is_warranty_claim: false,
    });
    if (createError) throw new Error(`sp_create_service gagal: ${createError.message}`);
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    const assign = await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanik.userId,
    });
    if (assign.error) throw new Error(`sp_change_service_status gagal: ${assign.error.message}`);

    const addProduct = await mekanik.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'product',
      p_product_id: product.productId,
      p_qty: qty,
    });
    if (addProduct.error) throw new Error(`sp_add_service_item (produk) gagal: ${addProduct.error.message}`);
    const serviceItemId = addProduct.data![0].service_item_id as string;

    const complete = await mekanik.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'completed',
    });
    if (complete.error) throw new Error(`sp_change_service_status (completed) gagal: ${complete.error.message}`);

    const confirm = await kasir.client.rpc('sp_confirm_service_payment', {
      p_service_id: serviceId,
      p_client_uuid: crypto.randomUUID(),
      p_payment_method: 'cash',
      p_amount_received: qty * product.prices.service,
    });
    if (confirm.error) throw new Error(`sp_confirm_service_payment gagal: ${confirm.error.message}`);

    return { serviceId, serviceItemId };
  }

  it('Retur produk dari transaksi POS Lunas: stok bertambah kembali dan refund tercatat', async () => {
    const stokSebelum = await totalStok();
    const { transactionItemId } = await createPaidPosTransaction(3);
    // Setelah beli 3, stok berkurang 3 dulu sebelum diretur.
    expect(await totalStok()).toBe(stokSebelum - 3);

    const { data, error } = await admin.client.rpc('sp_process_return', {
      p_qty_returned: 2,
      p_reason: 'Barang tidak cocok, dikembalikan pelanggan',
      p_refund_amount: 100000, // 2 x 50.000
      p_transaction_item_id: transactionItemId,
      p_service_item_id: null,
      p_restock: true,
    });

    expect(error).toBeNull();
    expect(data![0].return_id).toBeTruthy();

    // Stok kembali naik 2 (dari 3 yang keluar, cuma 1 yang tetap terjual).
    expect(await totalStok()).toBe(stokSebelum - 1);

    const { data: ledger } = await supabaseAdmin
      .from('financial_ledger')
      .select('category, amount')
      .eq('reference_type', 'return')
      .eq('reference_id', data![0].return_id)
      .eq('category', 'cash')
      .single();

    expect(ledger!.category).toBe('cash');
    expect(Number(ledger!.amount)).toBe(-100000);

    // Migrasi 0026 (Profit Tracking) juga membalikkan laba yang tadinya
    // tercatat untuk unit yang diretur: qty x (harga jual - HPP modal),
    // TERPISAH dari nominal refund manual di atas.
    // Harga jual tier 'general' 50.000, modal (avg hpp) 30.000, qty 2
    // -> pembalikan laba = 2 x (50.000 - 30.000) = 40.000.
    const { data: profitLedger } = await supabaseAdmin
      .from('financial_ledger')
      .select('amount')
      .eq('reference_type', 'return')
      .eq('reference_id', data![0].return_id)
      .eq('category', 'profit')
      .single();

    expect(Number(profitLedger!.amount)).toBe(-40000);

    const { data: batch } = await supabaseAdmin
      .from('inventory_batches')
      .select('source_type, qty_sisa, harga_beli')
      .eq('product_id', product.productId)
      .eq('source_type', 'adjustment')
      .order('received_at', { ascending: false })
      .limit(1)
      .single();

    expect(batch!.qty_sisa).toBe(2);
    // Cost basis retur = rata-rata hpp_at_time (modal), BUKAN harga jual.
    expect(Number(batch!.harga_beli)).toBe(30000);
  });

  it('Mekanik TIDAK BOLEH memproses retur (bukan tugasnya)', async () => {
    const { transactionItemId } = await createPaidPosTransaction(1);

    const { error } = await mekanik.client.rpc('sp_process_return', {
      p_qty_returned: 1,
      p_reason: 'Test role ditolak',
      p_refund_amount: 50000,
      p_transaction_item_id: transactionItemId,
      p_service_item_id: null,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Qty retur melebihi sisa yang bisa diretur ditolak', async () => {
    const { transactionItemId } = await createPaidPosTransaction(2);

    // Retur pertama: 1 dari 2, sisa 1.
    const first = await admin.client.rpc('sp_process_return', {
      p_qty_returned: 1,
      p_reason: 'Retur sebagian pertama',
      p_refund_amount: 50000,
      p_transaction_item_id: transactionItemId,
      p_service_item_id: null,
    });
    expect(first.error).toBeNull();

    // Retur kedua: minta 2 lagi padahal sisa cuma 1 -> ditolak.
    const second = await admin.client.rpc('sp_process_return', {
      p_qty_returned: 2,
      p_reason: 'Retur melebihi sisa',
      p_refund_amount: 100000,
      p_transaction_item_id: transactionItemId,
      p_service_item_id: null,
    });

    expect(second.error).not.toBeNull();
    expect(second.error!.message).toContain('melebihi sisa yang bisa diretur');
  });

  it('Retur item servis yang belum Lunas (masih in_progress) ditolak', async () => {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Servis belum lunas untuk test retur',
      p_customer_type_used: 'service',
    });
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanik.userId,
    });

    const addProduct = await mekanik.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'product',
      p_product_id: product.productId,
      p_qty: 1,
    });
    const serviceItemId = addProduct.data![0].service_item_id as string;

    const { error } = await admin.client.rpc('sp_process_return', {
      p_qty_returned: 1,
      p_reason: 'Servis belum lunas',
      p_refund_amount: 0,
      p_transaction_item_id: null,
      p_service_item_id: serviceItemId,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('belum Lunas');
  });

  it('Retur item jasa (labor) dari servis Lunas: TIDAK menambah stok, refund tetap tercatat', async () => {
    const { data: created } = await kasir.client.rpc('sp_create_service', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: customer.customerId,
      p_vehicle_id: null,
      p_complaint: 'Retur jasa',
      p_customer_type_used: 'service',
    });
    const serviceId = created![0].service_id;
    serviceIds.push(serviceId);

    await admin.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'in_progress',
      p_mechanic_id: mekanik.userId,
    });

    const addLabor = await mekanik.client.rpc('sp_add_service_item', {
      p_service_id: serviceId,
      p_item_type: 'labor',
      p_name: 'Jasa yang mau diretur',
      p_price: 20000,
      p_qty: 1,
    });
    const laborItemId = addLabor.data![0].service_item_id as string;

    await mekanik.client.rpc('sp_change_service_status', {
      p_service_id: serviceId,
      p_new_status: 'completed',
    });

    const confirm = await kasir.client.rpc('sp_confirm_service_payment', {
      p_service_id: serviceId,
      p_client_uuid: crypto.randomUUID(),
      p_payment_method: 'cash',
      p_amount_received: 20000,
    });
    if (confirm.error) throw new Error(`sp_confirm_service_payment gagal: ${confirm.error.message}`);

    const stokSebelum = await totalStok();

    const { data, error } = await admin.client.rpc('sp_process_return', {
      p_qty_returned: 1,
      p_reason: 'Jasa dibatalkan setelah bayar',
      p_refund_amount: 20000,
      p_transaction_item_id: null,
      p_service_item_id: laborItemId,
      p_restock: true, // sengaja true - RPC harus tetap tidak restock karena item_type bukan 'product'
    });

    expect(error).toBeNull();
    // Stok tidak berubah sama sekali, karena item yang diretur adalah jasa.
    expect(await totalStok()).toBe(stokSebelum);

    const { data: ledger } = await supabaseAdmin
      .from('financial_ledger')
      .select('category, amount')
      .eq('reference_type', 'return')
      .eq('reference_id', data![0].return_id)
      .eq('category', 'cash')
      .single();

    expect(ledger!.category).toBe('cash');
    expect(Number(ledger!.amount)).toBe(-20000);

    // HPP jasa selalu 0 (tidak ada stock_consumptions untuk labor), jadi
    // pembalikan laba = qty x (harga jasa - 0) = 1 x 20.000 = 20.000.
    const { data: profitLedger } = await supabaseAdmin
      .from('financial_ledger')
      .select('amount')
      .eq('reference_type', 'return')
      .eq('reference_id', data![0].return_id)
      .eq('category', 'profit')
      .single();

    expect(Number(profitLedger!.amount)).toBe(-20000);
  });

  it('Retur produk dari servis Lunas (jalur p_service_item_id): stok bertambah kembali', async () => {
    const stokSebelum = await totalStok();
    const { serviceItemId } = await createPaidServiceWithProductItem(2);
    expect(await totalStok()).toBe(stokSebelum - 2);

    const { data, error } = await admin.client.rpc('sp_process_return', {
      p_qty_returned: 1,
      p_reason: 'Produk servis dikembalikan pelanggan',
      p_refund_amount: 55000, // 1 x harga tier 'service'
      p_transaction_item_id: null,
      p_service_item_id: serviceItemId,
      p_restock: true,
    });

    expect(error).toBeNull();
    expect(await totalStok()).toBe(stokSebelum - 1);

    const { data: ledger } = await supabaseAdmin
      .from('financial_ledger')
      .select('category, amount')
      .eq('reference_type', 'return')
      .eq('reference_id', data![0].return_id)
      .eq('category', 'cash')
      .single();

    expect(ledger!.category).toBe('cash');
    expect(Number(ledger!.amount)).toBe(-55000);

    // Harga jual tier 'service' 55.000, modal (avg hpp) 30.000, qty 1
    // -> pembalikan laba = 1 x (55.000 - 30.000) = 25.000.
    const { data: profitLedger } = await supabaseAdmin
      .from('financial_ledger')
      .select('amount')
      .eq('reference_type', 'return')
      .eq('reference_id', data![0].return_id)
      .eq('category', 'profit')
      .single();

    expect(Number(profitLedger!.amount)).toBe(-25000);
  });

  it('p_restock=false: retur produk tercatat tapi stok TIDAK bertambah', async () => {
    const { transactionItemId } = await createPaidPosTransaction(2);
    const stokSebelum = await totalStok();

    const { error } = await admin.client.rpc('sp_process_return', {
      p_qty_returned: 1,
      p_reason: 'Barang rusak, tidak layak restock',
      p_refund_amount: 50000,
      p_transaction_item_id: transactionItemId,
      p_service_item_id: null,
      p_restock: false,
    });

    expect(error).toBeNull();
    expect(await totalStok()).toBe(stokSebelum);
  });
});