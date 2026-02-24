/**
 * 08-Companionship: Companion Detail Screen Tests (Phase 6)
 * Screen: (protected)/careseeker/companion/[id].tsx
 * Full companion profile: bio, services, availability, favorite toggle, Request Visit
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: jest.fn(() => true) }),
  useLocalSearchParams: () => ({ id: 'cp-1' }),
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
  delete: jest.fn().mockReturnThis(),
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

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    StarIcon: () => React.createElement(Text, null, '★'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    StudentIcon: () => React.createElement(Text, null, '🎓'),
    CompanionIcon: () => React.createElement(Text, null, '👥'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    success: { 50: '#F0FDF4', 600: '#059669' },
    warning: { 500: '#F59E0B', 50: '#FFFBEB' },
    error: { 500: '#EF4444' },
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

import CompanionDetailScreen from '@/app/(protected)/careseeker/companion/[id]';

const mockProfile = {
  id: 'cp-1',
  user_id: 'user-cg-1',
  full_name: 'Maria Santos',
  caregiver_type: 'student',
  zip_code: '90210',
  capabilities: ['companionship', 'light_cleaning'],
  availability: { tuesday: ['10am-12pm'], thursday: ['2pm-4pm'] },
  languages: ['english', 'spanish'],
  bio: 'I love helping seniors stay connected',
  has_transportation: true,
  gender: 'female',
  travel_radius_miles: 10,
  college_name: 'UCLA',
  program_name: 'Social Work',
  photo_url: null,
  selfie_url: null,
};

describe('08-Companionship: Companion Detail Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.insert.mockReturnThis();
    mockChain.delete.mockReturnThis();
    // Profile load
    mockSingle.mockResolvedValueOnce({ data: mockProfile, error: null });
    // Elder ID check, favorite check, ratings summary
    mockMaybySingle
      .mockResolvedValueOnce({ data: { id: 'elder-1' }, error: null })     // elder lookup
      .mockResolvedValueOnce({ data: null, error: null })                   // favorite = false
      .mockResolvedValueOnce({ data: { avg_rating: 4.5, total_ratings: 12 }, error: null }); // ratings
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    expect(screen.getAllByText(/Maria|companion|profile/i)[0]).toBeTruthy();
  });

  it('shows companion full name', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => {
      expect(screen.getByText('Maria Santos')).toBeTruthy();
    });
  });

  it('shows student type badge', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Student/i)[0]).toBeTruthy();
    });
  });

  it('shows bio text', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/I love helping seniors/i)[0]).toBeTruthy();
    });
  });

  it('shows Companionship capability', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Companionship/i)[0]).toBeTruthy();
    });
  });

  it('shows languages (English, Spanish)', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/English/i)[0]).toBeTruthy();
      expect(screen.getAllByText(/Spanish/i)[0]).toBeTruthy();
    });
  });

  it('shows average rating from user_ratings_summary', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/4\.5|4\.50/i)[0]).toBeTruthy();
    });
  });

  it('renders "Request Visit" button', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/Request Visit|Request/i)[0]).toBeTruthy();
    });
  });

  // ── Interactions ──────────────────────────────────────────────────────────

  it('"Request Visit" navigates to request-visit with companionId', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => screen.getAllByText(/Request Visit|Request/i)[0]);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/Request Visit|Request/i)[0]);
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('request-visit')
    );
  });

  it('queries caregiver_profiles by companion id', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('caregiver_profiles');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'cp-1');
    });
  });

  it('queries user_ratings_summary for companion rating', async () => {
    await act(async () => render(<CompanionDetailScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('user_ratings_summary');
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: does not crash when companion not found', async () => {
    mockSingle.mockReset();
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

    await expect(act(async () => {
      render(<CompanionDetailScreen />);
    })).resolves.not.toThrow();
  });

  it('NEGATIVE: shows loading state while fetching', async () => {
    mockSingle.mockReset();
    mockSingle.mockImplementation(() => new Promise(() => {})); // never resolves

    await act(async () => render(<CompanionDetailScreen />));

    expect(screen.getAllByText(/Loading|loading/i)[0]).toBeTruthy();
  });
});
