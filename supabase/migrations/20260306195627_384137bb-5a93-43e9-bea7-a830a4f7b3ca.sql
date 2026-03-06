
-- ═══ ACCOUNTS & FINANCE TABLES ═══

-- Revenue entries
CREATE TABLE public.revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_name TEXT NOT NULL DEFAULT 'general',
  category TEXT NOT NULL DEFAULT 'service_revenue',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash',
  reference_number TEXT,
  client_name TEXT,
  client_phone TEXT,
  invoice_number TEXT,
  invoice_url TEXT,
  receipt_url TEXT,
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  month_year TEXT,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Expense entries
CREATE TABLE public.expense_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_name TEXT NOT NULL DEFAULT 'general',
  category TEXT NOT NULL DEFAULT 'operational',
  sub_category TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash',
  paid_to TEXT,
  reference_number TEXT,
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  month_year TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT,
  approved_by TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payout records (team payouts)
CREATE TABLE public.payout_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_name TEXT NOT NULL,
  team_member_phone TEXT,
  vertical_name TEXT DEFAULT 'general',
  payout_type TEXT DEFAULT 'salary',
  base_amount NUMERIC DEFAULT 0,
  bonus_amount NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  payment_mode TEXT DEFAULT 'bank_transfer',
  reference_number TEXT,
  payout_month TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Commission ledger
CREATE TABLE public.commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_name TEXT NOT NULL,
  team_member_phone TEXT,
  vertical_name TEXT NOT NULL,
  deal_reference TEXT,
  deal_value NUMERIC DEFAULT 0,
  commission_percentage NUMERIC DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  paid_at TIMESTAMPTZ,
  month_year TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══ HR & OFFICE CULTURE TABLES ═══

-- Attendance records
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_name TEXT NOT NULL,
  team_member_phone TEXT,
  user_id UUID,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present',
  work_hours NUMERIC,
  overtime_hours NUMERIC DEFAULT 0,
  location TEXT,
  notes TEXT,
  marked_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Leave management
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_name TEXT NOT NULL,
  team_member_phone TEXT,
  user_id UUID,
  leave_type TEXT NOT NULL DEFAULT 'casual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC DEFAULT 1,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leave balances
CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_name TEXT NOT NULL,
  team_member_phone TEXT,
  user_id UUID,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  casual_leave_total NUMERIC DEFAULT 12,
  casual_leave_used NUMERIC DEFAULT 0,
  sick_leave_total NUMERIC DEFAULT 6,
  sick_leave_used NUMERIC DEFAULT 0,
  earned_leave_total NUMERIC DEFAULT 15,
  earned_leave_used NUMERIC DEFAULT 0,
  comp_off_total NUMERIC DEFAULT 0,
  comp_off_used NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team directory (enhanced)
CREATE TABLE public.hr_team_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  designation TEXT,
  department TEXT,
  vertical_name TEXT,
  date_of_joining DATE,
  date_of_birth DATE,
  blood_group TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  address TEXT,
  city TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  pan_number TEXT,
  aadhar_number TEXT,
  profile_photo_url TEXT,
  documents JSON DEFAULT '[]',
  salary_ctc NUMERIC,
  employment_type TEXT DEFAULT 'full_time',
  is_active BOOLEAN DEFAULT true,
  exit_date DATE,
  exit_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements / Office Culture
CREATE TABLE public.hr_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  posted_by TEXT,
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_team_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_announcements ENABLE ROW LEVEL SECURITY;

-- RLS: admin-only access for all finance/HR tables
CREATE POLICY "Admin full access revenue" ON public.revenue_entries FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin full access expenses" ON public.expense_entries FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin full access payouts" ON public.payout_records FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin full access commissions" ON public.commission_ledger FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin full access attendance" ON public.attendance_records FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin full access leave_requests" ON public.leave_requests FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin full access leave_balances" ON public.leave_balances FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin full access hr_directory" ON public.hr_team_directory FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin full access announcements" ON public.hr_announcements FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Also let finance role access finance tables
CREATE POLICY "Finance role access revenue" ON public.revenue_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance role access expenses" ON public.expense_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance role access payouts" ON public.payout_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'finance'));
CREATE POLICY "Finance role access commissions" ON public.commission_ledger FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'finance'));
