// Temp test to debug click issue
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => '/',
  Link: ({ children }: any) => children,
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  Redirect: () => null,
  useFocusEffect: jest.fn(),
}));

var mockSignUp = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      then: jest.fn((resolve: any) => resolve({ data: null, error: null })),
    })),
    functions: { invoke: jest.fn().mockResolvedValue({ data: {}, error: null }) },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, loading, disabled }: any) =>
      React.createElement('button', { onClick: onPress, 'data-testid': `btn-${title?.replace(/\s/g, '-')}`, disabled },
        loading ? 'Loading...' : title
      ),
    Input: ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, error }: any) =>
      React.createElement('div', null,
        React.createElement('label', null, label),
        React.createElement('input', {
          value: value || '',
          onChange: (e: any) => onChangeText && onChangeText(e.target.value),
          placeholder,
          type: secureTextEntry ? 'password' : 'text',
          'data-testid': placeholder || label,
        }),
        error ? React.createElement('span', { 'data-testid': `error-${label}` }, error) : null,
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  return { StudentIcon: () => React.createElement('span', null, 'student') };
});
jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF', 500: '#3B82F6' },
    success: { 500: '#10B981', 600: '#059669' },
    error: { 50: '#FEF2F2', 200: '#FECACA', 500: '#EF4444', 700: '#B91C1C' },
  },
  roleColors: { caregiver: '#0891B2' },
}));
jest.mock('@/theme/typography', () => ({
  typography: {
    styles: { h1:{fontSize:36},h2:{fontSize:30},h3:{fontSize:24},h4:{fontSize:20},body:{fontSize:16},bodyLarge:{fontSize:18},bodySmall:{fontSize:14},label:{fontSize:14},caption:{fontSize:12},button:{fontSize:16},buttonLarge:{fontSize:18},stat:{fontSize:28},statSmall:{fontSize:20} },
    caregiver: { heading:{fontSize:28},body:{fontSize:20},label:{fontSize:16} },
    fontFamily: { display:'System',body:'System',regular:'System',medium:'System',semibold:'System',bold:'System' },
  },
}));
jest.mock('@/theme/spacing', () => ({
  spacing: { 1:4,2:8,3:12,4:16,5:20,6:24,8:32 },
  borderRadius: { sm:4,md:8,lg:12,xl:16,'2xl':24 },
  createShadow: () => ({}),
}));

import SignupStudentScreen from '@/app/(auth)/signup-student';

describe('Debug: Student Signup Click', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user-1' }, session: null }, error: null });
  });

  it('renders and shows age error on click', async () => {
    render(<SignupStudentScreen />);
    const ageInput = screen.getByTestId('18');
    fireEvent.change(ageInput, { target: { value: '16' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Create-Account'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('error-Age *')).toBeTruthy();
    });
  });
  
  it('calls signUp when all fields valid', async () => {
    render(<SignupStudentScreen />);
    await act(async () => { fireEvent.change(screen.getByTestId('Jane Smith'), { target: { value: 'Jane Student' } }); });
    await act(async () => { fireEvent.change(screen.getByTestId('18'), { target: { value: '21' } }); });
    await act(async () => { fireEvent.change(screen.getByTestId('State University'), { target: { value: 'UCLA' } }); });
    await act(async () => { fireEvent.change(screen.getByTestId('Charlotte'), { target: { value: 'Los Angeles' } }); });
    await act(async () => { fireEvent.change(screen.getByTestId('NC'), { target: { value: 'CA' } }); });
    await act(async () => { fireEvent.change(screen.getByTestId('28202'), { target: { value: '90210' } }); });
    await act(async () => { fireEvent.change(screen.getByTestId('jane@university.edu'), { target: { value: 'jane@ucla.edu' } }); });
    await act(async () => { fireEvent.change(screen.getByTestId('Min 8 chars, 1 letter + 1 number'), { target: { value: 'Password1' } }); });
    await act(async () => { fireEvent.change(screen.getByTestId('Re-enter your password'), { target: { value: 'Password1' } }); });
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Create-Account'));
    });
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });
    console.log('mockSignUp call count:', mockSignUp.mock.calls.length);
  });
});
