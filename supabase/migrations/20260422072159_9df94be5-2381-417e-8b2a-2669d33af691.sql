
-- 1. Extend team_targets with period_type / period_key (keep existing month_year for backwards compat)
ALTER TABLE public.team_targets
  ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'month',
  ADD COLUMN IF NOT EXISTS period_key text;

UPDATE public.team_targets SET period_key = month_year WHERE period_key IS NULL;

ALTER TABLE public.team_targets
  ALTER COLUMN period_key SET NOT NULL;

ALTER TABLE public.team_targets
  DROP CONSTRAINT IF EXISTS team_targets_user_id_vertical_name_month_year_key;

CREATE UNIQUE INDEX IF NOT EXISTS team_targets_unique_period
  ON public.team_targets (user_id, vertical_name, period_type, period_key);

-- 2. Approvals queue: allow marketing_tech + under_review
ALTER TABLE public.approvals_queue
  DROP CONSTRAINT IF EXISTS approvals_queue_request_type_check;
ALTER TABLE public.approvals_queue
  ADD CONSTRAINT approvals_queue_request_type_check
  CHECK (request_type = ANY (ARRAY[
    'discount','cancellation','refund','manual_override',
    'policy_change','marketing_tech','other'
  ]));

ALTER TABLE public.approvals_queue
  DROP CONSTRAINT IF EXISTS approvals_queue_status_check;
ALTER TABLE public.approvals_queue
  ADD CONSTRAINT approvals_queue_status_check
  CHECK (status = ANY (ARRAY[
    'pending','under_review','approved','rejected','expired','cancelled'
  ]));

-- 3. approval_comments (status history + threaded comments)
CREATE TABLE IF NOT EXISTS public.approval_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid NOT NULL REFERENCES public.approvals_queue(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text,
  comment text,
  status_change text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_approval_comments_approval ON public.approval_comments(approval_id, created_at DESC);

ALTER TABLE public.approval_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage approval_comments"
  ON public.approval_comments
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Requesters view their approval comments"
  ON public.approval_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.approvals_queue aq
      WHERE aq.id = approval_comments.approval_id
        AND aq.requested_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users add comments to approvals they own or admin"
  ON public.approval_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.approvals_queue aq
      WHERE aq.id = approval_comments.approval_id
        AND aq.requested_by = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_comments;

-- 4. marketing_alerts: extend types + notify_roles + severity
ALTER TABLE public.marketing_alerts
  DROP CONSTRAINT IF EXISTS marketing_alerts_alert_type_check;
ALTER TABLE public.marketing_alerts
  ADD CONSTRAINT marketing_alerts_alert_type_check
  CHECK (alert_type = ANY (ARRAY[
    'hot_lead','high_intent','conversion','campaign_goal',
    'spend_spike','low_roi','target_miss','kpi_threshold','custom'
  ]));

ALTER TABLE public.marketing_alerts
  ADD COLUMN IF NOT EXISTS notify_roles jsonb DEFAULT '["super_admin"]'::jsonb,
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz,
  ADD COLUMN IF NOT EXISTS trigger_count integer DEFAULT 0;

-- 5. kpi_alert_events (live feed of triggered alerts)
CREATE TABLE IF NOT EXISTS public.kpi_alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES public.marketing_alerts(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  message text,
  metric_value numeric,
  threshold_value numeric,
  vertical_name text,
  notify_roles jsonb DEFAULT '["super_admin"]'::jsonb,
  context jsonb DEFAULT '{}'::jsonb,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kpi_alert_events_created ON public.kpi_alert_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_alert_events_ack ON public.kpi_alert_events(acknowledged, created_at DESC);

ALTER TABLE public.kpi_alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view kpi_alert_events"
  ON public.kpi_alert_events
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage kpi_alert_events"
  ON public.kpi_alert_events
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.kpi_alert_events;
