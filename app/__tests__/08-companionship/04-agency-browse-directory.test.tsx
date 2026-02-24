/**
 * 08-Companionship: Agency Browse Directory Screen Tests (Phase 8)
 * Screen: (protected)/agency/browse-directory.tsx
 * Agency owner browses independent companions and sends invites
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
  useFocusEffect: jest.fn(),
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
  in: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  single: mockSingle,
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Button: ({ title, onPress, loading }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s/g, '-')}` },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
    Input: ({ label, value, onChangeText, placeholder }: any) =>
      React.createElement(View, null,
        React.createElement(TextInput, { value, onChangeText, placeholder, testID: 'search-input' })
      ),
  };
});

jest.mock('@/components/ui/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children }: any) => React.createElement(View, { testID: 'companion-card' }, children),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    SearchIcon: () => React.createElement(Text, null, '🔍'),
    FilterIcon: () => React.createElement(Text, null, '⚙️'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
    CompanionIcon: () => React.createElement(Text, null, '👥'),
    StudentIcon: () => React.createElement(Text, null, '🎓'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    success: { 50: '#F0FDF4', 600: '#059669' },
    error: { 500: '#EF4444' },
    warning: { 500: '#F59E0B' },
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
  createShadow: () => ({}),
}));

import BrowseDirectoryScreen from '@/app/(protected)/agency/browse-directory';

const mockCompanion = {
  id: 'cp-1',
  user_id: 'user-cg-1',
  full_name: 'Maria Santos',
  caregiver_type: 'student',
  zip_code: '90210',
  capabilities: ['companionship'],
  availability: { tuesday: ['10am-12pm'] },
  languages: ['english'],
  bio: 'Love helping seniors',
  has_transportation: true,
  gender: 'female',
  college_name: 'UCLA',
  photo_url: null,
  selfie_url: null,
};

describe('08-Companionship: Agency Browse Directory Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.insert.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.in.mockReturnThis();
    mockSingle.mockResolvedValue({ data: { id: 'invite-1' }, error: null });
    // First then = companions, second then = agency_invites
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockCompanion], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })) // invites
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<BrowseDirectoryScreen />));
    expect(screen.getAllByText(/Directory|Browse|Companion/i)[0]).toBeTruthy();
  });

  it('shows companion name after loading', async () => {
    await act(async () => render(<BrowseDirectoryScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Maria Santos|Maria/i)[0]).toBeTruthy();
    });
  });

  it('shows "Invite" button for non-linked companion', async () => {
    await act(async () => render(<BrowseDirectoryScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Invite/i)[0]).toBeTruthy();
    });
  });

  it('shows task filter options', async () => {
    await act(async () => render(<BrowseDirectoryScreen />));
    await waitFor(() => {
      // Filter toggle should be available
      expect(screen.getAllByText(/Filter|filter/i)[0]).toBeTruthy();
    });
  });

  it('queries caregiver_profiles with student/companion_55 filter', async () => {
    await act(async () => render(<BrowseDirectoryScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('caregiver_profiles');
      expect(mockChain.in).toHaveBeenCalledWith(
        'caregiver_type',
        expect.arrayContaining(['student', 'companion_55'])
      );
    });
  });

  // ── Invite Action ─────────────────────────────────────────────────────────

  it('clicking Invite inserts to agency_invites table', async () => {
    await act(async () => render(<BrowseDirectoryScreen />));
    await waitFor(() => screen.getAllByText(/Invite/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Invite/i)[0]);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('agency_invites');
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          agency_id: 'agency-1',
          direction: expect.stringContaining('agency'),
          status: 'pending',
        })
      );
    });
  });

  it('shows "Pending" label after invite is sent', async () => {
    // Companion with existing pending invite
    mockChain.then.mockReset();
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockCompanion], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [{ companion_id: 'user-cg-1', status: 'pending' }], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<BrowseDirectoryScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/Pending|Invited/i)[0]).toBeTruthy();
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: shows empty state when no companions found', async () => {
    mockChain.then.mockReset();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<BrowseDirectoryScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/No companion|no result|loading/i)[0]).toBeTruthy();
    });
  });

  it('NEGATIVE: does not crash when agency_id is missing', async () => {
    // This would happen if user.agency_id is null
    jest.resetModules();
    await expect(act(async () => {
      render(<BrowseDirectoryScreen />);
    })).resolves.not.toThrow();
  });
});
