-- Add work history, education, and references to caregiver_profiles
ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS work_history JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS education JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS caregiver_references JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN caregiver_profiles.work_history IS 'Array of {title, employer, location, start_date, end_date}';
COMMENT ON COLUMN caregiver_profiles.education IS 'Array of {institution, location, start_date, end_date}';
COMMENT ON COLUMN caregiver_profiles.caregiver_references IS 'Array of {name, phone, relationship} — at least 1 required';
