-- Create rental_services table for managing service types (Self Drive, With Driver, Outstation)
CREATE TABLE public.rental_services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    base_price NUMERIC(10,2),
    price_unit VARCHAR(50) DEFAULT 'per day',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    features JSONB DEFAULT '[]'::jsonb,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rental_vehicles table for fleet management (replacing localStorage)
CREATE TABLE public.rental_vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    fuel_type VARCHAR(50),
    transmission VARCHAR(50),
    seats INTEGER DEFAULT 5,
    year INTEGER,
    color VARCHAR(50),
    registration_number VARCHAR(50),
    rent_self_drive NUMERIC(10,2),
    rent_with_driver NUMERIC(10,2),
    rent_outstation_per_km NUMERIC(10,2),
    location VARCHAR(200),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create driver_bookings table for "Book with Driver" service
CREATE TABLE public.driver_bookings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    vehicle_id UUID REFERENCES public.rental_vehicles(id) ON DELETE SET NULL,
    vehicle_name VARCHAR(200),
    service_type VARCHAR(50) NOT NULL DEFAULT 'with_driver',
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_date DATE,
    dropoff_time TIME,
    dropoff_address TEXT,
    trip_type VARCHAR(50) DEFAULT 'local',
    distance_km NUMERIC(10,2),
    duration_days INTEGER DEFAULT 1,
    base_amount NUMERIC(10,2) NOT NULL,
    driver_charges NUMERIC(10,2) DEFAULT 0,
    extra_km_charges NUMERIC(10,2) DEFAULT 0,
    night_charges NUMERIC(10,2) DEFAULT 0,
    toll_charges NUMERIC(10,2) DEFAULT 0,
    taxes NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    discount_reason VARCHAR(200),
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_id VARCHAR(200),
    driver_name VARCHAR(200),
    driver_phone VARCHAR(20),
    driver_assigned_at TIMESTAMP WITH TIME ZONE,
    special_instructions TEXT,
    source VARCHAR(100) DEFAULT 'website',
    api_partner_id UUID,
    api_reference_id VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create api_partners table for third-party integrations
CREATE TABLE public.api_partners (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    api_key_hash VARCHAR(500),
    api_secret_hash VARCHAR(500),
    webhook_url TEXT,
    callback_url TEXT,
    allowed_services VARCHAR(100)[] DEFAULT ARRAY['self_drive', 'with_driver', 'outstation']::VARCHAR[],
    commission_percentage NUMERIC(5,2) DEFAULT 0,
    branding_enabled BOOLEAN DEFAULT true,
    custom_branding JSONB DEFAULT '{}'::jsonb,
    rate_limit_per_minute INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    ip_whitelist TEXT[],
    contact_name VARCHAR(200),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create api_logs for tracking API usage
CREATE TABLE public.api_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID REFERENCES public.api_partners(id) ON DELETE SET NULL,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_body JSONB,
    response_code INTEGER,
    response_body JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rental_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rental_services (public read, admin write)
CREATE POLICY "Public can view active rental services"
ON public.rental_services FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage rental services"
ON public.rental_services FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for rental_vehicles (public read, admin write)
CREATE POLICY "Public can view active rental vehicles"
ON public.rental_vehicles FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage rental vehicles"
ON public.rental_vehicles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for driver_bookings
CREATE POLICY "Users can view their own driver bookings"
ON public.driver_bookings FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Anyone can create driver bookings"
ON public.driver_bookings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update driver bookings"
ON public.driver_bookings FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete driver bookings"
ON public.driver_bookings FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for api_partners (admin only)
CREATE POLICY "Admins can manage API partners"
ON public.api_partners FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for api_logs (admin only)
CREATE POLICY "Admins can view API logs"
ON public.api_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert API logs"
ON public.api_logs FOR INSERT
WITH CHECK (true);

-- Insert default rental services
INSERT INTO public.rental_services (name, slug, description, icon, base_price, price_unit, sort_order, features) VALUES
('Self Drive', 'self-drive', 'Drive yourself with complete freedom. Unlimited kilometers, doorstep delivery.', 'car', 999, 'per day', 1, '["Unlimited Kilometers", "Doorstep Delivery", "24/7 Support", "Insurance Included", "Zero Security Deposit"]'::jsonb),
('With Driver', 'with-driver', 'Professional chauffeur service for hassle-free travel. Local and outstation trips.', 'user', 1499, 'per day', 2, '["Professional Driver", "Fuel Included (Local)", "AC Vehicle", "Airport Pickup", "Corporate Billing"]'::jsonb),
('Outstation', 'outstation', 'Long distance travel with experienced drivers. Per km pricing with all-inclusive packages.', 'map-pin', 12, 'per km', 3, '["Per KM Billing", "Driver Allowance Included", "Toll & Parking Extra", "Multi-city Trips", "Weekend Packages"]'::jsonb);

-- Create updated_at trigger
CREATE TRIGGER update_rental_services_updated_at
BEFORE UPDATE ON public.rental_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_vehicles_updated_at
BEFORE UPDATE ON public.rental_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_bookings_updated_at
BEFORE UPDATE ON public.driver_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_partners_updated_at
BEFORE UPDATE ON public.api_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();