---
name: healthguide-supabase-schema
description: Complete database schema for HealthGuide including agencies, users, elders, caregivers, assignments, tasks, notifications, and community features. Includes all tables, relationships, indexes, and triggers. Use when setting up the database, adding tables, or understanding data relationships.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: supabase
  tags: [database, schema, postgresql, tables]
---

# HealthGuide Database Schema

## Overview
PostgreSQL schema for the HealthGuide elder care platform. Multi-tenant design with agencies as the top-level entity. Supports caregivers, elders (careseekers), assignments, tasks, EVV, notifications, and community features (caregiver support groups, volunteer visitors, elder engagement).

## Entity Relationships

```
Agency (1) ──────< (N) Users (agency_owner, caregiver)
   │
   ├───< (N) Elders ──────< (N) Emergency Contacts
   │         │
   │         ├────< (N) Elder Task Preferences
   │         ├────< (1) Elder Visitor Profile
   │         └────< (1) Elder Engagement Profile
   │
   ├───< (N) Task Library
   │
   └───< (N) Assignments ──────< (N) Assignment Tasks
              │
              └────< (N) Observations

Community Features (Cross-Agency):
├── Support Groups ──< Group Memberships
│         └────────< Forum Posts ──< Post Replies
├── Volunteers ──< Volunteer Matches
│         └─────< Volunteer Visits
└── Wellness Check-ins
```

## Related Community Skills

For community table schemas, see:
- `healthguide-community/caregiver-support` - Support groups, forum posts, wellness check-ins
- `healthguide-community/volunteer-visitors` - Volunteers, matches, visits
- `healthguide-community/elder-engagement` - Engagement profiles, games, family video contacts

## Instructions

### Step 1: Core Tables Schema

```sql
-- supabase/migrations/001_core_tables.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- AGENCIES TABLE
-- ============================================
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Subscription info
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing',
  current_elder_count INTEGER DEFAULT 0,
  max_caregivers INTEGER DEFAULT 15,

  -- Settings
  evv_radius_meters INTEGER DEFAULT 100,
  default_timezone TEXT DEFAULT 'America/New_York',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agencies_stripe_customer ON agencies(stripe_customer_id);

-- ============================================
-- USERS TABLE (Auth extension)
-- ============================================
-- Note: Uses Supabase auth.users, this extends it
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('agency_owner', 'caregiver')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,

  -- Caregiver specific
  is_active BOOLEAN DEFAULT true,
  certifications TEXT[],
  hire_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_agency ON user_profiles(agency_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- ============================================
-- ELDERS (CARESEEKERS) TABLE
-- ============================================
CREATE TABLE elders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Personal info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  photo_url TEXT,

  -- Address (for EVV)
  address TEXT NOT NULL,
  apartment TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(POINT, 4326), -- PostGIS point

  -- Care info
  medical_notes TEXT,
  special_instructions TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_elders_agency ON elders(agency_id);
CREATE INDEX idx_elders_location ON elders USING GIST(location);

-- Trigger to update location point from lat/lng
CREATE OR REPLACE FUNCTION update_elder_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elder_location_trigger
BEFORE INSERT OR UPDATE ON elders
FOR EACH ROW
EXECUTE FUNCTION update_elder_location();

-- ============================================
-- EMERGENCY CONTACTS TABLE
-- ============================================
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_verified BOOLEAN DEFAULT false,

  receives_notifications BOOLEAN DEFAULT true,
  notification_preferences JSONB DEFAULT '{
    "check_in": true,
    "check_out": true,
    "daily_report": true,
    "delivery_time": "19:00",
    "timezone": "America/New_York"
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_elder ON emergency_contacts(elder_id);

-- Limit 3 contacts per elder
CREATE OR REPLACE FUNCTION check_contact_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM emergency_contacts WHERE elder_id = NEW.elder_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 emergency contacts per elder';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_limit_trigger
BEFORE INSERT ON emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION check_contact_limit();
```

### Step 2: Task and Assignment Tables

