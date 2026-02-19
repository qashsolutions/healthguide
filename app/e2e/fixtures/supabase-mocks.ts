/**
 * Supabase REST API mock response builders for Playwright page.route().
 * Intercepts requests to the Supabase REST API and returns mock data.
 */

import { Page, Route } from '@playwright/test';
import {
  SUPABASE_URL,
  MockUser,
  mockUsers,
  mockAgency,
  mockElders,
  mockCaregivers,
  mockVisits,
  mockTasks,
  mockSupportGroups,
  mockCareGroup,
  mockCaregiverProfiles,
  createMockSession,
} from './test-data';

/** Standard Supabase REST response headers */
const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

/** Build a mock response body */
function jsonResponse(data: unknown, status = 200) {
  return {
    status,
    headers: jsonHeaders,
    body: JSON.stringify(data),
  };
}

/** Route table for Supabase REST queries (PostgREST) */
function getTableData(table: string, params: URLSearchParams): unknown {
  switch (table) {
    case 'user_profiles': {
      const idFilter = params.get('id');
      if (idFilter) {
        const id = idFilter.replace('eq.', '');
        const allUsers = Object.values(mockUsers);
        const user = allUsers.find((u) => u.id === id);
        return user || null;
      }
      return Object.values(mockUsers);
    }
    case 'agencies': {
      const idFilter = params.get('id');
      if (idFilter) {
        return mockAgency;
      }
      return [mockAgency];
    }
    case 'elders':
      return mockElders;
    case 'caregivers':
      return mockCaregivers;
    case 'visits':
      return mockVisits;
    case 'agency_tasks':
    case 'tasks':
      return mockTasks;
    case 'support_groups':
      return mockSupportGroups;
    case 'group_members':
      return [{ group_id: 'group-1', user_id: 'user-caregiver-1', role: 'member' }];
    case 'group_messages':
      return [];
    case 'message_likes':
      return [];
    case 'care_groups':
      return [mockCareGroup];
    case 'elder_daily_checkins':
      return [];
    case 'game_sessions':
      return [];
    case 'time_slots':
      return [];
    case 'visit_tasks':
      return [];
    case 'visit_notes':
      return [];
    case 'invitations':
      return [];
    case 'caregiver_profiles':
      return mockCaregiverProfiles;
    default:
      return [];
  }
}

/**
 * Shared state for auth error simulation.
 * When set, password-grant token requests return this error instead of a session.
 */
const _authErrorState = new Map<Page, { message: string; statusCode: number } | null>();

/**
 * Set up Supabase API mocking for a page.
 * Intercepts all requests to the Supabase URL and returns mock data.
 */
