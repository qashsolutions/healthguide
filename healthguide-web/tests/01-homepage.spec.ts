import { test, expect } from '@playwright/test';
import { resetMock } from './helpers/mockApi';
import { ALL_CAPABILITIES, CAPABILITY_LABELS } from '../src/types/caregiver';

test.beforeEach(async ({ request }) => {
  await resetMock(request);
});

test('page title and hero heading visible', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/HealthGuide/);
  await expect(page.getByRole('heading', { name: /Find Trusted Caregivers/i })).toBeVisible();
  await expect(page.getByText('in Your Area', { exact: true })).toBeVisible();
});

test('zip code input renders with correct placeholder', async ({ page }) => {
  await page.goto('/');
  const zipInput = page.getByTestId('zip-input');
  await expect(zipInput).toBeVisible();
  await expect(zipInput).toHaveAttribute('placeholder', 'e.g., 78201');
});

test('all 8 skill filter buttons render with correct labels', async ({ page }) => {
  await page.goto('/');
  for (const cap of ALL_CAPABILITIES) {
    const label = CAPABILITY_LABELS[cap] || cap;
    await expect(page.getByTestId(`skill-btn-${cap}`)).toBeVisible();
    await expect(page.getByTestId(`skill-btn-${cap}`)).toContainText(label);
  }
});

test('no skill buttons are selected by default', async ({ page }) => {
  await page.goto('/');
  for (const cap of ALL_CAPABILITIES) {
    const btn = page.getByTestId(`skill-btn-${cap}`);
    // Selected class includes "bg-hg-emerald-50" — unselected does not
    await expect(btn).not.toHaveClass(/bg-hg-emerald-50/);
  }
});

test('clicking a skill button toggles its selected state', async ({ page }) => {
  await page.goto('/');
  const btn = page.getByTestId('skill-btn-companionship');
  await expect(btn).not.toHaveClass(/bg-hg-emerald-50/);
  await btn.click();
  await expect(btn).toHaveClass(/bg-hg-emerald-50/);
});

test('clicking a selected skill button deselects it', async ({ page }) => {
  await page.goto('/');
  const btn = page.getByTestId('skill-btn-companionship');
  await btn.click();
  await expect(btn).toHaveClass(/bg-hg-emerald-50/);
  await btn.click();
  await expect(btn).not.toHaveClass(/bg-hg-emerald-50/);
});

test('entering zip and clicking Search navigates to /caregivers with zip param', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('zip-input').fill('78201');
  await page.getByTestId('search-btn').click();
  await page.waitForURL('**/caregivers**');
  expect(page.url()).toContain('zip=78201');
});

test('selecting skill and searching includes capabilities param in URL', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('skill-btn-companionship').click();
  await page.getByTestId('zip-input').fill('78201');
  await page.getByTestId('search-btn').click();
  await page.waitForURL('**/caregivers**');
  expect(page.url()).toContain('capabilities=companionship');
});

test('selecting multiple skills includes all in URL (comma-separated)', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('skill-btn-companionship').click();
  await page.getByTestId('skill-btn-errands').click();
  await page.getByTestId('zip-input').fill('78201');
  await page.getByTestId('search-btn').click();
  await page.waitForURL('**/caregivers**');
  const url = page.url();
  expect(url).toContain('companionship');
  expect(url).toContain('errands');
});

test('three value-prop cards are visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Verified Credentials' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Transparent Ratings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Free for Caregivers' })).toBeVisible();
});

test('Download CTA section and store buttons are present', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('download-cta')).toBeVisible();
  await expect(page.getByRole('link', { name: /App Store/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Google Play/i })).toBeVisible();
});

test('typing letters in zip input strips non-digit characters', async ({ page }) => {
  await page.goto('/');
  const zipInput = page.getByTestId('zip-input');
  await zipInput.fill('abc12');
  await expect(zipInput).toHaveValue('12');
});
