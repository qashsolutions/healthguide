/**
 * 08-Companionship: Welcome Landing Screen Tests (Phase 3)
 * Screen: (auth)/index.tsx — Two-card landing redesign
 * Full positive/negative/navigation coverage
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
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

import WelcomeScreen from '@/app/(auth)/index';

describe('08-Companionship: Welcome Landing Screen (Phase 3)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ── Content ───────────────────────────────────────────────────────────────

  it('renders "HealthGuide" app title', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('HealthGuide')).toBeTruthy();
  });

  it('renders "Companionship that matters" tagline', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Companionship that matters')).toBeTruthy();
  });

  it('renders TWO main cards (not three)', () => {
    render(<WelcomeScreen />);
    // The 2 main CTA cards
    expect(screen.getByText("I'm looking for Caregiver Services")).toBeTruthy();
    expect(screen.getByText("I'm a caregiver")).toBeTruthy();
  });

  it('renders care seeker card subtitle', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Browse companions and request visits')).toBeTruthy();
  });

  it('renders caregiver card subtitle', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Student, 55+ companion, or agency owner')).toBeTruthy();
  });

  it('renders "Sign In" link for existing users', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('renders "Privacy Policy" footer link', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders "Terms & Conditions" footer link', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Terms & Conditions')).toBeTruthy();
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  it('care services card → navigates to /(auth)/browse-companions', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText("I'm looking for Caregiver Services"));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/browse-companions');
  });

  it('caregiver card → navigates to /(auth)/caregiver-roles', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText("I'm a caregiver"));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/caregiver-roles');
  });

  it('Sign In link → navigates to /(auth)/login', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('Sign In'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('Privacy Policy → navigates to /(auth)/privacy-policy', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('Privacy Policy'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/privacy-policy');
  });

  it('Terms & Conditions → navigates to /(auth)/terms', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('Terms & Conditions'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/terms');
  });

  // ── NEGATIVE: Old content must be absent ─────────────────────────────────

  it('NEGATIVE: does NOT render "Professional Elder Care Management" (old subtitle)', () => {
    render(<WelcomeScreen />);
    expect(screen.queryByText('Professional Elder Care Management')).toBeNull();
  });

  it('NEGATIVE: does NOT render "Agency Owner" as a primary card', () => {
    render(<WelcomeScreen />);
    expect(screen.queryByText('Agency Owner')).toBeNull();
  });

  it('NEGATIVE: does NOT render "I have an invite code" button', () => {
    render(<WelcomeScreen />);
    expect(screen.queryByText('I have an invite code')).toBeNull();
  });

  it('NEGATIVE: does NOT render "I am a..." label', () => {
    render(<WelcomeScreen />);
    expect(screen.queryByText('I am a...')).toBeNull();
  });

  it('NEGATIVE: does NOT render "New agency? Register here" (old CTA)', () => {
    render(<WelcomeScreen />);
    expect(screen.queryByText('New agency? Register here')).toBeNull();
  });

  it('NEGATIVE: navigating to care services does NOT go to login directly', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText("I'm looking for Caregiver Services"));
    // Should go to browse-companions, NOT login
    expect(mockPush).not.toHaveBeenCalledWith('/(auth)/login');
    expect(mockPush).toHaveBeenCalledWith('/(auth)/browse-companions');
  });
});
