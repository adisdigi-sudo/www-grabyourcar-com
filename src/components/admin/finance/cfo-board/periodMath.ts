// Period conversion utility for spend plans
// All amounts normalize through DAILY rate, then expand to all periods.

export type Period = "daily" | "weekly" | "monthly" | "quarterly" | "half_yearly" | "yearly";

const DAYS: Record<Period, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 91,
  half_yearly: 182,
  yearly: 365,
};

export const PERIOD_LABELS: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  yearly: "Yearly",
};

export function toDaily(amount: number, base: Period): number {
  return Number(amount || 0) / DAYS[base];
}

export function fromDaily(daily: number, target: Period): number {
  return daily * DAYS[target];
}

export function expandAll(amount: number, base: Period) {
  const daily = toDaily(amount, base);
  return {
    daily: fromDaily(daily, "daily"),
    weekly: fromDaily(daily, "weekly"),
    monthly: fromDaily(daily, "monthly"),
    quarterly: fromDaily(daily, "quarterly"),
    half_yearly: fromDaily(daily, "half_yearly"),
    yearly: fromDaily(daily, "yearly"),
  };
}

export const fmtINR = (n: number) =>
  `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export const VERTICALS = [
  "All",
  "Insurance",
  "Car Sales",
  "Car Loans",
  "HSRP",
  "Self Drive Rental",
  "Accessories",
  "General",
] as const;

export const DEFAULT_CATEGORIES = [
  "Marketing",
  "Salaries",
  "Rent",
  "Advertisement",
  "Utilities",
  "Software & Tools",
  "Travel",
  "Office Supplies",
  "Data Purchasing",
  "WhatsApp / Meta API",
  "Google Ads",
  "Meta Ads",
  "Other",
] as const;
