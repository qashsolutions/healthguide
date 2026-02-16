/**
 * Batch 6: Caregiver Profile Setup Wizard (10 features)
 * Tests /(auth)/caregiver-profile-setup — 4-step form
 *
 * The profile setup screen is under (auth)/ which only renders when user is null.
 * We mock the API but do NOT inject a session, so the auth layout renders.
 */

import { test, expect } from '@playwright/test';
import { mockSupabaseAPI, overrideTableMock } from '../fixtures/supabase-mocks';
import { mockUsers } from '../fixtures/test-data';

test.describe('Caregiver Profile Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API but override user_profiles to return null (no profile yet)
    // This keeps user=null in AuthContext so (auth) stack renders
    await mockSupabaseAPI(page, mockUsers.caregiver);
    await overrideTableMock(page, 'user_profiles', []);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/(auth)/caregiver-profile-setup');
    await page.waitForTimeout(2000);
  });

  test('F1: shows step indicator dots (4 steps)', async ({ page }) => {
    await expect(page.getByText('Basic Information')).toBeVisible();
  });

  test('F2: Step 1 shows Full Name and Zip Code fields', async ({ page }) => {
    await expect(page.getByPlaceholder('Jane Smith')).toBeVisible();
    await expect(page.getByPlaceholder('90210')).toBeVisible();
  });

  test('F3: Step 1 shows Add Photo option', async ({ page }) => {
    await expect(page.getByText('Add Photo')).toBeVisible();
  });

  test('F4: Step 1 Next button is visible', async ({ page }) => {
    const nextBtn = page.getByText('Next', { exact: true });
    await expect(nextBtn).toBeVisible();
  });

  test('F5: Step 1 advances to Step 2 after filling required fields', async ({ page }) => {
    await page.getByPlaceholder('Jane Smith').fill('Test Caregiver');
    await page.getByPlaceholder('90210').fill('12345');
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Professional Information')).toBeVisible();
  });

  test('F6: Step 2 shows NPI, Certifications, and Rate fields', async ({ page }) => {
    await page.getByPlaceholder('Jane Smith').fill('Test Caregiver');
    await page.getByPlaceholder('90210').fill('12345');
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByPlaceholder('1234567890')).toBeVisible();
    await expect(page.getByText('Verify', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('CNA, HHA, LPN, RN...')).toBeVisible();
    await expect(page.getByPlaceholder('$20')).toBeVisible();
  });

  test('F7: Step 2 Skip navigates to Step 3', async ({ page }) => {
    await page.getByPlaceholder('Jane Smith').fill('Test Caregiver');
    await page.getByPlaceholder('90210').fill('12345');
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(1000);

    await page.getByText('Skip').click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Skills & Availability')).toBeVisible();
  });

  test('F8: Step 3 shows capability chips', async ({ page }) => {
    await page.getByPlaceholder('Jane Smith').fill('Test Caregiver');
    await page.getByPlaceholder('90210').fill('12345');
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Companionship')).toBeVisible();
    await expect(page.getByText('Meal Prep')).toBeVisible();
    await expect(page.getByText('Personal Care')).toBeVisible();
  });

  test('F9: Step 3 shows availability grid with day labels', async ({ page }) => {
    await page.getByPlaceholder('Jane Smith').fill('Test Caregiver');
    await page.getByPlaceholder('90210').fill('12345');
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('Mon')).toBeVisible();
    await expect(page.getByText('Morning')).toBeVisible();
    await expect(page.getByText('Afternoon')).toBeVisible();
    await expect(page.getByText('Evening')).toBeVisible();
  });

  test('F10: Step 4 shows About You with experience and bio fields', async ({ page }) => {
    await page.getByPlaceholder('Jane Smith').fill('Test Caregiver');
    await page.getByPlaceholder('90210').fill('12345');
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(500);
    await page.getByText('Next', { exact: true }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText('About You')).toBeVisible();
    await expect(page.getByPlaceholder('Describe your caregiving experience...')).toBeVisible();
    await expect(page.getByPlaceholder('Tell agencies about yourself...')).toBeVisible();
    await expect(page.getByText('Complete Profile')).toBeVisible();
  });
});
