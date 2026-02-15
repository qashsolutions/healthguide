/**
 * Batch 16: Check-Out + Visit History Tests (Features #154-158)
 * Screens: visit/[id]/check-out.tsx, visit-history.tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: mockBack,
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'visit-1' }),
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

// Mock haptics + location
jest.mock('@/utils/haptics', () => ({ hapticFeedback: jest.fn(), vibrate: jest.fn() }));
jest.mock('@/services/location', () => ({
  getCurrentLocation: jest.fn().mockResolvedValue({ latitude: 34.05, longitude: -118.25 }),
  requestLocationPermission: jest.fn().mockResolvedValue(true),
  isWithinRadius: jest.fn().mockReturnValue(true),
  EVV_RADIUS_METERS: 150,
  formatDistance: jest.fn(() => '50 meters'),
  calculateDistance: jest.fn(() => 50),
}));

// Supabase mock
const mockSingle = jest.fn().mockResolvedValue({
  data: {
    id: 'visit-1',
    status: 'in_progress',
    actual_check_in: '2026-02-15T09:00:00Z',
    elder: { id: 'elder-1', first_name: 'John', last_name: 'Davis' },
  },
  error: null,
});

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
  range: jest.fn().mockReturnThis(),
  single: mockSingle,
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({
    data: [
      { id: 'task-1', status: 'completed' },
      { id: 'task-2', status: 'completed' },
      { id: 'task-3', status: 'pending' },
    ],
    error: null,
  })),
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

import CheckOutScreen from '@/app/(protected)/caregiver/visit/[id]/check-out';
import VisitHistoryScreen from '@/app/(protected)/caregiver/visit-history';

describe('Batch 16: Check-Out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: {
        id: 'visit-1',
        status: 'in_progress',
        actual_check_in: '2026-02-15T09:00:00Z',
        elder: { id: 'elder-1', first_name: 'John', last_name: 'Davis' },
      },
      error: null,
    });
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [
          { id: 'task-1', status: 'completed' },
          { id: 'task-2', status: 'completed' },
          { id: 'task-3', status: 'pending' },
        ],
        error: null,
      })
    );
  });

  // Feature #154: TAP TO CHECK OUT button renders
  it('#154 - "TAP TO CHECK OUT" button renders', async () => {
    render(<CheckOutScreen />);
    await waitFor(() => {
      expect(screen.getByText('TAP TO CHECK OUT')).toBeTruthy();
    });
  });

  // Feature #155: Client name shown on check-out
  it('#155 - Client name shown on check-out screen', async () => {
    render(<CheckOutScreen />);
    await waitFor(() => {
      expect(screen.getByText('John Davis')).toBeTruthy();
    });
  });

  // Feature #156: Task completion count
  it('#156 - Tasks completed count shows', async () => {
    render(<CheckOutScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Tasks completed: 2\/3/)).toBeTruthy();
    });
  });

  // Feature #157: "Ready to leave?" title
  it('#157 - "Ready to leave?" title renders', async () => {
    render(<CheckOutScreen />);
    await waitFor(() => {
      expect(screen.getByText('Ready to leave?')).toBeTruthy();
    });
  });
});

describe('Batch 16: Visit History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // For visit history - return empty to show empty state
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #158: Visit history empty state
  it('#158 - Visit history empty state renders', async () => {
    render(<VisitHistoryScreen />);
    await waitFor(() => {
      expect(screen.getByText('No visit history yet')).toBeTruthy();
    });
    expect(screen.getByText('Completed and missed visits will appear here')).toBeTruthy();
  });
});
