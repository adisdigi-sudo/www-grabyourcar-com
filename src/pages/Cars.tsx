import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { CarsListStructuredData } from "@/components/seo/CarsListStructuredData";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Heart,
  Fuel,
  Settings2,
  Car,
  ChevronRight,
  Grid3X3,
  List,
  ArrowUpDown,
  Sparkles,
  Flame,
  Clock,
  Tag,
  GitCompare,
  Check,
  FileText,
  Phone,
  Eye,
  MessageCircle,
} from "lucide-react";
import { WhatsAppCardButton } from "@/components/WhatsAppCTA";
import { 
  useVehicleAttributes, 
  formatFuelTypesForFilter, 
  formatTransmissionsForFilter,
  formatPriceRangesForFilter 
} from "@/hooks/useVehicleAttributes";
import { useCars } from "@/hooks/useCars";
import { useBrands } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/hooks/useCompare";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const Cars = () => {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const { isInCompare, addToCompare, removeFromCompare, canAddMore } = useCompare();
  
  // Fetch cars from database
  const { data: allCars = [], isLoading: carsLoading } = useCars({ useDatabase: true });
  
  // Fetch brands from database
  const { data: dbBrands = [] } = useBrands();
  
  // Fetch vehicle attributes from database
  const { data: vehicleAttributes } = useVehicleAttributes();
  
  // Format attributes for filters (with fallbacks)
  const fuelTypes = vehicleAttributes ? formatFuelTypesForFilter(vehicleAttributes.fuelTypes) : ["All", "Petrol", "Diesel", "Electric", "Hybrid", "CNG"];
  const transmissionTypes = vehicleAttributes ? formatTransmissionsForFilter(vehicleAttributes.transmissions) : ["All", "Manual", "Automatic", "AMT", "CVT", "DCT"];
  const priceRanges = vehicleAttributes ? formatPriceRangesForFilter(vehicleAttributes.priceRanges) : [
    { label: "All", min: 0, max: Infinity },
    { label: "Under ₹5 Lakh", min: 0, max: 500000 },
    { label: "₹5-10 Lakh", min: 500000, max: 1000000 },
    { label: "₹10-15 Lakh", min: 1000000, max: 1500000 },
    { label: "₹15-20 Lakh", min: 1500000, max: 2000000 },
  ];
  
  const handleCompareToggle = (carId: number) => {
    if (isInCompare(carId)) {
      removeFromCompare(carId);
    } else {
      addToCompare(carId);
    }
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([]);
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000000]);
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter cars based on all criteria
  const filteredCars = useMemo(() => {
    let result = allCars.filter((car) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !car.name.toLowerCase().includes(query) &&
          !car.brand.toLowerCase().includes(query) &&
          !car.bodyType.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Brand filter
      if (selectedBrands.length > 0 && !selectedBrands.includes(car.brand)) {
        return false;
      }

      // Body type filter
      if (selectedBodyTypes.length > 0 && !selectedBodyTypes.includes(car.bodyType)) {
        return false;
      }

      // Fuel type filter
      if (selectedFuelTypes.length > 0) {
        const hasMatchingFuel = car.fuelTypes.some((fuel) =>
          selectedFuelTypes.includes(fuel)
        );
        if (!hasMatchingFuel) return false;
      }

      // Transmission filter
      if (selectedTransmissions.length > 0) {
        const hasMatchingTransmission = car.transmission.some((trans) =>
          selectedTransmissions.includes(trans)
        );
        if (!hasMatchingTransmission) return false;
      }

      // Price range filter
      if (car.priceNumeric < priceRange[0] || car.priceNumeric > priceRange[1]) {
        return false;
      }

      // New cars filter
      if (showOnlyNew && !car.isNew) {
        return false;
      }

      // Upcoming cars filter
      if (showOnlyUpcoming && !car.isUpcoming) {
        return false;
      }

      return true;
    });

    // Sort
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.priceNumeric - b.priceNumeric);
        break;
      case "price-high":
        result.sort((a, b) => b.priceNumeric - a.priceNumeric);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      default:
        // Relevance - hot cars first, then new, then rest
        result.sort((a, b) => {
          if (a.isHot && !b.isHot) return -1;
          if (!a.isHot && b.isHot) return 1;
          if (a.isNew && !b.isNew) return -1;
          if (!a.isNew && b.isNew) return 1;
          return 0;
        });
    }

    return result;
  }, [
    allCars,
    searchQuery,
    selectedBrands,
    selectedBodyTypes,
    selectedFuelTypes,
    selectedTransmissions,
    priceRange,
    sortBy,
    showOnlyNew,
    showOnlyUpcoming,
  ]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedBrands([]);
    setSelectedBodyTypes([]);
    setSelectedFuelTypes([]);
    setSelectedTransmissions([]);
    setPriceRange([0, 20000000]);
    setShowOnlyNew(false);
    setShowOnlyUpcoming(false);
  };

  const activeFiltersCount =
    selectedBrands.length +
    selectedBodyTypes.length +
    selectedFuelTypes.length +
    selectedTransmissions.length +
    (priceRange[0] > 0 || priceRange[1] < 20000000 ? 1 : 0) +
    (showOnlyNew ? 1 : 0) +
    (showOnlyUpcoming ? 1 : 0);

  const formatPrice = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(0)} L`;
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const toggleBodyType = (type: string) => {
    setSelectedBodyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleFuelType = (type: string) => {
    setSelectedFuelTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleTransmission = (type: string) => {
    setSelectedTransmissions((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Get brands - prefer database brands, fall back to car data brands
  const availableBrands = useMemo(() => {
    if (dbBrands.length > 0) {
      return dbBrands.map(b => b.name);
    }
    // Fallback: derive from car data
    const brandSet = new Set(allCars.map((car) => car.brand));
    return Array.from(brandSet).sort();
  }, [dbBrands, allCars]);

  // Get unique body types from car data
  const availableBodyTypes = useMemo(() => {
    const typeSet = new Set(allCars.map((car) => car.bodyType));
    return Array.from(typeSet).sort();
  }, [allCars]);

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Quick Filters */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Quick Filters</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={showOnlyNew ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyNew(!showOnlyNew)}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            New Launch
          </Button>
          <Button
            variant={showOnlyUpcoming ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyUpcoming(!showOnlyUpcoming)}
            className="gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            Upcoming
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["brands", "bodyType", "fuelType"]} className="w-full">
        {/* Brands */}
        <AccordionItem value="brands">
          <AccordionTrigger className="text-sm font-semibold">
            Brands {selectedBrands.length > 0 && `(${selectedBrands.length})`}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {availableBrands.map((brand) => (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand}`}
                    checked={selectedBrands.includes(brand)}
                    onCheckedChange={() => toggleBrand(brand)}
                  />
                  <Label
                    htmlFor={`brand-${brand}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {brand}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    ({allCars.filter((c) => c.brand === brand).length})
                  </span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Body Type */}
        <AccordionItem value="bodyType">
          <AccordionTrigger className="text-sm font-semibold">
            Body Type {selectedBodyTypes.length > 0 && `(${selectedBodyTypes.length})`}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {availableBodyTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`body-${type}`}
                    checked={selectedBodyTypes.includes(type)}
                    onCheckedChange={() => toggleBodyType(type)}
                  />
                  <Label
                    htmlFor={`body-${type}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {type}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    ({allCars.filter((c) => c.bodyType === type).length})
                  </span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Fuel Type */}
        <AccordionItem value="fuelType">
          <AccordionTrigger className="text-sm font-semibold">
            Fuel Type {selectedFuelTypes.length > 0 && `(${selectedFuelTypes.length})`}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {fuelTypes.filter((f) => f !== "All").map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`fuel-${type}`}
                    checked={selectedFuelTypes.includes(type)}
                    onCheckedChange={() => toggleFuelType(type)}
                  />
                  <Label
                    htmlFor={`fuel-${type}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Transmission */}
        <AccordionItem value="transmission">
          <AccordionTrigger className="text-sm font-semibold">
            Transmission {selectedTransmissions.length > 0 && `(${selectedTransmissions.length})`}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {transmissionTypes.filter((t) => t !== "All").map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`trans-${type}`}
                    checked={selectedTransmissions.includes(type)}
                    onCheckedChange={() => toggleTransmission(type)}
                  />
                  <Label
                    htmlFor={`trans-${type}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-semibold">
            Price Range
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{formatPrice(priceRange[0])}</span>
                <span className="font-medium">{formatPrice(priceRange[1])}</span>
              </div>
              <Slider
                value={priceRange}
                min={0}
                max={20000000}
                step={100000}
                onValueChange={(value) => setPriceRange(value as [number, number])}
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-2">
                {priceRanges.slice(1, 5).map((range) => (
                  <Button
                    key={range.label}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setPriceRange([range.min, range.max === Infinity ? 20000000 : range.max])}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {activeFiltersCount > 0 && (
        <Button variant="outline" className="w-full" onClick={clearAllFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear All Filters ({activeFiltersCount})
        </Button>
      )}
    </div>
  );

  return (
    <HelmetProvider>
      <Helmet>
        <title>New Cars in India 2024 - All Brands & Models | GrabYourCar</title>
        <meta
          name="description"
          content="Explore 76+ new cars from 10+ brands in India. Filter by brand, body type, fuel type, transmission & price. Find your perfect car today!"
        />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grabyourcar.lovable.app/cars" />
        <meta property="og:title" content="New Cars in India 2024 - All Brands & Models | GrabYourCar" />
        <meta property="og:description" content="Explore 76+ new cars from 10+ brands in India. Filter by brand, body type, fuel type, transmission & price." />
        <meta property="og:image" content="https://grabyourcar.lovable.app/og-image.png" />
        <meta property="og:site_name" content="GrabYourCar" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://grabyourcar.lovable.app/cars" />
        <meta name="twitter:title" content="New Cars in India 2024 - All Brands & Models" />
        <meta name="twitter:description" content="Explore 76+ new cars from 10+ brands in India. Find your perfect car today!" />
        <meta name="twitter:image" content="https://grabyourcar.lovable.app/og-image.png" />
      </Helmet>
      
      <CarsListStructuredData cars={filteredCars} totalCount={allCars.length} />

      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-8 md:py-12 border-b">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Explore <span className="text-primary">{allCars.length}+</span> New Cars
              </h1>
              <p className="text-muted-foreground text-lg mb-6">
                Find your dream car from {availableBrands.length} brands with detailed specifications, prices & reviews
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by car name, brand or body type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 h-12 text-base rounded-full border-2 focus-visible:ring-primary"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-24 bg-card rounded-xl border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </h2>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary">{activeFiltersCount}</Badge>
                  )}
                </div>
                <FilterSidebar />
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-6">
                <div className="flex items-center gap-3">
                  {/* Mobile Filter Button */}
                  <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="lg:hidden gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFiltersCount > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {activeFiltersCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                          <SlidersHorizontal className="h-4 w-4" />
                          Filters
                        </SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        <FilterSidebar />
                      </div>
                    </SheetContent>
                  </Sheet>

                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{filteredCars.length}</span> cars
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] bg-card">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="name-asc">Name: A to Z</SelectItem>
                      <SelectItem value="name-desc">Name: Z to A</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Toggle */}
                  <div className="hidden sm:flex items-center border rounded-lg overflow-hidden">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="icon"
                      className="rounded-none h-9 w-9"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="icon"
                      className="rounded-none h-9 w-9"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active Filters Tags */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedBrands.map((brand) => (
                    <Badge key={brand} variant="secondary" className="gap-1 pr-1">
                      {brand}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive/20"
                        onClick={() => toggleBrand(brand)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {selectedBodyTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="gap-1 pr-1">
                      {type}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive/20"
                        onClick={() => toggleBodyType(type)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {selectedFuelTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="gap-1 pr-1">
                      {type}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive/20"
                        onClick={() => toggleFuelType(type)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {selectedTransmissions.map((type) => (
                    <Badge key={type} variant="secondary" className="gap-1 pr-1">
                      {type}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive/20"
                        onClick={() => toggleTransmission(type)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {(priceRange[0] > 0 || priceRange[1] < 20000000) && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 hover:bg-destructive/20"
                        onClick={() => setPriceRange([0, 20000000])}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                </div>
              )}

              {/* Cars Grid/List */}
              {carsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="aspect-[16/10] w-full" />
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                        <Skeleton className="h-8 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredCars.length === 0 ? (
                <div className="text-center py-16">
                  <Car className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No cars found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters to see more results
                  </p>
                  <Button onClick={clearAllFilters}>Clear All Filters</Button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCars.map((car) => (
                    <Card key={car.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                        <img
                          src={car.image}
                          alt={car.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          {car.isNew && (
                            <Badge className="bg-green-500 text-white">New</Badge>
                          )}
                          {car.isHot && (
                            <Badge className="bg-orange-500 text-white gap-1">
                              <Flame className="h-3 w-3" />
                              Hot
                            </Badge>
                          )}
                          {car.isUpcoming && (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Upcoming
                            </Badge>
                          )}
                          {car.isLimited && (
                            <Badge className="bg-purple-500 text-white">Limited</Badge>
                          )}
                        </div>
                        {/* Favorite & Compare Buttons */}
                        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                          {user && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-white/80 hover:bg-white rounded-full"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleFavorite(car.id, car.slug);
                              }}
                            >
                              <Heart
                                className={cn(
                                  "h-4 w-4",
                                  favorites?.some((f) => f.car_id === car.id)
                                    ? "fill-red-500 text-red-500"
                                    : "text-muted-foreground"
                                )}
                              />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 bg-white/80 hover:bg-white rounded-full",
                              isInCompare(car.id) && "bg-primary/20 hover:bg-primary/30"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              handleCompareToggle(car.id);
                            }}
                            disabled={!canAddMore && !isInCompare(car.id)}
                            title={isInCompare(car.id) ? "Remove from compare" : canAddMore ? "Add to compare" : "Max 3 cars"}
                          >
                            {isInCompare(car.id) ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <GitCompare className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground">{car.brand}</p>
                            <h3 className="font-semibold text-lg leading-tight">{car.name}</h3>
                          </div>
                          {car.discount !== "₹0" && (
                            <Badge variant="destructive" className="shrink-0 gap-1">
                              <Tag className="h-3 w-3" />
                              {car.discount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-primary font-bold text-lg mb-3">{car.price}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Fuel className="h-3 w-3" />
                            {car.fuelTypes.join(" / ")}
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            <Settings2 className="h-3 w-3" />
                            {car.transmission.join(" / ")}
                          </Badge>
                        </div>
                        {/* Action Buttons - 3 CTAs */}
                        <div className="flex flex-col gap-2">
                          {/* View Details - Primary */}
                          <Link to={`/car/${car.slug}`} className="w-full">
                            <Button className="w-full gap-2" size="sm">
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                          </Link>
                          {/* WhatsApp & Call Row */}
                          <div className="flex gap-2 w-full">
                            <WhatsAppCardButton carName={car.name} className="flex-1 h-9" />
                            <a href="tel:+919577200023" className="flex-1">
                              <Button variant="outline" size="sm" className="w-full gap-1.5 h-9">
                                <Phone className="h-4 w-4" />
                                Call
                              </Button>
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCars.map((car) => (
                    <Card key={car.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                      <div className="flex flex-col sm:flex-row">
                        <div className="relative sm:w-72 aspect-[16/10] sm:aspect-auto shrink-0 overflow-hidden bg-muted">
                          <img
                            src={car.image}
                            alt={car.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            {car.isNew && (
                              <Badge className="bg-green-500 text-white">New</Badge>
                            )}
                            {car.isHot && (
                              <Badge className="bg-orange-500 text-white gap-1">
                                <Flame className="h-3 w-3" />
                                Hot
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardContent className="flex-1 p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-xs text-muted-foreground">{car.brand} • {car.bodyType}</p>
                                <h3 className="font-semibold text-xl">{car.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{car.tagline}</p>
                              </div>
                              <p className="text-primary font-bold text-xl shrink-0">{car.price}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Badge variant="outline" className="text-xs gap-1">
                                <Fuel className="h-3 w-3" />
                                {car.fuelTypes.join(" / ")}
                              </Badge>
                              <Badge variant="outline" className="text-xs gap-1">
                                <Settings2 className="h-3 w-3" />
                                {car.transmission.join(" / ")}
                              </Badge>
                              {car.discount !== "₹0" && (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <Tag className="h-3 w-3" />
                                  {car.discount} Off
                                </Badge>
                              )}
                            </div>
                          </div>
                          {/* Action Buttons - 3 CTAs for List View */}
                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            <Link to={`/car/${car.slug}`} className="flex-1 min-w-[140px]">
                              <Button className="w-full gap-2" size="sm">
                                <Eye className="h-4 w-4" />
                                View Details
                              </Button>
                            </Link>
                            <WhatsAppCardButton carName={car.name} className="flex-1 min-w-[120px] h-9" />
                            <a href="tel:+919577200023" className="flex-1 min-w-[100px]">
                              <Button variant="outline" size="sm" className="w-full gap-1.5 h-9">
                                <Phone className="h-4 w-4" />
                                Call
                              </Button>
                            </a>
                            {user && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => toggleFavorite(car.id, car.slug)}
                              >
                                <Heart
                                  className={cn(
                                    "h-4 w-4",
                                    favorites?.some((f) => f.car_id === car.id)
                                      ? "fill-red-500 text-red-500"
                                      : "text-muted-foreground"
                                  )}
                                />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className={cn(
                                "h-9 w-9",
                                isInCompare(car.id) && "border-primary text-primary"
                              )}
                              onClick={() => handleCompareToggle(car.id)}
                              disabled={!canAddMore && !isInCompare(car.id)}
                              title={isInCompare(car.id) ? "Remove from compare" : canAddMore ? "Add to compare" : "Max 3 cars"}
                            >
                              {isInCompare(car.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <GitCompare className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>

        <Footer />
      </div>
    </HelmetProvider>
  );
};

export default Cars;
