import { GlobalSEO } from "@/components/seo/GlobalSEO";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceBanner } from "@/components/ServiceBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, Car, User, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { RentalSearchFilters, RentalFilters } from "@/components/rentals/RentalSearchFilters";
import { RentalBookingModal } from "@/components/rentals/RentalBookingModal";
import { RentalServiceTabs } from "@/components/rentals/RentalServiceTabs";
import { RentalVehicleCard } from "@/components/rentals/RentalVehicleCard";
import { DriverBookingModal } from "@/components/rentals/DriverBookingModal";
import { RentalPolicies } from "@/components/rentals/RentalPolicies";
import { RentalDocRequirements } from "@/components/rentals/RentalDocRequirements";
import { useRentalServices, useRentalVehicles, RentalVehicle, RentalService } from "@/hooks/useRentalServices";

// Fallback static data for when DB is empty
import swiftImage from "@/assets/car-swift.jpg";
import cretaImage from "@/assets/car-creta.jpg";
import nexonImage from "@/assets/car-nexon.jpg";
import innovaImage from "@/assets/car-innova.jpg";
import seltosImage from "@/assets/car-seltos.jpg";
import xuv700Image from "@/assets/car-xuv700.jpg";

interface LegacyRentalCar {
  id: number;
  name: string;
  image: string;
  fuelType: string;
  transmission: string;
  rent: number;
  brand: string;
  vehicleType: string;
  seats: number;
  year: number;
  color: string;
  available: boolean;
  location: string;
}

const fallbackCars: LegacyRentalCar[] = [
  { id: 1, name: "Maruti Swift", image: swiftImage, fuelType: "Petrol", transmission: "Manual", rent: 1300, brand: "Maruti", vehicleType: "Hatchback", seats: 5, year: 2023, color: "White", available: true, location: "Delhi - Connaught Place" },
  { id: 2, name: "Hyundai Creta", image: cretaImage, fuelType: "Diesel", transmission: "Automatic", rent: 2500, brand: "Hyundai", vehicleType: "SUV", seats: 5, year: 2024, color: "Black", available: true, location: "Noida - Sector 18" },
  { id: 3, name: "Tata Nexon", image: nexonImage, fuelType: "Petrol", transmission: "Manual", rent: 1800, brand: "Tata", vehicleType: "SUV", seats: 5, year: 2023, color: "Red", available: true, location: "Gurugram - Cyber Hub" },
  { id: 4, name: "Toyota Innova Crysta", image: innovaImage, fuelType: "Diesel", transmission: "Manual", rent: 3500, brand: "Toyota", vehicleType: "SUV", seats: 7, year: 2023, color: "Silver", available: false, location: "Delhi - Rajiv Chowk" },
  { id: 5, name: "Kia Seltos", image: seltosImage, fuelType: "Petrol", transmission: "Automatic", rent: 2200, brand: "Kia", vehicleType: "SUV", seats: 5, year: 2024, color: "Blue", available: true, location: "Greater Noida - Pari Chowk" },
  { id: 6, name: "Mahindra XUV700", image: xuv700Image, fuelType: "Diesel", transmission: "Automatic", rent: 3000, brand: "Mahindra", vehicleType: "SUV", seats: 7, year: 2024, color: "White", available: true, location: "Gurugram - MG Road" },
];

const defaultServices: RentalService[] = [
  { id: '1', name: 'Self Drive', slug: 'self-drive', description: 'Drive yourself', icon: 'car', base_price: 999, price_unit: 'per day', is_active: true, sort_order: 1, features: [], terms: null, created_at: '', updated_at: '' },
  { id: '2', name: 'With Driver', slug: 'with-driver', description: 'Professional chauffeur', icon: 'user', base_price: 1499, price_unit: 'per day', is_active: true, sort_order: 2, features: [], terms: null, created_at: '', updated_at: '' },
  { id: '3', name: 'Outstation', slug: 'outstation', description: 'Long distance travel', icon: 'map-pin', base_price: 12, price_unit: 'per km', is_active: true, sort_order: 3, features: [], terms: null, created_at: '', updated_at: '' },
];

