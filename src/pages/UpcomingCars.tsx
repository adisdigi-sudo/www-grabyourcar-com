import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { 
  Car, Calendar, IndianRupee, Sparkles, Clock, Zap, 
  RefreshCw, Filter, ChevronRight, Star, Fuel, Settings
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UpcomingCar {
  name: string;
  brand: string;
  expectedPrice: string;
  launchDate: string;
  segment: string;
  highlights: string[];
  imageDescription: string;
}

const segmentColors: Record<string, string> = {
  "SUV": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Sedan": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Hatchback": "bg-green-500/10 text-green-600 dark:text-green-400",
  "EV": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "MPV": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Luxury": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const segmentIcons: Record<string, React.ReactNode> = {
  "SUV": <Car className="h-4 w-4" />,
  "EV": <Zap className="h-4 w-4" />,
  "Sedan": <Car className="h-4 w-4" />,
  "Hatchback": <Car className="h-4 w-4" />,
  "MPV": <Car className="h-4 w-4" />,
  "Luxury": <Star className="h-4 w-4" />,
};

export default function UpcomingCars() {
  const [cars, setCars] = useState<UpcomingCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string>("All");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const segments = ["All", "SUV", "EV", "Sedan", "Hatchback", "MPV", "Luxury"];

  const fetchUpcomingCars = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('upcoming-cars');
      
      if (fnError) throw fnError;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setCars(data.cars || []);
      setGeneratedAt(data.generatedAt);
      toast.success("Latest upcoming cars loaded!");
    } catch (err) {
      console.error("Error fetching upcoming cars:", err);
      setError(err instanceof Error ? err.message : "Failed to load upcoming cars");
      toast.error("Failed to load upcoming cars. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingCars();
  }, []);

  const filteredCars = selectedSegment === "All" 
    ? cars 
    : cars.filter(car => car.segment === selectedSegment);

  const getPlaceholderImage = (brand: string, segment: string) => {
    const colors: Record<string, string> = {
      "Maruti": "4F46E5",
      "Hyundai": "0891B2",
      "Tata": "0F766E",
      "Mahindra": "DC2626",
      "Kia": "7C3AED",
      "Toyota": "EA580C",
      "MG": "BE185D",
      "Skoda": "059669",
      "Volkswagen": "1D4ED8",
      "BMW": "1E40AF",
      "Mercedes": "374151",
      "Audi": "1F2937",
    };
    const bgColor = colors[brand] || "6366F1";
    return `https://placehold.co/600x400/${bgColor}/FFFFFF?text=${encodeURIComponent(brand + " " + segment)}`;
  };

  return (
    <>
      <Helmet>
        <title>Upcoming Cars in India 2025-2026 | GrabYourCar</title>
        <meta name="description" content="Discover upcoming car launches in India. Get the latest updates on new car models, expected prices, and launch dates from top brands." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1.5">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI-Powered Updates
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                Upcoming Cars in India
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Stay ahead with AI-curated insights on the hottest car launches coming to India. 
                From budget hatchbacks to luxury SUVs — we've got you covered.
              </p>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button 
                  onClick={fetchUpcomingCars} 
                  disabled={loading}
                  size="lg"
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
                
                {generatedAt && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Updated: {new Date(generatedAt).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Filter Section */}
        <section className="py-6 border-y border-border/50 bg-muted/30 sticky top-16 z-40 backdrop-blur-sm">
          <div className="container">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <Filter className="h-5 w-5 text-muted-foreground shrink-0" />
              {segments.map((segment) => (
                <Button
                  key={segment}
                  variant={selectedSegment === segment ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSegment(segment)}
                  className="shrink-0 gap-1.5"
                >
                  {segmentIcons[segment]}
                  {segment}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Cars Grid */}
        <section className="py-12 md:py-16">
          <div className="container">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="bg-destructive/10 text-destructive rounded-xl p-6 max-w-md mx-auto">
                  <p className="font-medium mb-4">{error}</p>
                  <Button onClick={fetchUpcomingCars} variant="outline">
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-5 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedSegment}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredCars.map((car, index) => (
                    <motion.div
                      key={`${car.brand}-${car.name}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur">
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                          <img
                            src={getPlaceholderImage(car.brand, car.segment)}
                            alt={`${car.brand} ${car.name}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3">
                            <Badge className={`${segmentColors[car.segment] || segmentColors["SUV"]} backdrop-blur-sm`}>
                              {segmentIcons[car.segment]}
                              <span className="ml-1">{car.segment}</span>
                            </Badge>
                          </div>
                          <div className="absolute top-3 right-3">
                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                              <Calendar className="h-3 w-3 mr-1" />
                              {car.launchDate}
                            </Badge>
                          </div>
                        </div>

                        <CardContent className="p-5">
                          {/* Brand & Name */}
                          <div className="mb-3">
                            <p className="text-sm text-muted-foreground font-medium">{car.brand}</p>
                            <h3 className="text-xl font-heading font-bold text-foreground group-hover:text-primary transition-colors">
                              {car.name}
                            </h3>
                          </div>

                          {/* Price */}
                          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-primary/5">
                            <IndianRupee className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-lg">{car.expectedPrice}</span>
                            <span className="text-xs text-muted-foreground">(Expected)</span>
                          </div>

                          {/* Highlights */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Key Highlights
                            </p>
                            <ul className="space-y-1.5">
                              {car.highlights.slice(0, 3).map((highlight, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* CTA */}
                          <Button 
                            variant="outline" 
                            className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          >
                            Get Launch Alert
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}

            {!loading && filteredCars.length === 0 && !error && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No upcoming cars found in this segment.</p>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-16 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
                Never Miss a Launch
              </h2>
              <p className="text-muted-foreground mb-6">
                Subscribe to get instant alerts when your favorite cars are launched in India.
              </p>
              <div className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button>Subscribe</Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
