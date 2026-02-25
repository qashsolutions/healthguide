/**
 * XSS Security Tests
 *
 * Verifies that user-supplied data from the database (name, bio, review comments,
 * photo_url, search params) is always rendered as escaped text — never executed
 * as HTML or JavaScript.
 *
 * React's JSX escapes text content by default, but we test explicitly because:
 *   - future refactors could introduce dangerouslySetInnerHTML
 *   - URL-based injection (img src, href) needs separate verification
 *   - reflected XSS via URL params should be caught early
 *
 * A test FAILS if:
 *   - a browser alert/confirm/prompt dialog fires (script executed), OR
 *   - the raw payload string appears unescaped in the DOM
 */

import { test, expect, type Page } from '@playwright/test';
import { mockDetail, mockSearch, resetMock } from './helpers/mockApi';
import type { PublicCaregiverResult } from '../src/types/caregiver';
import { searchResponse } from './fixtures/caregivers';

// ── XSS fixture caregivers ────────────────────────────────────────────────────

const XSS_SCRIPT_NAME: PublicCaregiverResult = {
  id: 'fixture-xss-name-001',
  full_name: '<script>alert("xss-name")</script>Injected Name',
  photo_url: null,
  zip_prefix: '782',
  capabilities: ['companionship'],
  npi_verified: false,
  bio: 'Safe bio.',
  rating_count: 0,
  positive_count: 0,
  created_at: '2024-01-01T00:00:00.000Z',
};

const XSS_BIO: PublicCaregiverResult = {
  id: 'fixture-xss-bio-002',
  full_name: 'Bio Injection Test',
  photo_url: null,
  zip_prefix: '100',
  capabilities: ['companionship'],
  npi_verified: false,
  bio: '<img src=x onerror="alert(\'xss-bio\')">Safe bio text.',
  rating_count: 0,
  positive_count: 0,
  created_at: '2024-01-01T00:00:00.000Z',
};

const XSS_PHOTO_URL: PublicCaregiverResult = {
  id: 'fixture-xss-photo-003',
  full_name: 'Photo URL Injection',
  // javascript: URLs in img src are inert in browsers but should not fire alerts
  photo_url: 'javascript:alert("xss-photo")',
  zip_prefix: '900',
  capabilities: ['companionship'],
  npi_verified: false,
  bio: 'Safe bio.',
  rating_count: 0,
  positive_count: 0,
  created_at: '2024-01-01T00:00:00.000Z',
};

const XSS_REVIEWS = [
  {
    id: 'review-xss-001',
    is_positive: true,
    tags: ['reliable'],
    comment: '<script>alert("xss-comment")</script>Normal review text.',
    created_at: '2024-12-01T00:00:00.000Z',
  },
  {
    id: 'review-xss-002',
    is_positive: true,
    tags: [],
    comment: '<b>bold</b><img src=x onerror="alert(\'xss-html\')">',
    created_at: '2024-11-01T00:00:00.000Z',
  },
];

// ── Helper: attach a dialog listener that fails the test if any alert fires ──

function assertNoAlert(page: Page): () => void {
  let alertFired = false;
  const handler = async (dialog: import('@playwright/test').Dialog) => {
    alertFired = true;
    await dialog.dismiss();
  };
  page.on('dialog', handler);
  return () => {
    page.off('dialog', handler);
    if (alertFired) throw new Error('XSS: browser alert() fired — script was executed!');
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ request }) => {
  await resetMock(request);
});

test('script tag in full_name renders as escaped text, no alert', async ({ request, page }) => {
  await mockDetail(request, XSS_SCRIPT_NAME, []);
  const check = assertNoAlert(page);

  await page.goto(`/caregivers/${XSS_SCRIPT_NAME.id}`);

  // The <script> tag should appear as visible escaped text, not execute
  const profileName = page.getByTestId('profile-name');
  await expect(profileName).toBeVisible();
  // Raw tag should NOT be rendered as HTML (innerHTML should be escaped)
  const innerHTML = await profileName.innerHTML();
  expect(innerHTML).not.toContain('<script>');
  // Visible text should contain the safe portion after the script tag
  await expect(profileName).toContainText('Injected Name');

  check();
});

