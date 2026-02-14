// HealthGuide Auth Context
// Per healthguide-core/auth skill - Role-based authentication

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserProfile, UserRole, Agency, AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  // Auth methods
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, profile: Partial<UserProfile>) => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Helpers
  refreshProfile: () => Promise<void>;
  isRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    agency: null,
    loading: true,
    initialized: false,
  });

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as UserProfile;
  }, []);

  // Fetch agency if user has one
  const fetchAgency = useCallback(async (agencyId: string): Promise<Agency | null> => {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', agencyId)
      .single();

    if (error) {
      console.error('Error fetching agency:', error);
      return null;
    }

    return data as Agency;
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState(prev => ({ ...prev, loading: false, initialized: true }));
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        let agency: Agency | null = null;

        if (profile?.agency_id) {
          agency = await fetchAgency(profile.agency_id);
        }

        setState({
          user: profile,
          agency,
          loading: false,
          initialized: true,
        });
      } else {
        setState(prev => ({ ...prev, loading: false, initialized: true }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          let agency: Agency | null = null;

          if (profile?.agency_id) {
            agency = await fetchAgency(profile.agency_id);
          }

          setState({
            user: profile,
            agency,
            loading: false,
            initialized: true,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            agency: null,
            loading: false,
            initialized: true,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, fetchAgency]);

  // Sign in with email (Agency owners, careseekers)
  const signInWithEmail = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true }));

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  // Sign up with email
  const signUpWithEmail = async (
    email: string,
    password: string,
    profile: Partial<UserProfile>
  ) => {
    setState(prev => ({ ...prev, loading: true }));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: profile.full_name,
          role: profile.role,
        },
      },
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }

    // Create profile record
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: profile.full_name,
        role: profile.role || 'agency_owner',
        ...profile,
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }
  };

  // Sign in with phone (Caregivers, volunteers)
  const signInWithPhone = async (phone: string) => {
    setState(prev => ({ ...prev, loading: true }));

    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms',
      },
    });

    setState(prev => ({ ...prev, loading: false }));

    if (error) {
      throw error;
    }
  };

  // Verify OTP
  const verifyOTP = async (phone: string, token: string) => {
    setState(prev => ({ ...prev, loading: true }));

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
    setState({
      user: null,
      agency: null,
      loading: false,
      initialized: true,
    });
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (!state.user?.id) return;

    const profile = await fetchUserProfile(state.user.id);
    if (profile) {
      let agency: Agency | null = state.agency;
      if (profile.agency_id && profile.agency_id !== state.agency?.id) {
        agency = await fetchAgency(profile.agency_id);
      }
      setState(prev => ({ ...prev, user: profile, agency }));
    }
  };

  // Check if user has specific role(s)
  const isRole = (roles: UserRole | UserRole[]): boolean => {
    if (!state.user?.role) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(state.user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithEmail,
        signUpWithEmail,
        signInWithPhone,
        verifyOTP,
        signOut,
        refreshProfile,
        isRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for requiring specific role(s)
export function useRequireRole(allowedRoles: UserRole | UserRole[]) {
  const { user, loading, isRole } = useAuth();
  const hasAccess = isRole(allowedRoles);

  return {
    hasAccess,
    loading,
    user,
  };
}
