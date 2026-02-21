-- Migration 022: Task Restriction
-- Restricts platform to 3 non-medical task categories:
-- companionship, light cleaning, groceries & errands.
-- Migrates caregiver capabilities, deactivates old tasks,
-- updates seed trigger.

------------------------------------------------------------
-- 1. Deactivate non-allowed task_library entries by category
------------------------------------------------------------
UPDATE task_library SET is_active = false
WHERE category NOT IN ('companionship', 'housekeeping', 'errands');

-- Deactivate housekeeping tasks that aren't "Light Cleaning"
UPDATE task_library SET is_active = false
WHERE category = 'housekeeping' AND name NOT ILIKE '%light%clean%';

-- Deactivate subcategory tasks in allowed categories
-- (keep only the 3 canonical: Companionship, Light Cleaning, Groceries & Errands)
UPDATE task_library SET is_active = false
WHERE is_active = true AND name NOT IN ('Companionship', 'Light Cleaning', 'Groceries & Errands');

------------------------------------------------------------
-- 2. Migrate caregiver_profiles.capabilities to new values
------------------------------------------------------------
UPDATE caregiver_profiles SET capabilities = (
  SELECT COALESCE(ARRAY_AGG(DISTINCT new_val), ARRAY['companionship'])
  FROM (
    SELECT CASE
      WHEN unnest = 'companionship' THEN 'companionship'
      WHEN unnest = 'light_housekeeping' THEN 'light_cleaning'
      WHEN unnest = 'errands' THEN 'groceries'
      ELSE NULL
    END as new_val
    FROM unnest(capabilities)
  ) mapped
  WHERE new_val IS NOT NULL
);

-- Ensure everyone has at least companionship
UPDATE caregiver_profiles SET capabilities = ARRAY['companionship']
WHERE capabilities = '{}' OR capabilities IS NULL;

------------------------------------------------------------
-- 3. Update seed_agency_tasks() trigger (3 tasks only)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_agency_tasks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_library (agency_id, name, description, category, icon, is_active)
  VALUES
    (NEW.id, 'Companionship', 'Conversation, games, walks, watching TV, reading', 'companionship', 'chatbubble-ellipses-outline', true),
    (NEW.id, 'Light Cleaning', 'Dishes, tidying, laundry, taking out trash', 'housekeeping', 'home-outline', true),
    (NEW.id, 'Groceries & Errands', 'Grocery shopping, pharmacy pickup, drive to store/appointment', 'errands', 'cart-outline', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
