
CREATE TABLE public.ai_cofounder_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  team_member_name TEXT,
  role TEXT DEFAULT 'employee',
  vertical TEXT,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date DATE DEFAULT CURRENT_DATE,
  source_table TEXT,
  source_id UUID,
  ai_suggestion TEXT,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_cofounder_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage cofounder tasks" ON public.ai_cofounder_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_cofounder_tasks_date ON public.ai_cofounder_tasks(due_date DESC);
CREATE INDEX idx_cofounder_tasks_user ON public.ai_cofounder_tasks(user_id);
CREATE INDEX idx_cofounder_tasks_status ON public.ai_cofounder_tasks(status);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_cofounder_tasks;
