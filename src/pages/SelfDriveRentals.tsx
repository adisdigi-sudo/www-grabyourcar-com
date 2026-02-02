import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceBanner } from "@/components/ServiceBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Fuel, Settings2, Phone, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

// Import car images
import swiftImage from "@/assets/car-swift.jpg";
import cretaImage from "@/assets/car-creta.jpg";
import nexonImage from "@/assets/car-nexon.jpg";
import innovaImage from "@/assets/car-innova.jpg";
import seltosImage from "@/assets/car-seltos.jpg";
import xuv700Image from "@/assets/car-xuv700.jpg";

const rentalCars = [
  {
    id: 1,
    name: "Maruti Swift",
    image: swiftImage,
    fuelType: "Petrol",
    transmission: "Manual",
    rent: 1300,
    brand: "Maruti",
    condition: "Used",
  },
  {
    id: 2,
    name: "Hyundai Creta",
    image: cretaImage,
    fuelType: "Diesel",
    transmission: "Automatic",
    rent: 2500,
    brand: "Hyundai",
    condition: "Used",
  },
  {
    id: 3,
    name: "Tata Nexon",
    image: nexonImage,
    fuelType: "Petrol",
    transmission: "Manual",
    rent: 1800,
    brand: "Tata",
    condition: "Used",
  },
  {
    id: 4,
    name: "Toyota Innova",
    image: innovaImage,
    fuelType: "Diesel",
    transmission: "Manual",
    rent: 3500,
    brand: "Toyota",
    condition: "Used",
  },
  {
    id: 5,
    name: "Kia Seltos",
    image: seltosImage,
    fuelType: "Petrol",
    transmission: "Automatic",
    rent: 2200,
    brand: "Kia",
    condition: "Used",
  },
  {
    id: 6,
    name: "Mahindra XUV700",
    image: xuv700Image,
    fuelType: "Diesel",
    transmission: "Automatic",
    rent: 3000,
    brand: "Mahindra",
    condition: "Used",
  },
];

const brands = ["All", "Maruti", "Hyundai", "Tata", "Toyota", "Kia", "Mahindra"];

const SelfDriveRentals = () => {
  const [selectedBrand, setSelectedBrand] = useState("All");

  const filteredCars = selectedBrand === "All" 
    ? rentalCars 
    : rentalCars.filter(car => car.brand === selectedBrand);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Service Banner */}
      <ServiceBanner
        highlightText="Weekend Special"
        title="Rent Any Car Starting ₹999/day!"
        subtitle="Unlimited kilometers | Doorstep delivery | Zero security deposit for members"
        variant="accent"
        showCountdown
        countdownHours={48}
      />

      {/* Hero Section */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              SELF DRIVE CAR RENTAL
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Grab Your Car offers self drive car rentals across Delhi NCR including Noida, Greater Noida, Gurugram and Ghaziabad. Choose from petrol, diesel or hybrid cars with manual or automatic transmission. Easy booking, transparent pricing and complete freedom to drive on your terms.
            </p>
          </div>
        </div>
      </section>

      {/* Brand Filter */}
      <section className="py-6 border-b border-border">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-4">Filter items with Brand</p>
          <div className="flex flex-wrap justify-center gap-2">
            {brands.map((brand) => (
              <Button
                key={brand}
                variant={selectedBrand === brand ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBrand(brand)}
                className="rounded-full px-5"
              >
                {brand}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Car Listings */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCars.map((car) => (
              <Card key={car.id} className="overflow-hidden border-border hover:shadow-lg transition-shadow group">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="p-4 pb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-foreground text-lg uppercase">{car.name}</h3>
                      <p className="text-xs text-primary font-medium">RENT</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {car.condition}
                    </Badge>
                  </div>

                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={car.image}
                      alt={car.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Specs */}
                  <div className="px-4 py-3 flex items-center gap-4 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Fuel className="h-4 w-4" />
                      <span>{car.fuelType}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Fuel className="h-4 w-4" />
                      <span>{car.fuelType}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Settings2 className="h-4 w-4" />
                      <span>{car.transmission}</span>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="px-4 py-3 flex items-center justify-between border-t border-border/50">
                    <div>
                      <span className="text-sm text-muted-foreground">Rent: </span>
                      <span className="text-lg font-bold text-foreground">₹{car.rent}</span>
                      <span className="text-sm text-muted-foreground">/day</span>
                    </div>
                    <a href="https://wa.me/919855924442" target="_blank" rel="noopener noreferrer">
                      <Button variant="cta" size="sm" className="gap-1.5">
                        Book Now
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
            <a href="https://wa.me/919855924442" target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" size="lg" className="gap-2">
                <MessageCircle className="h-5 w-5" />
                WhatsApp Us
              </Button>
            </a>
            <a href="tel:+919855924442">
              <Button variant="call" size="lg" className="gap-2">
                <Phone className="h-5 w-5" />
                Call Now
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SelfDriveRentals;
