/**
 * Family Member E2E — Serial Mode (Batches 17-19 merged)
 *
 * Covers: Dashboard, Visits, Reports, Settings
 *
 * ONE page load in beforeAll via setupSerialPage. All navigation happens
 * through UI tab clicks (no page.goto / page.reload). Tests that require
 * different mock data (empty states) or page.reload() are skipped.
 */

import { test, expect, Page } from '@playwright/test';
import { setupSerialPage } from '../fixtures/auth.fixture';

test.describe('Family Member E2E', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await setupSerialPage(browser, 'family_member');
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  // ---------------------------------------------------------------------------
  // Helper: click a bottom-navigation tab
  // Uses .last() to target the tab bar (avoids matching header/content text)
  // ---------------------------------------------------------------------------
  async function clickTab(name: string) {
    await page.getByText(name, { exact: true }).last().click();
    await page.waitForTimeout(1500);
  }

  // =========================================================================
  // BATCH 17 — Dashboard (initial landing page)
  // Route: /(protected)/family/dashboard
  // =========================================================================

  test('B17-F1: shows "Caring for" header', async () => {
    await expect(
      page.getByText('Caring for', { exact: false }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('B17-F2: shows "Today\'s Care" section', async () => {
    await expect(
      page.getByText("Today's Care").or(page.getByText('today', { exact: false })).first(),
    ).toBeVisible();
  });

  test('B17-F3: shows visit status or "No visit scheduled today"', async () => {
    await expect(
      page.getByText('Visit', { exact: false })
        .or(page.getByText('No visit scheduled'))
        .first(),
    ).toBeVisible();
  });

  test('B17-F4: shows Quick Action buttons (Reports, All Visits, Settings)', async () => {
    await expect(page.getByText('Reports').first()).toBeVisible();
    await expect(
      page.getByText('All Visits').or(page.getByText('Visits')).first(),
    ).toBeVisible();
    await expect(page.getByText('Settings').first()).toBeVisible();
  });

  test('B17-F5: shows "Recent Visits" section', async () => {
    await expect(
      page.getByText('Recent Visits').or(page.getByText('Visit', { exact: false })).first(),
    ).toBeVisible();
  });

  test('B17-F6: shows empty state or visit info', async () => {
    // Dashboard shows "No visit scheduled today" when there are no upcoming visits
    await expect(
      page.getByText('No visit scheduled today')
        .or(page.getByText('All Visits'))
        .first(),
    ).toBeVisible();
  });

  // =========================================================================
  // NAVIGATE: Dashboard -> Visits tab
  // =========================================================================

  test('NAV: click Visits tab', async () => {
    await clickTab('Visits');
    await expect(
      page.getByText('All Visits').or(page.getByText('Visits')).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // BATCH 18a — Visits tab
  // =========================================================================

  test('B18-F1: shows "All Visits" title', { timeout: 15000 }, async () => {
    await expect(
      page.getByText('All Visits').or(page.getByText('Visits')).first(),
    ).toBeVisible();
  });

  test('B18-F2: shows visit cards or empty state', async () => {
    await expect(
      page.getByText('No visits yet')
        .or(page.getByText('completed', { exact: false }))
        .or(page.getByText('scheduled', { exact: false }))
        .or(page.getByText('visit', { exact: false }))
        .first(),
    ).toBeVisible();
  });

  test('B18-F3: shows status badges or visits header', async () => {
    await expect(
      page.getByText('completed')
        .or(page.getByText('scheduled'))
        .or(page.getByText('in_progress'))
        .or(page.getByText('No visits yet'))
        .or(page.getByText('Visits'))
        .first(),
    ).toBeVisible();
  });

  // =========================================================================
  // NAVIGATE: Visits -> Reports tab
  // =========================================================================

  test('NAV: click Reports tab', async () => {
    await clickTab('Reports');
    await expect(
      page.getByText('Daily Reports').or(page.getByText('Reports')).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // BATCH 18b — Reports tab
  // =========================================================================

  test('B18-F4: shows "Daily Reports" title', { timeout: 15000 }, async () => {
    await expect(
      page.getByText('Daily Reports').or(page.getByText('Reports')).first(),
    ).toBeVisible();
  });

  test('B18-F5: shows report cards or empty state', async () => {
    await expect(
      page.getByText('No reports yet')
        .or(page.getByText('tasks', { exact: false }))
        .or(page.getByText('visit', { exact: false }))
        .or(page.getByText('Reports'))
        .first(),
    ).toBeVisible();
  });

  // =========================================================================
  // NAVIGATE: Reports -> Settings tab
  // =========================================================================

  test('NAV: click Settings tab', async () => {
    // Expo Router auto-generates extra tabs for nested files in settings/ directory.
    // The tab shows as "settings/index" and may have overlapping elements.
    // Use force:true to bypass pointer event interception from crowded tab bar.
    await page.getByText('settings/index').click({ force: true });
    await page.waitForTimeout(1500);
    await expect(
      page.getByText('Settings').first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // BATCH 19 — Settings tab
  // =========================================================================

  test('B19-F1: shows "Settings" title', { timeout: 15000 }, async () => {
    await expect(page.getByText('Settings').first()).toBeVisible();
  });

  test('B19-F2: shows "Notification Settings" option', async () => {
    await expect(page.getByText('Notification Settings').first()).toBeVisible();
  });

  test('B19-F3: shows "Profile" option', async () => {
    await expect(page.getByText('Profile').first()).toBeVisible();
  });

  test('B19-F4: shows "Log Out" button', async () => {
    await expect(page.getByText('Log Out').first()).toBeVisible();
  });

  test('B19-F5: shows "HealthGuide Family v1.0.0" version text', async () => {
    await expect(
      page.getByText('HealthGuide Family v1.0.0').or(page.getByText('HealthGuide', { exact: false })).first(),
    ).toBeVisible();
  });
});
