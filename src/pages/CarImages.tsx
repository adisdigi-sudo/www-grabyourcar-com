import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Camera, Grid3X3, LayoutGrid, Eye, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useCars } from "@/hooks/useCars";
import { CarPagination } from "@/components/CarPagination";
import { WhatsAppCardButton } from "@/components/WhatsAppCTA";
const ITEMS_PER_PAGE = 12;

const CarImages = () => {
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

  // Reset to page 1 when filters change
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
              <Camera className="h-4 w-4" />
              Car Image Gallery
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Explore Car Images
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              Browse high-quality images of all car models — exterior, interior, and detailed shots
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

      {/* Car Image Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-foreground">
              {filteredCars.length} Cars Found
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-muted" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {paginatedCars.map((car) => (
                <Card key={car.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 flex flex-col">
                  <Link to={`/cars/${car.slug}`}>
                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                      <img
                        src={car.image || "/placeholder.svg"}
                        alt={car.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Badge variant="secondary" className="bg-white/90 text-foreground">
                          <Camera className="h-3 w-3 mr-1" />
                          View Gallery
                        </Badge>
                      </div>
                    </div>
                  </Link>
                  <CardContent className="p-3 flex-grow">
                    <p className="text-xs text-muted-foreground mb-1">{car.brand}</p>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-sm">
                      {car.name}
                    </h3>
                    <span className="text-sm text-primary font-medium">{car.price}</span>
                  </CardContent>
                  {/* Action Buttons - 3 CTAs */}
                  <CardFooter className="p-3 pt-0 flex flex-col gap-2">
                    <Link to={`/cars/${car.slug}`} className="w-full">
                      <Button variant="default" size="sm" className="w-full gap-1.5 text-xs h-8">
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Button>
                    </Link>
                    <div className="flex gap-2 w-full">
                      <WhatsAppCardButton carName={car.name} className="flex-1 h-8" />
                      <a href="tel:+919577200023" className="flex-1">
                        <Button variant="call" size="sm" className="w-full gap-1 text-xs h-8">
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </Button>
                      </a>
                    </div>
                  </CardFooter>
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
            <Camera className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
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

export default CarImages;
