import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCars } from "@/hooks/useCars";
import { ArrowRight, TrendingUp, Flame } from "lucide-react";

const budgetRanges = [
  { label: "Under ₹8L", min: 0, max: 800000 },
  { label: "₹8-12L", min: 800000, max: 1200000 },
  { label: "₹12-20L", min: 1200000, max: 2000000 },
  { label: "₹20-35L", min: 2000000, max: 3500000 },
  { label: "₹35L+", min: 3500000, max: Infinity },
];

const bodyTypes = [
  { label: "SUV", value: "suv" },
  { label: "Sedan", value: "sedan" },
  { label: "Hatchback", value: "hatchback" },
  { label: "MUV", value: "muv" },
  { label: "EV", value: "ev" },
];

export const BrowseByBudget = () => {
  const [activeFilter, setActiveFilter] = useState<"budget" | "body">("budget");
  const [selectedBudget, setSelectedBudget] = useState(0);
  const [selectedBody, setSelectedBody] = useState(0);
  const { data: cars } = useCars({ isUpcoming: false });

  const trendingCars = cars?.filter(c => c.isHot || c.isNew)?.slice(0, 8) || [];

  return (
    <section className="py-8 md:py-14">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-heading text-xl md:text-3xl font-bold">
              Find Your Perfect Car
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">
              Browse by budget or body type
            </p>
          </div>
          <Link to="/cars">
            <Button variant="ghost" size="sm" className="text-foreground gap-1 text-xs md:text-sm">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Filter Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveFilter("budget")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              activeFilter === "budget"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            By Budget
          </button>
          <button
            onClick={() => setActiveFilter("body")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              activeFilter === "body"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            By Body Type
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
          {activeFilter === "budget"
            ? budgetRanges.map((range, i) => (
                <button
                  key={range.label}
                  onClick={() => setSelectedBudget(i)}
                  className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                    selectedBudget === i
                      ? "bg-primary/10 border-primary text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {range.label}
                </button>
              ))
            : bodyTypes.map((type, i) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedBody(i)}
                  className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
                    selectedBody === i
                      ? "bg-primary/10 border-primary text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {type.label}
                </button>
              ))}
        </div>

        {/* Trending Cars - Horizontal Scroll */}
        <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {trendingCars.map((car) => (
            <Link
              key={car.slug}
              to={`/cars/${car.slug}`}
              className="shrink-0 w-[140px] md:w-[200px] group"
            >
              <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-all">
                <div className="aspect-[4/3] bg-muted/30 relative overflow-hidden">
                  {car.image ? (
                    <img
                      src={car.image}
                      alt={`${car.brand} ${car.name}`}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                  )}
                  {car.isHot && (
                    <span className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      <Flame className="h-2.5 w-2.5" /> Hot
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-semibold text-xs md:text-sm truncate text-foreground">
                    {car.brand} {car.name}
                  </h3>
                  <p className="text-[11px] md:text-xs text-foreground font-medium mt-0.5 truncate">
                    {car.price || "Price on Request"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
