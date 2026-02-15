import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCars } from "@/hooks/useCars";
import { Car } from "@/data/cars/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, Plus, Car as CarIcon, Fuel, Gauge, Shield, Maximize, Zap, Loader2 } from "lucide-react";

const CompareCars = () => {
  const location = useLocation();
  const preselectedCarIds = (location.state as { preselectedCars?: (string | number)[] })?.preselectedCars;
  
  // Fetch cars from database
  const { data: allDbCars = [], isLoading } = useCars({ useDatabase: true });

  const [selectedCarIds, setSelectedCarIds] = useState<(string | null)[]>(() => {
    if (preselectedCarIds && preselectedCarIds.length > 0) {
      const ids = preselectedCarIds.slice(0, 3).map(id => String(id));
      while (ids.length < 3) ids.push(null);
      return ids;
    }
    return [null, null, null];
  });

  // Resolve selected cars from DB data
  const selectedCars: (Car | null)[] = selectedCarIds.map(id => 
    id ? allDbCars.find(c => String(c.id) === id) || null : null
  );

  const handleSelectCar = (index: number, carId: string) => {
    const newIds = [...selectedCarIds];
    newIds[index] = carId;
    setSelectedCarIds(newIds);
  };

  const handleRemoveCar = (index: number) => {
    const newIds = [...selectedCarIds];
    newIds[index] = null;
    setSelectedCarIds(newIds);
  };

  const getAvailableCars = (currentIndex: number) => {
    const selectedIds = selectedCarIds
      .filter((_, idx) => idx !== currentIndex)
      .filter(Boolean) as string[];
    return allDbCars.filter(car => !selectedIds.includes(String(car.id)));
  };

  const activeCars = selectedCars.filter(Boolean) as Car[];

  const getSpecValue = (car: Car, category: keyof Car["specifications"], label: string) => {
    const spec = car.specifications[category]?.find((s) => s.label === label);
    return spec?.value || "-";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4" variant="secondary">
              Compare Up To 3 Cars
            </Badge>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-4">
              Compare Cars Side by Side
            </h1>
            <p className="text-lg text-muted-foreground">
              Select up to 3 cars to compare their specifications, features, and prices to make an informed decision.
            </p>
          </div>
        </div>
      </section>

      {/* Car Selection */}
      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading cars...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedCars.map((car, index) => (
                <Card key={index} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    {car ? (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {car.image && (
                              <img
                                src={car.image}
                                alt={car.name}
                                className="w-full h-32 object-cover rounded-lg mb-3"
                              />
                            )}
                            <h3 className="font-heading font-semibold text-lg">{car.name}</h3>
                            <p className="text-primary font-bold">{car.price}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemoveCar(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <Select onValueChange={(value) => handleSelectCar(index, value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a car" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableCars(index).map((c) => (
                              <SelectItem key={String(c.id)} value={String(c.id)}>
                                {c.brand} {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Comparison Content */}
      {activeCars.length >= 2 && (
        <section className="py-12">
          <div className="container mx-auto px-4 space-y-12">
            {/* Price Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CarIcon className="h-5 w-5 text-primary" />
                  Price & Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Feature</TableHead>
                      {activeCars.map((car) => (
                        <TableHead key={String(car.id)} className="text-center">
                          {car.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Price Range</TableCell>
                      {activeCars.map((car) => (
                        <TableCell key={String(car.id)} className="text-center font-semibold text-primary">
                          {car.price}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Discount</TableCell>
                      {activeCars.map((car) => (
                        <TableCell key={String(car.id)} className="text-center">
                          {car.discount ? <Badge variant="destructive">{car.discount}</Badge> : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Availability</TableCell>
                      {activeCars.map((car) => (
                        <TableCell key={String(car.id)} className="text-center">
                          <Badge variant={car.isLimited ? "secondary" : "default"}>
                            {car.availability}
                          </Badge>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Fuel Types</TableCell>
                      {activeCars.map((car) => (
                        <TableCell key={String(car.id)} className="text-center">
                          {car.fuelTypes?.join(", ") || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Transmission</TableCell>
                      {activeCars.map((car) => (
                        <TableCell key={String(car.id)} className="text-center">
                          {car.transmission?.join(", ") || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Engine Specifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-primary" />
                  Engine Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Specification</TableHead>
                      {activeCars.map((car) => (
                        <TableHead key={String(car.id)} className="text-center">
                          {car.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["Engine Type", "Displacement", "Max Power", "Max Torque", "Fuel Tank Capacity"].map(
                      (label) => (
                        <TableRow key={label}>
                          <TableCell className="font-medium">{label}</TableCell>
                          {activeCars.map((car) => (
                            <TableCell key={String(car.id)} className="text-center">
                              {getSpecValue(car, "engine", label)}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Dimensions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Maximize className="h-5 w-5 text-primary" />
                  Dimensions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Dimension</TableHead>
                      {activeCars.map((car) => (
                        <TableHead key={String(car.id)} className="text-center">
                          {car.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["Length", "Width", "Height", "Wheelbase", "Ground Clearance", "Boot Space"].map(
                      (label) => (
                        <TableRow key={label}>
                          <TableCell className="font-medium">{label}</TableCell>
                          {activeCars.map((car) => (
                            <TableCell key={String(car.id)} className="text-center">
                              {getSpecValue(car, "dimensions", label)}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Metric</TableHead>
                      {activeCars.map((car) => (
                        <TableHead key={String(car.id)} className="text-center">
                          {car.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["Mileage (Petrol)", "Mileage (Diesel)", "Top Speed", "0-100 kmph"].map((label) => (
                      <TableRow key={label}>
                        <TableCell className="font-medium">{label}</TableCell>
                        {activeCars.map((car) => (
                          <TableCell key={String(car.id)} className="text-center">
                            {getSpecValue(car, "performance", label)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Feature</TableHead>
                      {activeCars.map((car) => (
                        <TableHead key={String(car.id)} className="text-center">
                          {car.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["Airbags", "Infotainment", "Sunroof", "Connectivity", "Sound System", "Cruise Control"].map(
                      (label) => (
                        <TableRow key={label}>
                          <TableCell className="font-medium">{label}</TableCell>
                          {activeCars.map((car) => (
                            <TableCell key={String(car.id)} className="text-center">
                              {getSpecValue(car, "features", label)}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Offers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Offers & Discounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Offer Type</TableHead>
                      {activeCars.map((car) => (
                        <TableHead key={String(car.id)} className="text-center">
                          {car.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["cashback", "exchange", "accessory", "finance"].map((type) => (
                      <TableRow key={type}>
                        <TableCell className="font-medium capitalize">{type}</TableCell>
                        {activeCars.map((car) => {
                          const offer = car.offers?.find((o) => o.type === type);
                          return (
                            <TableCell key={String(car.id)} className="text-center">
                              {offer ? (
                                <div>
                                  <p className="font-semibold text-primary">{offer.discount}</p>
                                  <p className="text-xs text-muted-foreground">{offer.title}</p>
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Empty State */}
      {activeCars.length < 2 && !isLoading && (
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <CarIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-heading font-semibold mb-2">Select Cars to Compare</h2>
              <p className="text-muted-foreground">
                Please select at least 2 cars from the options above to see a detailed comparison of their specifications, features, and prices.
              </p>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default CompareCars;
