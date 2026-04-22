import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon?: React.ElementType;
}

export const StatTile = ({ label, value, hint, trend = "neutral", trendLabel, icon: Icon }: StatTileProps) => {
  const trendColor =
    trend === "up" ? "text-emerald-700 bg-emerald-50" : trend === "down" ? "text-red-700 bg-red-50" : "text-slate-600 bg-slate-100";
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </div>
      <p className="text-2xl font-serif font-semibold text-slate-900 mt-2 tabular-nums">{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {trendLabel && (
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", trendColor)}>{trendLabel}</span>
        )}
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
  );
};
