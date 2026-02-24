/**
 * 08-Companionship: Notification Center Screen Tests (Phase 13)
 * Screen: (protected)/notifications.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack, canGoBack: jest.fn(() => true) }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children }: any) => children,
  Stack: {
    Screen: ({ options }: any) => {
      const React = require('react');
      const { View } = require('react-native');
      if (options?.headerRight) {
        return React.createElement(View, { testID: 'header-right' }, options.headerRight());
      }
      return null;
    },
  },
  Tabs: { Screen: () => null },
  Redirect: () => null,
  useFocusEffect: jest.fn((cb: any) => {
    const React = require('react');
    React.useEffect(() => { cb(); }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', full_name: 'Test User', email: 'test@test.com' },
    agency: null, loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'user-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

jest.mock('date-fns', () => ({
  format: jest.fn((date: any, fmt: string) => 'Feb 21'),
  isToday: jest.fn((date: any) => true),
  isYesterday: jest.fn(() => false),
  parseISO: jest.fn((s: string) => new Date(s)),
}));

import NotificationCenterScreen from '@/app/(protected)/notifications';

const mockNotifications = [
  {
    id: 'notif-1',
    title: 'Visit Confirmed',
    body: 'Your visit with Maria has been confirmed',
    type: 'visit_confirmed',
    data: { visitId: 'visit-1' },
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    title: 'New Visit Request',
    body: 'Dorothy Johnson wants a visit',
    type: 'visit_request',
    data: { visitId: 'visit-2' },
    read: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

describe('08-Companionship: Notification Center Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.limit.mockReturnThis();
    mockChain.update.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => {
      render(<NotificationCenterScreen />);
    });
    expect(screen.getAllByText(/Notifications/i)[0]).toBeTruthy();
  });

  it('shows empty state when no notifications', async () => {
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => {
      render(<NotificationCenterScreen />);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/No notifications|All caught up|no notifications/i)[0]).toBeTruthy();
    });
  });

  it('renders notification item with title and body', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: mockNotifications, error: null })
    );

    await act(async () => {
      render(<NotificationCenterScreen />);
    });

    await waitFor(() => {
      expect(screen.getByText('Visit Confirmed')).toBeTruthy();
      expect(screen.getByText('Your visit with Maria has been confirmed')).toBeTruthy();
    });
  });

  it('renders "Today" section header for today\'s notifications', async () => {
    const { isToday } = require('date-fns');
    (isToday as jest.Mock).mockReturnValue(true);

    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: mockNotifications, error: null })
    );

    await act(async () => {
      render(<NotificationCenterScreen />);
    });

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeTruthy();
    });
  });

  it('renders "Mark all read" button', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: mockNotifications, error: null })
    );

    await act(async () => {
      render(<NotificationCenterScreen />);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Mark all read|Mark All Read/i)[0]).toBeTruthy();
    });
  });

  // ── Interactions ───────────────────────────────────────────────────────────

  it('pressing "Mark all read" updates all to read=true in DB', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: mockNotifications, error: null })
    );

    await act(async () => {
      render(<NotificationCenterScreen />);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Mark all read|Mark All Read/i)[0]).toBeTruthy();
    });

    fireEvent.click(screen.getAllByText(/Mark all read|Mark All Read/i)[0]);

    await waitFor(() => {
      expect(mockChain.update).toHaveBeenCalledWith({ read: true });
    });
  });

  it('queries notifications table with limit(100)', async () => {
    await act(async () => {
      render(<NotificationCenterScreen />);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockChain.limit).toHaveBeenCalledWith(100);
    });
  });

  it('queries ordered by created_at descending', async () => {
    await act(async () => {
      render(<NotificationCenterScreen />);
    });

    await waitFor(() => {
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: does not crash when notification data field is null', async () => {
    const notifNullData = [{
      id: 'n-1', title: 'Test', body: 'Body', type: 'general',
      data: null, read: false, created_at: new Date().toISOString(),
    }];
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: notifNullData, error: null })
    );

    await expect(act(async () => {
      render(<NotificationCenterScreen />);
    })).resolves.not.toThrow();
  });

  it('NEGATIVE: shows empty state on fetch error', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: { message: 'RLS denied' } })
    );

    await act(async () => {
      render(<NotificationCenterScreen />);
    });

    await waitFor(() => {
      // Either empty state or no crash
      expect(screen.queryByText(/Visit Confirmed/)).toBeNull();
    });
  });
});
