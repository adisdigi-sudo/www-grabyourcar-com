-- Add email column to user_roles for easier identification
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON public.user_roles(email);

-- Update existing rows with emails from auth.users (will be done manually by admin)