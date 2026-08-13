import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_record_manual_ledger_entry', () => {
  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let kasir: Awaited<ReturnType<typeof createTestUser>>;

  const entryIds: string[] = [];

  beforeAll(async () => {
    owner = await createTestUser({ roleCode: 'owner', name: 'Test Owner' });
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
  });

  afterAll(async () => {
    if (entryIds.length > 0) {
      await supabaseAdmin.from('financial_ledger').delete().in('id', entryIds);
    }
    await kasir.cleanup();
    await owner.cleanup();
  });

  it('Owner setor Dana Restock MURNI (bukan dari kas) — 1 entri ledger', async () => {
    const { data, error } = await owner.client.rpc('sp_record_manual_ledger_entry', {
      p_entry_type: 'restock_deposit',
      p_amount: 5000000,
      p_description: 'Modal awal restock oli',
      p_from_cash: false,
    });

    expect(error).toBeNull();
    expect(data![0].entry_ids.length).toBe(1);
    entryIds.push(...data![0].entry_ids);

    const { data: entry } = await supabaseAdmin
      .from('financial_ledger')
      .select('category, amount')
      .eq('id', data![0].entry_ids[0])
      .single();
    expect(entry!.category).toBe('restock');
    expect(Number(entry!.amount)).toBe(5000000);
  });

  it('Owner setor Dana Restock DARI KAS — 2 entri ledger (restock +, cash -)', async () => {
    const { data, error } = await owner.client.rpc('sp_record_manual_ledger_entry', {
      p_entry_type: 'restock_deposit',
      p_amount: 1000000,
      p_description: 'Transfer dari kas ke restock',
      p_from_cash: true,
    });

    expect(error).toBeNull();
    expect(data![0].entry_ids.length).toBe(2);
    entryIds.push(...data![0].entry_ids);

    const { data: entries } = await supabaseAdmin
      .from('financial_ledger')
      .select('category, amount')
      .in('id', data![0].entry_ids);

    const restockEntry = entries!.find((e) => e.category === 'restock');
    const cashEntry = entries!.find((e) => e.category === 'cash');
    expect(Number(restockEntry!.amount)).toBe(1000000);
    expect(Number(cashEntry!.amount)).toBe(-1000000);
  });

  it('Penarikan Dana Restock TIDAK BOLEH melebihi saldo saat ini', async () => {
    const { data: sumData } = await supabaseAdmin
      .from('financial_ledger')
      .select('amount')
      .eq('category', 'restock');
    const currentBalance = sumData!.reduce((sum, r) => sum + Number(r.amount), 0);

    const { error } = await owner.client.rpc('sp_record_manual_ledger_entry', {
      p_entry_type: 'restock_withdrawal',
      p_amount: currentBalance + 1000000,
      p_description: 'Coba tarik lebih dari saldo',
      p_from_cash: false,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('melebihi saldo Dana Restock');
  });

  it('Biaya Operasional SELALU mengurangi Kas juga (2 entri, tanpa opsi p_from_cash)', async () => {
    const { data, error } = await owner.client.rpc('sp_record_manual_ledger_entry', {
      p_entry_type: 'operational_expense',
      p_amount: 150000,
      p_description: 'Bayar listrik bulan ini',
    });

    expect(error).toBeNull();
    expect(data![0].entry_ids.length).toBe(2);
    entryIds.push(...data![0].entry_ids);

    const { data: entries } = await supabaseAdmin
      .from('financial_ledger')
      .select('category, amount')
      .in('id', data![0].entry_ids);

    const opEntry = entries!.find((e) => e.category === 'operational');
    const cashEntry = entries!.find((e) => e.category === 'cash');
    expect(Number(opEntry!.amount)).toBe(-150000);
    expect(Number(cashEntry!.amount)).toBe(-150000);
  });

  it('Kasir TIDAK BOLEH catat entri manual (hanya Owner/Admin/Super Admin)', async () => {
    const { error } = await kasir.client.rpc('sp_record_manual_ledger_entry', {
      p_entry_type: 'operational_expense',
      p_amount: 50000,
      p_description: 'Coba dari kasir',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('Keterangan kosong/terlalu pendek ditolak', async () => {
    const { error } = await owner.client.rpc('sp_record_manual_ledger_entry', {
      p_entry_type: 'operational_expense',
      p_amount: 50000,
      p_description: 'ab',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Keterangan wajib diisi');
  });
});