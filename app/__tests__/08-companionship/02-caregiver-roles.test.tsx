/**
 * 08-Companionship: Caregiver Roles Screen Tests (Phase 3)
 * Screen: (auth)/caregiver-roles.tsx
 * Three role cards: Student, 55+ Companion, Agency Owner
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
  useFocusEffect: jest.fn(),
}));

import CaregiverRolesScreen from '@/app/(auth)/caregiver-roles';

describe('Auth: Caregiver Roles Screen (Phase 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Renders ──────────────────────────────────────────────────────────────

  it('renders "Join as a Caregiver" title', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getByText('Join as a Caregiver')).toBeTruthy();
  });

  it('renders subtitle "Choose your role to get started"', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getByText('Choose your role to get started')).toBeTruthy();
  });

  it('renders "I\'m a Student" role card', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getByText("I'm a Student")).toBeTruthy();
  });

  it('renders student card subtitle about clinical experience', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getAllByText(/Nursing.*health student/i)[0]).toBeTruthy();
  });

  it('renders "I\'m a 55+ Companion" role card', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getByText("I'm a 55+ Companion")).toBeTruthy();
  });

  it('renders companion card subtitle about reducing loneliness', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getAllByText(/loneliness/i)[0]).toBeTruthy();
  });

  it('renders "I\'m an Agency Owner" role card', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getByText("I'm an Agency Owner")).toBeTruthy();
  });

  it('renders agency owner subtitle', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getAllByText(/Manage your caregiver agency/i)[0]).toBeTruthy();
  });

  it('renders Back button', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getByText('Back')).toBeTruthy();
  });

  it('renders Sign In link', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  it('tapping "I\'m a Student" navigates to signup-student', () => {
    render(<CaregiverRolesScreen />);
    fireEvent.click(screen.getByText("I'm a Student"));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/signup-student');
  });

  it('tapping "I\'m a 55+ Companion" navigates to signup-companion', () => {
    render(<CaregiverRolesScreen />);
    fireEvent.click(screen.getByText("I'm a 55+ Companion"));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/signup-companion');
  });

  it('tapping "I\'m an Agency Owner" navigates to login', () => {
    render(<CaregiverRolesScreen />);
    fireEvent.click(screen.getByText("I'm an Agency Owner"));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('tapping Back calls router.back()', () => {
    render(<CaregiverRolesScreen />);
    fireEvent.click(screen.getByText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('tapping Sign In navigates to login', () => {
    render(<CaregiverRolesScreen />);
    fireEvent.click(screen.getByText('Sign In'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  // ── NEGATIVE ─────────────────────────────────────────────────────────────

  it('NEGATIVE: does NOT render old "Caregiver" card label', () => {
    render(<CaregiverRolesScreen />);
    // Old label was just "Caregiver" — now it's "I'm a Student" and "I'm a 55+ Companion"
    const caregiverTexts = screen.queryAllByText(/^Caregiver$/);
    expect(caregiverTexts).toHaveLength(0);
  });

  it('NEGATIVE: does NOT render "Elder" or "Family Member" role options', () => {
    render(<CaregiverRolesScreen />);
    expect(screen.queryByText(/^Elder$/)).toBeNull();
    expect(screen.queryByText(/^Family Member$/)).toBeNull();
  });
});
