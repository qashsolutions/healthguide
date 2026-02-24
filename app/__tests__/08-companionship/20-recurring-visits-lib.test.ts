/**
 * 08-Companionship: Recurring Visits Library Tests
 * Tests for @/lib/recurringVisits
 */

var mockSingle = jest.fn();
var mockFrom;

var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: mockSingle,
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

import {
  buildRecurrenceRule,
  parseRecurrenceRule,
  getDayFromDateString,
  generateChildVisits,
  cancelRecurringSeries,
  type RecurrenceConfig,
} from '@/lib/recurringVisits';

describe('08-Companionship: buildRecurrenceRule', () => {
  it('formats weekly single-day rule correctly', () => {
    const config: RecurrenceConfig = {
      frequency: 'weekly',
      days: ['tuesday'],
      endType: 'none',
    };
    expect(buildRecurrenceRule(config)).toBe('weekly:tuesday');
  });

  it('formats weekly multi-day rule correctly', () => {
    const config: RecurrenceConfig = {
      frequency: 'weekly',
      days: ['tuesday', 'thursday'],
      endType: 'none',
    };
    expect(buildRecurrenceRule(config)).toBe('weekly:tuesday,thursday');
  });

  it('formats biweekly single-day rule correctly', () => {
    const config: RecurrenceConfig = {
      frequency: 'biweekly',
      days: ['monday'],
      endType: 'none',
    };
    expect(buildRecurrenceRule(config)).toBe('biweekly:monday');
  });

  it('formats biweekly multi-day rule correctly', () => {
    const config: RecurrenceConfig = {
      frequency: 'biweekly',
      days: ['monday', 'wednesday', 'friday'],
      endType: 'none',
    };
    expect(buildRecurrenceRule(config)).toBe('biweekly:monday,wednesday,friday');
  });

  it('formats weekend days correctly', () => {
    const config: RecurrenceConfig = {
      frequency: 'weekly',
      days: ['saturday', 'sunday'],
      endType: 'none',
    };
    expect(buildRecurrenceRule(config)).toBe('weekly:saturday,sunday');
  });
});

describe('08-Companionship: parseRecurrenceRule', () => {
  it('parses weekly single-day rule', () => {
    const result = parseRecurrenceRule('weekly:tuesday');
    expect(result.frequency).toBe('weekly');
    expect(result.days).toEqual(['tuesday']);
  });

  it('parses weekly multi-day rule', () => {
    const result = parseRecurrenceRule('weekly:tuesday,thursday');
    expect(result.frequency).toBe('weekly');
    expect(result.days).toEqual(['tuesday', 'thursday']);
  });

  it('parses biweekly rule', () => {
    const result = parseRecurrenceRule('biweekly:monday');
    expect(result.frequency).toBe('biweekly');
    expect(result.days).toEqual(['monday']);
  });

  it('parses biweekly multi-day rule', () => {
    const result = parseRecurrenceRule('biweekly:monday,wednesday');
    expect(result.frequency).toBe('biweekly');
    expect(result.days).toEqual(['monday', 'wednesday']);
  });

  it('NEGATIVE: does not throw on empty string', () => {
    expect(() => parseRecurrenceRule('')).not.toThrow();
    const result = parseRecurrenceRule('');
    expect(result.days).toEqual([]);
  });

  it('NEGATIVE: handles missing days gracefully', () => {
    const result = parseRecurrenceRule('weekly:');
    expect(result.days).toEqual([]);
  });
});

describe('08-Companionship: getDayFromDateString', () => {
  it('returns "tuesday" for 2026-02-17', () => {
    expect(getDayFromDateString('2026-02-17')).toBe('tuesday');
  });

  it('returns "monday" for 2026-02-16', () => {
    expect(getDayFromDateString('2026-02-16')).toBe('monday');
  });

  it('returns "saturday" for 2026-02-21', () => {
    expect(getDayFromDateString('2026-02-21')).toBe('saturday');
  });

  it('returns "sunday" for 2026-02-22', () => {
    expect(getDayFromDateString('2026-02-22')).toBe('sunday');
  });

  it('returns "wednesday" for 2026-02-18', () => {
    expect(getDayFromDateString('2026-02-18')).toBe('wednesday');
  });

  it('returns "thursday" for 2026-02-19', () => {
    expect(getDayFromDateString('2026-02-19')).toBe('thursday');
  });

  it('returns "friday" for 2026-02-20', () => {
    expect(getDayFromDateString('2026-02-20')).toBe('friday');
  });
});

describe('08-Companionship: generateChildVisits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.insert.mockReturnThis();
    mockChain.update.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  it('returns error when parent visit not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    const result = await generateChildVisits('nonexistent');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error when visit is not recurring', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'parent-1',
        elder_id: 'elder-1',
        caregiver_id: 'cg-1',
        scheduled_start: '2026-03-01T10:00:00',
        scheduled_end: '2026-03-01T12:00:00',
        is_recurring: false, // NOT recurring
        recurrence_rule: null,
        notes: null,
        agency_id: null,
      },
      error: null,
    });

    const result = await generateChildVisits('parent-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not recurring/i);
  });

  it('attempts to insert child visits for a valid recurring parent', async () => {
    // Parent visit data
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'parent-1',
        elder_id: 'elder-1',
        caregiver_id: 'cg-1',
        scheduled_start: '2026-03-03T10:00:00', // Tuesday
        scheduled_end: '2026-03-03T12:00:00',
        is_recurring: true,
        recurrence_rule: 'weekly:tuesday',
        notes: null,
        agency_id: null,
      },
      error: null,
    });
    // Then: mock then for existing children query → empty
    mockChain.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null }));
    // Then: mock then for parent tasks query → empty
    mockChain.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null }));
    // Then: child insert + select single
    mockSingle.mockResolvedValue({ data: { id: 'child-1' }, error: null });

    const result = await generateChildVisits('parent-1');

    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(0);
  });
});

describe('08-Companionship: cancelRecurringSeries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.update.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.gte.mockReturnThis();
    mockChain.select.mockReturnThis();
    // Simulate cancelled children returned
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [{ id: 'child-1' }, { id: 'child-2' }], error: null })
    );
  });

  it('cancels future child visits (sets status=cancelled)', async () => {
    const result = await cancelRecurringSeries('parent-1');

    expect(result.success).toBe(true);
    expect(mockChain.update).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(mockChain.eq).toHaveBeenCalledWith('parent_visit_id', 'parent-1');
  });

  it('marks parent is_recurring = false', async () => {
    await cancelRecurringSeries('parent-1');

    // Second update call sets is_recurring: false on parent
    expect(mockChain.update).toHaveBeenCalledWith({ is_recurring: false });
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'parent-1');
  });

  it('returns cancelled count', async () => {
    const result = await cancelRecurringSeries('parent-1');

    expect(result.success).toBe(true);
    expect(result.cancelled).toBe(2);
  });

  it('NEGATIVE: handles DB error gracefully', async () => {
    mockChain.gte.mockImplementationOnce(() => {
      throw new Error('DB connection failed');
    });

    const result = await cancelRecurringSeries('parent-1');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
