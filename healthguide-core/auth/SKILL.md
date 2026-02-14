---
name: healthguide-core-auth
description: Role-based authentication for HealthGuide elder care app. Handles login, registration, and session management for 4 roles - agency owner, caregiver, careseeker, and family member. Use when implementing auth screens, role detection, protected routes, or Supabase Auth integration.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: core
  tags: [authentication, supabase, roles, expo]
---

# HealthGuide Core Authentication

## Overview
Implements secure, role-based authentication using Supabase Auth with Expo. Each user role has distinct capabilities and UI flows.

## User Roles

| Role | Auth Method | Post-Login Flow |
|------|-------------|-----------------|
| Agency Owner | Email/Password | Dashboard with caregiver/careseeker management |
| Caregiver | Phone/PIN (minimal typing) | Visual schedule view |
| Careseeker | Email/Password (often family sets up) | Task selection, passive thereafter |
| Family Member | Phone only (no app required) | SMS notifications only |

## Instructions

### Step 1: Supabase Auth Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### Step 2: User Profile with Role

```typescript
// types/auth.ts
export type UserRole = 'agency_owner' | 'caregiver' | 'careseeker' | 'family_member';

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  role: UserRole;
  agency_id?: string; // Links caregiver/careseeker to agency
  full_name: string;
  avatar_url?: string;
  created_at: string;
}
```

### Step 3: Auth Context

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types/auth';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data && !error) {
      setUser(data);
    }
  }

  // ... implement signIn, signInWithPhone, verifyOTP, signOut

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, loading, signIn, signInWithPhone, verifyOTP, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Step 4: Role-Based Route Protection

```typescript
// components/ProtectedRoute.tsx
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { UserRole } from '@/types/auth';

interface Props {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect href="/login" />;
  if (!allowedRoles.includes(role!)) return <Redirect href="/unauthorized" />;

  return <>{children}</>;
}
```

### Step 5: Caregiver Phone Auth (Minimal Typing)

```typescript
// Caregivers use phone + PIN for easy access
async function signInCaregiver(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      channel: 'sms',
    },
  });
  if (error) throw error;
}

async function verifyCaregiverOTP(phone: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  if (error) throw error;
}
```

## File Structure

```
src/
├── lib/
│   └── supabase.ts
├── contexts/
│   └── AuthContext.tsx
├── types/
│   └── auth.ts
├── components/
│   └── ProtectedRoute.tsx
└── app/
    ├── (auth)/
    │   ├── login.tsx
    │   ├── register.tsx
    │   └── verify-otp.tsx
    └── (protected)/
        ├── agency/
        ├── caregiver/
        └── careseeker/
```

## Supabase Database Setup

See `healthguide-supabase/schema` skill for complete database schema including the `profiles` table with role management.

## Security Considerations

- Agency owners can only see their own caregivers/careseekers
- Caregivers can only see their assigned careseekers
- Family members receive notifications but don't have app access
- All API calls are protected by Row Level Security (RLS)

## Troubleshooting

### Error: Session not persisting on app restart
**Cause:** AsyncStorage not properly configured
**Solution:** Ensure `@react-native-async-storage/async-storage` is installed and linked

### Error: OTP not received
**Cause:** Twilio/SMS provider not configured in Supabase
**Solution:** Configure SMS provider in Supabase Dashboard > Authentication > Providers
