/**
 * 01-Auth: Agency Registration + Join Group Tests
 * Screens: (auth)/register.tsx, (auth)/join-group.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSignUpWithEmail = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
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
    signUpWithEmail: mockSignUpWithEmail,
    signInWithEmail: jest.fn(),
    loading: false,
    user: null,
    agency: null,
    initialized: true,
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
  AuthProvider: ({ children }: any) => children,
}));

jest.mock('@/lib/notifications', () => ({
  registerForPushNotifications: jest.fn().mockResolvedValue('test-token'),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('@/lib/invite', () => ({
  cleanInviteCode: jest.fn((code: string) => code?.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || ''),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Button: ({ title, onPress, loading, disabled }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s+/g, '-')}`, disabled },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
    Input: ({ label, value, onChangeText, placeholder, secureTextEntry, error }: any) =>
      React.createElement(View, null,
        React.createElement(Text, null, label),
        React.createElement(TextInput, { value, onChangeText, placeholder, secureTextEntry, testID: placeholder || label })
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ArrowLeftIcon: () => React.createElement(Text, null, '←'),
    BuildingIcon: () => React.createElement(Text, null, '🏢'),
    AgencyOwnerIcon: () => React.createElement(Text, null, '🏢'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    error: { 500: '#EF4444' },
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
  createShadow: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import RegisterScreen from '@/app/(auth)/register';
import JoinGroupScreen from '@/app/(auth)/join-group';

describe('01-Auth: Agency Registration Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUpWithEmail.mockResolvedValue(undefined);
  });

  it('renders without crashing', () => {
    render(<RegisterScreen />);
    expect(screen.getAllByText(/Create Agency|Register|Account/i)[0]).toBeTruthy();
  });

  it('renders agency name input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Sunny Day Home Care')).toBeTruthy();
  });

  it('renders full name input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Jane Smith')).toBeTruthy();
  });

  it('renders email input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('jane@sunnydayhc.com')).toBeTruthy();
  });

  it('renders password input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeTruthy();
  });

  it('renders confirm password input', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Re-enter password')).toBeTruthy();
  });

  it('renders Create Agency Account button', () => {
    render(<RegisterScreen />);
    expect(screen.getByText('Create Agency Account')).toBeTruthy();
  });

  it('shows password mismatch error', async () => {
    render(<RegisterScreen />);
    fireEvent.change(screen.getByPlaceholderText('Sunny Day Home Care'), { target: { value: 'Test Agency' } });
    fireEvent.change(screen.getByPlaceholderText('Jane Smith'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('jane@sunnydayhc.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { value: 'different456' } });
    fireEvent.click(screen.getByText('Create Agency Account'));

    await waitFor(() => {
      expect(screen.getAllByText(/Passwords do not match|do not match/i)[0]).toBeTruthy();
    });
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it('calls signUpWithEmail with correct data on valid form', async () => {
    render(<RegisterScreen />);
    fireEvent.change(screen.getByPlaceholderText('Sunny Day Home Care'), { target: { value: 'Test Agency' } });
    fireEvent.change(screen.getByPlaceholderText('Jane Smith'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('jane@sunnydayhc.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Create Agency Account'));

    await waitFor(() => {
      expect(mockSignUpWithEmail).toHaveBeenCalledWith(
        'test@test.com',
        'password123',
        expect.objectContaining({ role: 'agency_owner' })
      );
    });
  });

  it('shows "Sign In" link', () => {
    render(<RegisterScreen />);
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('NEGATIVE: does not call signUp with empty form', async () => {
    render(<RegisterScreen />);
    fireEvent.click(screen.getByText('Create Agency Account'));
    await waitFor(() => {
      expect(mockSignUpWithEmail).not.toHaveBeenCalled();
    });
  });
});

describe('01-Auth: Join Group Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<JoinGroupScreen />);
    expect(screen.getAllByText(/Join Care Group|Join/i)[0]).toBeTruthy();
  });

  it('renders invite code input', () => {
    render(<JoinGroupScreen />);
    expect(screen.getByPlaceholderText('XXXXXXXX')).toBeTruthy();
  });

  it('renders Continue button', () => {
    render(<JoinGroupScreen />);
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('NEGATIVE: does not crash on empty submit', async () => {
    render(<JoinGroupScreen />);
    await expect(act(async () => {
      fireEvent.click(screen.getByText('Continue'));
    })).resolves.not.toThrow();
  });
});