export async function mockSupabaseAPI(page: Page, user: MockUser) {
  const session = createMockSession(user);
  _authErrorState.set(page, null);

  // Polyfill process.cwd for web — WatermelonDB SQLiteAdapter calls process.cwd()
  // which doesn't exist in the browser. This prevents the "process.cwd is not a function" error.
  await page.addInitScript(() => {
    if (typeof process !== 'undefined') {
      if (typeof process.cwd !== 'function') {
        (process as any).cwd = () => '/';
      }
    }
  });

  // Mock GoTrue auth endpoints
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    // POST /auth/v1/token — check for error override on password grants
    if (path.includes('/token') && method === 'POST') {
      const body = route.request().postData();
      if (body?.includes('refresh_token') || url.searchParams.get('grant_type') === 'refresh_token') {
        return route.fulfill(jsonResponse(session));
      }
      // password grant — check if error is configured
      const authErr = _authErrorState.get(page);
      if (authErr) {
        return route.fulfill(jsonResponse(
          { error: authErr.message, error_description: authErr.message, message: authErr.message },
          authErr.statusCode,
        ));
      }
      return route.fulfill(jsonResponse(session));
    }

    // GET /auth/v1/user
    if (path.endsWith('/user')) {
      return route.fulfill(jsonResponse(session.user));
    }

    // POST /auth/v1/signup
    if (path.includes('/signup')) {
      return route.fulfill(jsonResponse({ ...session, user: { ...session.user, email_confirmed_at: null } }));
    }

    // POST /auth/v1/otp
    if (path.includes('/otp')) {
      return route.fulfill(jsonResponse({ message_id: 'mock-message-id' }));
    }

    // POST /auth/v1/verify
    if (path.includes('/verify')) {
      return route.fulfill(jsonResponse(session));
    }

    // POST /auth/v1/logout
    if (path.includes('/logout')) {
      return route.fulfill(jsonResponse(null, 204));
    }

    // Default: return the session
    return route.fulfill(jsonResponse(session));
  });

  // Mock PostgREST endpoints
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    // Extract table name from path: /rest/v1/<table>
    const pathParts = url.pathname.replace('/rest/v1/', '').split('/');
    const table = pathParts[0];

    // Handle OPTIONS (CORS preflight)
    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          ...jsonHeaders,
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // POST (insert)
    if (method === 'POST') {
      const postData = route.request().postData();
      const body = postData ? JSON.parse(postData) : {};
      return route.fulfill(jsonResponse({ ...body, id: `mock-${table}-${Date.now()}` }, 201));
    }

    // PATCH (update)
    if (method === 'PATCH') {
      const postData = route.request().postData();
      const body = postData ? JSON.parse(postData) : {};
      return route.fulfill(jsonResponse(body));
    }

    // DELETE
    if (method === 'DELETE') {
      return route.fulfill(jsonResponse(null, 204));
    }

    // GET — check for single-row header
    const preferHeader = route.request().headers()['prefer'] || '';
    const isSingle = preferHeader.includes('return=representation') ||
                     url.searchParams.has('select') && url.searchParams.toString().includes('eq.');

    const data = getTableData(table, url.searchParams);

    // If Accept header asks for single item (Supabase .single())
    const acceptHeader = route.request().headers()['accept'] || '';
    if (acceptHeader.includes('vnd.pgrst.object')) {
      // Return the single object (or first from array)
      const singleData = Array.isArray(data) ? data[0] || null : data;
      if (!singleData) {
        return route.fulfill(jsonResponse({ message: 'Not found', code: 'PGRST116' }, 406));
      }
      return route.fulfill(jsonResponse(singleData));
    }

    return route.fulfill(jsonResponse(Array.isArray(data) ? data : [data]));
  });

  // Mock Supabase realtime (just acknowledge)
  await page.route(`${SUPABASE_URL}/realtime/**`, async (route: Route) => {
    return route.fulfill({ status: 200, body: '' });
  });
}

/**
 * Override mock data for a specific table.
 * Call this after mockSupabaseAPI to customize responses for specific tests.
 */
export async function overrideTableMock(page: Page, table: string, data: unknown) {
  await page.route(`${SUPABASE_URL}/rest/v1/${table}*`, async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const acceptHeader = route.request().headers()['accept'] || '';
      if (acceptHeader.includes('vnd.pgrst.object')) {
        const singleData = Array.isArray(data) ? data[0] : data;
        return route.fulfill(jsonResponse(singleData));
      }
      return route.fulfill(jsonResponse(Array.isArray(data) ? data : [data]));
    }
    if (method === 'POST') {
      return route.fulfill(jsonResponse(data, 201));
    }
    return route.fulfill(jsonResponse(data));
  });
}

/**
 * Mock a Supabase auth error (e.g. wrong password).
 * Configures the existing auth handler to return errors for password-grant requests.
 */
export async function mockAuthError(page: Page, errorMessage: string, statusCode = 400) {
  _authErrorState.set(page, { message: errorMessage, statusCode });
}

/**
 * Clear any auth error override.
 */
export async function clearAuthError(page: Page) {
  _authErrorState.set(page, null);
}

/**
 * Mock OTP send success
 */
export async function mockOTPSend(page: Page) {
  await page.route(`${SUPABASE_URL}/auth/v1/otp`, async (route: Route) => {
    return route.fulfill(jsonResponse({ message_id: 'mock-message-id' }));
  });
}

/**
 * Mock OTP verification failure
 */
export async function mockOTPVerifyError(page: Page, errorMessage = 'Invalid OTP') {
  await page.route(`${SUPABASE_URL}/auth/v1/verify`, async (route: Route) => {
    return route.fulfill(jsonResponse(
      { error: errorMessage, message: errorMessage },
      400,
    ));
  });
}
