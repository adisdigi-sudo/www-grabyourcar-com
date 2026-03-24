-- Lock AI cofounder conversation history to the owner, while still allowing super admins to audit when needed.
DROP POLICY IF EXISTS "Users can manage own cofounder conversations" ON public.ai_cofounder_conversations;

CREATE POLICY "Users can view permitted cofounder conversations"
ON public.ai_cofounder_conversations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can insert own cofounder conversations"
ON public.ai_cofounder_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can update permitted cofounder conversations"
ON public.ai_cofounder_conversations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Users can delete permitted cofounder conversations"
ON public.ai_cofounder_conversations
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin')
);