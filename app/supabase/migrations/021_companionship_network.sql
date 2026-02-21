-- Migration 021: Companionship Network
-- Adds new tables and columns for the companionship pivot:
-- student/55+ companion signup, visit requests, agency linking,
-- EVV enhancements, ratings, favorites, scope tracking.

------------------------------------------------------------
-- 1. Extend caregiver_profiles (new columns only)
------------------------------------------------------------
ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS caregiver_type text DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS college_name text,
  ADD COLUMN IF NOT EXISTS college_city text,
  ADD COLUMN IF NOT EXISTS college_state text,
  ADD COLUMN IF NOT EXISTS college_zip text,
  ADD COLUMN IF NOT EXISTS edu_email text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS travel_radius_miles integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS has_transportation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT ARRAY['english'],
  ADD COLUMN IF NOT EXISTS program_name text,
  ADD COLUMN IF NOT EXISTS expected_graduation_year integer,
  ADD COLUMN IF NOT EXISTS is_independent boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caregiver_profiles_caregiver_type_check') THEN
    ALTER TABLE caregiver_profiles ADD CONSTRAINT caregiver_profiles_caregiver_type_check
      CHECK (caregiver_type IN ('student', 'companion_55', 'professional'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caregiver_profiles_gender_check') THEN
    ALTER TABLE caregiver_profiles ADD CONSTRAINT caregiver_profiles_gender_check
      CHECK (gender IN ('male', 'female', 'other'));
  END IF;
END $$;

------------------------------------------------------------
-- 2. Extend elders
------------------------------------------------------------
ALTER TABLE elders
  ADD COLUMN IF NOT EXISTS needs text[] DEFAULT ARRAY['companionship'],
  ADD COLUMN IF NOT EXISTS preferred_schedule jsonb,
  ADD COLUMN IF NOT EXISTS preferred_gender text DEFAULT 'no_preference',
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT ARRAY['english'],
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'elders_preferred_gender_check') THEN
    ALTER TABLE elders ADD CONSTRAINT elders_preferred_gender_check
      CHECK (preferred_gender IN ('male', 'female', 'no_preference'));
  END IF;
END $$;

------------------------------------------------------------
-- 3. Extend visits
------------------------------------------------------------
-- Make agency_id nullable for independent companion visits
ALTER TABLE visits ALTER COLUMN agency_id DROP NOT NULL;

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS transportation_cost decimal(8, 2),
  ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean DEFAULT false;

-- Extend status CHECK (preserve all existing + add new)
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;
ALTER TABLE visits ADD CONSTRAINT visits_status_check
  CHECK (status IN (
    'pending_acceptance', 'scheduled', 'checked_in', 'in_progress',
    'checked_out', 'completed', 'missed', 'cancelled', 'declined',
    'cancelled_late', 'no_show', 'elder_unavailable', 'emergency'
  ));

------------------------------------------------------------
-- 4. New table: visit_requests
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES elders(id),
  companion_id uuid REFERENCES auth.users(id),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  requested_date date NOT NULL,
  requested_time_slot text,
  tasks text[] NOT NULL DEFAULT ARRAY['companionship'],
  note text,
  is_auto_match boolean DEFAULT false,
  declined_companions uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

------------------------------------------------------------
-- 5. New table: agency_invites
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agency_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  companion_id uuid NOT NULL REFERENCES auth.users(id),
  direction text NOT NULL
    CHECK (direction IN ('agency_to_companion', 'companion_to_agency')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Partial unique: only one pending invite per agency+companion+direction
CREATE UNIQUE INDEX IF NOT EXISTS agency_invites_unique_pending
  ON agency_invites (agency_id, companion_id, direction)
  WHERE status = 'pending';

------------------------------------------------------------
-- 6. New table: visit_emergencies
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visit_emergencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id),
  reported_by uuid NOT NULL REFERENCES auth.users(id),
  emergency_type text NOT NULL
    CHECK (emergency_type IN ('911_called', 'family_called', 'other')),
  notes text,
  created_at timestamptz DEFAULT now()
);

------------------------------------------------------------
-- 7. New table: visit_ratings (replaces caregiver_ratings)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visit_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id),
  rated_by uuid NOT NULL REFERENCES auth.users(id),
  rated_user uuid NOT NULL REFERENCES auth.users(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  reason text,
  is_auto_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(visit_id, rated_by)
);

-- Average ratings view
CREATE OR REPLACE VIEW user_ratings_summary AS
SELECT
  rated_user,
  ROUND(AVG(rating)::numeric, 1) as avg_rating,
  COUNT(*) as total_ratings,
  COUNT(*) FILTER (WHERE is_auto_generated = false) as manual_ratings
