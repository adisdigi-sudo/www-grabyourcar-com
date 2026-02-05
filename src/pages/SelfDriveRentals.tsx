import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceBanner } from "@/components/ServiceBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, Car } from "lucide-react";
import { useState, useMemo } from "react";
import { RentalSearchFilters, RentalFilters } from "@/components/rentals/RentalSearchFilters";
import { RentalCarCard } from "@/components/rentals/RentalCarCard";
import { RentalBookingModal } from "@/components/rentals/RentalBookingModal";

// Import car images
import swiftImage from "@/assets/car-swift.jpg";
import cretaImage from "@/assets/car-creta.jpg";
import nexonImage from "@/assets/car-nexon.jpg";
import innovaImage from "@/assets/car-innova.jpg";
import seltosImage from "@/assets/car-seltos.jpg";
import xuv700Image from "@/assets/car-xuv700.jpg";

interface RentalCar {
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

const rentalCars: RentalCar[] = [
  {
    id: 1,
    name: "Maruti Swift",
    image: swiftImage,
    fuelType: "Petrol",
    transmission: "Manual",
    rent: 1300,
    brand: "Maruti",
    vehicleType: "Hatchback",
    seats: 5,
    year: 2023,
    color: "White",
    available: true,
    location: "Delhi - Connaught Place",
  },
  {
    id: 2,
    name: "Hyundai Creta",
    image: cretaImage,
    fuelType: "Diesel",
    transmission: "Automatic",
    rent: 2500,
    brand: "Hyundai",
    vehicleType: "SUV",
    seats: 5,
    year: 2024,
    color: "Black",
    available: true,
    location: "Noida - Sector 18",
  },
  {
    id: 3,
    name: "Tata Nexon",
    image: nexonImage,
    fuelType: "Petrol",
    transmission: "Manual",
    rent: 1800,
    brand: "Tata",
    vehicleType: "SUV",
    seats: 5,
    year: 2023,
    color: "Red",
    available: true,
    location: "Gurugram - Cyber Hub",
  },
  {
    id: 4,
    name: "Toyota Innova Crysta",
    image: innovaImage,
    fuelType: "Diesel",
    transmission: "Manual",
    rent: 3500,
    brand: "Toyota",
    vehicleType: "SUV",
    seats: 7,
    year: 2023,
    color: "Silver",
    available: false,
    location: "Delhi - Rajiv Chowk",
  },
  {
    id: 5,
    name: "Kia Seltos",
    image: seltosImage,
    fuelType: "Petrol",
    transmission: "Automatic",
    rent: 2200,
    brand: "Kia",
    vehicleType: "SUV",
    seats: 5,
    year: 2024,
    color: "Blue",
    available: true,
    location: "Greater Noida - Pari Chowk",
  },
  {
    id: 6,
    name: "Mahindra XUV700",
    image: xuv700Image,
    fuelType: "Diesel",
    transmission: "Automatic",
    rent: 3000,
    brand: "Mahindra",
    vehicleType: "SUV",
    seats: 7,
    year: 2024,
    color: "White",
    available: true,
    location: "Gurugram - MG Road",
  },
  {
    id: 7,
    name: "Maruti Dzire",
    image: swiftImage,
    fuelType: "CNG",
    transmission: "Manual",
    rent: 1400,
    brand: "Maruti",
    vehicleType: "Sedan",
    seats: 5,
    year: 2023,
    color: "White",
    available: true,
    location: "Ghaziabad - Vaishali",
  },
  {
    id: 8,
    name: "Hyundai Verna",
    image: cretaImage,
    fuelType: "Petrol",
    transmission: "Automatic",
    rent: 2000,
    brand: "Hyundai",
    vehicleType: "Sedan",
    seats: 5,
    year: 2024,
    color: "Grey",
    available: true,
    location: "Delhi - Connaught Place",
  },
  {
    id: 9,
    name: "Toyota Fortuner",
    image: innovaImage,
    fuelType: "Diesel",
    transmission: "Automatic",
    rent: 5000,
    brand: "Toyota",
    vehicleType: "Luxury",
    seats: 7,
    year: 2024,
    color: "Black",
    available: true,
    location: "Gurugram - Golf Course Road",
  },
  {
    id: 10,
    name: "Force Traveller",
    image: innovaImage,
    fuelType: "Diesel",
    transmission: "Manual",
    rent: 4500,
    brand: "Force",
    vehicleType: "Tempo Traveller",
    seats: 12,
    year: 2023,
    color: "White",
    available: true,
    location: "Noida - Sector 62",
  },
];

const brands = ["All", "Maruti", "Hyundai", "Tata", "Toyota", "Kia", "Mahindra", "Force"];
const locations = [
  "All",
  "Delhi - Connaught Place",
  "Delhi - Rajiv Chowk",
  "Noida - Sector 18",
  "Noida - Sector 62",
  "Greater Noida - Pari Chowk",
  "Gurugram - Cyber Hub",
  "Gurugram - MG Road",
  "Gurugram - Golf Course Road",
  "Ghaziabad - Vaishali",
];

const SelfDriveRentals = () => {
  const [filters, setFilters] = useState<RentalFilters>({
    search: "",
    vehicleType: "All",
    brand: "All",
    fuelType: "All",
    transmission: "All",
    priceRange: [500, 10000],
    location: "All",
  });

  const [selectedCar, setSelectedCar] = useState<RentalCar | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);