```sql
-- supabase/migrations/002_tasks_assignments.sql

-- ============================================
-- TASK LIBRARY TABLE
-- ============================================
CREATE TABLE task_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'personal_care', 'mobility', 'nutrition',
    'medication', 'housekeeping', 'companionship'
  )),
  icon TEXT NOT NULL, -- Emoji or icon name

  default_frequency TEXT DEFAULT 'every_visit',
  estimated_duration_minutes INTEGER,
  requires_notes BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_library_agency ON task_library(agency_id);
CREATE INDEX idx_task_library_category ON task_library(category);

-- ============================================
-- ELDER TASK PREFERENCES TABLE
-- ============================================
CREATE TABLE elder_task_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task_library(id) ON DELETE CASCADE,

  is_required BOOLEAN DEFAULT false,
  frequency TEXT DEFAULT 'every_visit' CHECK (frequency IN (
    'every_visit', 'daily', 'weekly', 'as_needed'
  )),
  special_instructions TEXT,

  UNIQUE(elder_id, task_id)
);

CREATE INDEX idx_elder_task_prefs_elder ON elder_task_preferences(elder_id);

-- ============================================
-- ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  -- Schedule
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- iCal RRULE format
  parent_assignment_id UUID REFERENCES assignments(id),

  -- EVV
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'checked_in', 'completed', 'missed', 'cancelled'
  )),
  actual_check_in TIMESTAMPTZ,
  actual_check_out TIMESTAMPTZ,
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  check_out_latitude DECIMAL(10, 8),
  check_out_longitude DECIMAL(11, 8),
  evv_method TEXT CHECK (evv_method IN ('gps', 'qr_code', 'manual')),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments_agency ON assignments(agency_id);
CREATE INDEX idx_assignments_caregiver ON assignments(caregiver_id);
CREATE INDEX idx_assignments_elder ON assignments(elder_id);
CREATE INDEX idx_assignments_date ON assignments(scheduled_date);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_caregiver_date ON assignments(caregiver_id, scheduled_date);

-- ============================================
-- ASSIGNMENT TASKS TABLE
-- ============================================
CREATE TABLE assignment_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task_library(id) ON DELETE RESTRICT,

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'skipped', 'declined'
  )),
  completed_at TIMESTAMPTZ,

  skip_reason TEXT,
  decline_reason TEXT,
  notes TEXT,

  UNIQUE(assignment_id, task_id)
);

CREATE INDEX idx_assignment_tasks_assignment ON assignment_tasks(assignment_id);
CREATE INDEX idx_assignment_tasks_status ON assignment_tasks(status);
```

### Step 3: Observations and Notifications Tables

```sql
-- supabase/migrations/003_observations_notifications.sql

-- ============================================
-- OBSERVATIONS TABLE
-- ============================================
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  category TEXT NOT NULL CHECK (category IN (
    'mood', 'health', 'appetite', 'mobility',
    'medication', 'sleep', 'social', 'general'
  )),

  -- Icon-based selection values
  mood_level INTEGER CHECK (mood_level BETWEEN 1 AND 5),
  appetite_level INTEGER CHECK (appetite_level BETWEEN 1 AND 5),
  mobility_level INTEGER CHECK (mobility_level BETWEEN 1 AND 5),

  note TEXT, -- Voice-to-text or typed
  is_flagged BOOLEAN DEFAULT false, -- For urgent observations

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_observations_assignment ON observations(assignment_id);
CREATE INDEX idx_observations_elder ON observations(elder_id);
CREATE INDEX idx_observations_category ON observations(category);
CREATE INDEX idx_observations_flagged ON observations(is_flagged) WHERE is_flagged = true;

-- ============================================
-- DEVICE TOKENS TABLE (Push Notifications)
-- ============================================
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, platform)
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'shift_reminder', 'check_in_alert', 'schedule_change',
    'missed_checkout', 'general'
  )),
  data JSONB,

  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- SMS MESSAGES TABLE (Logging)
-- ============================================
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES emergency_contacts(id) ON DELETE SET NULL,
  elder_id UUID REFERENCES elders(id) ON DELETE SET NULL,

  message_type TEXT NOT NULL CHECK (message_type IN (
    'check_in', 'check_out', 'daily_report', 'verification'
  )),
  message_body TEXT NOT NULL,

  twilio_sid TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued', 'sent', 'delivered', 'failed'
  )),

  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_sms_messages_contact ON sms_messages(contact_id);
CREATE INDEX idx_sms_messages_type ON sms_messages(message_type);

-- ============================================
-- VERIFICATION CODES TABLE
-- ============================================
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  UNIQUE(contact_id)
);

-- ============================================
-- DAILY REPORTS TABLE
-- ============================================
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,

  visits JSONB DEFAULT '[]'::jsonb,
  total_tasks_completed INTEGER DEFAULT 0,
  total_tasks_assigned INTEGER DEFAULT 0,
  observations JSONB DEFAULT '[]'::jsonb,
  missed_visits INTEGER DEFAULT 0,

  generated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(elder_id, report_date)
);

CREATE INDEX idx_daily_reports_elder ON daily_reports(elder_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date);
```

### Step 4: Helper Functions and Triggers

