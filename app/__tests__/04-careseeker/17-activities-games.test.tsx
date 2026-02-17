/**
 * Batch 21: Activities + Memory Game Tests (Features #197-203)
 * Screens: careseeker/(tabs)/activities.tsx, careseeker/games/memory.tsx
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

// Mock haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium' },
  NotificationFeedbackType: { Success: 'Success' },
}));

// Supabase mock
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

import ActivitiesScreen from '@/app/(protected)/careseeker/(tabs)/activities';
import MemoryGameScreen from '@/app/(protected)/careseeker/games/memory';

describe('Batch 21: Activities', () => {
  beforeEach(() => jest.clearAllMocks());

  // Feature #197: Activities screen renders with title
  it('#197 - Activities title and subtitle render', () => {
    render(<ActivitiesScreen />);
    expect(screen.getByText('Activities')).toBeTruthy();
    expect(screen.getByText('Choose something fun!')).toBeTruthy();
  });

  // Feature #198: Memory game option renders (BrainIcon SVG replaced emoji)
  it('#198 - Memory Game activity card renders', () => {
    render(<ActivitiesScreen />);
    expect(screen.getByText('Memory Game')).toBeTruthy();
  });
});

describe('Batch 21: Memory Game', () => {
  beforeEach(() => jest.clearAllMocks());

  // Feature #199: Memory game board renders 12 cards
  it('#199 - Memory game renders 12 hidden cards', () => {
    render(<MemoryGameScreen />);
    // All cards start hidden showing "?" text
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks.length).toBe(12);
  });

  // Feature #200: Matches counter shown
  it('#200 - Matches counter shows 0/6', () => {
    render(<MemoryGameScreen />);
    expect(screen.getByText('Matches')).toBeTruthy();
    expect(screen.getByText('0/6')).toBeTruthy();
  });

  // Feature #201: Moves counter shown
  it('#201 - Moves counter shows 0', () => {
    render(<MemoryGameScreen />);
    expect(screen.getByText('Moves')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  // Feature #202: New Game button renders (SyncIcon SVG replaced emoji in button)
  it('#202 - New Game button renders', () => {
    render(<MemoryGameScreen />);
    expect(screen.getByText('New Game')).toBeTruthy();
  });

  // Feature #203: Activity grid shows all 4 options (trivia, music, photos)
  it('#203 - All 4 activity types render', () => {
    render(<ActivitiesScreen />);
    expect(screen.getByText('Memory Game')).toBeTruthy();
    expect(screen.getByText('Trivia')).toBeTruthy();
    expect(screen.getByText('Music')).toBeTruthy();
    expect(screen.getByText('Photos')).toBeTruthy();
  });
});
