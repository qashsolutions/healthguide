import { test, expect } from '@playwright/test';
import { mockSearch, mockEmpty, mockError, resetMock } from './helpers/mockApi';
import { MARIA, JAMES, searchResponse } from './fixtures/caregivers';

test.beforeEach(async ({ request }) => {
  // Default to 2 results for most tests
  await mockSearch(request, [MARIA, JAMES]);
});

test('/caregivers with no params shows "Enter a zip code" empty state', async ({ page }) => {
  await page.goto('/caregivers');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByText(/Enter a zip code/i)).toBeVisible();
  await expect(page.getByTestId('caregivers-grid')).not.toBeVisible();
});

test('/caregivers?zip=78201 shows result count text', async ({ page }) => {
  await page.goto('/caregivers?zip=78201');
  const resultCount = page.getByTestId('result-count');
  await expect(resultCount).toBeVisible();
  await expect(resultCount).toContainText('caregivers found');
});

test('caregiver cards appear in grid matching mock data count', async ({ page }) => {
  await page.goto('/caregivers?zip=78201');
  await expect(page.getByTestId('caregivers-grid')).toBeVisible();
  const cards = page.getByTestId('caregiver-card');
  await expect(cards).toHaveCount(2);
});

test('each card shows name, capability pills, and rating badge', async ({ page }) => {
  await page.goto('/caregivers?zip=78201');
  const firstCard = page.getByTestId('caregiver-card').first();
  // Name
  await expect(firstCard.getByText('Maria Santos')).toBeVisible();
  // At least one capability pill
  await expect(firstCard.getByText('Companionship')).toBeVisible();
  // Rating badge or "No reviews yet"
  const hasRating = await firstCard.getByTestId('rating-badge').isVisible();
  const hasNoReviews = await firstCard.getByTestId('no-reviews').isVisible();
  expect(hasRating || hasNoReviews).toBe(true);
});

test('NPI-verified caregiver shows Verified badge on card', async ({ page }) => {
  await page.goto('/caregivers?zip=78201');
  // Maria is NPI verified — her card should show the Verified badge
  const cards = page.getByTestId('caregiver-card');
  const mariaCard = cards.first(); // Maria is first in mock
  await expect(mariaCard.getByTitle('NPI Verified')).toBeVisible();
});

test('clicking a caregiver card navigates to /caregivers/[id]', async ({ page }) => {
  await page.goto('/caregivers?zip=78201');
  await page.getByTestId('caregiver-card').first().click();
  await page.waitForURL(`**/caregivers/${MARIA.id}`);
  expect(page.url()).toContain(`/caregivers/${MARIA.id}`);
});

test('Load More button is present when has_more is true', async ({ request, page }) => {
  await mockSearch(request, [MARIA, JAMES], { hasMore: true, total: 25 });
  await page.goto('/caregivers?zip=78201');
  await expect(page.getByTestId('load-more')).toBeVisible();
  await expect(page.getByTestId('load-more')).toContainText('Load More');
});

test('clicking Load More updates URL with page=2', async ({ request, page }) => {
  await mockSearch(request, [MARIA, JAMES], { hasMore: true, total: 25 });
  await page.goto('/caregivers?zip=78201');
  const loadMore = page.getByTestId('load-more');
  await expect(loadMore).toBeVisible();

  // Check href contains page=2
  const href = await loadMore.getAttribute('href');
  expect(href).toContain('page=2');
});

test('capability filter is pre-selected when capabilities param is in URL', async ({ page }) => {
  await page.goto('/caregivers?zip=78201&capabilities=companionship');
  // The companionship skill button should be visually selected
  const companionshipBtn = page.getByTestId('skill-btn-companionship');
  await expect(companionshipBtn).toHaveClass(/bg-hg-emerald-50/);
});

test('Download CTA is visible at bottom of results page', async ({ page }) => {
  await page.goto('/caregivers?zip=78201');
  const cta = page.getByTestId('download-cta');
  await expect(cta).toBeVisible();
});

test('mock returns 0 caregivers → "No Caregivers Found" shown, grid hidden', async ({
  request,
  page,
}) => {
  await mockEmpty(request);
  await page.goto('/caregivers?zip=78201');
  await expect(page.getByTestId('no-results')).toBeVisible();
  await expect(page.getByText('No Caregivers Found')).toBeVisible();
  await expect(page.getByTestId('caregivers-grid')).not.toBeVisible();
});

test('mock returns error → empty state shown, no crash', async ({ request, page }) => {
  await mockError(request);
  await page.goto('/caregivers?zip=78201');
  // Should show no-results or empty state — either is acceptable; page must not crash
  const noResults = page.getByTestId('no-results');
  const emptyState = page.getByTestId('empty-state');
  const eitherVisible =
    (await noResults.isVisible()) || (await emptyState.isVisible());
  expect(eitherVisible).toBe(true);
});
