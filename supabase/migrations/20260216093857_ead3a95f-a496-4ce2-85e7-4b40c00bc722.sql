
-- =====================================================
-- UNIFIED CUSTOMER MASTER TABLE
-- Single source of truth linking all verticals
-- =====================================================

CREATE TABLE public.unified_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  
  -- OTP verification
  otp_verified BOOLEAN DEFAULT false,
  otp_verified_at TIMESTAMPTZ,
  
  -- Auth linkage
  auth_user_id UUID,
  
  -- Engagement scores
  engagement_score INTEGER DEFAULT 0,
  lifetime_value NUMERIC(12,2) DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  
  -- Cross-vertical flags
  has_car_inquiry BOOLEAN DEFAULT false,
  has_loan_inquiry BOOLEAN DEFAULT false,
  has_insurance BOOLEAN DEFAULT false,
  has_accessory_order BOOLEAN DEFAULT false,
  has_booking BOOLEAN DEFAULT false,
  
  -- Latest activity
  last_activity_type TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  
  -- Customer tags
  tags TEXT[] DEFAULT '{}',
  
  -- Assignment
  assigned_advisor TEXT,
  
  -- Lead source
  first_source TEXT,
  latest_source TEXT,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_unified_customers_phone ON public.unified_customers(phone);
CREATE INDEX idx_unified_customers_auth ON public.unified_customers(auth_user_id);
CREATE INDEX idx_unified_customers_engagement ON public.unified_customers(engagement_score DESC);
CREATE INDEX idx_unified_customers_last_activity ON public.unified_customers(last_activity_at DESC);

-- Enable RLS
ALTER TABLE public.unified_customers ENABLE ROW LEVEL SECURITY;

-- Admin-only management
CREATE POLICY "Admins can manage unified customers"
ON public.unified_customers
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow edge functions (service role) full access
CREATE POLICY "Service role full access to unified customers"
ON public.unified_customers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- UNIFIED ACTIVITY TIMELINE
-- Every interaction across all verticals in one feed
-- =====================================================

CREATE TABLE public.unified_activity_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.unified_customers(id) ON DELETE CASCADE NOT NULL,
  
  vertical TEXT NOT NULL, -- car_sales, insurance, loans, accessories, booking, general
  activity_type TEXT NOT NULL, -- inquiry, quote, payment, policy_issued, renewal, etc.
  title TEXT NOT NULL,
  description TEXT,
  
  -- Reference to source record
  source_table TEXT,
  source_id TEXT,
  
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_unified_timeline_customer ON public.unified_activity_timeline(customer_id, created_at DESC);
CREATE INDEX idx_unified_timeline_vertical ON public.unified_activity_timeline(vertical);

ALTER TABLE public.unified_activity_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage timeline"
ON public.unified_activity_timeline
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role full access to timeline"
ON public.unified_activity_timeline
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- CROSS-SELL RECOMMENDATIONS LOG
-- =====================================================

CREATE TABLE public.customer_journey_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.unified_customers(id) ON DELETE CASCADE NOT NULL,
  trigger_type TEXT NOT NULL, -- loan_to_car, car_to_insurance, insurance_to_accessories, etc.
  trigger_event TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, converted, dismissed
  sent_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journey_triggers_customer ON public.customer_journey_triggers(customer_id);
CREATE INDEX idx_journey_triggers_status ON public.customer_journey_triggers(status);

ALTER TABLE public.customer_journey_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage journey triggers"
ON public.customer_journey_triggers
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role full access to journey triggers"
ON public.customer_journey_triggers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.unified_customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.unified_activity_timeline;

-- Auto update timestamp
CREATE TRIGGER update_unified_customers_updated_at
BEFORE UPDATE ON public.unified_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
