// HealthGuide Auth Hooks
// Per healthguide-core/auth skill - Authentication state management

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types/auth';

// ============================================
// Types
// ============================================

interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  role: UserRole | null;
}

interface UserProfile {
  id: string;
  agency_id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string;
  photo_url?: string;
  is_active: boolean;
}

// ============================================
// Hook: Auth state and methods
// ============================================

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user profile from user_profiles table
  const fetchUserProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // User exists in auth but not in profiles - may be new signup
        console.warn('Profile not found:', profileError);
        setUser(null);
        return;
      }

      const { data: authUser } = await supabase.auth.getUser();

      if (profile && authUser.user) {
        setUser({
          id: profile.id,
          email: profile.email,
          phone: profile.phone || authUser.user.phone || '',
          role: profile.role as UserRole,
          full_name: `${profile.first_name} ${profile.last_name}`,
          agency_id: profile.agency_id,
          avatar_url: profile.photo_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at || profile.created_at,
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          await fetchUserProfile(session.user.id);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Sign in with phone (send OTP)
  const signIn = useCallback(async (phone: string): Promise<void> => {
    setError(null);

    // Format phone number to E.164 format if needed
    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (signInError) {
      throw signInError;
    }
  }, []);

  // Verify OTP
  const verifyOTP = useCallback(async (phone: string, token: string): Promise<void> => {
    setError(null);

    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: 'sms',
    });

    if (verifyError) {
      throw verifyError;
    }

    if (data.user) {
      await fetchUserProfile(data.user.id);
    }
  }, [fetchUserProfile]);

  // Sign out
  const signOut = useCallback(async (): Promise<void> => {
    setError(null);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      throw signOutError;
    }

    setUser(null);
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    verifyOTP,
    signOut,
    isAuthenticated: !!user,
    role: user?.role || null,
  };
}

// ============================================
// Hook: Check if user has specific role
// ============================================

export function useHasRole(allowedRoles: UserRole[]): boolean {
  const { user } = useAuth();
  return user ? allowedRoles.includes(user.role) : false;
}

// ============================================
// Hook: Get current agency ID
// ============================================

export function useAgencyId(): string | null {
  const { user } = useAuth();
  return user?.agency_id || null;
}
