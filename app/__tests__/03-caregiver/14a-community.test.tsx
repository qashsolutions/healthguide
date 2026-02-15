/**
 * Batch 17: Community + Wellness + Resources Tests (Features #159-168)
 * Screens: community.tsx, community/wellness.tsx, community/resources.tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

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

// Supabase mock
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
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
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import CommunityScreen from '@/app/(protected)/caregiver/(tabs)/community';
import WellnessScreen from '@/app/(protected)/caregiver/community/wellness';
import ResourcesScreen from '@/app/(protected)/caregiver/community/resources';

describe('Batch 17: Community Tab', () => {
  beforeEach(() => jest.clearAllMocks());

  // Feature #159: Community header renders
  it('#159 - Community "Support" title renders', () => {
    render(<CommunityScreen />);
    expect(screen.getByText('Support')).toBeTruthy();
    expect(screen.getByText('Connect with fellow caregivers')).toBeTruthy();
  });

  // Feature #162: Support groups section renders
  it('#162 - Support Groups section renders with group names', () => {
    render(<CommunityScreen />);
    expect(screen.getByText('Support Groups')).toBeTruthy();
    expect(screen.getByText('New Caregiver Support')).toBeTruthy();
    expect(screen.getByText('Self-Care Corner')).toBeTruthy();
    expect(screen.getByText('Dementia Care')).toBeTruthy();
  });

  // Feature #168: Quick Actions section renders
  it('#168 - Quick Actions section with navigation cards', () => {
    render(<CommunityScreen />);
    expect(screen.getByText('Quick Actions')).toBeTruthy();
    expect(screen.getByText('Chat with Peer')).toBeTruthy();
    expect(screen.getByText('Resources')).toBeTruthy();
    expect(screen.getByText('Get Help Now')).toBeTruthy();
    expect(screen.getByText('Journal')).toBeTruthy();
  });

  // Feature #160 (from community screen): Daily Check-in card renders
  it('#160 - Daily Check-in wellness prompt renders', () => {
    render(<CommunityScreen />);
    expect(screen.getByText('Daily Check-in')).toBeTruthy();
    expect(screen.getByText('How are you feeling today?')).toBeTruthy();
  });
});

describe('Batch 17: Wellness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #163: Wellness check-in form renders
  it('#163 - Wellness "Daily Check-in" title renders', async () => {
    render(<WellnessScreen />);
    await waitFor(() => {
      expect(screen.getByText('Daily Check-in')).toBeTruthy();
    });
  });

  // Feature #166: Mood/Energy/Stress scales render
  it('#166 - Mood, Energy, Stress scale selectors render', async () => {
    render(<WellnessScreen />);
    await waitFor(() => {
      expect(screen.getByText('Mood')).toBeTruthy();
    });
    expect(screen.getByText('Energy')).toBeTruthy();
    expect(screen.getByText('Stress')).toBeTruthy();
  });

  // Feature #167: Save Check-in button renders
  it('#167 - "Save Check-in" button renders', async () => {
    render(<WellnessScreen />);
    await waitFor(() => {
      expect(screen.getByText('Save Check-in')).toBeTruthy();
    });
  });
});

describe('Batch 17: Resources', () => {
  beforeEach(() => jest.clearAllMocks());

  // Feature #161: Resources section renders categories
  it('#161 - Resource categories render', () => {
    render(<ResourcesScreen />);
    expect(screen.getByText('Training')).toBeTruthy();
    expect(screen.getByText('Wellness')).toBeTruthy();
    expect(screen.getByText('Legal')).toBeTruthy();
    expect(screen.getByText('Benefits')).toBeTruthy();
  });

  // Feature #164: Resource cards show title and description
  it('#164 - Resource cards show title and description', () => {
    render(<ResourcesScreen />);
    expect(screen.getByText('CMS EVV Requirements')).toBeTruthy();
    expect(screen.getByText('Caregiver Burnout Prevention')).toBeTruthy();
    expect(screen.getByText('HIPAA for Caregivers')).toBeTruthy();
  });

  // Feature #165: Multiple resources per category
  it('#165 - All resource items render', () => {
    render(<ResourcesScreen />);
    expect(screen.getByText('Caregiver Training Resources')).toBeTruthy();
    expect(screen.getByText('First Aid & CPR Certification')).toBeTruthy();
    expect(screen.getByText('Mental Health Support')).toBeTruthy();
    expect(screen.getByText('Healthcare.gov')).toBeTruthy();
  });
});
