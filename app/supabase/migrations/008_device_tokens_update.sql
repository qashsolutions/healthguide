-- HealthGuide Device Tokens Update
-- Adds Expo Push Token support for push notifications

-- ============================================
-- UPDATE DEVICE TOKENS TABLE
-- ============================================

-- Drop the old unique constraint (user_id, platform)
ALTER TABLE device_tokens DROP CONSTRAINT IF EXISTS device_tokens_user_id_platform_key;

-- Rename 'token' column to 'expo_push_token' if not already done
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_tokens' AND column_name = 'token'
  ) THEN
    ALTER TABLE device_tokens RENAME COLUMN token TO expo_push_token;
  END IF;
END $$;

-- Add is_active column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_tokens' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE device_tokens ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add device_id column for multiple device support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_tokens' AND column_name = 'device_id'
  ) THEN
    ALTER TABLE device_tokens ADD COLUMN device_id TEXT;
  END IF;
END $$;

-- Create unique constraint on expo_push_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'device_tokens_expo_push_token_key'
  ) THEN
    ALTER TABLE device_tokens ADD CONSTRAINT device_tokens_expo_push_token_key UNIQUE (expo_push_token);
  END IF;
END $$;

-- Index for looking up active tokens by user
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active
ON device_tokens(user_id, is_active) WHERE is_active = true;

-- ============================================
-- UPSERT DEVICE TOKEN FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION upsert_device_token(
  p_user_id UUID,
  p_expo_push_token TEXT,
  p_platform TEXT,
  p_user_type TEXT DEFAULT 'caregiver',
  p_device_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_token_id UUID;
BEGIN
  -- Try to update existing token
  UPDATE device_tokens
  SET
    user_id = p_user_id,
    platform = p_platform,
    user_type = p_user_type,
    device_id = COALESCE(p_device_id, device_id),
    is_active = true,
    updated_at = NOW()
  WHERE expo_push_token = p_expo_push_token
  RETURNING id INTO v_token_id;

  -- If no update happened, insert new record
  IF v_token_id IS NULL THEN
    INSERT INTO device_tokens (
      user_id,
      expo_push_token,
      platform,
      user_type,
      device_id,
      is_active
    ) VALUES (
      p_user_id,
      p_expo_push_token,
      p_platform,
      p_user_type,
      p_device_id,
      true
    )
    RETURNING id INTO v_token_id;
  END IF;

  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- REMOVE DEVICE TOKEN FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION remove_device_token(
  p_user_id UUID,
  p_expo_push_token TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF p_expo_push_token IS NOT NULL THEN
    -- Remove specific token
    UPDATE device_tokens
    SET is_active = false
    WHERE user_id = p_user_id
      AND expo_push_token = p_expo_push_token;
  ELSE
    -- Remove all tokens for user
    UPDATE device_tokens
    SET is_active = false
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES FOR DEVICE TOKENS
-- ============================================
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own device tokens
DROP POLICY IF EXISTS "Users can view own tokens" ON device_tokens;
CREATE POLICY "Users can view own tokens"
ON device_tokens FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own tokens" ON device_tokens;
CREATE POLICY "Users can insert own tokens"
ON device_tokens FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tokens" ON device_tokens;
CREATE POLICY "Users can update own tokens"
ON device_tokens FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own tokens" ON device_tokens;
CREATE POLICY "Users can delete own tokens"
ON device_tokens FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Service role has full access (for Edge Functions)
DROP POLICY IF EXISTS "Service role full access to tokens" ON device_tokens;
CREATE POLICY "Service role full access to tokens"
ON device_tokens FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
