import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, X } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DashboardDateFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const DashboardDateFilter = ({ dateRange, onDateRangeChange }: DashboardDateFilterProps) => {
  const [localFrom, setLocalFrom] = useState(format(dateRange.from, "yyyy-MM-dd"));
  const [localTo, setLocalTo] = useState(format(dateRange.to, "yyyy-MM-dd"));

  const handleApply = () => {
    onDateRangeChange({
      from: new Date(localFrom),
      to: new Date(localTo),
    });
  };

  const handlePreset = (from: Date, to: Date) => {
    onDateRangeChange({ from, to });
    setLocalFrom(format(from, "yyyy-MM-dd"));
    setLocalTo(format(to, "yyyy-MM-dd"));
  };

  const handleReset = () => {
    const to = new Date();
    const from = subDays(to, 30);
    handlePreset(from, to);
  };

  const presets = [
    {
      label: "Today",
      value: () => {
        const today = new Date();
        return { from: today, to: today };
      },
    },
    {
      label: "Last 7 days",
      value: () => ({
        from: subDays(new Date(), 7),
        to: new Date(),
      }),
    },
    {
      label: "Last 30 days",
      value: () => ({
        from: subDays(new Date(), 30),
        to: new Date(),
      }),
    },
    {
      label: "Last 90 days",
      value: () => ({
        from: subDays(new Date(), 90),
        to: new Date(),
      }),
    },
    {
      label: "This month",
      value: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: "Last month",
      value: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      },
    },
    {
      label: "This year",
      value: () => ({
        from: startOfYear(new Date()),
        to: new Date(),
      }),
    },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <Calendar className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">
              {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
            </span>
            <span className="sm:hidden">
              {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-full sm:w-auto">
          <div className="space-y-4">
            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs sm:text-sm"
                  onClick={() => {
                    const { from, to } = preset.value();
                    handlePreset(from, to);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="from-date" className="text-xs">
                    From
                  </Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={localFrom}
                    onChange={(e) => setLocalFrom(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to-date" className="text-xs">
                    To
                  </Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={localTo}
                    onChange={(e) => setLocalTo(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleApply}
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={handleReset}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
