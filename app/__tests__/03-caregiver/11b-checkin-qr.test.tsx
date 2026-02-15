/**
 * Batch 14: QR Check-In Tests (Features #134-139)
 * Screen: visit/[id]/qr-checkin.tsx
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

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
  useFocusEffect: jest.fn(),
}));

// Mock expo-camera - default to permission denied state (testable in web)
const mockRequestPermission = jest.fn();
let mockPermission: { granted: boolean } | null = { granted: false };

jest.mock('expo-camera', () => ({
  CameraView: ({ children }: any) => children ?? null,
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  hapticFeedback: jest.fn(),
  vibrate: jest.fn(),
}));

// Supabase mock
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

import QRCheckInScreen from '@/app/(protected)/caregiver/visit/[id]/qr-checkin';

describe('Batch 14: QR Check-In', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermission = { granted: false };
  });

  // Feature #134: QR Check-In header renders
  it('#134 - QR Check-In header renders', () => {
    render(<QRCheckInScreen />);
    expect(screen.getByText('QR Check-In')).toBeTruthy();
  });

  // Feature #135: Camera permission request shown
  it('#135 - Camera permission request shows "Camera Access Needed"', () => {
    mockPermission = { granted: false };
    render(<QRCheckInScreen />);
    expect(screen.getByText('Camera Access Needed')).toBeTruthy();
    expect(screen.getByText(/camera access to scan the QR code/)).toBeTruthy();
  });

  // Feature #136: Allow Camera Access button renders
  it('#136 - "Allow Camera Access" button renders', () => {
    mockPermission = { granted: false };
    render(<QRCheckInScreen />);
    expect(screen.getByText('Allow Camera Access')).toBeTruthy();
  });

  // Feature #137: Go Back button renders in permission denied state
  it('#137 - "Go Back" button renders in permission denied state', () => {
    mockPermission = { granted: false };
    render(<QRCheckInScreen />);
    expect(screen.getByText('Go Back')).toBeTruthy();
  });

  // Feature #138: Camera granted shows instruction text
  it('#138 - Camera granted shows scan instruction', () => {
    mockPermission = { granted: true };
    render(<QRCheckInScreen />);
    expect(screen.getByText(/Point your camera at the QR code/)).toBeTruthy();
  });

  // Feature #139: Help text renders when camera granted
  it('#139 - "QR code not working?" help text renders', () => {
    mockPermission = { granted: true };
    render(<QRCheckInScreen />);
    expect(screen.getByText(/QR code not working/)).toBeTruthy();
  });
});
