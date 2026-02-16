/**
 * Batch 2: Agency Owner Login (8 features)
 * Tests the email/password login screen at /(auth)/login
 */

import { test, expect } from '@playwright/test';
import { mockSupabaseAPI, mockAuthError } from '../fixtures/supabase-mocks';
import { mockUsers, SUPABASE_URL } from '../fixtures/test-data';

test.describe('Agency Owner Login', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page, mockUsers.agency_owner);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/(auth)/login');
    await page.waitForTimeout(2000);
  });

  test('F1: displays login title and subtitle', async ({ page }) => {
    await expect(page.getByText('Agency Owner Login')).toBeVisible();
    await expect(page.getByText('Sign in to manage your care agency')).toBeVisible();
  });

  test('F2: shows email and password input fields', async ({ page }) => {
    await expect(page.getByPlaceholder('you@agency.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  });

  test('F3: shows Sign In button', async ({ page }) => {
    await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
  });

  test('F4: validates empty fields on submit', async ({ page }) => {
    await page.getByText('Sign In', { exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Please enter your email and password')).toBeVisible();
  });

  test('F5: accepts email input', async ({ page }) => {
    const emailInput = page.getByPlaceholder('you@agency.com');
    await emailInput.fill('owner@agency.com');
    await expect(emailInput).toHaveValue('owner@agency.com');
  });

  test('F6: accepts password input', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('••••••••');
    await passwordInput.fill('password123');
    // Password field won't show value via toHaveValue in some cases, verify it's filled
    await expect(passwordInput).not.toBeEmpty();
  });

  test('F7: login form submits credentials to auth API', async ({ page }) => {
    // Track auth API calls to verify the form submits correctly
    let tokenRequestMade = false;
    let requestBody = '';
    page.on('request', (req) => {
      if (req.url().includes('/auth/v1/token') && req.method() === 'POST') {
        tokenRequestMade = true;
        requestBody = req.postData() || '';
      }
    });

    await page.getByPlaceholder('you@agency.com').fill('test@agency.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByText('Sign In', { exact: true }).click();
    await page.waitForTimeout(2000);

    // Verify the auth API was called with the entered credentials
    expect(tokenRequestMade).toBe(true);
    expect(requestBody).toContain('test@agency.com');
    expect(requestBody).toContain('password123');
  });

  test('F8: shows Register link in footer', async ({ page }) => {
    await expect(page.getByText('Register')).toBeVisible();
    await expect(page.getByText("Don't have an account?")).toBeVisible();
  });
});
