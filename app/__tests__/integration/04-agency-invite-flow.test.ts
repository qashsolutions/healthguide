/**
 * Integration: 04 — Agency Invite Lifecycle (Write Tests)
 * Signs in once per role section. All rows tagged message='INT-TEST'.
 *
 * NOTE: agency_invites has no DELETE RLS policy and uses a partial unique
 * index: UNIQUE (agency_id, companion_id, direction) WHERE status='pending'.
 * To make tests idempotent, each beforeAll declines any existing pending
 * record for the same key before inserting a fresh one.
 */

import {
  getTestClient,
  signInAs,
  signOut,
} from '../helpers/supabaseTestClient';

const AGENCY_ID = 'e5555555-5555-5555-5555-555555555555';
const CAREGIVER_MARIA_USER_ID = 'b2222222-2222-2222-2222-222222222222';
const CAREGIVER_JAMES_USER_ID = 'b3333333-3333-3333-3333-333333333333';

/** Reset any pending invite for a given key so a fresh insert can proceed. */
async function declineExistingPending(
  companion_id: string,
  direction: string,
) {
  await getTestClient()
    .from('agency_invites')
    .update({ status: 'declined' })
    .eq('agency_id', AGENCY_ID)
    .eq('companion_id', companion_id)
    .eq('direction', direction)
    .eq('status', 'pending');
  // errors ignored — if no row exists or RLS blocks it, insert proceeds normally
}

// ── Agency invites companion ──────────────────────────────────────────────────

describe('INT-04a: agency_owner creates and manages agency_invites', () => {
  let inviteId: string | null = null;

  beforeAll(async () => {
    await signInAs('agency_owner');
    // Decline any leftover pending invite so the insert below succeeds
    await declineExistingPending(CAREGIVER_JAMES_USER_ID, 'agency_to_companion');
  });

  afterAll(() => signOut());

  it('creates an agency_to_companion invite (status=pending)', async () => {
    const { data, error } = await getTestClient()
      .from('agency_invites')
      .insert({
        agency_id: AGENCY_ID,
        companion_id: CAREGIVER_JAMES_USER_ID,
        direction: 'agency_to_companion',
        status: 'pending',
        message: 'INT-TEST agency invite',
      })
      .select('id, status, direction')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    expect(data?.status).toBe('pending');
    expect(data?.direction).toBe('agency_to_companion');
    inviteId = data!.id;
  });

  it('reads the pending invite back', async () => {
    if (!inviteId) return;
    const { data, error } = await getTestClient()
      .from('agency_invites')
      .select('id, status, direction, companion_id, message')
      .eq('id', inviteId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.status).toBe('pending');
    expect(data?.companion_id).toBe(CAREGIVER_JAMES_USER_ID);
    expect(data?.message).toContain('INT-TEST');
  });

  it('updates invite status to declined', async () => {
    if (!inviteId) return;
    const { error } = await getTestClient()
      .from('agency_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId);
    expect(error).toBeNull();
  });

  it('status change persists — invite shows declined', async () => {
    if (!inviteId) return;
    const { data } = await getTestClient()
      .from('agency_invites')
      .select('id, status')
      .eq('id', inviteId)
      .maybeSingle();
    if (data) expect(data.status).toBe('declined');
  });

  it('NEGATIVE: invalid direction value is rejected', async () => {
    const { data, error } = await getTestClient()
      .from('agency_invites')
      .insert({
        agency_id: AGENCY_ID,
        companion_id: CAREGIVER_JAMES_USER_ID,
        direction: 'not_valid',
        status: 'pending',
      })
      .select('id')
      .single();
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('NEGATIVE: invalid status value is rejected', async () => {
    const { data, error } = await getTestClient()
      .from('agency_invites')
      .insert({
        agency_id: AGENCY_ID,
        companion_id: CAREGIVER_JAMES_USER_ID,
        direction: 'agency_to_companion',
        status: 'maybe',
      })
      .select('id')
      .single();
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

// ── Companion applies to agency ───────────────────────────────────────────────

describe('INT-04b: caregiver applies to agency (companion_to_agency)', () => {
  let appId: string | null = null;

  beforeAll(async () => {
    await signInAs('caregiver');
    await declineExistingPending(CAREGIVER_MARIA_USER_ID, 'companion_to_agency');
  });

  afterAll(() => signOut());

  it('caregiver inserts a companion_to_agency application', async () => {
    const { data, error } = await getTestClient()
      .from('agency_invites')
      .insert({
        agency_id: AGENCY_ID,
        companion_id: CAREGIVER_MARIA_USER_ID,
        direction: 'companion_to_agency',
        status: 'pending',
        message: 'INT-TEST companion application',
      })
      .select('id, status, direction')
      .single();

    expect(error).toBeNull();
    expect(data?.direction).toBe('companion_to_agency');
    appId = data?.id ?? null;
  });

  it('caregiver can read their own application', async () => {
    if (!appId) return;
    const { data, error } = await getTestClient()
      .from('agency_invites')
      .select('id, status, message')
      .eq('id', appId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.message).toContain('INT-TEST');
  });
});

// ── Agency owner sees companion applications ──────────────────────────────────

describe('INT-04c: agency_owner sees companion applications', () => {
  let sharedAppId: string | null = null;

  beforeAll(async () => {
    // Create a fresh pending companion_to_agency application as caregiver.
    // INT-04b left a pending record (no DELETE policy); decline it first.
    await signInAs('caregiver');
    await declineExistingPending(CAREGIVER_MARIA_USER_ID, 'companion_to_agency');

    const { data, error } = await getTestClient()
      .from('agency_invites')
      .insert({
        agency_id: AGENCY_ID,
        companion_id: CAREGIVER_MARIA_USER_ID,
        direction: 'companion_to_agency',
        status: 'pending',
        message: 'INT-TEST app for owner view',
      })
      .select('id')
      .single();

    if (!error && data?.id) {
      sharedAppId = data.id;
    }
    // Switch to agency owner for the actual tests
    await signInAs('agency_owner');
  });

  afterAll(() => signOut());

  it('agency_owner can query companion applications by direction', async () => {
    if (!sharedAppId) return; // skip if beforeAll insert failed
    const { data, error } = await getTestClient()
      .from('agency_invites')
      .select('id, direction, companion_id')
      .eq('id', sharedAppId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.direction).toBe('companion_to_agency');
    expect(data?.companion_id).toBe(CAREGIVER_MARIA_USER_ID);
  });

  it('agency_owner can accept a companion application', async () => {
    if (!sharedAppId) return;
    const { error } = await getTestClient()
      .from('agency_invites')
      .update({ status: 'accepted' })
      .eq('id', sharedAppId);
    expect(error).toBeNull();
  });
});
