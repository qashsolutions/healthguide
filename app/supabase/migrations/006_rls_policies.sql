-- HealthGuide Row Level Security Policies
-- Per healthguide-supabase/rls skill

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE elders ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE elder_task_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_declines ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS FOR POLICY CHECKS
-- ============================================

-- Get current user's agency_id
CREATE OR REPLACE FUNCTION auth.user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is agency owner
CREATE OR REPLACE FUNCTION auth.is_agency_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'agency_owner'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is caregiver
CREATE OR REPLACE FUNCTION auth.is_caregiver()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'caregiver'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if caregiver is assigned to elder (recent visits)
CREATE OR REPLACE FUNCTION auth.is_assigned_to_elder(p_elder_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM visits
    WHERE caregiver_id = auth.uid()
      AND elder_id = p_elder_id
      AND scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- AGENCIES TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can view own agency"
ON agencies FOR SELECT
TO authenticated
USING (id = auth.user_agency_id());

CREATE POLICY "Agency owners can update own agency"
ON agencies FOR UPDATE
TO authenticated
USING (id = auth.user_agency_id() AND auth.is_agency_owner())
WITH CHECK (id = auth.user_agency_id() AND auth.is_agency_owner());

-- ============================================
-- USER_PROFILES TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Agency owners can view agency profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (
  agency_id = auth.user_agency_id()
  AND auth.is_agency_owner()
);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  AND agency_id = auth.user_agency_id()
);

CREATE POLICY "Agency owners can create caregivers"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
  AND role = 'caregiver'
);

CREATE POLICY "Agency owners can update caregivers"
ON user_profiles FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
  AND role = 'caregiver'
)
WITH CHECK (
  agency_id = auth.user_agency_id()
  AND role = 'caregiver'
);

-- ============================================
-- ELDERS TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can view agency elders"
ON elders FOR SELECT
TO authenticated
USING (
  agency_id = auth.user_agency_id()
  AND auth.is_agency_owner()
);

CREATE POLICY "Caregivers can view assigned elders"
ON elders FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND auth.is_assigned_to_elder(id)
);

CREATE POLICY "Agency owners can create elders"
ON elders FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

CREATE POLICY "Agency owners can update elders"
ON elders FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
)
WITH CHECK (agency_id = auth.user_agency_id());

-- ============================================
-- EMERGENCY_CONTACTS TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can view contacts"
ON emergency_contacts FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Caregivers can view assigned elder contacts"
ON emergency_contacts FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND auth.is_assigned_to_elder(elder_id)
);

CREATE POLICY "Agency owners can manage contacts"
ON emergency_contacts FOR ALL
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

-- ============================================
-- TASK_LIBRARY TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view agency tasks"
ON task_library FOR SELECT
TO authenticated
USING (agency_id = auth.user_agency_id());

CREATE POLICY "Agency owners can manage task library"
ON task_library FOR ALL
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

-- ============================================
-- ELDER_TASK_PREFERENCES TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can view elder task preferences"
ON elder_task_preferences FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Caregivers can view assigned elder preferences"
ON elder_task_preferences FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND auth.is_assigned_to_elder(elder_id)
);

CREATE POLICY "Agency owners can manage elder task preferences"
ON elder_task_preferences FOR ALL
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

-- ============================================
-- VISITS TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can view all visits"
ON visits FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

CREATE POLICY "Caregivers can view own visits"
ON visits FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND caregiver_id = auth.uid()
);

CREATE POLICY "Agency owners can create visits"
ON visits FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

CREATE POLICY "Agency owners can update visits"
ON visits FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

CREATE POLICY "Caregivers can update own visits (EVV)"
ON visits FOR UPDATE
TO authenticated
USING (
  auth.is_caregiver()
  AND caregiver_id = auth.uid()
);

CREATE POLICY "Agency owners can delete visits"
ON visits FOR DELETE
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

-- ============================================
-- VISIT_TASKS TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can view visit tasks"
ON visit_tasks FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND visit_id IN (
    SELECT id FROM visits WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Caregivers can view own visit tasks"
ON visit_tasks FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND visit_id IN (
    SELECT id FROM visits WHERE caregiver_id = auth.uid()
  )
);

CREATE POLICY "Caregivers can update task status"
ON visit_tasks FOR UPDATE
TO authenticated
USING (
  auth.is_caregiver()
  AND visit_id IN (
    SELECT id FROM visits WHERE caregiver_id = auth.uid()
  )
);

-- ============================================
-- TASK_DECLINES TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can view task declines"
ON task_declines FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND visit_id IN (
    SELECT id FROM visits WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Caregivers can create task declines"
ON task_declines FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_caregiver()
  AND visit_id IN (
    SELECT id FROM visits WHERE caregiver_id = auth.uid()
  )
);

-- ============================================
-- OBSERVATIONS TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can view observations"
ON observations FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Caregivers can view own observations"
ON observations FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND caregiver_id = auth.uid()
);

CREATE POLICY "Caregivers can create observations"
ON observations FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_caregiver()
  AND caregiver_id = auth.uid()
  AND visit_id IN (
    SELECT id FROM visits WHERE caregiver_id = auth.uid()
  )
);

-- ============================================
-- DEVICE_TOKENS TABLE POLICIES
-- ============================================

CREATE POLICY "Users can manage own device tokens"
ON device_tokens FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- DAILY_REPORTS TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can view reports"
ON daily_reports FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

-- ============================================
-- QR_CODES TABLE POLICIES
-- ============================================

CREATE POLICY "Agency owners can manage QR codes"
ON qr_codes FOR ALL
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Caregivers can view assigned elder QR codes"
ON qr_codes FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND auth.is_assigned_to_elder(elder_id)
);
