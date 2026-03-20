import { LoanWorkspace } from "./loans/LoanWorkspace";

type LoanDashboardView = "pipeline" | "disbursement" | "after_sales" | "bulk_tools";

interface LoanCRMDashboardProps {
  initialView?: LoanDashboardView;
}

export const LoanCRMDashboard = ({ initialView = "pipeline" }: LoanCRMDashboardProps) => {
  return <LoanWorkspace initialView={initialView} />;
};
