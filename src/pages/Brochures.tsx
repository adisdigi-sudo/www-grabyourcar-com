import { useState, useMemo } from "react";
import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Download, ExternalLink, AlertCircle, Eye, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useCars } from "@/hooks/useCars";
import { useAllCarsForBrochures, CarWithBrochure } from "@/hooks/useBrochures";
import { CarPagination } from "@/components/CarPagination";
import { WhatsAppCardButton } from "@/components/WhatsAppCTA";
import { BrochureLeadGate } from "@/components/BrochureLeadGate";

const ITEMS_PER_PAGE = 12;

const Brochures = () => {
  const { data: staticCars = [] } = useCars();
  const { data: dbCars = [], isLoading: isLoadingDb } = useAllCarsForBrochures();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Merge database cars with static cars for display
  const carsWithBrochureInfo = useMemo(() => {
    // Create a map of database cars by slug for quick lookup
    const dbCarMap = new Map<string, CarWithBrochure>();
    dbCars.forEach((car) => {
      dbCarMap.set(car.slug, car);
    });

    // Merge static cars with database brochure info
    return staticCars.map((staticCar) => {
      const dbCar = dbCarMap.get(staticCar.slug);
      return {
        ...staticCar,
        brochureUrl: dbCar?.brochure_url || null,
        brochures: dbCar?.car_brochures || [],
        dbImage: dbCar?.car_images?.find((img) => img.is_primary)?.url || 
                 dbCar?.car_images?.[0]?.url || null,
      };
    });
  }, [staticCars, dbCars]);

  // Get unique brands
  const brands = useMemo(() => {
    return [...new Set(carsWithBrochureInfo.map((car) => car.brand))].sort();
  }, [carsWithBrochureInfo]);

  // Filter cars
  const filteredCars = useMemo(() => {
    return carsWithBrochureInfo.filter((car) => {
      const matchesSearch =
        car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBrand = !selectedBrand || car.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    });
  }, [carsWithBrochureInfo, searchQuery, selectedBrand]);

  // Pagination
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

  const handleDownload = (car: typeof paginatedCars[0]) => {
    // Priority: car_brochures table > brochure_url field > car detail page
    if (car.brochures && car.brochures.length > 0) {
      // Open the first brochure URL
      window.open(car.brochures[0].url, "_blank");
    } else if (car.brochureUrl) {
      window.open(car.brochureUrl, "_blank");
    } else {
      // Fallback to car detail page
      window.open(`/cars/${car.slug}`, "_blank");
    }
  };

  const hasBrochure = (car: typeof paginatedCars[0]) => {
    return (car.brochures && car.brochures.length > 0) || car.brochureUrl;
  };

  const isLoading = isLoadingDb;

  return (
    <>
      <GlobalSEO
        pageKey="brochures"
        title="Download Car Brochures | Specs, Features & Prices | GrabYourCar"
        description="Download official car brochures with complete specifications, features, colors, and pricing. Get all details before buying your new car."
        path="/brochures"
      />

      <div className="min-h-screen bg-background">
        <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <FileText className="h-4 w-4" />
              Car Brochures
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Download Car Brochures
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              Get official brochures with complete specifications, features, and pricing details
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

      {/* Brand Filter */}
      <section className="py-6 border-b border-border/50 bg-card/50">
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

      {/* Brochures Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-foreground">
              {filteredCars.length} Cars Available
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-24 h-20 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                        <div className="h-8 bg-muted rounded w-full mt-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCars.map((car) => (
                  <Card
                    key={car.id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 group"
                  >
                    <CardContent className="p-5">
                      <div className="flex gap-4">
                        {/* Car Thumbnail */}
                        <Link to={`/cars/${car.slug}`} className="flex-shrink-0">
                          <div className="w-24 h-20 rounded-lg overflow-hidden bg-muted">
                            <img
                              src={car.dbImage || car.image || "/placeholder.svg"}
                              alt={car.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        </Link>

                        {/* Brochure Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">{car.brand}</p>
                          <Link to={`/cars/${car.slug}`}>
                            <h3 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                              {car.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-primary font-medium mb-3">{car.price}</p>

                          {/* Action Buttons - 3 CTAs + Download */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Link to={`/cars/${car.slug}`}>
                              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                                <Eye className="h-3.5 w-3.5" />
                                Details
                              </Button>
                            </Link>
                            <WhatsAppCardButton carName={car.name} className="h-8" />
                            <a href="tel:+1155578093">
                              <Button variant="call" size="sm" className="gap-1 h-8">
                                <Phone className="h-3.5 w-3.5" />
                                Call
                              </Button>
                            </a>
                            {hasBrochure(car) ? (
                              <BrochureLeadGate
                                brochureUrl={car.brochures?.[0]?.url || car.brochureUrl || ""}
                                carName={`${car.brand} ${car.name}`}
                                carSlug={car.slug}
                              >
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="gap-1 h-8"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Brochure
                                </Button>
                              </BrochureLeadGate>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="gap-1 h-8"
                                disabled
                              >
                                <Download className="h-3.5 w-3.5" />
                                N/A
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Brochure Details */}
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {hasBrochure(car) ? (
                              <>
                                <FileText className="h-4 w-4 text-primary" />
                                <span className="text-foreground">Official Brochure</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Brochure not available</span>
                              </>
                            )}
                          </div>
                          {hasBrochure(car) && (
                            <Badge variant="secondary" className="text-xs">
                              PDF
                            </Badge>
                          )}
                        </div>
                        {hasBrochure(car) && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {car.brochures && car.brochures.length > 0
                              ? `${car.brochures.length} brochure${car.brochures.length > 1 ? "s" : ""} available`
                              : "Includes specifications, variants, colors & pricing"}
                          </p>
                        )}
                        {car.brochures && car.brochures.length > 1 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {car.brochures.slice(0, 3).map((brochure) => (
                              <Badge
                                key={brochure.id}
                                variant="outline"
                                className="text-xs cursor-pointer hover:bg-primary/10"
                                onClick={() => window.open(brochure.url, "_blank")}
                              >
                                {brochure.variant_name || brochure.title}
                              </Badge>
                            ))}
                            {car.brochures.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{car.brochures.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
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
              <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No brochures found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-12 bg-card/50 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Why Download Car Brochures?
            </h2>
            <p className="text-muted-foreground mb-8">
              Official car brochures provide the most accurate and detailed information about each model
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-background rounded-xl border border-border/50">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Complete Specs</h3>
                <p className="text-sm text-muted-foreground">
                  All technical specifications and dimensions in one document
                </p>
              </div>
              <div className="p-6 bg-background rounded-xl border border-border/50">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Offline Access</h3>
                <p className="text-sm text-muted-foreground">
                  Download and access brochures anytime, even offline
                </p>
              </div>
              <div className="p-6 bg-background rounded-xl border border-border/50">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Easy Sharing</h3>
                <p className="text-sm text-muted-foreground">
                  Share brochures with family and friends for comparison
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  );
};

export default Brochures;
