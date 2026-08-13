import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.e2e.local' });

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  // Otomatis jalankan `npm run dev` sendiri kalau belum jalan — kalau
  // sudah ada dev server jalan manual di terminal lain, dipakai itu
  // saja (reuseExistingServer), tidak bikin instance baru.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180000, // dinaikkan dari 60000 — filesystem laptop ini lambat untuk compile awal
  },
  projects: [
    {
      // Pola pakai aplikasi ini memang di HP (staff), jadi test disimulasikan
      // di viewport mobile, bukan desktop.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});