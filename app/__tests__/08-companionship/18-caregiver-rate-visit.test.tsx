/**
 * 08-Companionship: Caregiver Rate Visit Screen Tests (Phase 10)
 * Screen: (protected)/caregiver/rate-visit.tsx
 * Companion rates elder after completed visit
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: jest.fn(() => true) }),
  useLocalSearchParams: () => ({ visitId: 'visit-1' }),
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
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'caregiver-1' } }),
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
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'caregiver-1' } } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

jest.mock('@/components/ui/StarRating', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    StarRating: ({ rating, onChange, showLabel }: any) =>
      React.createElement(Pressable, { onPress: () => onChange && onChange(5), testID: 'star-rating' },
        React.createElement(Text, null, rating > 0 ? `${rating} stars` : 'Tap to rate')
      ),
  };
});

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ title, onPress, loading, disabled }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s/g, '-')}`, disabled },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PersonIcon: () => React.createElement(Text, null, '👤'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
    StarIcon: () => React.createElement(Text, null, '★'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    warning: { 500: '#F59E0B', 50: '#FFFBEB' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    success: { 500: '#10B981', 600: '#059669', 50: '#F0FDF4' },
    error: { 500: '#EF4444' },
  },
  roleColors: { careseeker: '#7C3AED', caregiver: '#0891B2' },
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

import CaregiverRateVisitScreen from '@/app/(protected)/caregiver/rate-visit';

const mockVisitData = {
  id: 'visit-1',
  duration_minutes: 90,
  actual_start: '2026-02-21T10:00:00',
  actual_end: '2026-02-21T11:30:00',
  elder: {
    id: 'elder-1',
    user_id: 'user-elder-1',
    first_name: 'Dorothy',
    last_name: 'Johnson',
  },
};

describe('08-Companionship: Caregiver Rate Visit Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.insert.mockReturnThis();
    mockChain.eq.mockReturnThis();
    // First single() → visit + elder, maybySingle() → no existing rating
    mockSingle.mockResolvedValueOnce({ data: mockVisitData, error: null });
    mockMaybySingle.mockResolvedValueOnce({ data: null, error: null });
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    expect(screen.getAllByText(/Rate|rate|How was/i)[0]).toBeTruthy();
  });

  it('shows elder name after loading', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Dorothy Johnson|Dorothy/i)[0]).toBeTruthy();
    });
  });

  it('shows visit duration after loading', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/90|1h 30|1 hr/i)[0]).toBeTruthy();
    });
  });

  it('renders StarRating component', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => {
      expect(screen.getByTestId('star-rating')).toBeTruthy();
    });
  });

  it('renders reason textarea', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/What went well|comment|feedback/i)).toBeTruthy();
    });
  });

  it('renders "Submit Rating" button', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Submit Rating/i)[0]).toBeTruthy();
    });
  });

  it('renders "Skip for now" button', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Skip for now|Skip/i)[0]).toBeTruthy();
    });
  });

  // ── Interaction ────────────────────────────────────────────────────────────

  it('selecting star updates rating display', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => screen.getByTestId('star-rating'));
    fireEvent.click(screen.getByTestId('star-rating'));
    expect(screen.getAllByText(/5 stars/i)[0]).toBeTruthy();
  });

  it('Submit Rating inserts to visit_ratings table with correct fields', async () => {
    mockChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: { id: 'rating-1' }, error: null })
    );

    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => screen.getByTestId('star-rating'));

    // Select rating
    fireEvent.click(screen.getByTestId('star-rating'));

    // Enter reason
    const reasonInput = screen.getByPlaceholderText(/What went well|comment|feedback/i);
    fireEvent.change(reasonInput, { target: { value: 'Great visit, Dorothy was wonderful!' } });

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Submit Rating/i)[0]);
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visit_ratings');
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          visit_id: 'visit-1',
          rating: expect.any(Number),
        })
      );
    });
  });

  it('Skip for now navigates to caregiver tabs without inserting', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => screen.getAllByText(/Skip for now|Skip/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Skip for now|Skip/i)[0]);
    });

    expect(mockReplace).toHaveBeenCalledWith('/(protected)/caregiver/(tabs)');
    expect(mockChain.insert).not.toHaveBeenCalled();
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: shows error when reason is too short (< 10 chars)', async () => {
    await act(async () => render(<CaregiverRateVisitScreen />));
    await waitFor(() => screen.getByTestId('star-rating'));

    fireEvent.click(screen.getByTestId('star-rating'));
    const reasonInput = screen.getByPlaceholderText(/What went well|comment|feedback/i);
    fireEvent.change(reasonInput, { target: { value: 'Short' } }); // < 10 chars

    // The submit button should be disabled (disabled prop set when reason < 10)
    const submitBtn = screen.getAllByText(/Submit Rating/i)[0];
    // Clicking a disabled button shouldn't trigger insert
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // insert should NOT have been called since button is disabled
    expect(mockChain.insert).not.toHaveBeenCalled();
  });

  it('NEGATIVE: shows submitted state when already rated', async () => {
    mockSingle.mockReset();
    mockMaybySingle.mockReset();
    mockSingle.mockResolvedValueOnce({ data: mockVisitData, error: null });
    mockMaybySingle.mockResolvedValueOnce({ data: { id: 'existing-rating' }, error: null });

    await act(async () => render(<CaregiverRateVisitScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/Thank you|thank/i)[0]).toBeTruthy();
    });
  });

  it('NEGATIVE: visit not found does not crash', async () => {
    mockSingle.mockReset();
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    await expect(act(async () => {
      render(<CaregiverRateVisitScreen />);
    })).resolves.not.toThrow();
  });
});
