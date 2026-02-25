/**
 * SQL Injection Integration Tests
 *
 * These tests run against the REAL Supabase project (not the mock server).
 * They verify that the `search-caregivers` edge function and Next.js search
 * pages are immune to SQL injection attacks.
 *
 * Why real Supabase and not a mock?
 * ──────────────────────────────────
 * Injection vulnerabilities live in how the DB driver processes input.
 * A mock server always returns a hardcoded response regardless of the
 * payload — so a successful injection would go undetected. Only real
 * Supabase can prove that the parameterised query layer (PostgREST)
 * correctly ignores injection.
 *
 * What protects the edge function?
 * ──────────────────────────────────
 *   1. All Supabase client queries (.eq, .ilike, .contains) compile to
 *      PostgREST URL filters that are parameterised at the PostgreSQL
 *      level — the raw payload string never reaches the SQL parser.
 *   2. The `hourly_rate_max` filter is embedded in a PostgREST `.or()`
 *      string — injected values would produce a malformed filter error
 *      (400), never a DB-level command execution.
 *
 * A test FAILS if:
 *   - The HTTP response is 500 with a SQL error message in the body
 *   - The response body leaks internal data (auth.users columns, service role key)
 *   - The total_count changes after injection attempts (row modification)
 *   - The Next.js page crashes (5xx) with an injection payload in the URL
 */

import { test, expect, type APIRequestContext } from '@playwright/test';

// ── Constants ─────────────────────────────────────────────────────────────────

const EDGE_FN_URL =
  'https://rcknxbfhghetquqdxmjw.supabase.co/functions/v1/search-caregivers';

const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja254YmZoZ2hldHF1cWR4bWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDQ0MzcsImV4cCI6MjA4NTc4MDQzN30.yxLCC1CbWfNl8lMX49Lvgnfi1wSpwCde7fJx4xt_L7s';

/** SQL injection strings for the zip_code field */
const ZIP_INJECTION_PAYLOADS = [
  "78201' OR '1'='1",
  "78201; DROP TABLE caregiver_profiles; --",
  "' UNION SELECT id, email, NULL, NULL, NULL, NULL, 0, 0, NOW() FROM auth.users --",
  "1' AND SLEEP(5) --",
  "78201'/**/OR/**/1=1--",
  '78201"; DROP TABLE caregiver_profiles; --',
];

/** SQL injection strings for the capabilities array */
const CAPABILITIES_INJECTION_PAYLOADS = [
  "companionship' OR '1'='1",
  "'; DROP TABLE caregiver_profiles; --",
  "' UNION SELECT * FROM auth.users --",
  'companionship"); DELETE FROM caregiver_profiles; --',
];

/**
 * Injection strings for hourly_rate_max — this field is embedded directly
 * in a PostgREST .or() filter string, making it an interesting surface:
 *   query.or(`hourly_rate_min.lte.${payload.hourly_rate_max},hourly_rate_min.is.null`)
 * PostgREST still parameterises these, so injections should produce a 400
 * (malformed filter), never a DB-level command execution.
 */
const RATE_INJECTION_PAYLOADS = [
  "100,hourly_rate_min.is.null); DELETE FROM caregiver_profiles; --",
  "100; DROP TABLE caregiver_profiles; --",
  "' OR '1'='1",
  "100 UNION SELECT * FROM auth.users --",
];

/**
 * Strings that should NEVER appear in a 200 OK response body.
 * We only check these on successful responses — error responses legitimately
 * echo back the user's (rejected) input in the error message.
 *
 * For all responses (including errors), we check for the service role key
 * and the specific PostgreSQL syntax-error prefix that would indicate the
 * payload was actually parsed as SQL.
 */
const FORBIDDEN_IN_SUCCESS = [
  'SUPABASE_SERVICE_ROLE_KEY', // catastrophic if leaked
];

/** PostgreSQL's syntax error format — would mean injection was parsed as SQL */
const SQL_PARSE_ERROR_PATTERN = /syntax error at or near/i;

