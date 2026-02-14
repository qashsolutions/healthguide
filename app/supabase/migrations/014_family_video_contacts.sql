-- HealthGuide Family Video Contacts
-- Per healthguide-community/elder-engagement skill - Video call links for elder's family

-- ============================================
-- FAMILY VIDEO CONTACTS TABLE
-- ============================================
CREATE TABLE family_video_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  photo_url TEXT,
  video_call_link TEXT NOT NULL,

  is_favorite BOOLEAN DEFAULT false,
  last_call_at TIMESTAMPTZ,
  call_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_video_contacts_elder ON family_video_contacts(elder_id);

-- ============================================
-- MAX 10 CONTACTS PER ELDER (trigger)
-- ============================================
CREATE OR REPLACE FUNCTION check_video_contact_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM family_video_contacts WHERE elder_id = NEW.elder_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 video contacts per elder';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_contact_limit_trigger
  BEFORE INSERT ON family_video_contacts
  FOR EACH ROW
  EXECUTE FUNCTION check_video_contact_limit();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE family_video_contacts ENABLE ROW LEVEL SECURITY;

-- Elders can read their own contacts
CREATE POLICY "Elders can read own video contacts"
  ON family_video_contacts FOR SELECT
  USING (elder_id = auth.uid());

-- Agency owners can manage contacts for their elders
CREATE POLICY "Agency owners can read video contacts"
  ON family_video_contacts FOR SELECT
  USING (
    auth.is_agency_owner() AND
    elder_id IN (SELECT id FROM elders WHERE agency_id = auth.user_agency_id())
  );

CREATE POLICY "Agency owners can insert video contacts"
  ON family_video_contacts FOR INSERT
  WITH CHECK (
    auth.is_agency_owner() AND
    elder_id IN (SELECT id FROM elders WHERE agency_id = auth.user_agency_id())
  );

CREATE POLICY "Agency owners can update video contacts"
  ON family_video_contacts FOR UPDATE
  USING (
    auth.is_agency_owner() AND
    elder_id IN (SELECT id FROM elders WHERE agency_id = auth.user_agency_id())
  );

CREATE POLICY "Agency owners can delete video contacts"
  ON family_video_contacts FOR DELETE
  USING (
    auth.is_agency_owner() AND
    elder_id IN (SELECT id FROM elders WHERE agency_id = auth.user_agency_id())
  );

-- Care group family members can read contacts for their elder
CREATE POLICY "Family members can read video contacts via care group"
  ON family_video_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM care_group_members cgm
      JOIN care_groups cg ON cgm.care_group_id = cg.id
      WHERE cg.elder_id = family_video_contacts.elder_id
        AND cgm.user_id = auth.uid()
        AND cgm.role = 'family_member'
        AND cgm.is_active = true
        AND cg.is_active = true
    )
  );
