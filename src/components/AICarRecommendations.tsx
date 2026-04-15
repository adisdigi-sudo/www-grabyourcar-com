import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { allCars } from "@/data/cars";

interface Recommendation {
  name: string;
  brand: string;
  reason: string;
  priceRange: string;
}

interface AICarRecommendationsProps {
  carName: string;
  brand: string;
  price: string;
  fuelTypes?: string[];
  bodyType?: string;
  transmission?: string[];
}

export const AICarRecommendations = ({
  carName,
  brand,
  price,
  fuelTypes,
  bodyType,
  transmission,
}: AICarRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchRecommendations = async () => {
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
          body: JSON.stringify({
            carName,
            brand,
            price,
            fuelTypes,
            bodyType,
            transmission,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      toast.error("Could not load recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch on mount
    fetchRecommendations();
  }, [carName]);

  const findCarSlug = (recName: string, recBrand: string) => {
    const foundCar = allCars.find(
      (car) =>
        car.name.toLowerCase().includes(recName.toLowerCase()) ||
        recName.toLowerCase().includes(car.name.toLowerCase())
    );
    return foundCar?.slug;
  };

  if (!hasLoaded && !isLoading) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Recommendations
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecommendations}
            disabled={isLoading}
            className="text-primary hover:text-primary/80"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Similar cars you might like based on {carName}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-card rounded-lg border">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </>
        ) : recommendations.length > 0 ? (
          recommendations.map((rec, index) => {
            const slug = findCarSlug(rec.name, rec.brand);
            const content = (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {rec.name}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {rec.brand}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{rec.reason}</p>
                  <p className="text-sm font-medium text-primary">{rec.priceRange}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
              </div>
            );

            return slug ? (
              <Link key={index} to={`/car/${slug}`}>
                {content}
              </Link>
            ) : (
              content
            );
          })
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>No recommendations available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
