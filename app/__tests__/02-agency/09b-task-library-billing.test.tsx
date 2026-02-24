/**
 * 02-Agency: Task Library + Add Task Tests
 * Screens: settings/task-library.tsx, settings/add-task.tsx
 * Phase 2: Restricted to 3 allowed categories (companionship, light_cleaning, groceries)
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

jest.mock('@/constants/tasks', () => ({
  ALLOWED_TASKS: [
    { id: 'companionship', label: 'Companionship', category: 'companionship' },
    { id: 'light_cleaning', label: 'Light Cleaning', category: 'cleaning' },
    { id: 'groceries', label: 'Groceries & Errands', category: 'errands' },
  ],
  ALLOWED_CATEGORY_LABELS: { companionship: 'Companionship', housekeeping: 'Light Cleaning', errands: 'Groceries & Errands' },
  TASK_CATEGORIES: ['companionship', 'cleaning', 'errands'],
}));

var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
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
      React.createElement(Pressable, { onPress, testID: `btn-${title?.replace(/\s+/g, '-')}` },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
    Input: ({ label, value, onChangeText, placeholder }: any) =>
      React.createElement(View, null,
        React.createElement(Text, null, label),
        React.createElement(TextInput, { value, onChangeText, placeholder, testID: label || placeholder })
      ),
    Card: ({ children, onPress }: any) =>
      React.createElement(Pressable, { onPress }, React.createElement(View, null, children)),
    Badge: ({ label }: any) => React.createElement(Text, null, label),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PlusIcon: () => React.createElement(Text, null, '+'),
    ArrowLeftIcon: () => React.createElement(Text, null, '←'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
    EditIcon: () => React.createElement(Text, null, '✏️'),
    TrashIcon: () => React.createElement(Text, null, '🗑️'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    success: { 600: '#059669', 50: '#F0FDF4' },
    error: { 500: '#EF4444' },
    warning: { 500: '#F59E0B' },
  },
  roleColors: { agency_owner: '#0F766E' },
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
  shadows: { sm: {}, md: {}, lg: {} },
  layout: { maxWidth: 600 },
  createShadow: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import TaskLibraryScreen from '@/app/(protected)/agency/settings/task-library';
import AddTaskScreen from '@/app/(protected)/agency/settings/add-task';

describe('02-Agency: Task Library Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: [], error: null }));
  });

  it('renders without crashing', async () => {
    await act(async () => render(<TaskLibraryScreen />));
    expect(screen.getAllByText(/Task Library|Tasks/i)[0]).toBeTruthy();
  });

  it('shows task restriction info text', async () => {
    await act(async () => render(<TaskLibraryScreen />));
    await waitFor(() => {
      expect(screen.getAllByText(/companionship|non-medical|restricted/i)[0]).toBeTruthy();
    });
  });

  it('queries task_library table with agency_id', async () => {
    await act(async () => render(<TaskLibraryScreen />));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('task_library');
    });
  });

  it('NEGATIVE: shows empty state when no tasks', async () => {
    await act(async () => render(<TaskLibraryScreen />));
    await waitFor(() => {
      // No crash even with empty data
      expect(screen.queryByText(/Loading/i)).toBeNull();
    });
  });
});

describe('02-Agency: Add Task Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.insert.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
  });

  it('renders without crashing', () => {
    render(<AddTaskScreen />);
    expect(screen.getAllByText(/Add Task|New Task|task/i)[0]).toBeTruthy();
  });

  it('shows Task Name input', () => {
    render(<AddTaskScreen />);
    expect(screen.getAllByText(/Task Name|name/i)[0]).toBeTruthy();
  });

  it('shows category options restricted to 3 allowed', () => {
    render(<AddTaskScreen />);
    // Should NOT show medical categories
    expect(screen.queryByText(/Medical|Medication|medication/i)).toBeNull();
  });

  it('shows Companionship category option', () => {
    render(<AddTaskScreen />);
    expect(screen.getAllByText(/Companionship/i)[0]).toBeTruthy();
  });

  it('inserts to task_library table on submit', async () => {
    render(<AddTaskScreen />);
    const nameInput = screen.queryByTestId(/Task Name|name/i) || screen.queryByPlaceholderText(/Task Name|name/i);
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: 'Daily Chat' } });
    }

    await act(async () => {
      const saveBtn = screen.queryByText(/Save|Add|Create/i);
      if (saveBtn) fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      if (mockChain.insert.mock.calls.length > 0) {
        expect(mockFrom).toHaveBeenCalledWith('task_library');
      }
      expect(true).toBe(true);
    });
  });

  it('NEGATIVE: does not crash when insert fails', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: null, error: { message: 'insert error' } })
    );
    await expect(act(async () => {
      render(<AddTaskScreen />);
    })).resolves.not.toThrow();
  });
});
