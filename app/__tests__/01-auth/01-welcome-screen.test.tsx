/**
 * Batch 1: Welcome Screen Tests (Features #1-7)
 * Screen: (auth)/index.tsx
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock expo-router before importing the component
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => {
    return <span {...props}>{children}</span>;
  },
  Stack: { Screen: ({ children }: any) => children ?? null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
}));

import WelcomeScreen from '@/app/(auth)/index';

describe('Batch 1: Welcome Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature #1: App title "HealthGuide" renders
  it('#1 - App title "HealthGuide" renders', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('HealthGuide')).toBeTruthy();
  });

  // Feature #2: Subtitle "Professional Elder Care Management" displays
  it('#2 - Subtitle "Professional Elder Care Management" displays', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Professional Elder Care Management')).toBeTruthy();
  });

  // Feature #3: "I am a..." section title shows
  it('#3 - "I am a..." section title shows', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('I am a...')).toBeTruthy();
  });

  // Feature #4: Agency Owner role card renders with correct text
  it('#4 - Agency Owner role card renders with correct text', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Agency Owner')).toBeTruthy();
    expect(screen.getByText('Manage your care agency')).toBeTruthy();
  });

  // Feature #5: Caregiver role card renders with correct text
  it('#5 - Caregiver role card renders with correct text', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Caregiver')).toBeTruthy();
    expect(screen.getByText('Sign up to offer care services')).toBeTruthy();
  });

  // Feature #6: "I have an invite code" button renders
  it('#6 - "I have an invite code" button renders', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('I have an invite code')).toBeTruthy();
    expect(screen.getByText('Join as family member or elder')).toBeTruthy();
  });

  // Feature #7: Privacy Policy and Terms links render
  it('#7 - Privacy Policy and Terms links render', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.getByText('Terms & Conditions')).toBeTruthy();
  });

  // Navigation tests (bonus - validates the interactive behavior)
  it('Agency Owner card navigates to login', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('Agency Owner'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('Caregiver card navigates to caregiver-signup', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('Caregiver'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/caregiver-signup');
  });

  it('"New agency? Register here" navigates to register', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('New agency? Register here'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/register');
  });

  it('"I have an invite code" navigates to join-group', () => {
    render(<WelcomeScreen />);
    fireEvent.click(screen.getByText('I have an invite code'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/join-group');
  });
});
