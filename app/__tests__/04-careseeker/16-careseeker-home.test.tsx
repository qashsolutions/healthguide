/**
 * Batch 20: Careseeker/Elder Home + Daily Check-In Tests (Features #186-196)
 * Screens: careseeker/(tabs)/index.tsx, daily-check-in.tsx
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
    user: { id: 'elder-1', full_name: 'Dorothy Smith', agency_id: 'agency-1' },
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
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'elder-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock haptics (used in daily check-in)
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium' },
  NotificationFeedbackType: { Success: 'Success' },
}));

// Supabase mock
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
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
  beforeEach(() => jest.clearAllMocks());

  // Feature #186: Home screen renders with greeting
  it('#186 - Home screen renders with time-based greeting', () => {
    render(<ElderHomeScreen />);
    // One of Good Morning / Good Afternoon / Good Evening will appear
    const greetings = screen.queryByText(/Good (Morning|Afternoon|Evening)/);
    expect(greetings).toBeTruthy();
  });

  // Feature #187: User name displayed
  it('#187 - User first name is displayed', () => {
    render(<ElderHomeScreen />);
    expect(screen.getByText('Dorothy!')).toBeTruthy();
  });

  // Feature #188: Call Family button renders
  it('#188 - \"Call Family\" big button renders', () => {
    render(<ElderHomeScreen />);
    expect(screen.getByText('Call Family')).toBeTruthy();
  });

  // Feature #189: Activities button renders
  it('#189 - \"Activities\" big button renders', () => {
    render(<ElderHomeScreen />);
    expect(screen.getByText('Activities')).toBeTruthy();
  });

  // Feature #190: How are you? check-in button renders
  it('#190 - \"How are you?\" check-in button renders', () => {
    render(<ElderHomeScreen />);
    expect(screen.getByText('How are you?')).toBeTruthy();
  });

  // Feature #196: Next Visit section renders
  it('#196 - Next Visit section renders with caregiver info', () => {
    render(<ElderHomeScreen />);
    expect(screen.getByText('Next Visit')).toBeTruthy();
    expect(screen.getByText('Maria at 10:30 AM')).toBeTruthy();
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

  // Feature #193: Mood emojis render
  it('#193 - Mood emojis render for each option', () => {
    render(<DailyCheckInScreen />);
    expect(screen.getByText('😢')).toBeTruthy();
    expect(screen.getByText('🥰')).toBeTruthy();
  });

  // Feature #194: Submit button renders
  it('#194 - \"Done ✓\" submit button renders', () => {
    render(<DailyCheckInScreen />);
    expect(screen.getByText('Done ✓')).toBeTruthy();
  });

  // Feature #195: Morning greeting text
  it('#195 - Morning greeting text renders', () => {
    render(<DailyCheckInScreen />);
    expect(screen.getByText(/Good Morning/)).toBeTruthy();
  });
});
