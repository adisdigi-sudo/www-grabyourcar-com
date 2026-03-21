import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isDynamicImportError, recoverFromChunkLoadError } from "@/lib/chunkLoadRecovery";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isDynamicImportError(error)) {
      const recovered = recoverFromChunkLoadError();

      console.warn("[AppErrorBoundary] Dynamic import error detected", {
        error,
        href: window.location.href,
        hostname: window.location.hostname,
        recovered,
      });

      if (recovered) {
        return;
      }
    }

    console.error("[AppErrorBoundary] Uncaught app error", {
      error,
      errorInfo,
      href: window.location.href,
      hostname: window.location.hostname,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Page failed to load</h1>
            <p className="text-sm text-muted-foreground">
              We hit a temporary loading issue. Refresh once to load the latest version.
            </p>
          </div>

          <Button onClick={this.handleReload} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh page
          </Button>
        </div>
      </div>
    );
  }
}