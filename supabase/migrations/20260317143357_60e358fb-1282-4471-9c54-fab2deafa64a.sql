-- Lead assignments table for person-level tracking
CREATE TABLE public.lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  assigned_to_user_id uuid NOT NULL,
  assigned_by_user_id uuid,
  assigned_at timestamptz DEFAULT now(),
  vertical_id uuid REFERENCES public.business_verticals(id),
  assignment_type text DEFAULT 'manual',
  status text DEFAULT 'active',
  notes text,
  CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE
);

CREATE INDEX idx_lead_assignments_lead ON public.lead_assignments(lead_id);
CREATE INDEX idx_lead_assignments_user ON public.lead_assignments(assigned_to_user_id, status);
CREATE INDEX idx_lead_assignments_vertical ON public.lead_assignments(vertical_id, status);

ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read assignments"
ON public.lead_assignments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage assignments"
ON public.lead_assignments FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update assignments"
ON public.lead_assignments FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

-- Round-robin auto-assignment function
CREATE OR REPLACE FUNCTION public.auto_assign_lead_round_robin(
  p_vertical_id uuid,
  p_lead_id uuid,
  p_assigned_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_member_user_id uuid;
  v_assignment_id uuid;
BEGIN
  SELECT uva.user_id INTO v_member_user_id
  FROM public.user_vertical_access uva
  JOIN public.team_members tm ON tm.user_id = uva.user_id AND tm.is_active = true
  WHERE uva.vertical_id = p_vertical_id
  ORDER BY (
    SELECT COUNT(*) FROM public.lead_assignments la
    WHERE la.assigned_to_user_id = uva.user_id
      AND la.status = 'active'
      AND la.vertical_id = p_vertical_id
  ) ASC, random()
  LIMIT 1;

  IF v_member_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.lead_assignments
  SET status = 'reassigned'
  WHERE lead_id = p_lead_id AND status = 'active';

  INSERT INTO public.lead_assignments (lead_id, assigned_to_user_id, assigned_by_user_id, vertical_id, assignment_type, status)
  VALUES (p_lead_id, v_member_user_id, p_assigned_by, p_vertical_id, 'auto_round_robin', 'active')
  RETURNING id INTO v_assignment_id;

  UPDATE public.leads SET assigned_to = v_member_user_id::text WHERE id = p_lead_id;

  RETURN v_assignment_id;
END;
$$;
