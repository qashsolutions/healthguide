/**
 * Batch 25: Family Settings Tests (Features #232-243)
 * Screens: family/settings/index.tsx, family/settings/notifications.tsx, family/settings/profile.tsx
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
    user: { id: 'family-1', full_name: 'Sarah Smith', phone: '+1234567890', agency_id: 'agency-1' },
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

import FamilySettingsScreen from '@/app/(protected)/family/settings/index';
import FamilyProfileScreen from '@/app/(protected)/family/settings/profile';
import FamilyNotificationsScreen from '@/app/(protected)/family/settings/notifications';

describe('Batch 25: Family Settings', () => {
  beforeEach(() => jest.clearAllMocks());

  // Feature #232: Settings page renders
  it('#232 - Settings page renders with title', () => {
    render(<FamilySettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  // Feature #233: Profile section renders
  it('#233 - Profile menu item renders', () => {
    render(<FamilySettingsScreen />);
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  // Feature #236: Notification Settings renders
  it('#236 - Notification Settings menu item renders', () => {
    render(<FamilySettingsScreen />);
    expect(screen.getByText('Notification Settings')).toBeTruthy();
  });

  // Feature #238: Help & Support renders
  it('#238 - Help & Support menu item renders', () => {
    render(<FamilySettingsScreen />);
    expect(screen.getByText('Help & Support')).toBeTruthy();
  });

  // Feature #241: Sign out button renders
  it('#241 - \"Log Out\" button renders', () => {
    render(<FamilySettingsScreen />);
    expect(screen.getByText('Log Out')).toBeTruthy();
  });

  // Feature #242: Version text renders
  it('#242 - Version text renders', () => {
    render(<FamilySettingsScreen />);
    expect(screen.getByText('HealthGuide Family v1.0.0')).toBeTruthy();
  });

  // Feature #243: Section titles render
  it('#243 - Section titles render (Preferences, Account)', () => {
    render(<FamilySettingsScreen />);
    expect(screen.getByText('Preferences')).toBeTruthy();
    expect(screen.getByText('Account')).toBeTruthy();
  });
});

describe('Batch 25: Family Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Profile screen fetches family_member data via .single()
    mockSingle.mockResolvedValue({
      data: {
        name: 'Sarah Smith',
        phone: '+1234567890',
        relationship: 'daughter',
      },
      error: null,
    });
  });

  // Feature #234: Profile name field renders
  it('#234 - Profile \"Full Name\" field renders', async () => {
    render(<FamilyProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Full Name')).toBeTruthy();
    });
  });

  // Feature #235: Profile phone field renders
  it('#235 - Profile \"Phone Number\" field renders', async () => {
    render(<FamilyProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Phone Number')).toBeTruthy();
    });
  });
});

describe('Batch 25: Family Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Notifications screen loads prefs from family_members
    mockSingle.mockResolvedValue({
      data: {
        notification_preferences: {
          check_in: true,
          check_out: true,
          daily_report: true,
          delivery_time: '19:00',
          include_observations: true,
        },
      },
      error: null,
    });
  });

  // Feature #237: Visit Alerts section renders
  it('#237 - Visit Alerts section renders', async () => {
    render(<FamilyNotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Visit Alerts')).toBeTruthy();
    });
  });

  // Feature #239: Daily Reports toggle renders
  it('#239 - Daily Reports section renders', async () => {
    render(<FamilyNotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Daily Reports')).toBeTruthy();
    });
  });

  // Feature #240: Save button renders
  it('#240 - Save Preferences button renders', async () => {
    render(<FamilyNotificationsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Save Preferences')).toBeTruthy();
    });
  });
});
