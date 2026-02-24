/**
 * 01-Auth: Caregiver Signup Screen Tests
 * Screen: (auth)/caregiver-signup.tsx
 * Now uses email OTP (signInWithEmailOTP) not phone - updated for companionship pivot
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSignInWithEmailOTP = jest.fn();

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
    signInWithEmailOTP: mockSignInWithEmailOTP,
    loading: false,
    user: null,
    agency: null,
    initialized: true,
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
  AuthProvider: ({ children }: any) => children,
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signOut: jest.fn().mockResolvedValue({}),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, loading, disabled, icon }: any) =>
      React.createElement('button', { onClick: onPress, 'data-testid': `btn-${title?.replace(/\s+/g, '-') || 'back'}`, disabled },
        icon || null,
        loading ? 'Loading...' : (title || '')
      ),
    Input: ({ label, value, onChangeText, placeholder, keyboardType, error, size }: any) =>
      React.createElement('div', null,
        React.createElement('label', null, label),
        React.createElement('input', {
          value: value || '',
          onChange: (e: any) => onChangeText && onChangeText(e.target.value),
          placeholder,
          'data-testid': placeholder || label,
        }),
        error ? React.createElement('span', null, error) : null,
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ArrowLeftIcon: () => React.createElement(Text, null, '←'),
    CaregiverIcon: () => React.createElement(Text, null, '🩺'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 100: '#F3F4F6', 200: '#E5E7EB' },
    error: { 500: '#EF4444' },
  },
  roleColors: { caregiver: '#059669' },
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

import CaregiverSignupScreen from '@/app/(auth)/caregiver-signup';

describe('01-Auth: Caregiver Signup Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithEmailOTP.mockResolvedValue(undefined);
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getAllByText(/Create Your Caregiver Profile/i)[0]).toBeTruthy();
  });

  it('renders subtitle about showcasing skills', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getAllByText(/showcase your skills to agencies/i)[0]).toBeTruthy();
  });

  it('renders Email Address input (not phone)', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getAllByText(/Email Address/i)[0]).toBeTruthy();
  });

  it('renders email placeholder you@example.com', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
  });

  it('renders Send Code button', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByTestId('btn-Send-Code')).toBeTruthy();
  });

  it('shows "Already have an account?" text', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getAllByText(/Already have an account/i)[0]).toBeTruthy();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('shows error when submitting with empty email', async () => {
    render(<CaregiverSignupScreen />);
    fireEvent.click(screen.getByTestId('btn-Send-Code'));
    await waitFor(() => {
      expect(screen.getAllByText(/valid email/i)[0]).toBeTruthy();
    });
    expect(mockSignInWithEmailOTP).not.toHaveBeenCalled();
  });

  it('shows error when submitting with invalid email', async () => {
    render(<CaregiverSignupScreen />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    fireEvent.click(screen.getByTestId('btn-Send-Code'));
    await waitFor(() => {
      expect(screen.getAllByText(/valid email/i)[0]).toBeTruthy();
    });
    expect(mockSignInWithEmailOTP).not.toHaveBeenCalled();
  });

  // ── Submit ────────────────────────────────────────────────────────────────

  it('calls signInWithEmailOTP with trimmed lowercase email', async () => {
    render(<CaregiverSignupScreen />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: '  Maria@Example.COM  ' } });
    fireEvent.click(screen.getByTestId('btn-Send-Code'));

    await waitFor(() => {
      expect(mockSignInWithEmailOTP).toHaveBeenCalledWith('maria@example.com', 'caregiver');
    });
  });

  it('navigates to verify-otp with email and caregiver role after success', async () => {
    render(<CaregiverSignupScreen />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByTestId('btn-Send-Code'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(auth)/verify-otp',
        params: expect.objectContaining({
          email: 'test@example.com',
          role: 'caregiver',
        }),
      });
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: shows error message on API failure', async () => {
    mockSignInWithEmailOTP.mockRejectedValue(new Error('Failed to send verification code'));
    render(<CaregiverSignupScreen />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByTestId('btn-Send-Code'));

    await waitFor(() => {
      expect(screen.getAllByText(/Failed to send|failed/i)[0]).toBeTruthy();
    });
  });
});
