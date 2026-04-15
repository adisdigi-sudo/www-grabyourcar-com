
-- Add brand & designation to dealer_companies
ALTER TABLE public.dealer_companies
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_discount_update timestamptz,
  ADD COLUMN IF NOT EXISTS automation_enabled boolean DEFAULT true;

-- Create dealer automation logs table
CREATE TABLE IF NOT EXISTS public.dealer_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_company_id uuid REFERENCES public.dealer_companies(id) ON DELETE CASCADE,
  dealer_rep_id uuid REFERENCES public.dealer_representatives(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  action_type text NOT NULL DEFAULT 'outreach',
  message_template text,
  status text DEFAULT 'pending',
  response text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create dealer live discounts table
CREATE TABLE IF NOT EXISTS public.dealer_live_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_company_id uuid REFERENCES public.dealer_companies(id) ON DELETE CASCADE,
  brand text NOT NULL,
  model text NOT NULL,
  variant text,
  discount_type text DEFAULT 'cash',
  discount_amount numeric DEFAULT 0,
  offer_details text,
  valid_from date DEFAULT CURRENT_DATE,
  valid_till date,
  source text DEFAULT 'manual',
  reported_by uuid REFERENCES public.dealer_representatives(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.dealer_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_live_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage dealer_automation_logs" ON public.dealer_automation_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage dealer_live_discounts" ON public.dealer_live_discounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
