import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SelectionFilterToolbar
 * ───────────────────────
 * A reusable toolbar that appears whenever a user has selected items in any
 * list/table across the CRM. It offers two universal actions:
 *
 *  1. 👁  "Show only selected (N)" — narrows the visible list to the checked rows
 *  2. ✕  "Clear selection"          — wipes all checks and exits show-only mode
 *
 * Behaviour is current-page scoped: the parent component owns selection state
 * and decides what "selected" means for its list.
 *
 * USAGE
 * ──────
 * const [selected, setSelected] = useState<Set<string>>(new Set());
 * const [onlySelected, setOnlySelected] = useState(false);
 *
 * const visible = onlySelected
 *   ? items.filter(i => selected.has(i.id))
 *   : items;
 *
 * <SelectionFilterToolbar
 *   selectedCount={selected.size}
 *   totalCount={items.length}
 *   onlySelected={onlySelected}
 *   onToggleOnlySelected={() => setOnlySelected(v => !v)}
 *   onClearSelection={() => { setSelected(new Set()); setOnlySelected(false); }}
 * />
 */
export interface SelectionFilterToolbarProps {
  /** Number of currently selected items */
  selectedCount: number;
  /** Total items available (for context display) */
  totalCount?: number;
  /** Whether "show only selected" mode is active */
  onlySelected: boolean;
  /** Toggle handler for show-only-selected */
  onToggleOnlySelected: () => void;
  /** Wipe selection AND exit show-only mode */
  onClearSelection: () => void;
  /** Optional: hide the toolbar entirely when nothing is selected (default true) */
  hideWhenEmpty?: boolean;
  /** Optional: custom class for outer wrapper */
  className?: string;
  /** Optional: word for items, e.g. "leads", "policies", "contacts" (default "items") */
  itemNoun?: string;
}

export function SelectionFilterToolbar({
  selectedCount,
  totalCount,
  onlySelected,
  onToggleOnlySelected,
  onClearSelection,
  hideWhenEmpty = true,
  className,
  itemNoun = "items",
}: SelectionFilterToolbarProps) {
  if (hideWhenEmpty && selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 flex-wrap rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs",
        className
      )}
      role="toolbar"
      aria-label="Selection filter"
    >
      <Badge variant="default" className="gap-1">
        <CheckSquare className="h-3 w-3" />
        {selectedCount} selected
        {typeof totalCount === "number" && (
          <span className="opacity-70 ml-1">/ {totalCount}</span>
        )}
      </Badge>

      <Button
        size="sm"
        variant={onlySelected ? "default" : "outline"}
        className="h-7 gap-1.5 text-[11px]"
        onClick={onToggleOnlySelected}
        disabled={selectedCount === 0}
      >
        <Eye className="h-3.5 w-3.5" />
        {onlySelected ? `Showing only selected (${selectedCount})` : "Show only selected"}
      </Button>

      {onlySelected && (
        <span className="text-[10px] text-muted-foreground">
          Click again or "Clear" to see all {itemNoun}
        </span>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1.5 text-[11px] ml-auto text-destructive hover:text-destructive"
        onClick={onClearSelection}
        disabled={selectedCount === 0}
      >
        <X className="h-3.5 w-3.5" />
        Clear selection
      </Button>
    </div>
  );
}

export default SelectionFilterToolbar;
