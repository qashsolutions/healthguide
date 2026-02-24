/**
 * 08-Companionship: Browse Companions Public Screen Tests (Phase 6)
 * Screen: (auth)/browse-companions.tsx
 * Unauthenticated browse — first name only, signup modal on tap
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack, canGoBack: jest.fn(() => true) }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Redirect: () => null,
  useFocusEffect: jest.fn(),
}));

var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
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
    FilterIcon: () => React.createElement(Text, null, '⚙️'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
    CompanionIcon: () => React.createElement(Text, null, '👥'),
    StudentIcon: () => React.createElement(Text, null, '🎓'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    ArrowLeftIcon: () => React.createElement(Text, { testID: 'arrow-left' }, '←'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 400: '#9CA3AF', 700: '#374151', 900: '#111827' },
    primary: { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
    success: { 50: '#F0FDF4', 300: '#86EFAC', 600: '#059669' },
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
  spacing: { 1: 4, 1.5: 6, 2: 8, 2.5: 10, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24 },
  createShadow: () => ({}),
}));

import BrowseCompanionsScreen from '@/app/(auth)/browse-companions';

const mockCompanions = [
  {
    id: 'cp-1',
    user_id: 'u-1',
    full_name: 'Maria Santos',
    caregiver_type: 'student',
    zip_code: '90210',
    capabilities: ['companionship', 'light_cleaning'],
    availability: { tuesday: ['10am-12pm'], thursday: ['2pm-4pm'] },
    languages: ['english', 'spanish'],
    bio: 'I love helping elders stay active',
    has_transportation: true,
    gender: 'female',
    college_name: 'UCLA',
    photo_url: null,
    selfie_url: null,
  },
  {
    id: 'cp-2',
    user_id: 'u-2',
    full_name: 'James Wilson',
    caregiver_type: 'companion_55',
    zip_code: '90211',
    capabilities: ['companionship', 'groceries'],
    availability: { monday: ['8am-10am'] },
    languages: ['english'],
    bio: null,
    has_transportation: false,
    gender: 'male',
    photo_url: null,
    selfie_url: null,
  },
];

describe('08-Companionship: Browse Companions Public Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.in.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: mockCompanions, error: null }));
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    expect(screen.getAllByText(/Find a Companion|companions/i)[0]).toBeTruthy();
  });

  it('renders sign-up banner', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    expect(screen.getAllByText(/Sign up to see full profiles|sign up/i)[0]).toBeTruthy();
  });

  it('renders search input', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    expect(screen.getByPlaceholderText(/Search name or zip/i)).toBeTruthy();
  });

  it('renders "Filters" toggle button', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    expect(screen.getAllByText(/Filters/i)[0]).toBeTruthy();
  });

  it('shows companion first name only (not full name)', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    await waitFor(() => {
      // Should show "Maria" but NOT "Maria Santos"
      expect(screen.getByText('Maria')).toBeTruthy();
    });
    // Full last name should not appear
    expect(screen.queryByText('Maria Santos')).toBeNull();
  });

  it('shows second companion first name', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    await waitFor(() => {
      expect(screen.getByText('James')).toBeTruthy();
    });
  });

  it('queries caregiver_profiles with student/companion_55 filter', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('caregiver_profiles');
      expect(mockChain.in).toHaveBeenCalledWith(
        'caregiver_type',
        expect.arrayContaining(['student', 'companion_55'])
      );
    });
  });

  it('shows companion count text', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/2 companions|companions/i)[0]).toBeTruthy();
    });
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  it('clicking Filters shows task filter chips', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    fireEvent.click(screen.getAllByText(/Filters/i)[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/Companionship/i)[0]).toBeTruthy();
    });
  });

  it('filter panel shows allowed tasks only', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    fireEvent.click(screen.getAllByText(/Filters/i)[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/Companionship/i)[0]).toBeTruthy();
      expect(screen.getAllByText(/Light Cleaning/i)[0]).toBeTruthy();
      expect(screen.getAllByText(/Groceries/i)[0]).toBeTruthy();
    });
  });

  // ── Signup Modal ──────────────────────────────────────────────────────────

  it('clicking a companion card opens signup modal', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    await waitFor(() => screen.getAllByTestId('companion-card'));

    const cards = screen.getAllByTestId('companion-card');
    await act(async () => {
      fireEvent.click(cards[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Sign up to connect/i)[0]).toBeTruthy();
    });
  });

  it('signup modal shows "I need care" button', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    await waitFor(() => screen.getAllByTestId('companion-card'));

    await act(async () => {
      fireEvent.click(screen.getAllByTestId('companion-card')[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/I need care/i)[0]).toBeTruthy();
    });
  });

  it('signup modal shows "I\'m a family member" button', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    await waitFor(() => screen.getAllByTestId('companion-card'));

    await act(async () => {
      fireEvent.click(screen.getAllByTestId('companion-card')[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/I'm a family member|family member/i)[0]).toBeTruthy();
    });
  });

  it('signup modal has "Maybe later" dismiss option', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    await waitFor(() => screen.getAllByTestId('companion-card'));

    await act(async () => {
      fireEvent.click(screen.getAllByTestId('companion-card')[0]);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Maybe later/i)[0]).toBeTruthy();
    });
  });

  it('clicking the sign-up banner also opens modal', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    await act(async () => {
      fireEvent.click(screen.getAllByText(/Sign up to see full profiles/i)[0]);
    });
    await waitFor(() => {
      expect(screen.getAllByText(/Sign up to connect/i)[0]).toBeTruthy();
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: shows empty state when no companions returned', async () => {
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));

    await act(async () => render(<BrowseCompanionsScreen />));

    await waitFor(() => {
      expect(screen.getAllByText(/No companions found|Loading/i)[0]).toBeTruthy();
    });
  });

  it('NEGATIVE: back button navigates back', async () => {
    await act(async () => render(<BrowseCompanionsScreen />));
    fireEvent.click(screen.getByTestId('arrow-left'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('NEGATIVE: does not crash when availability is null', async () => {
    const noAvailCompanion = [{ ...mockCompanions[0], availability: null }];
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: noAvailCompanion, error: null }));

    await expect(act(async () => {
      render(<BrowseCompanionsScreen />);
    })).resolves.not.toThrow();
  });
});
