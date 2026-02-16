/**
 * Batch 20: Cross-Role Navigation, Error States, Auth Guards (8 features)
 *
 * Tests public pages: auth guards, terms, privacy, join-group, welcome navigation.
 * These are unauthenticated pages — no serial mode needed (each test gets its own page).
 *
 * F6 (Sign Out visibility) is covered by B10-F8 in agency-owner.serial.spec.ts.
 */

import { test, expect } from '@playwright/test';
import { mockSupabaseAPI } from '../fixtures/supabase-mocks';
import { mockUsers } from '../fixtures/test-data';

test.describe('Cross-Role Navigation & Error States', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks + process.cwd polyfill for all tests
    await mockSupabaseAPI(page, mockUsers.agency_owner);
  });

  test('F1: unauthenticated user accessing protected route redirects to auth', async ({ page }) => {
    // Navigate to protected route without session — should redirect to auth
    await page.goto('/(protected)/agency/', { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(
        () => (document.body?.innerText?.trim().length ?? 0) > 0,
        { timeout: 15000 },
      );
    } catch {
      await page.waitForTimeout(5000);
    }
    // Should show auth/welcome screen (redirected)
    await expect(
      page.getByText('HealthGuide').or(page.getByText('I am a')).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('F2: Terms & Conditions page is accessible', async ({ page }) => {
    await page.goto('/(auth)/terms', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Terms & Conditions').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Acceptance of Terms', { exact: false }).first()).toBeVisible();
  });

  test('F3: Privacy Policy page is accessible', async ({ page }) => {
    await page.goto('/(auth)/privacy-policy', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Privacy Policy').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Information We Collect', { exact: false }).first()).toBeVisible();
  });

  test('F4: Join Group page shows invite code input', async ({ page }) => {
    await page.goto('/(auth)/join-group', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await expect(page.getByText('Join Care Group').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder('XXXXXXXX')).toBeVisible();
    await expect(page.getByText('Continue').first()).toBeVisible();
  });

  test('F5: Join Group validates empty invite code', async ({ page }) => {
    await page.goto('/(auth)/join-group', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // The Continue button may be disabled when the invite code is empty.
    // Click it with force:true to trigger validation regardless.
    await page.getByText('Continue').first().click({ force: true });
    await page.waitForTimeout(500);
    await expect(
      page.getByText('valid', { exact: false })
        .or(page.getByText('invite code', { exact: false }))
        .or(page.getByText('required', { exact: false }))
        .or(page.getByText('enter', { exact: false }))
        .first(),
    ).toBeVisible({ timeout: 5000 });
  });

  // F6: Sign Out visibility — covered by B10-F8 in agency-owner.serial.spec.ts
  test.skip('F6: Sign out (covered by agency-owner.serial.spec.ts B10-F8)', async () => {});

  test('F7: Welcome screen navigates to login from Agency Owner card', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(
        () => (document.body?.innerText?.trim().length ?? 0) > 0,
        { timeout: 15000 },
      );
    } catch {
      await page.waitForTimeout(5000);
    }
    await page.getByText('Agency Owner').first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByText('Agency Owner Login').first()).toBeVisible({ timeout: 10000 });
  });

  test('F8: Welcome screen New agency link navigates to register', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(
        () => (document.body?.innerText?.trim().length ?? 0) > 0,
        { timeout: 15000 },
      );
    } catch {
      await page.waitForTimeout(5000);
    }
    await page.getByText('New agency? Register here').first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByText('Register Your Agency').first()).toBeVisible({ timeout: 10000 });
  });
});
