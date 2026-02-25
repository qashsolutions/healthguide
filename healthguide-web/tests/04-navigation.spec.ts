import { test, expect } from '@playwright/test';
import { mockDetail, resetMock } from './helpers/mockApi';
import { MARIA, REVIEWS } from './fixtures/caregivers';

test.beforeEach(async ({ request }) => {
  await mockDetail(request, MARIA, REVIEWS);
});

test('navbar visible on homepage — logo, "Find Caregivers", "Get the App"', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation');
  await expect(nav).toBeVisible();
  await expect(nav.getByText('HealthGuide')).toBeVisible();
  await expect(nav.getByRole('link', { name: /Find Caregivers/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Get the App/i })).toBeVisible();
});

test('navbar visible on /caregivers results page', async ({ page }) => {
  await page.goto('/caregivers');
  const nav = page.getByRole('navigation');
  await expect(nav).toBeVisible();
  await expect(nav.getByText('HealthGuide')).toBeVisible();
});

test('navbar visible on caregiver detail page', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  const nav = page.getByRole('navigation');
  await expect(nav).toBeVisible();
  await expect(nav.getByText('HealthGuide')).toBeVisible();
});

test('footer visible on homepage — Quick Links section and "Sign up for free" link', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer).toBeVisible();
  await expect(footer.getByText('Quick Links')).toBeVisible();
  await expect(footer.getByRole('link', { name: /Sign up for free/i })).toBeVisible();
});

test('footer visible on /caregivers', async ({ page }) => {
  await page.goto('/caregivers');
  const footer = page.getByRole('contentinfo');
  await expect(footer).toBeVisible();
  await expect(footer.getByText('Quick Links')).toBeVisible();
});

test('footer visible on caregiver detail page', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  const footer = page.getByRole('contentinfo');
  await expect(footer).toBeVisible();
});

test('clicking the HealthGuide logo from results page navigates to /', async ({ page }) => {
  await page.goto('/caregivers');
  const nav = page.getByRole('navigation');
  // Click the HealthGuide logo link
  await nav.getByRole('link', { name: 'HealthGuide' }).click();
  await page.waitForURL('/');
  expect(page.url()).toMatch(/\/?$/);
});

test('clicking "Find Caregivers" nav link navigates to /caregivers', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation');
  await nav.getByRole('link', { name: /Find Caregivers/i }).click();
  await page.waitForURL('**/caregivers');
  expect(page.url()).toContain('/caregivers');
});

test('mobile viewport: navbar renders without overflow or broken layout', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const nav = page.getByRole('navigation');
  await expect(nav).toBeVisible();
  // Navbar should fit within the viewport width
  const navBox = await nav.boundingBox();
  expect(navBox).not.toBeNull();
  expect(navBox!.width).toBeLessThanOrEqual(375 + 1); // 1px tolerance
  await expect(nav.getByText('HealthGuide')).toBeVisible();
});

test('"Get the App" button href is #download (does not navigate away)', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation');
  const getAppBtn = nav.getByRole('link', { name: /Get the App/i });
  const href = await getAppBtn.getAttribute('href');
  expect(href).toBe('#download');
});
