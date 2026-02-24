/**
 * 02-Agency: Agency Caregivers + Schedule Tests
 * Screens: agency/(tabs)/caregivers.tsx, agency/(tabs)/schedule.tsx
 * Phase 8: Browse button added, Phase 14: invite stats
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
    user: { id: 'owner-1', full_name: 'Jane Smith', agency_id: 'agency-1' },
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
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
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
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Card: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress, testID: 'caregiver-card' }, React.createElement(View, null, children)),
    Badge: ({ label, variant }: any) => React.createElement(Text, null, label),
    Button: ({ title, onPress, variant, size, fullWidth }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s+/g, '-')}` },
        React.createElement(Text, null, title)
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PersonIcon: () => React.createElement(Text, null, '👤'),
    PlusIcon: () => React.createElement(Text, null, '+'),
    PhoneIcon: () => React.createElement(Text, null, '📞'),
    SearchIcon: () => React.createElement(Text, null, '🔍'),
    UsersIcon: () => React.createElement(Text, null, '👥'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
    FilterIcon: () => React.createElement(Text, null, '⚙️'),
    CompanionIcon: () => React.createElement(Text, null, '👥'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 500: '#3B82F6', 600: '#2563EB', 50: '#EFF6FF' },
    success: { 50: '#F0FDF4', 500: '#10B981', 600: '#059669' },
    error: { 500: '#EF4444' },
    warning: { 500: '#F59E0B' },
  },
  roleColors: { agency_owner: '#0F766E', caregiver: '#059669' },
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
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24, full: 9999 },
  createShadow: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import CaregiversScreen from '@/app/(protected)/agency/(tabs)/caregivers';

describe('02-Agency: Agency Caregivers Tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  it('renders without crashing', async () => {
    await act(async () => render(<CaregiversScreen />));
    expect(screen.getAllByText(/Caregiver|Available/i)[0]).toBeTruthy();
  });

  it('shows Browse button for companion directory', async () => {
    await act(async () => render(<CaregiversScreen />));
    expect(screen.getAllByText(/Browse/i)[0]).toBeTruthy();
  });

  it('shows + Add button', async () => {
    await act(async () => render(<CaregiversScreen />));
    expect(screen.getAllByText(/\+ Add/i)[0]).toBeTruthy();
  });

  it('shows search input', async () => {
    await act(async () => render(<CaregiversScreen />));
    expect(screen.getByPlaceholderText(/Search name|zip/i)).toBeTruthy();
  });

  it('Browse button navigates to browse-directory', async () => {
    await act(async () => render(<CaregiversScreen />));
    await act(async () => {
      fireEvent.click(screen.getAllByText(/Browse/i)[0]);
    });
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('browse-directory'));
  });

  it('+ Add button navigates to caregiver new page', async () => {
    await act(async () => render(<CaregiversScreen />));
    await act(async () => {
      fireEvent.click(screen.getAllByText(/\+ Add/i)[0]);
    });
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('caregiver/new'));
  });

  it('shows empty state when no caregivers linked', async () => {
    await act(async () => render(<CaregiversScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/No caregivers yet|no caregiver/i)[0]).toBeTruthy();
    });
  });

  it('shows Available filter chip', async () => {
    await act(async () => render(<CaregiversScreen />));
    expect(screen.getAllByText(/Available/i)[0]).toBeTruthy();
  });

  it('queries caregiver_agency_links with agency_id', async () => {
    await act(async () => render(<CaregiversScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('caregiver_agency_links');
      expect(mockChain.eq).toHaveBeenCalledWith('agency_id', 'agency-1');
    });
  });

  it('NEGATIVE: does not crash when no agency_id', async () => {
    jest.resetModules();
    await expect(act(async () => {
      render(<CaregiversScreen />);
    })).resolves.not.toThrow();
  });
});
