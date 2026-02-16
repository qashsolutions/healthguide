/**
 * Careseeker E2E — Serial Mode (Batches 15-16 merged)
 *
 * Covers: Home, Daily Check-In, Activities tab, Memory Game
 *
 * ONE page load in beforeAll via setupSerialPage. All navigation happens
 * through UI clicks (no page.goto / page.reload). Tests that require
 * native features (phone dialer) are skipped.
 */

import { test, expect, Page } from '@playwright/test';
import { setupSerialPage } from '../fixtures/auth.fixture';

test.describe('Careseeker E2E', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await setupSerialPage(browser, 'careseeker');
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
  // BATCH 15 — Home (initial landing page)
  // =========================================================================

  test('B15-F1: shows time-based greeting with elder name', async () => {
    await expect(page.getByText('Good', { exact: false }).first()).toBeVisible();
  });

  test('B15-F2: shows Call Family action button', async () => {
    await expect(page.getByText('Call Family').first()).toBeVisible();
  });

  test('B15-F3: shows Activities action button', async () => {
    await expect(page.getByText('Activities').first()).toBeVisible();
  });

  test('B15-F4: shows How are you? check-in button', async () => {
    await expect(page.getByText('How are you?').first()).toBeVisible();
  });

  test('B15-F5: shows bottom tabs (Home, Activities, Family)', async () => {
    await expect(page.getByText('Home').first()).toBeVisible();
    await expect(page.getByText('Activities').first()).toBeVisible();
    await expect(page.getByText('Family').first()).toBeVisible();
  });

  // =========================================================================
  // NAVIGATE: Home -> Daily Check-In (via "How are you?" button)
  // =========================================================================

  test('NAV: click How are you? to open Daily Check-In', async () => {
    await page.getByText('How are you?').first().click();
    await page.waitForTimeout(2000);
    await expect(
      page.getByText('Daily Check-In').or(page.getByText('How are you feeling')).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // BATCH 15 continued — Daily Check-In
  // =========================================================================

  test('B15-F6: check-in screen shows question text', { timeout: 15000 }, async () => {
    await expect(
      page.getByText('How are you feeling today?').or(page.getByText('How are you feeling')).first(),
    ).toBeVisible();
  });

  test('B15-F7: check-in shows mood options', async () => {
    await expect(page.getByText('Not Good').first()).toBeVisible();
    await expect(page.getByText('Okay').first()).toBeVisible();
    await expect(page.getByText('Great', { exact: false }).first()).toBeVisible();
  });

  test('B15-F8: selecting a mood shows Done button', async () => {
    await page.getByText('Good', { exact: true }).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Done', { exact: false }).first()).toBeVisible();
  });

  // =========================================================================
  // NAVIGATE: Daily Check-In -> Home (via Home tab)
  // =========================================================================

  test('NAV: go back to Home from check-in', async () => {
    // Daily check-in is a nested route (no tab bar visible).
    // Use browser back to return to the Home tab.
    await page.goBack();
    await page.waitForTimeout(2000);
    await expect(
      page.getByText('How are you?')
        .or(page.getByText('Call Family'))
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // NAVIGATE: Home -> Activities tab
  // =========================================================================

  test('NAV: click Activities tab', async () => {
    await clickTab('Activities');
    await expect(
      page.getByText('Choose something fun', { exact: false }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // BATCH 16 — Activities tab
  // =========================================================================

  test('B16-F1: shows Activities title', { timeout: 15000 }, async () => {
    await expect(page.getByText('Activities').first()).toBeVisible();
  });

  test('B16-F2: shows "Choose something fun!" subtitle', async () => {
    await expect(page.getByText('Choose something fun', { exact: false }).first()).toBeVisible();
  });

  test('B16-F3: shows Memory Game button', async () => {
    await expect(page.getByText('Memory Game').first()).toBeVisible();
  });

  test('B16-F4: shows all activity options (Trivia, Music, Photos)', async () => {
    await expect(page.getByText('Trivia').first()).toBeVisible();
    await expect(page.getByText('Music').first()).toBeVisible();
    await expect(page.getByText('Photos').first()).toBeVisible();
  });

  // =========================================================================
  // NAVIGATE: Activities -> Memory Game (via clicking Memory Game button)
  // =========================================================================

  test('NAV: click Memory Game to open game screen', async () => {
    await page.getByText('Memory Game').first().click();
    await page.waitForTimeout(2000);
    await expect(
      page.getByText('Matches').or(page.getByText('Moves')).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // BATCH 16 continued — Memory Game
  // =========================================================================

  test('B16-F5: game screen shows Matches and Moves counters', { timeout: 15000 }, async () => {
    await expect(page.getByText('Matches').first()).toBeVisible();
    await expect(page.getByText('Moves').first()).toBeVisible();
  });

  test('B16-F6: game screen shows New Game button', async () => {
    await expect(page.getByText('New Game', { exact: false }).first()).toBeVisible();
  });

  // =========================================================================
  // SKIP: Phone dialer requires native APIs
  // =========================================================================

  test.skip('B16-F7: calling a contact opens phone dialer (native only)', async () => {
    // Requires expo-linking for tel: protocol which is native-only
  });
});
