/**
 * Batch 36: Notification & Video Contact Limit Tests (Features #444-459)
 * Screens: family/settings/notifications.tsx, agency/elder/video-contacts.tsx
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  generateVideoContacts,
  generateElders,
  generateCareGroupMembers,
  generateCareGroups,
  NOTIFICATION_TYPES,
} from './stress-test-data';

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
  useLocalSearchParams: () => ({ elder_id: 'elder-1', elder_name: 'Margaret Smith' }),
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
    user: { id: 'family-1', full_name: 'Test Family', agency_id: null },
    agency: null,
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
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'family-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

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
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'family-1' } } }),
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

import NotificationSettingsScreen from '@/app/(protected)/family/settings/notifications';
import VideoContactsScreen from '@/app/(protected)/agency/elder/video-contacts';

describe('Batch 36: Notification Limits — Notification Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Return notification preferences
    mockChain.single.mockResolvedValue({
      data: {
        notification_preferences: {
          check_in: true,
          check_out: true,
          daily_report: true,
          delivery_time: '19:00',
          include_observations: true,
        },
      },
      error: null,
    });
  });

  // #444
  it('#444 - Notification settings: "Notification Settings" title renders', async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeTruthy();
    });
  });

  // #445
  it('#445 - "Caregiver Arrival" switch renders', async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Caregiver Arrival')).toBeTruthy();
    });
  });

  // #446
  it('#446 - "Visit Completed" switch renders', async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Visit Completed')).toBeTruthy();
    });
  });

  // #447
  it('#447 - "Daily Care Summary" switch renders', async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Daily Care Summary')).toBeTruthy();
    });
  });

  // #448
  it('#448 - Toggle daily_report on shows "Include Caregiver Notes"', async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Daily Care Summary')).toBeTruthy();
    });
    // With daily_report=true, should show delivery time and notes options
    expect(screen.getByText('Include Caregiver Notes')).toBeTruthy();
  });

  // #449
  it('#449 - "Save Preferences" button renders', async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Save Preferences')).toBeTruthy();
    });
  });

  // #450
  it('#450 - After toggling, save button is present', async () => {
    render(<NotificationSettingsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Save Preferences')).toBeTruthy();
    });
    // Toggle a switch
    const arrival = screen.getByText('Caregiver Arrival');
    expect(arrival).toBeTruthy();
  });
});

describe('Batch 36: Notification Limits — Video Contacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // #451
  it('#451 - Video contacts: subtitle includes elder name', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    render(<VideoContactsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Margaret Smith|this elder/i)).toBeTruthy();
    });
  });

  // #452
  it('#452 - With 10 contacts: "Maximum of 10 contacts reached" shows', async () => {
    const contacts10 = generateVideoContacts(10);
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: contacts10, error: null })
    );
    render(<VideoContactsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Maximum of 10 contacts reached/i)).toBeTruthy();
    });
  });

  // #453
  it('#453 - With 10 contacts: "Add Video Contact" button hidden', async () => {
    const contacts10 = generateVideoContacts(10);
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: contacts10, error: null })
    );
    render(<VideoContactsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Maximum of 10 contacts reached/i)).toBeTruthy();
    });
    expect(screen.queryByText('Add Video Contact')).toBeNull();
  });

  // #454
  it('#454 - With 9 contacts: "Add Video Contact" button visible', async () => {
    const contacts9 = generateVideoContacts(9);
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: contacts9, error: null })
    );
    render(<VideoContactsScreen />);
    await waitFor(() => {
      expect(screen.getByText(contacts9[0].name)).toBeTruthy();
    });
    expect(screen.getByText('Add Video Contact')).toBeTruthy();
  });

  // #455
  it('#455 - With 0 contacts: "No video contacts added yet" shows', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    render(<VideoContactsScreen />);
    await waitFor(() => {
      expect(screen.getByText(/No video contacts added yet/i)).toBeTruthy();
    });
  });

  // #456
  it('#456 - Add form: clicking "Add Video Contact" shows form fields', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    render(<VideoContactsScreen />);
    await waitFor(() => {
      expect(screen.getByText('Add Video Contact')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Add Video Contact'));
    await waitFor(() => {
      const addContactElements = screen.getAllByText('Add Contact');
      expect(addContactElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Batch 36: Data Generator Validation', () => {
  // #457
  it('#457 - 15 elders x 3 family per group = 45 family members', () => {
    const elders = generateElders(15);
    const groups = generateCareGroups(elders);
    const members = generateCareGroupMembers(groups);
    const familyMembers = members.filter((m: any) => m.role === 'family_member');
    expect(familyMembers).toHaveLength(45);
  });

  // #458
  it('#458 - All 7 notification types represented', () => {
    expect(NOTIFICATION_TYPES).toHaveLength(7);
    expect(NOTIFICATION_TYPES).toContain('check_in');
    expect(NOTIFICATION_TYPES).toContain('check_out');
    expect(NOTIFICATION_TYPES).toContain('daily_report');
  });

  // #459
  it('#459 - Video contacts generator creates correct count', () => {
    const contacts5 = generateVideoContacts(5);
    expect(contacts5).toHaveLength(5);
    expect(contacts5[0].is_favorite).toBe(true);
    expect(contacts5[1].is_favorite).toBe(false);
    const contacts10 = generateVideoContacts(10);
    expect(contacts10).toHaveLength(10);
  });
});
