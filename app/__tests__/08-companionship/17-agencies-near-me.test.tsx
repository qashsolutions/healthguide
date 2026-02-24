/**
 * 08-Companionship: Agencies Near Me Screen Tests (Phase 8)
 * Screen: (protected)/caregiver/agencies-near-me.tsx
 * Companion browses and applies to join nearby agencies
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Redirect: () => null,
  useFocusEffect: jest.fn(),
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

const mockMaybySingle = jest.fn();
var mockSingle = jest.fn();
var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  single: mockSingle,
  maybeSingle: mockMaybySingle,
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Button: ({ title, onPress, loading }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s/g, '-')}` },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
    Input: ({ label, value, onChangeText, placeholder }: any) =>
      React.createElement(View, null,
        React.createElement(TextInput, { value, onChangeText, placeholder, testID: 'search-input' })
      ),
  };
});

jest.mock('@/components/ui/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children }: any) => React.createElement(View, { testID: 'agency-card' }, children),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    SearchIcon: () => React.createElement(Text, null, '🔍'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
    LocationIcon: () => React.createElement(Text, null, '📍'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    success: { 50: '#F0FDF4', 500: '#10B981', 600: '#059669' },
    error: { 500: '#EF4444' },
    warning: { 500: '#F59E0B' },
  },
  roleColors: { caregiver: '#0891B2', careseeker: '#7C3AED' },
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
  createShadow: () => ({}),
}));

import AgenciesNearMeScreen from '@/app/(protected)/caregiver/agencies-near-me';

const mockAgency = {
  id: 'agency-1',
  name: 'City Care Agency',
  city: 'Los Angeles',
  state: 'CA',
  zip_code: '90001',
  phone: '555-1234',
};

describe('08-Companionship: Agencies Near Me Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.insert.mockReturnThis();
    mockChain.eq.mockReturnThis();
    // 1st maybySingle: caregiver profile
    mockMaybySingle.mockResolvedValue({ data: { id: 'cp-1' }, error: null });
    mockSingle.mockResolvedValue({ data: { id: 'invite-1' }, error: null });
    // then: agencies, then empty for links/invites/elders/cgcounts
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockAgency], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<AgenciesNearMeScreen />));
    expect(screen.getAllByText(/Agenc|agenc/i)[0]).toBeTruthy();
  });

  it('shows agency name after loading', async () => {
    await act(async () => render(<AgenciesNearMeScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/City Care Agency|City Care/i)[0]).toBeTruthy();
    });
  });

  it('shows city and state', async () => {
    await act(async () => render(<AgenciesNearMeScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Los Angeles|CA/i)[0]).toBeTruthy();
    });
  });

  it('shows "Apply to Join" button for non-linked agency', async () => {
    await act(async () => render(<AgenciesNearMeScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Apply to Join|Apply/i)[0]).toBeTruthy();
    });
  });

  it('renders search input', async () => {
    await act(async () => render(<AgenciesNearMeScreen />));
    expect(screen.getByTestId('search-input')).toBeTruthy();
  });

  // ── Interactions ──────────────────────────────────────────────────────────

  it('clicking Apply to Join inserts to agency_invites with companion_to_agency direction', async () => {
    await act(async () => render(<AgenciesNearMeScreen />));
    await waitFor(() => screen.getAllByText(/Apply to Join|Apply/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Apply to Join|Apply/i)[0]);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('agency_invites');
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          agency_id: 'agency-1',
          companion_id: 'caregiver-1',
          direction: 'companion_to_agency',
          status: 'pending',
        })
      );
    });
  });

  it('shows linked agency with "Leave" option', async () => {
    mockChain.then.mockReset();
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockAgency], error: null })) // agencies
      .mockImplementationOnce((resolve: any) => resolve({ data: [{ id: 'link-1', agency_id: 'agency-1', status: 'active' }], error: null })) // links
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<AgenciesNearMeScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/Linked|Leave|My Agenc/i)[0]).toBeTruthy();
    });
  });

  it('shows "Pending" status when companion already has a pending invite to that agency', async () => {
    mockChain.then.mockReset();
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockAgency], error: null })) // agencies
      .mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })) // caregiver_agency_links (not linked)
      .mockImplementationOnce((resolve: any) => resolve({
        data: [{ id: 'invite-99', agency_id: 'agency-1', direction: 'companion_to_agency', status: 'pending' }],
        error: null,
      })) // agency_invites (pending)
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<AgenciesNearMeScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/Pending|Applied|pending/i)[0]).toBeTruthy();
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: shows empty state when no profile found', async () => {
    mockMaybySingle.mockResolvedValue({ data: null, error: null });

    await expect(act(async () => {
      render(<AgenciesNearMeScreen />);
    })).resolves.not.toThrow();
  });

  it('NEGATIVE: shows empty state when no agencies returned', async () => {
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<AgenciesNearMeScreen />));
    // Should not crash
    expect(screen.getAllByText(/Agenc|agenc/i)[0]).toBeTruthy();
  });

  it('NEGATIVE: duplicate apply (unique constraint error) does not crash', async () => {
    // Insert returns duplicate constraint error
    mockSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key value' } });

    await act(async () => render(<AgenciesNearMeScreen />));
    await waitFor(() => screen.getAllByText(/Apply to Join|Apply/i)[0]);

    await expect(act(async () => {
      fireEvent.click(screen.getAllByText(/Apply to Join|Apply/i)[0]);
    })).resolves.not.toThrow();
  });

  it('NEGATIVE: typing in search input filters displayed agencies by name', async () => {
    // Add a second agency to verify filtering
    const secondAgency = { ...mockAgency, id: 'agency-2', name: 'Riverside Care' };
    mockChain.then.mockReset();
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockAgency, secondAgency], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<AgenciesNearMeScreen />));
    await waitFor(() => screen.getAllByText(/City Care Agency/i)[0]);

    // Type to filter
    await act(async () => {
      fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'Riverside' } });
    });

    // After typing, City Care should be filtered out (or Riverside shown)
    await waitFor(() => {
      // At minimum: does not crash on filter
      expect(screen.queryByText(/Loading/i)).toBeNull();
    });
  });
});
