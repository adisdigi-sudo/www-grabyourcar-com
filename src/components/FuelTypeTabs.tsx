import { Badge } from "@/components/ui/badge";
import { Fuel, Zap, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface FuelTypeTabsProps {
  fuelTypes: string[];
  selected: string;
  onChange: (fuel: string) => void;
  showAll?: boolean;
  size?: "sm" | "md";
}

const fuelIcons: Record<string, typeof Fuel> = {
  Petrol: Fuel,
  Diesel: Flame,
  Electric: Zap,
  CNG: Fuel,
  Hybrid: Zap,
};

export const FuelTypeTabs = ({ fuelTypes, selected, onChange, showAll = true, size = "md" }: FuelTypeTabsProps) => {
  if (fuelTypes.length <= 1) return null;

  const allOptions = showAll ? ["All", ...fuelTypes] : fuelTypes;

  return (
    <div className="flex flex-wrap gap-1.5">
      {allOptions.map((fuel) => {
        const Icon = fuelIcons[fuel] || Fuel;
        const isActive = selected === fuel;
        return (
          <button
            key={fuel}
            onClick={() => onChange(fuel)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border font-medium transition-all",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/40 text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {fuel !== "All" && <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
            {fuel}
          </button>
        );
      })}
    </div>
  );
};

/** Extract unique fuel types from variants */
export const extractFuelTypes = (variants: { fuelType?: string | null; fuel_type?: string | null }[]): string[] => {
  const types = variants
    .map(v => v.fuelType || v.fuel_type || "")
    .filter(Boolean);
  return [...new Set(types)];
};
