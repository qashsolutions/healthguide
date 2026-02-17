/**
 * Batch 8: Agency Elders Tests (Features #78-86)
 * Screens: agency/(tabs)/elders.tsx, agency/elder/[id].tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();

// For elder detail "new" mode
let mockSearchParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => mockSearchParams,
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: { Screen: ({ children }: any) => children ?? null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
  useFocusEffect: jest.fn((callback: any) => {
    const ReactInner = require('react');
    ReactInner.useEffect(() => { callback(); }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-1', full_name: 'Jane Smith', agency_id: 'agency-1' },
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
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'owner-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock CareGroupCard component (imported by elder detail)
jest.mock('@/components/agency/CareGroupCard', () => ({
  CareGroupCard: () => null,
}));

// Mock invite lib (imported by elder detail)
jest.mock('@/lib/invite', () => ({
  shareInvite: jest.fn(),
  buildDeepLink: jest.fn(() => 'https://test.com/invite'),
  cleanInviteCode: jest.fn((code: string) => code),
}));

// Supabase mock with thenable chain
const mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }),
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

import EldersScreen from '@/app/(protected)/agency/(tabs)/elders';
import ElderDetailScreen from '@/app/(protected)/agency/elder/[id]';

describe('Batch 8: Agency Elders List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #78: Elders list renders
  it('#78 - Elders list renders with header', async () => {
    render(<EldersScreen />);
    await waitFor(() => {
      expect(screen.getByText('0 elders')).toBeTruthy();
    });
  });

  // Feature #79: Elder card info (empty state when no data)
  it('#79 - Elder list shows count', async () => {
    render(<EldersScreen />);
    await waitFor(() => {
      expect(screen.getByText('0 elders')).toBeTruthy();
    });
  });

  // Feature #80: Search input renders
  it('#80 - Search elders input renders', async () => {
    render(<EldersScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search elders...')).toBeTruthy();
    });
  });

  // Feature #81: "Add" button renders
  it('#81 - "+ Add" button renders', async () => {
    render(<EldersScreen />);
    await waitFor(() => {
      expect(screen.getByText('+ Add')).toBeTruthy();
    });
  });

  // Feature #86: Empty state when no elders
  it('#86 - Empty state shows when no elders', async () => {
    render(<EldersScreen />);
    await waitFor(() => {
      expect(screen.getByText('No elders yet')).toBeTruthy();
    });
    expect(screen.getByText('Add your first elder to get started')).toBeTruthy();
  });
});

describe('Batch 8: Elder Detail (New Mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { id: 'new' };
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #82: Elder detail form renders in new mode
  it('#82 - Elder form renders with Personal Information section', () => {
    render(<ElderDetailScreen />);
    expect(screen.getByText('Personal Information')).toBeTruthy();
    expect(screen.getByPlaceholderText('John')).toBeTruthy();
    expect(screen.getByPlaceholderText('Smith')).toBeTruthy();
  });

  // Feature #83: Care needs selection renders
  it('#83 - Elder form shows care needs chips', () => {
    render(<ElderDetailScreen />);
    expect(screen.getByText('Care Needs')).toBeTruthy();
    expect(screen.getByText('Companionship')).toBeTruthy();
    expect(screen.getByText('Meal Preparation')).toBeTruthy();
    expect(screen.getByText('Personal Care')).toBeTruthy();
  });

  // Feature #84: Emergency contact fields render
  it('#84 - Elder form shows emergency contact fields', () => {
    render(<ElderDetailScreen />);
    expect(screen.getByText('Emergency Contact')).toBeTruthy();
    expect(screen.getByText('Contact Name')).toBeTruthy();
    expect(screen.getByText('Contact Phone')).toBeTruthy();
  });

  // Feature #85: Save button renders
  it('#85 - Elder form Save button renders', () => {
    render(<ElderDetailScreen />);
    expect(screen.getByText('Save Elder')).toBeTruthy();
  });
});
