
-- =============================================
-- GRABYOURCAR INSURANCE CRM - COMPLETE SCHEMA
-- =============================================

-- 1. INSURANCE CLIENTS (Master Profile)
CREATE TABLE public.insurance_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  customer_name TEXT,
  email TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  date_of_birth DATE,
  gender TEXT,
  -- Vehicle Details
  vehicle_number TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_variant TEXT,
  vehicle_year INTEGER,
  vehicle_fuel_type TEXT,
  vehicle_registration_date DATE,
  engine_number TEXT,
  chassis_number TEXT,
  -- Insurance Details
  current_insurer TEXT,
  current_policy_number TEXT,
  current_policy_type TEXT,
  policy_start_date DATE,
  policy_expiry_date DATE,
  current_premium NUMERIC(10,2),
  ncb_percentage NUMERIC(5,2),
  -- CRM Fields
  lead_source TEXT DEFAULT 'website',
  lead_status TEXT DEFAULT 'new',
  assigned_advisor_id UUID,
  advisor_name TEXT,
  priority TEXT DEFAULT 'medium',
  tags TEXT[],
  notes TEXT,
  -- UTM Tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  -- Flags
  is_otp_verified BOOLEAN DEFAULT false,
  whatsapp_opted_in BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  -- Linked records
  original_lead_id UUID,
  -- Timestamps
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage insurance clients"
  ON public.insurance_clients FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Public can insert insurance clients"
  ON public.insurance_clients FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX idx_insurance_clients_phone ON public.insurance_clients(phone);
CREATE INDEX idx_insurance_clients_status ON public.insurance_clients(lead_status);
CREATE INDEX idx_insurance_clients_expiry ON public.insurance_clients(policy_expiry_date);
CREATE INDEX idx_insurance_clients_advisor ON public.insurance_clients(assigned_advisor_id);

CREATE TRIGGER update_insurance_clients_updated_at
  BEFORE UPDATE ON public.insurance_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. INSURANCE POLICIES (Policy Lifecycle)
CREATE TABLE public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.insurance_clients(id) ON DELETE CASCADE NOT NULL,
  -- Policy Info
  policy_number TEXT,
  policy_type TEXT NOT NULL, -- comprehensive, third_party, standalone_od
  insurer TEXT NOT NULL,
  plan_name TEXT,
  -- Financial
  premium_amount NUMERIC(10,2),
  net_premium NUMERIC(10,2),
  gst_amount NUMERIC(10,2),
  idv NUMERIC(12,2),
  ncb_discount NUMERIC(10,2),
  -- Dates
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  issued_date DATE,
  -- Add-ons
  addons TEXT[], -- zero_dep, engine_protect, rsa, consumables, etc.
  addon_premium NUMERIC(10,2),
  -- Status
  status TEXT DEFAULT 'active', -- active, expired, cancelled, lapsed, renewed
  renewal_status TEXT DEFAULT 'pending', -- pending, reminded, quoted, renewed, lost
  previous_policy_id UUID REFERENCES public.insurance_policies(id),
  -- Documents
  policy_document_url TEXT,
  -- Metadata
  payment_mode TEXT,
  payment_reference TEXT,
  is_renewal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage insurance policies"
  ON public.insurance_policies FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_insurance_policies_client ON public.insurance_policies(client_id);
CREATE INDEX idx_insurance_policies_expiry ON public.insurance_policies(expiry_date);
CREATE INDEX idx_insurance_policies_status ON public.insurance_policies(status);
CREATE INDEX idx_insurance_policies_renewal ON public.insurance_policies(renewal_status);

CREATE TRIGGER update_insurance_policies_updated_at
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. INSURANCE COMMISSIONS
CREATE TABLE public.insurance_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.insurance_clients(id) ON DELETE CASCADE NOT NULL,
  advisor_id UUID,
  advisor_name TEXT,
  -- Financial
  premium_amount NUMERIC(10,2),
  commission_percentage NUMERIC(5,2),
  commission_amount NUMERIC(10,2),
  bonus_amount NUMERIC(10,2) DEFAULT 0,
  total_earned NUMERIC(10,2),
  -- Status
  status TEXT DEFAULT 'pending', -- pending, approved, paid, disputed
  paid_date DATE,
  payment_reference TEXT,
  -- Metadata
  commission_type TEXT DEFAULT 'new', -- new, renewal, cross_sell
  insurer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commissions"
  ON public.insurance_commissions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_insurance_commissions_updated_at
  BEFORE UPDATE ON public.insurance_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. INSURANCE DOCUMENTS (Document Vault)
CREATE TABLE public.insurance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.insurance_clients(id) ON DELETE CASCADE NOT NULL,
  policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL, -- policy_copy, rc_copy, id_proof, claim_form, invoice, other
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size TEXT,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage insurance documents"
  ON public.insurance_documents FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5. INSURANCE TASKS (Follow-ups & Actions)
