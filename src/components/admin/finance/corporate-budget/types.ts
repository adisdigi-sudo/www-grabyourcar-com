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

export const DEPARTMENTS = [
  "All",
  "HR",
  "Operations",
  "Tech",
  "Finance",
  "Marketing",
  "Sales",
  "Customer Support",
  "Admin",
] as const;

export const PERIOD_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
] as const;

export const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "text-slate-700", bg: "bg-slate-100" },
  pending_approval: {
    label: "Pending Approval",
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  approved: { label: "Approved", color: "text-emerald-700", bg: "bg-emerald-100" },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-100" },
  active: { label: "Active", color: "text-blue-700", bg: "bg-blue-100" },
  closed: { label: "Closed", color: "text-slate-700", bg: "bg-slate-200" },
};

export const fmt = (n: number) =>
  `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export type BudgetLine = {
  id?: string;
  budget_id?: string;
  category_id?: string | null;
  category_name: string;
  vertical?: string | null;
  department?: string | null;
  planned_amount: number;
  actual_amount?: number;
  notes?: string | null;
};

export type CorporateBudget = {
  id: string;
  title: string;
  description?: string | null;
  period_type: string;
  period_start: string;
  period_end: string;
  total_planned: number;
  total_actual: number;
  status: string;
  submitted_by_name?: string | null;
  submitted_at?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  created_at: string;
};
