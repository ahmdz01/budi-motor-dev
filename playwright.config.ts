import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.e2e.local' });
config({ path: '.env.test.local' });

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  workers: 1, // integration test ini pakai 1 akun real + 1 dev server yang sama — jangan paralel
  use: {
    baseURL: 'http://127.0.0.1:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 180000,
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});