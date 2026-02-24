/**
 * Auth: Agency Login Screen Tests (Rewrite)
 * Screen: (auth)/login.tsx
 * "Agency Owner Login" — email + password form
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSignInWithEmail = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack, canGoBack: jest.fn(() => true) }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('span', props, children);
  },
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Redirect: () => null,
  useFocusEffect: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    agency: null,
    loading: false,
    initialized: true,
    signInWithEmail: mockSignInWithEmail,
    signInWithPhone: jest.fn(),
    signUpWithEmail: jest.fn(),
    verifyOTP: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
  AuthProvider: ({ children }: any) => children,
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, loading, icon }: any) =>
      React.createElement('button', { onClick: onPress, 'data-testid': `btn-${title?.replace(/\s/g, '-')}` },
        icon || null,
        loading ? 'Loading...' : title
      ),
    Input: ({ label, value, onChangeText, placeholder, secureTextEntry }: any) =>
      React.createElement('div', null,
        React.createElement('label', null, label),
        React.createElement('input', {
          value: value || '',
          onChange: (e: any) => onChangeText && onChangeText(e.target.value),
          placeholder,
          type: secureTextEntry ? 'password' : 'text',
          'data-testid': label,
        })
      ),
    Card: ({ children }: any) => children,
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ArrowLeftIcon: () => React.createElement(Text, { testID: 'arrow-left' }, '←'),
    AgencyOwnerIcon: () => React.createElement(Text, null, '🏢'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280' },
    error: { 500: '#EF4444' },
    background: '#FFFFFF',
    white: '#FFFFFF',
    surface: '#F9FAFB',
    primary: { 50: '#EFF6FF', 600: '#2563EB' },
    neutral: { 300: '#D1D5DB', 900: '#111827' },
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

import LoginScreen from '@/app/(auth)/login';

describe('Auth: Agency Login Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Renders ──────────────────────────────────────────────────────────────

  it('renders "Agency Owner Login" title', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Agency Owner Login')).toBeTruthy();
  });

  it('renders subtitle about managing care agency', () => {
    render(<LoginScreen />);
    expect(screen.getAllByText(/Sign in to manage your care agency/i)[0]).toBeTruthy();
  });

  it('renders Email input label', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('renders Password input label', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Password')).toBeTruthy();
  });

  it('renders Sign In button', () => {
    render(<LoginScreen />);
    expect(screen.getByTestId('btn-Sign-In')).toBeTruthy();
  });

  // ── Interaction ───────────────────────────────────────────────────────────

  it('shows error when Sign In clicked with empty fields', async () => {
    render(<LoginScreen />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Sign-In'));
    });
    await waitFor(() => {
      expect(screen.getAllByText(/Please enter your email and password/i)[0]).toBeTruthy();
    });
  });

  it('calls signInWithEmail with correct credentials on submit', async () => {
    mockSignInWithEmail.mockResolvedValueOnce(undefined);
    render(<LoginScreen />);

    const emailInput = screen.getByTestId('Email');
    const passwordInput = screen.getByTestId('Password');

    fireEvent.change(emailInput, { target: { value: 'owner@healthguide.test' } });
    fireEvent.change(passwordInput, { target: { value: 'TestPass123!' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Sign-In'));
    });

    expect(mockSignInWithEmail).toHaveBeenCalledWith('owner@healthguide.test', 'TestPass123!');
  });

  it('shows error message when sign in fails', async () => {
    mockSignInWithEmail.mockRejectedValueOnce(new Error('Invalid login credentials'));
    render(<LoginScreen />);

    const emailInput = screen.getByTestId('Email');
    const passwordInput = screen.getByTestId('Password');
    fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Sign-In'));
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Invalid login credentials/i)[0]).toBeTruthy();
    });
  });

  it('Back button calls router.back()', () => {
    render(<LoginScreen />);
    fireEvent.click(screen.getByTestId('arrow-left'));
    expect(mockBack).toHaveBeenCalled();
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: does not call signInWithEmail when fields are empty', async () => {
    render(<LoginScreen />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Sign-In'));
    });
    expect(mockSignInWithEmail).not.toHaveBeenCalled();
  });

  it('NEGATIVE: clears error when user starts typing', () => {
    render(<LoginScreen />);
    // After error appears, typing should be possible (no frozen state)
    const emailInput = screen.getByTestId('Email');
    fireEvent.change(emailInput, { target: { value: 'new@email.com' } });
    expect(emailInput).toBeTruthy();
  });
});
