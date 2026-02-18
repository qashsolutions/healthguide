// HealthGuide Auth Context
// Per healthguide-core/auth skill - Role-based authentication

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Construct full_name from first_name + last_name (DB stores them separately)
      const profile = data as any;
      return {
        ...profile,
        full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User',
      } as UserProfile;
    } catch (err) {
      console.error('[Auth] fetchUserProfile exception:', err);
      return null;
    }
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

  // Initialize auth state — use a ref to prevent duplicate processing
  const initializingRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState(prev => ({ ...prev, loading: false, initialized: true }));
      return;
    }

    let mounted = true;

    async function loadSession(userId: string) {
      const profile = await fetchUserProfile(userId);
      let agency: Agency | null = null;
      if (profile?.agency_id) {
        agency = await fetchAgency(profile.agency_id);
      }
      if (mounted) {
        setState({ user: profile, agency, loading: false, initialized: true });
      }
    }

    // Listen for auth changes — this is the single source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION fires once on mount with the existing session (Supabase v2)
        // SIGNED_IN fires on actual login
        // Skip duplicate processing if already handling a session
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          if (initializingRef.current) return;
          initializingRef.current = true;

          if (session?.user) {
            await loadSession(session.user.id);
          } else if (mounted) {
            setState({ user: null, agency: null, loading: false, initialized: true });
          }

          initializingRef.current = false;
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setState({ user: null, agency: null, loading: false, initialized: true });
          }
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Silently refresh profile on token refresh or user update
          if (session?.user && !initializingRef.current) {
            initializingRef.current = true;
            await loadSession(session.user.id);
            initializingRef.current = false;
          }
        }
      }
    );

    // Fallback: if onAuthStateChange doesn't fire INITIAL_SESSION within 3s,
    // check session manually (covers edge cases with older Supabase client versions)
    const fallbackTimer = setTimeout(async () => {
      if (!mounted) return;
      // Only run if we haven't initialized yet
      setState(prev => {
        if (prev.initialized) return prev;
        // Trigger a manual check
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (!mounted) return;
          if (session?.user) {
            await loadSession(session.user.id);
          } else {
            setState(s => s.initialized ? s : { user: null, agency: null, loading: false, initialized: true });
          }
        });
        return prev;
      });
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
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
      // Split full_name into first_name/last_name for DB (table has separate columns)
      const nameParts = (profile.full_name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: data.user.id,
        first_name: profile.first_name || firstName,
        last_name: profile.last_name || lastName,
        phone: profile.phone,
        role: profile.role || 'agency_owner',
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
