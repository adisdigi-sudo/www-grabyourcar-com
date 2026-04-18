export type PeriodKey = "1d" | "7d" | "30d" | "90d";

export const PERIOD_DAYS: Record<PeriodKey, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  "1d": "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export const sinceForPeriod = (period: PeriodKey) => {
  const d = new Date();
  d.setDate(d.getDate() - PERIOD_DAYS[period]);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const rate = (num: number, den: number) =>
  den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const formatNumber = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0));