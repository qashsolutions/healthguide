import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // The mock server (port 3100) is shared state — tests must run serially to avoid race conditions.
  // All 168 runs (56 tests × 3 browser projects) finish in < 5 minutes on typical hardware.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['Pixel 5'] } },
  ],
  webServer: [
    {
      // Mock Supabase server — must start before Next.js
      command: 'npx tsx tests/mock-server.ts',
      port: 3100,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      // Next.js dev server pointed at mock Supabase
      command: 'npm run dev -- --port 3001',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:3100',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'playwright-test-anon-key',
      },
    },
  ],
});