```sql
-- supabase/migrations/004_functions_triggers.sql

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_agencies_timestamp
BEFORE UPDATE ON agencies
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_profiles_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_elders_timestamp
BEFORE UPDATE ON elders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_assignments_timestamp
BEFORE UPDATE ON assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ASSIGNMENT STATUS AUTO-UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION check_missed_assignments()
RETURNS void AS $$
BEGIN
  UPDATE assignments
  SET status = 'missed'
  WHERE status = 'scheduled'
    AND scheduled_date < CURRENT_DATE
    AND actual_check_in IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ELDER COUNT SYNC
-- ============================================
CREATE OR REPLACE FUNCTION sync_elder_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE agencies
    SET current_elder_count = current_elder_count + 1
    WHERE id = NEW.agency_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE agencies
    SET current_elder_count = current_elder_count - 1
    WHERE id = OLD.agency_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elder_count_trigger
AFTER INSERT OR DELETE ON elders
FOR EACH ROW EXECUTE FUNCTION sync_elder_count();

-- ============================================
-- AUTO-CREATE ASSIGNMENT TASKS
-- ============================================
CREATE OR REPLACE FUNCTION create_assignment_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert tasks from elder's preferences
  INSERT INTO assignment_tasks (assignment_id, task_id)
  SELECT NEW.id, etp.task_id
  FROM elder_task_preferences etp
  WHERE etp.elder_id = NEW.elder_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignment_tasks_trigger
AFTER INSERT ON assignments
FOR EACH ROW EXECUTE FUNCTION create_assignment_tasks();

-- ============================================
-- DISTANCE CALCULATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Step 5: Seed Data for Task Library

```sql
-- supabase/migrations/005_seed_task_library.sql

-- Default task templates (agency can customize)
CREATE OR REPLACE FUNCTION seed_agency_tasks(p_agency_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO task_library (agency_id, name, category, icon, estimated_duration_minutes) VALUES
  -- Personal Care
  (p_agency_id, 'Bathing assistance', 'personal_care', '🛁', 30),
  (p_agency_id, 'Grooming/hygiene', 'personal_care', '🪥', 15),
  (p_agency_id, 'Dressing assistance', 'personal_care', '👕', 15),
  (p_agency_id, 'Toileting assistance', 'personal_care', '🚿', 10),
  (p_agency_id, 'Oral care', 'personal_care', '🦷', 10),

  -- Mobility
  (p_agency_id, 'Transfer assistance', 'mobility', '🦽', 10),
  (p_agency_id, 'Walking exercise', 'mobility', '🚶', 20),
  (p_agency_id, 'Range of motion exercises', 'mobility', '🤸', 15),
  (p_agency_id, 'Position change', 'mobility', '🔄', 5),

  -- Nutrition
  (p_agency_id, 'Meal preparation', 'nutrition', '🍳', 30),
  (p_agency_id, 'Feeding assistance', 'nutrition', '🥄', 30),
  (p_agency_id, 'Hydration reminder', 'nutrition', '💧', 5),
  (p_agency_id, 'Snack preparation', 'nutrition', '🍎', 10),

  -- Medication
  (p_agency_id, 'Medication reminder', 'medication', '💊', 5),
  (p_agency_id, 'Medication administration', 'medication', '💉', 10),
  (p_agency_id, 'Medication organization', 'medication', '📦', 15),

  -- Housekeeping
  (p_agency_id, 'Light housekeeping', 'housekeeping', '🧹', 30),
  (p_agency_id, 'Laundry', 'housekeeping', '🧺', 30),
  (p_agency_id, 'Bed making', 'housekeeping', '🛏️', 10),
  (p_agency_id, 'Trash removal', 'housekeeping', '🗑️', 10),

  -- Companionship
  (p_agency_id, 'Social conversation', 'companionship', '💬', 30),
  (p_agency_id, 'Reading together', 'companionship', '📖', 20),
  (p_agency_id, 'Games/activities', 'companionship', '🎲', 30),
  (p_agency_id, 'Escort to appointment', 'companionship', '🚗', 60);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-seed tasks for new agencies
CREATE OR REPLACE FUNCTION seed_new_agency_tasks()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_agency_tasks(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_agency_tasks_trigger
AFTER INSERT ON agencies
FOR EACH ROW EXECUTE FUNCTION seed_new_agency_tasks();
```

## Troubleshooting

### PostGIS not available
**Cause:** Extension not enabled
**Solution:** Run `CREATE EXTENSION IF NOT EXISTS "postgis";` as superuser

### Foreign key violations
**Cause:** Inserting data in wrong order
**Solution:** Follow order: agency → users → elders → assignments

### Trigger not firing
**Cause:** Trigger disabled or function error
**Solution:** Check with `SELECT * FROM pg_trigger WHERE tgname = 'trigger_name'`
