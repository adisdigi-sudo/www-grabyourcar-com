-- Fix expiry dates: set to exactly start_date + 1 year - 1 day (standard insurance convention)
UPDATE insurance_policies 
SET expiry_date = (start_date::date + interval '1 year' - interval '1 day')::date
WHERE start_date IS NOT NULL 
AND expiry_date IS NOT NULL;