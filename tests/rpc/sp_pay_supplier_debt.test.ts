import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestProduct } from '../helpers/createTestProduct';
import { createTestSupplier } from '../helpers/createTestSupplier';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_pay_supplier_debt', () => {
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let kasir: Awaited<ReturnType<typeof createTestUser>>;
  let product: Awaited<ReturnType<typeof createTestProduct>>;
  let supplier: Awaited<ReturnType<typeof createTestSupplier>>;

  const purchaseIds: string[] = [];

  beforeAll(async () => {
    admin = await createTestUser({ roleCode: 'admin', name: 'Test Admin' });
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
    product = await createTestProduct({ createdBy: admin.userId });
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

      const { data: debts } = await supabaseAdmin
        .from('supplier_debts')
        .select('id')
        .eq('purchase_id', purchaseId);
      const debtIds = debts?.map((d) => d.id) ?? [];
      if (debtIds.length > 0) {
        await supabaseAdmin.from('supplier_debt_payments').delete().in('supplier_debt_id', debtIds);
      }

      await supabaseAdmin.from('financial_ledger').delete().eq('reference_type', 'purchase').eq('reference_id', purchaseId);
      await supabaseAdmin.from('supplier_debts').delete().eq('purchase_id', purchaseId);
      await supabaseAdmin.from('purchase_items').delete().eq('purchase_id', purchaseId);
      await supabaseAdmin.from('purchases').delete().eq('id', purchaseId);
    }
    await supplier.cleanup();
    await product.cleanup();
    await kasir.cleanup();
    await admin.cleanup();
  });

  // Bikin hutang supplier baru lewat sp_record_purchase (bukan seedStock —
  // ini memang butuh purchase riil karena yang diuji adalah pelunasannya).
  async function createDebt(qty: number, unitPrice: number, amountPaid: number) {
    const { data: purchase, error: purchaseError } = await admin.client.rpc('sp_record_purchase', {
      p_client_uuid: crypto.randomUUID(),
      p_supplier_id: supplier.supplierId,
      p_purchase_date: new Date().toISOString().slice(0, 10),
      p_items: [{ product_id: product.productId, qty, unit_price: unitPrice }],
      p_amount_paid: amountPaid,
    });
    if (purchaseError) throw new Error(`sp_record_purchase gagal: ${purchaseError.message}`);
    const purchaseId = purchase![0].purchase_id;
    purchaseIds.push(purchaseId);

    const { data: debt, error: debtError } = await supabaseAdmin
      .from('supplier_debts')
      .select('id, total_tagihan, total_dibayar, sisa_hutang, status')
      .eq('purchase_id', purchaseId)
      .single();
    if (debtError || !debt) {
      throw new Error(`Gagal ambil supplier_debts hasil sp_record_purchase: ${debtError?.message}`);
    }

    return {
      purchaseId,
      debtId: debt.id as string,
      totalTagihan: Number(debt.total_tagihan),
      sisaHutang: Number(debt.sisa_hutang),
    };
  }

  it('Admin bisa bayar sebagian hutang, sisa berkurang dan status tetap unpaid', async () => {
    // Total tagihan 100.000, baru dibayar 40.000 saat pembelian -> sisa 60.000.
    const debt = await createDebt(10, 10000, 40000);
    expect(debt.sisaHutang).toBe(60000);

    const { data, error } = await admin.client.rpc('sp_pay_supplier_debt', {
      p_debt_id: debt.debtId,
      p_amount: 20000,
      p_payment_method: 'cash',
    });

    expect(error).toBeNull();
    expect(data![0].remaining).toBe(40000);
    expect(data![0].new_status).toBe('unpaid');

    const { data: row } = await supabaseAdmin
      .from('supplier_debts')
      .select('total_dibayar, sisa_hutang, status')
      .eq('id', debt.debtId)
      .single();

    expect(Number(row!.total_dibayar)).toBe(60000);
    expect(Number(row!.sisa_hutang)).toBe(40000);
    expect(row!.status).toBe('unpaid');

    const { data: ledger } = await supabaseAdmin
      .from('financial_ledger')
      .select('category, amount')
      .eq('reference_type', 'purchase')
      .eq('reference_id', debt.purchaseId)
      .eq('description', 'Pembayaran Hutang Supplier')
      .single();

    expect(ledger!.category).toBe('restock');
    expect(Number(ledger!.amount)).toBe(-20000);
  });

  it('Kasir TIDAK BOLEH bayar hutang supplier (bukan tugasnya)', async () => {
    const debt = await createDebt(5, 10000, 0);

    const { error } = await kasir.client.rpc('sp_pay_supplier_debt', {
      p_debt_id: debt.debtId,
      p_amount: 10000,
      p_payment_method: 'cash',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Nominal melebihi sisa hutang ditolak', async () => {
    const debt = await createDebt(5, 10000, 0); // sisa 50.000

    const { error } = await admin.client.rpc('sp_pay_supplier_debt', {
      p_debt_id: debt.debtId,
      p_amount: 60000,
      p_payment_method: 'cash',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('melebihi sisa hutang');
  });

  it('Pelunasan penuh mengubah status jadi paid', async () => {
    const debt = await createDebt(5, 10000, 0); // sisa 50.000

    const { data, error } = await admin.client.rpc('sp_pay_supplier_debt', {
      p_debt_id: debt.debtId,
      p_amount: 50000,
      p_payment_method: 'transfer',
    });

    expect(error).toBeNull();
    expect(data![0].remaining).toBe(0);
    expect(data![0].new_status).toBe('paid');

    const { data: row } = await supabaseAdmin
      .from('supplier_debts')
      .select('status')
      .eq('id', debt.debtId)
      .single();

    expect(row!.status).toBe('paid');
  });

  it('Dua pembayaran bersamaan pada hutang yang sama tidak saling menimpa (row locking)', async () => {
    // Sisa 100.000. Dua pembayaran konkuren 40.000 + 60.000 = pas lunas.
    // Tanpa row lock (FOR UPDATE) di RPC, ini rawan "lost update": kedua
    // transaksi baca total_dibayar lama secara bersamaan, lalu saling
    // menimpa saat UPDATE, walau keduanya "sukses" tanpa error.
    const debt = await createDebt(10, 10000, 0);

    const [first, second] = await Promise.all([
      admin.client.rpc('sp_pay_supplier_debt', {
        p_debt_id: debt.debtId,
        p_amount: 40000,
        p_payment_method: 'cash',
      }),
      admin.client.rpc('sp_pay_supplier_debt', {
        p_debt_id: debt.debtId,
        p_amount: 60000,
        p_payment_method: 'cash',
      }),
    ]);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();

    const { data: row } = await supabaseAdmin
      .from('supplier_debts')
      .select('total_dibayar, sisa_hutang, status')
      .eq('id', debt.debtId)
      .single();

    expect(Number(row!.total_dibayar)).toBe(100000);
    expect(Number(row!.sisa_hutang)).toBe(0);
    expect(row!.status).toBe('paid');

    const { data: payments } = await supabaseAdmin
      .from('supplier_debt_payments')
      .select('amount')
      .eq('supplier_debt_id', debt.debtId);

    expect(payments!.length).toBe(2);
    const total = payments!.reduce((sum, p) => sum + Number(p.amount), 0);
    expect(total).toBe(100000);
  });
});