FROM visit_ratings
GROUP BY rated_user;

------------------------------------------------------------
-- 8. New table: elder_favorites
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS elder_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id uuid NOT NULL REFERENCES elders(id),
  companion_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(elder_id, companion_id)
);

------------------------------------------------------------
-- 9. New table: scope_acceptances
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scope_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  visit_id uuid REFERENCES visits(id),
  accepted_at timestamptz DEFAULT now(),
  context text NOT NULL CHECK (context IN ('onboarding', 'check_in'))
);

------------------------------------------------------------
-- 10. Extend notifications.type CHECK
------------------------------------------------------------
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'shift_reminder', 'check_in_alert', 'check_out_alert', 'schedule_change',
    'missed_checkout', 'task_declined', 'general',
    'visit_request', 'visit_confirmed', 'visit_declined', 'visit_cancelled',
    'visit_completed', 'emergency', 'agency_invite', 'agency_application',
    'rating_request', 'no_show', 'auto_match'
  ));

------------------------------------------------------------
-- 11. RLS Policies
------------------------------------------------------------

-- visit_requests
ALTER TABLE visit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view related visit requests" ON visit_requests
  FOR SELECT USING (
    requested_by = auth.uid()
    OR companion_id = auth.uid()
    OR elder_id IN (SELECT elder_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert visit requests" ON visit_requests
  FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Companions can update own requests" ON visit_requests
  FOR UPDATE USING (companion_id = auth.uid());

-- agency_invites
ALTER TABLE agency_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own invites" ON agency_invites
  FOR SELECT USING (
    companion_id = auth.uid()
    OR agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid() AND role = 'agency_owner')
  );

CREATE POLICY "Create invites" ON agency_invites
  FOR INSERT WITH CHECK (
    companion_id = auth.uid()
    OR agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid() AND role = 'agency_owner')
  );

CREATE POLICY "Update own invites" ON agency_invites
  FOR UPDATE USING (
    companion_id = auth.uid()
    OR agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid() AND role = 'agency_owner')
  );

-- visit_ratings
ALTER TABLE visit_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings they gave or received" ON visit_ratings
  FOR SELECT USING (rated_by = auth.uid() OR rated_user = auth.uid());

CREATE POLICY "Users can insert own ratings" ON visit_ratings
  FOR INSERT WITH CHECK (rated_by = auth.uid());

-- elder_favorites
ALTER TABLE elder_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elder or family can manage favorites" ON elder_favorites
  FOR ALL USING (
    elder_id IN (
      SELECT fm.elder_id FROM family_members fm WHERE fm.user_id = auth.uid()
    )
  );

-- scope_acceptances
ALTER TABLE scope_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own acceptances" ON scope_acceptances
  FOR ALL USING (user_id = auth.uid());

-- visit_emergencies
ALTER TABLE visit_emergencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emergencies" ON visit_emergencies
  FOR SELECT USING (reported_by = auth.uid());

CREATE POLICY "Users can insert emergencies" ON visit_emergencies
  FOR INSERT WITH CHECK (reported_by = auth.uid());

------------------------------------------------------------
-- 12. Seed data: update agency-linked caregivers
------------------------------------------------------------
UPDATE caregiver_profiles SET
  caregiver_type = 'professional',
  capabilities = ARRAY['companionship', 'light_cleaning', 'groceries'],
  languages = ARRAY['english'],
  has_transportation = true,
  profile_completed = true
WHERE id IN (
  SELECT caregiver_profile_id FROM caregiver_agency_links
  WHERE agency_id = 'e5555555-5555-5555-5555-555555555555'
);

------------------------------------------------------------
-- 13. task_library: ensure 3 allowed tasks per agency
------------------------------------------------------------
INSERT INTO task_library (agency_id, name, description, category, icon, is_active)
SELECT a.id, t.name, t.description, t.category, t.icon, true
FROM agencies a
CROSS JOIN (VALUES
  ('Companionship', 'Conversation, games, walks, watching TV, reading', 'companionship', 'chatbubble-ellipses-outline'),
  ('Light Cleaning', 'Dishes, tidying, laundry, taking out trash', 'housekeeping', 'home-outline'),
  ('Groceries & Errands', 'Grocery shopping, pharmacy pickup, drive to store/appointment', 'errands', 'cart-outline')
) AS t(name, description, category, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM task_library tl
  WHERE tl.agency_id = a.id AND tl.name = t.name
);
