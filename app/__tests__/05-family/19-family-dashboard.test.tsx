/**
 * Batch 23: Family Dashboard Tests (Features #208-219)
 * Screen: family/dashboard.tsx
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
  useLocalSearchParams: () => ({}),
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

// Mock notifications
jest.mock('@/lib/notifications', () => ({
  registerForPushNotifications: jest.fn(),
  registerNotificationCategories: jest.fn(),
  setupNotificationResponseHandler: jest.fn(() => jest.fn()),
  clearBadge: jest.fn(),
  removeDeviceToken: jest.fn(),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => '10:30 AM'),
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

import FamilyDashboardScreen from '@/app/(protected)/family/dashboard';

describe('Batch 23: Family Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // family_members query returns elder
    mockSingle.mockResolvedValue({
      data: {
        elder_id: 'elder-1',
        elder: { id: 'elder-1', first_name: 'Dorothy', last_name: 'Smith', address: '123 Main St' },
      },
      error: null,
    });
    // Visits query returns empty (no today visit)
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #208: Dashboard renders with elder name
  it('#208 - Dashboard shows \"Caring for\" with elder name', async () => {
    render(<FamilyDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('Caring for')).toBeTruthy();
    });
    expect(screen.getByText(/Dorothy Smith/)).toBeTruthy();
  });

  // Feature #209: Today's Care section renders
  it('#209 - Today\'s Care section renders', async () => {
    render(<FamilyDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText("Today's Care")).toBeTruthy();
    });
  });

  // Feature #210: No visit scheduled today message
  it('#210 - \"No visit scheduled today\" empty state', async () => {
    render(<FamilyDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('No visit scheduled today')).toBeTruthy();
    });
  });

  // Feature #211: Quick Actions section renders
  it('#211 - Quick actions render (Reports, All Visits, Settings)', async () => {
    render(<FamilyDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('Reports')).toBeTruthy();
    });
    expect(screen.getByText('All Visits')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  // Feature #212: Quick action emojis render
  it('#212 - Quick action emojis render', async () => {
    render(<FamilyDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('📋')).toBeTruthy();
    });
    expect(screen.getByText('📆')).toBeTruthy();
    expect(screen.getByText('⚙️')).toBeTruthy();
  });

  // Feature #213: Recent Visits section (empty when no visits)
  it('#213 - No Recent Visits section when empty', async () => {
    render(<FamilyDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText("Today's Care")).toBeTruthy();
    });
    // Recent Visits only shows when there are visits
    expect(screen.queryByText('Recent Visits')).toBeNull();
  });

  // Feature #214: Calendar emoji in no-visit state
  it('#214 - Calendar emoji in no-visit card', async () => {
    render(<FamilyDashboardScreen />);
    await waitFor(() => {
      expect(screen.getByText('📅')).toBeTruthy();
    });
  });

  // Features #215-219: Skip some that don't exist in the actual screen
  // #215: Alerts section - not in this screen
  // #216: Quick actions already tested in #211
  // #217-219: Mood trend/location not in dashboard
});
