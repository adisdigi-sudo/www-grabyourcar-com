-- Create admin activity log table for security auditing
CREATE TABLE public.admin_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Only admins can view activity logs"
ON public.admin_activity_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Service role can insert logs (for edge functions)
CREATE POLICY "Service role can insert logs"
ON public.admin_activity_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_admin_activity_logs_user ON public.admin_activity_logs(user_id);
CREATE INDEX idx_admin_activity_logs_action ON public.admin_activity_logs(action);
CREATE INDEX idx_admin_activity_logs_created ON public.admin_activity_logs(created_at DESC);