const brands = ["All", "Maruti", "Hyundai", "Tata", "Toyota", "Kia", "Mahindra", "Force"];
const locations = [
  "All", "Delhi - Connaught Place", "Delhi - Rajiv Chowk", "Noida - Sector 18",
  "Noida - Sector 62", "Greater Noida - Pari Chowk", "Gurugram - Cyber Hub",
  "Gurugram - MG Road", "Gurugram - Golf Course Road", "Ghaziabad - Vaishali",
];

const SelfDriveRentals = () => {
  const { data: dbServices } = useRentalServices();
  const { data: dbVehicles } = useRentalVehicles();
  
  const services = dbServices?.length ? dbServices : defaultServices;
  
  const [activeService, setActiveService] = useState("self-drive");
  const [filters, setFilters] = useState<RentalFilters>({
    search: "", vehicleType: "All", brand: "All", fuelType: "All",
    transmission: "All", priceRange: [500, 10000], location: "All",
  });

  const [selectedVehicle, setSelectedVehicle] = useState<RentalVehicle | LegacyRentalCar | null>(null);
  const [isSelfDriveModalOpen, setIsSelfDriveModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Convert DB vehicles or use fallback
  const vehicles = useMemo(() => {
    if (dbVehicles?.length) {
      return dbVehicles;
    }
    // Convert legacy format to new format
    return fallbackCars.map(car => ({
      id: String(car.id),
      name: car.name,
      brand: car.brand,
      vehicle_type: car.vehicleType,
      fuel_type: car.fuelType,
      transmission: car.transmission,
      seats: car.seats,
      year: car.year,
      color: car.color,
      registration_number: null,
      rent_self_drive: car.rent,
      rent_with_driver: Math.round(car.rent * 1.3),
      rent_outstation_per_km: Math.round(car.rent / 100),
      location: car.location,
      image_url: car.image,
      is_available: car.available,
      is_active: true,
      features: [],
      created_at: '',
      updated_at: '',
    })) as RentalVehicle[];
  }, [dbVehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (filters.search && !v.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.vehicleType !== "All" && v.vehicle_type !== filters.vehicleType) return false;
      if (filters.brand !== "All" && v.brand !== filters.brand) return false;
      if (filters.fuelType !== "All" && v.fuel_type !== filters.fuelType) return false;
      if (filters.transmission !== "All" && v.transmission !== filters.transmission) return false;
      if (filters.location !== "All" && v.location !== filters.location) return false;
      
      const price = activeService === 'self-drive' ? v.rent_self_drive :
                    activeService === 'with-driver' ? v.rent_with_driver :
                    (v.rent_outstation_per_km || 0) * 100;
      if ((price || 0) < filters.priceRange[0] || (price || 0) > filters.priceRange[1]) return false;
      
      return true;
    });
  }, [vehicles, filters, activeService]);

  const handleBookVehicle = (vehicle: RentalVehicle) => {
    setSelectedVehicle(vehicle);
    if (activeService === 'self-drive') {
      setIsSelfDriveModalOpen(true);
    } else {
      setIsDriverModalOpen(true);
    }
  };

  const toggleFavorite = (vehicleId: string) => {
    setFavorites((prev) =>
      prev.includes(vehicleId) ? prev.filter((id) => id !== vehicleId) : [...prev, vehicleId]
    );
  };

  const availableCount = filteredVehicles.filter((v) => v.is_available).length;
  const currentService = services.find(s => s.slug === activeService);

  return (
    <>
      <GlobalSEO
        pageKey="self_drive"
        title="Car Rentals in Delhi NCR | Self Drive & With Driver | GrabYourCar"
        description="Rent cars in Delhi NCR - Self Drive from ₹999/day, With Driver from ₹1499/day, Outstation from ₹12/km. Professional service, doorstep delivery."
        path="/self-drive"
      />

      <div className="min-h-screen bg-background">
        <Header />

        <ServiceBanner
          highlightText={activeService === 'self-drive' ? "Self Drive Special" : activeService === 'with-driver' ? "Chauffeur Service" : "Outstation Deals"}
          title={`Book ${currentService?.name || 'Car Rental'} Starting ₹${currentService?.base_price?.toLocaleString() || 999}/${currentService?.price_unit?.replace('per ', '') || 'day'}!`}
          subtitle="Professional service | Doorstep delivery | 24/7 Support"
          variant="primary"
          showCountdown
          countdownHours={48}
        />

        {/* Hero Section with Service Tabs */}
        <section className="py-8 md:py-12 bg-gradient-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-8">
              <Badge className="mb-4">Car Rental Services</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                {activeService === 'self-drive' ? 'Drive Your Way' : 
                 activeService === 'with-driver' ? 'Professional Chauffeur Service' :
                 'Outstation Trip Packages'}
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
                {currentService?.description || 'Choose from our fleet of well-maintained vehicles.'}
              </p>
            </div>

            {/* Service Type Tabs */}
            <div className="max-w-xl mx-auto mb-8">
              <RentalServiceTabs
                services={services}
                activeService={activeService}
                onServiceChange={setActiveService}
              />
            </div>

            {/* Features of selected service */}
            {currentService?.features && (currentService.features as string[]).length > 0 && (
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {(currentService.features as string[]).map((feature, i) => (
                  <Badge key={i} variant="outline" className="py-1.5 px-3">
                    {feature}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <span>{vehicles.length} Vehicles</span>
              </div>
              <Badge variant="secondary">{availableCount} Available Now</Badge>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-6 border-b border-border">
          <div className="container mx-auto px-4">
            <RentalSearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              brands={brands}
              locations={locations}
            />
          </div>
        </section>

        {/* Vehicle Listings */}
        <section className="py-10 md:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                {filteredVehicles.length} {filteredVehicles.length === 1 ? "Vehicle" : "Vehicles"} Found
              </h2>
            </div>

            {filteredVehicles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle) => (
                  <RentalVehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    serviceType={activeService as 'self-drive' | 'with-driver' | 'outstation'}
                    onBook={handleBookVehicle}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Vehicles Found</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
                <Button variant="outline" onClick={() => setFilters({
                  search: "", vehicleType: "All", brand: "All", fuelType: "All",
                  transmission: "All", priceRange: [500, 10000], location: "All",
                })}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-12 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Need Help Choosing?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Contact us for personalized recommendations and best rental deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://wa.me/1155578093" target="_blank" rel="noopener noreferrer">
                <Button variant="whatsapp" size="lg" className="gap-2">
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp Us
                </Button>
              </a>
              <a href="tel:+1155578093">
                <Button variant="call" size="lg" className="gap-2">
                  <Phone className="h-5 w-5" />
                  Call Now
                </Button>
              </a>
            </div>
          </div>
        </section>

        <Footer />

        {/* Self Drive Booking Modal */}
        <RentalBookingModal
          car={selectedVehicle ? {
            id: typeof selectedVehicle.id === 'string' ? parseInt(selectedVehicle.id) || 0 : selectedVehicle.id as number,
            name: selectedVehicle.name,
            image: 'image_url' in selectedVehicle ? selectedVehicle.image_url || '' : (selectedVehicle as any).image || '',
            fuelType: 'fuel_type' in selectedVehicle ? selectedVehicle.fuel_type || '' : (selectedVehicle as any).fuelType || '',
            transmission: selectedVehicle.transmission || '',
            rent: 'rent_self_drive' in selectedVehicle ? selectedVehicle.rent_self_drive || 0 : (selectedVehicle as any).rent || 0,
            brand: selectedVehicle.brand,
            vehicleType: 'vehicle_type' in selectedVehicle ? selectedVehicle.vehicle_type : (selectedVehicle as any).vehicleType,
            seats: selectedVehicle.seats,
            year: selectedVehicle.year || 2024,
            color: selectedVehicle.color || '',
            available: 'is_available' in selectedVehicle ? selectedVehicle.is_available : (selectedVehicle as any).available,
            location: selectedVehicle.location || '',
          } : null}
          isOpen={isSelfDriveModalOpen}
          onClose={() => {
            setIsSelfDriveModalOpen(false);
            setSelectedVehicle(null);
          }}
        />

        {/* Driver Booking Modal */}
        <DriverBookingModal
          vehicle={selectedVehicle as RentalVehicle | null}
          isOpen={isDriverModalOpen}
          onClose={() => {
            setIsDriverModalOpen(false);
            setSelectedVehicle(null);
          }}
          serviceType={activeService === 'outstation' ? 'outstation' : 'with_driver'}
        />
      </div>
    </>
  );
};

export default SelfDriveRentals;
