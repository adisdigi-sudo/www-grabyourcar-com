import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonRow {
  feature: string;
  grabyourcar: "yes" | "no" | "partial";
  grabyourcarNote?: string;
  traditional: "yes" | "no" | "partial";
  traditionalNote?: string;
}

const comparisonData: ComparisonRow[] = [
  {
    feature: "Volume Discounts (Up to 15%)",
    grabyourcar: "yes",
    traditional: "partial",
    traditionalNote: "Limited to 3-5%",
  },
  {
    feature: "Dedicated Account Manager",
    grabyourcar: "yes",
    traditional: "no",
  },
  {
    feature: "Priority Vehicle Allocation",
    grabyourcar: "yes",
    traditional: "no",
  },
  {
    feature: "Multi-Brand Procurement",
    grabyourcar: "yes",
    grabyourcarNote: "All major brands",
    traditional: "no",
    traditionalNote: "Single brand only",
  },
  {
    feature: "Pan-India Delivery Coordination",
    grabyourcar: "yes",
    traditional: "partial",
    traditionalNote: "Limited coverage",
  },
  {
    feature: "Single Point of Contact",
    grabyourcar: "yes",
    traditional: "no",
    traditionalNote: "Multiple dealers",
  },
  {
    feature: "Complete Documentation Support",
    grabyourcar: "yes",
    traditional: "partial",
  },
  {
    feature: "Corporate Finance Assistance",
    grabyourcar: "yes",
    grabyourcarNote: "Multiple options",
    traditional: "partial",
    traditionalNote: "Limited options",
  },
  {
    feature: "Fleet Insurance Coordination",
    grabyourcar: "yes",
    traditional: "no",
  },
  {
    feature: "Post-Purchase Fleet Support",
    grabyourcar: "yes",
    traditional: "no",
  },
  {
    feature: "Transparent Pricing Comparison",
    grabyourcar: "yes",
    traditional: "no",
  },
  {
    feature: "Faster Procurement Cycle",
    grabyourcar: "yes",
    grabyourcarNote: "30-45 days saved",
    traditional: "no",
  },
];

const StatusIcon = ({ status }: { status: "yes" | "no" | "partial" }) => {
  if (status === "yes") {
    return (
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
        <Check className="h-4 w-4 text-foreground" />
      </div>
    );
  }
  if (status === "no") {
    return (
      <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
        <X className="h-4 w-4 text-destructive" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
      <Minus className="h-4 w-4 text-amber-500" />
    </div>
  );
};

export const CorporateComparison = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 md:mb-14">
          <span className="text-foreground text-sm font-semibold uppercase tracking-wider mb-2 block">
            The Grabyourcar Advantage
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Corporate Solutions Comparison
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See how Grabyourcar corporate solutions compare to traditional dealership procurement
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block max-w-4xl mx-auto">
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-3 bg-secondary/50">
              <div className="p-5 font-semibold text-foreground">
                Feature
              </div>
              <div className="p-5 text-center border-l border-border/50">
                <div className="font-bold text-foreground text-lg">Grabyourcar</div>
                <div className="text-xs text-muted-foreground">Corporate Solutions</div>
              </div>
              <div className="p-5 text-center border-l border-border/50">
                <div className="font-bold text-foreground text-lg">Traditional</div>
                <div className="text-xs text-muted-foreground">Dealership</div>
              </div>
            </div>

            {/* Rows */}
            {comparisonData.map((row, index) => (
              <div
                key={row.feature}
                className={cn(
                  "grid grid-cols-3",
                  index % 2 === 0 ? "bg-card" : "bg-secondary/20",
                  index !== comparisonData.length - 1 && "border-b border-border/30"
                )}
              >
                <div className="p-4 text-foreground font-medium text-sm">
                  {row.feature}
                </div>
                <div className="p-4 border-l border-border/30 flex flex-col items-center justify-center gap-1">
                  <StatusIcon status={row.grabyourcar} />
                  {row.grabyourcarNote && (
                    <span className="text-xs text-foreground font-medium">{row.grabyourcarNote}</span>
                  )}
                </div>
                <div className="p-4 border-l border-border/30 flex flex-col items-center justify-center gap-1">
                  <StatusIcon status={row.traditional} />
                  {row.traditionalNote && (
                    <span className="text-xs text-muted-foreground">{row.traditionalNote}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3 max-w-lg mx-auto">
          {comparisonData.map((row) => (
            <div
              key={row.feature}
              className="bg-card border border-border/50 rounded-xl p-4"
            >
              <div className="font-medium text-foreground text-sm mb-3">
                {row.feature}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
                  <StatusIcon status={row.grabyourcar} />
                  <div>
                    <div className="text-xs font-semibold text-foreground">Grabyourcar</div>
                    {row.grabyourcarNote && (
                      <div className="text-xs text-muted-foreground">{row.grabyourcarNote}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                  <StatusIcon status={row.traditional} />
                  <div>
                    <div className="text-xs font-semibold text-foreground">Traditional</div>
                    {row.traditionalNote && (
                      <div className="text-xs text-muted-foreground">{row.traditionalNote}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm">
          <div className="flex items-center gap-2">
            <StatusIcon status="yes" />
            <span className="text-muted-foreground">Full Support</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status="partial" />
            <span className="text-muted-foreground">Limited</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status="no" />
            <span className="text-muted-foreground">Not Available</span>
          </div>
        </div>
      </div>
    </section>
  );
};
