import { test, expect, type Page } from '@playwright/test';
import { createTestProduct } from '../tests/helpers/createTestProduct';
import { seedStock } from '../tests/helpers/seedStock';
import { createAnonClient } from '../tests/helpers/supabaseTestClients';
import { phoneToInternalEmail } from '../src/features/auth/lib/mapPhoneToEmail';
import { padPin } from '../src/features/auth/lib/padPin';

const phoneNumber = process.env.E2E_OWNER_PHONE;
const pin = process.env.E2E_OWNER_PIN;

let product: Awaited<ReturnType<typeof createTestProduct>>;

test.beforeAll(async () => {
  if (!phoneNumber || !pin) {
    throw new Error('E2E_OWNER_PHONE / E2E_OWNER_PIN belum diisi di .env.e2e.local.');
  }

  const ownerClient = createAnonClient();
  const { data: signInData, error: signInError } = await ownerClient.auth.signInWithPassword({
    email: phoneToInternalEmail(phoneNumber),
    password: padPin(pin),
  });

  if (signInError || !signInData.user) {
    throw new Error(`Gagal login sebagai Owner untuk seed data E2E: ${signInError?.message}`);
  }

  product = await createTestProduct({ createdBy: signInData.user.id });
  // Harga general default 50.000, modal 30.000 — dipakai untuk cek kembalian.
  await seedStock(ownerClient, product.productId, 10, 30000);
});

test.afterAll(async () => {
  await product.cleanup();
});

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Nomor HP').fill(phoneNumber!);
  await page.getByLabel('PIN').fill(pin!);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
}

test('Checkout POS: cari barang, bayar tunai, kembalian benar', async ({ page }) => {
  await login(page);
  await page.goto('/pos');

  await page.getByPlaceholder('Cari / scan barcode barang...').fill(product.name);
  await page.getByText(product.name).first().click();

  await page.getByRole('button', { name: 'Bayar' }).click();

  await page.getByLabel('Uang Diterima').fill('100000');
  await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click();

  await expect(page.getByText('Transaksi Berhasil')).toBeVisible({ timeout: 10000 });
  // 100.000 dibayar - 50.000 harga (tier general default) = 50.000 kembalian.
  await expect(page.getByText(/Kembalian:\s*Rp\s?50\.000/)).toBeVisible();
});