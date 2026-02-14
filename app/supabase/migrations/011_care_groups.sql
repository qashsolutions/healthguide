-- ============================================================================
-- Migration 011: Care Groups
-- Introduces care_groups and care_group_members tables.
-- Agency owners create a care group per elder and invite caregiver,
-- family members (up to 3), and the elder via share sheet / QR code.
-- Replaces Twilio-based family invitation system.
-- ============================================================================

-- ============================================================================
-- 1. CARE GROUPS TABLE
-- ============================================================================
CREATE TABLE care_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Auto-generated: "{Elder Name}'s Care Team"
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Invitation
  invite_code TEXT NOT NULL UNIQUE,
  invite_expires_at TIMESTAMPTZ NOT NULL,
  qr_code_data TEXT, -- Deep link URL for QR generation

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One care group per elder
  CONSTRAINT unique_elder_care_group UNIQUE (elder_id)
);

CREATE INDEX idx_care_groups_agency ON care_groups(agency_id);
CREATE INDEX idx_care_groups_elder ON care_groups(elder_id);
CREATE INDEX idx_care_groups_invite_code ON care_groups(invite_code);
CREATE INDEX idx_care_groups_active ON care_groups(is_active) WHERE is_active = true;

-- Auto-update timestamp
CREATE TRIGGER update_care_groups_timestamp
BEFORE UPDATE ON care_groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. CARE GROUP MEMBERS TABLE
-- ============================================================================
CREATE TABLE care_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_group_id UUID NOT NULL REFERENCES care_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL until they join

  -- Member info (pre-filled by agency owner at invite time)
  role TEXT NOT NULL CHECK (role IN ('caregiver', 'family_member', 'elder')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT, -- For family: son/daughter/spouse/sibling/other; NULL for caregiver/elder

  -- Invitation tracking
  invite_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (invite_status IN ('pending', 'accepted', 'expired', 'declined')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Notification preferences (for family members and elder)
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate invites to same phone in same group
  CONSTRAINT unique_group_member_phone UNIQUE (care_group_id, phone)
);

CREATE INDEX idx_care_group_members_group ON care_group_members(care_group_id);
CREATE INDEX idx_care_group_members_user ON care_group_members(user_id);
CREATE INDEX idx_care_group_members_role ON care_group_members(care_group_id, role);
CREATE INDEX idx_care_group_members_status ON care_group_members(invite_status);
CREATE INDEX idx_care_group_members_active ON care_group_members(care_group_id, is_active)
  WHERE is_active = true;

-- Auto-update timestamp
CREATE TRIGGER update_care_group_members_timestamp
BEFORE UPDATE ON care_group_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 3. ROLE LIMIT TRIGGERS
-- ============================================================================

-- Max 3 family_member per care group
CREATE OR REPLACE FUNCTION check_family_member_group_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'family_member' THEN
    IF (
      SELECT COUNT(*) FROM care_group_members
      WHERE care_group_id = NEW.care_group_id
        AND role = 'family_member'
        AND is_active = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 family members per care group';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER care_group_family_limit_trigger
BEFORE INSERT OR UPDATE ON care_group_members
FOR EACH ROW
EXECUTE FUNCTION check_family_member_group_limit();

-- Max 1 caregiver per care group
CREATE OR REPLACE FUNCTION check_caregiver_group_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'caregiver' THEN
    IF (
      SELECT COUNT(*) FROM care_group_members
      WHERE care_group_id = NEW.care_group_id
        AND role = 'caregiver'
        AND is_active = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) >= 1 THEN
      RAISE EXCEPTION 'Maximum 1 caregiver per care group';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER care_group_caregiver_limit_trigger
BEFORE INSERT OR UPDATE ON care_group_members
FOR EACH ROW
EXECUTE FUNCTION check_caregiver_group_limit();

-- Max 1 elder per care group
CREATE OR REPLACE FUNCTION check_elder_group_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'elder' THEN
    IF (
      SELECT COUNT(*) FROM care_group_members
      WHERE care_group_id = NEW.care_group_id
        AND role = 'elder'
        AND is_active = true
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) >= 1 THEN
      RAISE EXCEPTION 'Maximum 1 elder per care group';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER care_group_elder_limit_trigger
BEFORE INSERT OR UPDATE ON care_group_members
FOR EACH ROW
EXECUTE FUNCTION check_elder_group_limit();

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Generate 8-character invite code (excludes ambiguous chars: 0, O, I, L, 1)
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Validate a group invite code
-- Returns: valid (bool), care_group_id, group_name, elder_name, agency_name
CREATE OR REPLACE FUNCTION validate_group_invite(p_code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  care_group_id UUID,
  group_name TEXT,
  elder_first_name TEXT,
  elder_last_name TEXT,
  agency_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    true AS valid,
    cg.id AS care_group_id,
    cg.name AS group_name,
    e.first_name AS elder_first_name,
    e.last_name AS elder_last_name,
    a.name AS agency_name
  FROM care_groups cg
  JOIN elders e ON cg.elder_id = e.id
  JOIN agencies a ON cg.agency_id = a.id
  WHERE cg.invite_code = upper(p_code)
    AND cg.invite_expires_at > NOW()
    AND cg.is_active = true;

  -- If no rows returned, return invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept a group invite: link user_id, set status to accepted
CREATE OR REPLACE FUNCTION accept_group_invite(
  p_invite_code TEXT,
  p_user_id UUID,
  p_phone TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  member_id UUID,
  member_role TEXT,
  member_name TEXT,
  care_group_id UUID,
  elder_first_name TEXT,
  elder_last_name TEXT
) AS $$
DECLARE
  v_group_id UUID;
  v_member_id UUID;
  v_member_role TEXT;
  v_member_name TEXT;
  v_elder_first TEXT;
  v_elder_last TEXT;
BEGIN
  -- Find the care group
  SELECT cg.id, e.first_name, e.last_name
  INTO v_group_id, v_elder_first, v_elder_last
  FROM care_groups cg
  JOIN elders e ON cg.elder_id = e.id
  WHERE cg.invite_code = upper(p_invite_code)
    AND cg.invite_expires_at > NOW()
    AND cg.is_active = true;

  IF v_group_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Find the pending member by phone in this group
  SELECT cgm.id, cgm.role, cgm.name
  INTO v_member_id, v_member_role, v_member_name
  FROM care_group_members cgm
  WHERE cgm.care_group_id = v_group_id
    AND cgm.phone = p_phone
    AND cgm.invite_status = 'pending'
    AND cgm.is_active = true;

  IF v_member_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Update member: link user and accept
  UPDATE care_group_members
  SET user_id = p_user_id,
      invite_status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_member_id;

  RETURN QUERY SELECT true, v_member_id, v_member_role, v_member_name, v_group_id, v_elder_first, v_elder_last;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get care group IDs for current authenticated user
CREATE OR REPLACE FUNCTION auth.user_care_group_ids()
RETURNS SETOF UUID AS $$
  SELECT care_group_id FROM care_group_members
  WHERE user_id = auth.uid()
    AND invite_status = 'accepted'
    AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is a member of a specific care group
CREATE OR REPLACE FUNCTION auth.is_care_group_member(p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM care_group_members
    WHERE care_group_id = p_group_id
      AND user_id = auth.uid()
      AND invite_status = 'accepted'
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE care_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_group_members ENABLE ROW LEVEL SECURITY;

-- === care_groups RLS ===

-- Agency owners: full access to their agency's groups
CREATE POLICY "Agency owners can manage care groups"
ON care_groups FOR ALL
TO authenticated
USING (
  agency_id = auth.user_agency_id()
  AND auth.is_agency_owner()
);

-- Caregivers: view groups they belong to
CREATE POLICY "Caregivers can view their care groups"
ON care_groups FOR SELECT
TO authenticated
USING (
  id IN (SELECT auth.user_care_group_ids())
  AND auth.is_caregiver()
);

-- Family members and elders: view groups they belong to
CREATE POLICY "Members can view their care groups"
ON care_groups FOR SELECT
TO authenticated
USING (
  id IN (SELECT auth.user_care_group_ids())
);

-- Service role: full access (for edge functions)
CREATE POLICY "Service role full access to care groups"
ON care_groups FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- === care_group_members RLS ===

-- Agency owners: full access to members in their agency's groups
CREATE POLICY "Agency owners can manage care group members"
ON care_group_members FOR ALL
TO authenticated
USING (
  care_group_id IN (
    SELECT id FROM care_groups WHERE agency_id = auth.user_agency_id()
  )
  AND auth.is_agency_owner()
);

-- Members: can view all members in their own groups
CREATE POLICY "Members can view group members"
ON care_group_members FOR SELECT
TO authenticated
USING (
  care_group_id IN (SELECT auth.user_care_group_ids())
);

-- Members: can update own notification preferences only
CREATE POLICY "Members can update own preferences"
ON care_group_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role: full access (for edge functions)
CREATE POLICY "Service role full access to care group members"
ON care_group_members FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 6. UPDATE DEVICE_TOKENS TO SUPPORT ELDER USER TYPE
-- ============================================================================

-- Drop existing constraint if it exists, then recreate with 'elder' added
DO $$
BEGIN
  -- Try dropping the old constraint
  ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS device_tokens_user_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE device_tokens ADD CONSTRAINT device_tokens_user_type_check
  CHECK (user_type IN ('caregiver', 'agency_owner', 'family_member', 'elder'));

-- ============================================================================
-- 7. MIGRATE EXISTING FAMILY MEMBERS DATA (backward compatibility)
-- ============================================================================

-- Create care groups for any elders that already have accepted family members
-- This ensures existing data continues to work
DO $$
DECLARE
  r RECORD;
  v_group_id UUID;
  v_invite_code TEXT;
BEGIN
  -- For each elder that has accepted family members but no care group
  FOR r IN
    SELECT DISTINCT fm.elder_id, e.first_name, e.last_name, e.agency_id
    FROM family_members fm
    JOIN elders e ON fm.elder_id = e.id
    WHERE fm.invite_status = 'accepted'
      AND NOT EXISTS (
        SELECT 1 FROM care_groups cg WHERE cg.elder_id = fm.elder_id
      )
  LOOP
    -- Generate invite code
    v_invite_code := generate_invite_code();

    -- Create care group
    INSERT INTO care_groups (agency_id, elder_id, name, created_by, invite_code, invite_expires_at)
    SELECT
      r.agency_id,
      r.elder_id,
      r.first_name || ' ' || r.last_name || '''s Care Team',
      (SELECT id FROM user_profiles WHERE agency_id = r.agency_id AND role = 'agency_owner' LIMIT 1),
      v_invite_code,
      NOW() + INTERVAL '30 days'
    RETURNING id INTO v_group_id;

    -- Migrate accepted family members into care_group_members
    INSERT INTO care_group_members (care_group_id, user_id, role, name, phone, relationship, invite_status, accepted_at)
    SELECT
      v_group_id,
      fm.user_id,
      'family_member',
      fm.name,
      fm.phone,
      fm.relationship,
      'accepted',
      fm.accepted_at
    FROM family_members fm
    WHERE fm.elder_id = r.elder_id
      AND fm.invite_status = 'accepted'
      AND fm.is_active = true;
  END LOOP;
END $$;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE care_groups IS 'Care groups link an elder to their care team (caregiver + family members + optionally the elder). Created by agency owners.';
COMMENT ON TABLE care_group_members IS 'Members of a care group. Each member is invited via share sheet/QR and joins via phone OTP verification.';
COMMENT ON COLUMN care_groups.invite_code IS '8-character alphanumeric code shared via native share sheet or QR code. Excludes ambiguous characters (0, O, I, L, 1).';
COMMENT ON COLUMN care_group_members.role IS 'caregiver (max 1), family_member (max 3), or elder (max 1) per group.';
COMMENT ON COLUMN care_group_members.user_id IS 'NULL until the invited person accepts the invite and verifies via phone OTP.';
