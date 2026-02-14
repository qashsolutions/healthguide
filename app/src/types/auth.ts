// HealthGuide Auth Types
// Per healthguide-core/auth skill

export type UserRole = 'agency_owner' | 'caregiver' | 'careseeker' | 'volunteer' | 'family_member';

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  role: UserRole;
  agency_id?: string; // Links caregiver/careseeker/volunteer to agency
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    [key: string]: any;
  };
}

// Alias for backwards compatibility
export type User = UserProfile;

export interface Agency {
  id: string;
  name: string;
  owner_id: string;
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled';
  subscription_id?: string;
  max_caregivers: number;
  max_careseekers: number;
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  agency: Agency | null;
  loading: boolean;
  initialized: boolean;
}

// Auth method by role
export const AUTH_METHODS: Record<UserRole, 'email' | 'phone' | 'none'> = {
  agency_owner: 'email',
  caregiver: 'phone',
  careseeker: 'email',
  volunteer: 'phone',
  family_member: 'none', // SMS notifications only
};
