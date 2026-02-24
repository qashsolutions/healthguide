/**
 * 02-Agency: Agency Dashboard Tests
 * Screen: (protected)/agency/(tabs)/index.tsx
 * Phase 14: Stats, pending applications, today's visits, NotificationBell
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

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
    user: { id: 'owner-1', full_name: 'Jane Smith', email: 'jane@agency.com', agency_id: 'agency-1' },
    agency: { id: 'agency-1', name: 'Sunny Day Home Care' },
    loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn(() => true),
  }),
  AuthProvider: ({ children }: any) => children,
}));

var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

jest.mock('@/components/ui/GradientHeader', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GradientHeader: ({ children }: any) => React.createElement(View, { testID: 'gradient-header' }, children),
  };
});

jest.mock('@/components/NotificationBell', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    NotificationBell: () => React.createElement(Text, { testID: 'notification-bell' }, '🔔'),
  };
});

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { View, Pressable, Text } = require('react-native');
  return {
    Card: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress, testID: 'dashboard-card' },
        React.createElement(View, null, children)
      ),
    Button: ({ title, onPress }: any) =>
      React.createElement(Pressable, { onPress },
        React.createElement(Text, null, title)
      ),
    Badge: ({ label }: any) => React.createElement(Text, null, label),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    UsersIcon: () => React.createElement(Text, null, '👥'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    CalendarIcon: () => React.createElement(Text, null, '📅'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
    ClockIcon: () => React.createElement(Text, null, '🕐'),
  };
});

jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Feb 21, 2026'),
  startOfDay: jest.fn((d: any) => d),
  endOfDay: jest.fn((d: any) => d),
  isToday: jest.fn(() => true),
}));

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF', 100: '#DBEAFE' },
    success: { 50: '#F0FDF4', 500: '#10B981', 600: '#059669' },
    error: { 500: '#EF4444' },
    warning: { 50: '#FFFBEB', 500: '#F59E0B' },
  },
  roleColors: { agency_owner: '#0F766E' },
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
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24 },
  shadows: { sm: {}, md: {} },
  layout: { maxWidth: 600 },
  createShadow: () => ({}),
}));

import AgencyDashboardScreen from '@/app/(protected)/agency/(tabs)/index';

describe('02-Agency: Agency Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.gte.mockReturnThis();
    mockChain.lte.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.limit.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  it('renders without crashing', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    expect(screen.getAllByText(/Jane|Sunny Day|Dashboard|Good/i).length).toBeGreaterThan(0);
  });

  it('shows NotificationBell', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    expect(screen.getByTestId('notification-bell')).toBeTruthy();
  });

  it('shows agency name or welcome text', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    expect(screen.getAllByText(/Sunny Day|Jane|Welcome/i).length).toBeGreaterThan(0);
  });

  it('queries caregiver_agency_links table', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('caregiver_agency_links');
    });
  });

  it('queries elders table for elder stats', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('elders');
    });
  });

  it('queries visits table for today stats', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visits');
    });
  });

  it('queries agency_invites for pending applications', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('agency_invites');
    });
  });

  it('NEGATIVE: does not crash when all queries return empty', async () => {
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
    await expect(act(async () => {
      render(<AgencyDashboardScreen />);
    })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not crash when queries error', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: { message: 'RLS denied' } })
    );
    await expect(act(async () => {
      render(<AgencyDashboardScreen />);
    })).resolves.not.toThrow();
  });
});
