-- Add keywords column to caregiver_profiles for searchable tags
ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';
