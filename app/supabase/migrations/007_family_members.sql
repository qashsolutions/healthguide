-- HealthGuide Family Members Table
-- Supports push notification delivery for family members

-- ============================================
-- FAMILY MEMBERS TABLE
-- ============================================
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), -- NULL until they sign up
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL, -- 'son', 'daughter', 'spouse', 'sibling', 'other'

  -- Invitation flow
  invitation_code TEXT UNIQUE,
  invitation_expires_at TIMESTAMPTZ,
  invite_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Notification preferences (push-based)
  notification_preferences JSONB NOT NULL DEFAULT '{
    "check_in": true,
    "check_out": true,
    "daily_report": true,
    "delivery_time": "19:00",
    "timezone": "America/New_York",
    "include_observations": true
  }'::jsonb,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_family_members_elder ON family_members(elder_id);
CREATE INDEX idx_family_members_user ON family_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_family_members_invitation ON family_members(invitation_code) WHERE invite_status = 'pending';
CREATE INDEX idx_family_members_active ON family_members(elder_id, is_active) WHERE is_active = true;

-- Auto-update timestamp
CREATE TRIGGER update_family_members_timestamp
BEFORE UPDATE ON family_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SMS INVITATIONS TABLE (for tracking)
-- ============================================
CREATE TABLE sms_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  invitation_code TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'invitation',
  twilio_sid TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_invitations_family ON sms_invitations(family_member_id);
CREATE INDEX idx_sms_invitations_status ON sms_invitations(status);

-- ============================================
-- DEVICE TOKENS UPDATE FOR FAMILY
-- ============================================
-- Add user_type column to device_tokens if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_tokens' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE device_tokens ADD COLUMN user_type TEXT DEFAULT 'caregiver';
  END IF;
END $$;

-- ============================================
-- NOTIFICATIONS TABLE UPDATE
-- ============================================
-- Add type column for categorizing notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'general';
  END IF;
END $$;

-- ============================================
-- RLS POLICIES FOR FAMILY MEMBERS
-- ============================================
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_invitations ENABLE ROW LEVEL SECURITY;

-- Agency owners can view/manage family members for their elders
CREATE POLICY "Agency owners can view family members"
ON family_members FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Agency owners can create family members"
ON family_members FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Agency owners can update family members"
ON family_members FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

-- Family members can view their own record
CREATE POLICY "Family members can view own record"
ON family_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Family members can update their own preferences
CREATE POLICY "Family members can update own preferences"
ON family_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  -- Can only update notification_preferences, not other fields
);

-- SMS invitations - agency owners only
CREATE POLICY "Agency owners can view sms invitations"
ON sms_invitations FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND family_member_id IN (
    SELECT fm.id FROM family_members fm
    JOIN elders e ON fm.elder_id = e.id
    WHERE e.agency_id = auth.user_agency_id()
  )
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user is a family member
CREATE OR REPLACE FUNCTION auth.is_family_member()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE user_id = auth.uid()
    AND invite_status = 'accepted'
    AND is_active = true
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get family member's elder IDs
CREATE OR REPLACE FUNCTION auth.family_elder_ids()
RETURNS SETOF UUID AS $$
  SELECT elder_id FROM family_members
  WHERE user_id = auth.uid()
  AND invite_status = 'accepted'
  AND is_active = true
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Family members can view elders they're connected to
CREATE POLICY "Family members can view connected elders"
ON elders FOR SELECT
TO authenticated
USING (
  auth.is_family_member()
  AND id IN (SELECT auth.family_elder_ids())
);

-- Family members can view daily reports for their elders
CREATE POLICY "Family members can view elder reports"
ON daily_reports FOR SELECT
TO authenticated
USING (
  auth.is_family_member()
  AND elder_id IN (SELECT auth.family_elder_ids())
);

-- Family members can view visits for their elders (read-only)
CREATE POLICY "Family members can view elder visits"
ON visits FOR SELECT
TO authenticated
USING (
  auth.is_family_member()
  AND elder_id IN (SELECT auth.family_elder_ids())
);

-- ============================================
-- VALIDATE INVITATION CODE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION validate_invitation_code(p_code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  family_member_id UUID,
  elder_name TEXT,
  agency_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (fm.invite_status = 'pending' AND fm.invitation_expires_at > NOW()) AS valid,
    fm.id AS family_member_id,
    e.first_name || ' ' || e.last_name AS elder_name,
    a.name AS agency_name
  FROM family_members fm
  JOIN elders e ON fm.elder_id = e.id
  JOIN agencies a ON e.agency_id = a.id
  WHERE fm.invitation_code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ACCEPT INVITATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION accept_family_invitation(
  p_code TEXT,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_family_member_id UUID;
BEGIN
  -- Get and validate invitation
  SELECT id INTO v_family_member_id
  FROM family_members
  WHERE invitation_code = p_code
    AND invite_status = 'pending'
    AND invitation_expires_at > NOW();

  IF v_family_member_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update family member with user_id
  UPDATE family_members
  SET
    user_id = p_user_id,
    invite_status = 'accepted',
    accepted_at = NOW(),
    invitation_code = NULL -- Clear code after use
  WHERE id = v_family_member_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