test('script tag in full_name on search card renders escaped, no alert', async ({
  request,
  page,
}) => {
  await mockSearch(request, [XSS_SCRIPT_NAME]);
  const check = assertNoAlert(page);

  await page.goto('/caregivers?zip=78201');

  const card = page.getByTestId('caregiver-card').first();
  await expect(card).toBeVisible();
  const cardHtml = await card.innerHTML();
  expect(cardHtml).not.toContain('<script>');

  check();
});

test('onerror payload in bio renders as escaped text, no alert', async ({ request, page }) => {
  await mockDetail(request, XSS_BIO, []);
  const check = assertNoAlert(page);

  await page.goto(`/caregivers/${XSS_BIO.id}`);

  const bioSection = page.getByTestId('profile-bio');
  await expect(bioSection).toBeVisible();
  const bioHtml = await bioSection.innerHTML();
  // The injected <img onerror=...> must not appear as a real element
  expect(bioHtml).not.toMatch(/<img[^>]*onerror/i);
  // Safe text should still be visible
  await expect(bioSection).toContainText('Safe bio text.');

  check();
});

test('script tag in review comment renders as escaped text, no alert', async ({
  request,
  page,
}) => {
  const caregiverWithReviews: PublicCaregiverResult = {
    ...XSS_SCRIPT_NAME,
    id: 'fixture-xss-reviews-004',
    full_name: 'Review XSS Test',
    rating_count: 2,
    positive_count: 2,
  };
  await mockDetail(request, caregiverWithReviews, XSS_REVIEWS);
  const check = assertNoAlert(page);

  await page.goto(`/caregivers/${caregiverWithReviews.id}`);

  const reviewsSection = page.getByTestId('profile-reviews');
  await expect(reviewsSection).toBeVisible();
  const reviewsHtml = await reviewsSection.innerHTML();
  expect(reviewsHtml).not.toContain('<script>');
  expect(reviewsHtml).not.toMatch(/<img[^>]*onerror/i);
  // Safe portion of the first review should be visible
  await expect(reviewsSection).toContainText('Normal review text.');

  check();
});

test('javascript: photo_url does not fire alert (img src is inert)', async ({
  request,
  page,
}) => {
  await mockDetail(request, XSS_PHOTO_URL, []);
  const check = assertNoAlert(page);

  await page.goto(`/caregivers/${XSS_PHOTO_URL.id}`);

  // Page should load — profile name visible
  await expect(page.getByTestId('profile-name')).toBeVisible();
  // The javascript: src should not have fired an alert
  // (browsers do not execute JS from img.src)

  check();
});

test('reflected XSS via zip URL param renders escaped, no alert', async ({ request, page }) => {
  // Use default mock (2 results) — the zip param is reflected in the result count text
  await resetMock(request);
  const check = assertNoAlert(page);

  // Encode a script tag as the zip param
  const xssZip = encodeURIComponent('<script>alert("xss-zip")</script>');
  await page.goto(`/caregivers?zip=${xssZip}`);

  // Page must not crash and must not fire an alert
  // The zip value is reflected in meta/result text — check it's escaped
  const html = await page.content();
  expect(html).not.toContain('<script>alert("xss-zip")</script>');

  check();
});

test('HTML injection in review comment does not render as real bold tag', async ({
  request,
  page,
}) => {
  const caregiverWithHtmlReview: PublicCaregiverResult = {
    id: 'fixture-xss-html-005',
    full_name: 'HTML Injection Test',
    photo_url: null,
    zip_prefix: '500',
    capabilities: ['companionship'],
    npi_verified: false,
    bio: null,
    rating_count: 1,
    positive_count: 1,
    created_at: '2024-01-01T00:00:00.000Z',
  };
  const htmlReview = [
    {
      id: 'review-html-001',
      is_positive: true,
      tags: [],
      comment: '<b>I am bold</b>',
      created_at: '2024-12-01T00:00:00.000Z',
    },
  ];
  await mockDetail(request, caregiverWithHtmlReview, htmlReview);
  const check = assertNoAlert(page);

  await page.goto(`/caregivers/${caregiverWithHtmlReview.id}`);

  const reviewsSection = page.getByTestId('profile-reviews');
  await expect(reviewsSection).toBeVisible();
  const reviewsHtml = await reviewsSection.innerHTML();
  // React escapes children — the literal <b> tag should NOT appear as a DOM element
  // It should appear as &lt;b&gt; in the rendered text
  expect(reviewsHtml).not.toMatch(/<b>I am bold<\/b>/);

  check();
});
