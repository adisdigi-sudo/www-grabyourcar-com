import { useState } from "react";
import { Search, Car, Fuel, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

const carBrands = ["Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Kia", "Toyota", "Honda", "MG", "Skoda", "Volkswagen"];

export const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredBrands = carBrands.filter((brand) =>
    brand.toLowerCase().includes(query.toLowerCase())
  );

  const handleSearch = () => {
    onSearch?.(query);
    setShowSuggestions(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Main Search Box */}
      <div className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-card-hover p-4 md:p-6 border border-border/30">
        <div className="flex gap-3">
          {/* Main Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              variant="search"
              placeholder="Search by car name, brand, or budget..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => query.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="h-12 text-base"
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && filteredBrands.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-card-hover border border-border/50 z-50 overflow-hidden">
                {filteredBrands.slice(0, 5).map((brand) => (
                  <button
                    key={brand}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                    onClick={() => {
                      setQuery(brand);
                      setShowSuggestions(false);
                    }}
                  >
                    <Car className="h-4 w-4 text-foreground" />
                    <span>{brand}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="hero" size="lg" onClick={handleSearch} className="px-6 md:px-8">
            <Search className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Search</span>
          </Button>
        </div>

        {/* Popular Searches */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Popular:</span>
          {["Swift", "Creta", "Nexon", "XUV700", "Seltos"].map((car) => (
            <button
              key={car}
              onClick={() => setQuery(car)}
              className="text-sm text-foreground hover:text-primary/80 hover:underline transition-colors"
            >
              {car}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Filter Pills - Below Search for Banner Space */}
      <div className="mt-4 flex flex-wrap justify-center gap-2 md:gap-3">
        <Button variant="outline" size="sm" className="gap-2 bg-card/80 backdrop-blur-sm border-border/50 hover:bg-card">
          <Fuel className="h-4 w-4" />
          Fuel Type
        </Button>
        <Button variant="outline" size="sm" className="gap-2 bg-card/80 backdrop-blur-sm border-border/50 hover:bg-card">
          <Cog className="h-4 w-4" />
          Transmission
        </Button>
      </div>
    </div>
  );
};
