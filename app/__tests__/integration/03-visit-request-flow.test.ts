/**
 * Integration: 03 — Visit Request Lifecycle (Write Tests)
 * Signs in ONCE per role section. All test rows tagged note='INT-TEST'.
 * afterAll guarantees cleanup even if tests fail mid-flow.
 */

import {
  getTestClient,
  signInAs,
  signOut,
  trackCreated,
  cleanupTracked,
} from '../helpers/supabaseTestClient';

const ELDER_ROBERT_ID = 'f6666666-6666-6666-6666-666666666666';
const CAREGIVER_MARIA_USER_ID = 'b2222222-2222-2222-2222-222222222222';
const CARESEEKER_USER_ID = 'c3333333-3333-3333-3333-333333333333';

// Shared state across tests in this file
let requestId: string | null = null;

// ── Careseeker creates and manages a request ──────────────────────────────────

describe('INT-03a: careseeker creates visit_request', () => {
  beforeAll(() => signInAs('careseeker'));
  afterAll(async () => {
    await cleanupTracked();
    await signOut();
  });

  it('inserts a visit_request with status=pending', async () => {
    const client = getTestClient();
    const { data, error } = await client
      .from('visit_requests')
      .insert({
        elder_id: ELDER_ROBERT_ID,
        companion_id: CAREGIVER_MARIA_USER_ID,
        requested_by: CARESEEKER_USER_ID,
        requested_date: '2026-03-20',
        requested_time_slot: '10am-12pm',
        tasks: ['companionship'],
        note: 'INT-TEST visit request flow',
      })
      .select('id, status')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    expect(data?.status).toBe('pending');
    requestId = data!.id;
    trackCreated('visit_requests', data!.id);
  });

  it('can read the request back (status=pending)', async () => {
    expect(requestId).toBeTruthy();
    const { data, error } = await getTestClient()
      .from('visit_requests')
      .select('id, status, elder_id, companion_id, tasks, requested_date')
      .eq('id', requestId!)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.status).toBe('pending');
    expect(data?.elder_id).toBe(ELDER_ROBERT_ID);
    expect(data?.companion_id).toBe(CAREGIVER_MARIA_USER_ID);
    expect(data?.requested_date).toBe('2026-03-20');
    expect(data?.tasks).toContain('companionship');
  });

  it('can update status to cancelled', async () => {
    expect(requestId).toBeTruthy();
    const { error } = await getTestClient()
      .from('visit_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId!);
    expect(error).toBeNull();
  });

  it('can delete the cancelled request', async () => {
    expect(requestId).toBeTruthy();
    const { error } = await getTestClient()
      .from('visit_requests')
      .delete()
      .eq('id', requestId!);
    expect(error).toBeNull();
    requestId = null;
  });

  it('NEGATIVE: insert with invalid status value is rejected by DB constraint', async () => {
    const { data, error } = await getTestClient()
      .from('visit_requests')
      .insert({
        elder_id: ELDER_ROBERT_ID,
        companion_id: CAREGIVER_MARIA_USER_ID,
        requested_by: CARESEEKER_USER_ID,
        requested_date: '2026-03-22',
        status: 'not_a_real_status',
        tasks: ['companionship'],
      })
      .select('id')
      .single();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('NEGATIVE: insert without required elder_id is rejected', async () => {
    const { data, error } = await getTestClient()
      .from('visit_requests')
      .insert({
        companion_id: CAREGIVER_MARIA_USER_ID,
        requested_by: CARESEEKER_USER_ID,
        requested_date: '2026-03-22',
        tasks: ['companionship'],
      } as any)
      .select('id')
      .single();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

// ── Caregiver sees the request ────────────────────────────────────────────────

describe('INT-03b: caregiver reads visit_requests addressed to them', () => {
  let caregiverRequestId: string | null = null;

  beforeAll(async () => {
    // Create a test request first (as careseeker)
    await signInAs('careseeker');
    const { data } = await getTestClient()
      .from('visit_requests')
      .insert({
        elder_id: ELDER_ROBERT_ID,
        companion_id: CAREGIVER_MARIA_USER_ID,
        requested_by: CARESEEKER_USER_ID,
        requested_date: '2026-03-25',
        requested_time_slot: '2pm-4pm',
        tasks: ['companionship'],
        note: 'INT-TEST caregiver inbox',
      })
      .select('id')
      .single();
    caregiverRequestId = data?.id ?? null;
    if (caregiverRequestId) trackCreated('visit_requests', caregiverRequestId);

    // Switch to caregiver for the actual tests
    await signInAs('caregiver');
  });

  afterAll(async () => {
    await cleanupTracked();
    await signOut();
  });

  it('caregiver can see the request addressed to them', async () => {
    if (!caregiverRequestId) return;
    const { data, error } = await getTestClient()
      .from('visit_requests')
      .select('id, status, companion_id')
      .eq('id', caregiverRequestId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.companion_id).toBe(CAREGIVER_MARIA_USER_ID);
  });

  it('caregiver can update request status to accepted', async () => {
    if (!caregiverRequestId) return;
    const { error } = await getTestClient()
      .from('visit_requests')
      .update({ status: 'accepted' })
      .eq('id', caregiverRequestId);

    expect(error).toBeNull();
  });
});
