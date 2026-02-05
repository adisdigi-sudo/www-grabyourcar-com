import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, LocateFixed, X, Filter } from "lucide-react";
import { brands, cities, states } from "@/data/dealerLocatorData";

interface DealerFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedState: string;
  setSelectedState: (state: string) => void;
  onDetectLocation: () => void;
  isDetecting: boolean;
  detectedLocation: string | null;
}

export const DealerFilters = ({
  searchQuery,
  setSearchQuery,
  selectedBrand,
  setSelectedBrand,
  selectedCity,
  setSelectedCity,
  selectedState,
  setSelectedState,
  onDetectLocation,
  isDetecting,
  detectedLocation,
}: DealerFiltersProps) => {
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedBrand("All Brands");
     setSelectedCity("all");
     setSelectedState("all");
  };

   const hasActiveFilters = searchQuery || selectedBrand !== "All Brands" || (selectedCity && selectedCity !== "all") || (selectedState && selectedState !== "all");

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 md:p-6 space-y-4 shadow-sm">
      {/* Location Detection */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Button
          onClick={onDetectLocation}
          disabled={isDetecting}
          variant="outline"
          size="lg"
          className="gap-2 flex-1 sm:flex-none border-primary/30 hover:bg-primary/5 font-medium"
        >
          <LocateFixed className={`h-5 w-5 ${isDetecting ? "animate-spin" : ""}`} />
          {isDetecting ? "Detecting..." : "Use My Location"}
        </Button>
        {detectedLocation && (
          <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-4 py-2.5 rounded-full font-medium">
            <MapPin className="h-4 w-4" />
            <span>{detectedLocation}</span>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="relative sm:col-span-2 lg:col-span-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by dealer, city, pincode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-background/50"
          />
        </div>

        {/* Brand Filter */}
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="h-11 bg-background/50">
            <SelectValue placeholder="Select Brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* State Filter */}
        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger className="h-11 bg-background/50">
            <SelectValue placeholder="Select State" />
          </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All States</SelectItem>
            {states.map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City Filter */}
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="h-11 bg-background/50">
            <SelectValue placeholder="Select City" />
          </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters & Clear */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {searchQuery && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                "{searchQuery}"
              </span>
            )}
            {selectedBrand !== "All Brands" && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                {selectedBrand}
              </span>
            )}
             {selectedState && selectedState !== "all" && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                {selectedState}
              </span>
            )}
             {selectedCity && selectedCity !== "all" && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                {selectedCity}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground hover:text-destructive">
            <X className="h-3 w-3" />
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};
