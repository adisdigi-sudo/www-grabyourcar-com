
-- Clear orphaned history records first
DELETE FROM road_tax_rule_history WHERE rule_id NOT IN (SELECT id FROM road_tax_rules);

-- Now restore the trigger
CREATE TRIGGER road_tax_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON road_tax_rules
FOR EACH ROW EXECUTE FUNCTION log_road_tax_changes();

-- Re-add FK constraint (nullable, cascade on delete)
ALTER TABLE road_tax_rule_history 
  ADD CONSTRAINT road_tax_rule_history_rule_id_fkey 
  FOREIGN KEY (rule_id) REFERENCES road_tax_rules(id) ON DELETE SET NULL;
