
-- Step 1: Drop trigger FIRST so delete doesn't fire it
DROP TRIGGER IF EXISTS road_tax_changes_trigger ON road_tax_rules;

-- Step 2: Drop the FK constraint so history rows can exist without rules
ALTER TABLE road_tax_rule_history DROP CONSTRAINT IF EXISTS road_tax_rule_history_rule_id_fkey;

-- Step 3: Make rule_id nullable in history
ALTER TABLE road_tax_rule_history ALTER COLUMN rule_id DROP NOT NULL;
