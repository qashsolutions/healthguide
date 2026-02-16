/**
 * Batch 4: Agency Registration (9 features)
 * Tests /(auth)/register
 */

import { test, expect } from '@playwright/test';
import { mockSupabaseAPI } from '../fixtures/supabase-mocks';
import { mockUsers } from '../fixtures/test-data';

test.describe('Agency Registration', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabaseAPI(page, mockUsers.agency_owner);
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/(auth)/register');
    await page.waitForTimeout(2000);
  });

  test('F1: displays registration title and subtitle', async ({ page }) => {
    await expect(page.getByText('Register Your Agency')).toBeVisible();
    await expect(page.getByText('Set up your care agency in minutes')).toBeVisible();
  });

  test('F2: shows Agency Name field', async ({ page }) => {
    await expect(page.getByPlaceholder('Sunny Day Home Care')).toBeVisible();
  });

  test('F3: shows Full Name field', async ({ page }) => {
    await expect(page.getByPlaceholder('Jane Smith').first()).toBeVisible();
  });

  test('F4: shows Email field', async ({ page }) => {
    await expect(page.getByPlaceholder('jane@sunnydayhc.com')).toBeVisible();
  });

  test('F5: shows Password and Confirm Password fields', async ({ page }) => {
    await expect(page.getByPlaceholder('Minimum 8 characters')).toBeVisible();
    await expect(page.getByPlaceholder('Re-enter password')).toBeVisible();
  });

  test('F6: shows Create Agency Account button', async ({ page }) => {
    await expect(page.getByText('Create Agency Account')).toBeVisible();
  });

  test('F7: validates empty fields on submit', async ({ page }) => {
    await page.getByText('Create Agency Account').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Please fill in all fields')).toBeVisible();
  });

  test('F8: validates password mismatch', async ({ page }) => {
    await page.getByPlaceholder('Sunny Day Home Care').fill('My Agency');
    await page.getByPlaceholder('Jane Smith').first().fill('John Doe');
    await page.getByPlaceholder('jane@sunnydayhc.com').fill('john@test.com');
    await page.getByPlaceholder('Minimum 8 characters').fill('password123');
    await page.getByPlaceholder('Re-enter password').fill('differentpass');
    await page.getByText('Create Agency Account').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('F9: shows pricing info and Sign In link', async ({ page }) => {
    await expect(page.getByText('$15/elder/month', { exact: false })).toBeVisible();
    await expect(page.getByText('Already have an account?')).toBeVisible();
    await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
  });
});
