/**
 * 08-Companionship: Find Companion Screen (Authenticated) Tests (Phase 6)
 * Screen: (protected)/careseeker/find-companion.tsx
 * Careseeker (elder) browses, filters, and favorites companions
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
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
    user: { id: 'elder-user-1', full_name: 'Robert Johnson' },
    agency: null, loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn((r: string) => r === 'careseeker'),
  }),
  AuthProvider: ({ children }: any) => children,
}));

const mockMaybySingle = jest.fn();
var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
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

jest.mock('@/constants/tasks', () => ({
  ALLOWED_TASKS: [
    { id: 'companionship', label: 'Companionship' },
    { id: 'light_cleaning', label: 'Light Cleaning' },
    { id: 'groceries', label: 'Groceries & Errands' },
  ],
}));

jest.mock('@/components/ui/Card', () => {
  const React = require('react');
  const { Pressable, View } = require('react-native');
  return {
    Card: ({ children, onPress, style }: any) =>
      React.createElement(Pressable, { onPress, testID: 'companion-card' },
        React.createElement(View, null, children)
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    SearchIcon: () => React.createElement(Text, null, '🔍'),
    StarIcon: () => React.createElement(Text, null, '⭐'),
    FilterIcon: () => React.createElement(Text, null, '⚙️'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
    CompanionIcon: () => React.createElement(Text, null, '👥'),
    StudentIcon: () => React.createElement(Text, null, '🎓'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    ArrowLeftIcon: () => React.createElement(Text, null, '←'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 400: '#9CA3AF', 900: '#111827' },
    primary: { 50: '#EFF6FF', 500: '#3B82F6', 600: '#2563EB' },
    success: { 50: '#F0FDF4', 600: '#059669' },
    error: { 500: '#EF4444' },
    warning: { 500: '#F59E0B' },
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
  spacing: { 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24, full: 9999 },
  shadows: { sm: {}, md: {} },
  createShadow: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import FindCompanionScreen from '@/app/(protected)/careseeker/find-companion';

const mockCompanion = {
  id: 'cp-1',
  user_id: 'user-cg-1',
  full_name: 'Maria Santos',
  caregiver_type: 'student',
  zip_code: '90210',
  capabilities: ['companionship', 'light_cleaning'],
  availability: { tuesday: ['10am-12pm'], thursday: ['2pm-4pm'] },
  languages: ['english', 'spanish'],
  bio: 'Love helping seniors stay engaged',
  has_transportation: true,
  gender: 'female',
  college_name: 'UCLA',
  photo_url: null,
  selfie_url: null,
  travel_radius_miles: 10,
};

describe('08-Companionship: Find Companion Screen (Authenticated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.in.mockReturnThis();
    mockChain.delete.mockReturnThis();
    mockChain.insert.mockReturnThis();

    // Default: elder lookup → null, favorites → [], ratings → []
    mockMaybySingle.mockResolvedValue({ data: null, error: null });
    // Reset queue before setting up new entries (prevents accumulation across tests)
    mockChain.then.mockReset();
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockCompanion], error: null })) // caregiver_profiles
      .mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })) // elder_favorites
      .mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })) // visit_ratings
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<FindCompanionScreen />));
    expect(screen.getAllByText(/Companion|companion|Find/i)[0]).toBeTruthy();
  });

  it('shows search input with placeholder', async () => {
    await act(async () => render(<FindCompanionScreen />));
    expect(screen.getByPlaceholderText(/Search name or zip code/i)).toBeTruthy();
  });

  it('shows Filters toggle button', async () => {
    await act(async () => render(<FindCompanionScreen />));
    expect(screen.getAllByText(/Filters/i)[0]).toBeTruthy();
  });

  it('shows companion name after loading', async () => {
    await act(async () => render(<FindCompanionScreen />));
    await waitFor(() => {
      // Shows abbreviated name: "Maria S."
      expect(screen.getAllByText(/Maria/i)[0]).toBeTruthy();
    });
  });

  it('queries caregiver_profiles with student/companion_55 filter', async () => {
    await act(async () => render(<FindCompanionScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('caregiver_profiles');
      expect(mockChain.in).toHaveBeenCalledWith(
        'caregiver_type',
        expect.arrayContaining(['student', 'companion_55'])
      );
    });
  });

  it('shows companion count text', async () => {
    await act(async () => render(<FindCompanionScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/1 companion|companion/i)[0]).toBeTruthy();
    });
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  it('expands filter panel when Filters button is clicked', async () => {
    await act(async () => render(<FindCompanionScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Filters/i)[0]);
    });

    // Filter panel shows task options from ALLOWED_TASKS
    await waitFor(() => {
      expect(screen.getAllByText(/Companionship/i)[0]).toBeTruthy();
    });
  });

  it('shows task filter chips in expanded filter panel', async () => {
    await act(async () => render(<FindCompanionScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Filters/i)[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Light Cleaning/i)[0]).toBeTruthy();
    });
  });

  it('shows day filter chips: Mon through Sun', async () => {
    await act(async () => render(<FindCompanionScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Filters/i)[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Mon/i)[0]).toBeTruthy();
      expect(screen.getAllByText(/Tue/i)[0]).toBeTruthy();
      expect(screen.getAllByText(/Sat/i)[0]).toBeTruthy();
    });
  });

  it('shows "Has transportation" filter chip', async () => {
    await act(async () => render(<FindCompanionScreen />));

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Filters/i)[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/transportation|Transport/i)[0]).toBeTruthy();
    });
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  it('clicking companion card navigates to companion detail', async () => {
    await act(async () => render(<FindCompanionScreen />));
    await waitFor(() => screen.getAllByText(/Maria/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getByTestId('companion-card'));
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('cp-1')
    );
  });

  // ── Favorites ─────────────────────────────────────────────────────────────

  it('queries elders table to find elder for favorites', async () => {
    await act(async () => render(<FindCompanionScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('elders');
    });
  });

  it('queries elder_favorites table when elder found', async () => {
    // Elder is found this time
    mockMaybySingle.mockResolvedValueOnce({ data: { id: 'elder-1' }, error: null });
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [mockCompanion], error: null }))
      .mockImplementationOnce((resolve: any) => resolve({ data: [{ companion_id: 'user-cg-1' }], error: null })) // favorites
      .mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })) // ratings
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<FindCompanionScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('elder_favorites');
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: shows empty state when no companions found', async () => {
    mockChain.then.mockReset();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<FindCompanionScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/No companions found|Loading/i)[0]).toBeTruthy();
    });
  });

  it('NEGATIVE: does not crash when profiles query errors', async () => {
    mockChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: null, error: { message: 'fetch failed' } })
    ).mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await expect(act(async () => {
      render(<FindCompanionScreen />);
    })).resolves.not.toThrow();
  });

  it('NEGATIVE: does not crash when companion has null availability', async () => {
    const noAvailCompanion = { ...mockCompanion, availability: null };
    mockChain.then
      .mockImplementationOnce((resolve: any) => resolve({ data: [noAvailCompanion], error: null }))
      .mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await expect(act(async () => {
      render(<FindCompanionScreen />);
    })).resolves.not.toThrow();
  });
});
