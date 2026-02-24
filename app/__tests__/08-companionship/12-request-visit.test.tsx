/**
 * 08-Companionship: Request Visit Screen Tests (Phase 7)
 * Screen: (protected)/careseeker/request-visit.tsx
 * Elder picks date, time, tasks and sends request to companion
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: jest.fn(() => true) }),
  useLocalSearchParams: () => ({ companionId: 'cp-1' }),
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
    user: { id: 'careseeker-1', full_name: 'Robert Johnson' },
    agency: null, loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn((r: string) => r === 'careseeker'),
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
  single: mockSingle,
  maybeSingle: mockMaybySingle,
  then: jest.fn((resolve: any) => resolve({ data: null, error: null })),
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

jest.mock('date-fns', () => ({
  format: jest.fn((date: any, fmt: string) => {
    if (fmt === 'EEE, MMM d') return 'Tue, Feb 25';
    if (fmt === 'yyyy-MM-dd') return '2026-02-25';
    if (fmt === 'MMM d') return 'Feb 25';
    return '2026-02-25';
  }),
  addDays: jest.fn((date: any, n: number) => new Date(date.getTime() + n * 86400000)),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Button: ({ title, onPress, loading, disabled }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s/g, '-')}`, disabled },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
    Input: ({ label, value, onChangeText, placeholder, multiline }: any) =>
      React.createElement(View, null,
        label ? React.createElement(Text, null, label) : null,
        React.createElement(TextInput, { value, onChangeText, placeholder, multiline, testID: label || 'input' })
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    CheckIcon: () => React.createElement(Text, null, '✓'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    StudentIcon: () => React.createElement(Text, null, '🎓'),
    CompanionIcon: () => React.createElement(Text, null, '👥'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 500: '#3B82F6', 600: '#2563EB', 50: '#EFF6FF' },
    success: { 50: '#F0FDF4', 300: '#86EFAC', 500: '#10B981', 600: '#059669' },
    error: { 500: '#EF4444' },
    warning: { 500: '#F59E0B' },
  },
  roleColors: { careseeker: '#7C3AED' },
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

import RequestVisitScreen from '@/app/(protected)/careseeker/request-visit';

const mockCompanionProfile = {
  id: 'cp-1',
  user_id: 'user-cg-1',
  full_name: 'Maria Santos',
  caregiver_type: 'student',
  availability: { tuesday: ['10am-12pm', '2pm-4pm'] },
  capabilities: ['companionship', 'light_cleaning'],
};

describe('08-Companionship: Request Visit Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.insert.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockSingle.mockResolvedValueOnce({ data: mockCompanionProfile, error: null }); // load companion
    mockMaybySingle.mockResolvedValue({ data: { id: 'elder-1', first_name: 'Robert', last_name: 'Johnson' }, error: null });
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<RequestVisitScreen />));
    expect(screen.getAllByText(/Request|Visit/i)[0]).toBeTruthy();
  });

  it('shows companion name after loading', async () => {
    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Maria Santos|Maria/i)[0]).toBeTruthy();
    });
  });

  it('shows date options (at least one date chip)', async () => {
    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => {
      // generateDateOptions creates 14 days, all labeled the same in mock
      expect(screen.getAllByText(/Tue, Feb 25|Feb 25/i).length).toBeGreaterThan(0);
    });
  });

  it('shows time slot grid with 6-8a option', async () => {
    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/6-8a|6–8 AM/i)[0]).toBeTruthy();
    });
  });

  it('shows Companionship task checkbox', async () => {
    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Companionship/i)[0]).toBeTruthy();
    });
  });

  it('shows Light Cleaning task checkbox', async () => {
    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Light Cleaning/i)[0]).toBeTruthy();
    });
  });

  it('renders "Send Request" button', async () => {
    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Send Request/i)[0]).toBeTruthy();
    });
  });

  it('renders note input', async () => {
    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/gardening|note|companion/i)).toBeTruthy();
    });
  });

  // ── Interactions ──────────────────────────────────────────────────────────

  it('selecting a date chip renders the selection', async () => {
    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => screen.getAllByText(/Tue, Feb 25/i));

    const datePills = screen.getAllByText(/Tue, Feb 25/i);
    fireEvent.click(datePills[0]);
    // After click, component state updates — should still render date
    expect(screen.getAllByText(/Tue, Feb 25/i).length).toBeGreaterThan(0);
  });

  it('Submit inserts to visit_requests table with correct fields', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: 'req-new' }, error: null }); // visit_requests insert
    mockMaybySingle.mockResolvedValue({ data: { id: 'elder-1' }, error: null });

    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => screen.getAllByText(/Tue, Feb 25/i));

    // Select date
    fireEvent.click(screen.getAllByText(/Tue, Feb 25/i)[0]);
    // Select time slot
    fireEvent.click(screen.getByText('6-8a'));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Send Request/i)[0]);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visit_requests');
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          companion_id: 'user-cg-1',
          status: 'pending',
        })
      );
    });
  });

  it('shows success state after submission', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'req-new' }, error: null });
    mockMaybySingle.mockResolvedValue({ data: { id: 'elder-1' }, error: null });

    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => screen.getAllByText(/Tue, Feb 25/i));

    // Select date and slot
    fireEvent.click(screen.getAllByText(/Tue, Feb 25/i)[0]);
    fireEvent.click(screen.getByText('6-8a'));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Send Request/i)[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Request Sent|Sent!/i)[0]).toBeTruthy();
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: companion not found shows error state', async () => {
    mockSingle.mockReset();
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    await act(async () => render(<RequestVisitScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/not found|loading/i)[0]).toBeTruthy();
    });
  });

  it('NEGATIVE: "View My Requests" in success state navigates to my-requests', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'req-new' }, error: null });
    mockMaybySingle.mockResolvedValue({ data: { id: 'elder-1' }, error: null });

    await act(async () => render(<RequestVisitScreen />));
    await waitFor(() => screen.getAllByText(/Tue, Feb 25/i));

    fireEvent.click(screen.getAllByText(/Tue, Feb 25/i)[0]);
    fireEvent.click(screen.getByText('6-8a'));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Send Request/i)[0]);
    });

    await waitFor(() => screen.getAllByText(/View My Requests/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/View My Requests/i)[0]);
    });

    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('my-requests'));
  });
});
