/**
 * Playwright auth fixture: authenticate as any role by injecting a Supabase
 * session into localStorage and mocking all Supabase API calls.
 *
 * Due to a Metro/Expo limitation, only ONE authenticated page load works per
 * Metro session. All protected-route tests use serial mode with a shared page
 * created in beforeAll via setupSerialPage(). Navigation between screens must
 * use UI clicks (SPA routing), NOT page.goto() or page.reload().
 */

import { Page, Browser } from '@playwright/test';
import {
  UserRole,
  mockUsers,
  AUTH_STORAGE_KEY,
  createMockSession,
} from './test-data';
import { mockSupabaseAPI } from './supabase-mocks';

/** Role → protected route path */
const roleRoutes: Record<UserRole, string> = {
  agency_owner: '/(protected)/agency/',
  caregiver: '/(protected)/caregiver/',
  careseeker: '/(protected)/careseeker/',
  volunteer: '/(protected)/caregiver/',
  family_member: '/(protected)/family/dashboard',
};

/** Dismiss Expo's error overlay (WatermelonDB throws on web). */
async function dismissErrorOverlay(page: Page) {
  try {
    const btn = page.getByText('Dismiss');
    if (await btn.isVisible({ timeout: 500 })) {
      await btn.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // No overlay — continue
  }
}

/**
 * Create and return a shared Page for serial tests.
 *
 * Call in test.beforeAll():
 *   page = await setupSerialPage(browser, 'agency_owner');
 *
 * All tests in the describe block must share this page and navigate via UI
 * clicks — no additional page.goto() or page.reload().
 */
export async function setupSerialPage(
  browser: Browser,
  role: UserRole,
  path?: string,
): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();

  // Mock API + inject session into localStorage before navigation
  const user = mockUsers[role];
  await mockSupabaseAPI(page, user);
  await page.addInitScript(
    ({ key, value }) => {
      try { localStorage.setItem(key, value); } catch { /* noop */ }
    },
    { key: AUTH_STORAGE_KEY, value: JSON.stringify(createMockSession(user)) },
  );

  // Single navigation — long timeout for cold Metro starts
  await page.goto(path || roleRoutes[role], {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  // Wait for React to render content
  try {
    await page.waitForFunction(
      () => (document.body?.innerText?.trim().length ?? 0) > 0,
      { timeout: 30_000 },
    );
  } catch {
    try { await page.waitForTimeout(8000); } catch { /* page closed */ }
  }

  await page.waitForTimeout(1000); // settle time
  await dismissErrorOverlay(page);
  return page;
}
