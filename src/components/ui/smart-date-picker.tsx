import * as React from "react";
import { format, setMonth, setYear, getMonth, getYear } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface SmartDatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  yearRange?: [number, number];
}

export function SmartDatePicker({
  date,
  onSelect,
  placeholder = "Pick a date",
  className,
  disabled,
  yearRange,
}: SmartDatePickerProps) {
  const currentYear = new Date().getFullYear();
  const [startYear, endYear] = yearRange || [currentYear - 5, currentYear + 5];
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const [viewDate, setViewDate] = React.useState<Date>(date || new Date());

  const handleMonthChange = (month: string) => {
    const newDate = setMonth(viewDate, parseInt(month));
    setViewDate(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = setYear(viewDate, parseInt(year));
    setViewDate(newDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full h-9 justify-start text-left text-xs font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          {date ? format(date, "dd MMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
          <Select
            value={getMonth(viewDate).toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={i.toString()} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={getYear(viewDate).toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-7 text-xs w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          month={viewDate}
          onMonthChange={setViewDate}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
