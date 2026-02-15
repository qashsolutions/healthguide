/**
 * Batch 11: Task Library + Billing Tests (Features #105-112)
 * Screens: settings/task-library.tsx, settings/add-task.tsx, settings/billing.tsx
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
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
    user: { id: 'owner-1', full_name: 'Jane Smith', agency_id: 'agency-1' },
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
  useRequireRole: () => ({ hasAccess: true, loading: false, user: { id: 'owner-1' } }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock billing components (imported by billing screen)
jest.mock('@/components/billing', () => ({
  SubscriptionCard: ({ status }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'Subscription: ' + (status || 'free'));
  },
  PaymentMethodCard: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'Payment Method');
  },
  InvoicesList: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'Invoice History');
  },
}));

// Thenable supabase mock
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
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockChain),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }),
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
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: {
          subscription_status: 'free',
          current_elder_count: 0,
          monthly_amount: 0,
          trial_ends_at: null,
          next_billing_date: null,
          payment_method: null,
        },
        error: null,
      }),
    },
    storage: { from: jest.fn(() => ({ upload: jest.fn(), getPublicUrl: jest.fn() })) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

import TaskLibraryScreen from '@/app/(protected)/agency/settings/task-library';
import AddTaskScreen from '@/app/(protected)/agency/settings/add-task';
import BillingScreen from '@/app/(protected)/agency/settings/billing';

describe('Batch 11: Task Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.then.mockImplementation((resolve: any) =>
      resolve({ data: [], error: null })
    );
  });

  // Feature #105: Task library summary text renders
  it('#105 - Task library summary text renders', async () => {
    render(<TaskLibraryScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Configure which services/)).toBeTruthy();
    });
  });

  // Feature #106: Active count displays
  it('#106 - Active task count displays', async () => {
    render(<TaskLibraryScreen />);
    await waitFor(() => {
      expect(screen.getByText('0 active')).toBeTruthy();
    });
  });

  // Feature #107: Add custom task button renders
  it('#107 - "+ Add Custom Task" button renders', async () => {
    render(<TaskLibraryScreen />);
    await waitFor(() => {
      expect(screen.getByText('+ Add Custom Task')).toBeTruthy();
    });
  });

  // Feature #108: Add task form renders
  it('#108 - Add task form has name, description, category fields', () => {
    render(<AddTaskScreen />);
    expect(screen.getByText('Task Information')).toBeTruthy();
    expect(screen.getByText('Task Name')).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g., Technology Assistance')).toBeTruthy();
  });
});

describe('Batch 11: Billing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Feature #109: Billing page shows title
  it('#109 - Billing page shows title', async () => {
    render(<BillingScreen />);
    await waitFor(() => {
      expect(screen.getByText('Billing')).toBeTruthy();
    });
  });

  // Feature #110: Subscription card renders
  it('#110 - Subscription card renders', async () => {
    render(<BillingScreen />);
    await waitFor(() => {
      expect(screen.getByText(/Subscription/)).toBeTruthy();
    });
  });

  // Feature #111: Payment method card renders
  it('#111 - Payment method card renders', async () => {
    render(<BillingScreen />);
    await waitFor(() => {
      expect(screen.getByText('Payment Method')).toBeTruthy();
    });
  });

  // Feature #112: Invoice history renders
  it('#112 - Invoice history list renders', async () => {
    render(<BillingScreen />);
    await waitFor(() => {
      expect(screen.getByText('Invoice History')).toBeTruthy();
    });
  });
});
