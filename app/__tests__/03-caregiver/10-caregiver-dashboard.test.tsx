/**
 * Batch 12: Caregiver Dashboard Tests (Features #113-123)
 * Screen: caregiver/(tabs)/index.tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: { Screen: ({ children }: any) => children ?? null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
  useFocusEffect: jest.fn((callback: any) => {
    const ReactInner = require('react');
    ReactInner.useEffect(() => { callback(); }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'caregiver-1', full_name: 'Maria Garcia', agency_id: 'agency-1' },
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
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'caregiver-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock OfflineIndicator
jest.mock('@/components/sync', () => ({
  OfflineIndicator: () => null,
}));

// Mock TaskIcons
jest.mock('@/components/icons/TaskIcons', () => ({
  MealIcon: () => null,
  CompanionshipIcon: () => null,
  CleaningIcon: () => null,
  MedicationIcon: () => null,
}));

// Thenable supabase mock
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
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'caregiver-1' } } }),
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

import CaregiverDashboardScreen from '@/app/(protected)/caregiver/(tabs)/index';

describe('Batch 12: Caregiver Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: empty visits, 0 pending invitations
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null, count: 0 })
    );
  });

  // Feature #113: Greeting with caregiver name
  it('#113 - Greeting renders with caregiver first name', async () => {
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Maria!/)).toBeTruthy();
    });
  });

  // Feature #114: Visit count subtitle
  it('#114 - Visit count subtitle shows "0 visits today"', async () => {
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('You have 0 visits today')).toBeTruthy();
    });
  });

  // Feature #115: Empty state when no visits
  it('#115 - Empty state shows "All done for today!"', async () => {
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('All done for today!')).toBeTruthy();
    });
  });

  // Feature #116: Empty state subtitle
  it('#116 - Empty state subtitle "Check your schedule"', async () => {
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('Check your schedule for upcoming visits')).toBeTruthy();
    });
  });

  // Feature #117: Visit card renders with elder name when data present
  it('#117 - Visit card shows elder name', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [{
          id: 'visit-1',
          scheduled_date: '2026-02-15',
          scheduled_start: '09:00',
          scheduled_end: '11:00',
          status: 'scheduled',
          elder: { id: 'elder-1', first_name: 'Dorothy', last_name: 'Johnson', address: '123 Oak St' },
          visit_tasks: [],
        }],
        error: null,
        count: 0,
      })
    );
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('Dorothy Johnson')).toBeTruthy();
    });
  });

  // Feature #118: Visit card shows address
  it('#118 - Visit card shows elder address', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [{
          id: 'visit-1',
          scheduled_date: '2026-02-15',
          scheduled_start: '09:00',
          scheduled_end: '11:00',
          status: 'scheduled',
          elder: { id: 'elder-1', first_name: 'Dorothy', last_name: 'Johnson', address: '123 Oak St' },
          visit_tasks: [],
        }],
        error: null,
        count: 0,
      })
    );
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('123 Oak St')).toBeTruthy();
    });
  });

  // Feature #119: Visit card shows time range
  it('#119 - Visit card shows formatted time range', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [{
          id: 'visit-1',
          scheduled_date: '2026-02-15',
          scheduled_start: '09:00',
          scheduled_end: '11:00',
          status: 'scheduled',
          elder: { id: 'elder-1', first_name: 'Dorothy', last_name: 'Johnson', address: '123 Oak St' },
          visit_tasks: [],
        }],
        error: null,
        count: 0,
      })
    );
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText(/9:00 AM.*11:00 AM/)).toBeTruthy();
    });
  });

  // Feature #120: Start Visit button renders on scheduled visit
  it('#120 - "Start Visit" button renders for scheduled visit', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [{
          id: 'visit-1',
          scheduled_date: '2026-02-15',
          scheduled_start: '09:00',
          scheduled_end: '11:00',
          status: 'scheduled',
          elder: { id: 'elder-1', first_name: 'Dorothy', last_name: 'Johnson', address: '123 Oak St' },
          visit_tasks: [],
        }],
        error: null,
        count: 0,
      })
    );
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('Start Visit')).toBeTruthy();
    });
  });

  // Feature #121: Continue Visit button for in-progress visits
  it('#121 - "Continue Visit" button renders for in-progress visit', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [{
          id: 'visit-1',
          scheduled_date: '2026-02-15',
          scheduled_start: '09:00',
          scheduled_end: '11:00',
          status: 'in_progress',
          elder: { id: 'elder-1', first_name: 'Dorothy', last_name: 'Johnson', address: '123 Oak St' },
          visit_tasks: [],
        }],
        error: null,
        count: 0,
      })
    );
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('Continue Visit')).toBeTruthy();
    });
  });

  // Feature #122: In Progress badge shows for in-progress visits
  it('#122 - "In Progress" badge renders for in-progress visit', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [{
          id: 'visit-1',
          scheduled_date: '2026-02-15',
          scheduled_start: '09:00',
          scheduled_end: '11:00',
          status: 'in_progress',
          elder: { id: 'elder-1', first_name: 'Dorothy', last_name: 'Johnson', address: '123 Oak St' },
          visit_tasks: [],
        }],
        error: null,
        count: 0,
      })
    );
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeTruthy();
    });
  });

  // Feature #123: Visit count updates with data
  it('#123 - Visit count updates when visits present', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [{
          id: 'visit-1',
          scheduled_date: '2026-02-15',
          scheduled_start: '09:00',
          scheduled_end: '11:00',
          status: 'scheduled',
          elder: { id: 'elder-1', first_name: 'Dorothy', last_name: 'Johnson', address: '123 Oak St' },
          visit_tasks: [],
        }],
        error: null,
        count: 0,
      })
    );
    render(<CaregiverDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('You have 1 visit today')).toBeTruthy();
    });
  });
});
