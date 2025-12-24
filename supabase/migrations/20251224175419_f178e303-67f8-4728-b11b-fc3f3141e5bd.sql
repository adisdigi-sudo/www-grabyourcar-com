-- Add UPDATE policy for inquiries table so users can update their own inquiries
CREATE POLICY "Users can update their own inquiries" 
ON public.inquiries 
FOR UPDATE 
USING (auth.uid() = user_id);