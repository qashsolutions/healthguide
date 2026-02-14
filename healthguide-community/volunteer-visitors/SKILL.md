---
name: healthguide-community-volunteer-visitors
description: Platform connecting seniors with volunteer visitors for companionship. Includes volunteer registration, matching, visit scheduling, and safety features. Reduces elder isolation through regular social visits. Use when building volunteer management, visit matching, companion programs, or senior socialization features.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: community
  tags: [volunteers, companionship, visitors, senior-isolation, matching]
---

# HealthGuide Volunteer Visitor Program

## Overview
Connects isolated seniors with vetted volunteer visitors for companionship visits. Volunteers can sign up, complete basic verification, specify interests and availability, and get matched with elders who share similar interests. Reduces social isolation for seniors while providing meaningful engagement opportunities for volunteers.

## Key Features

- Volunteer registration and profile creation
- Interest-based matching algorithm
- Visit request and scheduling system
- In-app visit check-in/check-out (safety)
- Post-visit feedback from both parties
- Volunteer hours tracking and recognition
- Family notification of visits
- Emergency contact integration

## Data Models

```typescript
interface Volunteer {
  id: string;
  user_id: string; // Links to auth user
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  photo_url?: string;

  // Verification
  status: 'pending' | 'approved' | 'suspended';
  background_check_status: 'not_started' | 'pending' | 'passed' | 'failed';
  verified_at?: string;

  // Profile
  bio: string;
  interests: string[];
  languages: string[];
  availability: AvailabilitySlot[];
  max_visits_per_week: number;
  travel_radius_miles: number;

  // Location
  zip_code: string;
  latitude: number;
  longitude: number;

  // Stats
  total_visits: number;
  total_hours: number;
  rating: number;

  created_at: string;
}

interface AvailabilitySlot {
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start_time: string; // HH:MM
  end_time: string;
}

interface ElderVisitorProfile {
  id: string;
  elder_id: string;
  is_accepting_visitors: boolean;
  interests: string[];
  preferred_activities: string[];
  languages: string[];
  visit_preferences: {
    preferred_days: number[];
    preferred_times: 'morning' | 'afternoon' | 'evening';
    visit_duration_minutes: number;
    indoor_only: boolean;
  };
  notes_for_visitors?: string;
  family_approval_required: boolean;
}

interface VolunteerVisit {
  id: string;
  volunteer_id: string;
  elder_id: string;

  // Scheduling
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

  // Actual visit
  actual_check_in?: string;
  actual_check_out?: string;
  duration_minutes?: number;

  // Activities
  activities_planned: string[];
  activities_completed: string[];

  // Feedback
  volunteer_notes?: string;
  elder_mood_after?: 1 | 2 | 3 | 4 | 5;
  volunteer_rating?: 1 | 2 | 3 | 4 | 5;

  created_at: string;
}

interface VolunteerMatch {
  id: string;
  volunteer_id: string;
  elder_id: string;
  match_score: number;
  matched_interests: string[];
  status: 'suggested' | 'accepted' | 'declined';
  created_at: string;
}
```

## Instructions

### Step 1: Database Schema

