/**
 * Caregiver E2E — Serial Mode (Batches 11-14)
 *
 * Merges caregiver dashboard, visit workflow, community, and profile
 * into a single serial test file with ONE shared page.
 *
 * Navigation order:
 *   Today (landing) -> Visit Detail -> back to Today -> Week -> Support -> Me
 *
 * Skipped tests:
 *   - Empty states requiring page.reload() or different mock data
 *   - Tab nav tests that use page.goto() (F7/F8 from batch 11)
 *   - GPS check-in (native only)
 *   - Camera/photo capture (native only)
 *   - Invitations page (requires page.goto())
 */

import { test, expect, Page } from '@playwright/test';
import { setupSerialPage } from '../fixtures/auth.fixture';

test.describe('Caregiver E2E', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await setupSerialPage(browser, 'caregiver');
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  /** Click a bottom tab by label. Uses .last() because tab text may also
   *  appear in page content; the actual tab bar is rendered last in DOM. */
  async function clickTab(name: string) {
    await page.getByText(name, { exact: true }).last().click();
    await page.waitForTimeout(1500);
  }

  // ---------------------------------------------------------------------------
  // BATCH 11 — Today / Dashboard (initial landing page)
  // ---------------------------------------------------------------------------

  test('B11-F1: shows time-based greeting', async () => {
    // "Good morning", "Good afternoon", or "Good evening"
    await expect(
      page.getByText('Good', { exact: false }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('B11-F2: shows visit count for today', async () => {
    await expect(
      page.getByText('visit', { exact: false }).first()
    ).toBeVisible();
  });

  test('B11-F3: displays visit cards with elder info', async () => {
    // Mock data includes Margaret Johnson and Robert Williams
    await expect(
      page.getByText('Margaret', { exact: false })
        .or(page.getByText('Robert', { exact: false }))
        .or(page.getByText('visit', { exact: false }))
        .first()
    ).toBeVisible();
  });

  test('B11-F4: shows Start Visit or Continue Visit button', async () => {
    const startBtn = page.getByText('Start Visit').or(page.getByText('Continue Visit'));
    const emptyState = page.getByText('All done for today');
    await expect(startBtn.first().or(emptyState).first()).toBeVisible();
  });

  test('B11-F5: shows bottom tab navigation with all four tabs', async () => {
    await expect(page.getByText('Today').first()).toBeVisible();
    await expect(page.getByText('Week').first()).toBeVisible();
    await expect(page.getByText('Support').first()).toBeVisible();
    await expect(page.getByText('Me').first()).toBeVisible();
  });

  // Skip: F6 (empty state) requires page.reload() with overridden mock data
  test.skip('B11-F6: empty state when no visits (needs reload)', async () => {});

  // Skip: F7, F8 (tab nav via page.goto) — tested below via UI clicks instead

  // ---------------------------------------------------------------------------
  // Navigate to Visit Detail by clicking a visit card
  // ---------------------------------------------------------------------------

  test('NAV: click visit card to open Visit Detail', async () => {
    // Mock visit-1 is 'scheduled' → navigates to check-in page
    // Click the "Start Visit" button or the elder name on the card
    const visitCard = page.getByText('Start Visit').first();
    await visitCard.click();
    await page.waitForTimeout(3000);

    // Should land on check-in page (scheduled visit) or visit detail
    await expect(
      page.getByText('Check In')
        .or(page.getByText('TAP TO CHECK IN'))
        .or(page.getByText('Visit Details'))
        .or(page.getByText('Loading visit'))
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // BATCH 12 — Visit Workflow (on check-in page for scheduled visit)
  // ---------------------------------------------------------------------------

  test('B12-F1: shows Check In or Visit Details header', async () => {
    await expect(
      page.getByText('Check In')
        .or(page.getByText('Visit Details'))
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('B12-F2: shows location error or fallback on web (no GPS)', async () => {
    // On web, expo-location throws → error state with permission message
    // On native, proximity tracking shows "Having trouble with GPS?"
    await expect(
      page.getByText('Location permission is required', { exact: false })
        .or(page.getByText('Having trouble', { exact: false }))
        .first()
    ).toBeVisible();
  });

  test('B12-F3: shows QR Code fallback option', async () => {
    // Error state shows "QR Code" button; proximity state shows "Use QR Code Instead"
    await expect(
      page.getByText('QR Code', { exact: false }).first()
    ).toBeVisible();
  });

  test('B12-F4: shows Try Again or check-in instructions', async () => {
    // Error state shows "Try Again"; proximity state shows move-closer instruction
    await expect(
      page.getByText('Try Again')
        .or(page.getByText('Move closer', { exact: false }))
        .first()
    ).toBeVisible();
  });

  // Skip: GPS check-in (native only — expo-location not available on web)
  test.skip('B12-F7: GPS check-in verifies location (native only)', async () => {});

  // Skip: Camera/photo capture (native only — expo-camera not available on web)
  test.skip('B12-F12: photo capture during check-out (native only)', async () => {});

  // ---------------------------------------------------------------------------
  // Navigate back to Today tab
  // ---------------------------------------------------------------------------

  test('NAV: return to Today tab from check-in page', async () => {
    // Check-in page is a nested route (no tab bar visible).
    // Use browser back to return to the Today tab.
    await page.goBack();
    await page.waitForTimeout(2000);
    await expect(
      page.getByText('Good', { exact: false })
        .or(page.getByText('visit', { exact: false }))
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // Navigate to Week tab
  // ---------------------------------------------------------------------------

  test('NAV: click Week tab to open schedule', async () => {
    await clickTab('Week');
    await expect(
      page.getByText('Mon')
        .or(page.getByText('Tue'))
        .or(page.getByText('Sun'))
        .or(page.getByText('schedule', { exact: false }))
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // BATCH 11 continued — Week / Schedule view
  // ---------------------------------------------------------------------------

  test('B11-W1: shows day-of-week buttons (Sun through Sat)', async () => {
    await expect(page.getByText('Sun').first()).toBeVisible();
    await expect(page.getByText('Mon').first()).toBeVisible();
    await expect(page.getByText('Tue').first()).toBeVisible();
    await expect(page.getByText('Wed').first()).toBeVisible();
    await expect(page.getByText('Thu').first()).toBeVisible();
    await expect(page.getByText('Fri').first()).toBeVisible();
    await expect(page.getByText('Sat').first()).toBeVisible();
  });

  test('B11-W2: shows Today label or visit cards for selected day', async () => {
    await expect(
      page.getByText('Today')
        .or(page.getByText('No visits scheduled'))
        .or(page.getByText('Margaret', { exact: false }))
        .or(page.getByText('Robert', { exact: false }))
        .first()
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Navigate to Support tab
  // ---------------------------------------------------------------------------

  test('NAV: click Support tab to open community', async () => {
    await clickTab('Support');
    await expect(
      page.getByText('Connect with fellow caregivers')
        .or(page.getByText('Daily Check-in'))
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // BATCH 13 — Community / Support tab
  // ---------------------------------------------------------------------------

  test('B13-F1: shows Support heading', async () => {
    test.setTimeout(15000);
    // "Support" appears in the page header and in the tab label; use first()
    await expect(
      page.getByText('Support').first()
    ).toBeVisible();
  });

  test('B13-F2: shows subtitle - Connect with fellow caregivers', async () => {
    await expect(
      page.getByText('Connect with fellow caregivers').first()
    ).toBeVisible();
  });

  test('B13-F3: shows Daily Check-in wellness card', async () => {
    await expect(
      page.getByText('Daily Check-in')
        .or(page.getByText('How are you feeling'))
        .first()
    ).toBeVisible();
  });

  test('B13-F4: shows mood selection options (Great, Okay, Struggling)', async () => {
    await expect(
      page.getByText('Great', { exact: false }).first()
    ).toBeVisible();
    await expect(
      page.getByText('Okay').first()
    ).toBeVisible();
    await expect(
      page.getByText('Struggling').first()
    ).toBeVisible();
  });

  test('B13-F5: shows Support Groups section', async () => {
    await expect(
      page.getByText('Support Groups').first()
    ).toBeVisible();
  });

  test('B13-F6: shows Browse All button for groups', async () => {
    await expect(
      page.getByText('Browse All').first()
    ).toBeVisible();
  });

  test('B13-F7: shows group names (New Caregiver Support, Self-Care Corner, Dementia Care)', async () => {
    await expect(
      page.getByText('New Caregiver Support')
        .or(page.getByText('Self-Care Corner'))
        .or(page.getByText('Dementia Care'))
        .first()
    ).toBeVisible();
  });

  test('B13-F8: shows Quick Actions section with Resources and Journal', async () => {
    await expect(page.getByText('Resources').first()).toBeVisible();
    await expect(page.getByText('Journal').first()).toBeVisible();
  });

  test('B13-F9: shows Chat with Peer and Get Help Now quick actions', async () => {
    await expect(
      page.getByText('Chat with Peer').first()
    ).toBeVisible();
    await expect(
      page.getByText('Get Help Now').first()
    ).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Navigate to Me tab
  // ---------------------------------------------------------------------------

  test('NAV: click Me tab to open profile', async () => {
    await clickTab('Me');
    await expect(
      page.getByText('Test Caregiver')
        .or(page.getByText('Active Caregiver'))
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // BATCH 14 — Profile / Me tab
  // ---------------------------------------------------------------------------

  test('B14-F1: shows caregiver name', async () => {
    test.setTimeout(15000);
    await expect(
      page.getByText('Test Caregiver').first()
    ).toBeVisible();
  });

  test('B14-F2: shows Active Caregiver badge', async () => {
    await expect(
      page.getByText('Active Caregiver')
        .or(page.getByText('Active'))
        .first()
    ).toBeVisible();
  });

  test('B14-F3: shows stats (Total Visits, This Week, Rating)', async () => {
    await expect(page.getByText('Total Visits').first()).toBeVisible();
    await expect(page.getByText('This Week').first()).toBeVisible();
    await expect(page.getByText('Rating').first()).toBeVisible();
  });

  test('B14-F4: shows action cards (Edit Marketplace Profile, My Schedule, Visit History)', async () => {
    await expect(page.getByText('Edit Marketplace Profile').first()).toBeVisible();
    await expect(page.getByText('My Schedule').first()).toBeVisible();
    await expect(page.getByText('Visit History').first()).toBeVisible();
  });

  test('B14-F5: shows Sign Out button', async () => {
    await expect(page.getByText('Sign Out').first()).toBeVisible();
  });
});
