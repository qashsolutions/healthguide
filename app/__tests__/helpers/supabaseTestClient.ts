/**
 * HealthGuide Integration Test Client
 * Real Supabase client for integration tests that actually write to/read from the DB.
 *
 * Usage:
 *   import { signInAs, supabaseTest, TEST_USERS, cleanupTestData } from './supabaseTestClient';
 *
 *   beforeAll(async () => { await signInAs('agency_owner'); });
 *   afterAll(async () => { await cleanupTestData(['visits'], 'test-'); });
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rcknxbfhghetquqdxmjw.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja254YmZoZ2hldHF1cWR4bWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDQ0MzcsImV4cCI6MjA4NTc4MDQzN30.yxLCC1CbWfNl8lMX49Lvgnfi1wSpwCde7fJx4xt_L7s';

// ---------------------------------------------------------------------------
// Known test user credentials
// ---------------------------------------------------------------------------
export const TEST_USERS = {
  superadmin: {
    id: 'f0000000-0000-0000-0000-000000000001',
    email: 'superadmin@healthguide.test',
    password: 'TestPass123!',
    role: 'agency_owner',
    full_name: 'Super Admin',
    agency_id: 'e5555555-5555-5555-5555-555555555555',
  },
  agency_owner: {
    id: 'a1111111-1111-1111-1111-111111111111',
    email: 'owner@healthguide.test',
    password: 'TestPass123!',
    role: 'agency_owner',
    full_name: 'Sarah Mitchell',
    agency_id: 'e5555555-5555-5555-5555-555555555555',
  },
  caregiver: {
    id: 'b2222222-2222-2222-2222-222222222222',
    email: 'caregiver@healthguide.test',
    password: 'TestPass123!',
    role: 'caregiver',
    full_name: 'Maria Santos',
  },
  caregiver2: {
    id: 'b3333333-3333-3333-3333-333333333333',
    email: 'james.wilson@healthguide.test',
    password: 'TestPass123!',
    role: 'caregiver',
    full_name: 'James Wilson',
  },
  careseeker: {
    id: 'c3333333-3333-3333-3333-333333333333',
    email: 'elder@healthguide.test',
    password: 'TestPass123!',
    role: 'careseeker',
    full_name: 'Robert Johnson',
  },
  family_member: {
    id: 'd4444444-4444-4444-4444-444444444444',
    email: 'family@healthguide.test',
    password: 'TestPass123!',
    role: 'family_member',
    full_name: 'Emily Johnson',
  },
} as const;

export type TestUserRole = keyof typeof TEST_USERS;

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------
let _client: SupabaseClient | null = null;

export function getTestClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

/**
 * Sign in as a known test user and return the authenticated client.
 */
export async function signInAs(role: TestUserRole): Promise<SupabaseClient> {
  const client = getTestClient();
  const user = TEST_USERS[role];
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`Failed to sign in as ${role}: ${error.message}`);
  return client;
}

/**
 * Sign out from the test client.
 */
export async function signOut(): Promise<void> {
  const client = getTestClient();
  await client.auth.signOut();
}

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

/** IDs created during tests, collected for cleanup */
const _createdIds: Record<string, string[]> = {};

export function trackCreated(table: string, id: string): void {
  if (!_createdIds[table]) _createdIds[table] = [];
  _createdIds[table].push(id);
}

/**
 * Delete all tracked records from given tables. Call in afterAll.
 */
export async function cleanupTracked(): Promise<void> {
  const client = getTestClient();
  for (const [table, ids] of Object.entries(_createdIds)) {
    if (ids.length > 0) {
      await client.from(table).delete().in('id', ids);
    }
  }
  // Clear tracking
  Object.keys(_createdIds).forEach((k) => delete _createdIds[k]);
}

/** Quick helper: insert a row and track its id for cleanup */
export async function insertAndTrack(
  table: string,
  row: Record<string, unknown>,
): Promise<{ data: any; error: any }> {
  const client = getTestClient();
  const result = await client.from(table).insert(row).select('id').single();
  if (result.data?.id) trackCreated(table, result.data.id);
  return result;
}

// ---------------------------------------------------------------------------
// Assertion helpers for mock-based tests
// ---------------------------------------------------------------------------

/**
 * Build a chainable Supabase mock that records all calls.
 * Returned `calls` array captures every chained method call for assertions.
 */
export function buildSupabaseMock(defaultResolve = { data: [], error: null }) {
  const calls: { method: string; args: any[] }[] = [];

  const chain: any = {};
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'gt', 'lt',
    'order', 'limit', 'range', 'filter', 'ilike', 'not',
    'is', 'contains', 'overlaps', 'textSearch',
  ];

  methods.forEach((m) => {
    chain[m] = jest.fn((...args: any[]) => {
      calls.push({ method: m, args });
      return chain;
    });
  });

  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
  chain.then = jest.fn((resolve: any) => resolve(defaultResolve));

  return { chain, calls };
}