  const filteredCars = useMemo(() => {
    return rentalCars.filter((car) => {
      // Search filter
      if (filters.search && !car.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Vehicle type filter
      if (filters.vehicleType !== "All" && car.vehicleType !== filters.vehicleType) {
        return false;
      }

      // Brand filter
      if (filters.brand !== "All" && car.brand !== filters.brand) {
        return false;
      }

      // Fuel type filter
      if (filters.fuelType !== "All" && car.fuelType !== filters.fuelType) {
        return false;
      }

      // Transmission filter
      if (filters.transmission !== "All" && car.transmission !== filters.transmission) {
        return false;
      }

      // Location filter
      if (filters.location !== "All" && car.location !== filters.location) {
        return false;
      }

      // Price range filter
      if (car.rent < filters.priceRange[0] || car.rent > filters.priceRange[1]) {
        return false;
      }

      return true;
    });
  }, [filters]);

  const handleBookCar = (car: RentalCar) => {
    setSelectedCar(car);
    setIsBookingModalOpen(true);
  };

  const toggleFavorite = (carId: number) => {
    setFavorites((prev) =>
      prev.includes(carId) ? prev.filter((id) => id !== carId) : [...prev, carId]
    );
  };

  const availableCount = filteredCars.filter((c) => c.available).length;

  return (
    <>
      <Helmet>
        <title>Self-Drive Car Rentals in Delhi NCR | GrabYourCar</title>
        <meta
          name="description"
          content="Rent self-drive cars in Delhi NCR starting ₹999/day. Choose from hatchbacks, sedans, SUVs & luxury cars. Doorstep delivery, unlimited kilometers."
        />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grabyourcar.lovable.app/self-drive-rentals" />
        <meta property="og:title" content="Self-Drive Car Rentals in Delhi NCR | GrabYourCar" />
        <meta property="og:description" content="Rent self-drive cars in Delhi NCR starting ₹999/day. Doorstep delivery." />
        <meta property="og:image" content="https://grabyourcar.lovable.app/og-image.png" />
        <meta property="og:site_name" content="GrabYourCar" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://grabyourcar.lovable.app/self-drive-rentals" />
        <meta name="twitter:title" content="Self-Drive Car Rentals in Delhi NCR" />
        <meta name="twitter:description" content="Rent cars starting ₹999/day. Unlimited kilometers!" />
        <meta name="twitter:image" content="https://grabyourcar.lovable.app/og-image.png" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

      {/* Service Banner */}
      <ServiceBanner
        highlightText="Weekend Special"
        title="Rent Any Car Starting ₹999/day!"
        subtitle="Unlimited kilometers | Doorstep delivery | Zero security deposit for members"
        variant="primary"
        showCountdown
        countdownHours={48}
      />

      {/* Hero Section */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4">Self-Drive Car Rental</Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Drive Your Way Across Delhi NCR
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
              Choose from our fleet of well-maintained vehicles - Hatchbacks, Sedans, SUVs, Luxury Cars, and Tempo Travellers.
              Easy booking, transparent pricing, and complete freedom to drive on your terms.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                <span>{rentalCars.length} Vehicles</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{availableCount} Available Now</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filters */}
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

      {/* Car Listings */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {filteredCars.length} {filteredCars.length === 1 ? "Vehicle" : "Vehicles"} Found
            </h2>
          </div>

          {filteredCars.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCars.map((car) => (
                <RentalCarCard
                  key={car.id}
                  car={car}
                  onBook={handleBookCar}
                  isFavorite={favorites.includes(car.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Vehicles Found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters to see more options
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    search: "",
                    vehicleType: "All",
                    brand: "All",
                    fuelType: "All",
                    transmission: "All",
                    priceRange: [500, 10000],
                    location: "All",
                  })
                }
              >
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
            <a href="https://wa.me/919577200023" target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" size="lg" className="gap-2">
                <MessageCircle className="h-5 w-5" />
                WhatsApp Us
              </Button>
            </a>
            <a href="tel:+919577200023">
              <Button variant="call" size="lg" className="gap-2">
                <Phone className="h-5 w-5" />
                Call Now
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />

      {/* Booking Modal */}
      <RentalBookingModal
        car={selectedCar}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedCar(null);
        }}
      />
      </div>
    </>
  );
};

export default SelfDriveRentals;
