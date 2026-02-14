-- HealthGuide Stripe Billing Integration
-- Adds columns for Stripe subscription management

-- ============================================
-- ADD STRIPE COLUMNS TO AGENCIES TABLE
-- ============================================
ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing'
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
ADD COLUMN IF NOT EXISTS current_elder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS billing_cycle_anchor TIMESTAMPTZ;

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_agencies_stripe_customer
ON agencies(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agencies_subscription_status
ON agencies(subscription_status);

-- ============================================
-- INVOICES TABLE (Local cache of Stripe invoices)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,

  invoice_number TEXT,
  amount_due INTEGER NOT NULL, -- cents
  amount_paid INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),

  invoice_pdf TEXT,
  hosted_invoice_url TEXT,

  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_agency ON invoices(agency_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);

-- ============================================
-- PAYMENT METHODS TABLE (Local reference)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,

  card_brand TEXT, -- 'visa', 'mastercard', etc.
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_agency ON payment_methods(agency_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Agency owners can view their invoices
CREATE POLICY "Agency owners can view invoices"
ON invoices FOR SELECT
TO authenticated
USING (
  agency_id = auth.user_agency_id()
  AND auth.is_agency_owner()
);

-- Agency owners can view their payment methods
CREATE POLICY "Agency owners can view payment methods"
ON payment_methods FOR SELECT
TO authenticated
USING (
  agency_id = auth.user_agency_id()
  AND auth.is_agency_owner()
);

-- Service role has full access (for webhooks)
CREATE POLICY "Service role full access to invoices"
ON invoices FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access to payment methods"
ON payment_methods FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- BILLING HELPER FUNCTIONS
-- ============================================

-- Get agency billing info
CREATE OR REPLACE FUNCTION get_agency_billing_info(p_agency_id UUID)
RETURNS TABLE (
  subscription_status TEXT,
  current_elder_count INTEGER,
  monthly_amount INTEGER,
  trial_ends_at TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.subscription_status,
    a.current_elder_count,
    (a.current_elder_count * 1500)::INTEGER AS monthly_amount, -- $15.00 per elder in cents
    a.trial_ends_at,
    a.billing_cycle_anchor + INTERVAL '1 month' AS next_billing_date
  FROM agencies a
  WHERE a.id = p_agency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update subscription status (called by webhook)
CREATE OR REPLACE FUNCTION update_agency_subscription(
  p_stripe_customer_id TEXT,
  p_subscription_status TEXT,
  p_elder_count INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE agencies
  SET
    subscription_status = p_subscription_status,
    current_elder_count = COALESCE(p_elder_count, current_elder_count),
    updated_at = NOW()
  WHERE stripe_customer_id = p_stripe_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
