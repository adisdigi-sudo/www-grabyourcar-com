import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Settings2, Fuel, Gauge, Users, Eye, Zap, Shield, Cog, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useCars } from "@/hooks/useCars";
import { CarPagination } from "@/components/CarPagination";
import { WhatsAppCardButton } from "@/components/WhatsAppCTA";

const ITEMS_PER_PAGE = 10;

const featureCategories = [
  { id: "safety", label: "Safety", icon: Shield },
  { id: "comfort", label: "Comfort", icon: Users },
  { id: "performance", label: "Performance", icon: Zap },
  { id: "technology", label: "Technology", icon: Cog },
];

const FeaturesSpecs = () => {
  const { data: cars = [], isLoading } = useCars();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const brands = [...new Set(cars.map((car) => car.brand))].sort();

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      const matchesSearch =
        car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBrand = !selectedBrand || car.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    });
  }, [cars, searchQuery, selectedBrand]);

  const totalPages = Math.ceil(filteredCars.length / ITEMS_PER_PAGE);
  const paginatedCars = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCars.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCars, currentPage]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleBrandChange = (brand: string | null) => {
    setSelectedBrand(brand);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Settings2 className="h-4 w-4" />
              Features & Specifications
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Explore Car Features & Specs
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              Compare detailed specifications, safety features, and technology across all models
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search cars by name or brand..."
                value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-12 h-12 text-base rounded-full border-border/50 bg-card"
          />
        </div>
      </div>
    </div>
  </section>

  {/* Feature Categories */}
  <section className="py-8 border-b border-border/50 bg-card/50">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {featureCategories.map((category) => (
          <Card key={category.id} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <category.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{category.label}</p>
                <p className="text-xs text-muted-foreground">Features</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>

  {/* Brand Filter */}
  <section className="py-6 border-b border-border/50">
    <div className="container mx-auto px-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedBrand === null ? "default" : "outline"}
          size="sm"
          onClick={() => handleBrandChange(null)}
          className="rounded-full whitespace-nowrap"
        >
          All Brands
        </Button>
        {brands.map((brand) => (
          <Button
            key={brand}
            variant={selectedBrand === brand ? "default" : "outline"}
            size="sm"
            onClick={() => handleBrandChange(brand)}
            className="rounded-full whitespace-nowrap"
          >
            {brand}
          </Button>
        ))}
          </div>
        </div>
      </section>

      {/* Car Specs List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-foreground">
              {filteredCars.length} Cars with Detailed Specs
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      <div className="w-48 h-32 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-muted rounded w-1/3" />
                        <div className="h-4 bg-muted rounded w-1/4" />
                        <div className="grid grid-cols-4 gap-4 mt-4">
                          {[...Array(4)].map((_, j) => (
                            <div key={j} className="h-16 bg-muted rounded" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedCars.map((car) => (
                <Card key={car.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                      {/* Car Image */}
                      <Link to={`/cars/${car.slug}`} className="w-full md:w-48 flex-shrink-0">
                        <div className="aspect-[4/3] md:aspect-[3/2] rounded-lg overflow-hidden bg-muted">
                          <img
                            src={car.image || "/placeholder.svg"}
                            alt={car.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      </Link>

                      {/* Car Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{car.brand}</p>
                            <Link to={`/cars/${car.slug}`}>
                              <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-colors">
                                {car.name}
                              </h3>
                            </Link>
                            <p className="text-primary font-medium">{car.price}</p>
                          </div>
                          {/* Action Buttons - 3 CTAs */}
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/cars/${car.slug}`}>
                              <Button size="sm" className="gap-1.5">
                                <Eye className="h-4 w-4" />
                                View Details
                              </Button>
                            </Link>
                            <WhatsAppCardButton carName={car.name} className="h-9" />
                            <a href="tel:+919577200023">
                              <Button variant="call" size="sm" className="gap-1.5 h-9">
                                <Phone className="h-4 w-4" />
                                Call
                              </Button>
                            </a>
                          </div>
                        </div>

                        {/* Quick Specs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            <Fuel className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Fuel Type</p>
                              <p className="text-sm font-medium text-foreground">
                                {car.fuelTypes?.join(", ") || "Petrol"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            <Cog className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Transmission</p>
                              <p className="text-sm font-medium text-foreground">
                                {car.transmission?.join(", ") || "Manual/Auto"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            <Gauge className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Body Type</p>
                              <p className="text-sm font-medium text-foreground">
                                {car.bodyType || "SUV"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            <Users className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Availability</p>
                              <p className="text-sm font-medium text-foreground">
                                {car.availability || "In Stock"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Feature Badges */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {car.keyHighlights?.slice(0, 4).map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          )) || (
                            <>
                              <Badge variant="secondary" className="text-xs">ABS</Badge>
                              <Badge variant="secondary" className="text-xs">Airbags</Badge>
                              <Badge variant="secondary" className="text-xs">Touchscreen</Badge>
                              <Badge variant="secondary" className="text-xs">Rear Camera</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>

          <CarPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="mt-10"
          />
        </>
      )}

          {!isLoading && filteredCars.length === 0 && (
            <div className="text-center py-16">
              <Settings2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No cars found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturesSpecs;
