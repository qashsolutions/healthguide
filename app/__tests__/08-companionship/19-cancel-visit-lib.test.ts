/**
 * 08-Companionship: Cancel Visit Library Tests
 * Tests for @/lib/cancelVisit — isLateCancellation, cancelVisit, markElderUnavailable
 */

var mockSingle = jest.fn();
var mockFrom;
var mockFunctionsInvoke = jest.fn().mockResolvedValue({ data: {}, error: null });

var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  single: mockSingle,
  then: jest.fn((resolve: any) => resolve({ data: null, error: null })),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    functions: { invoke: mockFunctionsInvoke },
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

import {
  isLateCancellation,
  cancelVisit,
  markElderUnavailable,
} from '@/lib/cancelVisit';

describe('08-Companionship: isLateCancellation', () => {
  it('returns true when visit starts in 29 minutes (late)', () => {
    const soon = new Date(Date.now() + 29 * 60 * 1000).toISOString();
    expect(isLateCancellation(soon)).toBe(true);
  });

  it('returns true when visit starts in 1 minute (very late)', () => {
    const very_soon = new Date(Date.now() + 1 * 60 * 1000).toISOString();
    expect(isLateCancellation(very_soon)).toBe(true);
  });

  it('returns true when visit starts in 0 minutes (right now)', () => {
    const now = new Date(Date.now()).toISOString();
    expect(isLateCancellation(now)).toBe(true);
  });

  it('returns false when visit starts in 31 minutes (not late)', () => {
    const inTime = new Date(Date.now() + 31 * 60 * 1000).toISOString();
    expect(isLateCancellation(inTime)).toBe(false);
  });

  it('returns false when visit starts in 2 hours', () => {
    const later = new Date(Date.now() + 120 * 60 * 1000).toISOString();
    expect(isLateCancellation(later)).toBe(false);
  });

  it('returns false when visit starts tomorrow', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isLateCancellation(tomorrow)).toBe(false);
  });

  it('returns true when visit is in the past (already started)', () => {
    const past = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(isLateCancellation(past)).toBe(true);
  });
});

describe('08-Companionship: cancelVisit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.update.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.insert.mockReturnThis();
    mockFunctionsInvoke.mockResolvedValue({ data: {}, error: null });
  });

  it('companion cancels ≥30 min before: sets status=cancelled, no late penalty', async () => {
    // Visit scheduled 60 min from now → NOT late
    const futureStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    mockSingle.mockResolvedValueOnce({
      data: {
        scheduled_start: futureStart,
        caregiver_id: 'cg-1',
        elder_id: 'elder-1',
        agency_id: 'agency-1',
      },
      error: null,
    });

    const result = await cancelVisit('visit-1', 'companion', 'cg-1');

    expect(result.success).toBe(true);
    expect(result.isLate).toBe(false);
    // update called with status: 'cancelled'
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'cancelled' });
    // No auto-rating insert for normal cancel
    const insertCalls = (mockChain.insert as jest.Mock).mock.calls;
    expect(insertCalls.length).toBe(0);
  });

  it('companion cancels <30 min before: sets status=cancelled_late, auto 1-star inserted', async () => {
    // Visit scheduled 10 min from now → LATE
    const nearStart = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    // First single() call: fetch visit
    mockSingle
      .mockResolvedValueOnce({
        data: {
          scheduled_start: nearStart,
          caregiver_id: 'cg-1',
          elder_id: 'elder-1',
          agency_id: 'agency-1',
        },
        error: null,
      })
      // Second single() call: fetch elder user_id
      .mockResolvedValueOnce({
        data: { user_id: 'elder-user-1' },
        error: null,
      });

    const result = await cancelVisit('visit-1', 'companion', 'cg-1');

    expect(result.success).toBe(true);
    expect(result.isLate).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'cancelled_late' });
    // Auto 1-star rating inserted
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 1, is_auto_generated: true })
    );
  });

  it('elder cancels: sets status=cancelled, no penalty regardless of timing', async () => {
    // Visit very soon — but elder cancels, no penalty
    const veryNear = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    mockSingle.mockResolvedValueOnce({
      data: {
        scheduled_start: veryNear,
        caregiver_id: 'cg-1',
        elder_id: 'elder-1',
        agency_id: 'agency-1',
      },
      error: null,
    });

    const result = await cancelVisit('visit-1', 'elder', 'elder-user-1');

    expect(result.success).toBe(true);
    expect(result.isLate).toBe(false);
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'cancelled' });
    // No auto-rating for elder cancellation
    expect(mockChain.insert).not.toHaveBeenCalled();
  });

  it('returns error when visit not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    const result = await cancelVisit('nonexistent', 'companion', 'cg-1');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('08-Companionship: markElderUnavailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.update.mockReturnThis();
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    mockSingle.mockResolvedValue({ data: { elder_id: 'elder-1' }, error: null });
    mockFunctionsInvoke.mockResolvedValue({ data: {}, error: null });
  });

  it('sets visit status to elder_unavailable', async () => {
    const result = await markElderUnavailable('visit-1', 'Elder was not home');

    expect(result.success).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'elder_unavailable' })
    );
  });

  it('stores the note in the update', async () => {
    await markElderUnavailable('visit-1', 'No answer at door');

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'No answer at door' })
    );
  });

  it('stores GPS coords when provided', async () => {
    await markElderUnavailable('visit-1', 'Not home', {
      latitude: 37.7749,
      longitude: -122.4194,
    });

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        check_in_latitude: 37.7749,
        check_in_longitude: -122.4194,
      })
    );
  });

  it('works without GPS coords (coords undefined)', async () => {
    const result = await markElderUnavailable('visit-1', 'Not home');

    expect(result.success).toBe(true);
    // Should NOT include GPS fields
    expect(mockChain.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ check_in_latitude: expect.anything() })
    );
  });

  it('returns error when DB update throws', async () => {
    mockChain.eq.mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    const result = await markElderUnavailable('visit-1', 'test');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
