import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LayoutTemplate, Search, Loader2, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WaTemplateOption {
  id: string;
  name: string;
  display_name: string | null;
  body: string;
  variables?: string[] | null;
  category?: string | null;
}

interface Props {
  onPick: (tpl: WaTemplateOption) => void | Promise<void>;
  /** When true the trigger is highlighted (e.g. window closed → template required). */
  highlight?: boolean;
  disabled?: boolean;
  /** Trigger size. */
  size?: "sm" | "icon" | "default";
  /** Show "Templates" label next to the icon. */
  withLabel?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
}

/**
 * Reusable popover button that lists APPROVED WhatsApp templates and
 * calls `onPick` when one is chosen. Auto-loads templates from `wa_templates`.
 *
 * Drop into any chat composer to give agents a one-tap "send template"
 * option even when the 24h free window is open.
 */
export function WaTemplatePickerButton({
  onPick,
  highlight = false,
  disabled = false,
  size = "icon",
  withLabel = false,
  className,
  align = "end",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<WaTemplateOption[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || templates.length > 0) return;
    setLoading(true);
    supabase
      .from("wa_templates")
      .select("id, name, display_name, body, variables, category")
      .eq("status", "approved")
      .order("display_name", { ascending: true })
      .then(({ data }) => {
        setTemplates((data || []) as WaTemplateOption[]);
        setLoading(false);
      });
  }, [open, templates.length]);

  const filtered = templates.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.display_name || "").toLowerCase().includes(q) ||
      (t.body || "").toLowerCase().includes(q) ||
      (t.category || "").toLowerCase().includes(q)
    );
  });

  function categoryBadge(cat?: string | null) {
    const c = (cat || "").toLowerCase();
    if (c.includes("util")) {
      return (
        <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30">
          <Wallet className="h-2.5 w-2.5" /> Utility
        </Badge>
      );
    }
    if (c.includes("market")) {
      return (
        <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30">
          <Sparkles className="h-2.5 w-2.5" /> Marketing
        </Badge>
      );
    }
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={highlight ? "outline" : "ghost"}
          size={withLabel ? "sm" : size}
          disabled={disabled}
          className={cn(
            withLabel ? "h-8 gap-1.5 text-xs" : "h-8 w-8 shrink-0",
            highlight && "border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30",
            className
          )}
          title="Send a template"
        >
          <LayoutTemplate className={withLabel ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} />
          {withLabel && <span>Template</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align={align}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold flex items-center gap-1">
            📋 Approved Templates
            {highlight && (
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] border-amber-300 text-amber-700">
                Required
              </Badge>
            )}
          </p>
          <span className="text-[10px] text-muted-foreground">{templates.length}</span>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="h-7 pl-7 text-xs"
          />
        </div>

        <div className="max-h-72 overflow-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">
              {templates.length === 0
                ? "No approved templates yet"
                : "No templates match your search"}
            </p>
          ) : (
            filtered.map((tpl) => (
              <button
                key={tpl.id}
                onClick={async () => {
                  setOpen(false);
                  await onPick(tpl);
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors group"
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-medium truncate">
                    {tpl.display_name || tpl.name}
                  </span>
                  {categoryBadge(tpl.category)}
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 group-hover:text-foreground/80">
                  {tpl.body}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
