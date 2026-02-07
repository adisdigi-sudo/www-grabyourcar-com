-- Fix: Set is_primary = true for cars that have images but no primary set
-- This picks the first image by sort_order for each car without a primary

WITH cars_without_primary AS (
  SELECT DISTINCT c.id as car_id
  FROM cars c
  JOIN car_images ci ON ci.car_id = c.id
  WHERE c.id NOT IN (
    SELECT DISTINCT car_id FROM car_images WHERE is_primary = true
  )
),
first_images AS (
  SELECT DISTINCT ON (ci.car_id) ci.id
  FROM car_images ci
  JOIN cars_without_primary cwp ON cwp.car_id = ci.car_id
  ORDER BY ci.car_id, ci.sort_order NULLS LAST, ci.created_at
)
UPDATE car_images 
SET is_primary = true
WHERE id IN (SELECT id FROM first_images);