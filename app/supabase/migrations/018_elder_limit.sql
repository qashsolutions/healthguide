-- Add max_elders column and DB-level enforcement for elder limit
-- Agencies can have at most max_elders (default 20) active elders at a time

-- Add max_elders column with default of 20
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS max_elders integer DEFAULT 20 NOT NULL;

-- Sync current_elder_count to actual count
UPDATE agencies SET current_elder_count = (
  SELECT count(*) FROM elders
  WHERE elders.agency_id = agencies.id AND elders.is_active = true
);

-- Create trigger function to enforce elder limit
CREATE OR REPLACE FUNCTION enforce_elder_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count integer;
  max_allowed integer;
BEGIN
  -- Only enforce when setting is_active = true (insert or update)
  IF NEW.is_active = true THEN
    SELECT count(*) INTO active_count
    FROM elders
    WHERE agency_id = NEW.agency_id
      AND is_active = true
      AND id != NEW.id;

    SELECT COALESCE(max_elders, 20) INTO max_allowed
    FROM agencies
    WHERE id = NEW.agency_id;

    IF active_count >= max_allowed THEN
      RAISE EXCEPTION 'Agency has reached the maximum of % active elders', max_allowed;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_elder_limit_trigger ON elders;
CREATE TRIGGER enforce_elder_limit_trigger
  BEFORE INSERT OR UPDATE ON elders
  FOR EACH ROW
  EXECUTE FUNCTION enforce_elder_limit();
