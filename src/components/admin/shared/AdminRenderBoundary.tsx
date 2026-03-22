import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminRenderBoundaryProps {
  children: ReactNode;
  contextLabel?: string;
  fallback?: ReactNode;
}

interface AdminRenderBoundaryState {
  hasError: boolean;
}

export class AdminRenderBoundary extends Component<AdminRenderBoundaryProps, AdminRenderBoundaryState> {
  state: AdminRenderBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AdminRenderBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("[AdminRenderBoundary] Section failed", {
      contextLabel: this.props.contextLabel,
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Section failed to load</h2>
            <p className="text-sm text-muted-foreground">
              {this.props.contextLabel
                ? `${this.props.contextLabel} hit a temporary error.`
                : "This section hit a temporary error."}
            </p>
          </div>
          <Button onClick={this.handleReload} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload CRM
          </Button>
        </div>
      </div>
    );
  }
}