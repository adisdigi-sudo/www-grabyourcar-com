-- Create sync_logs table to track scheduled syncs
CREATE TABLE public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'scheduled', 'manual', 'migration'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cars_processed INTEGER DEFAULT 0,
  cars_enhanced INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view sync logs (for admin dashboard)
CREATE POLICY "Anyone can view sync logs" 
ON public.sync_logs 
FOR SELECT 
USING (true);

-- Create index for efficient querying
CREATE INDEX idx_sync_logs_started_at ON public.sync_logs(started_at DESC);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions for cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;