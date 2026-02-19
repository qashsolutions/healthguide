-- Table for flagging/reporting caregiver profiles
CREATE TABLE IF NOT EXISTS caregiver_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_profile_id UUID NOT NULL REFERENCES caregiver_profiles(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Index for looking up reports by caregiver
CREATE INDEX idx_caregiver_reports_profile ON caregiver_reports(caregiver_profile_id);

-- RLS: authenticated users can insert their own reports
ALTER TABLE caregiver_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON caregiver_reports FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Users can view their own reports"
  ON caregiver_reports FOR SELECT
  TO authenticated
  USING (reported_by = auth.uid());
