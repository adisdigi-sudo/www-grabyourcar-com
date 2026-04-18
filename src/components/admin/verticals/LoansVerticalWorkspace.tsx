import { LoanWorkspace } from "../loans/LoanWorkspace";
import { VerticalReplyAgentsCard } from "../automation/VerticalReplyAgentsCard";

export function LoansVerticalWorkspace() {
  return (
    <div className="space-y-4">
      <VerticalReplyAgentsCard verticalSlug="loans" verticalLabel="Car Loans / Finance" />
      <LoanWorkspace initialView="pipeline" />
    </div>
  );
}
