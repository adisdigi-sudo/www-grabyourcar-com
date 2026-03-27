
-- Clear the foreign key references first, then clean duplicates
UPDATE insurance_policies SET previous_policy_id = NULL WHERE previous_policy_id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, policy_number, status ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) as rn
    FROM insurance_policies
    WHERE policy_number IS NOT NULL
  ) sub WHERE rn > 1
);

DELETE FROM insurance_policies WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id, policy_number, status ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) as rn
    FROM insurance_policies
    WHERE policy_number IS NOT NULL
  ) sub WHERE rn > 1
);

-- Create a partial unique index to prevent duplicate active policies for same client+policy_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_policy_per_client
ON insurance_policies (client_id, policy_number)
WHERE status = 'active' AND policy_number IS NOT NULL;