CREATE TABLE public.insurance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.insurance_clients(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
  -- Task Info
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL, -- follow_up, renewal_call, document_collection, payment_reminder, claim_assist, cross_sell
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  -- Assignment
  assigned_to UUID,
  assigned_name TEXT,
  -- Dates
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Auto-generated
  is_automated BOOLEAN DEFAULT false,
  trigger_event TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage insurance tasks"
  ON public.insurance_tasks FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_insurance_tasks_status ON public.insurance_tasks(status);
CREATE INDEX idx_insurance_tasks_due ON public.insurance_tasks(due_date);
CREATE INDEX idx_insurance_tasks_assigned ON public.insurance_tasks(assigned_to);

CREATE TRIGGER update_insurance_tasks_updated_at
  BEFORE UPDATE ON public.insurance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. INSURANCE CLAIMS
CREATE TABLE public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.insurance_clients(id) ON DELETE CASCADE NOT NULL,
  policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
  claim_number TEXT,
  claim_type TEXT, -- own_damage, third_party, theft, natural_calamity
  incident_date DATE,
  incident_description TEXT,
  claim_amount NUMERIC(12,2),
  approved_amount NUMERIC(12,2),
  status TEXT DEFAULT 'initiated', -- initiated, submitted, under_review, approved, settled, rejected
  settlement_date DATE,
  garage_name TEXT,
  garage_contact TEXT,
  documents TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage insurance claims"
  ON public.insurance_claims FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON public.insurance_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. INSURANCE RENEWAL TRACKING
CREATE TABLE public.insurance_renewal_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.insurance_clients(id) ON DELETE CASCADE NOT NULL,
  -- Renewal window
  expiry_date DATE NOT NULL,
  days_until_expiry INTEGER,
  -- Reminders sent
  reminder_60_sent BOOLEAN DEFAULT false,
  reminder_60_sent_at TIMESTAMPTZ,
  reminder_30_sent BOOLEAN DEFAULT false,
  reminder_30_sent_at TIMESTAMPTZ,
  reminder_15_sent BOOLEAN DEFAULT false,
  reminder_15_sent_at TIMESTAMPTZ,
  reminder_7_sent BOOLEAN DEFAULT false,
  reminder_7_sent_at TIMESTAMPTZ,
  reminder_1_sent BOOLEAN DEFAULT false,
  reminder_1_sent_at TIMESTAMPTZ,
  -- Advisor alerts
  advisor_alerted BOOLEAN DEFAULT false,
  advisor_alert_sent_at TIMESTAMPTZ,
  -- Re-quote
  requote_generated BOOLEAN DEFAULT false,
  requote_premium NUMERIC(10,2),
  requote_insurer TEXT,
  requote_sent_at TIMESTAMPTZ,
  -- Outcome
  outcome TEXT DEFAULT 'pending', -- pending, renewed, lost, lapsed
  renewed_policy_id UUID,
  lost_reason TEXT,
  recovery_attempts INTEGER DEFAULT 0,
  last_recovery_at TIMESTAMPTZ,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_renewal_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage renewal tracking"
  ON public.insurance_renewal_tracking FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_renewal_tracking_expiry ON public.insurance_renewal_tracking(expiry_date);
CREATE INDEX idx_renewal_tracking_outcome ON public.insurance_renewal_tracking(outcome);

CREATE TRIGGER update_renewal_tracking_updated_at
  BEFORE UPDATE ON public.insurance_renewal_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. INSURANCE ADVISORS (Performance Tracking)
CREATE TABLE public.insurance_advisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  -- Performance
  total_leads_assigned INTEGER DEFAULT 0,
  total_policies_sold INTEGER DEFAULT 0,
  total_premium_collected NUMERIC(12,2) DEFAULT 0,
  total_commission_earned NUMERIC(12,2) DEFAULT 0,
  conversion_rate NUMERIC(5,2) DEFAULT 0,
  renewal_rate NUMERIC(5,2) DEFAULT 0,
  -- Status
  is_active BOOLEAN DEFAULT true,
  specialization TEXT[], -- comprehensive, third_party, commercial
  cities TEXT[],
  max_daily_leads INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_advisors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage advisors"
  ON public.insurance_advisors FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_insurance_advisors_updated_at
  BEFORE UPDATE ON public.insurance_advisors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. INSURANCE ACTIVITY LOG (Customer Timeline)
CREATE TABLE public.insurance_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.insurance_clients(id) ON DELETE CASCADE NOT NULL,
  policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- lead_created, quote_sent, call_made, policy_issued, renewal_reminder, payment_received, document_uploaded, status_changed, whatsapp_sent, cross_sell_offered
  title TEXT NOT NULL,
  description TEXT,
  performed_by TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage activity log"
  ON public.insurance_activity_log FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_insurance_activity_client ON public.insurance_activity_log(client_id);
CREATE INDEX idx_insurance_activity_type ON public.insurance_activity_log(activity_type);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_policies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_tasks;
