/**
 * Batch 3: Phone Login + OTP Verify (8 features)
 * Tests /(auth)/phone-login and /(auth)/verify-otp
 */

import { test, expect } from '@playwright/test';
import { mockSupabaseAPI, mockOTPSend, mockOTPVerifyError } from '../fixtures/supabase-mocks';
import { mockUsers } from '../fixtures/test-data';

test.describe('Phone Login + OTP', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page, mockUsers.caregiver);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('Phone Login Screen', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/(auth)/phone-login?role=caregiver');
      await page.waitForTimeout(2000);
    });

    test('F1: displays Caregiver Login title', async ({ page }) => {
      await expect(page.getByText('Caregiver Login')).toBeVisible();
    });

    test('F2: shows phone number input with placeholder', async ({ page }) => {
      await expect(page.getByPlaceholder('(555) 123-4567')).toBeVisible();
    });

    test('F3: shows Send Code button', async ({ page }) => {
      await expect(page.getByText('Send Code')).toBeVisible();
    });

    test('F4: validates short phone number', async ({ page }) => {
      await page.getByPlaceholder('(555) 123-4567').fill('123');
      await page.getByText('Send Code').click();
      await page.waitForTimeout(500);
      await expect(page.getByText('Please enter a valid phone number')).toBeVisible();
    });

    test('F5: shows help text about verification', async ({ page }) => {
      await expect(page.getByText("We'll send a 6-digit code", { exact: false })).toBeVisible();
    });

    test('F6: navigates to OTP screen on valid phone', async ({ page }) => {
      await mockOTPSend(page);
      await page.getByPlaceholder('(555) 123-4567').fill('5551234567');
      await page.getByText('Send Code').click();
      await page.waitForTimeout(2000);
      await expect(page.getByText('Verify Your Phone')).toBeVisible();
    });
  });

  test.describe('OTP Verification Screen', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/(auth)/verify-otp?phone=%2B15551234567&role=caregiver');
      await page.waitForTimeout(2000);
    });

    test('F7: displays Verify Your Phone title and phone number', async ({ page }) => {
      await expect(page.getByText('Verify Your Phone')).toBeVisible();
      await expect(page.getByText('We sent a 6-digit code to')).toBeVisible();
    });

    test('F8: shows Resend Code section with countdown', async ({ page }) => {
      await expect(page.getByText("Didn't receive the code?")).toBeVisible();
      // Initially shows countdown
      await expect(page.getByText(/Resend in \d+s/)).toBeVisible();
    });
  });
});
