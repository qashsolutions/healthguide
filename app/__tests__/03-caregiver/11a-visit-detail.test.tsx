/**
 * Batch 13: Visit Detail + Check-In Tests (Features #124-133)
 * Screens: visit/[id]/index.tsx, visit/[id]/check-in.tsx
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
  useLocalSearchParams: () => ({ id: 'visit-1' }),
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

// Mock TaskIcons
jest.mock('@/components/icons/TaskIcons', () => ({
  MealIcon: () => null,
  CompanionshipIcon: () => null,
  CleaningIcon: () => null,
  MedicationIcon: () => null,
}));

// Mock location services (native)
jest.mock('@/services/location', () => ({
  requestLocationPermission: jest.fn().mockResolvedValue(true),
  getCurrentLocation: jest.fn().mockResolvedValue({ latitude: 34.05, longitude: -118.25 }),
  isWithinRadius: jest.fn().mockReturnValue(true),
  EVV_RADIUS_METERS: 150,
  formatDistance: jest.fn(() => '50 meters'),
  calculateDistance: jest.fn(() => 50),
}));

// Mock haptics (native)
jest.mock('@/utils/haptics', () => ({
  hapticFeedback: jest.fn(),
  vibrate: jest.fn(),
}));

// Thenable supabase mock with separate single mock
const mockSingle = jest.fn().mockResolvedValue({
  data: {
    id: 'visit-1',
    status: 'scheduled',
    scheduled_start: '10:30',
    scheduled_end: '12:30',
    special_instructions: 'Please ring the doorbell twice.',
    scheduled_date: '2026-02-15',
    start_time: '10:30',
    end_time: '12:30',
    elder: {
      id: 'elder-1',
      first_name: 'John',
      last_name: 'Davis',
      address: '123 Oak Street',
      city: 'Anytown',
      state: 'CA',
      zip_code: '90210',
      latitude: 34.05,
      longitude: -118.25,
    },
  },
  error: null,
});

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
  then: jest.fn((resolve: any) => resolve({
    data: [
      { id: 'task-1', status: 'pending', task: { name: 'Meal preparation', category: 'meal_prep' } },
      { id: 'task-2', status: 'pending', task: { name: 'Companionship', category: 'companionship' } },
    ],
    error: null,
  })),
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

import VisitDetailScreen from '@/app/(protected)/caregiver/visit/[id]/index';
import CheckInScreen from '@/app/(protected)/caregiver/visit/[id]/check-in';

describe('Batch 13: Visit Detail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: {
        id: 'visit-1',
        status: 'scheduled',
        scheduled_start: '10:30',
        scheduled_end: '12:30',
        special_instructions: 'Please ring the doorbell twice.',
        elder: {
          id: 'elder-1',
          first_name: 'John',
          last_name: 'Davis',
          address: '123 Oak Street',
          city: 'Anytown',
          state: 'CA',
          zip_code: '90210',
        },
      },
      error: null,
    });
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [
          { id: 'task-1', status: 'pending', task: { name: 'Meal preparation', category: 'meal_prep' } },
          { id: 'task-2', status: 'pending', task: { name: 'Companionship', category: 'companionship' } },
        ],
        error: null,
      })
    );
  });

  // Feature #124: Visit detail shows elder name
  it('#124 - Visit detail shows elder name', async () => {
    render(<VisitDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('John Davis')).toBeTruthy();
    });
  });

  // Feature #125: Visit detail shows scheduled time
  it('#125 - Visit detail shows scheduled time range', async () => {
    render(<VisitDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText(/10:30.*12:30/)).toBeTruthy();
    });
  });

  // Feature #126: Visit detail shows address
  it('#126 - Visit detail shows full address', async () => {
    render(<VisitDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText(/123 Oak Street.*Anytown.*CA.*90210/)).toBeTruthy();
    });
  });

  // Feature #127: Visit detail shows task count
  it('#127 - Visit detail shows tasks section with count', async () => {
    render(<VisitDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Tasks for this visit/)).toBeTruthy();
    });
  });

  // Feature #132: Notes section renders
  it('#132 - Visit detail shows Notes section', async () => {
    render(<VisitDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Notes')).toBeTruthy();
    });
  });

  // Feature #133: Start Visit button renders
  it('#133 - Visit detail "Start Visit" button renders', async () => {
    render(<VisitDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText('Start Visit')).toBeTruthy();
    });
  });
});

describe('Batch 13: Check-In', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: {
        id: 'visit-1',
        scheduled_date: '2026-02-15',
        start_time: '10:30',
        end_time: '12:30',
        elder: {
          id: 'elder-1',
          first_name: 'John',
          last_name: 'Davis',
          address: '123 Oak Street',
          latitude: 34.05,
          longitude: -118.25,
        },
      },
      error: null,
    });
  });

  // Feature #128: Check-in header renders
  it('#128 - Check-in screen header renders', async () => {
    render(<CheckInScreen />);
    await waitFor(() => {
      expect(screen.getByText('Check In')).toBeTruthy();
    });
  });

  // Feature #129: TAP TO CHECK IN button renders (GPS is native-skip but button itself renders)
  it('#129 - "TAP TO CHECK IN" button renders', async () => {
    render(<CheckInScreen />);
    await waitFor(() => {
      expect(screen.getByText('TAP TO CHECK IN')).toBeTruthy();
    });
  });

  // Feature #130: Client info renders on check-in screen
  it('#130 - Check-in shows client name', async () => {
    render(<CheckInScreen />);
    await waitFor(() => {
      expect(screen.getByText('John Davis')).toBeTruthy();
    });
  });

  // Feature #131: QR code fallback button renders
  it('#131 - "Use QR Code Instead" fallback button renders', async () => {
    render(<CheckInScreen />);
    await waitFor(() => {
      expect(screen.getByText('Use QR Code Instead')).toBeTruthy();
    });
  });
});
