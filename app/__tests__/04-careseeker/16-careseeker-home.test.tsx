/**
 * Batch 20: Careseeker/Elder Home + Daily Check-In Tests (Features #186-196)
 * Screens: careseeker/(tabs)/index.tsx, daily-check-in.tsx
 * Phase 14: Real data (no hardcoded "Maria at 10:30 AM"), NotificationBell added
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
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Redirect: () => null,
  useFocusEffect: jest.fn((callback: any) => {
    const ReactInner = require('react');
    ReactInner.useEffect(() => { callback(); }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'elder-1', full_name: 'Dorothy Smith', agency_id: null },
    agency: null,
    loading: false,
    initialized: true,
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn((r: string) => r === 'careseeker'),
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Phase 14: GradientHeader mock (uses expo-linear-gradient)
jest.mock('@/components/ui/GradientHeader', () => ({
  GradientHeader: ({ children }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, {}, children);
  },
}));

// Phase 13/14: NotificationBell mock
jest.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'notification-bell' }, '🔔');
  },
}));

// Phase 13: notifications lib mock (push token registration)
jest.mock('@/lib/notifications', () => ({
  registerForPushNotifications: jest.fn().mockResolvedValue('test-token'),
}));

// Mock date-fns (used in fetchData and formatTime)
jest.mock('date-fns', () => ({
  format: jest.fn((date: any, fmt: string) => {
    if (fmt === 'yyyy-MM-dd') return '2026-02-21';
    if (fmt === 'EEE, MMM d') return 'Sat, Feb 21';
    if (fmt === 'h:mm a') return '10:30 AM';
    if (fmt === 'MMM d') return 'Feb 21';
    return 'formatted';
  }),
}));

// Mock haptics (used in daily check-in)
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium' },
  NotificationFeedbackType: { Success: 'Success' },
}));

// Supabase mock
const mockMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
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
  maybeSingle: mockMaybeSingle,
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'elder-1' } } }),
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

import ElderHomeScreen from '@/app/(protected)/careseeker/(tabs)/index';
import DailyCheckInScreen from '@/app/(protected)/careseeker/daily-check-in';

describe('Batch 20: Elder Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  // Feature #186: Home screen renders with greeting
  it('#186 - Home screen renders with time-based greeting', async () => {
    render(<ElderHomeScreen />);
    await waitFor(() => {
      const greetings = screen.queryByText(/Good (Morning|Afternoon|Evening)/);
      expect(greetings).toBeTruthy();
    });
  });

  // Feature #187: User name displayed
  it('#187 - User first name is displayed', async () => {
    render(<ElderHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Dorothy!')).toBeTruthy();
    });
  });

  // Feature #188: Call Family button renders
  it('#188 - "Call Family" big button renders', async () => {
    render(<ElderHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Call Family')).toBeTruthy();
    });
  });

  // Feature #189: Activities button renders
  it('#189 - "Activities" big button renders', async () => {
    render(<ElderHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Activities')).toBeTruthy();
    });
  });

  // Feature #190: How are you? check-in button renders
  it('#190 - "How are you?" check-in button renders', async () => {
    render(<ElderHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('How are you?')).toBeTruthy();
    });
  });

  // Phase 14: Find a Companion button renders (new primary action)
  it('Phase 14: "Find a Companion" button renders', async () => {
    render(<ElderHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('Find a Companion')).toBeTruthy();
    });
  });

  // Phase 14: NotificationBell renders in header
  it('Phase 14: NotificationBell renders in header', async () => {
    render(<ElderHomeScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('notification-bell')).toBeTruthy();
    });
  });

  // Feature #196 (Phase 14 updated): Empty state shows "No upcoming visits"
  // Previously hardcoded "Maria at 10:30 AM"; Phase 14 uses real data from DB
  it('#196 - "No upcoming visits" shows when elder has no scheduled visits', async () => {
    render(<ElderHomeScreen />);
    await waitFor(() => {
      expect(screen.getByText('No upcoming visits')).toBeTruthy();
    });
    expect(screen.getByText('Find a companion below')).toBeTruthy();
  });
});

describe('Batch 20: Daily Check-In', () => {
  beforeEach(() => jest.clearAllMocks());

  // Feature #191: Check-in greeting and question render
  it('#191 - Check-in greeting and question render', () => {
    render(<DailyCheckInScreen />);
    expect(screen.getByText('How are you feeling today?')).toBeTruthy();
  });

  // Feature #192: Mood selector shows all 5 options
  it('#192 - Mood selector shows all 5 mood options', () => {
    render(<DailyCheckInScreen />);
    expect(screen.getByText('Not Good')).toBeTruthy();
    expect(screen.getByText('A Little Low')).toBeTruthy();
    expect(screen.getByText('Okay')).toBeTruthy();
    expect(screen.getByText('Good')).toBeTruthy();
    expect(screen.getByText('Great!')).toBeTruthy();
  });

  // Feature #193: Mood options render with labels (SVG icons replaced emojis)
  it('#193 - Mood options render with labels for each option', () => {
    render(<DailyCheckInScreen />);
    // Emojis were replaced with SVG icon components; verify all 5 mood labels render
    expect(screen.getByText('Not Good')).toBeTruthy();
    expect(screen.getByText('A Little Low')).toBeTruthy();
    expect(screen.getByText('Okay')).toBeTruthy();
    expect(screen.getByText('Good')).toBeTruthy();
    expect(screen.getByText('Great!')).toBeTruthy();
  });

  // Feature #194: Submit button renders
  it('#194 - "Done ✓" submit button renders', () => {
    render(<DailyCheckInScreen />);
    expect(screen.getByText('Done ✓')).toBeTruthy();
  });

  // Feature #195: Morning greeting text
  it('#195 - Morning greeting text renders', () => {
    render(<DailyCheckInScreen />);
    expect(screen.getAllByText(/Good Morning/)[0]).toBeTruthy();
  });
});
