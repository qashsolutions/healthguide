/**
 * 08-Companionship: Companion Visit Request Inbox Tests (Phase 7)
 * Screen: (protected)/caregiver/requests.tsx
 * Companion views and accepts/declines visit requests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: jest.fn(() => true) }),
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

var mockSingle = jest.fn();
const mockMaybySingle = jest.fn();
var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
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
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ title, onPress, loading }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s/g, '-')}` },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
  };
});

jest.mock('@/components/ui/Card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children }: any) => React.createElement(View, { testID: 'request-card' }, children),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    CalendarIcon: () => React.createElement(Text, null, '📅'),
    ClockIcon: () => React.createElement(Text, null, '🕐'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
  };
});

jest.mock('date-fns', () => ({
  format: jest.fn((date: any, fmt: string) => 'Feb 25'),
  addDays: jest.fn((date: any, n: number) => date),
  isToday: jest.fn(() => false),
  isYesterday: jest.fn(() => false),
  parseISO: jest.fn((s: string) => new Date(s)),
}));

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    success: { 50: '#F0FDF4', 500: '#10B981', 600: '#059669', 700: '#047857' },
    error: { 50: '#FEF2F2', 500: '#EF4444', 700: '#B91C1C' },
    warning: { 50: '#FFFBEB', 500: '#F59E0B', 700: '#B45309' },
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

import CompanionRequestsScreen from '@/app/(protected)/caregiver/requests';

const mockRequest = {
  id: 'req-1',
  elder_id: 'elder-1',
  companion_id: 'caregiver-1',
  requested_by: 'user-elder-1',
  requested_date: '2026-02-25',
  requested_time_slot: '10am-12pm',
  tasks: ['companionship'],
  note: 'Please bring board games',
  status: 'pending',
  is_auto_match: false,
  created_at: new Date().toISOString(),
};

const mockElder = {
  id: 'elder-1',
  first_name: 'Dorothy',
  last_name: 'Johnson',
  zip_code: '90210',
};

describe('08-Companionship: Companion Visit Request Inbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.in.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.update.mockReturnThis();
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockMaybySingle.mockResolvedValue({ data: null, error: null });
    // Decline uses window.confirm on web — auto-confirm in tests
    window.confirm = jest.fn().mockReturnValue(true);
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<CompanionRequestsScreen />));
    expect(screen.getAllByText(/Request|Inbox|Visit/i)[0]).toBeTruthy();
  });

  it('shows empty state when no pending requests', async () => {
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<CompanionRequestsScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/No pending|no request|all caught up/i)[0]).toBeTruthy();
    });
  });

  it('shows request with elder name after loading', async () => {
    // First then() = visit_requests, second then() = elders lookup
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockRequest], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockElder], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<CompanionRequestsScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/Dorothy Johnson|Dorothy/i)[0]).toBeTruthy();
    });
  });

  it('shows Accept button for pending request', async () => {
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockRequest], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockElder], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<CompanionRequestsScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/Accept/i)[0]).toBeTruthy();
    });
  });

  it('shows Decline button for pending request', async () => {
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockRequest], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockElder], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<CompanionRequestsScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/Decline/i)[0]).toBeTruthy();
    });
  });

  it('shows requested date and time', async () => {
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockRequest], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockElder], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<CompanionRequestsScreen />));

    await waitFor(() => {
      // Date or time slot shown
      expect(screen.getAllByText(/2026-02-25|Feb 25|10.*AM|10am/i)[0]).toBeTruthy();
    });
  });

  // ── Acceptance ────────────────────────────────────────────────────────────

  it('clicking Accept updates visit_requests status to accepted', async () => {
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockRequest], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockElder], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'visit-new' }, error: null })  // visits insert
      .mockResolvedValue({ data: null, error: null });
    mockMaybySingle.mockResolvedValue({ data: null, error: null });

    await act(async () => render(<CompanionRequestsScreen />));
    await waitFor(() => screen.getAllByText(/Accept/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Accept/i)[0]);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visit_requests');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'accepted' })
      );
    });
  });

  it('clicking Accept inserts to visits table', async () => {
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockRequest], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockElder], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    mockSingle.mockResolvedValue({ data: { id: 'visit-new' }, error: null });
    mockMaybySingle.mockResolvedValue({ data: null, error: null });

    await act(async () => render(<CompanionRequestsScreen />));
    await waitFor(() => screen.getAllByText(/Accept/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Accept/i)[0]);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visits');
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          elder_id: 'elder-1',
          status: 'scheduled',
        })
      );
    });
  });

  // ── Decline ───────────────────────────────────────────────────────────────

  it('clicking Decline updates visit_requests status to declined', async () => {
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockRequest], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockElder], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockMaybySingle.mockResolvedValue({ data: null, error: null });

    await act(async () => render(<CompanionRequestsScreen />));
    await waitFor(() => screen.getAllByText(/Decline/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Decline/i)[0]);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visit_requests');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'declined' })
      );
    });
  });

  it('clicking Accept calls functions.invoke to send notification', async () => {
    const { supabase } = require('@/lib/supabase');
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockRequest], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockElder], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    mockSingle.mockResolvedValue({ data: { id: 'visit-new' }, error: null });
    mockMaybySingle.mockResolvedValue({ data: null, error: null });

    await act(async () => render(<CompanionRequestsScreen />));
    await waitFor(() => screen.getAllByText(/Accept/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Accept/i)[0]);
    });

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: does not crash on fetch error', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: { message: 'RLS denied' } })
    );

    await expect(act(async () => {
      render(<CompanionRequestsScreen />);
    })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not crash when elder lookup returns empty array', async () => {
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockRequest], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })) // empty elders
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await expect(act(async () => {
      render(<CompanionRequestsScreen />);
    })).resolves.not.toThrow();
  });

  it('NEGATIVE: request with null note renders without crash', async () => {
    const requestNullNote = { ...mockRequest, note: null };
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [requestNullNote], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockElder], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await expect(act(async () => {
      render(<CompanionRequestsScreen />);
    })).resolves.not.toThrow();
  });
});
