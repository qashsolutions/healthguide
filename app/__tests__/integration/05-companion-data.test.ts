/**
 * Integration: 05 — Companion Profile, Visits & Supporting Tables
 * Verifies all key tables used across the companionship pivot are queryable
 * and return expected data shapes. Signs in once per describe block.
 * Read-only — no writes.
 */

import {
  getTestClient,
  signInAs,
  signOut,
} from '../helpers/supabaseTestClient';

const AGENCY_ID = 'e5555555-5555-5555-5555-555555555555';
const CAREGIVER_MARIA_USER_ID = 'b2222222-2222-2222-2222-222222222222';

// ── Agency owner perspective ──────────────────────────────────────────────────

describe('INT-05a: companion & visit data (agency_owner)', () => {
  beforeAll(() => signInAs('agency_owner'));
  afterAll(() => signOut());

  it('caregiver_profiles list is non-empty and has required fields', async () => {
    const { data, error } = await getTestClient()
      .from('caregiver_profiles')
      .select('id, full_name, caregiver_type, bio, zip_code, travel_radius_miles, has_transportation, languages, availability, is_active')
      .limit(20);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    data!.forEach((p) => expect(p.full_name).toBeTruthy());
  });

  it('Maria Santos profile has expected fields', async () => {
    const { data, error } = await getTestClient()
      .from('caregiver_profiles')
      .select('id, full_name, user_id')
      .eq('user_id', CAREGIVER_MARIA_USER_ID)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.full_name).toBe('Maria Santos');
  });

  it('user_ratings_summary view is queryable', async () => {
    const { data, error } = await getTestClient()
      .from('user_ratings_summary')
      .select('*')
      .limit(10);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('visit_ratings table is queryable', async () => {
    const { error } = await getTestClient()
      .from('visit_ratings')
      .select('id, visit_id, rated_by, rating')
      .limit(5);
    expect(error).toBeNull();
  });

  it('visits have all EVV columns needed for Phase 14 home screens', async () => {
    const { error } = await getTestClient()
      .from('visits')
      .select(`
        id, status, scheduled_date, scheduled_start, scheduled_end,
        actual_start, actual_end,
        check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude,
        duration_minutes, is_recurring, recurrence_rule, parent_visit_id, agency_id
      `)
      .limit(1);
    expect(error).toBeNull();
    // No column error = all EVV fields exist
  });

  it('visits are filterable by agency_id', async () => {
    const { data, error } = await getTestClient()
      .from('visits')
      .select('id, agency_id')
      .eq('agency_id', AGENCY_ID)
      .limit(5);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('task_library has tasks for the agency', async () => {
    const { data, error } = await getTestClient()
      .from('task_library')
      .select('id, name, category, is_active')
      .eq('agency_id', AGENCY_ID)
      .eq('is_active', true)
      .limit(30);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('task_library contains at least one companionship category task', async () => {
    const { data, error } = await getTestClient()
      .from('task_library')
      .select('id, name, category')
      .eq('agency_id', AGENCY_ID)
      .eq('is_active', true)
      .ilike('category', '%companionship%')
      .limit(5);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('elder_favorites table is queryable', async () => {
    const { error } = await getTestClient()
      .from('elder_favorites')
      .select('id, elder_id, companion_id')
      .limit(5);
    expect(error).toBeNull();
  });
});

// ── Caregiver perspective ─────────────────────────────────────────────────────

describe('INT-05b: companion data (caregiver)', () => {
  beforeAll(() => signInAs('caregiver'));
  afterAll(() => signOut());

  it('caregiver reads their own profile fields', async () => {
    const { data, error } = await getTestClient()
      .from('caregiver_profiles')
      .select('id, full_name, caregiver_type, availability, bio, zip_code, profile_completed')
      .eq('user_id', CAREGIVER_MARIA_USER_ID)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.full_name).toBe('Maria Santos');
  });

  it('notifications table exists and is queryable', async () => {
    const { data, error } = await getTestClient()
      .from('notifications')
      .select('id, title, body, type, read, created_at')
      .limit(10);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('visit_emergencies table is queryable', async () => {
    const { error } = await getTestClient()
      .from('visit_emergencies')
      .select('id')
      .limit(5);
    expect(error).toBeNull();
  });
});

// ── Careseeker perspective ────────────────────────────────────────────────────

describe('INT-05c: companion data (careseeker)', () => {
  beforeAll(() => signInAs('careseeker'));
  afterAll(() => signOut());

  it('careseeker can browse caregiver_profiles (directory)', async () => {
    const { data, error } = await getTestClient()
      .from('caregiver_profiles')
      .select('id, full_name, caregiver_type, bio, zip_code, is_active')
      .limit(10);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('scope_acceptances table is queryable', async () => {
    const { error } = await getTestClient()
      .from('scope_acceptances')
      .select('id, user_id, accepted_at')
      .limit(5);
    expect(error).toBeNull();
  });
});
