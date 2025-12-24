-- Add DELETE policy for inquiries table so users can delete their own inquiries
CREATE POLICY "Users can delete their own inquiries" 
ON public.inquiries 
FOR DELETE 
USING (auth.uid() = user_id);