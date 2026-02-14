---
name: healthguide-supabase-rls
description: Row Level Security policies for HealthGuide multi-tenant data isolation. Ensures agency owners see only their agency data, caregivers see only their assignments, and proper access controls. Use when implementing data security, fixing access issues, or auditing permissions.
metadata:
  author: HealthGuide
  version: 1.0.0
  category: supabase
  tags: [rls, security, policies, permissions]
---

# HealthGuide Row Level Security (RLS)

## Overview
RLS policies ensure data isolation in a multi-tenant environment. Agency owners can only access their agency's data. Caregivers can only see their own assignments and relevant elder information. All policies use the authenticated user's JWT claims.

## Security Model

```
Agency Owner → Full access to agency data
Caregiver → Read own profile, assignments, assigned elders
Service Role → Full access (for edge functions)
Anon → No access
```

## Instructions

### Step 1: Enable RLS on All Tables

```sql
-- supabase/migrations/010_enable_rls.sql

-- Enable RLS on all tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE elders ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE elder_task_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
```

### Step 2: Helper Functions for Policy Checks

```sql
-- supabase/migrations/011_rls_helpers.sql

-- Get current user's profile
CREATE OR REPLACE FUNCTION auth.user_profile()
RETURNS user_profiles AS $$
  SELECT * FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

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

-- Check if caregiver is assigned to elder
CREATE OR REPLACE FUNCTION auth.is_assigned_to_elder(elder_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM assignments
    WHERE caregiver_id = auth.uid()
      AND elder_id = $1
      AND scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Step 3: Agency Policies

```sql
-- supabase/migrations/012_agency_policies.sql

-- ============================================
-- AGENCIES TABLE POLICIES
-- ============================================

-- Agency owners can view their own agency
CREATE POLICY "Agency owners can view own agency"
ON agencies FOR SELECT
TO authenticated
USING (id = auth.user_agency_id());

-- Agency owners can update their own agency
CREATE POLICY "Agency owners can update own agency"
ON agencies FOR UPDATE
TO authenticated
USING (id = auth.user_agency_id() AND auth.is_agency_owner())
WITH CHECK (id = auth.user_agency_id() AND auth.is_agency_owner());

-- No direct insert (handled by signup function)
-- No delete (agencies are soft-deleted)
```

### Step 4: User Profile Policies

```sql
-- supabase/migrations/013_user_profile_policies.sql

-- ============================================
-- USER_PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Agency owners can view all profiles in their agency
CREATE POLICY "Agency owners can view agency profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (
  agency_id = auth.user_agency_id()
  AND auth.is_agency_owner()
);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  -- Prevent role/agency changes
  AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
  AND agency_id = auth.user_agency_id()
);

-- Agency owners can insert new caregivers
CREATE POLICY "Agency owners can create caregivers"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
  AND role = 'caregiver'
);

-- Agency owners can update caregiver status
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
```

### Step 5: Elder Policies

```sql
-- supabase/migrations/014_elder_policies.sql

-- ============================================
-- ELDERS TABLE POLICIES
-- ============================================

-- Agency owners can view all elders in their agency
CREATE POLICY "Agency owners can view agency elders"
ON elders FOR SELECT
TO authenticated
USING (
  agency_id = auth.user_agency_id()
  AND auth.is_agency_owner()
);

-- Caregivers can view elders they're assigned to
CREATE POLICY "Caregivers can view assigned elders"
ON elders FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND auth.is_assigned_to_elder(id)
);

-- Agency owners can create elders
CREATE POLICY "Agency owners can create elders"
ON elders FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

-- Agency owners can update elders
CREATE POLICY "Agency owners can update elders"
ON elders FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
)
WITH CHECK (agency_id = auth.user_agency_id());

-- Agency owners can soft-delete (deactivate) elders
CREATE POLICY "Agency owners can deactivate elders"
ON elders FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);
```

### Step 6: Emergency Contacts Policies

```sql
-- supabase/migrations/015_contact_policies.sql

-- ============================================
-- EMERGENCY_CONTACTS TABLE POLICIES
-- ============================================

-- Agency owners can view contacts for their elders
CREATE POLICY "Agency owners can view contacts"
ON emergency_contacts FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

-- Caregivers can view contacts for assigned elders (emergency access)
CREATE POLICY "Caregivers can view assigned elder contacts"
ON emergency_contacts FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND auth.is_assigned_to_elder(elder_id)
);

-- Agency owners can manage contacts
CREATE POLICY "Agency owners can create contacts"
ON emergency_contacts FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Agency owners can update contacts"
ON emergency_contacts FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

CREATE POLICY "Agency owners can delete contacts"
ON emergency_contacts FOR DELETE
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);
```

### Step 7: Assignment Policies

```sql
-- supabase/migrations/016_assignment_policies.sql

-- ============================================
-- ASSIGNMENTS TABLE POLICIES
-- ============================================

-- Agency owners can view all assignments
CREATE POLICY "Agency owners can view all assignments"
ON assignments FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

-- Caregivers can view their own assignments
CREATE POLICY "Caregivers can view own assignments"
ON assignments FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND caregiver_id = auth.uid()
);

-- Agency owners can create assignments
CREATE POLICY "Agency owners can create assignments"
ON assignments FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

