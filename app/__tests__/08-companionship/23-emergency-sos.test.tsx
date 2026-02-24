/**
 * 08-Companionship: EmergencySOS Component Tests (Phase 9)
 * Component: @/components/caregiver/EmergencySOS
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';


var mockFrom;
var mockChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  then: jest.fn((resolve: any) => resolve({ data: null, error: null })),
};

jest.mock('@/lib/supabase', () => { mockFrom = jest.fn(() => mockChain); return {
  supabase: {
    from: mockFrom,
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
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
    agency: { id: 'agency-1' },
    loading: false, initialized: true,
    signOut: jest.fn(), refreshProfile: jest.fn(),
    isRole: jest.fn(() => false),
  }),
}));

jest.mock('@/theme/colors', () => ({
  colors: {
    error: { 500: '#EF4444', 600: '#DC2626', 50: '#FEF2F2' },
    warning: { 500: '#F59E0B', 50: '#FFFBEB' },
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF',
    surface: '#FFFFFF',
    white: '#FFFFFF',
    neutral: { 100: '#F3F4F6', 200: '#E5E7EB', 700: '#374151', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    success: { 600: '#059669' },
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
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 24, full: 9999 },
  createShadow: () => ({}),
}));
jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    AlertIcon: () => React.createElement(Text, null, '⚠️'),
    PhoneIcon: () => React.createElement(Text, null, '📞'),
    CloseIcon: () => React.createElement(Text, null, '✕'),
    EmergencyIcon: () => React.createElement(Text, null, '🚨'),
    PersonIcon: () => React.createElement(Text, null, '👤'),
    CheckIcon: () => React.createElement(Text, null, '✓'),
  };
});

import { EmergencySOS } from '@/components/caregiver/EmergencySOS';

const defaultProps = {
  visitId: 'visit-1',
  elderName: 'Dorothy Johnson',
  emergencyContacts: [
    { name: 'Jane Doe', phone: '555-1234', relationship: 'Daughter' },
  ],
};

describe('08-Companionship: EmergencySOS Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockChain);
    mockChain.insert.mockReturnThis();
    mockChain.update.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.then.mockImplementation((resolve: any) => resolve({ data: null, error: null }));
  });

  // ── Floating SOS Button ────────────────────────────────────────────────────

  it('renders the floating SOS button', () => {
    render(<EmergencySOS {...defaultProps} />);
    expect(screen.getAllByText(/SOS|Emergency/i)[0]).toBeTruthy();
  });

  it('does not show emergency modal by default', () => {
    render(<EmergencySOS {...defaultProps} />);
    // Modal should be hidden initially
    expect(screen.queryByText('Call 911')).toBeNull();
  });

  // ── Opening Modal ─────────────────────────────────────────────────────────

  it('pressing SOS button opens emergency modal', async () => {
    render(<EmergencySOS {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getAllByText(/SOS|Emergency/i)[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Call 911')).toBeTruthy();
    });
  });

  it('emergency modal shows "Call 911" button', async () => {
    render(<EmergencySOS {...defaultProps} />);
    fireEvent.click(screen.getAllByText(/SOS|Emergency/i)[0]);

    await waitFor(() => {
      expect(screen.getByText('Call 911')).toBeTruthy();
    });
  });

  it('emergency modal shows emergency contact name', async () => {
    render(<EmergencySOS {...defaultProps} />);
    fireEvent.click(screen.getAllByText(/SOS|Emergency/i)[0]);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });
  });

  it('emergency modal shows emergency contact relationship', async () => {
    render(<EmergencySOS {...defaultProps} />);
    fireEvent.click(screen.getAllByText(/SOS|Emergency/i)[0]);

    await waitFor(() => {
      expect(screen.getByText('Daughter')).toBeTruthy();
    });
  });

  it('emergency modal shows safety reminders section', async () => {
    render(<EmergencySOS {...defaultProps} />);
    fireEvent.click(screen.getAllByText(/SOS|Emergency/i)[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/safety|Safety|calm|Calm|reminders/i)[0]).toBeTruthy();
    });
  });

  it('emergency modal shows additional resources (988 or hotline)', async () => {
    render(<EmergencySOS {...defaultProps} />);
    fireEvent.click(screen.getAllByText(/SOS|Emergency/i)[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/988|Crisis|hotline|Hotline|Elder/i)[0]).toBeTruthy();
    });
  });

  // ── Call 911 ──────────────────────────────────────────────────────────────

  it('pressing "Call 911" opens tel:911', async () => {
    const { Linking } = require('react-native');
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    render(<EmergencySOS {...defaultProps} />);
    fireEvent.click(screen.getAllByText(/SOS|Emergency/i)[0]);

    await waitFor(() => {
      expect(screen.getByText('Call 911')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Call 911'));
    });

    expect(openURLSpy).toHaveBeenCalledWith('tel:911');
    openURLSpy.mockRestore();
  });

  // ── Incident Logging ──────────────────────────────────────────────────────

  it('pressing "Call 911" inserts to visit_emergencies table', async () => {
    render(<EmergencySOS {...defaultProps} />);
    fireEvent.click(screen.getAllByText(/SOS|Emergency/i)[0]);

    await waitFor(() => {
      expect(screen.getByText('Call 911')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Call 911'));
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('visit_emergencies');
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ visit_id: 'visit-1' })
      );
    });
  });

  it('pressing "Call 911" updates visit status to emergency', async () => {
    render(<EmergencySOS {...defaultProps} />);
    fireEvent.click(screen.getAllByText(/SOS|Emergency/i)[0]);

    await waitFor(() => screen.getByText('Call 911'));

    await act(async () => {
      fireEvent.click(screen.getByText('Call 911'));
    });

    await waitFor(() => {
      // visits table updated with status = 'emergency'
      expect(mockFrom).toHaveBeenCalledWith('visits');
      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'emergency' })
      );
    });
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('NEGATIVE: does not crash when emergencyContacts is empty', () => {
    expect(() => {
      render(<EmergencySOS visitId="visit-1" emergencyContacts={[]} />);
    }).not.toThrow();
  });

  it('NEGATIVE: does not crash when visitId is undefined', () => {
    expect(() => {
      render(<EmergencySOS visitId={undefined as any} elderName="Test" emergencyContacts={[]} />);
    }).not.toThrow();
  });
});
