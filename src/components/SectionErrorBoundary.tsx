import { Component, ErrorInfo, ReactNode } from "react";

interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
  fallback?: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[SectionErrorBoundary] Section render failed", {
      section: this.props.sectionName,
      error,
      errorInfo,
      href: typeof window !== "undefined" ? window.location.href : "",
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    return (
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-sm">
            <p className="text-sm font-medium text-foreground">This section is temporarily unavailable.</p>
            <p className="mt-1 text-sm text-muted-foreground">We kept the rest of the page available while this block reloads.</p>
          </div>
        </div>
      </section>
    );
  }
}