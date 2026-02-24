/**
 * 08-Companionship: Cancel Visit UI Tests (Phase 11)
 * Screen: (protected)/caregiver/visit/[id]/index.tsx
 * Cancel Visit button, late-cancel warning, 3-way recurring dialog
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ id: 'visit-1' }),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Redirect: () => null,
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

const mockCancelVisit = jest.fn();
const mockIsLateCancellation = jest.fn();
const mockCancelRecurringSeries = jest.fn();

jest.mock('@/lib/cancelVisit', () => ({
  cancelVisit: (...args: any[]) => mockCancelVisit(...args),
  isLateCancellation: (...args: any[]) => mockIsLateCancellation(...args),
}));

jest.mock('@/lib/recurringVisits', () => ({
  cancelRecurringSeries: (...args: any[]) => mockCancelRecurringSeries(...args),
  buildRecurrenceRule: jest.fn(),
  generateChildVisits: jest.fn(),
  getDayFromDateString: jest.fn(),
}));

var mockSingleVisit = jest.fn();
var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: mockSingleVisit,
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
    Card: ({ children }: any) => {
      const { View } = require('react-native');
      return React.createElement(View, null, children);
    },
    Badge: ({ label }: any) => React.createElement(Text, null, label),
    Button: ({ title, onPress, icon }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s/g, '-') || 'icon'}` },
        React.createElement(Text, null, title || '')
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PersonIcon: () => React.createElement(Text, null, '👤'),
    LocationIcon: () => React.createElement(Text, null, '📍'),
    ClockIcon: () => React.createElement(Text, null, '🕐'),
    ArrowLeftIcon: () => React.createElement(Text, null, '←'),
    AlertIcon: () => React.createElement(Text, null, '⚠️'),
  };
});

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

jest.mock('date-fns', () => ({
  format: jest.fn((date: any, fmt: string) => 'Feb 25, 2026'),
  parseISO: jest.fn((s: string) => new Date(s)),
}));

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 500: '#3B82F6', 600: '#2563EB', 50: '#EFF6FF' },
    success: { 50: '#F0FDF4', 500: '#10B981', 600: '#059669' },
    error: { 50: '#FEF2F2', 500: '#EF4444', 700: '#B91C1C' },
    warning: { 50: '#FFFBEB', 500: '#F59E0B' },
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
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 24: 96 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24 },
  createShadow: () => ({}),
}));

import VisitDetailScreen from '@/app/(protected)/caregiver/visit/[id]/index';

const mockVisit = {
  id: 'visit-1',
  status: 'scheduled',
  scheduled_start: '2026-02-25T10:00:00',
  scheduled_end: '2026-02-25T12:00:00',
  special_instructions: null,
  is_recurring: false,
  parent_visit_id: null,
  elder: {
    id: 'elder-1',
    first_name: 'Dorothy',
    last_name: 'Johnson',
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90001',
  },
};

const mockTasks = [
  { id: 'vt-1', status: 'pending', task: { name: 'Companionship', category: 'companionship' } },
];

function setupScheduledVisit(overrides = {}) {
  mockSingleVisit.mockResolvedValue({ data: { ...mockVisit, ...overrides }, error: null });
  mockChain.then.mockImplementation((resolve: any) => resolve({ data: mockTasks, error: null }));
}

describe('08-Companionship: Cancel Visit UI (Phase 11)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockIsLateCancellation.mockReturnValue(false);
    mockCancelVisit.mockResolvedValue({ success: true, isLate: false });
    mockCancelRecurringSeries.mockResolvedValue({ success: true, cancelled: 3 });
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    setupScheduledVisit();
    await act(async () => render(<VisitDetailScreen />));
    expect(screen.getAllByText(/Visit Details|Dorothy|scheduled/i)[0]).toBeTruthy();
  });

  it('shows elder name on visit card', async () => {
    setupScheduledVisit();
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Dorothy Johnson|Dorothy/i)[0]).toBeTruthy();
    });
  });

  it('shows "Scheduled" status badge for scheduled visit', async () => {
    setupScheduledVisit();
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Scheduled/i)[0]).toBeTruthy();
    });
  });

  it('shows "Cancel Visit" link for scheduled visit', async () => {
    setupScheduledVisit();
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Cancel Visit/i)[0]).toBeTruthy();
    });
  });

  it('shows "Start Visit" button for scheduled visit', async () => {
    setupScheduledVisit();
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Start Visit/i)[0]).toBeTruthy();
    });
  });

  it('does NOT show "Cancel Visit" for completed visits', async () => {
    setupScheduledVisit({ status: 'completed' });
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.queryByText(/Cancel Visit/i)).toBeNull();
    });
  });

  it('does NOT show "Cancel Visit" for checked_in visits', async () => {
    setupScheduledVisit({ status: 'checked_in' });
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.queryByText(/Cancel Visit/i)).toBeNull();
    });
  });

  it('shows Recurring badge for is_recurring=true visit', async () => {
    setupScheduledVisit({ is_recurring: true });
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Recurring|♻️/i)[0]).toBeTruthy();
    });
  });

  it('shows Recurring badge for child visit (has parent_visit_id)', async () => {
    setupScheduledVisit({ is_recurring: false, parent_visit_id: 'parent-visit-1' });
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Recurring|♻️/i)[0]).toBeTruthy();
    });
  });

  // ── Cancel — Non-Recurring ─────────────────────────────────────────────────

  it('clicking Cancel Visit calls window.confirm for non-recurring visit', async () => {
    setupScheduledVisit();
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(false);

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    expect(confirmMock).toHaveBeenCalled();
    confirmMock.mockRestore();
  });

  it('confirming cancel calls cancelVisit with companion role', async () => {
    setupScheduledVisit();
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    await waitFor(() => {
      expect(mockCancelVisit).toHaveBeenCalledWith('visit-1', 'companion', 'caregiver-1');
    });

    confirmMock.mockRestore();
    alertMock.mockRestore();
  });

  it('cancelling navigates back on success', async () => {
    setupScheduledVisit();
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });

    confirmMock.mockRestore();
    alertMock.mockRestore();
  });

  it('NEGATIVE: declining confirm does NOT call cancelVisit', async () => {
    setupScheduledVisit();
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(false);

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    expect(mockCancelVisit).not.toHaveBeenCalled();
    confirmMock.mockRestore();
  });

  it('late-cancel confirm message warns about negative rating', async () => {
    setupScheduledVisit();
    mockIsLateCancellation.mockReturnValue(true);
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(false);

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    // confirm message should mention short notice / negative rating
    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringMatching(/30 minutes|negative rating|short notice/i)
    );
    confirmMock.mockRestore();
  });

  // ── Cancel — Recurring ────────────────────────────────────────────────────

  it('clicking Cancel Visit on recurring visit calls window.prompt', async () => {
    setupScheduledVisit({ is_recurring: true });
    const promptMock = jest.spyOn(window, 'prompt').mockReturnValue(null);

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    expect(promptMock).toHaveBeenCalled();
    promptMock.mockRestore();
  });

  it('choosing "1" in recurring prompt cancels this visit only', async () => {
    setupScheduledVisit({ is_recurring: true });
    const promptMock = jest.spyOn(window, 'prompt').mockReturnValue('1');
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    await waitFor(() => {
      expect(mockCancelVisit).toHaveBeenCalledWith('visit-1', 'companion', 'caregiver-1');
      expect(mockCancelRecurringSeries).not.toHaveBeenCalled();
    });

    promptMock.mockRestore();
    alertMock.mockRestore();
  });

  it('choosing "2" in recurring prompt cancels entire series', async () => {
    setupScheduledVisit({ is_recurring: true });
    const promptMock = jest.spyOn(window, 'prompt').mockReturnValue('2');
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    await waitFor(() => {
      expect(mockCancelRecurringSeries).toHaveBeenCalledWith('visit-1');
      expect(mockCancelVisit).not.toHaveBeenCalled();
    });

    promptMock.mockRestore();
    alertMock.mockRestore();
  });

  it('choosing "2" on child visit passes parent_visit_id to cancelRecurringSeries', async () => {
    setupScheduledVisit({ is_recurring: false, parent_visit_id: 'parent-visit-999' });
    const promptMock = jest.spyOn(window, 'prompt').mockReturnValue('2');
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    await waitFor(() => {
      expect(mockCancelRecurringSeries).toHaveBeenCalledWith('parent-visit-999');
    });

    promptMock.mockRestore();
    alertMock.mockRestore();
  });

  it('dismissing recurring prompt (null) does not call cancelVisit or cancelRecurringSeries', async () => {
    setupScheduledVisit({ is_recurring: true });
    const promptMock = jest.spyOn(window, 'prompt').mockReturnValue(null);

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    expect(mockCancelVisit).not.toHaveBeenCalled();
    expect(mockCancelRecurringSeries).not.toHaveBeenCalled();
    promptMock.mockRestore();
  });

  // ── Data Queries ───────────────────────────────────────────────────────────

  it('queries visits table with id param', async () => {
    setupScheduledVisit();
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visits');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'visit-1');
    });
  });

  it('queries visit_tasks table', async () => {
    setupScheduledVisit();
    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visit_tasks');
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: falls back to mock data on fetch error (does not crash)', async () => {
    mockSingleVisit.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: { message: 'err' } }));

    await expect(act(async () => {
      render(<VisitDetailScreen />);
    })).resolves.not.toThrow();
  });

  it('NEGATIVE: shows fallback content when visits query errors', async () => {
    mockSingleVisit.mockResolvedValue({ data: null, error: { message: 'Network error' } });
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<VisitDetailScreen />));

    // Screen falls back to John Davis (hardcoded fallback) or shows visit details
    await waitFor(() => {
      expect(screen.getAllByText(/Visit Details|Cancel Visit|Start Visit/i)[0]).toBeTruthy();
    });
  });

  it('NEGATIVE: cancelVisit failure shows alert and stays on screen', async () => {
    setupScheduledVisit();
    mockCancelVisit.mockResolvedValue({ success: false, error: 'Could not cancel' });
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await act(async () => render(<VisitDetailScreen />));
    await waitFor(() => screen.getAllByText(/Cancel Visit/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Cancel Visit/i)[0]);
    });

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalled();
      expect(mockBack).not.toHaveBeenCalled();
    });

    confirmMock.mockRestore();
    alertMock.mockRestore();
  });
});
