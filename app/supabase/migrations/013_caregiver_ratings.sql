-- Migration 013: Caregiver Ratings System
-- Adds thumbs up/down ratings with selectable tags for caregiver profiles.
-- Anyone with an account can rate. One rating per user per caregiver (upsertable).
-- Denormalized aggregate columns on caregiver_profiles for fast directory reads.

-- ============================================================
-- 1. CAREGIVER RATINGS TABLE
-- ============================================================

CREATE TABLE caregiver_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_profile_id UUID NOT NULL REFERENCES caregiver_profiles(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rating: thumbs up (TRUE) or thumbs down (FALSE)
  is_positive BOOLEAN NOT NULL,

  -- Selectable tags: reliable, compassionate, skilled, punctual, professional, communicative
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Optional short comment (max 200 characters)
  comment TEXT CHECK (char_length(comment) <= 200),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One rating per user per caregiver (supports UPSERT)
  CONSTRAINT unique_user_caregiver_rating UNIQUE (caregiver_profile_id, reviewer_user_id)
);

-- Prevent self-rating
ALTER TABLE caregiver_ratings
  ADD CONSTRAINT no_self_rating CHECK (
    reviewer_user_id != (
      SELECT user_id FROM caregiver_profiles WHERE id = caregiver_profile_id
    )
  );

-- Note: The CHECK constraint above won't work as a table constraint referencing another table.
-- Instead, we'll enforce this via a trigger below.
ALTER TABLE caregiver_ratings DROP CONSTRAINT IF EXISTS no_self_rating;

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_caregiver_ratings_profile ON caregiver_ratings(caregiver_profile_id);
CREATE INDEX idx_caregiver_ratings_reviewer ON caregiver_ratings(reviewer_user_id);
CREATE INDEX idx_caregiver_ratings_positive ON caregiver_ratings(caregiver_profile_id, is_positive);
CREATE INDEX idx_caregiver_ratings_tags ON caregiver_ratings USING GIN(tags);
CREATE INDEX idx_caregiver_ratings_created ON caregiver_ratings(caregiver_profile_id, created_at DESC);

-- ============================================================
-- 3. DENORMALIZED AGGREGATE COLUMNS ON CAREGIVER_PROFILES
-- ============================================================

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS positive_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 4. PREVENT SELF-RATING TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_self_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM caregiver_profiles
    WHERE id = NEW.caregiver_profile_id AND user_id = NEW.reviewer_user_id
  ) THEN
    RAISE EXCEPTION 'Caregivers cannot rate themselves';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_no_self_rating
  BEFORE INSERT OR UPDATE ON caregiver_ratings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_rating();

-- ============================================================
-- 5. AUTO-UPDATE AGGREGATE STATS TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_caregiver_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_profile_id UUID;
BEGIN
  -- Determine which caregiver_profile_id to update
  IF TG_OP = 'DELETE' THEN
    target_profile_id := OLD.caregiver_profile_id;
  ELSE
    target_profile_id := NEW.caregiver_profile_id;
  END IF;

  -- Recompute aggregate counts
  UPDATE caregiver_profiles
  SET
    rating_count = COALESCE((
      SELECT COUNT(*) FROM caregiver_ratings
      WHERE caregiver_profile_id = target_profile_id
    ), 0),
    positive_count = COALESCE((
      SELECT COUNT(*) FROM caregiver_ratings
      WHERE caregiver_profile_id = target_profile_id AND is_positive = TRUE
    ), 0),
    updated_at = NOW()
  WHERE id = target_profile_id;

  -- If updating and profile changed, also update old profile
  IF TG_OP = 'UPDATE' AND OLD.caregiver_profile_id != NEW.caregiver_profile_id THEN
    UPDATE caregiver_profiles
    SET
      rating_count = COALESCE((
        SELECT COUNT(*) FROM caregiver_ratings
        WHERE caregiver_profile_id = OLD.caregiver_profile_id
      ), 0),
      positive_count = COALESCE((
        SELECT COUNT(*) FROM caregiver_ratings
        WHERE caregiver_profile_id = OLD.caregiver_profile_id AND is_positive = TRUE
      ), 0),
      updated_at = NOW()
    WHERE id = OLD.caregiver_profile_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_caregiver_rating_aggregates
  AFTER INSERT OR UPDATE OR DELETE ON caregiver_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_caregiver_rating_stats();

-- ============================================================
-- 6. AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================

CREATE TRIGGER update_caregiver_ratings_timestamp
  BEFORE UPDATE ON caregiver_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE caregiver_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or anonymous) can view all ratings
CREATE POLICY "Anyone can view ratings"
  ON caregiver_ratings FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can create ratings (only their own reviewer_user_id)
CREATE POLICY "Users can create own ratings"
  ON caregiver_ratings FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_user_id = auth.uid());

-- Authenticated users can update their own ratings
CREATE POLICY "Users can update own ratings"
  ON caregiver_ratings FOR UPDATE
  TO authenticated
  USING (reviewer_user_id = auth.uid())
  WITH CHECK (reviewer_user_id = auth.uid());

-- Authenticated users can delete their own ratings
CREATE POLICY "Users can delete own ratings"
  ON caregiver_ratings FOR DELETE
  TO authenticated
  USING (reviewer_user_id = auth.uid());

-- Service role has full access (for edge functions and admin)
CREATE POLICY "Service role full access to ratings"
  ON caregiver_ratings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 8. HELPER FUNCTION: GET TOP TAGS FOR A CAREGIVER
-- ============================================================

CREATE OR REPLACE FUNCTION get_caregiver_top_tags(
  p_caregiver_profile_id UUID,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (tag TEXT, tag_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT unnest(cr.tags) AS tag, COUNT(*) AS tag_count
  FROM caregiver_ratings cr
  WHERE cr.caregiver_profile_id = p_caregiver_profile_id
    AND cr.is_positive = TRUE
  GROUP BY tag
  ORDER BY tag_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
