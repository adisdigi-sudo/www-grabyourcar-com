import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { captureRentalJourneyStep } from "@/lib/rentalJourney";

export interface RentalFilters {
  search: string;
  vehicleType: string;
  brand: string;
  fuelType: string;
  transmission: string;
  priceRange: [number, number];
  location: string;
}

interface RentalSearchFiltersProps {
  filters: RentalFilters;
  onFiltersChange: (filters: RentalFilters) => void;
  brands: string[];
  locations: string[];
}

const vehicleTypes = ["All", "Hatchback", "Sedan", "SUV", "Luxury", "Tempo Traveller"];
const fuelTypes = ["All", "Petrol", "Diesel", "CNG", "Electric"];
const transmissionTypes = ["All", "Manual", "Automatic"];

export const RentalSearchFilters = ({
  filters,
  onFiltersChange,
  brands,
  locations,
}: RentalSearchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof RentalFilters>(key: K, value: RentalFilters[K]) => {
    captureRentalJourneyStep("filters_updated", { [key]: value });
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      vehicleType: "All",
      brand: "All",
      fuelType: "All",
      transmission: "All",
      priceRange: [500, 10000],
      location: "All",
    });
  };

  const activeFiltersCount = [
    filters.vehicleType !== "All",
    filters.brand !== "All",
    filters.fuelType !== "All",
    filters.transmission !== "All",
    filters.location !== "All",
    filters.priceRange[0] > 500 || filters.priceRange[1] < 10000,
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Vehicle Type</Label>
        <Select value={filters.vehicleType} onValueChange={(v) => updateFilter("vehicleType", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {vehicleTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Brand</Label>
        <Select value={filters.brand} onValueChange={(v) => updateFilter("brand", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand} value={brand}>{brand}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Fuel Type</Label>
        <Select value={filters.fuelType} onValueChange={(v) => updateFilter("fuelType", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fuelTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Transmission</Label>
        <Select value={filters.transmission} onValueChange={(v) => updateFilter("transmission", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {transmissionTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <Select value={filters.location} onValueChange={(v) => updateFilter("location", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Price Range: ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}/day</Label>
        <Slider
          value={filters.priceRange}
          onValueChange={(v) => updateFilter("priceRange", v as [number, number])}
          min={500}
          max={10000}
          step={100}
          className="w-full"
        />
      </div>

      <Button variant="outline" className="w-full" onClick={clearFilters}>
        <X className="h-4 w-4 mr-2" />
        Clear All Filters
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by car name or model..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-6 gap-4">
              <Select value={filters.vehicleType} onValueChange={(v) => updateFilter("vehicleType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.brand} onValueChange={(v) => updateFilter("brand", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.fuelType} onValueChange={(v) => updateFilter("fuelType", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Fuel Type" />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.transmission} onValueChange={(v) => updateFilter("transmission", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Transmission" />
                </SelectTrigger>
                <SelectContent>
                  {transmissionTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.location} onValueChange={(v) => updateFilter("location", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter Vehicles</SheetTitle>
            </SheetHeader>
            <div className="mt-6 overflow-y-auto">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.vehicleType !== "All" && (
            <Badge variant="secondary" className="gap-1">
              {filters.vehicleType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("vehicleType", "All")} />
            </Badge>
          )}
          {filters.brand !== "All" && (
            <Badge variant="secondary" className="gap-1">
              {filters.brand}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("brand", "All")} />
            </Badge>
          )}
          {filters.fuelType !== "All" && (
            <Badge variant="secondary" className="gap-1">
              {filters.fuelType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("fuelType", "All")} />
            </Badge>
          )}
          {filters.transmission !== "All" && (
            <Badge variant="secondary" className="gap-1">
              {filters.transmission}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("transmission", "All")} />
            </Badge>
          )}
          {filters.location !== "All" && (
            <Badge variant="secondary" className="gap-1">
              {filters.location}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("location", "All")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
