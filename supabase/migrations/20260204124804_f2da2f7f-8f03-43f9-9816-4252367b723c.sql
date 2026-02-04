-- Create call_bookings table for scheduling calls
CREATE TABLE public.call_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT DEFAULT 'floating_cta',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.call_bookings ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting (anyone can book a call)
CREATE POLICY "Anyone can create call bookings" 
ON public.call_bookings 
FOR INSERT 
WITH CHECK (true);

-- Create policy for admins to view all bookings
CREATE POLICY "Admins can view all call bookings" 
ON public.call_bookings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin', 'sales')
  )
);

-- Create policy for admins to update bookings
CREATE POLICY "Admins can update call bookings" 
ON public.call_bookings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'super_admin', 'sales')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_call_bookings_updated_at
BEFORE UPDATE ON public.call_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();