import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ComboBoxOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: ComboBoxOption[];
  placeholder?: string;
  emptyLabel?: string;
  allowCustom?: boolean;
  customLabel?: string;
  disabled?: boolean;
  showAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
}

/**
 * Searchable combo-box with built-in "+ Add custom value" support.
 * Falls back gracefully when option list is empty.
 */
export function ComboBoxWithCustom({
  value,
  onChange,
  options,
  placeholder = "Select…",
  emptyLabel = "No options",
  allowCustom = true,
  customLabel = "Add custom",
  disabled = false,
  showAllOption = true,
  allOptionLabel = "All",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");

  const normalized = useMemo(() => {
    const map = new Map<string, ComboBoxOption>();
    options.forEach((o) => {
      const key = (o.value || "").trim().toLowerCase();
      if (key && !map.has(key)) map.set(key, o);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [options]);

  const filtered = useMemo(() => {
    if (!query.trim()) return normalized;
    const q = query.toLowerCase();
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, query]);

  const selected = normalized.find((o) => o.value === value);
  const displayLabel =
    value && value !== "all"
      ? selected?.label || value
      : showAllOption
      ? allOptionLabel
      : placeholder;

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  const handleCustomSave = () => {
    const v = customVal.trim();
    if (!v) return;
    onChange(v);
    setCustomVal("");
    setCustomOpen(false);
    setOpen(false);
    setQuery("");
  };

  const showAddCustom =
    allowCustom &&
    query.trim() &&
    !filtered.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal h-10", className)}
        >
          <span className={cn("truncate text-left", !value || value === "all" ? "text-muted-foreground" : "")}>
            {displayLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search or type to add new…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {showAllOption && !query.trim() && (
              <button
                type="button"
                onClick={() => handleSelect("all")}
                className={cn(
                  "w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent",
                  value === "all" && "bg-accent"
                )}
              >
                <Check className={cn("h-3.5 w-3.5", value === "all" ? "opacity-100" : "opacity-0")} />
                <span className="font-medium text-muted-foreground">{allOptionLabel}</span>
              </button>
            )}
            {filtered.length === 0 && !showAddCustom && (
              <p className="text-xs text-muted-foreground text-center py-4">{emptyLabel}</p>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                className={cn(
                  "w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent",
                  value === o.value && "bg-accent"
                )}
              >
                <Check className={cn("h-3.5 w-3.5", value === o.value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{o.label}</span>
              </button>
            ))}
            {showAddCustom && (
              <button
                type="button"
                onClick={() => {
                  onChange(query.trim());
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-primary/10 border-t mt-1 pt-2 text-primary font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Add "<span className="truncate max-w-[180px]">{query.trim()}</span>"
              </button>
            )}
          </div>
        </ScrollArea>
        {allowCustom && (
          <div className="border-t p-2">
            {!customOpen ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setCustomOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> {customLabel}
              </Button>
            ) : (
              <div className="flex gap-1">
                <Input
                  autoFocus
                  placeholder="Type custom value…"
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomSave()}
                  className="h-8 text-xs"
                />
                <Button type="button" size="sm" className="h-8" onClick={handleCustomSave}>
                  Add
                </Button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
