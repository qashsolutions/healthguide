/**
 * Batch 2: Agency Login Tests (Features #8-14)
 * Screen: (auth)/login.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSignInWithEmail = jest.fn();

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

let mockLoading = false;
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signInWithEmail: mockSignInWithEmail,
    loading: mockLoading,
    user: null,
    agency: null,
    initialized: true,
    signUpWithEmail: jest.fn(),
    signInWithPhone: jest.fn(),
    verifyOTP: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
  useRequireRole: () => ({ hasAccess: false, loading: false, user: null }),
  AuthProvider: ({ children }: any) => children,
}));

import LoginScreen from '@/app/(auth)/login';

describe('Batch 2: Agency Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoading = false;
    mockSignInWithEmail.mockResolvedValue(undefined);
  });

  // Feature #8: Email input field renders
  it('#8 - Email input field renders', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('you@agency.com')).toBeTruthy();
  });

  // Feature #9: Password input field renders
  it('#9 - Password input field renders', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
  });

  // Feature #10: Sign In button renders
  it('#10 - Sign In button renders', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  // Feature #11: Error state shows on invalid credentials
  it('#11 - Error state shows on empty submission', async () => {
    render(<LoginScreen />);
    fireEvent.click(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('Please enter your email and password')).toBeTruthy();
    });
  });

  // Feature #12: Loading state shows during sign-in
  it('#12 - Loading state shows during sign-in', () => {
    mockLoading = true;
    render(<LoginScreen />);
    // When loading, "Sign In" text is replaced by ActivityIndicator
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    // The Sign In button should be disabled during loading
    const signInButtons = buttons.filter(b => b.getAttribute('aria-disabled') === 'true');
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);
  });

  // Feature #13: Navigates to register from login
  it('#13 - Navigates to register from login', () => {
    render(<LoginScreen />);
    fireEvent.click(screen.getByText('Register'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
  });

  // Feature #14: Sign-in calls signInWithEmail
  it('#14 - Sign-in calls signInWithEmail with email and password', async () => {
    render(<LoginScreen />);

    const emailInput = screen.getByPlaceholderText('you@agency.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'test@agency.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@agency.com', 'password123');
    });
  });
});
