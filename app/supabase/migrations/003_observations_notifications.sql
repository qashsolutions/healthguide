-- HealthGuide Observations and Notifications Tables
-- Per healthguide-supabase/schema skill

-- ============================================
-- OBSERVATIONS TABLE (detailed observations beyond JSONB)
-- ============================================
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  category TEXT NOT NULL CHECK (category IN (
    'mood', 'appetite', 'mobility', 'activity',
    'health_concern', 'medication', 'general'
  )),

  -- Icon-based selection values
  value TEXT NOT NULL, -- e.g., 'happy', 'ate_well', 'walking_well'
  icon TEXT, -- Icon name used for selection

  note TEXT, -- Voice-to-text or typed
  audio_url TEXT, -- Link to audio file in storage
  is_flagged BOOLEAN DEFAULT false, -- For urgent observations

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_observations_visit ON observations(visit_id);
CREATE INDEX idx_observations_elder ON observations(elder_id);
CREATE INDEX idx_observations_category ON observations(category);
CREATE INDEX idx_observations_flagged ON observations(is_flagged) WHERE is_flagged = true;

-- ============================================
-- DEVICE TOKENS TABLE (Push Notifications)
-- ============================================
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, platform)
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'shift_reminder', 'check_in_alert', 'check_out_alert',
    'schedule_change', 'missed_checkout', 'task_declined', 'general'
  )),
  data JSONB,

  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- SMS MESSAGES TABLE (Logging)
-- ============================================
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES emergency_contacts(id) ON DELETE SET NULL,
  elder_id UUID REFERENCES elders(id) ON DELETE SET NULL,

  message_type TEXT NOT NULL CHECK (message_type IN (
    'check_in', 'check_out', 'daily_report', 'verification', 'alert'
  )),
  message_body TEXT NOT NULL,
  to_phone TEXT NOT NULL,

  twilio_sid TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued', 'sent', 'delivered', 'failed', 'undelivered'
  )),

  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_sms_messages_contact ON sms_messages(contact_id);
CREATE INDEX idx_sms_messages_type ON sms_messages(message_type);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);

-- ============================================
-- VERIFICATION CODES TABLE (Phone verification)
-- ============================================
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,

  UNIQUE(contact_id)
);

CREATE INDEX idx_verification_codes_expires ON verification_codes(expires_at);

-- ============================================
-- DAILY REPORTS TABLE
-- ============================================
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,

  -- Summary data
  visits JSONB DEFAULT '[]'::jsonb,
  total_tasks_completed INTEGER DEFAULT 0,
  total_tasks_assigned INTEGER DEFAULT 0,
  observations JSONB DEFAULT '[]'::jsonb,
  missed_visits INTEGER DEFAULT 0,

  -- Delivery tracking
  sent_to_contacts BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,

  generated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(elder_id, report_date)
);

CREATE INDEX idx_daily_reports_elder ON daily_reports(elder_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date);
CREATE INDEX idx_daily_reports_agency_date ON daily_reports(agency_id, report_date);

-- ============================================
-- QR CODES TABLE (for EVV fallback)
-- ============================================
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  code TEXT NOT NULL UNIQUE, -- Format: HG-CHECKIN-{visit_id} or healthguide://checkin/{elder_id}/{visit_id}
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_qr_codes_elder ON qr_codes(elder_id);
CREATE INDEX idx_qr_codes_code ON qr_codes(code);
