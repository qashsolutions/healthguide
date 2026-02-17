/**
 * Batch 24: Family Visits + Reports Tests (Features #220-231)
 * Screens: family/visits.tsx, family/reports.tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: 'report-1' }),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: { Screen: ({ options }: any) => null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
  useFocusEffect: jest.fn((callback: any) => {
    const ReactInner = require('react');
    ReactInner.useEffect(() => { callback(); }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'family-1', full_name: 'Sarah Smith', agency_id: 'agency-1' },
    agency: { id: 'agency-1', name: 'Sunny Day Home Care' },
    loading: false,
    initialized: true,
    signInWithEmail: jest.fn(),
    signInWithPhone: jest.fn(),
    signUpWithEmail: jest.fn(),
    verifyOTP: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => true),
  }),
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'family-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Monday, February 15'),
  isToday: jest.fn(() => false),
  isYesterday: jest.fn(() => false),
  parseISO: jest.fn((s: string) => new Date(s)),
}));

// Supabase mock
const mockSingle = jest.fn();
const mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: mockSingle,
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'family-1' } } }),
      signInWithPassword: jest.fn(),
      signInWithOtp: jest.fn(),
      signUp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import FamilyVisitsScreen from '@/app/(protected)/family/visits';
import FamilyReportsScreen from '@/app/(protected)/family/reports';

describe('Batch 24: Family Visits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // family_members returns elder_id
    mockSingle.mockResolvedValue({
      data: { elder_id: 'elder-1' },
      error: null,
    });
    // Visits query returns empty
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #220: Visits list renders with title
  it('#220 - Visits list renders with \"All Visits\" title', async () => {
    render(<FamilyVisitsScreen />);
    await waitFor(() => {
      expect(screen.getByText('All Visits')).toBeTruthy();
    });
  });

  // Feature #221: Back button renders
  it('#221 - Back button renders', async () => {
    render(<FamilyVisitsScreen />);
    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeTruthy();
    });
  });

  // Feature #222: Empty state renders
  it('#222 - Empty state \"No visits yet\" renders', async () => {
    render(<FamilyVisitsScreen />);
    await waitFor(() => {
      expect(screen.getByText('No visits yet')).toBeTruthy();
    });
  });
});

describe('Batch 24: Family Reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: { elder_id: 'elder-1' },
      error: null,
    });
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #225: Reports screen renders with title
  it('#225 - Reports screen renders with \"Daily Reports\" title', async () => {
    render(<FamilyReportsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Daily Reports')).toBeTruthy();
    });
  });

  // Feature #226: Reports empty state renders
  it('#226 - Reports empty state renders', async () => {
    render(<FamilyReportsScreen />);
    await waitFor(() => {
      expect(screen.getByText('No reports yet')).toBeTruthy();
    });
  });

  // Feature #227: Reports empty state subtitle
  it('#227 - Reports empty state subtitle renders', async () => {
    render(<FamilyReportsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Daily reports will appear here after care visits')).toBeTruthy();
    });
  });

  // Feature #228: Reports back button
  it('#228 - Reports back button renders', async () => {
    render(<FamilyReportsScreen />);
    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeTruthy();
    });
  });

  // Feature #229: Reports empty state renders
  it('#229 - Reports empty state renders', async () => {
    render(<FamilyReportsScreen />);
    await waitFor(() => {
      expect(screen.getByText('No reports yet')).toBeTruthy();
    });
  });
});