```sql
-- supabase/migrations/021_volunteer_tables.sql

-- ============================================
-- VOLUNTEERS TABLE
-- ============================================
CREATE TABLE volunteers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT,

  -- Verification
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  background_check_status TEXT DEFAULT 'not_started' CHECK (
    background_check_status IN ('not_started', 'pending', 'passed', 'failed')
  ),
  verified_at TIMESTAMPTZ,

  -- Profile
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT ARRAY['English'],
  availability JSONB DEFAULT '[]'::jsonb,
  max_visits_per_week INTEGER DEFAULT 2,
  travel_radius_miles INTEGER DEFAULT 10,

  -- Location
  zip_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(POINT, 4326),

  -- Stats
  total_visits INTEGER DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 5.0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteers_status ON volunteers(status);
CREATE INDEX idx_volunteers_location ON volunteers USING GIST(location);
CREATE INDEX idx_volunteers_interests ON volunteers USING GIN(interests);

-- Location trigger
CREATE TRIGGER volunteer_location_trigger
BEFORE INSERT OR UPDATE ON volunteers
FOR EACH ROW
EXECUTE FUNCTION update_elder_location(); -- Reuse existing function

-- ============================================
-- ELDER VISITOR PROFILES TABLE
-- ============================================
CREATE TABLE elder_visitor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  is_accepting_visitors BOOLEAN DEFAULT false,
  interests TEXT[] DEFAULT '{}',
  preferred_activities TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT ARRAY['English'],

  visit_preferences JSONB DEFAULT '{
    "preferred_days": [1, 2, 3, 4, 5],
    "preferred_times": "afternoon",
    "visit_duration_minutes": 60,
    "indoor_only": false
  }'::jsonb,

  notes_for_visitors TEXT,
  family_approval_required BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(elder_id)
);

CREATE INDEX idx_elder_visitor_profiles_elder ON elder_visitor_profiles(elder_id);
CREATE INDEX idx_elder_visitor_profiles_interests ON elder_visitor_profiles USING GIN(interests);

-- ============================================
-- VOLUNTEER VISITS TABLE
-- ============================================
CREATE TABLE volunteer_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME NOT NULL,
  status TEXT DEFAULT 'requested' CHECK (status IN (
    'requested', 'confirmed', 'in_progress', 'completed', 'cancelled'
  )),

  -- Actual visit
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  duration_minutes INTEGER,

  -- Activities
  activities_planned TEXT[] DEFAULT '{}',
  activities_completed TEXT[] DEFAULT '{}',

  -- Feedback
  volunteer_notes TEXT,
  elder_mood_after INTEGER CHECK (elder_mood_after BETWEEN 1 AND 5),
  volunteer_rating INTEGER CHECK (volunteer_rating BETWEEN 1 AND 5),
  elder_feedback TEXT,

  -- Approvals
  family_approved BOOLEAN,
  family_approved_by UUID REFERENCES emergency_contacts(id),
  family_approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_volunteer_visits_volunteer ON volunteer_visits(volunteer_id);
CREATE INDEX idx_volunteer_visits_elder ON volunteer_visits(elder_id);
CREATE INDEX idx_volunteer_visits_date ON volunteer_visits(scheduled_date);
CREATE INDEX idx_volunteer_visits_status ON volunteer_visits(status);

-- ============================================
-- VOLUNTEER MATCHES TABLE
-- ============================================
CREATE TABLE volunteer_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  match_score INTEGER NOT NULL, -- 0-100
  matched_interests TEXT[] DEFAULT '{}',
  distance_miles DECIMAL(10, 2),

  status TEXT DEFAULT 'suggested' CHECK (status IN (
    'suggested', 'accepted', 'declined', 'blocked'
  )),

  suggested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  UNIQUE(volunteer_id, elder_id)
);

CREATE INDEX idx_volunteer_matches_volunteer ON volunteer_matches(volunteer_id);
CREATE INDEX idx_volunteer_matches_elder ON volunteer_matches(elder_id);
CREATE INDEX idx_volunteer_matches_score ON volunteer_matches(match_score DESC);

-- ============================================
-- UPDATE VOLUNTEER STATS TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_volunteer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE volunteers
    SET
      total_visits = total_visits + 1,
      total_hours = total_hours + (COALESCE(NEW.duration_minutes, 0) / 60.0)
    WHERE id = NEW.volunteer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER volunteer_stats_trigger
AFTER UPDATE ON volunteer_visits
FOR EACH ROW EXECUTE FUNCTION update_volunteer_stats();
```

### Step 2: Volunteer Registration Flow

