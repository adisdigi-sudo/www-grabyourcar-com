import { Component, type ErrorInfo, type ReactNode, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoanWorkspace } from "./loans/LoanWorkspace";

type LoanDashboardView = "pipeline" | "disbursement" | "after_sales" | "bulk_tools" | "emi_calculator" | "performance";

interface LoanCRMDashboardProps {
  initialView?: LoanDashboardView;
}

interface LoanWorkspaceBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class LoanWorkspaceBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  LoanWorkspaceBoundaryState
> {
  state: LoanWorkspaceBoundaryState = { hasError: false, errorMessage: "" };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Loan workspace crashed unexpectedly.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[LoanCRMDashboard] Loan workspace crash", {
      error,
      componentStack: info.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
    this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[320px] items-center justify-center px-4 py-8">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">Loan CRM crashed</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              White page ke bajaye recovery panel dikhaya gaya hai. Retry karke workspace wapas load karein.
            </p>
            <p className="mt-3 break-words text-xs text-muted-foreground">
              {this.state.errorMessage}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={this.handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Loan CRM
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const LoanCRMDashboard = ({ initialView = "pipeline" }: LoanCRMDashboardProps) => {
  const [retryKey, setRetryKey] = useState(0);
  const workspace = useMemo(
    () => <LoanWorkspace key={`${initialView}-${retryKey}`} initialView={initialView} />,
    [initialView, retryKey],
  );

  return (
    <LoanWorkspaceBoundary onRetry={() => setRetryKey((current) => current + 1)}>
      {workspace}
    </LoanWorkspaceBoundary>
  );
};
