import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, Star, TrendingUp } from "lucide-react";
import { useCars } from "@/hooks/useCars";

// Rivian-inspired horizontal car scroll section
export const CarShowcaseScroll = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: cars } = useCars({ isUpcoming: false });
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Smooth spring for x translation
  const rawX = useTransform(scrollYProgress, [0, 1], [300, -300]);
  const x = useSpring(rawX, { stiffness: 100, damping: 30, mass: 0.5 });

  // Featured cars (bestsellers & hot)
  const featuredCars = cars
    ?.filter(c => c.isHot || c.isNew)
    ?.slice(0, 6) || [];

  if (featuredCars.length === 0) return null;

  return (
    <section ref={containerRef} className="relative py-20 overflow-hidden bg-foreground">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-foreground via-foreground/95 to-foreground" />

      {/* Section header */}
      <div className="container mx-auto px-4 relative z-10 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 py-1.5 px-4">
            <Star className="h-3.5 w-3.5 mr-1.5" />
            Featured Collection
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-background mb-4 tracking-tight">
            Drive Your <span className="text-primary">Dream</span>
          </h2>
          <p className="text-background/60 text-lg max-w-2xl mx-auto">
            Explore India's most popular cars — no waiting, best prices, delivered to your doorstep
          </p>
        </motion.div>
      </div>

      {/* Horizontal scrolling car strip */}
      <motion.div
        style={{ x }}
        className="flex gap-8 px-[10vw] relative z-10"
      >
        {featuredCars.map((car, i) => (
          <Link
            key={car.slug}
            to={`/cars/${car.slug}`}
            className="shrink-0 group"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative w-[340px] md:w-[420px] aspect-[16/10] rounded-2xl overflow-hidden bg-background/5 border border-background/10 backdrop-blur-sm hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10"
            >
              {/* Car image */}
              <div className="absolute inset-0">
                {car.image ? (
                  <img 
                    src={car.image} 
                    alt={`${car.brand} ${car.name}`}
                    className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-background/20">
                    <TrendingUp className="h-16 w-16" />
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="absolute top-3 left-3 flex gap-1.5">
                {car.isHot && (
                  <Badge className="bg-destructive/90 text-destructive-foreground text-[10px] px-2">
                    🔥 Hot
                  </Badge>
                )}
                {car.isNew && (
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-2">
                    New
                  </Badge>
                )}
                {car.discount && (
                  <Badge className="bg-accent/90 text-accent-foreground text-[10px] px-2">
                    <Zap className="h-3 w-3 mr-0.5" /> {car.discount}
                  </Badge>
                )}
              </div>

              {/* Bottom info bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/90 via-foreground/60 to-transparent pt-12 pb-4 px-4">
                <h3 className="text-background font-bold text-lg leading-tight">
                  {car.brand} {car.name}
                </h3>
                <p className="text-primary font-semibold text-sm mt-0.5">
                  {car.price}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* CTA */}
      <div className="container mx-auto px-4 relative z-10 mt-12 text-center">
        <Button asChild size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link to="/cars">
            Explore All Cars
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
};

// Upcoming cars showcase
export const UpcomingCarsStrip = () => {
  const { data: cars } = useCars({ isUpcoming: true });
  
  const upcomingCars = cars?.slice(0, 8) || [];
  if (upcomingCars.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge variant="outline" className="mb-3 py-1.5 px-4 border-primary/30">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Coming Soon
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold">
            Upcoming Launches
          </h2>
          <p className="text-muted-foreground mt-2">Be the first to know about new car launches in India</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {upcomingCars.map((car, i) => (
            <motion.div
              key={car.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/cars/${car.slug}`}>
                <div className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <div className="aspect-[4/3] bg-muted/50 relative overflow-hidden">
                    {car.image ? (
                      <img 
                        src={car.image} 
                        alt={car.name} 
                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <TrendingUp className="h-10 w-10" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-primary/90 text-[10px]">
                      Upcoming
                    </Badge>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm truncate">{car.brand} {car.name}</h3>
                    <p className="text-xs text-primary font-medium mt-0.5">{car.price || 'Price TBA'}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/upcoming-cars">
              View All Upcoming Cars <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

// Quick offers banner strip
export const OffersStrip = () => {
  return (
    <section className="py-3 bg-primary overflow-hidden">
      <div className="flex animate-scroll-left whitespace-nowrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 px-4">
            <span className="text-primary-foreground font-semibold text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" /> No Waiting Period on Select Models
            </span>
            <span className="text-primary-foreground/70">•</span>
            <span className="text-primary-foreground font-semibold text-sm flex items-center gap-2">
              <Star className="h-4 w-4" /> Up to ₹2.5 Lakh Off on Premium Cars
            </span>
            <span className="text-primary-foreground/70">•</span>
            <span className="text-primary-foreground font-semibold text-sm flex items-center gap-2">
              🎉 Free Insurance on Select Models
            </span>
            <span className="text-primary-foreground/70">•</span>
          </div>
        ))}
      </div>
    </section>
  );
};
