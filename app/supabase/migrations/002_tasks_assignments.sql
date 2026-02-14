-- HealthGuide Task and Assignment Tables
-- Per healthguide-supabase/schema skill

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
    'medication', 'housekeeping', 'companionship',
    'transportation', 'errands', 'vitals', 'exercise', 'other'
  )),
  icon TEXT NOT NULL, -- Icon name for the app

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
-- VISITS TABLE (formerly assignments)
-- ============================================
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- iCal RRULE format
  parent_visit_id UUID REFERENCES visits(id),

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'checked_in', 'in_progress', 'checked_out', 'completed', 'missed', 'cancelled'
  )),

  -- EVV Data
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  check_in_latitude DECIMAL(10, 8),
  check_in_longitude DECIMAL(11, 8),
  check_out_latitude DECIMAL(10, 8),
  check_out_longitude DECIMAL(11, 8),
  check_in_method TEXT CHECK (check_in_method IN ('gps', 'qr_code', 'manual')),

  -- Observations (JSONB for icon-based selections)
  observations JSONB DEFAULT '[]'::jsonb,
  voice_notes TEXT[],

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visits_agency ON visits(agency_id);
CREATE INDEX idx_visits_caregiver ON visits(caregiver_id);
CREATE INDEX idx_visits_elder ON visits(elder_id);
CREATE INDEX idx_visits_date ON visits(scheduled_date);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_caregiver_date ON visits(caregiver_id, scheduled_date);

-- ============================================
-- VISIT TASKS TABLE
-- ============================================
CREATE TABLE visit_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task_library(id) ON DELETE RESTRICT,

  -- Task status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'skipped', 'declined'
  )),
  completed_at TIMESTAMPTZ,

  -- Reasons for not completing
  skipped_reason TEXT CHECK (skipped_reason IN (
    'client_refused', 'not_enough_time', 'equipment_unavailable', 'not_needed', 'other'
  )),
  decline_reason TEXT,
  notes TEXT,

  sort_order INTEGER DEFAULT 0,

  UNIQUE(visit_id, task_id)
);

CREATE INDEX idx_visit_tasks_visit ON visit_tasks(visit_id);
CREATE INDEX idx_visit_tasks_status ON visit_tasks(status);

-- ============================================
-- TASK DECLINES TABLE (for tracking extra task requests)
-- ============================================
CREATE TABLE task_declines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,

  task_description TEXT NOT NULL,
  declined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Notifications
  agency_notified BOOLEAN DEFAULT false,
  family_notified BOOLEAN DEFAULT false
);

CREATE INDEX idx_task_declines_visit ON task_declines(visit_id);
