import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { createTestProduct } from '../helpers/createTestProduct';
import { seedStock } from '../helpers/seedStock';

describe('sp_create_pos_transaction', () => {
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let kasir: Awaited<ReturnType<typeof createTestUser>>;
  let mekanik: Awaited<ReturnType<typeof createTestUser>>;
  let product: Awaited<ReturnType<typeof createTestProduct>>;

  beforeAll(async () => {
    admin = await createTestUser({ roleCode: 'admin', name: 'Test Admin' });
    kasir = await createTestUser({ roleCode: 'kasir', name: 'Test Kasir' });
    mekanik = await createTestUser({ roleCode: 'mekanik', name: 'Test Mekanik' });
    product = await createTestProduct({ createdBy: admin.userId });
    // Modal Rp30.000, harga jual umum Rp50.000 -> profit per pcs jelas.
    await seedStock(admin.client, product.productId, 10, 30000);
  });

  afterAll(async () => {
    await product.cleanup();
    await mekanik.cleanup();
    await kasir.cleanup();
    await admin.cleanup();
  });

  it('Kasir bisa membuat transaksi POS dan stok berkurang sesuai qty', async () => {
    const { data, error } = await kasir.client.rpc('sp_create_pos_transaction', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: null,
      p_customer_type_used: 'general',
      p_items: [{ product_id: product.productId, qty: 3 }],
      p_payment_method: 'cash',
      p_amount_received: 150000, // 3 x 50.000
    });

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].total_amount).toBe(150000);
    expect(data![0].change_amount).toBe(0);

    const { data: stockRows } = await admin.client
      .from('inventory_batches')
      .select('qty_sisa')
      .eq('product_id', product.productId);

    const totalStok = stockRows!.reduce((sum, r) => sum + r.qty_sisa, 0);
    expect(totalStok).toBe(7); // 10 awal - 3 terjual
  });

  it('Mekanik TIDAK BOLEH membuat transaksi POS (role tidak diizinkan)', async () => {
    const { error } = await mekanik.client.rpc('sp_create_pos_transaction', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: null,
      p_customer_type_used: 'general',
      p_items: [{ product_id: product.productId, qty: 1 }],
      p_payment_method: 'cash',
      p_amount_received: 50000,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Akses ditolak');
  });

  it('client_uuid yang sama dipanggil 2x TIDAK membuat transaksi ganda (idempotency)', async () => {
    const clientUuid = crypto.randomUUID();

    const first = await kasir.client.rpc('sp_create_pos_transaction', {
      p_client_uuid: clientUuid,
      p_customer_id: null,
      p_customer_type_used: 'general',
      p_items: [{ product_id: product.productId, qty: 1 }],
      p_payment_method: 'cash',
      p_amount_received: 50000,
    });

    const second = await kasir.client.rpc('sp_create_pos_transaction', {
      p_client_uuid: clientUuid,
      p_customer_id: null,
      p_customer_type_used: 'general',
      p_items: [{ product_id: product.productId, qty: 1 }],
      p_payment_method: 'cash',
      p_amount_received: 50000,
    });

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    // Panggilan kedua HARUS mengembalikan transaction_id yang SAMA,
    // bukan bikin baris baru — ini yang barusan diperbaiki di 0032.
    expect(second.data![0].transaction_id).toBe(first.data![0].transaction_id);

    const { count } = await admin.client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('client_uuid', clientUuid);

    expect(count).toBe(1);
  });

  it('Beli melebihi stok yang tersedia ditolak', async () => {
    const { error } = await kasir.client.rpc('sp_create_pos_transaction', {
      p_client_uuid: crypto.randomUUID(),
      p_customer_id: null,
      p_customer_type_used: 'general',
      p_items: [{ product_id: product.productId, qty: 999 }],
      p_payment_method: 'cash',
      p_amount_received: 999 * 50000,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Stok tidak cukup');
  });
});