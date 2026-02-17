
-- Business verticals master table
CREATE TABLE public.business_verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User vertical access mapping
CREATE TABLE public.user_vertical_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vertical_id UUID NOT NULL REFERENCES public.business_verticals(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'member',
  granted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, vertical_id)
);

-- Team members (extends auth.users with business identity)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  phone TEXT,
  designation TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vertical_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies: business_verticals
CREATE POLICY "Authenticated users can view active verticals"
ON public.business_verticals FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage verticals"
ON public.business_verticals FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies: user_vertical_access
CREATE POLICY "Users can view their own vertical access"
ON public.user_vertical_access FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage vertical access"
ON public.user_vertical_access FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update vertical access"
ON public.user_vertical_access FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete vertical access"
ON public.user_vertical_access FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies: team_members
CREATE POLICY "Authenticated users can view team members"
ON public.team_members FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage team members"
ON public.team_members FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update team members"
ON public.team_members FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete team members"
ON public.team_members FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Seed default verticals
INSERT INTO public.business_verticals (name, slug, description, icon, color, sort_order) VALUES
('Insurance', 'insurance', 'Motor Insurance OS — Prospect Pool, Policy Book, Renewals & CRM', 'Shield', '#8B5CF6', 1),
('Car Loans / Finance', 'loans', 'Loan Leads, Bank Tracking, Approvals & Disbursement', 'Banknote', '#10B981', 2),
('Automotive Sales', 'sales', 'New Car Database, Dealer Management & Booking Pipeline', 'Car', '#3B82F6', 3),
('Self-Drive Rental', 'rental', 'Fleet Management, Bookings & Agreements', 'Key', '#F59E0B', 4),
('HSRP & FASTag', 'hsrp', 'Order Management, Inventory & Dispatch', 'CreditCard', '#EF4444', 5),
('Accessories', 'accessories', 'Product Catalog, Orders & Vendor Management', 'ShoppingBag', '#EC4899', 6),
('Marketing & Tech', 'marketing', 'Website Control, Campaigns, SEO & API Integrations', 'Megaphone', '#6366F1', 7);

-- Triggers for updated_at
CREATE TRIGGER update_business_verticals_updated_at
BEFORE UPDATE ON public.business_verticals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
