/**
 * Mock data for E2E tests — mirrors unit test helpers.
 */

export type UserRole = 'agency_owner' | 'caregiver' | 'careseeker' | 'volunteer' | 'family_member';

export interface MockUser {
  id: string;
  email?: string;
  phone?: string;
  role: UserRole;
  full_name: string;
  first_name?: string;
  last_name?: string;
  agency_id?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MockAgency {
  id: string;
  name: string;
  owner_id: string;
  subscription_status: string;
  max_caregivers: number;
  max_elders: number;
  created_at: string;
}

export const mockUsers: Record<UserRole, MockUser> = {
  agency_owner: {
    id: 'user-agency-owner-1',
    email: 'owner@agency.com',
    role: 'agency_owner',
    full_name: 'Test Agency Owner',
    first_name: 'Test',
    last_name: 'Agency Owner',
    agency_id: 'agency-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  caregiver: {
    id: 'user-caregiver-1',
    phone: '+15551234567',
    role: 'caregiver',
    full_name: 'Test Caregiver',
    first_name: 'Test',
    last_name: 'Caregiver',
    agency_id: 'agency-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  careseeker: {
    id: 'user-careseeker-1',
    email: 'elder@test.com',
    role: 'careseeker',
    full_name: 'Test Elder',
    first_name: 'Test',
    last_name: 'Elder',
    agency_id: 'agency-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  volunteer: {
    id: 'user-volunteer-1',
    phone: '+15559876543',
    role: 'volunteer',
    full_name: 'Test Volunteer',
    first_name: 'Test',
    last_name: 'Volunteer',
    agency_id: 'agency-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  family_member: {
    id: 'user-family-1',
    phone: '+15555551234',
    role: 'family_member',
    full_name: 'Test Family Member',
    first_name: 'Test',
    last_name: 'Family Member',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
};

export const mockAgency: MockAgency = {
  id: 'agency-1',
  name: 'Test Care Agency',
  owner_id: 'user-agency-owner-1',
  subscription_status: 'active',
  max_caregivers: 10,
  max_elders: 20,
  created_at: '2025-01-01T00:00:00Z',
};

// Supabase project ref extracted from EXPO_PUBLIC_SUPABASE_URL
export const SUPABASE_PROJECT_REF = 'rcknxbfhghetquqdxmjw';
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja254YmZoZ2hldHF1cWR4bWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDQ0MzcsImV4cCI6MjA4NTc4MDQzN30.yxLCC1CbWfNl8lMX49Lvgnfi1wSpwCde7fJx4xt_L7s';
export const AUTH_STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

/** Mock Supabase session for localStorage injection */
export function createMockSession(user: MockUser) {
  return {
    access_token: `mock-access-token-${user.id}`,
    refresh_token: `mock-refresh-token-${user.id}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email || '',
      phone: user.phone || '',
      app_metadata: { provider: user.email ? 'email' : 'phone' },
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
      },
      created_at: user.created_at,
    },
  };
}

// Mock elders list
export const mockElders = [
  {
    id: 'elder-1',
    first_name: 'Margaret',
    last_name: 'Johnson',
    full_name: 'Margaret Johnson',
    age: 82,
    agency_id: 'agency-1',
    is_active: true,
    address: '123 Oak Street',
    city: 'Springfield',
    state: 'IL',
    phone: '+15551111111',
    emergency_contact: 'Tom Johnson',
    emergency_phone: '+15552222222',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'elder-2',
    first_name: 'Robert',
    last_name: 'Williams',
    full_name: 'Robert Williams',
    age: 78,
    agency_id: 'agency-1',
    is_active: true,
    address: '456 Maple Ave',
    city: 'Portland',
    state: 'OR',
    phone: '+15553333333',
    emergency_contact: 'Sarah Williams',
    emergency_phone: '+15554444444',
    created_at: '2025-01-02T00:00:00Z',
  },
];

// Mock caregiver_profiles (marketplace profiles — separate from user_profiles)
export const mockCaregiverProfiles = [
  {
    id: 'cp-1',
    user_id: 'user-caregiver-1',
    full_name: 'Test Caregiver',
    phone: '+15551234567',
    email: '',
    photo_url: null,
    zip_code: '43209',
    npi_number: null,
    npi_verified: false,
    npi_data: null,
    certifications: ['CNA', 'HHA'],
    experience_summary: '5 years of elder care experience',
    capabilities: ['Companionship', 'Meal Preparation', 'Medication Reminder'],
    availability: {},
    bio: 'Compassionate caregiver dedicated to elder wellness.',
    is_active: true,
    rating_count: 10,
    positive_count: 9,
    keywords: ['experienced', 'compassionate'],
    hourly_rate_min: 20,
    hourly_rate_max: 35,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

// Mock caregivers list
export const mockCaregivers = [
  {
    id: 'user-caregiver-1',
    full_name: 'Test Caregiver',
    phone: '+15551234567',
    role: 'caregiver',
    agency_id: 'agency-1',
    is_active: true,
    certifications: 'CNA, HHA',
    hourly_rate: 25,
    created_at: '2025-01-01T00:00:00Z',
    user: { first_name: 'Test', last_name: 'Caregiver' },
  },
  {
    id: 'user-caregiver-2',
    full_name: 'Jane Doe',
    phone: '+15559999999',
    role: 'caregiver',
    agency_id: 'agency-1',
    is_active: true,
    certifications: 'RN',
    hourly_rate: 35,
    created_at: '2025-01-03T00:00:00Z',
    user: { first_name: 'Jane', last_name: 'Doe' },
  },
];

// Helper: today's date in yyyy-MM-dd format
const todayStr = new Date().toISOString().split('T')[0];

// Mock visits — use fields the dashboard queries expect (start_time, end_time, scheduled_date)
export const mockVisits = [
  {
    id: 'visit-1',
    caregiver_id: 'user-caregiver-1',
    elder_id: 'elder-1',
    agency_id: 'agency-1',
    status: 'scheduled',
    scheduled_date: todayStr,
    start_time: '09:00',
    end_time: '12:00',
    scheduled_start: `${todayStr}T09:00:00Z`,
    scheduled_end: `${todayStr}T12:00:00Z`,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z',
    caregiver: { user: { first_name: 'Test', last_name: 'Caregiver' } },
    elder: { first_name: 'Margaret', last_name: 'Johnson' },
  },
  {
    id: 'visit-2',
    caregiver_id: 'user-caregiver-1',
    elder_id: 'elder-2',
    agency_id: 'agency-1',
    status: 'completed',
    scheduled_date: todayStr,
    start_time: '14:00',
    end_time: '17:00',
    scheduled_start: `${todayStr}T14:00:00Z`,
    scheduled_end: `${todayStr}T17:00:00Z`,
    actual_check_in: `${todayStr}T14:05:00Z`,
    actual_check_out: `${todayStr}T17:10:00Z`,
    check_in_time: `${todayStr}T14:05:00Z`,
    check_out_time: `${todayStr}T17:10:00Z`,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: `${todayStr}T17:10:00Z`,
    caregiver: { user: { first_name: 'Test', last_name: 'Caregiver' } },
    elder: { first_name: 'Robert', last_name: 'Williams' },
  },
];

// Mock tasks for visit
export const mockTasks = [
  { id: 'task-1', name: 'Medication Reminder', category: 'health', is_default: true },
  { id: 'task-2', name: 'Meal Preparation', category: 'daily_living', is_default: true },
  { id: 'task-3', name: 'Light Housekeeping', category: 'daily_living', is_default: true },
  { id: 'task-4', name: 'Companionship', category: 'social', is_default: true },
  { id: 'task-5', name: 'Personal Care', category: 'health', is_default: true },
];

// Mock support groups
export const mockSupportGroups = [
  {
    id: 'group-1',
    name: 'Caregiver Support Circle',
    description: 'A supportive community for caregivers',
    created_by: 'user-caregiver-1',
    member_count: 12,
    created_at: '2025-01-01T00:00:00Z',
  },
];

// Mock care group (for family/join-group)
export const mockCareGroup = {
  id: 'care-group-1',
  name: 'Johnson Family Care',
  elder_name: 'Margaret Johnson',
  elder_id: 'elder-1',
  agency_id: 'agency-1',
  invite_code: 'ABCD1234',
  created_at: '2025-01-01T00:00:00Z',
};
