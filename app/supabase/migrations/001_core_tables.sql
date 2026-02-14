-- HealthGuide Core Tables Schema
-- Per healthguide-supabase/schema skill

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- AGENCIES TABLE
-- ============================================
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Subscription info
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing',
  current_elder_count INTEGER DEFAULT 0,
  max_caregivers INTEGER DEFAULT 15,

  -- Settings
  evv_radius_meters INTEGER DEFAULT 150,
  default_timezone TEXT DEFAULT 'America/New_York',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agencies_stripe_customer ON agencies(stripe_customer_id);

-- ============================================
-- USER PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('agency_owner', 'caregiver')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,

  -- Caregiver specific
  is_active BOOLEAN DEFAULT true,
  certifications TEXT[],
  hire_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_agency ON user_profiles(agency_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- ============================================
-- ELDERS (CARESEEKERS) TABLE
-- ============================================
CREATE TABLE elders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Personal info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  photo_url TEXT,

  -- Address (for EVV)
  address TEXT NOT NULL,
  apartment TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOGRAPHY(POINT, 4326), -- PostGIS point

  -- Care info
  medical_notes TEXT,
  special_instructions TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_elders_agency ON elders(agency_id);
CREATE INDEX idx_elders_location ON elders USING GIST(location);

-- Trigger to update location point from lat/lng
CREATE OR REPLACE FUNCTION update_elder_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elder_location_trigger
BEFORE INSERT OR UPDATE ON elders
FOR EACH ROW
EXECUTE FUNCTION update_elder_location();

-- ============================================
-- EMERGENCY CONTACTS TABLE
-- ============================================
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  elder_id UUID NOT NULL REFERENCES elders(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_verified BOOLEAN DEFAULT false,

  receives_notifications BOOLEAN DEFAULT true,
  notification_preferences JSONB DEFAULT '{
    "check_in": true,
    "check_out": true,
    "daily_report": true,
    "delivery_time": "19:00",
    "timezone": "America/New_York"
  }'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_elder ON emergency_contacts(elder_id);

-- Limit 3 contacts per elder
CREATE OR REPLACE FUNCTION check_contact_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM emergency_contacts WHERE elder_id = NEW.elder_id) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 emergency contacts per elder';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_limit_trigger
BEFORE INSERT ON emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION check_contact_limit();
