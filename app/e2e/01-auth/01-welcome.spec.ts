/**
 * Batch 1: Welcome Screen (6 features)
 * Tests the role selection / landing page at /(auth)
 */

import { test, expect } from '@playwright/test';
import { mockSupabaseAPI } from '../fixtures/supabase-mocks';
import { mockUsers } from '../fixtures/test-data';

test.describe('Welcome Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase to prevent real API calls (unauthenticated state)
    await mockSupabaseAPI(page, mockUsers.agency_owner);
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.waitForTimeout(2000);
  });

  test('F1: displays HealthGuide branding and subtitle', async ({ page }) => {
    await expect(page.getByText('HealthGuide')).toBeVisible();
    await expect(page.getByText('Professional Elder Care Management')).toBeVisible();
  });

  test('F2: shows "I am a..." role selection section', async ({ page }) => {
    await expect(page.getByText('I am a...')).toBeVisible();
  });

  test('F3: shows Agency Owner card that navigates to login', async ({ page }) => {
    await expect(page.getByText('Agency Owner')).toBeVisible();
    await expect(page.getByText('Manage your care agency')).toBeVisible();
    await page.getByText('Agency Owner').click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Agency Owner Login')).toBeVisible();
  });

  test('F4: shows Caregiver card that navigates to signup', async ({ page }) => {
    await expect(page.getByText('Caregiver').first()).toBeVisible();
    await expect(page.getByText('Sign up to offer care services')).toBeVisible();
    await page.getByText('Caregiver').first().click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('Create Your Caregiver Profile')).toBeVisible();
  });

  test('F5: shows invite code button for family/elder', async ({ page }) => {
    await expect(page.getByText('I have an invite code')).toBeVisible();
    await expect(page.getByText('Join as family member or elder')).toBeVisible();
  });

  test('F6: shows Privacy Policy and Terms links', async ({ page }) => {
    await expect(page.getByText('Privacy Policy')).toBeVisible();
    await expect(page.getByText('Terms & Conditions')).toBeVisible();
  });
});
