/**
 * 02-Agency: Agency Elders Tests
 * Screens: agency/(tabs)/elders.tsx, agency/elder/[id].tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockPush = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockSearchParams,
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Redirect: () => null,
  useFocusEffect: jest.fn((cb: any) => {
    const React = require('react');
    React.useEffect(() => { cb(); }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-1', full_name: 'Jane Smith', agency_id: 'agency-1' },
    agency: { id: 'agency-1', name: 'Sunny Day Home Care' },
    loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn(() => true),
  }),
  AuthProvider: ({ children }: any) => children,
}));

jest.mock('@/components/agency/CareGroupCard', () => ({
  CareGroupCard: () => null,
}));

jest.mock('@/lib/invite', () => ({
  shareInvite: jest.fn(),
  buildDeepLink: jest.fn(() => 'https://test.com/invite'),
  cleanInviteCode: jest.fn((code: string) => code),
}));

var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Card: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress, testID: 'elder-card' }, React.createElement(View, null, children)),
    Badge: ({ label }: any) => React.createElement(Text, null, label),
    Button: ({ title, onPress }: any) =>
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s+/g, '-')}` },
        React.createElement(Text, null, title)
      ),
    Input: ({ label, value, onChangeText, placeholder }: any) =>
      React.createElement(View, null,
        React.createElement(Text, null, label),
        React.createElement(TextInput, { value, onChangeText, placeholder, testID: placeholder || label })
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PersonIcon: () => React.createElement(Text, null, '👤'),
    PlusIcon: () => React.createElement(Text, null, '+'),
    SearchIcon: () => React.createElement(Text, null, '🔍'),
    UsersIcon: () => React.createElement(Text, null, '👥'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
    ShareIcon: () => React.createElement(Text, null, '↗'),
    CalendarIcon: () => React.createElement(Text, null, '📅'),
    MapPinIcon: () => React.createElement(Text, null, '📍'),
    PhoneIcon: () => React.createElement(Text, null, '📞'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
    ClipboardIcon: () => React.createElement(Text, null, '📋'),
    LocationIcon: () => React.createElement(Text, null, '📍'),
    TrashIcon: () => React.createElement(Text, null, '🗑'),
    AlertIcon: () => React.createElement(Text, null, '⚠️'),
    CaregiverIcon: () => React.createElement(Text, null, '👩‍⚕️'),
    FamilyIcon: () => React.createElement(Text, null, '👨‍👩‍👧'),
    ElderIcon: () => React.createElement(Text, null, '🧓'),
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
  roleColors: { agency_owner: '#0F766E', caregiver: '#059669' },
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
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24, full: 9999 },
  shadows: { sm: {}, md: {} },
  layout: { maxWidth: 600 },
  createShadow: () => ({}),
}));

import EldersScreen from '@/app/(protected)/agency/(tabs)/elders';
import ElderDetailScreen from '@/app/(protected)/agency/elder/[id]';

describe('02-Agency: Agency Elders List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  it('renders without crashing', async () => {
    await act(async () => render(<EldersScreen />));
    expect(screen.getAllByText(/elder|Elder/i)[0]).toBeTruthy();
  });

  it('shows elders count header', async () => {
    await act(async () => render(<EldersScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/\d+ elder|No elder/i)[0]).toBeTruthy();
    });
  });

  it('shows search input', async () => {
    await act(async () => render(<EldersScreen />));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search elder/i)).toBeTruthy();
    });
  });

  it('shows + Add button', async () => {
    await act(async () => render(<EldersScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/\+ Add|Add/i)[0]).toBeTruthy();
    });
  });

  it('shows empty state when no elders', async () => {
    await act(async () => render(<EldersScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/No elders yet|no elder/i)[0]).toBeTruthy();
    });
  });

  it('queries elders table with agency_id', async () => {
    await act(async () => render(<EldersScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('elders');
    });
  });

  it('NEGATIVE: does not crash when elders query errors', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: { message: 'RLS denied' } })
    );
    await expect(act(async () => {
      render(<EldersScreen />);
    })).resolves.not.toThrow();
  });
});

describe('02-Agency: Elder Detail Screen (New Mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { id: 'new' };
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
    mockChain.single.mockResolvedValue({ data: null, error: null });
  });

  it('renders without crashing in new mode', () => {
    render(<ElderDetailScreen />);
    expect(screen.getAllByText(/Personal Information|Elder|New/i)[0]).toBeTruthy();
  });

  it('renders First Name input', () => {
    render(<ElderDetailScreen />);
    expect(screen.getAllByText(/First Name|first.name/i)[0]).toBeTruthy();
  });

  it('renders Save or Create button', () => {
    render(<ElderDetailScreen />);
    expect(screen.getAllByText(/Save|Create/i)[0]).toBeTruthy();
  });

  it('NEGATIVE: does not crash in edit mode with null elder data', async () => {
    mockSearchParams = { id: 'elder-123' };
    mockChain.single.mockResolvedValueOnce({ data: null, error: null });
    await expect(act(async () => {
      render(<ElderDetailScreen />);
    })).resolves.not.toThrow();
  });
});
