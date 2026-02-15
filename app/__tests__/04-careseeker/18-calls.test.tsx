/**
 * Batch 22: Calls Screen Tests (Features #204-207)
 * Screen: careseeker/(tabs)/calls.tsx
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
jest.mock('@/utils/haptics', () => ({
  hapticFeedback: jest.fn(),
  vibrate: jest.fn(),
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

import CallsScreen from '@/app/(protected)/careseeker/(tabs)/calls';

describe('Batch 22: Calls Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Contacts fetch uses thenable chain - return empty
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    // Emergency contact uses .single() - return null
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  // Feature #204: Calls screen renders with title
  it('#204 - Calls screen renders with \"Family\" title', async () => {
    render(<CallsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Family')).toBeTruthy();
    });
    expect(screen.getByText('Tap to call')).toBeTruthy();
  });

  // Feature #205: Empty state when no contacts
  it('#205 - Empty state renders when no contacts', async () => {
    render(<CallsScreen />);
    await waitFor(() => {
      expect(screen.getByText('No contacts yet')).toBeTruthy();
    });
    expect(screen.getByText('Ask your agency to add video call contacts')).toBeTruthy();
  });

  // Feature #206: Emergency section renders (skip-native: actual calling)
  it('#206 - Emergency \"Need Help?\" section renders', async () => {
    render(<CallsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Need Help?')).toBeTruthy();
    });
  });

  // Feature #207: No emergency contact set message
  it('#207 - \"No emergency contact set\" message renders', async () => {
    render(<CallsScreen />);
    await waitFor(() => {
      expect(screen.getByText('No emergency contact set')).toBeTruthy();
    });
  });
});
