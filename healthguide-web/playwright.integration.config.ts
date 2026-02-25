/**
 * Integration test config — runs against the REAL Supabase project.
 *
 * Unlike the standard e2e suite (playwright.config.ts), there is no mock server.
 * Next.js talks directly to production Supabase so we can verify actual security
 * properties: parameterized queries, RLS, and input sanitisation in the edge function.
 *
 * Usage:
 *   npx playwright test --config playwright.integration.config.ts
 *   npm run test:e2e:integration
 */

import { defineConfig, devices } from '@playwright/test';

const SUPABASE_URL = 'https://rcknxbfhghetquqdxmjw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja254YmZoZ2hldHF1cWR4bWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDQ0MzcsImV4cCI6MjA4NTc4MDQzN30.yxLCC1CbWfNl8lMX49Lvgnfi1wSpwCde7fJx4xt_L7s';

export default defineConfig({
  testDir: './tests/integration',
  // Integration tests are independent; run sequentially to avoid hammering Supabase rate limits
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-integration' }]],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  projects: [
    // Integration tests only need one browser — Chromium is enough
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Next.js dev server on port 3002, pointed at the real Supabase project
    command: 'npm run dev -- --port 3002',
    port: 3002,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    },
  },
});
