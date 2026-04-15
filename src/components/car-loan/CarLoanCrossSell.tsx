import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, ArrowRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface Props {
  maxBudget: number;
}

export const CarLoanCrossSell = ({ maxBudget }: Props) => {
  const { data: cars = [] } = useQuery({
    queryKey: ["cars-in-budget", maxBudget],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("id, name, brand, slug, price_range, price_numeric, body_type")
        .eq("is_discontinued", false)
        .lte("price_numeric", maxBudget)
        .gt("price_numeric", 0)
        .order("price_numeric", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    enabled: maxBudget > 0,
  });

  // Also get primary images
  const carIds = cars.map((c) => c.id);
  const { data: images = [] } = useQuery({
    queryKey: ["car-images-budget", carIds],
    queryFn: async () => {
      if (carIds.length === 0) return [];
      const { data, error } = await supabase
        .from("car_images")
        .select("car_id, url")
        .in("car_id", carIds)
        .eq("is_primary", true);
      if (error) throw error;
      return data;
    },
    enabled: carIds.length > 0,
  });

  const imageMap = new Map(images.map((img) => [img.car_id, img.url]));

  if (cars.length === 0) return null;

  return (
    <section className="py-16 md:py-20 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <Badge className="bg-primary/10 text-foreground border-primary/20 mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Cars Within Your Budget
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            Cars You Can Own Today
          </h2>
          <p className="text-muted-foreground">
            Based on your pre-approved loan of <span className="font-bold text-foreground">₹{maxBudget.toLocaleString("en-IN")}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          {cars.map((car, i) => (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link to={`/car/${car.slug}`}>
                <Card className="border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all overflow-hidden group cursor-pointer">
                  <div className="aspect-[16/10] bg-muted relative overflow-hidden">
                    {imageMap.get(car.id) ? (
                      <img
                        src={imageMap.get(car.id)}
                        alt={`${car.brand} ${car.name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{car.brand}</p>
                    <h3 className="font-bold text-foreground text-sm mt-0.5 line-clamp-1">{car.name}</h3>
                    <p className="text-foreground font-bold text-sm mt-1">{car.price_range || "Price on Request"}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button asChild variant="outline" size="lg">
            <Link to="/cars">
              Browse All Cars <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
