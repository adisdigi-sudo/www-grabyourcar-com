import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, GitCompare, ChevronRight } from "lucide-react";
import { useCompareSafe } from "@/hooks/useCompare";
import { cn } from "@/lib/utils";

export const FloatingCompareBar = () => {
  const compareContext = useCompareSafe();

  // If context is not available, don't render
  if (!compareContext) return null;

  const { selectedCars, removeFromCompare, clearCompare } = compareContext;

  if (selectedCars.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl">
      <div className="bg-card border border-border shadow-2xl rounded-2xl p-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">
              Compare Cars ({selectedCars.length}/3)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCompare}
            className="text-muted-foreground text-xs"
          >
            Clear All
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Selected Cars */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1">
            {selectedCars.map((car) => (
              <div
                key={car.id}
                className="relative flex-shrink-0 bg-muted rounded-lg p-2 pr-8 flex items-center gap-2"
              >
                <img
                  src={car.image}
                  alt={car.name}
                  className="w-12 h-8 object-cover rounded"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate max-w-[100px]">
                    {car.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{car.price.split(" - ")[0]}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 right-0 h-6 w-6 hover:bg-destructive/10"
                  onClick={() => removeFromCompare(car.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: 3 - selectedCars.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex-shrink-0 w-[140px] h-[52px] border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center"
              >
                <span className="text-xs text-muted-foreground">Add car</span>
              </div>
            ))}
          </div>

          {/* Compare Button */}
          <Link to="/compare" state={{ preselectedCars: selectedCars.map(c => c.id) }}>
            <Button
              variant="cta"
              size="lg"
              disabled={selectedCars.length < 2}
              className={cn(
                "flex-shrink-0",
                selectedCars.length < 2 && "opacity-50 cursor-not-allowed"
              )}
            >
              Compare
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {selectedCars.length < 2 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Select at least 2 cars to compare
          </p>
        )}
      </div>
    </div>
  );
};
