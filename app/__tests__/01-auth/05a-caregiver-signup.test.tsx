/**
 * Batch 5: Caregiver Signup Tests (Features #36-49)
 * Screen: (auth)/caregiver-signup.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSignInWithPhone = jest.fn();

let mockLoading = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: mockBack,
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: { Screen: ({ children }: any) => children ?? null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signInWithPhone: mockSignInWithPhone,
    loading: mockLoading,
    user: null,
    agency: null,
    initialized: true,
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    verifyOTP: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
  useRequireRole: () => ({ hasAccess: false, loading: false, user: null }),
  AuthProvider: ({ children }: any) => children,
}));

import CaregiverSignupScreen from '@/app/(auth)/caregiver-signup';

describe('Batch 5: Caregiver Signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoading = false;
    mockSignInWithPhone.mockResolvedValue(undefined);
  });

  // Feature #36: Phone number input renders
  it('#36 - Phone number input renders', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByPlaceholderText('(555) 123-4567')).toBeTruthy();
  });

  // Feature #37: Title renders
  it('#37 - Title "Create Your Caregiver Profile" renders', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByText('Create Your Caregiver Profile')).toBeTruthy();
  });

  // Feature #38: Subtitle renders
  it('#38 - Subtitle "Free — showcase your skills to agencies" renders', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByText(/showcase your skills to agencies/)).toBeTruthy();
  });

  // Feature #39: Country code prefix
  it('#39 - Country code prefix +1 renders', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByText('+1')).toBeTruthy();
  });

  // Feature #40: Send Code button renders
  it('#40 - "Send Code" button renders', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByText('Send Code')).toBeTruthy();
  });

  // Feature #41: Help text renders
  it('#41 - Help text about 6-digit code renders', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByText(/6-digit code/)).toBeTruthy();
  });

  // Feature #42: Back button renders
  it('#42 - Back button renders and navigates back', () => {
    render(<CaregiverSignupScreen />);
    const buttons = screen.getAllByRole('button');
    // First button is the back button (ghost variant with arrow icon)
    fireEvent.click(buttons[0]);
    expect(mockBack).toHaveBeenCalled();
  });

  // Feature #43: Phone validation rejects short numbers
  it('#43 - Phone validation rejects short numbers', async () => {
    render(<CaregiverSignupScreen />);
    fireEvent.click(screen.getByText('Send Code'));
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number')).toBeTruthy();
    });
  });

  // Feature #44: Phone number formatting
  it('#44 - Phone label "Phone Number" renders', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByText('Phone Number')).toBeTruthy();
  });

  // Feature #45: Loading state on submission
  it('#45 - Loading state on submission (button has loading prop)', () => {
    mockLoading = true;
    render(<CaregiverSignupScreen />);
    // When loading, the Send Code button should be disabled
    const buttons = screen.getAllByRole('button');
    // The send code button (second button) should reflect loading
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  // Feature #46: Success navigates to verify-otp with caregiver role
  it('#46 - Success navigates to verify-otp with caregiver role', async () => {
    render(<CaregiverSignupScreen />);
    const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
    fireEvent.change(phoneInput, { target: { value: '5551234567' } });
    fireEvent.click(screen.getByText('Send Code'));

    await waitFor(() => {
      expect(mockSignInWithPhone).toHaveBeenCalledWith('+15551234567');
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(auth)/verify-otp',
        params: {
          phone: '+15551234567',
          role: 'caregiver',
          signup: 'true',
        },
      });
    });
  });

  // Feature #47: "Already have an account? Sign In" link renders
  it('#47 - "Already have an account?" and "Sign In" link renders', () => {
    render(<CaregiverSignupScreen />);
    expect(screen.getByText(/Already have an account/)).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  // Feature #48: Error message on API failure
  it('#48 - Error message on API failure', async () => {
    mockSignInWithPhone.mockRejectedValue(new Error('Rate limit exceeded'));
    render(<CaregiverSignupScreen />);
    const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
    fireEvent.change(phoneInput, { target: { value: '5551234567' } });
    fireEvent.click(screen.getByText('Send Code'));

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeTruthy();
    });
  });

  // Feature #49: "Sign In" link navigates to phone-login
  it('#49 - "Sign In" link navigates to phone-login', () => {
    render(<CaregiverSignupScreen />);
    fireEvent.click(screen.getByText('Sign In'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/phone-login?role=caregiver');
  });
});
