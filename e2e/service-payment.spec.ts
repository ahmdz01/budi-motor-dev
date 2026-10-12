import { test, expect, type Page } from '@playwright/test';
import { createTestUser } from '../tests/helpers/createTestUser';
import { createTestProduct } from '../tests/helpers/createTestProduct';
import { createTestCustomer } from '../tests/helpers/createTestCustomer';
import { seedStock } from '../tests/helpers/seedStock';
import { createAnonClient } from '../tests/helpers/supabaseTestClients';
import { phoneToInternalEmail } from '../src/features/auth/lib/mapPhoneToEmail';
import { padPin } from '../src/features/auth/lib/padPin';

const phoneNumber = process.env.E2E_OWNER_PHONE;
const pin = process.env.E2E_OWNER_PIN;

let mekanik: Awaited<ReturnType<typeof createTestUser>>;
let product: Awaited<ReturnType<typeof createTestProduct>>;
let customer: Awaited<ReturnType<typeof createTestCustomer>>;
let serviceId: string;

test.beforeAll(async () => {
  if (!phoneNumber || !pin) {
    throw new Error('E2E_OWNER_PHONE / E2E_OWNER_PIN belum diisi di .env.e2e.local.');
  }

  const ownerClient = createAnonClient();
  const { data: signInData, error: signInError } = await ownerClient.auth.signInWithPassword({
    email: phoneToInternalEmail(phoneNumber),
    password: padPin(phoneNumber, pin),
  });
  if (signInError || !signInData.user) {
    throw new Error(`Gagal login sebagai Owner untuk seed data E2E: ${signInError?.message}`);
  }

  mekanik = await createTestUser({ roleCode: 'mekanik', name: 'E2E Test Mekanik' });
  customer = await createTestCustomer();
  product = await createTestProduct({ createdBy: signInData.user.id });
  await seedStock(ownerClient, product.productId, 10, 30000);

  const { data: created, error: createError } = await ownerClient.rpc('sp_create_service', {
    p_client_uuid: crypto.randomUUID(),
    p_customer_id: customer.customerId,
    p_vehicle_id: null,
    p_complaint: 'E2E test — ganti oli',
    p_customer_type_used: 'general',
    p_is_warranty_claim: false,
  });
  if (createError) throw new Error(`sp_create_service gagal: ${createError.message}`);
  serviceId = created![0].service_id;

  const assign = await ownerClient.rpc('sp_change_service_status', {
    p_service_id: serviceId,
    p_new_status: 'in_progress',
    p_mechanic_id: mekanik.userId,
  });
  if (assign.error) throw new Error(`Assign mekanik gagal: ${assign.error.message}`);

  const addItem = await ownerClient.rpc('sp_add_service_item', {
    p_service_id: serviceId,
    p_item_type: 'product',
    p_product_id: product.productId,
    p_qty: 2,
  });
  if (addItem.error) throw new Error(`Tambah item gagal: ${addItem.error.message}`);

  const complete = await ownerClient.rpc('sp_change_service_status', {
    p_service_id: serviceId,
    p_new_status: 'completed',
  });
  if (complete.error) throw new Error(`Tandai selesai gagal: ${complete.error.message}`);
});

test.afterAll(async () => {
  const { supabaseAdmin } = await import('../tests/helpers/supabaseTestClients');

  const { data: txs } = await supabaseAdmin.from('transactions').select('id').eq('service_id', serviceId);
  const txIds = (txs ?? []).map((t) => t.id);

  if (txIds.length > 0) {
    await supabaseAdmin.from('financial_ledger').delete().in('reference_id', txIds);
    await supabaseAdmin.from('transaction_items').delete().in('transaction_id', txIds);
    await supabaseAdmin.from('transactions').delete().in('id', txIds);
  }

  await supabaseAdmin.from('service_status_history').delete().eq('service_id', serviceId);
  await supabaseAdmin.from('service_items').delete().eq('service_id', serviceId);
  await supabaseAdmin.from('services').delete().eq('id', serviceId);

  await customer.cleanup();
  await product.cleanup();
  await mekanik.cleanup();
});

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Nomor HP').fill(phoneNumber!);
  await page.getByLabel('PIN').fill(pin!);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL('/dashboard', { timeout: 30000 });
}

test('Konfirmasi Pembayaran Servis: bayar tunai, kembalian benar', async ({ page }) => {
  await login(page);
  await page.goto(`/service/${serviceId}`);

  await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click();
  await page.getByLabel('Uang Diterima').fill('150000');
  await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click();

  await expect(page.getByText('Pembayaran Berhasil')).toBeVisible({ timeout: 10000 });
  // 150.000 dibayar - 100.000 (2x50.000) = 50.000 kembalian.
  await expect(page.getByText(/Kembalian:\s*Rp\s?50\.000/)).toBeVisible();
});