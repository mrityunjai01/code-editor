import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI, // reuse local dev server during local runs
    timeout: 120 * 1000, // wait up to 2 mins for Vite to boot
  },
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  testDir: './src/__tests__/e2e',
  timeout: 30000,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});