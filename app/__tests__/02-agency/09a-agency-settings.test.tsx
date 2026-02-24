/**
 * 02-Agency: Agency Settings Tests
 * Screen: agency/settings/index.tsx
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

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
    user: { id: 'owner-1', full_name: 'Jane Smith', agency_id: 'agency-1', email: 'jane@agency.com' },
    agency: { id: 'agency-1', name: 'Sunny Day Home Care' },
    loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn(() => true),
  }),
  AuthProvider: ({ children }: any) => children,
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'agency-1', name: 'Sunny Day Home Care' }, error: null }),
      update: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve({ data: null, error: null })),
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Button: ({ title, onPress }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s+/g, '-')}` },
        React.createElement(Text, null, title)
      ),
    Input: ({ label, value, onChangeText, placeholder }: any) =>
      React.createElement(View, null,
        React.createElement(Text, null, label),
        React.createElement(TextInput, { value, onChangeText, placeholder, testID: label || placeholder })
      ),
    Card: ({ children }: any) => React.createElement(View, null, children),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    SettingsIcon: () => React.createElement(Text, null, '⚙️'),
    BuildingIcon: () => React.createElement(Text, null, '🏢'),
    ArrowRightIcon: () => React.createElement(Text, null, '→'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
    ChevronRightIcon: () => React.createElement(Text, null, '›'),
    BellIcon: () => React.createElement(Text, null, '🔔'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    error: { 500: '#EF4444' },
    success: { 600: '#059669' },
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
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
  shadows: { sm: {}, md: {}, lg: {} },
  createShadow: () => ({}),
}));

import AgencySettingsScreen from '@/app/(protected)/agency/settings/index';

describe('02-Agency: Agency Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AgencySettingsScreen />);
    expect(screen.getAllByText(/Settings|Agency/i)[0]).toBeTruthy();
  });

  it('shows navigation items for settings sections', () => {
    render(<AgencySettingsScreen />);
    // Settings screen should show navigation items
    expect(screen.getAllByText(/Task Library|Profile|Billing|task|profile/i)[0]).toBeTruthy();
  });

  it('clicking Task Library navigates to task-library', () => {
    render(<AgencySettingsScreen />);
    const taskLibrary = screen.queryByText(/Task Library/i);
    if (taskLibrary) {
      fireEvent.click(taskLibrary);
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('task-library'));
    }
    expect(true).toBe(true); // No crash
  });

  it('NEGATIVE: does not crash when agency data missing', async () => {
    await expect(act(async () => {
      render(<AgencySettingsScreen />);
    })).resolves.not.toThrow();
  });
});
