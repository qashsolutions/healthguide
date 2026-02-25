/**
 * Helper functions for configuring the mock Supabase server before each test.
 *
 * Usage:
 *   import { mockSearch, mockDetail, mockError, resetMock } from './helpers/mockApi';
 *
 *   test.beforeEach(async ({ request }) => {
 *     await mockSearch(request, [MARIA, JAMES]);
 *   });
 */

import type { APIRequestContext } from '@playwright/test';
import type { PublicCaregiverResult } from '../../src/types/caregiver';
import { searchResponse, notFoundResponse, errorResponse } from '../fixtures/caregivers';

const MOCK_URL = 'http://localhost:3100';

async function configure(
  request: APIRequestContext,
  config: { edgeFunctionResponse?: unknown; ratingsResponse?: unknown }
) {
  await request.post(`${MOCK_URL}/configure`, { data: config });
}

/** Mock a successful search returning `caregivers`. */
export async function mockSearch(
  request: APIRequestContext,
  caregivers: PublicCaregiverResult[],
  opts: { hasMore?: boolean; total?: number } = {}
) {
  await configure(request, {
    edgeFunctionResponse: searchResponse(caregivers, opts),
  });
}

/** Mock a detail page for a single caregiver + optional reviews. */
export async function mockDetail(
  request: APIRequestContext,
  caregiver: PublicCaregiverResult,
  reviews: unknown[] = []
) {
  await configure(request, {
    edgeFunctionResponse: searchResponse([caregiver]),
    ratingsResponse: reviews,
  });
}

/** Mock a "no results" search (empty state). */
export async function mockEmpty(request: APIRequestContext) {
  await configure(request, {
    edgeFunctionResponse: searchResponse([]),
    ratingsResponse: [],
  });
}

/** Mock an API error response. */
export async function mockError(request: APIRequestContext) {
  await configure(request, {
    edgeFunctionResponse: errorResponse(),
    ratingsResponse: [],
  });
}

/** Mock a "caregiver not found" scenario (for 404 detail page). */
export async function mockNotFound(request: APIRequestContext) {
  await configure(request, {
    edgeFunctionResponse: notFoundResponse(),
    ratingsResponse: [],
  });
}

/** Reset mock server to defaults (2 caregivers, sample reviews). */
export async function resetMock(request: APIRequestContext) {
  await request.post(`${MOCK_URL}/reset`);
}
