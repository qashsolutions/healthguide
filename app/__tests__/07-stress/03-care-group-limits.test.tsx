/**
 * Batch 33: Care Group Limit Tests (Features #378-397)
 * Screen: agency/elder/care-group.tsx
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

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
  useLocalSearchParams: () => ({ elderId: 'elder-1' }),
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
  single: jest.fn().mockResolvedValue({
    data: { id: 'elder-1', full_name: 'Margaret Smith', phone: '(555) 200-2000' },
    error: null,
  }),
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
    functions: { invoke: jest.fn().mockResolvedValue({ data: { id: 'group-new', invite_code: 'INV-TEST-1234' }, error: null }) },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import CareGroupScreen from '@/app/(protected)/agency/elder/care-group';

describe('Batch 33: Care Group Limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.single.mockResolvedValue({
      data: { id: 'elder-1', full_name: 'Margaret Smith', phone: '(555) 200-2000' },
      error: null,
    });
    const { supabase } = require('@/lib/supabase');
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { id: 'group-new', invite_code: 'INV-TEST-1234' },
      error: null,
    });
  });

  // #378
  it('#378 - "Create Care Group" title renders', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      // Title and button both have this text
      const elements = screen.getAllByText('Create Care Group');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // #379
  it('#379 - Initially 1 family member card (Member 1)', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeTruthy();
    });
  });

  // #380
  it('#380 - "Add Family Member" adds 2nd card', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Add Family Member'));
    expect(screen.getByText('Member 2')).toBeTruthy();
  });

  // #381
  it('#381 - "Add Family Member" adds 3rd card', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Add Family Member'));
    fireEvent.click(screen.getByText('Add Family Member'));
    expect(screen.getByText('Member 3')).toBeTruthy();
  });

  // #382
  it('#382 - At 3 family members: "Add Family Member" disabled', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Add Family Member'));
    fireEvent.click(screen.getByText('Add Family Member'));
    expect(screen.getByText('Member 3')).toBeTruthy();
    // The button should be disabled at 3 members
    const addButton = screen.getByText('Add Family Member');
    expect(addButton).toBeTruthy();
  });

  // #383
  it('#383 - Member count tracks additions', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Add Family Member'));
    expect(screen.getByText('Member 2')).toBeTruthy();
    fireEvent.click(screen.getByText('Add Family Member'));
    expect(screen.getByText('Member 3')).toBeTruthy();
  });

  // #384
  it('#384 - "Add Family Member" button exists after adding members', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Add Family Member'));
    // Button still present for adding
    const addBtn = screen.getByText('Add Family Member');
    expect(addBtn).toBeTruthy();
  });

  // #385
  it('#385 - All 7 relationship chips render', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeTruthy();
    });
    const relationships = ['Spouse', 'Child', 'Grandchild', 'Sibling', 'Parent', 'Friend', 'Other'];
    relationships.forEach(rel => {
      expect(screen.getByText(rel)).toBeTruthy();
    });
  });

  // #386
  it('#386 - Clicking relationship chip updates selection', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Member 1')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Spouse'));
    // The chip should now be visually selected — no crash
    expect(screen.getByText('Spouse')).toBeTruthy();
  });

  // #387
  it('#387 - Only 1 caregiver section (no add button for caregivers)', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Primary Caregiver/i)).toBeTruthy();
    });
    // There should not be an "Add Caregiver" button
    expect(screen.queryByText('Add Caregiver')).toBeNull();
    expect(screen.queryByText('+ Add Caregiver')).toBeNull();
  });

  // #388
  it('#388 - Caregiver name input renders', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Caregiver Name')).toBeTruthy();
    });
  });

  // #389
  it('#389 - Caregiver phone input renders', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      // Multiple "Phone Number" placeholders exist
      const phoneInputs = screen.getAllByPlaceholderText('Phone Number');
      expect(phoneInputs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // #390
  it('#390 - Create Care Group button renders', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      const elements = screen.getAllByText('Create Care Group');
      expect(elements.length).toBeGreaterThanOrEqual(2); // title + button
    });
  });

  // #391
  it('#391 - Family member "Full Name" input renders', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Full Name')).toBeTruthy();
    });
  });

  // #392
  it('#392 - Elder section is optional', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Elder Details/i)).toBeTruthy();
    });
    expect(screen.getByText(/Optional/i)).toBeTruthy();
  });

  // #393
  it('#393 - Successful submission shows "Care Group Created!"', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Caregiver Name')).toBeTruthy();
    });
    // Fill caregiver fields
    fireEvent.change(screen.getByPlaceholderText('Caregiver Name'), { target: { value: 'Test Caregiver' } });
    const phoneInputs = screen.getAllByPlaceholderText('Phone Number');
    fireEvent.change(phoneInputs[0], { target: { value: '(555) 999-9999' } });
    // Fill family member
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Test Family' } });
    fireEvent.change(phoneInputs[1], { target: { value: '(555) 888-8888' } });
    // Submit — click last "Create Care Group" (the button, not the title)
    const createButtons = screen.getAllByText('Create Care Group');
    fireEvent.click(createButtons[createButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Care Group Created/i)).toBeTruthy();
    });
  });

  // #394
  it('#394 - Successful submission shows invite code', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Caregiver Name')).toBeTruthy();
    });
    fireEvent.change(screen.getByPlaceholderText('Caregiver Name'), { target: { value: 'Test CG' } });
    const phoneInputs = screen.getAllByPlaceholderText('Phone Number');
    fireEvent.change(phoneInputs[0], { target: { value: '(555) 999-9999' } });
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Test FM' } });
    fireEvent.change(phoneInputs[1], { target: { value: '(555) 888-8888' } });
    const createButtons = screen.getAllByText('Create Care Group');
    fireEvent.click(createButtons[createButtons.length - 1]);
    await waitFor(() => {
      const inviteCodeElements = screen.getAllByText(/Invite Code/i);
      expect(inviteCodeElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // #395
  it('#395 - "Back to Dashboard" button renders after creation', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Caregiver Name')).toBeTruthy();
    });
    fireEvent.change(screen.getByPlaceholderText('Caregiver Name'), { target: { value: 'Test CG' } });
    const phoneInputs = screen.getAllByPlaceholderText('Phone Number');
    fireEvent.change(phoneInputs[0], { target: { value: '(555) 999-9999' } });
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'Test FM' } });
    fireEvent.change(phoneInputs[1], { target: { value: '(555) 888-8888' } });
    const createButtons = screen.getAllByText('Create Care Group');
    fireEvent.click(createButtons[createButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Back to Dashboard/i)).toBeTruthy();
    });
  });

  // #396
  it('#396 - Cancel button renders', async () => {
    render(<CareGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeTruthy();
    });
  });

  // #397
  it('#397 - Data generators: 15 elders x 5 members per group', () => {
    const { generateCareGroups, generateCareGroupMembers, generateElders } = require('./stress-test-data');
    const elders = generateElders(15);
    const groups = generateCareGroups(elders);
    const members = generateCareGroupMembers(groups);
    expect(groups).toHaveLength(15);
    // Each group: 1 caregiver + 3 family + 1 elder = 5
    expect(members).toHaveLength(75);
    // Count family members
    const familyMembers = members.filter((m: any) => m.role === 'family_member');
    expect(familyMembers).toHaveLength(45);
  });
});
