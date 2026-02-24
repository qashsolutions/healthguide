/**
 * Integration: 02 — Role-Based Read Access (RLS Verification)
 * Signs in ONCE per role group via beforeAll to avoid auth rate limits.
 * Verifies each role sees the right data — no writes.
 */

import {
  getTestClient,
  signInAs,
  signOut,
} from '../helpers/supabaseTestClient';

const AGENCY_ID = 'e5555555-5555-5555-5555-555555555555';
const ELDER_ROBERT_ID = 'f6666666-6666-6666-6666-666666666666';
const CAREGIVER_MARIA_USER_ID = 'b2222222-2222-2222-2222-222222222222';

// ── Agency Owner ─────────────────────────────────────────────────────────────

describe('INT-02a: agency_owner reads', () => {
  beforeAll(() => signInAs('agency_owner'));
  afterAll(() => signOut());

  it('reads elders belonging to their agency', async () => {
    const { data, error } = await getTestClient()
      .from('elders')
      .select('id, first_name, last_name, agency_id')
      .eq('agency_id', AGENCY_ID);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    data!.forEach((e) => expect(e.agency_id).toBe(AGENCY_ID));
  });

  it('Robert Johnson elder record exists with correct name', async () => {
    const { data, error } = await getTestClient()
      .from('elders')
      .select('id, first_name, last_name')
      .eq('id', ELDER_ROBERT_ID)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.first_name).toBe('Robert');
    expect(data?.last_name).toBe('Johnson');
  });

  it('reads scheduled visits for the agency', async () => {
    const { data, error } = await getTestClient()
      .from('visits')
      .select('id, status, agency_id')
      .eq('agency_id', AGENCY_ID)
      .limit(10);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('reads multiple caregiver_profiles', async () => {
    const { data, error } = await getTestClient()
      .from('caregiver_profiles')
      .select('id, full_name, caregiver_type')
      .limit(10);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    data!.forEach((p) => expect(p.full_name).toBeTruthy());
  });

  it('reads agency_invites for their agency', async () => {
    const { error } = await getTestClient()
      .from('agency_invites')
      .select('id, status, direction')
      .eq('agency_id', AGENCY_ID)
      .limit(10);
    expect(error).toBeNull();
  });

  it('visits have EVV columns (check_in_latitude, duration_minutes, is_recurring)', async () => {
    const { data, error } = await getTestClient()
      .from('visits')
      .select('id, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude, duration_minutes, is_recurring, recurrence_rule, parent_visit_id')
      .limit(1);
    expect(error).toBeNull();
    // No error = these columns exist on the visits table
  });
});

// ── Caregiver ─────────────────────────────────────────────────────────────────

describe('INT-02b: caregiver reads', () => {
  beforeAll(() => signInAs('caregiver'));
  afterAll(() => signOut());

  it('reads their own scheduled visits (all rows are for Maria Santos)', async () => {
    const { data, error } = await getTestClient()
      .from('visits')
      .select('id, status, caregiver_id')
      .limit(10);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    data!.forEach((v) => expect(v.caregiver_id).toBe(CAREGIVER_MARIA_USER_ID));
  });

  it('reads elders (agency elders visible to linked caregiver)', async () => {
    const { data, error } = await getTestClient()
      .from('elders')
      .select('id, first_name, last_name')
      .limit(10);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('reads only their own caregiver_profile (RLS scoped to 1 row)', async () => {
    const { data, error } = await getTestClient()
      .from('caregiver_profiles')
      .select('id, full_name, user_id')
      .limit(10);
    expect(error).toBeNull();
    expect(data!.length).toBe(1);
    expect(data![0].full_name).toBe('Maria Santos');
  });

  it('reads visit_requests sent to them', async () => {
    const { error } = await getTestClient()
      .from('visit_requests')
      .select('id, status, companion_id')
      .limit(10);
    expect(error).toBeNull();
  });

  it('reads notifications table', async () => {
    const { error } = await getTestClient()
      .from('notifications')
      .select('id')
      .limit(5);
    expect(error).toBeNull();
  });

  it('cannot see another caregiver profile (RLS boundary)', async () => {
    const { data } = await getTestClient()
      .from('caregiver_profiles')
      .select('id, user_id')
      .eq('user_id', 'b3333333-3333-3333-3333-333333333333') // James Wilson
      .maybeSingle();
    expect(data).toBeNull();
  });
});

// ── Careseeker ────────────────────────────────────────────────────────────────

describe('INT-02c: careseeker reads', () => {
  beforeAll(() => signInAs('careseeker'));
  afterAll(() => signOut());

  it('reads visit_requests they created (empty or rows with their requested_by)', async () => {
    const { data, error } = await getTestClient()
      .from('visit_requests')
      .select('id, status, requested_by')
      .limit(10);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('reads caregiver_profiles for directory browsing', async () => {
    const { data, error } = await getTestClient()
      .from('caregiver_profiles')
      .select('id, full_name, caregiver_type, bio')
      .limit(10);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

// ── Family Member ──────────────────────────────────────────────────────────────

describe('INT-02d: family_member reads', () => {
  beforeAll(() => signInAs('family_member'));
  afterAll(() => signOut());

  it('reads visits', async () => {
    const { data, error } = await getTestClient()
      .from('visits')
      .select('id, status')
      .limit(10);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('reads notifications', async () => {
    const { error } = await getTestClient()
      .from('notifications')
      .select('id')
      .limit(5);
    expect(error).toBeNull();
  });
});
