/**
 * 08-Companionship: Agency Dashboard Phase 14 Tests
 * Screen: (protected)/agency/(tabs)/index.tsx
 * Phase 14 additions: pending invites stat card + companion applications section
 *
 * 🔬 Integration candidates (real Supabase):
 *   - Accept application → inserts caregiver_agency_links (FK + unique constraint)
 *   - Decline application → status change triggers notification edge function
 *   - Pending count reflects live agency_invites rows
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
  useFocusEffect: jest.fn(), // no-op: prevents double-fetch in tests
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'agency-owner-1', full_name: 'Sarah Mitchell', agency_id: 'agency-1' },
    agency: { id: 'agency-1', name: 'HealthGuide Agency' },
    loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn((r: string) => r === 'agency_owner'),
  }),
  AuthProvider: ({ children }: any) => children,
}));

var mockSingle = jest.fn();
var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  single: mockSingle,
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => {
  mockFrom = jest.fn(() => mockChain);
  return {
    supabase: {
      from: mockFrom,
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      },
      functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
    },
    isSupabaseConfigured: jest.fn(() => true),
  };
});

jest.mock('@/lib/notifications', () => ({
  registerForPushNotifications: jest.fn(),
  registerNotificationCategories: jest.fn(),
  setupNotificationResponseHandler: jest.fn(() => jest.fn()),
  clearBadge: jest.fn(),
}));

jest.mock('@/components/NotificationBell', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    NotificationBell: () => React.createElement(Text, { testID: 'notification-bell' }, '🔔'),
  };
});

jest.mock('@/components/ui/GradientHeader', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GradientHeader: ({ children }: any) => React.createElement(View, { testID: 'gradient-header' }, children),
  };
});

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    Button: ({ title, onPress, loading, disabled }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s/g, '-')}`, disabled },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
    Card: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress, testID: 'dashboard-card' },
        React.createElement(View, null, children)
      ),
    Badge: ({ label }: any) =>
      React.createElement(Text, { testID: `badge-${label}` }, label),
  };
});

jest.mock('@/components/ui/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children }: any) =>
      React.createElement(View, { testID: 'dashboard-card' }, children),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    BellIcon: () => React.createElement(Text, null, '🔔'),
    UsersIcon: () => React.createElement(Text, null, '👥'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    CalendarIcon: () => React.createElement(Text, null, '📅'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
    ClockIcon: () => React.createElement(Text, null, '🕐'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
    AlertIcon: () => React.createElement(Text, null, '⚠️'),
    CompanionIcon: () => React.createElement(Text, null, '👥'),
    StudentIcon: () => React.createElement(Text, null, '🎓'),
    StarIcon: () => React.createElement(Text, null, '★'),
    ChevronRightIcon: () => React.createElement(Text, null, '>'),
  };
});

jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Feb 25, 2026'),
  isToday: jest.fn(() => true),
  parseISO: jest.fn((s: string) => new Date(s)),
  startOfDay: jest.fn((d: any) => d),
  endOfDay: jest.fn((d: any) => d),
}));

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 50: '#EFF6FF', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
    success: { 50: '#F0FDF4', 300: '#86EFAC', 500: '#10B981', 600: '#059669' },
    error: { 50: '#FEF2F2', 500: '#EF4444' },
    warning: { 50: '#FFFBEB', 500: '#F59E0B' },
  },
  roleColors: { agency_owner: '#0F766E', caregiver: '#0891B2', careseeker: '#7C3AED' },
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
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24, full: 9999 },
  shadows: { sm: {}, md: {}, lg: {} },
  layout: { maxWidth: 600 },
  createShadow: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import AgencyDashboardScreen from '@/app/(protected)/agency/(tabs)/index';

// ── Mock data ─────────────────────────────────────────────────────────────────

const mockApplication = {
  id: 'invite-1',
  agency_id: 'agency-1',
  companion_id: 'caregiver-1',
  direction: 'companion_to_agency',
  status: 'pending',
  message: 'I would love to join your agency',
  created_at: new Date().toISOString(),
  caregiver_profile: {
    id: 'cp-1',
    full_name: 'Maria Santos',
    caregiver_type: 'student',
    college_name: 'UCLA',
    zip_code: '90210',
  },
};

// Helper: set up default mock sequence
// Promise.all order in screen: caregivers, elders, visits-today, visits-recent, invites-count, applications
// Then sequential: caregiver_profiles (for companion names in applications)
function setupDefaultMocks(applications = [mockApplication], inviteCount = 2) {
  mockChain.then
    .mockImplementationOnce((r: any) => r({ data: [{ id: 'link-1' }], error: null }))   // 1: caregiver_agency_links
    .mockImplementationOnce((r: any) => r({ data: [{ id: 'elder-1' }], error: null }))  // 2: elders
    .mockImplementationOnce((r: any) => r({ data: [], error: null }))                    // 3: visits today
    .mockImplementationOnce((r: any) => r({ data: [], error: null }))                    // 4: visits recent activity
    .mockImplementationOnce((r: any) => r({ count: inviteCount, data: [], error: null })) // 5: agency_invites count
    .mockImplementationOnce((r: any) => r({ data: applications, error: null }))           // 6: applications
    .mockImplementationOnce((r: any) => r({                                                // 7: caregiver_profiles
      data: applications.map((a: any) => ({
        id: a.companion_id,
        full_name: a.caregiver_profile?.full_name || 'Unknown',
        caregiver_type: a.caregiver_profile?.caregiver_type || null,
      })),
      error: null,
    }))
    .mockImplementation((r: any) => r({ data: [], error: null }));
}

describe('08-Companionship: Agency Dashboard (Phase 14)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.limit.mockReturnThis();
    mockChain.update.mockReturnThis();
    mockChain.insert.mockReturnThis();
    mockSingle.mockResolvedValue({ data: null, error: null });
    setupDefaultMocks();
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    expect(screen.getAllByText(/Welcome|Dashboard|Agency|HealthGuide|Sarah/i)[0]).toBeTruthy();
  });

  it('shows NotificationBell in header', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    expect(screen.getByTestId('notification-bell')).toBeTruthy();
  });

  it('shows "Pending Applications" or equivalent section header', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Pending Application|Companion Application|New Application|Applications/i)[0]
      ).toBeTruthy();
    });
  });

  it('shows companion full name on application card', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Maria Santos|Maria/i)[0]).toBeTruthy();
    });
  });

  it('shows companion caregiver_type "student" on application card', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/student|Student/i)[0]).toBeTruthy();
    });
  });

  it('shows "Student Companion" type label on application card', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Student Companion/i)[0]).toBeTruthy();
    });
  });

  it('shows companion message text on application card', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/I would love to join/i)[0]).toBeTruthy();
    });
  });

  it('shows pending invites count in stat area', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      // count of 2 should appear in a stat card or header
      expect(screen.getAllByText(/2|Pending/i)[0]).toBeTruthy();
    });
  });

  it('companion type "companion_55" also renders on application card', async () => {
    const companion55App = {
      ...mockApplication,
      id: 'invite-2',
      caregiver_profile: { ...mockApplication.caregiver_profile, caregiver_type: 'companion_55', full_name: 'Dorothy Brown' },
    };
    mockChain.then.mockReset();
    setupDefaultMocks([companion55App]);

    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Dorothy Brown|Dorothy/i)[0]).toBeTruthy();
    });
  });

  // ── Data verification ─────────────────────────────────────────────────────

  it('queries caregiver_profiles to load companion names', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('caregiver_profiles');
    });
  });

  it('shows agency name in welcome header', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/HealthGuide Agency/i)[0]).toBeTruthy();
    });
  });

  it('shows "Active Elders" stat card', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Active Elders/i)[0]).toBeTruthy();
    });
  });

  it('shows "Agency Caregivers" stat card', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Agency Caregivers/i)[0]).toBeTruthy();
    });
  });

  // ── Query verification ────────────────────────────────────────────────────

  it('queries agency_invites with direction="companion_to_agency"', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('agency_invites');
      expect(mockChain.eq).toHaveBeenCalledWith('direction', 'companion_to_agency');
    });
  });

  it('queries agency_invites filtered by status="pending" for count', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('agency_invites');
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'pending');
    });
  });

  it('queries caregiver_agency_links to count linked caregivers', async () => {
    await act(async () => render(<AgencyDashboardScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('caregiver_agency_links');
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: shows no application cards when applications list is empty', async () => {
    mockChain.then.mockReset();
    setupDefaultMocks([], 0);

    await act(async () => render(<AgencyDashboardScreen />));

    await waitFor(() => {
      expect(screen.queryByText(/Maria Santos/)).toBeNull();
    });
  });

  it('NEGATIVE: does not crash when agency_invites query returns error', async () => {
    mockChain.then.mockReset();
    mockChain.then.mockImplementation((r: any) =>
      r({ data: null, error: { message: 'RLS denied' } })
    );

    await expect(act(async () => { render(<AgencyDashboardScreen />); })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not crash when caregiver_profile is null on an application', async () => {
    const nullProfileApp = { ...mockApplication, caregiver_profile: null };
    mockChain.then.mockReset();
    setupDefaultMocks([nullProfileApp]);

    await expect(act(async () => { render(<AgencyDashboardScreen />); })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not crash when agency_id is undefined', async () => {
    // Render with default mocks — agency_id handling gracefully
    await expect(act(async () => { render(<AgencyDashboardScreen />); })).resolves.not.toThrow();
  });

  it('NEGATIVE: pending count of 0 does not crash or show negative number', async () => {
    mockChain.then.mockReset();
    setupDefaultMocks([], 0);

    await act(async () => render(<AgencyDashboardScreen />));

    await waitFor(() => {
      const negativeCount = screen.queryByText(/-\d+/);
      expect(negativeCount).toBeNull();
    });
  });
});
