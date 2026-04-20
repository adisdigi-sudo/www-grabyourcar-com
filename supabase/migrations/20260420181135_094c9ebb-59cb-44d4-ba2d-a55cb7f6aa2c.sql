CREATE POLICY "Public can read own riya chat session"
ON public.riya_chat_sessions
FOR SELECT
TO public
USING (session_key = current_setting('request.headers', true)::json ->> 'x-riya-session-key');

CREATE POLICY "Public can read own riya chat messages"
ON public.riya_chat_messages
FOR SELECT
TO public
USING (
  session_id IN (
    SELECT id
    FROM public.riya_chat_sessions
    WHERE session_key = current_setting('request.headers', true)::json ->> 'x-riya-session-key'
  )
);