```typescript
// app/(public)/volunteer/register.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LargeInput } from '@/components/ui/LargeInput';
import { TextArea } from '@/components/ui/TextArea';
import { InterestSelector } from '@/components/volunteer/InterestSelector';
import { AvailabilityPicker } from '@/components/volunteer/AvailabilityPicker';
import { Button } from '@/components/ui/Button';
import { ProgressSteps } from '@/components/ui/ProgressSteps';

const STEPS = ['Basic Info', 'Interests', 'Availability', 'Review'];

const INTERESTS = [
  { id: 'reading', label: 'Reading', icon: '📚' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'gardening', label: 'Gardening', icon: '🌱' },
  { id: 'crafts', label: 'Crafts', icon: '🎨' },
  { id: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
  { id: 'games', label: 'Games', icon: '🎲' },
  { id: 'movies', label: 'Movies/TV', icon: '🎬' },
  { id: 'walking', label: 'Walking', icon: '🚶' },
  { id: 'pets', label: 'Pets', icon: '🐕' },
  { id: 'technology', label: 'Technology', icon: '📱' },
  { id: 'history', label: 'History', icon: '📜' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
];

export default function VolunteerRegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    zipCode: '',
    bio: '',
    interests: [] as string[],
    languages: ['English'],
    availability: [] as AvailabilitySlot[],
    maxVisitsPerWeek: 2,
    travelRadius: 10,
  });
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit() {
    setSubmitting(true);

    // Create auth user first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: Math.random().toString(36).slice(-12), // Temp password
      options: {
        data: { role: 'volunteer' },
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      setSubmitting(false);
      return;
    }

    // Geocode zip code
    const geoResponse = await fetch(
      `https://api.zippopotam.us/us/${form.zipCode}`
    );
    const geoData = await geoResponse.json();
    const lat = parseFloat(geoData.places?.[0]?.latitude || '0');
    const lng = parseFloat(geoData.places?.[0]?.longitude || '0');

    // Create volunteer profile
    await supabase.from('volunteers').insert({
      user_id: authData.user?.id,
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      phone: form.phone,
      zip_code: form.zipCode,
      latitude: lat,
      longitude: lng,
      bio: form.bio,
      interests: form.interests,
      languages: form.languages,
      availability: form.availability,
      max_visits_per_week: form.maxVisitsPerWeek,
      travel_radius_miles: form.travelRadius,
      status: 'pending',
    });

    setSubmitting(false);
    router.push('/volunteer/registration-complete');
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>Tell us about yourself</Text>
            <LargeInput
              label="First Name"
              value={form.firstName}
              onChangeText={(v) => updateForm('firstName', v)}
            />
            <LargeInput
              label="Last Name"
              value={form.lastName}
              onChangeText={(v) => updateForm('lastName', v)}
            />
            <LargeInput
              label="Email"
              value={form.email}
              onChangeText={(v) => updateForm('email', v)}
              keyboardType="email-address"
            />
            <LargeInput
              label="Phone"
              value={form.phone}
              onChangeText={(v) => updateForm('phone', v)}
              keyboardType="phone-pad"
            />
            <LargeInput
              label="ZIP Code"
              value={form.zipCode}
              onChangeText={(v) => updateForm('zipCode', v)}
              keyboardType="number-pad"
              maxLength={5}
            />
            <TextArea
              label="Brief Bio"
              value={form.bio}
              onChangeText={(v) => updateForm('bio', v)}
              placeholder="Tell seniors a bit about yourself..."
              maxLength={500}
            />
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>What are your interests?</Text>
            <Text style={styles.stepSubtitle}>
              We'll match you with seniors who share similar interests
            </Text>
            <InterestSelector
              options={INTERESTS}
              selected={form.interests}
              onSelect={(interests) => updateForm('interests', interests)}
              maxSelect={6}
            />
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>When are you available?</Text>
            <Text style={styles.stepSubtitle}>
              Select times when you can visit seniors
            </Text>
            <AvailabilityPicker
              value={form.availability}
              onChange={(avail) => updateForm('availability', avail)}
            />
            <View style={styles.prefsSection}>
              <Text style={styles.prefLabel}>
                How many visits per week? {form.maxVisitsPerWeek}
              </Text>
              {/* Slider component */}
              <Text style={styles.prefLabel}>
                Travel distance: {form.travelRadius} miles
              </Text>
              {/* Slider component */}
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Review Your Profile</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewName}>
                {form.firstName} {form.lastName}
              </Text>
              <Text style={styles.reviewEmail}>{form.email}</Text>
              <Text style={styles.reviewBio}>{form.bio}</Text>
              <View style={styles.reviewInterests}>
                {form.interests.map((interest) => (
                  <View key={interest} style={styles.interestChip}>
                    <Text style={styles.interestChipText}>
                      {INTERESTS.find((i) => i.id === interest)?.icon}{' '}
                      {INTERESTS.find((i) => i.id === interest)?.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={styles.disclaimer}>
              By submitting, you agree to a background check and our volunteer
              guidelines. We'll contact you once approved.
            </Text>
          </View>
        );
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return form.firstName && form.lastName && form.email && form.phone && form.zipCode;
      case 1:
        return form.interests.length >= 2;
      case 2:
        return form.availability.length >= 1;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProgressSteps steps={STEPS} currentStep={step} />

      {renderStep()}

      <View style={styles.buttons}>
        {step > 0 && (
          <Button
            title="Back"
            variant="outline"
            onPress={() => setStep(step - 1)}
            style={styles.backButton}
          />
        )}
        <Button
          title={step === STEPS.length - 1 ? 'Submit Application' : 'Continue'}
          onPress={() => {
            if (step === STEPS.length - 1) {
              handleSubmit();
            } else {
              setStep(step + 1);
            }
          }}
          disabled={!canProceed()}
          loading={submitting}
          style={styles.nextButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 24,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  prefsSection: {
    marginTop: 24,
  },
  prefLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  reviewName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  reviewEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  reviewBio: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  reviewInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestChipText: {
    fontSize: 13,
    color: '#4338CA',
  },
  disclaimer: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
```

### Step 3: Matching Algorithm Edge Function

```typescript
// supabase/functions/match-volunteers/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface MatchRequest {
  elder_id: string;
}

serve(async (req) => {
  const { elder_id }: MatchRequest = await req.json();

  // Get elder's visitor profile
  const { data: elderProfile } = await supabase
    .from('elder_visitor_profiles')
    .select(`
      *,
      elder:elders (
        latitude,
        longitude,
        first_name
      )
    `)
    .eq('elder_id', elder_id)
    .single();

  if (!elderProfile || !elderProfile.is_accepting_visitors) {
    return new Response(
      JSON.stringify({ error: 'Elder not accepting visitors' }),
      { status: 400 }
    );
  }

  // Get approved volunteers within radius
  const { data: volunteers } = await supabase
    .from('volunteers')
    .select('*')
    .eq('status', 'approved')
    .eq('background_check_status', 'passed');

  if (!volunteers || volunteers.length === 0) {
    return new Response(
      JSON.stringify({ matches: [] }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Calculate match scores
  const matches = volunteers
    .map((volunteer) => {
      // Calculate distance
      const distance = calculateDistance(
        elderProfile.elder.latitude,
        elderProfile.elder.longitude,
        volunteer.latitude,
        volunteer.longitude
      );

      // Skip if outside travel radius
      if (distance > volunteer.travel_radius_miles) {
        return null;
      }

      // Calculate interest overlap
      const elderInterests = elderProfile.interests || [];
      const volunteerInterests = volunteer.interests || [];
      const matchedInterests = elderInterests.filter((i: string) =>
        volunteerInterests.includes(i)
      );

      // Calculate language match
      const elderLanguages = elderProfile.languages || ['English'];
      const volunteerLanguages = volunteer.languages || ['English'];
      const languageMatch = elderLanguages.some((l: string) =>
        volunteerLanguages.includes(l)
      );

      if (!languageMatch) {
        return null; // Must have at least one common language
      }

      // Calculate availability overlap
      const elderPrefs = elderProfile.visit_preferences;
      const volunteerAvail = volunteer.availability || [];
      const availabilityMatch = volunteerAvail.some((slot: any) =>
        elderPrefs.preferred_days.includes(slot.day_of_week)
      );

      // Calculate score (0-100)
      let score = 0;
      score += matchedInterests.length * 15; // Up to 90 points for 6 interests
      score += availabilityMatch ? 10 : 0;
      score += (10 - Math.min(distance, 10)) * 1; // Up to 10 points for proximity
      score = Math.min(score, 100);

      return {
        volunteer_id: volunteer.id,
        elder_id,
        match_score: score,
        matched_interests: matchedInterests,
        distance_miles: Math.round(distance * 10) / 10,
        volunteer_name: `${volunteer.first_name} ${volunteer.last_name.charAt(0)}.`,
        volunteer_photo: volunteer.photo_url,
        volunteer_bio: volunteer.bio,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.match_score - a.match_score)
    .slice(0, 10); // Top 10 matches

  // Store matches
  for (const match of matches) {
    await supabase
      .from('volunteer_matches')
      .upsert({
        volunteer_id: match.volunteer_id,
        elder_id: match.elder_id,
        match_score: match.match_score,
        matched_interests: match.matched_interests,
        distance_miles: match.distance_miles,
        status: 'suggested',
      }, {
        onConflict: 'volunteer_id,elder_id',
      });
  }

  return new Response(
    JSON.stringify({ matches }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
```

### Step 4: Visit Scheduling Screen

```typescript
// app/(protected)/volunteer/schedule-visit/[elderId].tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format, addDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/Calendar';
import { TimeSlotPicker } from '@/components/volunteer/TimeSlotPicker';
import { ActivitySelector } from '@/components/volunteer/ActivitySelector';
import { Button } from '@/components/ui/Button';
import * as Haptics from 'expo-haptics';

const ACTIVITIES = [
  { id: 'conversation', label: 'Conversation', icon: '💬' },
  { id: 'reading', label: 'Read Together', icon: '📚' },
  { id: 'games', label: 'Play Games', icon: '🎲' },
  { id: 'walk', label: 'Go for a Walk', icon: '🚶' },
  { id: 'crafts', label: 'Arts & Crafts', icon: '🎨' },
  { id: 'music', label: 'Listen to Music', icon: '🎵' },
  { id: 'photos', label: 'Look at Photos', icon: '📷' },
  { id: 'tech_help', label: 'Tech Help', icon: '📱' },
];

export default function ScheduleVisitScreen() {
  const { elderId } = useLocalSearchParams<{ elderId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [elder, setElder] = useState<any>(null);
  const [volunteer, setVolunteer] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Get elder info
    const { data: elderData } = await supabase
      .from('elders')
      .select(`
        *,
        visitor_profile:elder_visitor_profiles (*)
      `)
      .eq('id', elderId)
      .single();

    if (elderData) setElder(elderData);

    // Get volunteer info
    const { data: volunteerData } = await supabase
      .from('volunteers')
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (volunteerData) setVolunteer(volunteerData);
  }

  async function handleSchedule() {
    if (!selectedDate || !selectedTime || !volunteer) return;

    setScheduling(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const [startHour, startMin] = selectedTime.split(':').map(Number);
    const duration = elder.visitor_profile?.visit_preferences?.visit_duration_minutes || 60;
    const endHour = startHour + Math.floor(duration / 60);
    const endMin = startMin + (duration % 60);

    const { data: visit, error } = await supabase
      .from('volunteer_visits')
      .insert({
        volunteer_id: volunteer.id,
        elder_id: elderId,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        scheduled_start_time: selectedTime,
        scheduled_end_time: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`,
        activities_planned: selectedActivities,
        status: elder.visitor_profile?.family_approval_required ? 'requested' : 'confirmed',
      })
      .select()
      .single();

    // Notify family if approval required
    if (elder.visitor_profile?.family_approval_required) {
      await supabase.functions.invoke('notify-family-visit-request', {
        body: {
          visit_id: visit!.id,
          elder_id: elderId,
          volunteer_name: `${volunteer.first_name} ${volunteer.last_name}`,
          scheduled_date: format(selectedDate, 'EEEE, MMMM d'),
          scheduled_time: selectedTime,
        },
      });
    }

    setScheduling(false);
    router.push('/volunteer/visits');
  }

  if (!elder || !volunteer) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Elder Card */}
      <View style={styles.elderCard}>
        {elder.photo_url ? (
          <Image source={{ uri: elder.photo_url }} style={styles.elderPhoto} />
        ) : (
          <View style={styles.elderPhotoPlaceholder}>
            <Text style={styles.elderInitials}>
              {elder.first_name[0]}{elder.last_name[0]}
            </Text>
          </View>
        )}
        <View style={styles.elderInfo}>
          <Text style={styles.elderName}>
            {elder.first_name} {elder.last_name}
          </Text>
          <Text style={styles.elderAddress}>{elder.city}, {elder.state}</Text>
        </View>
      </View>

      {/* Date Selection */}
      <Text style={styles.sectionTitle}>Select a Date</Text>
      <Calendar
        minDate={addDays(new Date(), 1)}
        maxDate={addDays(new Date(), 30)}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        highlightedDays={elder.visitor_profile?.visit_preferences?.preferred_days}
      />

      {/* Time Selection */}
      {selectedDate && (
        <>
          <Text style={styles.sectionTitle}>Select a Time</Text>
          <TimeSlotPicker
            date={selectedDate}
            volunteerAvailability={volunteer.availability}
            elderPreferences={elder.visitor_profile?.visit_preferences}
            selectedTime={selectedTime}
            onSelectTime={setSelectedTime}
          />
        </>
      )}

      {/* Activity Selection */}
      {selectedTime && (
        <>
          <Text style={styles.sectionTitle}>What would you like to do?</Text>
          <Text style={styles.sectionSubtitle}>
            Select activities you'd like to enjoy together
          </Text>
          <ActivitySelector
            activities={ACTIVITIES}
            elderPreferred={elder.visitor_profile?.preferred_activities}
            selected={selectedActivities}
            onSelect={setSelectedActivities}
          />
        </>
      )}

      {/* Family Approval Notice */}
      {elder.visitor_profile?.family_approval_required && (
        <View style={styles.approvalNotice}>
          <Text style={styles.approvalIcon}>👨‍👩‍👧</Text>
          <Text style={styles.approvalText}>
            This visit requires family approval. They'll be notified of your request.
          </Text>
        </View>
      )}

      <Button
        title={
          elder.visitor_profile?.family_approval_required
            ? 'Request Visit'
            : 'Schedule Visit'
        }
        onPress={handleSchedule}
        disabled={!selectedDate || !selectedTime || selectedActivities.length === 0}
        loading={scheduling}
        size="large"
        style={styles.scheduleButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  elderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 24,
  },
  elderPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  elderPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  elderInitials: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
  },
  elderInfo: {
    flex: 1,
  },
  elderName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  elderAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    marginTop: -8,
  },
  approvalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  approvalIcon: {
    fontSize: 24,
  },
  approvalText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  scheduleButton: {
    marginTop: 32,
  },
});
```

### Step 5: Family Visit Approval

```typescript
// supabase/functions/notify-family-visit-request/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const { visit_id, elder_id, volunteer_name, scheduled_date, scheduled_time } = await req.json();

  // Get elder info and family contacts
  const { data: elder } = await supabase
    .from('elders')
    .select('first_name')
    .eq('id', elder_id)
    .single();

  const { data: contacts } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('elder_id', elder_id)
    .eq('receives_notifications', true);

  if (!contacts || contacts.length === 0) {
    // Auto-approve if no family contacts
    await supabase
      .from('volunteer_visits')
      .update({ status: 'confirmed' })
      .eq('id', visit_id);

    return new Response(JSON.stringify({ auto_approved: true }));
  }

  // Send SMS to family members
  const approvalLink = `${Deno.env.get('APP_URL')}/approve-visit/${visit_id}`;

  for (const contact of contacts) {
    const message = `HealthGuide: ${volunteer_name} would like to visit ${elder!.first_name} on ${scheduled_date} at ${scheduled_time}. Approve or decline: ${approvalLink}`;

    await supabase.functions.invoke('send-sms', {
      body: {
        to: contact.phone,
        body: message,
        contact_id: contact.id,
        elder_id,
        message_type: 'visit_approval',
      },
    });
  }

  return new Response(
    JSON.stringify({ notified: contacts.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## Troubleshooting

### No matches found
**Cause:** No approved volunteers in area or no interest overlap
**Solution:** Expand search radius, encourage volunteer registration in area

### Visit not confirmed
**Cause:** Family approval pending
**Solution:** Check family notification delivery, add reminder after 24 hours

### Volunteer location wrong
**Cause:** ZIP code geocoding failed
**Solution:** Add fallback to manual address entry
