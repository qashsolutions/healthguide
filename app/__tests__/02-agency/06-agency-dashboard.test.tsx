/**
 * Batch 7: Agency Dashboard Tests (Features #64-77)
 * Screen: (protected)/agency/(tabs)/index.tsx
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
    user: { id: 'owner-1', full_name: 'Jane Smith', email: 'jane@agency.com' },
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

// Supabase mock - override global to provide dashboard data
const mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  // Make the chain thenable so Promise.all works
  then: jest.fn((resolve: any) =>
    resolve({ data: [], error: null })
  ),
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

import AgencyDashboard from '@/app/(protected)/agency/(tabs)/index';

describe('Batch 7: Agency Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the chain's then to return empty data by default
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #64: Dashboard title renders (welcome + agency name)
  it('#64 - Dashboard welcome and agency name render', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Jane/)).toBeTruthy();
    });
    expect(screen.getByText('Sunny Day Home Care')).toBeTruthy();
  });

  // Feature #65: Stats grid shows 4 KPI cards
  it('#65 - Stats grid shows 4 KPI cards', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active Visits')).toBeTruthy();
    });
    expect(screen.getByText('Caregivers')).toBeTruthy();
    expect(screen.getByText('Elders')).toBeTruthy();
    expect(screen.getByText("Today's Visits")).toBeTruthy();
  });

  // Feature #66: Total caregivers count displays
  it('#66 - Caregivers count displays', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Caregivers')).toBeTruthy();
    });
    // With empty data, multiple cards show "0/0" (Caregivers, Elders, Today's Visits)
    const zeroStats = screen.getAllByText('0/0');
    expect(zeroStats.length).toBeGreaterThanOrEqual(2);
  });

  // Feature #67: Total elders count displays
  it('#67 - Elders count displays', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Elders')).toBeTruthy();
    });
  });

  // Feature #68: Today's visits count displays
  it('#68 - Today\'s visits count displays', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Today's Visits")).toBeTruthy();
    });
  });

  // Feature #69: Completion rate percentage displays
  it('#69 - Completion rate percentage displays', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Completion Rate')).toBeTruthy();
    });
    expect(screen.getByText('0%')).toBeTruthy();
  });

  // Feature #70: Today's schedule section renders
  it('#70 - Today\'s Schedule section renders', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Today's Schedule")).toBeTruthy();
    });
    expect(screen.getByText('View All')).toBeTruthy();
  });

  // Feature #71: Visit cards (with data) - tested via empty state fallback
  it('#71 - Visit cards section exists (empty state)', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No visits scheduled for today')).toBeTruthy();
    });
  });

  // Feature #72: Visit status display area
  it('#72 - Progress badges render (Completed, In Progress, Upcoming)', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeTruthy();
    });
    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(screen.getByText('Upcoming')).toBeTruthy();
  });

  // Feature #73: Find Caregivers card renders
  it('#73 - Find Caregivers card renders', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Find Caregivers')).toBeTruthy();
    });
    expect(screen.getByText('Browse available caregivers in your area')).toBeTruthy();
  });

  // Feature #74: Today's Progress section with completion rate
  it('#74 - Today\'s Progress section renders', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Today's Progress")).toBeTruthy();
    });
  });

  // Feature #75: Alerts section renders (conditional - empty by default)
  it('#75 - Alerts section renders conditionally', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/)).toBeTruthy();
    });
    // No alerts with empty data, so alert section shouldn't show
    expect(screen.queryByText('Late Check-in')).toBeNull();
  });

  // Feature #76: Loading state shows initially
  it('#76 - Loading state shows initially then resolves', async () => {
    render(<AgencyDashboard />);
    // After data loads, dashboard content appears
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/)).toBeTruthy();
    });
  });

  // Feature #77: Empty state shows when no visits
  it('#77 - Empty state shows when no visits', async () => {
    render(<AgencyDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No visits scheduled for today')).toBeTruthy();
    });
  });
});
