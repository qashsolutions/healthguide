-- ============================================================================
-- Migration 012: Caregiver Marketplace
-- Adds caregiver_profiles (independent public profiles), caregiver_agency_links
-- (multi-agency support), and consent columns on care_group_members.
-- Caregivers sign up independently, agency owners discover them via directory.
-- ============================================================================

-- ============================================================================
-- 1. CAREGIVER PROFILES TABLE (public marketplace)
-- ============================================================================
CREATE TABLE caregiver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic profile
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,

  -- Geographic & Rate
  zip_code TEXT NOT NULL,
  hourly_rate DECIMAL(8, 2),

  -- NPI Verification
  npi_number TEXT UNIQUE,
  npi_verified BOOLEAN NOT NULL DEFAULT FALSE,
  npi_data JSONB, -- {name, credentials, taxonomy_code, specialty, license_state, license_number}

  -- Credentials & Skills
  certifications TEXT[] NOT NULL DEFAULT '{}',
  experience_summary TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  -- Allowed values: companionship, meal_preparation, light_housekeeping, errands,
  -- mobility_assistance, personal_care, medication_reminders, medication_administration

  -- Availability: {monday:[morning,afternoon,evening], tuesday:[], ...}
  availability JSONB NOT NULL DEFAULT '{
    "monday": ["morning", "afternoon"],
    "tuesday": ["morning", "afternoon"],
    "wednesday": ["morning", "afternoon"],
    "thursday": ["morning", "afternoon"],
    "friday": ["morning", "afternoon"],
    "saturday": [],
    "sunday": []
  }'::jsonb,

  -- About
  bio TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for marketplace search
CREATE INDEX idx_caregiver_profiles_zip_code ON caregiver_profiles(zip_code);
CREATE INDEX idx_caregiver_profiles_zip_prefix ON caregiver_profiles(LEFT(zip_code, 3));
CREATE INDEX idx_caregiver_profiles_active ON caregiver_profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_caregiver_profiles_npi_verified ON caregiver_profiles(npi_verified) WHERE npi_verified = TRUE;
CREATE INDEX idx_caregiver_profiles_capabilities ON caregiver_profiles USING GIN(capabilities);
CREATE INDEX idx_caregiver_profiles_user_id ON caregiver_profiles(user_id);
CREATE INDEX idx_caregiver_profiles_rate ON caregiver_profiles(hourly_rate) WHERE hourly_rate IS NOT NULL;

-- Auto-update timestamp
CREATE TRIGGER update_caregiver_profiles_timestamp
BEFORE UPDATE ON caregiver_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. CAREGIVER-AGENCY LINKS (multi-agency support)
-- ============================================================================
CREATE TABLE caregiver_agency_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_profile_id UUID NOT NULL REFERENCES caregiver_profiles(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_caregiver_agency UNIQUE (caregiver_profile_id, agency_id)
);

CREATE INDEX idx_caregiver_agency_links_profile ON caregiver_agency_links(caregiver_profile_id);
CREATE INDEX idx_caregiver_agency_links_agency ON caregiver_agency_links(agency_id);

CREATE TRIGGER update_caregiver_agency_links_timestamp
BEFORE UPDATE ON caregiver_agency_links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 3. ALTER CARE_GROUP_MEMBERS — add consent columns
-- ============================================================================
ALTER TABLE care_group_members
  ADD COLUMN caregiver_profile_id UUID REFERENCES caregiver_profiles(id) ON DELETE SET NULL,
  ADD COLUMN consent_status TEXT DEFAULT 'pending'
    CHECK (consent_status IN ('pending', 'accepted', 'declined')),
  ADD COLUMN consent_requested_at TIMESTAMPTZ,
  ADD COLUMN consent_given_at TIMESTAMPTZ;

CREATE INDEX idx_care_group_members_consent ON care_group_members(consent_status)
  WHERE role = 'caregiver';
CREATE INDEX idx_care_group_members_caregiver_profile ON care_group_members(caregiver_profile_id)
  WHERE caregiver_profile_id IS NOT NULL;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE caregiver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_agency_links ENABLE ROW LEVEL SECURITY;

-- === caregiver_profiles RLS ===

-- Caregivers: full CRUD on own profile
CREATE POLICY "Caregivers can manage own profile"
ON caregiver_profiles FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Agency owners: read-only access to active profiles (for directory search)
CREATE POLICY "Agency owners can browse active caregiver profiles"
ON caregiver_profiles FOR SELECT
TO authenticated
USING (
  is_active = TRUE
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'agency_owner'
  )
);

-- Service role: full access (for edge functions)
CREATE POLICY "Service role full access to caregiver profiles"
ON caregiver_profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- === caregiver_agency_links RLS ===

-- Caregivers: view own links
CREATE POLICY "Caregivers can view own agency links"
ON caregiver_agency_links FOR SELECT
TO authenticated
USING (
  caregiver_profile_id IN (
    SELECT id FROM caregiver_profiles WHERE user_id = auth.uid()
  )
);

-- Agency owners: view links for their agency
CREATE POLICY "Agency owners can view caregiver links for their agency"
ON caregiver_agency_links FOR SELECT
TO authenticated
USING (
  agency_id = auth.user_agency_id()
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'agency_owner'
  )
);

-- Service role: full access
CREATE POLICY "Service role full access to caregiver agency links"
ON caregiver_agency_links FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- === care_group_members consent update policy ===

-- Caregivers: can update consent_status on their own pending records
-- (supplements existing "Members can update own preferences" policy)
CREATE POLICY "Caregivers can update consent on own records"
ON care_group_members FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND role = 'caregiver'
)
WITH CHECK (
  user_id = auth.uid()
  AND role = 'caregiver'
);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Check if current user has a caregiver profile
CREATE OR REPLACE FUNCTION auth.has_caregiver_profile()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM caregiver_profiles
    WHERE user_id = auth.uid()
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's caregiver_profile_id
CREATE OR REPLACE FUNCTION auth.caregiver_profile_id()
RETURNS UUID AS $$
  SELECT id FROM caregiver_profiles
  WHERE user_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE caregiver_profiles IS
  'Public-facing caregiver profiles for the marketplace. Independent of any agency. Caregivers sign up to showcase their skills, availability, and credentials.';

COMMENT ON TABLE caregiver_agency_links IS
  'Tracks which caregivers work with which agencies. Created when a caregiver accepts a care group invitation. Supports multi-agency relationships.';

COMMENT ON COLUMN caregiver_profiles.npi_number IS
  'National Provider Identifier. Optional. If verified against NPPES registry, npi_verified is set to TRUE.';

COMMENT ON COLUMN caregiver_profiles.npi_data IS
  'JSONB from NPPES lookup: {name, credentials, taxonomy_code, specialty, license_state, license_number}';

COMMENT ON COLUMN caregiver_profiles.capabilities IS
  'Array of capability strings: companionship, meal_preparation, light_housekeeping, errands, mobility_assistance, personal_care, medication_reminders, medication_administration';

COMMENT ON COLUMN caregiver_profiles.availability IS
  'JSONB availability grid: {monday:[morning,afternoon,evening], ...}. Used for marketplace search filtering.';

COMMENT ON COLUMN care_group_members.consent_status IS
  'Caregiver consent flow: pending (invited) → accepted/declined. Family members and elders do not require consent.';
