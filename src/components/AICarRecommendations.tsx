import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight, RefreshCw, Fuel, Gauge, Eye } from "lucide-react";
import { toast } from "sonner";
import { allCars, Car } from "@/data/cars";
import { motion, AnimatePresence } from "framer-motion";

interface Recommendation {
  name: string;
  brand: string;
  reason: string;
  priceRange: string;
}

interface EnrichedRecommendation extends Recommendation {
  car?: Car;
  slug?: string;
  image?: string;
  fuelTypes?: string[];
  bodyType?: string;
  highlights?: string[];
}

interface AICarRecommendationsProps {
  carName: string;
  brand: string;
  price: string;
  fuelTypes?: string[];
  bodyType?: string;
  transmission?: string[];
}

const matchCarFromCatalog = (recName: string, recBrand: string): Car | undefined => {
  // Try exact match first
  let found = allCars.find(
    (car) =>
      car.name.toLowerCase() === recName.toLowerCase() &&
      car.brand.toLowerCase() === recBrand.toLowerCase()
  );
  if (found) return found;

  // Try partial match
  found = allCars.find(
    (car) =>
      (car.name.toLowerCase().includes(recName.toLowerCase()) ||
        recName.toLowerCase().includes(car.name.toLowerCase())) &&
      car.brand.toLowerCase() === recBrand.toLowerCase()
  );
  if (found) return found;

  // Fallback: name-only match
  return allCars.find(
    (car) =>
      car.name.toLowerCase().includes(recName.toLowerCase()) ||
      recName.toLowerCase().includes(car.name.toLowerCase())
  );
};

export const AICarRecommendations = ({
  carName,
  brand,
  price,
  fuelTypes,
  bodyType,
  transmission,
}: AICarRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<EnrichedRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/car-recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ carName, brand, price, fuelTypes, bodyType, transmission }),
        }
      );

      if (!response.ok) throw new Error("Failed to fetch recommendations");

      const data = await response.json();
      const rawRecs: Recommendation[] = data.recommendations || [];

      // Enrich with actual car catalog data
      const enriched: EnrichedRecommendation[] = rawRecs.map((rec) => {
        const car = matchCarFromCatalog(rec.name, rec.brand);
        return {
          ...rec,
          car,
          slug: car?.slug,
          image: car?.image || car?.gallery?.[0],
          fuelTypes: car?.fuelTypes,
          bodyType: car?.bodyType,
          highlights: car?.keyHighlights?.slice(0, 3),
        };
      });

      setRecommendations(enriched);
      setHasLoaded(true);
      setActiveIndex(0);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      toast.error("Could not load recommendations");
    } finally {
      setIsLoading(false);
    }
  }, [carName, brand, price, fuelTypes, bodyType, transmission]);

  useEffect(() => {
    fetchRecommendations();
  }, [carName]);

  // Auto-cycle featured card every 5s
  useEffect(() => {
    if (recommendations.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % recommendations.length);
      setCycleCount((c) => c + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [recommendations.length]);

  // Re-fetch with fresh AI thinking every 3 cycles
  useEffect(() => {
    if (cycleCount > 0 && cycleCount % 9 === 0) {
      fetchRecommendations();
    }
  }, [cycleCount]);

  if (!hasLoaded && !isLoading) return null;

  const featured = recommendations[activeIndex];

  return (
    <Card className="border-success/30 bg-gradient-to-br from-success/5 via-background to-success/5 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-success/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-success" />
            </div>
            AI Picks For You
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="text-success hover:text-success/80 hover:bg-success/10"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            New Ideas
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          🧠 AI is analyzing customer preferences for {carName} alternatives
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 flex-1 rounded-lg" />
              ))}
            </div>
          </div>
        ) : recommendations.length > 0 ? (
          <>
            {/* Featured Card - Auto-rotating */}
            <AnimatePresence mode="wait">
              {featured && (
                <motion.div
                  key={`${activeIndex}-${cycleCount}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Link to={featured.slug ? `/car/${featured.slug}` : "#"}>
                    <div className="relative rounded-xl overflow-hidden border border-success/20 bg-card hover:shadow-lg transition-all group">
                      {/* Car Image */}
                      {featured.image ? (
                        <div className="relative h-44 sm:h-52 bg-gradient-to-b from-muted/30 to-muted/60 overflow-hidden">
                          <img
                            src={featured.image}
                            alt={featured.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-success text-success-foreground text-[10px] shadow-sm">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Pick #{activeIndex + 1}
                            </Badge>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                            <h3 className="text-white font-bold text-lg leading-tight">
                              {featured.brand} {featured.name}
                            </h3>
                            <p className="text-white/80 text-sm font-medium">
                              {featured.priceRange}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-success/5">
                          <h3 className="font-bold text-lg">
                            {featured.brand} {featured.name}
                          </h3>
                          <p className="text-sm font-medium text-success">
                            {featured.priceRange}
                          </p>
                        </div>
                      )}

                      {/* AI Reason + Features */}
                      <div className="p-4 space-y-3">
                        <p className="text-sm text-muted-foreground italic">
                          💡 "{featured.reason}"
                        </p>

                        {/* Quick specs from catalog */}
                        <div className="flex flex-wrap gap-2">
                          {featured.fuelTypes?.map((fuel) => (
                            <Badge key={fuel} variant="outline" className="text-[10px] gap-1">
                              <Fuel className="h-3 w-3" />
                              {fuel}
                            </Badge>
                          ))}
                          {featured.bodyType && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Gauge className="h-3 w-3" />
                              {featured.bodyType}
                            </Badge>
                          )}
                        </div>

                        {/* Key highlights from catalog */}
                        {featured.highlights && featured.highlights.length > 0 && (
                          <div className="space-y-1">
                            {featured.highlights.map((h, i) => (
                              <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-success mt-0.5">✓</span>
                                {h}
                              </p>
                            ))}
                          </div>
                        )}

                        {featured.slug && (
                          <Button size="sm" className="w-full bg-success hover:bg-success/90 text-success-foreground gap-2 mt-1">
                            <Eye className="h-4 w-4" />
                            View {featured.name}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Thumbnail selector dots */}
            <div className="flex items-center justify-center gap-3">
              {recommendations.map((rec, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs font-medium ${
                    index === activeIndex
                      ? "border-success bg-success/10 text-success"
                      : "border-border bg-card text-muted-foreground hover:border-success/40"
                  }`}
                >
                  {rec.image ? (
                    <img
                      src={rec.image}
                      alt={rec.name}
                      className="h-8 w-12 object-contain rounded"
                    />
                  ) : (
                    <div className="h-8 w-12 bg-muted rounded flex items-center justify-center text-[9px]">
                      {rec.brand?.charAt(0)}
                    </div>
                  )}
                  <span className="hidden sm:inline truncate max-w-[80px]">{rec.name}</span>
                </button>
              ))}
            </div>

            {/* Behavior hint */}
            <p className="text-center text-[10px] text-muted-foreground/60">
              🔄 Suggestions refresh automatically based on browsing patterns
            </p>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>No recommendations available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
