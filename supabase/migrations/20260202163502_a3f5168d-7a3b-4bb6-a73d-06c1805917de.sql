-- Create HSRP bookings table
CREATE TABLE public.hsrp_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Vehicle Details
  registration_number TEXT NOT NULL,
  chassis_number TEXT,
  engine_number TEXT,
  vehicle_class TEXT NOT NULL,
  state TEXT NOT NULL,
  
  -- Owner Details
  owner_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  pincode TEXT NOT NULL,
  
  -- Service Details
  service_type TEXT NOT NULL,
  service_price INTEGER NOT NULL,
  home_installation BOOLEAN DEFAULT false,
  home_installation_fee INTEGER DEFAULT 0,
  
  -- Payment Details
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  payment_amount INTEGER NOT NULL,
  
  -- Order Status
  order_status TEXT NOT NULL DEFAULT 'pending',
  order_id TEXT UNIQUE,
  tracking_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.hsrp_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own HSRP bookings" 
ON public.hsrp_bookings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own HSRP bookings" 
ON public.hsrp_bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own HSRP bookings" 
ON public.hsrp_bookings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_hsrp_bookings_updated_at
BEFORE UPDATE ON public.hsrp_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_hsrp_bookings_user_id ON public.hsrp_bookings(user_id);
CREATE INDEX idx_hsrp_bookings_order_status ON public.hsrp_bookings(order_status);
CREATE INDEX idx_hsrp_bookings_registration ON public.hsrp_bookings(registration_number);