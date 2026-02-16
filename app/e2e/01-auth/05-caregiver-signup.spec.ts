/**
 * Batch 5: Caregiver Phone Signup (8 features)
 * Tests /(auth)/caregiver-signup
 */

import { test, expect } from '@playwright/test';
import { mockSupabaseAPI, mockOTPSend } from '../fixtures/supabase-mocks';
import { mockUsers } from '../fixtures/test-data';

test.describe('Caregiver Signup', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page, mockUsers.caregiver);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/(auth)/caregiver-signup');
    await page.waitForTimeout(2000);
  });

  test('F1: displays signup title', async ({ page }) => {
    await expect(page.getByText('Create Your Caregiver Profile')).toBeVisible();
  });

  test('F2: shows free tagline', async ({ page }) => {
    await expect(page.getByText('Free — showcase your skills to agencies')).toBeVisible();
  });

  test('F3: shows phone number input', async ({ page }) => {
    await expect(page.getByPlaceholder('(555) 123-4567')).toBeVisible();
  });

  test('F4: shows +1 country code prefix', async ({ page }) => {
    await expect(page.getByText('+1')).toBeVisible();
  });

  test('F5: shows Send Code button', async ({ page }) => {
    await expect(page.getByText('Send Code')).toBeVisible();
  });

  test('F6: validates short phone number', async ({ page }) => {
    await page.getByPlaceholder('(555) 123-4567').fill('555');
    await page.getByText('Send Code').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Please enter a valid phone number')).toBeVisible();
  });

  test('F7: shows help text about SMS rates', async ({ page }) => {
    await expect(page.getByText('Standard messaging rates may apply', { exact: false })).toBeVisible();
  });

  test('F8: shows sign-in link for existing accounts', async ({ page }) => {
    await expect(page.getByText('Already have an account?')).toBeVisible();
    await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
  });
});
