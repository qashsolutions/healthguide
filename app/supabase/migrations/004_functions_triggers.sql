-- HealthGuide Functions and Triggers
-- Per healthguide-supabase/schema skill

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_agencies_timestamp
BEFORE UPDATE ON agencies
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_profiles_timestamp
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_elders_timestamp
BEFORE UPDATE ON elders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_visits_timestamp
BEFORE UPDATE ON visits
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_device_tokens_timestamp
BEFORE UPDATE ON device_tokens
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VISIT STATUS AUTO-UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION check_missed_visits()
RETURNS void AS $$
BEGIN
  -- Mark visits as missed if not checked in by end of scheduled day
  UPDATE visits
  SET status = 'missed'
  WHERE status = 'scheduled'
    AND scheduled_date < CURRENT_DATE
    AND actual_start IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ELDER COUNT SYNC
-- ============================================
CREATE OR REPLACE FUNCTION sync_elder_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    UPDATE agencies
    SET current_elder_count = current_elder_count + 1
    WHERE id = NEW.agency_id;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
    UPDATE agencies
    SET current_elder_count = current_elder_count - 1
    WHERE id = OLD.agency_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle active status changes
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE agencies
      SET current_elder_count = current_elder_count - 1
      WHERE id = NEW.agency_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE agencies
      SET current_elder_count = current_elder_count + 1
      WHERE id = NEW.agency_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elder_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON elders
FOR EACH ROW EXECUTE FUNCTION sync_elder_count();

-- ============================================
-- AUTO-CREATE VISIT TASKS
-- ============================================
CREATE OR REPLACE FUNCTION create_visit_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert tasks from elder's preferences
  INSERT INTO visit_tasks (visit_id, task_id, sort_order)
  SELECT NEW.id, etp.task_id, ROW_NUMBER() OVER (ORDER BY tl.category, tl.name)
  FROM elder_task_preferences etp
  JOIN task_library tl ON etp.task_id = tl.id
  WHERE etp.elder_id = NEW.elder_id
    AND tl.is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visit_tasks_trigger
AFTER INSERT ON visits
FOR EACH ROW EXECUTE FUNCTION create_visit_tasks();

-- ============================================
-- DISTANCE CALCULATION FUNCTION (PostGIS)
-- ============================================
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- EVV VALIDATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION validate_check_in_location(
  p_visit_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_elder_lat DECIMAL;
  v_elder_lon DECIMAL;
  v_agency_radius INTEGER;
  v_distance DECIMAL;
BEGIN
  -- Get elder location and agency radius
  SELECT e.latitude, e.longitude, a.evv_radius_meters
  INTO v_elder_lat, v_elder_lon, v_agency_radius
  FROM visits v
  JOIN elders e ON v.elder_id = e.id
  JOIN agencies a ON v.agency_id = a.id
  WHERE v.id = p_visit_id;

  -- Calculate distance
  v_distance := calculate_distance_meters(p_latitude, p_longitude, v_elder_lat, v_elder_lon);

  -- Return true if within radius
  RETURN v_distance <= v_agency_radius;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MARK NOTIFICATION AS READ
-- ============================================
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GET CAREGIVER TODAY'S VISITS
-- ============================================
CREATE OR REPLACE FUNCTION get_caregiver_today_visits(p_caregiver_id UUID)
RETURNS TABLE (
  visit_id UUID,
  elder_name TEXT,
  address TEXT,
  scheduled_start TIME,
  scheduled_end TIME,
  status TEXT,
  task_count BIGINT,
  completed_tasks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS visit_id,
    e.first_name || ' ' || e.last_name AS elder_name,
    e.address,
    v.scheduled_start,
    v.scheduled_end,
    v.status,
    COUNT(vt.id) AS task_count,
    COUNT(vt.id) FILTER (WHERE vt.status = 'completed') AS completed_tasks
  FROM visits v
  JOIN elders e ON v.elder_id = e.id
  LEFT JOIN visit_tasks vt ON v.id = vt.visit_id
  WHERE v.caregiver_id = p_caregiver_id
    AND v.scheduled_date = CURRENT_DATE
  GROUP BY v.id, e.first_name, e.last_name, e.address, v.scheduled_start, v.scheduled_end, v.status
  ORDER BY v.scheduled_start;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CALCULATE VISIT DURATION
-- ============================================
CREATE OR REPLACE FUNCTION get_visit_duration(p_visit_id UUID)
RETURNS INTERVAL AS $$
DECLARE
  v_duration INTERVAL;
BEGIN
  SELECT actual_end - actual_start
  INTO v_duration
  FROM visits
  WHERE id = p_visit_id
    AND actual_start IS NOT NULL
    AND actual_end IS NOT NULL;

  RETURN COALESCE(v_duration, INTERVAL '0');
END;
$$ LANGUAGE plpgsql;
