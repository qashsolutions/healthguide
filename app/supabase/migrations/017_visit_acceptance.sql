-- Add pending_acceptance and declined statuses for visit accept/decline flow
-- Caregivers are independent contractors; visits require acceptance before scheduling

ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;

ALTER TABLE visits ADD CONSTRAINT visits_status_check
  CHECK (status IN (
    'pending_acceptance',
    'scheduled',
    'checked_in',
    'in_progress',
    'checked_out',
    'completed',
    'missed',
    'cancelled',
    'declined'
  ));

-- Fix missing INSERT policy on visit_tasks for agency owners
CREATE POLICY "Agency owners can insert visit tasks"
  ON visit_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_agency_owner()
    AND visit_id IN (
      SELECT id FROM visits WHERE agency_id = public.get_user_agency_id()
    )
  );
