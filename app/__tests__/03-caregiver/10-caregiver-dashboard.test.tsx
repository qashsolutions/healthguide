/**
 * 03-Caregiver: Caregiver Dashboard Tests
 * Screen: caregiver/(tabs)/index.tsx
 * Phase 14: Visit requests banner, recurring badges, stats, linked agencies
 * Note: Detailed Phase 14 tests are in 08-companionship/08-caregiver-home-phases.test.tsx
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
    React.useEffect(() => { const cleanup = cb(); return cleanup; }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'caregiver-1', full_name: 'Maria Santos' },
    agency: null, loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn((r: string) => r === 'caregiver'),
  }),
  AuthProvider: ({ children }: any) => children,
}));

var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
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

jest.mock('@/lib/notifications', () => ({
  registerForPushNotifications: jest.fn(),
}));

jest.mock('@/components/ui/GradientHeader', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GradientHeader: ({ children }: any) => React.createElement(View, null, children),
  };
});

jest.mock('@/components/sync', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    OfflineIndicator: () => React.createElement(View, null),
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
  const { Pressable, Text, View } = require('react-native');
  return {
    Card: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress, testID: 'caregiver-card' }, React.createElement(View, null, children)),
    Badge: ({ label }: any) => React.createElement(Text, null, label),
    Button: ({ title, onPress }: any) =>
      React.createElement(Pressable, { onPress }, React.createElement(Text, null, title)),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ClockIcon: () => React.createElement(Text, null, '🕐'),
    LocationIcon: () => React.createElement(Text, null, '📍'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
    AlertIcon: () => React.createElement(Text, null, '⚠️'),
    SparkleIcon: () => React.createElement(Text, null, '✨'),
  };
});

jest.mock('@/components/icons/TaskIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MealIcon: () => React.createElement(Text, null, '🍽️'),
    CompanionshipIcon: () => React.createElement(Text, null, '💬'),
    CleaningIcon: () => React.createElement(Text, null, '🧹'),
    MedicationIcon: () => React.createElement(Text, null, '💊'),
  };
});

jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Feb 21, 2026'),
  isToday: jest.fn(() => true),
  isYesterday: jest.fn(() => false),
  parseISO: jest.fn((s: string) => new Date(s)),
  addDays: jest.fn((date: any) => date),
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
  roleColors: { caregiver: '#0891B2' },
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
  touchTargets: { min: 44, comfortable: 48 },
  createShadow: () => ({}),
}));

import CaregiverTodayScreen from '@/app/(protected)/caregiver/(tabs)/index';

describe('03-Caregiver: Caregiver Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.limit.mockReturnThis();
    mockChain.gte.mockReturnThis();
    mockChain.lte.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('renders without crashing', async () => {
    await act(async () => render(<CaregiverTodayScreen />));
    expect(screen.getAllByText(/Maria|Today|Hello/i)[0]).toBeTruthy();
  });

  it('shows NotificationBell', async () => {
    await act(async () => render(<CaregiverTodayScreen />));
    expect(screen.getByTestId('notification-bell')).toBeTruthy();
  });

  it('shows empty state when no visits today', async () => {
    await act(async () => render(<CaregiverTodayScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/All done|No visit|Free day|no assignment|no visits/i)[0]).toBeTruthy();
    });
  });

  it('queries visits table', async () => {
    await act(async () => render(<CaregiverTodayScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visits');
    });
  });

  it('shows pending requests banner when there are pending requests', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'visit_requests') {
        return { ...mockChain, then: jest.fn((resolve: any) => resolve({ count: 1, data: null, error: null })) };
      }
      return mockChain;
    });

    await act(async () => render(<CaregiverTodayScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/new visit request|visit request/i)[0]).toBeTruthy();
    });
  });

  it('NEGATIVE: does not crash when visits query errors', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: { message: 'RLS denied' } })
    );
    await expect(act(async () => {
      render(<CaregiverTodayScreen />);
    })).resolves.not.toThrow();
  });
});
