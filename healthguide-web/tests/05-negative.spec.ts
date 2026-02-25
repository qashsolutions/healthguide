import { test, expect } from '@playwright/test';
import { mockSearch, mockEmpty, mockError, mockNotFound, mockDetail, resetMock } from './helpers/mockApi';
import { MANY_SKILLS, FIFTY_PERCENT, FORTY_NINE_PERCENT, MARIA } from './fixtures/caregivers';

test.beforeEach(async ({ request }) => {
  await resetMock(request);
});

test('zip input: non-digit characters are stripped, only digits remain', async ({ page }) => {
  await page.goto('/');
  const zipInput = page.getByTestId('zip-input');
  // 'a1b23' is 5 chars (respects maxLength=5): letters stripped → '123'
  await zipInput.fill('a1b23');
  await expect(zipInput).toHaveValue('123');
});

test('zip input: type "123456789" → truncated to "12345" (max 5 digits)', async ({ page }) => {
  await page.goto('/');
  const zipInput = page.getByTestId('zip-input');
  await zipInput.fill('123456789');
  await expect(zipInput).toHaveValue('12345');
});

test('caregiver card with 5 skills → shows max 4 pills + "+1 more"', async ({ request, page }) => {
  await mockSearch(request, [MANY_SKILLS]);
  await page.goto('/caregivers?zip=90001');
  const card = page.getByTestId('caregiver-card').first();
  await expect(card).toBeVisible();
  // Should show "+1 more" since MANY_SKILLS has 5 capabilities (only 4 shown)
  await expect(card.getByText('+1')).toBeVisible();
});

test('API returns { success: false } → results page shows empty state, no crash', async ({
  request,
  page,
}) => {
  await mockError(request);
  await page.goto('/caregivers?zip=78201');
  // Page should render without crashing (no 500 error)
  const title = await page.title();
  expect(title).not.toContain('500');
  // No results shown
  const noResults = page.getByTestId('no-results');
  const emptyState = page.getByTestId('empty-state');
  const eitherVisible = (await noResults.isVisible()) || (await emptyState.isVisible());
  expect(eitherVisible).toBe(true);
});

test('navigate to non-existent caregiver ID → not-found state rendered', async ({
  request,
  page,
}) => {
  await mockNotFound(request);
  const response = await page.goto('/caregivers/00000000-0000-0000-0000-000000000000');
  // Next.js notFound() produces a 404 response
  expect(response?.status()).toBe(404);
});

test('/caregivers?zip=78201 with empty API response body → graceful empty state', async ({
  request,
  page,
}) => {
  await mockEmpty(request);
  await page.goto('/caregivers?zip=78201');
  await expect(page.getByTestId('no-results')).toBeVisible();
  // Ensure no unhandled JS error (page still interactive)
  await expect(page.getByTestId('zip-input')).toBeVisible();
});

test('rating badge with exactly 50% positive → thumbs up shown', async ({ request, page }) => {
  await mockDetail(request, FIFTY_PERCENT, []);
  await page.goto(`/caregivers/${FIFTY_PERCENT.id}`);
  const badge = page.getByTestId('rating-badge').first();
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('50%');
  // ≥50% → thumbs up 👍
  await expect(badge).toContainText('👍');
});

test('rating badge with 49% positive → thumbs down shown', async ({ request, page }) => {
  await mockDetail(request, FORTY_NINE_PERCENT, []);
  await page.goto(`/caregivers/${FORTY_NINE_PERCENT.id}`);
  const badge = page.getByTestId('rating-badge').first();
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('49%');
  // <50% → thumbs down 👎
  await expect(badge).toContainText('👎');
});
