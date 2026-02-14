-- HealthGuide Elder Task Preferences Migration
-- Stores per-elder task configurations and preferences

-- ============================================
-- ELDER TASK PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS elder_task_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES task_library(id) ON DELETE CASCADE,

  is_required BOOLEAN DEFAULT false,
  frequency TEXT NOT NULL DEFAULT 'every_visit'
    CHECK (frequency IN ('every_visit', 'daily', 'weekly', 'as_needed')),
  special_instructions TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(elder_id, task_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_elder_task_preferences_elder
ON elder_task_preferences(elder_id);

CREATE INDEX IF NOT EXISTS idx_elder_task_preferences_task
ON elder_task_preferences(task_id);

-- Auto-update timestamp
CREATE TRIGGER update_elder_task_preferences_timestamp
BEFORE UPDATE ON elder_task_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- UPDATE ELDERS TABLE (add missing columns)
-- ============================================
DO $$
BEGIN
  -- Add photo_url if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elders' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE elders ADD COLUMN photo_url TEXT;
  END IF;

  -- Add apartment if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elders' AND column_name = 'apartment'
  ) THEN
    ALTER TABLE elders ADD COLUMN apartment TEXT;
  END IF;

  -- Add date_of_birth if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elders' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE elders ADD COLUMN date_of_birth DATE;
  END IF;

  -- Add latitude/longitude if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elders' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE elders ADD COLUMN latitude DECIMAL(10, 8);
    ALTER TABLE elders ADD COLUMN longitude DECIMAL(11, 8);
  END IF;

  -- Add medical_notes if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elders' AND column_name = 'medical_notes'
  ) THEN
    ALTER TABLE elders ADD COLUMN medical_notes TEXT;
  END IF;

  -- Add special_instructions if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'elders' AND column_name = 'special_instructions'
  ) THEN
    ALTER TABLE elders ADD COLUMN special_instructions TEXT;
  END IF;
END $$;

-- ============================================
-- UPDATE EMERGENCY CONTACTS TABLE
-- ============================================
DO $$
BEGIN
  -- Add receives_notifications if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emergency_contacts' AND column_name = 'receives_notifications'
  ) THEN
    ALTER TABLE emergency_contacts ADD COLUMN receives_notifications BOOLEAN DEFAULT true;
  END IF;

  -- Add notification_preferences if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emergency_contacts' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE emergency_contacts ADD COLUMN notification_preferences JSONB DEFAULT '{
      "check_in": true,
      "check_out": true,
      "daily_report": true
    }'::jsonb;
  END IF;
END $$;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE elder_task_preferences ENABLE ROW LEVEL SECURITY;

-- Agency owners can manage task preferences for their elders
CREATE POLICY "Agency owners can view elder task preferences"
ON elder_task_preferences FOR SELECT
TO authenticated
USING (
  elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Agency owners can create elder task preferences"
ON elder_task_preferences FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Agency owners can update elder task preferences"
ON elder_task_preferences FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Agency owners can delete elder task preferences"
ON elder_task_preferences FOR DELETE
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

-- Caregivers can view task preferences for their assigned elders
CREATE POLICY "Caregivers can view assigned elder task preferences"
ON elder_task_preferences FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND elder_id IN (
    SELECT DISTINCT elder_id FROM assignments
    WHERE caregiver_id = auth.uid()
    AND status IN ('scheduled', 'in_progress')
  )
);

-- ============================================
-- HELPER FUNCTION: Get tasks for elder visit
-- ============================================
CREATE OR REPLACE FUNCTION get_elder_visit_tasks(p_elder_id UUID)
RETURNS TABLE (
  task_id UUID,
  task_name TEXT,
  task_icon TEXT,
  task_category TEXT,
  is_required BOOLEAN,
  frequency TEXT,
  special_instructions TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    etp.task_id,
    tl.name AS task_name,
    tl.icon AS task_icon,
    tl.category AS task_category,
    etp.is_required,
    etp.frequency,
    etp.special_instructions
  FROM elder_task_preferences etp
  JOIN task_library tl ON etp.task_id = tl.id
  WHERE etp.elder_id = p_elder_id
    AND tl.is_active = true
  ORDER BY etp.is_required DESC, tl.category, tl.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
