/**
 * Batch 9: Agency Caregivers + Schedule Tests (Features #87-94)
 * Screens: agency/(tabs)/caregivers.tsx, agency/(tabs)/schedule.tsx
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
    user: { id: 'owner-1', full_name: 'Jane Smith', agency_id: 'agency-1' },
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
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'owner-1' } }),
  AuthProvider: ({ children }: any) => children,
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
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }),
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

import CaregiversScreen from '@/app/(protected)/agency/(tabs)/caregivers';
import ScheduleScreen from '@/app/(protected)/agency/(tabs)/schedule';

describe('Batch 9: Agency Caregivers List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #87: Caregivers list renders
  it('#87 - Caregivers list renders with count header', async () => {
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Caregivers/)).toBeTruthy();
    });
  });

  // Feature #88: Caregiver count displays
  it('#88 - Caregiver count shows 0 / 15', async () => {
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByText('0 / 15 Caregivers')).toBeTruthy();
    });
  });

  // Feature #89: Search input renders
  it('#89 - Search caregivers input renders', async () => {
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search caregivers...')).toBeTruthy();
    });
  });

  // Feature #90: Add button renders
  it('#90 - "+ Add" button renders', async () => {
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByText('+ Add')).toBeTruthy();
    });
  });

  // Feature #94: Empty state when no caregivers
  it('#94 - Empty state shows when no caregivers', async () => {
    render(<CaregiversScreen />);
    await waitFor(() => {
      expect(screen.getByText('No caregivers yet')).toBeTruthy();
    });
    expect(screen.getByText('Add your first caregiver to get started')).toBeTruthy();
  });
});

describe('Batch 9: Agency Schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #91: Schedule shows week navigation
  it('#91 - Schedule shows week navigation with Prev/Next', async () => {
    render(<ScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByText('Prev')).toBeTruthy();
    });
    expect(screen.getByText('Next')).toBeTruthy();
  });

  // Feature #92: Schedule shows empty state for visits
  it('#92 - Schedule shows empty state when no visits', async () => {
    render(<ScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByText('No visits scheduled')).toBeTruthy();
    });
  });

  // Feature #93: Can navigate to new assignment
  it('#93 - "+ Add" button renders on schedule', async () => {
    render(<ScheduleScreen />);
    await waitFor(() => {
      expect(screen.getByText('+ Add')).toBeTruthy();
    });
  });
});
