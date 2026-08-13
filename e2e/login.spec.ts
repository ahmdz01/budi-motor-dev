import { test, expect } from '@playwright/test';

const phoneNumber = process.env.E2E_OWNER_PHONE;
const pin = process.env.E2E_OWNER_PIN;

test.beforeAll(() => {
  if (!phoneNumber || !pin) {
    throw new Error('E2E_OWNER_PHONE / E2E_OWNER_PIN belum diisi di .env.e2e.local.');
  }
});

test('Owner bisa login dan masuk ke Dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Nomor HP').fill(phoneNumber!);
  await page.getByLabel('PIN').fill(pin!);
  await page.getByRole('button', { name: 'Masuk' }).click();

  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
});

test('Nomor HP tidak terdaftar menampilkan pesan error, TIDAK redirect', async ({ page }) => {
  await page.goto('/login');

  // Sengaja pakai nomor yang jelas tidak pernah terdaftar — bukan akun
  // asli — supaya tidak menambah failed_login_attempts di akun sungguhan.
  await page.getByLabel('Nomor HP').fill('000000000000');
  await page.getByLabel('PIN').fill('0000');
  await page.getByRole('button', { name: 'Masuk' }).click();

  await expect(page.getByText('Nomor HP atau PIN salah.')).toBeVisible();
  await expect(page).toHaveURL('/login');
});