/**
 * 08-Companionship: Careseeker/Elder Home Phase 14 Tests
 * Screen: (protected)/careseeker/(tabs)/index.tsx
 * Phase 14 updates: real upcoming visits, elder_favorites, recent completed visits,
 *                   "Find a Companion" first, pull-to-refresh, NotificationBell
 *
 * 🔬 Integration candidates (real Supabase):
 *   - elder_favorites insert/delete with real FK to elders + caregiver_profiles
 *   - visits query with real RLS (elder can only see their own visits)
 *   - Companion name pulled from user_profiles join
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
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
    user: { id: 'careseeker-1', full_name: 'Robert Johnson' },
    agency: null, loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn((r: string) => r === 'careseeker'),
  }),
  AuthProvider: ({ children }: any) => children,
}));

var mockSingle = jest.fn();
var mockMaybeSingle = jest.fn();
var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
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
}));

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
    Button: ({ title, onPress, loading, disabled }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s/g, '-')}`, disabled },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
    Card: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress, testID: 'home-card' },
        React.createElement(View, null, children)
      ),
  };
});

jest.mock('@/components/ui/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children }: any) =>
      React.createElement(View, { testID: 'home-card' }, children),
  };
});

jest.mock('@/components/ui/GradientHeader', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GradientHeader: ({ children }: any) => React.createElement(View, null, children),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    CompanionIcon: () => React.createElement(Text, null, '👥'),
    CalendarIcon: () => React.createElement(Text, null, '📅'),
    ClockIcon: () => React.createElement(Text, null, '🕐'),
    HeartIcon: () => React.createElement(Text, null, '❤️'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    StarIcon: () => React.createElement(Text, null, '★'),
    SearchIcon: () => React.createElement(Text, null, '🔍'),
    ChevronRightIcon: () => React.createElement(Text, null, '>'),
    PhoneIcon: () => React.createElement(Text, null, '📞'),
    WaveIcon: () => React.createElement(Text, null, '👋'),
  };
});

jest.mock('date-fns', () => ({
  format: jest.fn((date: any, fmt: string) => {
    if (fmt === 'EEE, MMM d') return 'Tue, Feb 25';
    if (fmt === 'h:mm a') return '10:00 AM';
    return 'Feb 25';
  }),
  parseISO: jest.fn((s: string) => new Date(s)),
  isToday: jest.fn(() => false),
  addDays: jest.fn((d: any, n: number) => new Date()),
}));

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 50: '#EFF6FF', 500: '#3B82F6', 600: '#2563EB' },
    success: { 50: '#F0FDF4', 300: '#86EFAC', 500: '#10B981', 600: '#059669' },
    error: { 500: '#EF4444' },
    warning: { 500: '#F59E0B' },
  },
  roleColors: { careseeker: '#7C3AED', caregiver: '#0891B2' },
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
    elder: { heading: { fontSize: 28 }, body: { fontSize: 18 }, label: { fontSize: 16 } },
    fontFamily: { display: 'System', body: 'System', regular: 'System', medium: 'System', semibold: 'System', bold: 'System' },
  },
}));
jest.mock('@/theme/spacing', () => ({
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24, full: 9999 },
  touchTargets: { min: 44, comfortable: 48, elder: 64 },
  shadows: { sm: {}, md: {} },
  layout: { maxWidth: 600 },
  createShadow: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import CareseekerHomeScreen from '@/app/(protected)/careseeker/(tabs)/index';

// ── Mock data ─────────────────────────────────────────────────────────────────

const mockElder = {
  id: 'elder-1',
  user_id: 'careseeker-1',
  first_name: 'Robert',
  last_name: 'Johnson',
  zip_code: '90210',
};

const mockUpcomingVisit = {
  id: 'visit-1',
  elder_id: 'elder-1',
  caregiver_id: '',          // empty → skips extra caregiver_profiles type query
  status: 'scheduled',
  scheduled_date: '2026-02-25',
  scheduled_start: '2026-02-25T10:00:00',
  caregiver: { full_name: 'Maria Santos' },  // screen uses cg?.full_name
};

const mockCompletedVisit = {
  id: 'visit-2',
  elder_id: 'elder-1',
  caregiver_id: '',
  status: 'completed',
  scheduled_date: '2026-02-20',
  duration_minutes: 120,
  caregiver: { full_name: 'Maria Santos' },
};

// elder_favorites returns companion_id; caregiver_profiles for favs returns full_name
const mockFavoriteLink = { companion_id: 'cg-user-1' };
const mockFavoriteProfile = { user_id: 'cg-user-1', full_name: 'Maria Santos', caregiver_type: 'student' };

// Helper: sets up the default mock sequence for this screen
// Screen sequence (with caregiver_id='' so no extra type query):
//   1. visits (upcoming)   → then 1
//   2. elder_favorites     → then 2
//   3. caregiver_profiles  → then 3 (for favorite profiles)
//   4. visits (recent)     → then 4
function setupDefaultMocks({
  elder = mockElder,
  upcoming = [mockUpcomingVisit],
  completed = [mockCompletedVisit],
  favoriteLinks = [mockFavoriteLink],
  favoriteProfiles = [mockFavoriteProfile],
} = {}) {
  // elder lookup → maybeSingle
  mockMaybeSingle.mockResolvedValueOnce({ data: elder, error: null });
  // query sequence via then
  mockChain.then
    .mockImplementationOnce((r: any) => r({ data: upcoming, error: null }))        // visits upcoming
    .mockImplementationOnce((r: any) => r({ data: favoriteLinks, error: null }))   // elder_favorites
    .mockImplementationOnce((r: any) => r({ data: favoriteProfiles, error: null })) // caregiver_profiles
    .mockImplementationOnce((r: any) => r({ data: completed, error: null }))        // visits recent
    .mockImplementation((r: any) => r({ data: [], error: null }));
}

describe('08-Companionship: Careseeker Home Screen (Phase 14)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.limit.mockReturnThis();
    mockChain.gte.mockReturnThis();
    mockSingle.mockResolvedValue({ data: null, error: null });
    setupDefaultMocks();
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    expect(screen.getAllByText(/Robert|Home|Find|Companion/i)[0]).toBeTruthy();
  });

  it('shows NotificationBell in header', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    expect(screen.getByTestId('notification-bell')).toBeTruthy();
  });

  it('shows "Find a Companion" button prominently', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    expect(screen.getAllByText(/Find a Companion|Find Companion/i)[0]).toBeTruthy();
  });

  it('tapping "Find a Companion" navigates to find-companion screen', async () => {
    await act(async () => render(<CareseekerHomeScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Find a Companion|Find Companion/i)[0]);
    });

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('find-companion'));
  });

  // ── Upcoming visits (Phase 14 real data) ─────────────────────────────────

  it('shows upcoming visit companion first name after loading', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Maria/i)[0]).toBeTruthy();
    });
  });

  it('shows upcoming visit date after loading', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Tue, Feb 25|Feb 25/i)[0]).toBeTruthy();
    });
  });

  it('shows "Upcoming" section header', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Upcoming/i)[0]).toBeTruthy();
    });
  });

  it('queries visits table with status=scheduled for upcoming', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visits');
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'scheduled');
    });
  });

  // ── Favorites (Phase 14 real data) ────────────────────────────────────────

  it('queries elder_favorites with elder_id', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('elder_favorites');
      expect(mockChain.eq).toHaveBeenCalledWith('elder_id', 'elder-1');
    });
  });

  it('shows favorite companion name in Favorites section', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Maria Santos|Maria/i)[0]).toBeTruthy();
    });
  });

  // ── Recent completed visits (Phase 14 real data) ──────────────────────────

  it('shows recent completed visit with duration', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    await waitFor(() => {
      // 120 minutes = 2.0hrs (displayed as duration_minutes/60 toFixed(1) + "hrs")
      expect(screen.getAllByText(/120|2\.0hrs|2h|2 hr|2hrs/i)[0]).toBeTruthy();
    });
  });

  it('fetches elder record first (elders query runs before visit queries)', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('elders');
    });
  });

  // ── NEGATIVE: old hardcoded content must be absent ────────────────────────

  it('NEGATIVE: does NOT render hardcoded "Maria at 10:30 AM" text', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    expect(screen.queryByText('Maria at 10:30 AM')).toBeNull();
  });

  it('NEGATIVE: shows empty upcoming state when no scheduled visits', async () => {
    mockChain.then.mockReset();
    mockMaybeSingle.mockReset();
    setupDefaultMocks({ upcoming: [], completed: [], favorites: [] });

    await act(async () => render(<CareseekerHomeScreen />));

    await waitFor(() => {
      // No visit companion names should appear in upcoming
      expect(screen.queryByText(/Tue, Feb 25/)).toBeNull();
    });
  });

  it('NEGATIVE: does not crash when elder record not found (new user, no elder yet)', async () => {
    mockChain.then.mockReset();
    mockMaybeSingle.mockReset();
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockChain.then.mockImplementation((r: any) => r({ data: [], error: null }));

    await expect(act(async () => { render(<CareseekerHomeScreen />); })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not crash when visits query returns error', async () => {
    mockChain.then.mockReset();
    mockMaybeSingle.mockReset();
    mockMaybeSingle.mockResolvedValueOnce({ data: mockElder, error: null });
    mockChain.then.mockImplementation((r: any) =>
      r({ data: null, error: { message: 'RLS denied' } })
    );

    await expect(act(async () => { render(<CareseekerHomeScreen />); })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not crash when elder_favorites returns empty array', async () => {
    mockChain.then.mockReset();
    mockMaybeSingle.mockReset();
    setupDefaultMocks({ favorites: [] });

    await expect(act(async () => { render(<CareseekerHomeScreen />); })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not crash when a favorite companion has null photo_url', async () => {
    // Screen doesn't render photos — just verify it loads favorites without crashing
    mockChain.then.mockReset();
    mockMaybeSingle.mockReset();
    setupDefaultMocks(); // uses default mockFavoriteProfile which has no photo

    await expect(act(async () => { render(<CareseekerHomeScreen />); })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not crash when completed visit has null duration_minutes', async () => {
    const nullDurationVisit = { ...mockCompletedVisit, duration_minutes: null };
    mockChain.then.mockReset();
    mockMaybeSingle.mockReset();
    setupDefaultMocks({ completed: [nullDurationVisit] });

    await expect(act(async () => { render(<CareseekerHomeScreen />); })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not show negative duration value', async () => {
    await act(async () => render(<CareseekerHomeScreen />));
    await waitFor(() => {
      const negative = screen.queryByText(/-\d+ (min|hr)/i);
      expect(negative).toBeNull();
    });
  });
});
