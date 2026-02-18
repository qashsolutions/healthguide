/**
 * Batch 6: Caregiver Profile Setup Tests (Features #50-63)
 * Screen: (protected)/caregiver/profile-setup.tsx
 * 3-step wizard: Basic Info → Skills & Rate → Schedule & About
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
    user: { id: 'test-user-id', email: 'test@test.com', agency_id: null },
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

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      updateUser: jest.fn().mockResolvedValue({ data: null, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'photo.jpg' }, error: null }),
      })),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

import CaregiverProfileSetupScreen from '@/app/(protected)/caregiver/profile-setup';

// Helper: fill step 1 required fields and advance
const fillStep1AndAdvance = () => {
  const nameInput = screen.getByPlaceholderText('Jane Smith');
  const zipInput = screen.getByPlaceholderText('90210');
  fireEvent.change(nameInput, { target: { value: 'Test Caregiver' } });
  fireEvent.change(zipInput, { target: { value: '90210' } });
  fireEvent.click(screen.getByText('Continue'));
};

describe('Batch 6: Caregiver Profile Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature #50: Step 1 - Basic info form renders
  it('#50 - Step 1: Basic info form renders', () => {
    render(<CaregiverProfileSetupScreen />);
    expect(screen.getByText("Let's get started")).toBeTruthy();
    expect(screen.getByPlaceholderText('Jane Smith')).toBeTruthy();
    expect(screen.getByPlaceholderText('90210')).toBeTruthy();
    expect(screen.getByText('Full Name *')).toBeTruthy();
    expect(screen.getByText('Zip Code *')).toBeTruthy();
  });

  // Feature #51: Step 2 - Skills & Rate renders (after advancing)
  it('#51 - Step 2: Skills & Rate renders', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    expect(screen.getByText('Your skills')).toBeTruthy();
    expect(screen.getByPlaceholderText('CNA, HHA, LPN, RN...')).toBeTruthy();
  });

  // Feature #52: Step 3 - Schedule & About renders
  it('#52 - Step 3: Schedule & About renders', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    // Advance to step 3 via skip
    fireEvent.click(screen.getByText('Skip for now'));
    expect(screen.getByText('Your schedule')).toBeTruthy();
    expect(screen.getByText('Full-Time')).toBeTruthy();
    expect(screen.getByText('Mornings')).toBeTruthy();
    expect(screen.getByText('Mon')).toBeTruthy();
  });

  // Feature #53: Step 3 - About You fields render
  it('#53 - Step 3: Experience and Bio fields render', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    fireEvent.click(screen.getByText('Skip for now')); // step 3
    expect(screen.getByPlaceholderText('Describe your caregiving experience...')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tell agencies about yourself...')).toBeTruthy();
  });

  // Feature #54: Step indicator shows current step
  it('#54 - Progress indicator shows current step', () => {
    render(<CaregiverProfileSetupScreen />);
    expect(screen.getByText('Basic Info')).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
  });

  // Feature #55: Continue button advances
  it('#55 - Continue button advances to next step', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    // Should now be on step 2
    expect(screen.getByText('Skills & Rate')).toBeTruthy();
    expect(screen.getByText('2/3')).toBeTruthy();
  });

  // Feature #56: Back arrow returns to previous step
  it('#56 - Back arrow returns to previous step', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    expect(screen.getByText('Skills & Rate')).toBeTruthy();
    // Back button is the ArrowLeftIcon pressable (first pressable in header)
    const buttons = screen.getAllByRole('button');
    // Click the first one (back arrow)
    fireEvent.click(buttons[0]);
    expect(screen.getByText('Basic Info')).toBeTruthy();
  });

  // Feature #57: Photo upload button renders
  it('#57 - Photo upload button renders', () => {
    render(<CaregiverProfileSetupScreen />);
    expect(screen.getByText('Photo (Optional)')).toBeTruthy();
    expect(screen.getByText('Add Photo')).toBeTruthy();
  });

  // Feature #58: Bio text area renders on step 3
  it('#58 - Bio text area renders on step 3', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    fireEvent.click(screen.getByText('Skip for now')); // step 3
    expect(screen.getByText('Bio')).toBeTruthy();
    expect(screen.getByPlaceholderText('Tell agencies about yourself...')).toBeTruthy();
  });

  // Feature #59: Certifications field renders on step 2
  it('#59 - Certifications field renders on step 2', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    expect(screen.getByText('Certifications')).toBeTruthy();
    expect(screen.getByPlaceholderText('CNA, HHA, LPN, RN...')).toBeTruthy();
  });

  // Feature #60: Step indicator shows 3 steps
  it('#60 - Step indicator shows step count', () => {
    render(<CaregiverProfileSetupScreen />);
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  // Feature #61: Complete Profile on final step
  it('#61 - "Complete Profile" button shows on step 3', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    fireEvent.click(screen.getByText('Skip for now')); // step 3
    expect(screen.getByText('Complete Profile')).toBeTruthy();
  });

  // Feature #62: Validation prevents advancing without required fields
  it('#62 - Validation prevents advancing without required fields', () => {
    render(<CaregiverProfileSetupScreen />);
    // Don't fill name or zip, try to click Continue
    fireEvent.click(screen.getByText('Continue'));
    // Should still be on step 1
    expect(screen.getByText("Let's get started")).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy();
  });

  // Feature #63: Skip button renders on steps 2-3
  it('#63 - Skip button renders on steps 2 and 3', () => {
    render(<CaregiverProfileSetupScreen />);
    fillStep1AndAdvance();
    // Step 2 should have Skip
    expect(screen.getByText('Skip for now')).toBeTruthy();
    fireEvent.click(screen.getByText('Skip for now'));
    // Step 3 should have skip variant too
    expect(screen.getByText("Skip — I'll fill this in later")).toBeTruthy();
  });
});
