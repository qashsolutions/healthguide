/**
 * Test helper: renders components wrapped with AuthContext for any of the 5 roles.
 */
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserRole, UserProfile, Agency } from '@/types/auth';

// Mock user profiles for each role
export const mockUsers: Record<UserRole, UserProfile> = {
  agency_owner: {
    id: 'user-agency-owner-1',
    email: 'owner@agency.com',
    role: 'agency_owner',
    full_name: 'Test Agency Owner',
    agency_id: 'agency-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  caregiver: {
    id: 'user-caregiver-1',
    phone: '+15551234567',
    role: 'caregiver',
    full_name: 'Test Caregiver',
    agency_id: 'agency-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  careseeker: {
    id: 'user-careseeker-1',
    email: 'elder@test.com',
    role: 'careseeker',
    full_name: 'Test Elder',
    agency_id: 'agency-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  volunteer: {
    id: 'user-volunteer-1',
    phone: '+15559876543',
    role: 'volunteer',
    full_name: 'Test Volunteer',
    agency_id: 'agency-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  family_member: {
    id: 'user-family-1',
    phone: '+15555551234',
    role: 'family_member',
    full_name: 'Test Family Member',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
};

export const mockAgency: Agency = {
  id: 'agency-1',
  name: 'Test Care Agency',
  owner_id: 'user-agency-owner-1',
  subscription_status: 'active',
  max_caregivers: 10,
  max_careseekers: 20,
  created_at: '2025-01-01T00:00:00Z',
};

/**
 * Mock the AuthContext module to provide controlled auth state.
 * Call this at the top of test files that need auth context.
 *
 * Usage:
 *   setupMockAuth('caregiver');
 *   // or with custom overrides:
 *   setupMockAuth('agency_owner', { loading: true });
 */
export function setupMockAuth(
  role: UserRole,
  overrides?: Partial<{
    user: Partial<UserProfile> | null;
    agency: Partial<Agency> | null;
    loading: boolean;
    initialized: boolean;
  }>
) {
  const user = overrides?.user === null
    ? null
    : { ...mockUsers[role], ...(overrides?.user || {}) };

  const agency = overrides?.agency === null
    ? null
    : (role === 'agency_owner' || role === 'caregiver' || role === 'careseeker' || role === 'volunteer')
      ? { ...mockAgency, ...(overrides?.agency || {}) }
      : null;

  const mockAuthValue = {
    user,
    agency,
    loading: overrides?.loading ?? false,
    initialized: overrides?.initialized ?? true,
    signInWithEmail: jest.fn().mockResolvedValue(undefined),
    signUpWithEmail: jest.fn().mockResolvedValue(undefined),
    signInWithPhone: jest.fn().mockResolvedValue(undefined),
    verifyOTP: jest.fn().mockResolvedValue(undefined),
    signOut: jest.fn().mockResolvedValue(undefined),
    refreshProfile: jest.fn().mockResolvedValue(undefined),
    isRole: jest.fn((roles: UserRole | UserRole[]) => {
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return user ? roleArray.includes(user.role) : false;
    }),
  };

  // Mock the useAuth hook
  jest.mock('@/contexts/AuthContext', () => ({
    useAuth: () => mockAuthValue,
    useRequireRole: (allowedRoles: UserRole | UserRole[]) => ({
      hasAccess: mockAuthValue.isRole(allowedRoles),
      loading: mockAuthValue.loading,
      user: mockAuthValue.user,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  }));

  return mockAuthValue;
}

/**
 * Simple render helper (no auth wrapper needed since we mock at module level).
 */
export function renderScreen(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  return render(ui, options);
}

/**
 * Mock expo-router with custom params
 */
export function mockRouter(params?: Record<string, string>) {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    navigate: jest.fn(),
  };

  jest.mock('expo-router', () => ({
    useRouter: () => router,
    useLocalSearchParams: () => params || {},
    useSegments: () => [],
    usePathname: () => '/',
    Link: ({ children, ...props }: any) => {
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, props, children);
    },
    Stack: { Screen: ({ children }: any) => children ?? null },
    Tabs: { Screen: ({ children }: any) => children ?? null },
    Redirect: () => null,
  }));

  return router;
}
