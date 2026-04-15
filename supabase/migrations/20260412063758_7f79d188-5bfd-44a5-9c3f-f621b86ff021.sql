
CREATE TABLE public.crm_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  vertical TEXT NOT NULL DEFAULT 'general',
  category TEXT NOT NULL DEFAULT 'general',
  label TEXT NOT NULL,
  body_text TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_msg_tpl_vertical ON public.crm_message_templates(vertical);
CREATE INDEX idx_crm_msg_tpl_category ON public.crm_message_templates(category);

ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON public.crm_message_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can insert templates"
  ON public.crm_message_templates FOR INSERT
  TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update templates"
  ON public.crm_message_templates FOR UPDATE
  TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete templates"
  ON public.crm_message_templates FOR DELETE
  TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_crm_message_templates_updated_at
  BEFORE UPDATE ON public.crm_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
