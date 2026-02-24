/**
 * Integration: 01 — Connectivity & Auth
 * Verifies Supabase is reachable and all test users can sign in/out.
 * Signs in ONCE per describe block to avoid auth rate limits.
 */

import {
  getTestClient,
  signInAs,
  signOut,
  TEST_USERS,
} from '../helpers/supabaseTestClient';

// ── Anon connectivity (no auth) ─────────────────────────────────────────────

describe('INT-01a: Anon Connectivity', () => {
  beforeAll(async () => {
    await signOut(); // ensure clean state
  });

  it('Supabase is reachable — caregiver_profiles table returns without network error', async () => {
    const client = getTestClient();
    const { error } = await client.from('caregiver_profiles').select('id').limit(1);
    // Anon RLS may return 0 rows, but should NOT return a network/config error
    expect(error?.code ?? '').not.toMatch(/ENOTFOUND|ECONNREFUSED/i);
    expect(error?.message ?? '').not.toMatch(/fetch failed|network|ENOTFOUND/i);
  });

  it('anon cannot read elders (RLS returns 0 rows)', async () => {
    const client = getTestClient();
    const { data } = await client.from('elders').select('id').limit(10);
    expect(data?.length ?? 0).toBe(0);
  });

  it('anon cannot read visits (RLS returns 0 rows)', async () => {
    const client = getTestClient();
    const { data } = await client.from('visits').select('id').limit(10);
    expect(data?.length ?? 0).toBe(0);
  });

  it('anon cannot read visit_requests (RLS returns 0 rows)', async () => {
    const client = getTestClient();
    const { data } = await client.from('visit_requests').select('id').limit(10);
    expect(data?.length ?? 0).toBe(0);
  });
});

// ── Auth: all roles sign in/out (batched — one describe per role) ────────────

describe('INT-01b: Auth — agency_owner', () => {
  it('signs in and gets valid session with correct user id', async () => {
    const client = await signInAs('agency_owner');
    const { data: { session } } = await client.auth.getSession();
    expect(session?.user.id).toBe(TEST_USERS.agency_owner.id);
    expect(session?.user.email).toBe(TEST_USERS.agency_owner.email);
    await signOut();
  });
});

describe('INT-01c: Auth — caregiver', () => {
  it('signs in and gets valid session with correct user id', async () => {
    const client = await signInAs('caregiver');
    const { data: { session } } = await client.auth.getSession();
    expect(session?.user.id).toBe(TEST_USERS.caregiver.id);
    await signOut();
  });
});

describe('INT-01d: Auth — careseeker', () => {
  it('signs in and gets valid session with correct user id', async () => {
    const client = await signInAs('careseeker');
    const { data: { session } } = await client.auth.getSession();
    expect(session?.user.id).toBe(TEST_USERS.careseeker.id);
    await signOut();
  });
});

describe('INT-01e: Auth — family_member', () => {
  it('signs in and gets valid session with correct user id', async () => {
    const client = await signInAs('family_member');
    const { data: { session } } = await client.auth.getSession();
    expect(session?.user.id).toBe(TEST_USERS.family_member.id);
    await signOut();
  });
});

describe('INT-01f: Auth — sign-out', () => {
  it('sign-out clears the session', async () => {
    const client = await signInAs('caregiver');
    const { data: { session: before } } = await client.auth.getSession();
    expect(before).not.toBeNull();
    await signOut();
    const { data: { session: after } } = await client.auth.getSession();
    expect(after).toBeNull();
  });
});
