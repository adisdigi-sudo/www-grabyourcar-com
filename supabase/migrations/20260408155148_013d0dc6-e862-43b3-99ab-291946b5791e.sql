ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS from_name text DEFAULT 'GrabYourCar',
ADD COLUMN IF NOT EXISTS from_email text DEFAULT 'noreply@grabyourcar.com';