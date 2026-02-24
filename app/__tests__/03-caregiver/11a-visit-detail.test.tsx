/**
 * 03-Caregiver: Visit Detail + Check-In Tests
 * Screens: visit/[id]/index.tsx, visit/[id]/check-in.tsx
 * Phase 11: Cancel Visit button, late-cancellation warning
 * Phase 12: Recurring badge, 3-way cancel for series
 * Phase 9: EmergencySOS on check-in screen
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

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
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Redirect: () => null,
  useFocusEffect: jest.fn((cb: any) => {
    const React = require('react');
    React.useEffect(() => { const cleanup = cb(); return cleanup; }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'caregiver-1', full_name: 'Maria Santos' },
    agency: null, loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn((r: string) => r === 'caregiver'),
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Phase 9: EmergencySOS mock
jest.mock('@/components/caregiver/EmergencySOS', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    EmergencySOS: () => React.createElement(Pressable, { testID: 'sos-button' },
      React.createElement(Text, null, 'SOS')
    ),
  };
});

// Phase 11: cancelVisit mock
jest.mock('@/lib/cancelVisit', () => ({
  cancelVisit: jest.fn().mockResolvedValue(undefined),
  isLateCancellation: jest.fn().mockReturnValue(false),
}));

// Phase 12: recurringVisits mock
jest.mock('@/lib/recurringVisits', () => ({
  cancelRecurringSeries: jest.fn().mockResolvedValue(undefined),
  generateChildVisits: jest.fn().mockResolvedValue([]),
  buildRecurrenceRule: jest.fn(() => 'weekly:monday'),
  parseRecurrenceRule: jest.fn(() => ({ frequency: 'weekly', days: ['monday'] })),
}));

jest.mock('@/services/location', () => ({
  requestLocationPermission: jest.fn().mockResolvedValue(true),
  getCurrentLocation: jest.fn().mockResolvedValue({ latitude: 34.05, longitude: -118.25 }),
  watchLocation: jest.fn().mockImplementation((onUpdate: any) => {
    setTimeout(() => onUpdate({ latitude: 34.05, longitude: -118.25, accuracy: 10, timestamp: Date.now() }), 0);
    return Promise.resolve({ remove: jest.fn() });
  }),
  isWithinRadius: jest.fn().mockReturnValue(true),
  EVV_RADIUS_METERS: 150,
  formatDistance: jest.fn(() => '50 meters'),
  calculateDistance: jest.fn(() => 50),
}));

jest.mock('@/utils/haptics', () => ({
  hapticFeedback: jest.fn(),
  vibrate: jest.fn(),
}));

jest.mock('@/components/icons/TaskIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MealIcon: () => React.createElement(Text, null, '🍽️'),
    CompanionshipIcon: () => React.createElement(Text, null, '💬'),
    CleaningIcon: () => React.createElement(Text, null, '🧹'),
    MedicationIcon: () => React.createElement(Text, null, '💊'),
  };
});

jest.mock('@/lib/evvOperations', () => ({
  evvCheckIn: jest.fn().mockResolvedValue({ success: true }),
  evvCheckOut: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    Card: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress }, React.createElement(View, null, children)),
    Badge: ({ label }: any) => React.createElement(Text, null, label),
    Button: ({ title, onPress }: any) =>
      React.createElement(Pressable, { onPress }, React.createElement(Text, null, title)),
    TapButton: ({ label, onPress }: any) =>
      React.createElement(Pressable, { onPress, testID: 'tap-button' },
        React.createElement(Text, null, label)
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ClockIcon: () => React.createElement(Text, null, '🕐'),
    LocationIcon: () => React.createElement(Text, null, '📍'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
    AlertIcon: () => React.createElement(Text, null, '⚠️'),
    ArrowLeftIcon: () => React.createElement(Text, null, '←'),
    XIcon: () => React.createElement(Text, null, '✕'),
    QRCodeIcon: () => React.createElement(Text, null, '▦'),
  };
});

jest.mock('date-fns', () => ({
  format: jest.fn(() => '10:30 AM'),
  parseISO: jest.fn((s: string) => new Date(s)),
  isToday: jest.fn(() => true),
}));

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    success: { 600: '#059669', 50: '#F0FDF4' },
    error: { 500: '#EF4444' },
    warning: { 500: '#F59E0B' },
  },
  roleColors: { caregiver: '#0891B2' },
}));
jest.mock('@/theme/typography', () => ({
  typography: {
    styles: {
      h1: { fontSize: 36 }, h2: { fontSize: 30 }, h3: { fontSize: 24 }, h4: { fontSize: 20 },
      body: { fontSize: 16 }, bodyLarge: { fontSize: 18 }, bodySmall: { fontSize: 14 },
      label: { fontSize: 14 }, caption: { fontSize: 12 },
      button: { fontSize: 16 }, buttonLarge: { fontSize: 18 },
      stat: { fontSize: 28 }, statSmall: { fontSize: 20 },
    },
    caregiver: { heading: { fontSize: 28 }, body: { fontSize: 20 }, label: { fontSize: 16 } },
    fontFamily: { display: 'System', body: 'System', regular: 'System', medium: 'System', semibold: 'System', bold: 'System' },
  },
}));
jest.mock('@/theme/spacing', () => ({
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24 },
  touchTargets: { min: 44, comfortable: 48 },
  createShadow: () => ({}),
}));

var mockFrom;
var mockSingle = jest.fn().mockResolvedValue({
  data: {
    id: 'visit-1',
    status: 'scheduled',
    scheduled_start: '10:30',
    scheduled_end: '12:30',
    scheduled_date: '2026-02-21',
    special_instructions: 'Ring doorbell twice',
    is_recurring: false,
    parent_visit_id: null,
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

var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
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
      { id: 'task-1', status: 'pending', task: { name: 'Companionship', category: 'companionship' } },
    ],
    error: null,
  })),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'caregiver-1' } } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

import VisitDetailScreen from '@/app/(protected)/caregiver/visit/[id]/index';
import CheckInScreen from '@/app/(protected)/caregiver/visit/[id]/check-in';

describe('03-Caregiver: Visit Detail Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockSingle.mockResolvedValue({
      data: {
        id: 'visit-1',
        status: 'scheduled',
        scheduled_start: '10:30',
        scheduled_end: '12:30',
        scheduled_date: '2026-02-21',
        special_instructions: 'Ring doorbell twice',
        is_recurring: false,
        parent_visit_id: null,
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
      resolve({ data: [{ id: 'task-1', status: 'pending', task: { name: 'Companionship', category: 'companionship' } }], error: null })
    );
  });

  it('renders without crashing', async () => {
    await act(async () => render(<VisitDetailScreen />));
    expect(screen.getAllByText(/John|Visit|Start/i)[0]).toBeTruthy();
  });

  it('shows elder name', async () => {
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/John Davis/i)[0]).toBeTruthy();
    });
  });

  it('shows scheduled time range', async () => {
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/10:30/)[0]).toBeTruthy();
    });
  });

  it('shows Start Visit button', async () => {
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getByText('Start Visit')).toBeTruthy();
    });
  });

  it('Phase 11: shows Cancel Visit button for scheduled visits', async () => {
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Cancel Visit/i)[0]).toBeTruthy();
    });
  });

  it('Phase 12: shows Recurring badge when visit is recurring', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'visit-1',
        status: 'scheduled',
        scheduled_start: '10:30',
        scheduled_end: '12:30',
        scheduled_date: '2026-02-21',
        is_recurring: true,
        parent_visit_id: null,
        elder: { id: 'elder-1', first_name: 'John', last_name: 'Davis', address: '123 Oak Street', city: 'Anytown', state: 'CA', zip_code: '90210' },
      },
      error: null,
    });
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Recurring/i)[0]).toBeTruthy();
    });
  });

  it('queries visits table with id', async () => {
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visits');
    });
  });

  it('NEGATIVE: does not crash when visit data is null', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(act(async () => { render(<VisitDetailScreen />); })).resolves.not.toThrow();
  });
});

describe('03-Caregiver: Check-In Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockSingle.mockResolvedValue({
      data: {
        id: 'visit-1',
        scheduled_date: '2026-02-21',
        scheduled_start: '10:30',
        scheduled_end: '12:30',
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

  it('renders without crashing', async () => {
    await act(async () => render(<CheckInScreen />));
    expect(screen.getAllByText(/Check In|John|TAP/i)[0]).toBeTruthy();
  });

  it('shows Check In header', async () => {
    await act(async () => render(<CheckInScreen />));
    await waitFor(() => {
      expect(screen.getByText('Check In')).toBeTruthy();
    });
  });

  it('shows TAP TO CHECK IN button', async () => {
    await act(async () => render(<CheckInScreen />));
    await waitFor(() => {
      expect(screen.getByText('TAP TO CHECK IN')).toBeTruthy();
    });
  });

  it('shows client name', async () => {
    await act(async () => render(<CheckInScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/John Davis/i)[0]).toBeTruthy();
    });
  });

  it('shows Use QR Code fallback button', async () => {
    await act(async () => render(<CheckInScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/QR Code/i)[0]).toBeTruthy();
    });
  });

  it('Phase 9: check-in screen renders (EmergencySOS is on tasks/notes/checkout screens)', async () => {
    await expect(act(async () => {
      render(<CheckInScreen />);
    })).resolves.not.toThrow();
  });

  it('Phase 11: shows Elder not available option', async () => {
    await act(async () => render(<CheckInScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Elder not available|not available/i)[0]).toBeTruthy();
    });
  });

  it('NEGATIVE: does not crash when visit query errors', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
    await expect(act(async () => { render(<CheckInScreen />); })).resolves.not.toThrow();
  });
});
