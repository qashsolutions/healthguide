import { test, expect } from '@playwright/test';
import { mockDetail, mockNotFound, resetMock } from './helpers/mockApi';
import { MARIA, JAMES, LOW_RATING, REVIEWS } from './fixtures/caregivers';

test.beforeEach(async ({ request }) => {
  await mockDetail(request, MARIA, REVIEWS);
});

test('profile name (h1) renders with caregiver full name', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  const profileName = page.getByTestId('profile-name');
  await expect(profileName).toBeVisible();
  await expect(profileName).toContainText('Maria Santos');
});

test('NPI-verified caregiver shows NPI badge on profile', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  await expect(page.getByTestId('profile-npi')).toBeVisible();
  await expect(page.getByTestId('profile-npi')).toContainText('NPI Verified');
});

test('area (zip prefix) shows on profile', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  await expect(page.getByText(/Area:.*782xx/i)).toBeVisible();
});

test('photo URL present → img renders (not initials)', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  // Maria has a photo_url — should render an <img>, not the initials div
  const img = page.locator('img[alt="Maria Santos"]');
  await expect(img).toBeVisible();
  await expect(page.getByTestId('avatar-initials')).not.toBeVisible();
});

test('skills section lists all capability pills', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  const skillsSection = page.getByTestId('profile-skills');
  await expect(skillsSection).toBeVisible();
  // Maria has 5 capabilities
  await expect(skillsSection.getByText('Companionship')).toBeVisible();
  await expect(skillsSection.getByText('Meal Prep')).toBeVisible();
  await expect(skillsSection.getByText('Light Housekeeping')).toBeVisible();
});

test('bio section shows bio text', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  const bioSection = page.getByTestId('profile-bio');
  await expect(bioSection).toBeVisible();
  await expect(bioSection).toContainText('Experienced caregiver');
});

test('reviews section shows percentage positive and review count', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  const reviewsSection = page.getByTestId('profile-reviews');
  await expect(reviewsSection).toBeVisible();
  const summary = page.getByTestId('reviews-summary');
  await expect(summary).toContainText('90% positive'); // 9/10 = 90%
  await expect(summary).toContainText('10 total reviews');
});

test('recent reviews list shows date, tags, and comment', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  // The review comment text should appear
  await expect(page.getByText('Maria was wonderful with my mother.')).toBeVisible();
  // Tags
  await expect(page.getByText('Reliable')).toBeVisible();
  await expect(page.getByText('Compassionate')).toBeVisible();
});

test('Download CTA heading includes caregiver name', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  const cta = page.getByTestId('download-cta');
  await expect(cta).toBeVisible();
  await expect(cta).toContainText('Maria Santos');
});

test('back link "Back to search" navigates to /caregivers', async ({ page }) => {
  await page.goto(`/caregivers/${MARIA.id}`);
  const backLink = page.getByTestId('back-link');
  await expect(backLink).toBeVisible();
  await expect(backLink).toContainText('Back to search');
  await backLink.click();
  await page.waitForURL('**/caregivers');
  expect(page.url()).toMatch(/\/caregivers$/);
});

test('no photo → avatar circle shows initials', async ({ request, page }) => {
  await mockDetail(request, JAMES, []);
  await page.goto(`/caregivers/${JAMES.id}`);
  const avatar = page.getByTestId('avatar-initials');
  await expect(avatar).toBeVisible();
  // James Wilson → initials "JW"
  await expect(avatar).toContainText('JW');
});

test('no bio → bio section not rendered', async ({ request, page }) => {
  await mockDetail(request, JAMES, []);
  await page.goto(`/caregivers/${JAMES.id}`);
  await expect(page.getByTestId('profile-bio')).not.toBeVisible();
});

test('zero reviews → "No reviews yet" text shown, reviews section absent', async ({ request, page }) => {
  await mockDetail(request, JAMES, []);
  await page.goto(`/caregivers/${JAMES.id}`);
  // JAMES has rating_count: 0, so the reviews section should not render
  await expect(page.getByTestId('profile-reviews')).not.toBeVisible();
  // The RatingBadge "No reviews yet" text should be visible in the header
  await expect(page.getByTestId('no-reviews').first()).toBeVisible();
});

test('<50% positive reviews shows 👎 emoji in rating badge', async ({ request, page }) => {
  await mockDetail(request, LOW_RATING, []);
  await page.goto(`/caregivers/${LOW_RATING.id}`);
  // 40% positive → thumbs down
  const badge = page.getByTestId('rating-badge').first();
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('40%');
  // The 👎 emoji should be present in the badge
  await expect(badge).toContainText('👎');
});
