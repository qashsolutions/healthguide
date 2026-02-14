-- HealthGuide Caregiver Wellness Logs
-- Daily check-in tracking for mood, energy, and stress levels

-- ============================================
-- CAREGIVER WELLNESS LOGS TABLE
-- ============================================
CREATE TABLE caregiver_wellness_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy INTEGER NOT NULL CHECK (energy BETWEEN 1 AND 5),
  stress INTEGER NOT NULL CHECK (stress BETWEEN 1 AND 5),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_wellness_logs_user ON caregiver_wellness_logs(user_id);
CREATE INDEX idx_wellness_logs_date ON caregiver_wellness_logs(date DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE caregiver_wellness_logs ENABLE ROW LEVEL SECURITY;

-- Caregivers can read their own logs
CREATE POLICY "Caregivers can read own wellness logs"
  ON caregiver_wellness_logs FOR SELECT
  USING (user_id = auth.uid());

-- Caregivers can insert their own logs
CREATE POLICY "Caregivers can insert own wellness logs"
  ON caregiver_wellness_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Caregivers can update their own logs (same-day edits)
CREATE POLICY "Caregivers can update own wellness logs"
  ON caregiver_wellness_logs FOR UPDATE
  USING (user_id = auth.uid());

-- Caregivers can delete their own logs
CREATE POLICY "Caregivers can delete own wellness logs"
  ON caregiver_wellness_logs FOR DELETE
  USING (user_id = auth.uid());
