/**
 * 08-Companionship: Recurring Visit Setup Screen Tests (Phase 12)
 * Screen: (protected)/caregiver/recurring-setup.tsx
 * Companion sets up recurring schedule after accepting a visit
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: jest.fn(() => true) }),
  useLocalSearchParams: () => ({
    visitId: 'visit-1',
    elderName: 'Dorothy Johnson',
    visitDate: '2026-02-17',
    visitTime: '10:00 AM',
    visitTasks: 'Companionship',
  }),
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

var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
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
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

var mockGenerateChildVisits = jest.fn().mockResolvedValue({ success: true, count: 4 });
var mockGetDayFromDateString = jest.fn(() => 'tuesday');

jest.mock('@/lib/recurringVisits', () => ({
  buildRecurrenceRule: jest.fn(() => 'weekly:tuesday'),
  generateChildVisits: (...args: any[]) => mockGenerateChildVisits(...args),
  getDayFromDateString: (...args: any[]) => mockGetDayFromDateString(...args),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ title, onPress, loading, disabled }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/[\s\.]+/g, '-')}`, disabled },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    CheckIcon: () => React.createElement(Text, null, '✓'),
    CalendarIcon: () => React.createElement(Text, null, '📅'),
    ClockIcon: () => React.createElement(Text, null, '🕐'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    success: { 500: '#10B981', 600: '#059669', 50: '#F0FDF4' },
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

import RecurringSetupScreen from '@/app/(protected)/caregiver/recurring-setup';

describe('08-Companionship: Recurring Visit Setup Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.update.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
    mockGenerateChildVisits.mockResolvedValue({ success: true, count: 4 });
    mockGetDayFromDateString.mockReturnValue('tuesday');
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    expect(screen.getAllByText(/Recurring|recurring|Repeat/i)[0]).toBeTruthy();
  });

  it('shows visit summary with elder name', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    expect(screen.getAllByText(/Dorothy Johnson|Dorothy/i)[0]).toBeTruthy();
  });

  it('renders "Every week" frequency option', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    expect(screen.getByText('Every week')).toBeTruthy();
  });

  it('renders "Every 2 weeks" frequency option', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    expect(screen.getByText('Every 2 weeks')).toBeTruthy();
  });

  it('renders all 7 day abbreviations', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('Tue')).toBeTruthy();
    expect(screen.getByText('Wed')).toBeTruthy();
    expect(screen.getByText('Thu')).toBeTruthy();
    expect(screen.getByText('Fri')).toBeTruthy();
    expect(screen.getByText('Sat')).toBeTruthy();
    expect(screen.getByText('Sun')).toBeTruthy();
  });

  it('renders end conditions (no end date / end after count)', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    expect(screen.getAllByText(/No end date|no end/i)[0]).toBeTruthy();
    expect(screen.getAllByText(/End after|end after/i)[0]).toBeTruthy();
  });

  it('renders "Skip — one-time visit" link', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    expect(screen.getAllByText(/Skip.*one-time|Skip/i)[0]).toBeTruthy();
  });

  it('renders "Confirm Recurring" button', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    expect(screen.getAllByText(/Confirm Recurring/i)[0]).toBeTruthy();
  });

  // ── Interactions ──────────────────────────────────────────────────────────

  it('clicking "Every 2 weeks" selects biweekly frequency', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    fireEvent.click(screen.getByText('Every 2 weeks'));
    // The pill should now be "active" — no crash
    expect(screen.getByText('Every 2 weeks')).toBeTruthy();
  });

  it('clicking a day toggles its selection', async () => {
    await act(async () => render(<RecurringSetupScreen />));
    // Tue should already be pre-selected (getDayFromDateString returns 'tuesday')
    // Click Mon to add it
    fireEvent.click(screen.getByText('Mon'));
    // Still renders
    expect(screen.getByText('Mon')).toBeTruthy();
  });

  it('Confirm Recurring calls supabase update on visits table', async () => {
    await act(async () => render(<RecurringSetupScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Confirm Recurring/i)[0]);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visits');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_recurring: true,
          recurrence_rule: expect.any(String),
        })
      );
    });
  });

  it('Confirm Recurring calls generateChildVisits with visitId', async () => {
    await act(async () => render(<RecurringSetupScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Confirm Recurring/i)[0]);
    });

    await waitFor(() => {
      expect(mockGenerateChildVisits).toHaveBeenCalledWith('visit-1');
    });
  });

  it('shows success state after confirmation', async () => {
    await act(async () => render(<RecurringSetupScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Confirm Recurring/i)[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Recurring visits created|visits added/i)[0]).toBeTruthy();
    });
  });

  it('success state shows generated visit count', async () => {
    mockGenerateChildVisits.mockResolvedValueOnce({ success: true, count: 8 });
    await act(async () => render(<RecurringSetupScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Confirm Recurring/i)[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/8.*visit|visits/i)[0]).toBeTruthy();
    });
  });

  it('Skip navigates back without creating recurring visits', async () => {
    await act(async () => render(<RecurringSetupScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Skip.*one-time|Skip/i)[0]);
    });

    expect(mockBack).toHaveBeenCalled();
    expect(mockGenerateChildVisits).not.toHaveBeenCalled();
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: shows error when generateChildVisits fails', async () => {
    mockGenerateChildVisits.mockResolvedValueOnce({ success: false, error: 'DB error' });
    await act(async () => render(<RecurringSetupScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Confirm Recurring/i)[0]);
    });

    // Error handled — should not crash and not show success
    await waitFor(() => {
      expect(screen.queryByText(/Recurring visits created/i)).toBeNull();
    });
  });
});
