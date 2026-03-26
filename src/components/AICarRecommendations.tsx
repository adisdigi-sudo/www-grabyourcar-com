import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight, Fuel, Eye } from "lucide-react";
import { toast } from "sonner";
import { allCars, Car } from "@/data/cars";
import { motion } from "framer-motion";
import { motion } from "framer-motion";

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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-success/10 rounded-lg">
          <Sparkles className="h-4 w-4 text-success" />
        </div>
        <h3 className="font-bold text-base">AI Picks For You</h3>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <>
          {/* 2-column car cards */}
          <div className="grid grid-cols-2 gap-3">
            {recommendations.slice(0, 2).map((rec, index) => (
              <motion.div
                key={`${rec.name}-${cycleCount}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={rec.slug ? `/car/${rec.slug}` : "#"}>
                  <div className="rounded-xl border border-border/60 bg-card overflow-hidden hover:border-success/50 hover:shadow-md transition-all active:scale-[0.97] group h-full">
                    {/* Car Image */}
                    {rec.image ? (
                      <div className="relative h-28 bg-card overflow-hidden">
                        <img
                          src={rec.image}
                          alt={rec.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <Badge className="absolute top-1.5 left-1.5 bg-success text-success-foreground text-[8px] px-1 py-0 shadow-sm">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                          AI Pick
                        </Badge>
                      </div>
                    ) : (
                      <div className="h-28 bg-success/5 flex items-center justify-center">
                        <span className="text-3xl font-bold text-success/30">{rec.brand?.charAt(0)}</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-3 space-y-1.5">
                      <h4 className="font-bold text-xs leading-tight line-clamp-1">
                        {rec.brand} {rec.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground italic line-clamp-2 leading-tight">
                        💡 {rec.reason}
                      </p>

                      {/* Fuel badges */}
                      <div className="flex flex-wrap gap-1">
                        {rec.fuelTypes?.slice(0, 2).map((fuel) => (
                          <Badge key={fuel} variant="outline" className="text-[8px] px-1 py-0 gap-0.5">
                            <Fuel className="h-2.5 w-2.5" />
                            {fuel}
                          </Badge>
                        ))}
                      </div>

                      <p className="text-xs font-bold text-success">{rec.priceRange}</p>

                      {rec.slug && (
                        <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-success pt-1">
                          <Eye className="h-3 w-3" />
                          View Details
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Third recommendation as a compact strip */}
          {recommendations[2] && (
            <Link to={recommendations[2].slug ? `/car/${recommendations[2].slug}` : "#"}>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-success/50 transition-all group"
              >
                {recommendations[2].image ? (
                  <img
                    src={recommendations[2].image}
                    alt={recommendations[2].name}
                    className="h-12 w-16 object-cover rounded-lg shrink-0"
                  />
                ) : (
                  <div className="h-12 w-16 rounded-lg bg-success/10 flex items-center justify-center shrink-0 text-success font-bold">
                    {recommendations[2].brand?.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs truncate">{recommendations[2].brand} {recommendations[2].name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{recommendations[2].reason}</p>
                  <p className="text-xs font-bold text-success">{recommendations[2].priceRange}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-success shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </motion.div>
            </Link>
          )}

        </>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No recommendations available
        </div>
      )}
    </div>
  );
};
