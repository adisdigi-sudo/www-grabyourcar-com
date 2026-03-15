
-- Allow anonymous inserts to hsrp_abandoned_carts (for tracking before auth)
CREATE POLICY "Allow anonymous insert to hsrp_abandoned_carts"
ON public.hsrp_abandoned_carts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous updates to hsrp_abandoned_carts by session_id
CREATE POLICY "Allow anonymous update to hsrp_abandoned_carts"
ON public.hsrp_abandoned_carts
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
