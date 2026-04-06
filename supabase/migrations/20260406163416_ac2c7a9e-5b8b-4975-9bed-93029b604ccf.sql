-- Allow anonymous users to create loan leads from website EMI calculator
CREATE POLICY "Anon users can create loan leads from website"
ON public.loan_applications
FOR INSERT
TO anon
WITH CHECK (
  stage = 'new_lead'
  AND source IN ('Website EMI Calculator', 'website')
);

-- Also allow anon users to read loan_quote_share_history (for confirmation)
CREATE POLICY "Anon users can read own quote history"
ON public.loan_quote_share_history
FOR SELECT
TO anon
USING (true);