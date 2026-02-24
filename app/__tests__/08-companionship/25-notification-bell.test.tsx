/**
 * 08-Companionship: NotificationBell Component Tests (Phase 13)
 * Component: @/components/NotificationBell
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Redirect: () => null,
  useFocusEffect: jest.fn((cb: any) => {
    const React = require('react');
    React.useEffect(() => { cb(); }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', full_name: 'Test User' },
    agency: null, loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
}));

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    BellIcon: ({ size }: any) =>
      React.createElement(Text, { testID: 'bell-icon' }, '🔔'),
    StarIcon: () => null,
    HeartIcon: () => null,
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    error: { 500: '#EF4444' },
    text: { primary: '#111827', secondary: '#6B7280' },
    white: '#FFFFFF',
    neutral: { 200: '#E5E7EB' },
  },
}));
jest.mock('@/theme/typography', () => ({
  typography: {
    styles: {
      h1: { fontSize: 36 }, h2: { fontSize: 30 }, h3: { fontSize: 24 }, h4: { fontSize: 20 },
      body: { fontSize: 16 }, bodyLarge: { fontSize: 18 }, bodySmall: { fontSize: 14 },
      label: { fontSize: 14 }, caption: { fontSize: 12 },
      button: { fontSize: 16 }, buttonLarge: { fontSize: 18 },
      stat: { fontSize: 28 }, statSmall: { fontSize: 20 },
    },
    caregiver: { heading: { fontSize: 28 }, body: { fontSize: 20 }, label: { fontSize: 16 } },
    fontFamily: { display: 'System', body: 'System', regular: 'System', medium: 'System', semibold: 'System', bold: 'System' },
  },
}));
jest.mock('@/theme/spacing', () => ({
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16 },
  borderRadius: { sm: 4, md: 8, lg: 12 },
  createShadow: () => ({}),
}));

// Supabase mock with configurable count
let mockUnreadCount = 0;
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      // Returns count via the resolved value
      then: jest.fn((resolve: any) => resolve({ count: mockUnreadCount, error: null })),
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import { NotificationBell } from '@/components/NotificationBell';

describe('08-Companionship: NotificationBell Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnreadCount = 0;
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders bell icon', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });
    expect(screen.getByTestId('bell-icon')).toBeTruthy();
  });

  it('renders without crashing when unread count is 0', async () => {
    mockUnreadCount = 0;
    await act(async () => {
      render(<NotificationBell />);
    });
    expect(screen.queryByText('0')).toBeNull(); // No badge for 0
  });

  it('shows badge with count "5" when there are 5 unread', async () => {
    mockUnreadCount = 5;
    const { supabase } = require('@/lib/supabase');
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve({ count: 5, error: null })),
    });

    await act(async () => {
      render(<NotificationBell />);
    });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeTruthy();
    });
  });

  it('shows badge "99" for exactly 99 unread', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve({ count: 99, error: null })),
    });

    await act(async () => {
      render(<NotificationBell />);
    });

    await waitFor(() => {
      expect(screen.getByText('99')).toBeTruthy();
    });
  });

  it('shows "99+" when unread count exceeds 99', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve({ count: 150, error: null })),
    });

    await act(async () => {
      render(<NotificationBell />);
    });

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeTruthy();
    });
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  it('clicking bell navigates to /(protected)/notifications', async () => {
    await act(async () => {
      render(<NotificationBell />);
    });

    fireEvent.click(screen.getByTestId('bell-icon').parentElement || screen.getByTestId('bell-icon'));
    // Or find the pressable wrapper
    const bell = screen.getByTestId('bell-icon');
    fireEvent.click(bell);
    // The parent Pressable should trigger navigation
    expect(mockPush).toHaveBeenCalledWith('/(protected)/notifications');
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  it('queries notifications table for unread count', async () => {
    const { supabase } = require('@/lib/supabase');
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve({ count: 3, error: null })),
    });
    supabase.from = mockFrom;

    await act(async () => {
      render(<NotificationBell />);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: does NOT show badge when count is 0', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve({ count: 0, error: null })),
    });

    await act(async () => {
      render(<NotificationBell />);
    });

    await waitFor(() => {
      expect(screen.queryByText('0')).toBeNull();
    });
  });

  it('NEGATIVE: does NOT crash when notifications returns error', async () => {
    const { supabase } = require('@/lib/supabase');
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve({ count: null, error: { message: 'RLS error' } })),
    });

    await expect(
      act(async () => {
        render(<NotificationBell />);
      })
    ).resolves.not.toThrow();
  });
});
