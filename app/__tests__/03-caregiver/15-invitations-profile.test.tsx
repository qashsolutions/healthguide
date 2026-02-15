/**
 * Batch 19: Pending Invitations + My Profile Tests (Features #176-185)
 * Screens: pending-invitations.tsx, my-profile.tsx
 * Note: schedule.tsx does not exist — features #184-185 will be marked skip-stub
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

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
  Link: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: { Screen: ({ options }: any) => null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
  useFocusEffect: jest.fn((callback: any) => {
    const ReactInner = require('react');
    ReactInner.useEffect(() => { callback(); }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'caregiver-1', full_name: 'Maria Garcia', agency_id: 'agency-1' },
    agency: { id: 'agency-1', name: 'Sunny Day Home Care' },
    loading: false,
    initialized: true,
    signInWithEmail: jest.fn(),
    signInWithPhone: jest.fn(),
    signUpWithEmail: jest.fn(),
    verifyOTP: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => true),
  }),
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'caregiver-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock RatingSummary and ReviewsList
jest.mock('@/components/caregiver/RatingSummary', () => ({
  RatingSummary: ({ ratingCount, positiveCount }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, `Ratings: ${ratingCount || 0} total, ${positiveCount || 0} positive`);
  },
}));

jest.mock('@/components/caregiver/ReviewsList', () => ({
  ReviewsList: () => null,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 days ago'),
}));

// Supabase mock
const mockSingle = jest.fn();
const mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: mockSingle,
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'caregiver-1' } } }),
      signInWithPassword: jest.fn(),
      signInWithOtp: jest.fn(),
      signUp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/photo.jpg' } })) })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import PendingInvitationsScreen from '@/app/(protected)/caregiver/pending-invitations';
import MyProfileScreen from '@/app/(protected)/caregiver/my-profile';

describe('Batch 19: Pending Invitations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Return empty list (empty state) by default
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #176: Pending invitations list renders with empty state
  it('#176 - Pending invitations empty state renders', async () => {
    render(<PendingInvitationsScreen />);
    await waitFor(() => {
      expect(screen.getByText('No pending invitations')).toBeTruthy();
    });
    expect(screen.getByText('All your care group invitations have been addressed')).toBeTruthy();
  });

  // Feature #177: Invitation card shows agency name
  it('#177 - Invitation card shows agency name and elder', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [
          {
            id: 'inv-1',
            name: 'Maria Garcia',
            role: 'caregiver',
            consent_status: 'pending',
            consent_requested_at: '2026-02-13T10:00:00Z',
            is_active: true,
            care_group: {
              id: 'cg-1',
              name: 'Smith Family Care',
              elder_id: 'elder-1',
              elder: { first_name: 'Dorothy', last_name: 'Smith' },
              agency: { name: 'Sunny Day Home Care' },
            },
          },
        ],
        error: null,
      })
    );

    render(<PendingInvitationsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Sunny Day Home Care')).toBeTruthy();
    });
    expect(screen.getByText(/Care for Dorothy Smith/)).toBeTruthy();
    expect(screen.getByText('Smith Family Care')).toBeTruthy();
  });

  // Feature #178: Accept button renders on invitation card
  it('#178 - Accept button renders on invitation card', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [
          {
            id: 'inv-1',
            name: 'Maria Garcia',
            role: 'caregiver',
            consent_status: 'pending',
            consent_requested_at: '2026-02-13T10:00:00Z',
            is_active: true,
            care_group: {
              id: 'cg-1',
              name: 'Smith Family Care',
              elder_id: 'elder-1',
              elder: { first_name: 'Dorothy', last_name: 'Smith' },
              agency: { name: 'Sunny Day Home Care' },
            },
          },
        ],
        error: null,
      })
    );

    render(<PendingInvitationsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Accept')).toBeTruthy();
    });
  });

  // Feature #179: Decline button renders on invitation card
  it('#179 - Decline button renders on invitation card', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [
          {
            id: 'inv-1',
            name: 'Maria Garcia',
            role: 'caregiver',
            consent_status: 'pending',
            consent_requested_at: '2026-02-13T10:00:00Z',
            is_active: true,
            care_group: {
              id: 'cg-1',
              name: 'Smith Family Care',
              elder_id: 'elder-1',
              elder: { first_name: 'Dorothy', last_name: 'Smith' },
              agency: { name: 'Sunny Day Home Care' },
            },
          },
        ],
        error: null,
      })
    );

    render(<PendingInvitationsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Decline')).toBeTruthy();
    });
  });
});

describe('Batch 19: My Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Profile screen uses .single() to fetch profile
    mockSingle.mockResolvedValue({
      data: {
        id: 'profile-1',
        user_id: 'caregiver-1',
        full_name: 'Maria Garcia',
        zip_code: '90210',
        photo_url: null,
        npi_number: '',
        npi_verified: false,
        certifications: ['CNA', 'HHA'],
        hourly_rate: 25,
        capabilities: ['companionship', 'meal_preparation'],
        availability: {
          monday: ['morning'],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        },
        experience_summary: 'Experienced caregiver',
        bio: 'Compassionate and dedicated',
        is_active: true,
        rating_count: 5,
        positive_count: 4,
      },
      error: null,
    });
  });

  // Feature #180: My profile screen renders with header
  it('#180 - My profile header renders', async () => {
    render(<MyProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Edit Marketplace Profile')).toBeTruthy();
    });
  });

  // Feature #181: Profile shows section titles
  it('#181 - Profile shows section titles', async () => {
    render(<MyProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Basic Information')).toBeTruthy();
    });
    expect(screen.getByText('Professional Information')).toBeTruthy();
    expect(screen.getByText('Capabilities')).toBeTruthy();
    expect(screen.getByText('Availability')).toBeTruthy();
  });

  // Feature #182: Profile edit fields render (name, zip, certifications, rate)
  it('#182 - Profile edit form fields render', async () => {
    render(<MyProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Full Name *')).toBeTruthy();
    });
    expect(screen.getByText('Zip Code *')).toBeTruthy();
    expect(screen.getByText('Certifications')).toBeTruthy();
    expect(screen.getByText('Hourly Rate')).toBeTruthy();
  });

  // Feature #183: Save Changes button renders
  it('#183 - \"Save Changes\" button renders', async () => {
    render(<MyProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeTruthy();
    });
  });
});