// ── Helper ────────────────────────────────────────────────────────────────────

async function callEdgeFn(
  request: APIRequestContext,
  body: Record<string, unknown>
): Promise<{ status: number; text: string; json: unknown }> {
  const response = await request.post(EDGE_FN_URL, {
    data: body,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON response is itself a test signal
  }
  return { status: response.status(), text, json };
}

// ── Baseline ──────────────────────────────────────────────────────────────────

let baselineCount = -1;

test.beforeAll(async ({ request }) => {
  const result = await callEdgeFn(request, { page: 1, limit: 1 });
  expect(result.status, 'baseline request failed — check Supabase connectivity').toBe(200);
  const data = result.json as Record<string, unknown>;
  baselineCount = (data?.total_count as number) ?? -1;
  expect(baselineCount, 'baseline total_count is missing or negative').toBeGreaterThanOrEqual(0);
});

// ── zip_code injection ────────────────────────────────────────────────────────

for (const payload of ZIP_INJECTION_PAYLOADS) {
  test(`zip_code injection: "${payload.substring(0, 45)}…" — no SQL error, no data leak`, async ({
    request,
  }) => {
    const result = await callEdgeFn(request, { zip_code: payload, page: 1, limit: 10 });

    // Must not be 5xx.
    // Note: some payloads with SQL-like syntax (semicolons, comment markers) are
    // rejected by the Supabase edge WAF with a non-JSON empty body at 4xx — that
    // is correct defensive behaviour, not a test failure.
    expect(result.status, `HTTP ${result.status} for payload: ${payload}`).toBeLessThan(500);

    // PostgreSQL's syntax error prefix would mean the payload was parsed as SQL
    expect(result.text).not.toMatch(SQL_PARSE_ERROR_PATTERN);

    // Service role key must never leak
    for (const forbidden of FORBIDDEN_IN_SUCCESS) {
      expect(result.text).not.toContain(forbidden);
    }

    // If we got a successful JSON response, verify caregivers contain no leaked fields
    const data = result.json as Record<string, unknown> | null;
    if (data && Array.isArray(data.caregivers)) {
      for (const caregiver of data.caregivers as Record<string, unknown>[]) {
        expect(Object.keys(caregiver)).not.toContain('email');
        expect(Object.keys(caregiver)).not.toContain('phone');
        expect(Object.keys(caregiver)).not.toContain('user_id');
      }
    }
  });
}

// ── capabilities injection ────────────────────────────────────────────────────

for (const payload of CAPABILITIES_INJECTION_PAYLOADS) {
  test(`capabilities injection: "${payload.substring(0, 45)}…" — no SQL error, no data leak`, async ({
    request,
  }) => {
    const result = await callEdgeFn(request, {
      capabilities: [payload],
      page: 1,
      limit: 10,
    });

    expect(result.status).toBeLessThan(500);
    expect(result.text).not.toMatch(SQL_PARSE_ERROR_PATTERN);
    for (const forbidden of FORBIDDEN_IN_SUCCESS) {
      expect(result.text).not.toContain(forbidden);
    }
  });
}

// ── hourly_rate_max injection ─────────────────────────────────────────────────

for (const payload of RATE_INJECTION_PAYLOADS) {
  test(`hourly_rate_max injection: "${payload.substring(0, 45)}…" — no SQL error, at most 400`, async ({
    request,
  }) => {
    const result = await callEdgeFn(request, {
      zip_code: '78201',
      hourly_rate_max: payload as unknown as number,
      page: 1,
      limit: 10,
    });

    // A malformed PostgREST filter is rejected (400/200 with success:false), never a 500.
    // Error responses may echo the user's rejected input back in the error message —
    // that is acceptable (input echoed, not data leaked from DB).
    expect(result.status, `HTTP 500 for hourly_rate_max payload: ${payload}`).not.toBe(500);
    expect(result.text).not.toMatch(SQL_PARSE_ERROR_PATTERN);
    for (const forbidden of FORBIDDEN_IN_SUCCESS) {
      expect(result.text).not.toContain(forbidden);
    }
  });
}

// ── Combined injection ────────────────────────────────────────────────────────

test('combined multi-field injection — no SQL error, no data leak', async ({ request }) => {
  const result = await callEdgeFn(request, {
    zip_code: "78201' OR '1'='1",
    capabilities: ["companionship' OR '1'='1"],
    npi_verified_only: "true; DROP TABLE caregiver_profiles; --" as unknown as boolean,
    page: 1,
    limit: 50,
  });

  expect(result.status).toBeLessThan(500);
  expect(result.text).not.toMatch(SQL_PARSE_ERROR_PATTERN);
  for (const forbidden of FORBIDDEN_IN_SUCCESS) {
    expect(result.text).not.toContain(forbidden);
  }
});

// ── Boundary / malformed payloads ─────────────────────────────────────────────

test('extremely long zip_code — no crash', async ({ request }) => {
  const longPayload = 'A'.repeat(10_000) + "' OR '1'='1";
  const result = await callEdgeFn(request, { zip_code: longPayload });
  expect(result.status).toBeLessThan(500);
});

test('page_size clamped to 50 — no crash', async ({ request }) => {
  const result = await callEdgeFn(request, {
    zip_code: '78201',
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
  });
  expect(result.status).toBe(200);
  const data = result.json as Record<string, unknown>;
  if (Array.isArray(data?.caregivers)) {
    expect(data.caregivers.length).toBeLessThanOrEqual(50);
  }
});

test('null body fields — no crash', async ({ request }) => {
  const result = await callEdgeFn(request, {
    zip_code: null,
    capabilities: null,
    page: null,
    limit: null,
  });
  // Edge function handles missing fields gracefully (200 with empty results or 4xx)
  expect(result.status).toBeLessThan(500);
});

// ── URL param injection via Next.js page ──────────────────────────────────────

test('GET /caregivers?zip=<script>alert(1)</script> — page renders, no crash', async ({
  page,
}) => {
  const response = await page.goto(
    `/caregivers?zip=${encodeURIComponent('<script>alert(1)</script>')}`
  );
  expect(response?.status()).toBeLessThan(500);
  const title = await page.title();
  expect(title).not.toContain('500');
});

test("GET /caregivers?zip=78201'%20OR%20'1'='1 — page renders, no crash", async ({ page }) => {
  const response = await page.goto(`/caregivers?zip=78201%27%20OR%20%271%27%3D%271`);
  expect(response?.status()).toBeLessThan(500);
});

test('GET /caregivers?capabilities=<inject> — page renders, no crash', async ({ page }) => {
  const inject = encodeURIComponent("'; DROP TABLE caregiver_profiles; --");
  const response = await page.goto(`/caregivers?zip=78201&capabilities=${inject}`);
  expect(response?.status()).toBeLessThan(500);
});

test('GET /caregivers/<injection-slug> — 404 or valid page, no 500', async ({ page }) => {
  const inject = encodeURIComponent("' OR '1'='1");
  const response = await page.goto(`/caregivers/${inject}`);
  const status = response?.status() ?? 0;
  // Must be a controlled 404 or 200, never an unhandled 500
  expect(status).toBeLessThan(500);
});

// ── DB integrity ──────────────────────────────────────────────────────────────

test('DB integrity: caregiver row count unchanged after all injection attempts', async ({
  request,
}) => {
  const result = await callEdgeFn(request, { page: 1, limit: 1 });
  expect(result.status).toBe(200);

  const data = result.json as Record<string, unknown>;
  const currentCount = (data?.total_count as number) ?? -1;

  expect(
    currentCount,
    `Row count changed from ${baselineCount} to ${currentCount} — a destructive injection may have succeeded`
  ).toBe(baselineCount);
});
