import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type DateFilterValue = "all" | "today" | "7days" | "30days" | "this_month" | "custom";

interface DateFilterBarProps {
  dateFilter: DateFilterValue;
  onDateFilterChange: (filter: DateFilterValue) => void;
  customRange: DateRange | undefined;
  onCustomRangeChange: (range: DateRange | undefined) => void;
  /** Use dark theme (white text) for embedded in colored headers */
  variant?: "default" | "dark";
  onClear?: () => void;
  showClear?: boolean;
}

const PRESETS: { value: DateFilterValue; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7days", label: "7D" },
  { value: "30days", label: "30D" },
  { value: "this_month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export function DateFilterBar({
  dateFilter,
  onDateFilterChange,
  customRange,
  onCustomRangeChange,
  variant = "default",
  onClear,
  showClear,
}: DateFilterBarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const isDark = variant === "dark";

  const activeClass = isDark
    ? "bg-white text-teal-800 shadow-sm"
    : "bg-primary text-primary-foreground";
  const inactiveClass = isDark
    ? "bg-white/10 text-white/80 hover:bg-white/20"
    : "bg-muted text-muted-foreground hover:bg-accent";

  const handlePreset = (value: DateFilterValue) => {
    onDateFilterChange(value);
    onCustomRangeChange(undefined);
  };

  const handleCustomSelect = (range: DateRange | undefined) => {
    onCustomRangeChange(range);
    if (range?.from && range?.to) {
      onDateFilterChange("custom");
      setPopoverOpen(false);
    }
  };

  const customLabel = customRange?.from && customRange?.to
    ? `${format(customRange.from, "dd MMM")} – ${format(customRange.to, "dd MMM")}`
    : "Custom";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <CalendarIcon className={cn("h-3.5 w-3.5", isDark ? "text-white/60" : "text-muted-foreground")} />
      {PRESETS.map(p => (
        <button
          key={p.value}
          onClick={() => handlePreset(p.value)}
          className={cn(
            "text-[11px] px-3 py-1 rounded-full font-medium transition-all",
            dateFilter === p.value ? activeClass : inactiveClass
          )}
        >
          {p.label}
        </button>
      ))}

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "text-[11px] px-3 py-1 rounded-full font-medium transition-all inline-flex items-center gap-1",
              dateFilter === "custom" ? activeClass : inactiveClass
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {customLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={handleCustomSelect}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {showClear && (
        <button
          onClick={onClear}
          className={cn(
            "ml-auto text-[11px] flex items-center gap-1 rounded-full px-2 py-1",
            isDark ? "text-white/70 hover:text-white bg-white/10" : "text-muted-foreground hover:text-foreground bg-muted"
          )}
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}
