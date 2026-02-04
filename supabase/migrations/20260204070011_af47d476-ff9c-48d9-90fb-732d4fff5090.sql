-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'sales', 'dealer', 'finance');

-- Create user_roles table for RBAC
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin')
  )
$$;

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create homepage_content table for banner/content management
CREATE TABLE public.homepage_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type TEXT NOT NULL, -- 'hero_banner', 'promo_banner', 'featured_cars', 'testimonial', 'cta'
    title TEXT,
    subtitle TEXT,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    link_text TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on homepage_content
ALTER TABLE public.homepage_content ENABLE ROW LEVEL SECURITY;

-- Anyone can view active homepage content
CREATE POLICY "Anyone can view active homepage content"
ON public.homepage_content FOR SELECT
USING (is_active = true);

-- Admins can manage homepage content
CREATE POLICY "Admins can manage homepage content"
ON public.homepage_content FOR ALL
USING (public.is_admin(auth.uid()));

-- Create leads table for CRM
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL, -- 'website', 'whatsapp', 'chatbot', 'landing_page', 'phone'
    lead_type TEXT NOT NULL, -- 'car_inquiry', 'test_drive', 'finance', 'insurance', 'hsrp', 'rental'
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'hot', 'warm', 'cold', 'converted', 'lost'
    priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
    
    -- Customer info
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    city TEXT,
    
    -- Car interest
    car_brand TEXT,
    car_model TEXT,
    car_variant TEXT,
    budget_min INTEGER,
    budget_max INTEGER,
    buying_timeline TEXT, -- 'immediate', 'this_week', 'this_month', '1-3_months', 'just_exploring'
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Follow-up
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    next_follow_up_at TIMESTAMP WITH TIME ZONE,
    follow_up_count INTEGER DEFAULT 0,
    
    -- Notes and communication
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Metadata
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    landing_page TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create lead_activities table for tracking communications
CREATE TABLE public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL, -- 'call', 'email', 'whatsapp', 'meeting', 'note', 'status_change', 'assignment'
    description TEXT,
    outcome TEXT, -- 'successful', 'no_answer', 'callback_requested', 'not_interested'
    performed_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Sales team can view assigned leads
CREATE POLICY "Sales can view assigned leads"
ON public.leads FOR SELECT
USING (
    assigned_to = auth.uid() OR 
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'sales')
);

-- Sales can update assigned leads
CREATE POLICY "Sales can update assigned leads"
ON public.leads FOR UPDATE
USING (
    assigned_to = auth.uid() OR 
    public.is_admin(auth.uid())
);

-- Admins can manage all leads
CREATE POLICY "Admins can manage leads"
ON public.leads FOR ALL
USING (public.is_admin(auth.uid()));

-- Enable RLS on lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Users can view activities for leads they have access to
CREATE POLICY "Users can view lead activities"
ON public.lead_activities FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = lead_activities.lead_id 
        AND (leads.assigned_to = auth.uid() OR public.is_admin(auth.uid()))
    )
);

-- Users can create activities for assigned leads
CREATE POLICY "Users can create lead activities"
ON public.lead_activities FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = lead_activities.lead_id 
        AND (leads.assigned_to = auth.uid() OR public.is_admin(auth.uid()))
    )
);

-- Create rental_bookings table for self-drive
CREATE TABLE public.rental_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Vehicle info
    vehicle_name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    vehicle_image TEXT,
    
    -- Booking details
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    dropoff_date DATE NOT NULL,
    dropoff_time TIME NOT NULL,
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    
    -- Pricing
    daily_rate INTEGER NOT NULL,
    total_days INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    security_deposit INTEGER DEFAULT 5000,
    total_amount INTEGER NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'ongoing', 'completed', 'cancelled'
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
    payment_id TEXT,
    
    -- Additional
    driver_license_number TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on rental_bookings
ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own rental bookings
CREATE POLICY "Users can view own rental bookings"
ON public.rental_bookings FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own rental bookings
CREATE POLICY "Users can create rental bookings"
ON public.rental_bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending bookings
CREATE POLICY "Users can update own pending bookings"
ON public.rental_bookings FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can manage all rental bookings
CREATE POLICY "Admins can manage rental bookings"
ON public.rental_bookings FOR ALL
USING (public.is_admin(auth.uid()));

-- Create admin_settings table for site-wide settings
CREATE TABLE public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read settings"
ON public.admin_settings FOR SELECT
USING (true);

-- Admins can manage settings
CREATE POLICY "Admins can manage settings"
ON public.admin_settings FOR ALL
USING (public.is_admin(auth.uid()));

-- Create analytics_events table for tracking
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'page_view', 'car_view', 'lead_submit', 'booking', 'conversion'
    event_data JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    page_url TEXT,
    referrer TEXT,
    device_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (for tracking)
CREATE POLICY "Anyone can insert events"
ON public.analytics_events FOR INSERT
WITH CHECK (true);

-- Admins can view analytics
CREATE POLICY "Admins can view analytics"
ON public.analytics_events FOR SELECT
USING (public.is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_rental_bookings_user_id ON public.rental_bookings(user_id);
CREATE INDEX idx_rental_bookings_status ON public.rental_bookings(status);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- Add triggers for updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homepage_content_updated_at
BEFORE UPDATE ON public.homepage_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_bookings_updated_at
BEFORE UPDATE ON public.rental_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();