-- Agency owners can update any assignment
CREATE POLICY "Agency owners can update assignments"
ON assignments FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

-- Caregivers can update their own assignments (EVV check-in/out)
CREATE POLICY "Caregivers can update own assignments"
ON assignments FOR UPDATE
TO authenticated
USING (
  auth.is_caregiver()
  AND caregiver_id = auth.uid()
)
WITH CHECK (
  caregiver_id = auth.uid()
  -- Only allow updating EVV fields, not schedule
  AND scheduled_date = (SELECT scheduled_date FROM assignments WHERE id = assignments.id)
  AND start_time = (SELECT start_time FROM assignments WHERE id = assignments.id)
  AND end_time = (SELECT end_time FROM assignments WHERE id = assignments.id)
);

-- Agency owners can delete/cancel assignments
CREATE POLICY "Agency owners can delete assignments"
ON assignments FOR DELETE
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

-- ============================================
-- ASSIGNMENT_TASKS TABLE POLICIES
-- ============================================

-- Agency owners can view all assignment tasks
CREATE POLICY "Agency owners can view assignment tasks"
ON assignment_tasks FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND assignment_id IN (
    SELECT id FROM assignments WHERE agency_id = auth.user_agency_id()
  )
);

-- Caregivers can view tasks for their assignments
CREATE POLICY "Caregivers can view own assignment tasks"
ON assignment_tasks FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND assignment_id IN (
    SELECT id FROM assignments WHERE caregiver_id = auth.uid()
  )
);

-- Caregivers can update task status
CREATE POLICY "Caregivers can update task status"
ON assignment_tasks FOR UPDATE
TO authenticated
USING (
  auth.is_caregiver()
  AND assignment_id IN (
    SELECT id FROM assignments WHERE caregiver_id = auth.uid()
  )
);
```

### Step 8: Task Library and Observations Policies

```sql
-- supabase/migrations/017_task_observation_policies.sql

-- ============================================
-- TASK_LIBRARY TABLE POLICIES
-- ============================================

-- Users can view their agency's task library
CREATE POLICY "Users can view agency tasks"
ON task_library FOR SELECT
TO authenticated
USING (agency_id = auth.user_agency_id());

-- Agency owners can manage task library
CREATE POLICY "Agency owners can create tasks"
ON task_library FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

CREATE POLICY "Agency owners can update tasks"
ON task_library FOR UPDATE
TO authenticated
USING (
  auth.is_agency_owner()
  AND agency_id = auth.user_agency_id()
);

-- ============================================
-- OBSERVATIONS TABLE POLICIES
-- ============================================

-- Agency owners can view all observations
CREATE POLICY "Agency owners can view observations"
ON observations FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);

-- Caregivers can view observations they created
CREATE POLICY "Caregivers can view own observations"
ON observations FOR SELECT
TO authenticated
USING (
  auth.is_caregiver()
  AND caregiver_id = auth.uid()
);

-- Caregivers can create observations
CREATE POLICY "Caregivers can create observations"
ON observations FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_caregiver()
  AND caregiver_id = auth.uid()
  AND assignment_id IN (
    SELECT id FROM assignments WHERE caregiver_id = auth.uid()
  )
);
```

### Step 9: Notification Policies

```sql
-- supabase/migrations/018_notification_policies.sql

-- ============================================
-- DEVICE_TOKENS TABLE POLICIES
-- ============================================

-- Users can manage their own device tokens
CREATE POLICY "Users can view own tokens"
ON device_tokens FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tokens"
ON device_tokens FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tokens"
ON device_tokens FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tokens"
ON device_tokens FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can mark their notifications as read
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- DAILY_REPORTS TABLE POLICIES
-- ============================================

-- Agency owners can view all reports
CREATE POLICY "Agency owners can view reports"
ON daily_reports FOR SELECT
TO authenticated
USING (
  auth.is_agency_owner()
  AND elder_id IN (
    SELECT id FROM elders WHERE agency_id = auth.user_agency_id()
  )
);
```

### Step 10: Service Role Bypass

```sql
-- supabase/migrations/019_service_role.sql

-- Service role bypasses RLS by default, but we can add explicit policies
-- for edge functions that use service_role key

-- These policies are for documentation/clarity
-- Service role automatically bypasses RLS

-- Example: Allow service role full access to sms_messages
-- (Not strictly needed as service_role bypasses RLS)
CREATE POLICY "Service role full access to sms_messages"
ON sms_messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Note: Edge functions should use SUPABASE_SERVICE_ROLE_KEY
-- to bypass RLS when needed for cross-tenant operations
```

## Testing RLS Policies

```sql
-- Test as specific user
SET request.jwt.claims TO '{"sub": "user-uuid-here", "role": "authenticated"}';

-- Test query
SELECT * FROM assignments;

-- Reset
RESET request.jwt.claims;
```

## Troubleshooting

### Access denied errors
**Cause:** Missing or incorrect policy
**Solution:** Check policy conditions, verify user's role and agency_id

### Data leakage between agencies
**Cause:** Policy not checking agency_id
**Solution:** Always include `agency_id = auth.user_agency_id()` in policies

### Caregivers can't see assigned data
**Cause:** Assignment lookup failing
**Solution:** Verify `is_assigned_to_elder` function considers date range
