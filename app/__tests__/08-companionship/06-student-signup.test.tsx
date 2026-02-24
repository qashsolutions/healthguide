/**
 * 08-Companionship: Student Signup Screen Tests (Phase 4)
 * Screen: (auth)/signup-student.tsx
 * Student caregiver account creation with .edu email
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
  useFocusEffect: jest.fn(),
}));

var mockSignUp = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: any[]) => mockSignUp(...args),
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
    Input: ({ label, value, onChangeText, placeholder, secureTextEntry, error }: any) =>
      React.createElement('div', null,
        React.createElement('label', null, label),
        React.createElement('input', {
          value: value || '',
          onChange: (e: any) => onChangeText && onChangeText(e.target.value),
          placeholder,
          type: secureTextEntry ? 'password' : 'text',
          'data-testid': placeholder || label,
        }),
        error ? React.createElement('span', null, error) : null,
      ),
  };
});

jest.mock('@/components/icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    StudentIcon: () => React.createElement(Text, null, '🎓'),
    ArrowLeftIcon: () => React.createElement(Text, { testID: 'arrow-left' }, '←'),
  };
});

jest.mock('@/theme/colors', () => ({
  colors: {
    text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    background: '#FFFFFF', surface: '#FFFFFF', white: '#FFFFFF',
    neutral: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 900: '#111827' },
    primary: { 600: '#2563EB', 50: '#EFF6FF' },
    error: { 500: '#EF4444' },
    success: { 500: '#10B981' },
  },
  roleColors: { caregiver: '#0891B2' },
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

import SignupStudentScreen from '@/app/(auth)/signup-student';

describe('08-Companionship: Student Signup Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-1' }, session: null },
      error: null,
    });
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    render(<SignupStudentScreen />);
    expect(screen.getAllByText(/Student|student|Sign up/i)[0]).toBeTruthy();
  });

  it('renders Full Name input', () => {
    render(<SignupStudentScreen />);
    expect(screen.getAllByText(/Full Name|full name/i)[0]).toBeTruthy();
  });

  it('renders Age input', () => {
    render(<SignupStudentScreen />);
    expect(screen.getAllByText(/Age/i)[0]).toBeTruthy();
  });

  it('renders College Name input', () => {
    render(<SignupStudentScreen />);
    expect(screen.getAllByText(/College Name|college/i)[0]).toBeTruthy();
  });

  it('renders .edu Email input', () => {
    render(<SignupStudentScreen />);
    expect(screen.getAllByText(/\.edu Email|Email/i)[0]).toBeTruthy();
  });

  it('renders Password input', () => {
    render(<SignupStudentScreen />);
    expect(screen.getAllByText(/Password/i)[0]).toBeTruthy();
  });

  it('renders Create Account button', () => {
    render(<SignupStudentScreen />);
    expect(screen.getAllByText(/Create Account|Sign Up|Create/i)[0]).toBeTruthy();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('shows error when submitting empty form', async () => {
    render(<SignupStudentScreen />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Create-Account'));
    });

    await waitFor(() => {
      expect(screen.getAllByText(/required|must be|Name/i)[0]).toBeTruthy();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('NEGATIVE: shows error when age is under 18', async () => {
    render(<SignupStudentScreen />);

    const ageInput = screen.getByPlaceholderText('18');
    fireEvent.change(ageInput, { target: { value: '16' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Create-Account'));
    });

    await waitFor(() => {
      expect(screen.getAllByText(/18 or older|must be 18|under age/i)[0]).toBeTruthy();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('NEGATIVE: shows error when email is not .edu', async () => {
    render(<SignupStudentScreen />);

    const fullNameInput = screen.getByPlaceholderText('Jane Smith');
    const ageInput = screen.getByPlaceholderText('18');
    const emailInput = screen.getByPlaceholderText('jane@university.edu');

    fireEvent.change(fullNameInput, { target: { value: 'John Student' } });
    fireEvent.change(ageInput, { target: { value: '20' } });
    fireEvent.change(emailInput, { target: { value: 'student@gmail.com' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Create-Account'));
    });

    await waitFor(() => {
      expect(screen.getAllByText(/\.edu|must be a .edu/i)[0]).toBeTruthy();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('NEGATIVE: shows error when passwords do not match', async () => {
    render(<SignupStudentScreen />);

    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Min 8 chars, 1 letter + 1 number'), { target: { value: 'Pass1234!' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'Different1!' } }); });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Create-Account'));
    });

    await waitFor(() => {
      expect(screen.getAllByText(/do not match|passwords don't match/i)[0]).toBeTruthy();
    });
  });

  it('calls supabase.auth.signUp with .edu email and caregiver_type: student', async () => {
    render(<SignupStudentScreen />);

    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Jane Smith'), { target: { value: 'Jane Student' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('18'), { target: { value: '21' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('State University'), { target: { value: 'UCLA' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Charlotte'), { target: { value: 'Los Angeles' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('NC'), { target: { value: 'CA' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('28202'), { target: { value: '90210' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('jane@university.edu'), { target: { value: 'jane@ucla.edu' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Min 8 chars, 1 letter + 1 number'), { target: { value: 'Password1' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'Password1' } }); });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Create-Account'));
    });

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jane@ucla.edu',
          password: 'Password1',
          options: expect.objectContaining({
            data: expect.objectContaining({
              caregiver_type: 'student',
            }),
          }),
        })
      );
    });
  });

  it('shows email confirmation screen after successful signup', async () => {
    render(<SignupStudentScreen />);

    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Jane Smith'), { target: { value: 'Jane Student' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('18'), { target: { value: '21' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('State University'), { target: { value: 'UCLA' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Charlotte'), { target: { value: 'Los Angeles' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('NC'), { target: { value: 'CA' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('28202'), { target: { value: '90210' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('jane@university.edu'), { target: { value: 'jane@ucla.edu' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Min 8 chars, 1 letter + 1 number'), { target: { value: 'Password1' } }); });
    await act(async () => { fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'Password1' } }); });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-Create-Account'));
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Check Your Email|confirm|verification/i)[0]).toBeTruthy();
    });
  });
});
