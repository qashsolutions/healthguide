/**
 * 08-Companionship: ScopeAlert Component Tests (Phase 2)
 * Component: @/components/ScopeAlert
 * Non-dismissible modal enforcing companionship scope of service
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

var mockFrom;
var mockChain = {
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  then: jest.fn((resolve: any) => resolve({ data: null, error: null })),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
  isSupabaseConfigured: jest.fn(() => true),
}; });

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'caregiver-1', full_name: 'Maria Santos' },
    agency: null, loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
}));

jest.mock('@/components/ui/Button', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ title, onPress, loading }: any) =>
      React.createElement(
        Pressable,
        { onPress, testID: 'scope-alert-button' },
        React.createElement(Text, null, loading ? 'Loading...' : title)
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    AlertIcon: () => React.createElement(Text, { testID: 'alert-icon' }, '⚠️'),
    BellIcon: () => null, StarIcon: () => null, HeartIcon: () => null,
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    warning: { 500: '#F59E0B' },
    text: { primary: '#111827', secondary: '#6B7280' },
    surface: '#FFFFFF',
    white: '#FFFFFF',
    primary: { 600: '#2563EB' },
  },
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
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24 },
  createShadow: () => ({}),
}));

import { ScopeAlert } from '@/components/ScopeAlert';

describe('08-Companionship: ScopeAlert Component', () => {
  const onAccept = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.insert.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
  });

  // ── Rendering when visible ────────────────────────────────────────────────

  it('renders when visible=true', () => {
    render(<ScopeAlert visible onAccept={onAccept} context="onboarding" />);
    expect(screen.getByText('Scope of Service')).toBeTruthy();
  });

  it('renders "Scope of Service" title', () => {
    render(<ScopeAlert visible onAccept={onAccept} context="onboarding" />);
    expect(screen.getByText('Scope of Service')).toBeTruthy();
  });

  it('renders alert icon', () => {
    render(<ScopeAlert visible onAccept={onAccept} context="onboarding" />);
    expect(screen.getByTestId('alert-icon')).toBeTruthy();
  });

  it('renders "I Accept" button', () => {
    render(<ScopeAlert visible onAccept={onAccept} context="onboarding" />);
    expect(screen.getByText('I Accept')).toBeTruthy();
  });

  it('renders scope of service body text (prohibitions listed)', () => {
    render(<ScopeAlert visible onAccept={onAccept} context="onboarding" />);
    // SCOPE_ALERT_TEXT mentions toileting, medication, etc.
    expect(screen.getAllByText(/Toileting|toileting|medical|Medical/)[0]).toBeTruthy();
  });

  // ── Accept flow ────────────────────────────────────────────────────────────

  it('pressing "I Accept" calls onAccept callback', async () => {
    render(<ScopeAlert visible onAccept={onAccept} context="onboarding" />);

    await act(async () => {
      fireEvent.click(screen.getByText('I Accept'));
    });

    await waitFor(() => {
      expect(onAccept).toHaveBeenCalled();
    });
  });

  it('pressing "I Accept" inserts to scope_acceptances table', async () => {
    render(<ScopeAlert visible onAccept={onAccept} context="onboarding" />);

    await act(async () => {
      fireEvent.click(screen.getByText('I Accept'));
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('scope_acceptances');
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'caregiver-1',
          context: 'onboarding',
        })
      );
    });
  });

  it('includes visitId in DB insert when provided', async () => {
    render(
      <ScopeAlert
        visible
        onAccept={onAccept}
        context="check_in"
        visitId="visit-123"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('I Accept'));
    });

    await waitFor(() => {
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ visit_id: 'visit-123', context: 'check_in' })
      );
    });
  });

  it('still calls onAccept even if DB insert fails (non-blocking)', async () => {
    mockChain.then.mockImplementationOnce((resolve: any) =>
      resolve({ data: null, error: { message: 'DB error' } })
    );

    render(<ScopeAlert visible onAccept={onAccept} context="onboarding" />);

    await act(async () => {
      fireEvent.click(screen.getByText('I Accept'));
    });

    // onAccept should still be called even if DB fails
    await waitFor(() => {
      expect(onAccept).toHaveBeenCalled();
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: does NOT render when visible=false', () => {
    render(<ScopeAlert visible={false} onAccept={onAccept} context="onboarding" />);
    expect(screen.queryByText('Scope of Service')).toBeNull();
  });

  it('NEGATIVE: no dismiss/close button rendered (modal is non-dismissible)', () => {
    render(<ScopeAlert visible onAccept={onAccept} context="onboarding" />);
    expect(screen.queryByText('Close')).toBeNull();
    expect(screen.queryByText('Cancel')).toBeNull();
    expect(screen.queryByText('Skip')).toBeNull();
  });
});
