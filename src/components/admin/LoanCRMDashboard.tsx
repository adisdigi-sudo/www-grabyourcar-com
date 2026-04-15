import { LoanWorkspace } from "./loans/LoanWorkspace";

type LoanDashboardView = "pipeline" | "disbursement" | "after_sales" | "bulk_tools" | "emi_calculator";

interface LoanCRMDashboardProps {
  initialView?: LoanDashboardView;
}

export const LoanCRMDashboard = ({ initialView = "pipeline" }: LoanCRMDashboardProps) => {
  return <LoanWorkspace initialView={initialView} />;
};
