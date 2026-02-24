/**
 * Auth: Welcome Screen Tests (NEW — Phase 3 landing)
 * Screen: (auth)/index.tsx
 * Two-card landing: "I'm looking for Caregiver Services" and "I'm a caregiver"
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
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
  Link: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('span', props, children);
  },
  Stack: { Screen: ({ children }: any) => children ?? null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
  useFocusEffect: jest.fn((cb: any) => {
    const React = require('react');
    React.useEffect(() => { cb(); }, []);
  }),
}));

import WelcomeScreen from '@/app/(auth)/index';

describe('Auth: Welcome Screen (Phase 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Renders ──────────────────────────────────────────────────────────────

  it('renders app title "HealthGuide"', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('HealthGuide')).toBeTruthy();
  });

  it('renders tagline "Companionship that matters"', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Companionship that matters')).toBeTruthy();
  });

  it('renders "I\'m looking for Caregiver Services" card', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText("I'm looking for Caregiver Services")).toBeTruthy();
  });

  it('renders care services card subtitle', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Browse companions and request visits')).toBeTruthy();
  });

  it('renders "I\'m a caregiver" card', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText("I'm a caregiver")).toBeTruthy();
  });

  it('renders caregiver card subtitle', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Student, 55+ companion, or agency owner')).toBeTruthy();
  });

  it('renders "Already have an account? Sign In" link', () => {
    render(<WelcomeScreen />);
    expect(screen.getAllByText(/Already have an account/)[0]).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('renders "Privacy Policy" link in footer', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders "Terms & Conditions" link in footer', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Terms & Conditions')).toBeTruthy();
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  it('tapping "I\'m looking for Caregiver Services" navigates to browse-companions', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText("I'm looking for Caregiver Services"));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/browse-companions');
  });

  it('tapping "I\'m a caregiver" navigates to caregiver-roles', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText("I'm a caregiver"));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/caregiver-roles');
  });

  it('tapping "Sign In" navigates to login', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('Sign In'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('tapping "Privacy Policy" navigates to privacy-policy', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('Privacy Policy'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/privacy-policy');
  });

  it('tapping "Terms & Conditions" navigates to terms', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('Terms & Conditions'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/terms');
  });

  // ── NEGATIVE: Old content should NOT be present ──────────────────────────

  it('NEGATIVE: does NOT show "Professional Elder Care Management"', () => {
    render(<WelcomeScreen />);
    expect(screen.queryByText('Professional Elder Care Management')).toBeNull();
  });

  it('NEGATIVE: does NOT show "Agency Owner" card (old name)', () => {
    render(<WelcomeScreen />);
    // The old welcome screen had an "Agency Owner" card — now it is in caregiver-roles screen
    expect(screen.queryByText('Agency Owner')).toBeNull();
  });

  it('NEGATIVE: does NOT show "I have an invite code"', () => {
    render(<WelcomeScreen />);
    expect(screen.queryByText('I have an invite code')).toBeNull();
  });

  it('NEGATIVE: does NOT show "I am a..."', () => {
    render(<WelcomeScreen />);
    expect(screen.queryByText('I am a...')).toBeNull();
  });
});
