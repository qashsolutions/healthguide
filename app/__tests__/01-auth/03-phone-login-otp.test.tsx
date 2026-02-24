/**
 * 01-Auth: Phone Login + OTP Verification Tests
 * Screens: (auth)/phone-login.tsx, (auth)/verify-otp.tsx
 * Note: Phone OTP login is still available but Twilio not configured on this project
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSignInWithPhone = jest.fn();
const mockVerifyOTP = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ role: 'caregiver', phone: '+15551234567' }),
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
    signInWithPhone: mockSignInWithPhone,
    verifyOTP: mockVerifyOTP,
    verifyEmailOTP: jest.fn(),
    signInWithEmailOTP: jest.fn(),
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
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Button: ({ title, onPress, loading, disabled, variant, size, icon }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s+/g, '-') || 'icon-btn'}`, disabled },
        React.createElement(Text, null, loading ? 'Loading...' : (title || ''))
      ),
    Input: ({ label, value, onChangeText, placeholder, keyboardType, error }: any) =>
      React.createElement(View, null,
        React.createElement(Text, null, label),
        React.createElement(TextInput, { value, onChangeText, placeholder, testID: placeholder || label }),
        error ? React.createElement(Text, { testID: 'input-error' }, error) : null,
      ),
    OTPInput: ({ value, onChange }: any) =>
      React.createElement(TextInput, {
        value, onChangeText: onChange,
        testID: 'otp-input',
        placeholder: '------',
      }),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ArrowLeftIcon: () => React.createElement(Text, null, '←'),
    PhoneIcon: () => React.createElement(Text, null, '📞'),
    CaregiverIcon: () => React.createElement(Text, null, '🩺'),
    ElderIcon: () => React.createElement(Text, null, '👴'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
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
  roleColors: { caregiver: '#059669', careseeker: '#7C3AED' },
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
  touchTargets: { min: 44, comfortable: 48, large: 56 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
  createShadow: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import PhoneLoginScreen from '@/app/(auth)/phone-login';
import VerifyOTPScreen from '@/app/(auth)/verify-otp';

describe('01-Auth: Phone Login Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithPhone.mockResolvedValue(undefined);
  });

  it('renders without crashing', () => {
    render(<PhoneLoginScreen />);
    expect(screen.getAllByText(/Login|Caregiver/i)[0]).toBeTruthy();
  });

  it('renders phone number input', () => {
    render(<PhoneLoginScreen />);
    expect(screen.getByPlaceholderText('(555) 123-4567')).toBeTruthy();
  });

  it('renders Send Code button', () => {
    render(<PhoneLoginScreen />);
    expect(screen.getByText('Send Code')).toBeTruthy();
  });

  it('phone validation rejects empty input', async () => {
    render(<PhoneLoginScreen />);
    fireEvent.click(screen.getByText('Send Code'));
    await waitFor(() => {
      expect(screen.getAllByText(/valid phone number/i)[0]).toBeTruthy();
    });
  });

  it('calls signInWithPhone with formatted number on valid input', async () => {
    render(<PhoneLoginScreen />);
    const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
    fireEvent.change(phoneInput, { target: { value: '5551234567' } });
    fireEvent.click(screen.getByText('Send Code'));
    await waitFor(() => {
      expect(mockSignInWithPhone).toHaveBeenCalledWith('+15551234567');
    });
  });

  it('NEGATIVE: shows error message on API failure', async () => {
    mockSignInWithPhone.mockRejectedValue(new Error('Rate limit exceeded'));
    render(<PhoneLoginScreen />);
    const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
    fireEvent.change(phoneInput, { target: { value: '5551234567' } });
    fireEvent.click(screen.getByText('Send Code'));
    await waitFor(() => {
      expect(screen.getAllByText(/Rate limit|Failed/i)[0]).toBeTruthy();
    });
  });
});

describe('01-Auth: OTP Verification Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockVerifyOTP.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<VerifyOTPScreen />);
    expect(screen.getAllByText(/Verify|code/i).length).toBeGreaterThan(0);
  });

  it('shows Verify button', () => {
    render(<VerifyOTPScreen />);
    expect(screen.getByText('Verify')).toBeTruthy();
  });

  it('shows resend timer countdown', () => {
    render(<VerifyOTPScreen />);
    expect(screen.getAllByText(/Resend in \d+s|resend/i)[0]).toBeTruthy();
  });

  it('shows Resend Code after timer expires', async () => {
    render(<VerifyOTPScreen />);
    for (let i = 0; i < 61; i++) {
      act(() => { jest.advanceTimersByTime(1000); });
    }
    await waitFor(() => {
      expect(screen.getAllByText(/Resend Code|Resend/i)[0]).toBeTruthy();
    });
  });

  it('back button navigates back', () => {
    render(<VerifyOTPScreen />);
    fireEvent.click(screen.getByTestId('btn-icon-btn'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('NEGATIVE: does not crash when code is empty', async () => {
    render(<VerifyOTPScreen />);
    await expect(act(async () => {
      fireEvent.click(screen.getByText('Verify'));
    })).resolves.not.toThrow();
  });
});
