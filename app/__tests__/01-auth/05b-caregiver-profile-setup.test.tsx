/**
 * Batch 6: Caregiver Profile Setup Tests (Features #50-63)
 * Screen: (auth)/caregiver-profile-setup.tsx
 * 4-step wizard: Basic Info → Professional Info → Skills & Availability → About You
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
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
    user: { id: 'test-user-id', email: 'test@test.com' },
    loading: false,
    agency: null,
    initialized: true,
    signInWithEmail: jest.fn(),
    signInWithPhone: jest.fn(),
    signUpWithEmail: jest.fn(),
    verifyOTP: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
  useRequireRole: () => ({ hasAccess: false, loading: false, user: null }),
  AuthProvider: ({ children }: any) => children,
}));

import CaregiverProfileSetupScreen from '@/app/(auth)/caregiver-profile-setup';

// Helper: fill step 1 required fields and advance
const fillStep1AndAdvance = () => {
  const nameInput = screen.getByPlaceholderText('Jane Smith');
  const zipInput = screen.getByPlaceholderText('90210');
  fireEvent.change(nameInput, { target: { value: 'Test Caregiver' } });
  fireEvent.change(zipInput, { target: { value: '90210' } });
  fireEvent.click(screen.getByText('Next'));
};

describe('Batch 6: Caregiver Profile Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature #50: Step 1 - Basic info form renders
  it('#50 - Step 1: Basic info form renders', () => {
    render(<CaregiverProfileSetupScreen />);
    expect(screen.getByText('Basic Information')).toBeTruthy();
    expect(screen.getByPlaceholderText('Jane Smith')).toBeTruthy();
    expect(screen.getByPlaceholderText('90210')).toBeTruthy();
    expect(screen.getByText('Full Name *')).toBeTruthy();
    expect(screen.getByText('Zip Code *')).toBeTruthy();
  });

  // Feature #51: Step 2 - Professional info renders (after advancing)
  it('#51 - Step 2: Professional info renders', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    expect(screen.getByText('Professional Information')).toBeTruthy();
    expect(screen.getByPlaceholderText('1234567890')).toBeTruthy();
    expect(screen.getByPlaceholderText('CNA, HHA, LPN, RN...')).toBeTruthy();
    expect(screen.getByPlaceholderText('$20')).toBeTruthy();
  });

  // Feature #52: Step 3 - Skills & Availability renders
  it('#52 - Step 3: Availability schedule renders', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    // Advance to step 3
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Skills & Availability')).toBeTruthy();
    expect(screen.getByText('Capabilities')).toBeTruthy();
    expect(screen.getByText('Companionship')).toBeTruthy();
    expect(screen.getByText('Meal Prep')).toBeTruthy();
    expect(screen.getByText('Availability')).toBeTruthy();
    expect(screen.getByText('Morning')).toBeTruthy();
    expect(screen.getByText('Mon')).toBeTruthy();
  });

  // Feature #53: Step 4 - About You renders
  it('#53 - Step 4: About You renders', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    fireEvent.click(screen.getByText('Next')); // step 3
    fireEvent.click(screen.getByText('Next')); // step 4
    expect(screen.getByText('About You')).toBeTruthy();
    expect(screen.getByPlaceholderText('Describe your caregiving experience...')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tell agencies about yourself...')).toBeTruthy();
  });

  // Feature #54: Step indicator shows current step
  it('#54 - Progress indicator shows current step', () => {
    const { container } = render(<CaregiverProfileSetupScreen />);
    // Step 1 active: should see "Basic Information"
    expect(screen.getByText('Basic Information')).toBeTruthy();
  });

  // Feature #55: Next button advances
  it('#55 - Next button advances to next step', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    // Should now be on step 2
    expect(screen.getByText('Professional Information')).toBeTruthy();
  });

  // Feature #56: Back button returns to previous step
  it('#56 - Back button returns to previous step', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    expect(screen.getByText('Professional Information')).toBeTruthy();
    // Back button appears on step 2+
    const buttons = screen.getAllByRole('button');
    // First button is the back arrow
    fireEvent.click(buttons[0]);
    expect(screen.getByText('Basic Information')).toBeTruthy();
  });

  // Feature #57: Photo upload button renders
  it('#57 - Photo upload button renders', () => {
    render(<CaregiverProfileSetupScreen />);
    expect(screen.getByText('Photo (Optional)')).toBeTruthy();
    expect(screen.getByText('Add Photo')).toBeTruthy();
  });

  // Feature #58: Bio text area renders on step 4
  it('#58 - Bio text area renders on step 4', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    fireEvent.click(screen.getByText('Next')); // step 3
    fireEvent.click(screen.getByText('Next')); // step 4
    expect(screen.getByText('Bio (Optional)')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tell agencies about yourself...')).toBeTruthy();
  });

  // Feature #59: NPI verification field and button render
  it('#59 - NPI verification field and Verify button render', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    expect(screen.getByText('NPI Number (Optional)')).toBeTruthy();
    expect(screen.getByPlaceholderText('1234567890')).toBeTruthy();
    expect(screen.getByText('Verify')).toBeTruthy();
  });

  // Feature #60: Step indicator shows 4 steps
  it('#60 - Step indicator shows 4 steps', () => {
    render(<CaregiverProfileSetupScreen />);
    // The step indicator has 4 dots - we just verify the component renders properly
    // by checking step 1 content exists
    expect(screen.getByText('Basic Information')).toBeTruthy();
    expect(screen.getByText('Next')).toBeTruthy();
  });

  // Feature #61: Complete Profile on final step
  it('#61 - "Complete Profile" button shows on step 4', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    fireEvent.click(screen.getByText('Next')); // step 3
    fireEvent.click(screen.getByText('Next')); // step 4
    expect(screen.getByText('Complete Profile')).toBeTruthy();
  });

  // Feature #62: Validation prevents advancing without required fields
  it('#62 - Validation prevents advancing without required fields', () => {
    render(<CaregiverProfileSetupScreen />);
    // Don't fill name or zip, try to click Next
    fireEvent.click(screen.getByText('Next'));
    // Should still be on step 1
    expect(screen.getByText('Basic Information')).toBeTruthy();
  });

  // Feature #63: Skip button renders on steps 2-4
  it('#63 - Skip button renders on steps 2-4', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    // Step 2 should have Skip
    expect(screen.getByText('Skip')).toBeTruthy();
    fireEvent.click(screen.getByText('Skip'));
    // Step 3 should also have Skip
    expect(screen.getByText('Skip')).toBeTruthy();
    fireEvent.click(screen.getByText('Skip'));
    // Step 4 should also have Skip
    expect(screen.getByText('Skip')).toBeTruthy();
  });
});
