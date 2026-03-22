import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Plus, Edit, RefreshCw, Car, IndianRupee, Filter } from "lucide-react";

interface CarVariant {
  id: string;
  car_id: string;
  name: string;
  price: string;
  price_numeric: number | null;
  fuel_type: string | null;
  transmission: string | null;
  ex_showroom: number | null;
  on_road_price: number | null;
}

interface CarWithVariants {
  id: string;
  name: string;
  brand: string;
  price_range: string | null;
  variants: CarVariant[];
}

export const VariantPricingManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");

  // Fetch cars with variants
  const { data: cars, isLoading, refetch } = useQuery({
    queryKey: ['adminCarVariants', brandFilter, searchQuery],
    queryFn: async () => {
      let carsQuery = supabase
        .from('cars')
        .select('id, name, brand, price_range')
        .order('brand')
        .order('name');
      
      if (brandFilter !== 'all') {
        carsQuery = carsQuery.eq('brand', brandFilter);
      }

      const { data: carsData, error: carsError } = await carsQuery;
      if (carsError) throw carsError;

      // Fetch variants for each car
      const carsWithVariants = await Promise.all(
        (carsData || []).map(async (car) => {
          const { data: variants } = await supabase
            .from('car_variants')
            .select('*')
            .eq('car_id', car.id)
            .order('price_numeric');
          
          return {
            ...car,
            variants: variants || [],
          } as CarWithVariants;
        })
      );

      // Filter by search query
      if (searchQuery) {
        return carsWithVariants.filter(car => 
          car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          car.brand.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return carsWithVariants;
    },
  });

  // Get unique brands
  const brands = [...new Set(cars?.map(car => car.brand) || [])].sort();

  // Stats
  const stats = {
    totalCars: cars?.length || 0,
    totalVariants: cars?.reduce((acc, c) => acc + c.variants.length, 0) || 0,
    carsWithVariants: cars?.filter(c => c.variants.length > 0).length || 0,
    avgVariants: cars?.length ? Math.round((cars?.reduce((acc, c) => acc + c.variants.length, 0) || 0) / cars.length) : 0,
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Variants & Pricing</h2>
          <p className="text-muted-foreground">
            Manage car variants and pricing details
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalCars}</div>
            <p className="text-xs text-muted-foreground">Total Cars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalVariants}</div>
            <p className="text-xs text-muted-foreground">Total Variants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.carsWithVariants}</div>
            <p className="text-xs text-muted-foreground">Cars with Variants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{stats.avgVariants}</div>
            <p className="text-xs text-muted-foreground">Avg Variants/Car</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cars with Variants */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
            </CardContent>
          </Card>
        ) : cars && cars.length > 0 ? (
          cars.map((car) => (
            <Card key={car.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{car.brand} {car.name}</CardTitle>
                      <CardDescription>{car.price_range || 'Price not set'}</CardDescription>
                    </div>
                  </div>
                  <Badge>{car.variants.length} variants</Badge>
                </div>
              </CardHeader>
              {car.variants.length > 0 && (
                <CardContent className="pt-0">
                  {/* Group variants by fuel type */}
                  {(() => {
                    const fuelGroups = new Map<string, CarVariant[]>();
                    car.variants.forEach(v => {
                      const fuel = v.fuel_type || 'Other';
                      if (!fuelGroups.has(fuel)) fuelGroups.set(fuel, []);
                      fuelGroups.get(fuel)!.push(v);
                    });
                    const groups = Array.from(fuelGroups.entries());
                    const showHeaders = groups.length > 1;

                    return groups.map(([fuelType, groupVariants]) => (
                      <div key={fuelType} className="mb-4 last:mb-0">
                        {showHeaders && (
                          <div className="flex items-center gap-2 mb-2 mt-2">
                            <Badge variant="outline" className="text-xs font-semibold">
                              ⛽ {fuelType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{groupVariants.length} variant{groupVariants.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Variant</TableHead>
                              {!showHeaders && <TableHead>Fuel</TableHead>}
                              <TableHead>Transmission</TableHead>
                              <TableHead>Ex-Showroom</TableHead>
                              <TableHead>On-Road</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupVariants.map((variant) => (
                              <TableRow key={variant.id}>
                                <TableCell className="font-medium">{variant.name}</TableCell>
                                {!showHeaders && (
                                  <TableCell>
                                    <Badge variant="outline">{variant.fuel_type || '-'}</Badge>
                                  </TableCell>
                                )}
                                <TableCell>
                                  <Badge variant="secondary">{variant.transmission || '-'}</Badge>
                                </TableCell>
                                <TableCell className="font-mono">
                                  {formatPrice(variant.ex_showroom || variant.price_numeric)}
                                </TableCell>
                                <TableCell className="font-mono font-medium">
                                  {formatPrice(variant.on_road_price)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ));
                  })()}
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No cars found
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
