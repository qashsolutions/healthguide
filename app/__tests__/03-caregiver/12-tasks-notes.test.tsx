/**
 * Batch 15: Tasks + Notes Tests (Features #140-153)
 * Screens: visit/[id]/tasks.tsx, visit/[id]/notes.tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: mockBack,
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'visit-1' }),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Stack: { Screen: ({ children }: any) => children ?? null },
  Tabs: { Screen: ({ children }: any) => children ?? null },
  Redirect: () => null,
  useFocusEffect: jest.fn((callback: any) => {
    const ReactInner = require('react');
    ReactInner.useEffect(() => { callback(); }, []);
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'caregiver-1', full_name: 'Maria Garcia', agency_id: 'agency-1' },
    agency: { id: 'agency-1', name: 'Sunny Day Home Care' },
    loading: false,
    initialized: true,
    signInWithEmail: jest.fn(),
    signInWithPhone: jest.fn(),
    signUpWithEmail: jest.fn(),
    verifyOTP: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
    isRole: jest.fn(() => true),
  }),
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'caregiver-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  hapticFeedback: jest.fn(),
  vibrate: jest.fn(),
}));

// Mock TaskCard component
jest.mock('@/components/caregiver/TaskCard', () => ({
  TaskCard: ({ task }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, `Task: ${task?.task?.name || 'Unknown'} [${task?.status}]`);
  },
}));

// Mock ObservationCategory component
jest.mock('@/components/caregiver/ObservationCategory', () => ({
  ObservationCategory: ({ title, options }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(View, {},
      React.createElement(Text, {}, `Category: ${title}`),
      ...(options || []).map((opt: any, i: number) =>
        React.createElement(Text, { key: i }, opt.label)
      )
    );
  },
}));

// Mock VoiceNoteButton component
jest.mock('@/components/caregiver/VoiceNoteButton', () => ({
  VoiceNoteButton: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'Voice Note Button');
  },
}));

// Supabase mock
const mockSingle = jest.fn().mockResolvedValue({
  data: {
    elder: { id: 'elder-1', first_name: 'John', last_name: 'Davis' },
  },
  error: null,
});

const mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: mockSingle,
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({
    data: [
      {
        id: 'task-1',
        assignment_id: 'visit-1',
        task_id: 'tl-1',
        status: 'pending',
        completed_at: null,
        skipped_reason: null,
        notes: null,
        task: { id: 'tl-1', name: 'Meal preparation', icon: 'meal', category: 'meal_prep', description: 'Prepare a meal' },
      },
      {
        id: 'task-2',
        assignment_id: 'visit-1',
        task_id: 'tl-2',
        status: 'pending',
        completed_at: null,
        skipped_reason: null,
        notes: null,
        task: { id: 'tl-2', name: 'Companionship', icon: 'companionship', category: 'companionship', description: 'Spend time together' },
      },
      {
        id: 'task-3',
        assignment_id: 'visit-1',
        task_id: 'tl-3',
        status: 'completed',
        completed_at: '2026-02-15T10:00:00Z',
        skipped_reason: null,
        notes: null,
        task: { id: 'tl-3', name: 'Medication reminder', icon: 'medication', category: 'medication', description: 'Remind about medication' },
      },
    ],
    error: null,
  })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'caregiver-1' } } }),
      signInWithPassword: jest.fn(),
      signInWithOtp: jest.fn(),
      signUp: jest.fn(),
      verifyOtp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import TasksScreen from '@/app/(protected)/caregiver/visit/[id]/tasks';
import NotesScreen from '@/app/(protected)/caregiver/visit/[id]/notes';

describe('Batch 15: Visit Tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: { elder: { id: 'elder-1', first_name: 'John', last_name: 'Davis' } },
      error: null,
    });
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [
          {
            id: 'task-1', assignment_id: 'visit-1', task_id: 'tl-1', status: 'pending',
            completed_at: null, skipped_reason: null, notes: null,
            task: { id: 'tl-1', name: 'Meal preparation', icon: 'meal', category: 'meal_prep', description: null },
          },
          {
            id: 'task-2', assignment_id: 'visit-1', task_id: 'tl-2', status: 'pending',
            completed_at: null, skipped_reason: null, notes: null,
            task: { id: 'tl-2', name: 'Companionship', icon: 'companionship', category: 'companionship', description: null },
          },
          {
            id: 'task-3', assignment_id: 'visit-1', task_id: 'tl-3', status: 'completed',
            completed_at: '2026-02-15T10:00:00Z', skipped_reason: null, notes: null,
            task: { id: 'tl-3', name: 'Medication reminder', icon: 'medication', category: 'medication', description: null },
          },
        ],
        error: null,
      })
    );
  });

  // Feature #140: Task list renders tasks
  it('#140 - Task list renders with task names', async () => {
    render(<TasksScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Meal preparation/)).toBeTruthy();
    });
    expect(screen.getByText(/Companionship/)).toBeTruthy();
    expect(screen.getByText(/Medication reminder/)).toBeTruthy();
  });

  // Feature #141: Header shows elder's name in title
  it('#141 - Header shows elder first name in title', async () => {
    render(<TasksScreen />);
    await waitFor(() => {
      expect(screen.getByText("John's Tasks")).toBeTruthy();
    });
  });

  // Feature #142: Progress text shows completed count
  it('#142 - Progress shows completed count', async () => {
    render(<TasksScreen />);
    await waitFor(() => {
      expect(screen.getByText('1 of 3 completed')).toBeTruthy();
    });
  });

  // Feature #143: Continue button renders
  it('#143 - "Continue" button renders', async () => {
    render(<TasksScreen />);
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeTruthy();
    });
  });

  // Feature #144: Empty state renders when no tasks
  it('#144 - Empty state shows when no tasks', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    render(<TasksScreen />);
    await waitFor(() => {
      expect(screen.getByText('No tasks assigned')).toBeTruthy();
    });
  });

  // Feature #145: Empty state subtitle
  it('#145 - Empty state shows "Continue to add observations"', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
    render(<TasksScreen />);
    await waitFor(() => {
      expect(screen.getByText('Continue to add observations')).toBeTruthy();
    });
  });

  // Feature #146: Task status shown in card
  it('#146 - Task cards show status', async () => {
    render(<TasksScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Meal preparation.*pending/)).toBeTruthy();
    });
    expect(screen.getByText(/Medication reminder.*completed/)).toBeTruthy();
  });

  // Feature #147: Progress bar renders
  it('#147 - Progress bar section renders', async () => {
    render(<TasksScreen />);
    await waitFor(() => {
      expect(screen.getByText('1 of 3 completed')).toBeTruthy();
    });
  });

  // Feature #148: All done shows success label
  it('#148 - "All Done!" label when all tasks completed', async () => {
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({
        data: [
          {
            id: 'task-1', assignment_id: 'visit-1', task_id: 'tl-1', status: 'completed',
            completed_at: '2026-02-15T10:00:00Z', skipped_reason: null, notes: null,
            task: { id: 'tl-1', name: 'Meal preparation', icon: 'meal', category: 'meal_prep', description: null },
          },
        ],
        error: null,
      })
    );
    render(<TasksScreen />);
    await waitFor(() => {
      expect(screen.getByText('All Done!')).toBeTruthy();
    });
  });
});

describe('Batch 15: Observations / Notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: { elder: { id: 'elder-1', first_name: 'John', last_name: 'Davis' } },
      error: null,
    });
  });

  // Feature #149: Notes/Observations screen renders
  it('#149 - Observations header renders', async () => {
    render(<NotesScreen />);
    await waitFor(() => {
      expect(screen.getByText('Observations')).toBeTruthy();
    });
  });

  // Feature #150: Client name in title
  it('#150 - Shows "How is [name] today?"', async () => {
    render(<NotesScreen />);
    await waitFor(() => {
      expect(screen.getByText('How is John today?')).toBeTruthy();
    });
  });

  // Feature #151: Continue button renders
  it('#151 - "Continue" button renders', async () => {
    render(<NotesScreen />);
    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeTruthy();
    });
  });

  // Feature #152: Observation categories render (Mood, Appetite, Mobility, Activity)
  it('#152 - Observation categories render', async () => {
    render(<NotesScreen />);
    await waitFor(() => {
      expect(screen.getByText('Category: Mood')).toBeTruthy();
    });
    expect(screen.getByText('Category: Appetite')).toBeTruthy();
    expect(screen.getByText('Category: Mobility')).toBeTruthy();
    expect(screen.getByText('Category: Activity Level')).toBeTruthy();
  });

  // Feature #153: Additional Notes section renders
  it('#153 - "Additional Notes" section renders with voice button', async () => {
    render(<NotesScreen />);
    await waitFor(() => {
      expect(screen.getByText('Additional Notes')).toBeTruthy();
    });
    expect(screen.getByText('Voice Note Button')).toBeTruthy();
  });
});
