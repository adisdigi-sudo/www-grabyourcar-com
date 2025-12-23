import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fuel, Cog, Clock, TrendingDown, MessageCircle, Phone } from "lucide-react";

import carCreta from "@/assets/car-creta.jpg";
import carNexon from "@/assets/car-nexon.jpg";
import carSwift from "@/assets/car-swift.jpg";
import carXuv700 from "@/assets/car-xuv700.jpg";
import carSeltos from "@/assets/car-seltos.jpg";
import carInnova from "@/assets/car-innova.jpg";

const cars = [
  {
    id: 1,
    name: "Hyundai Creta",
    image: carCreta,
    price: "₹11.00 - 20.15 Lakh",
    originalPrice: "₹11.50 Lakh",
    discount: "₹50,000 OFF",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "Ready Stock",
    isHot: true,
    isLimited: false,
  },
  {
    id: 2,
    name: "Tata Nexon",
    image: carNexon,
    price: "₹8.10 - 15.50 Lakh",
    originalPrice: "₹8.50 Lakh",
    discount: "₹40,000 OFF",
    fuelTypes: ["Petrol", "Diesel", "EV"],
    transmission: ["Manual", "AMT"],
    availability: "Ready Stock",
    isHot: true,
    isLimited: false,
  },
  {
    id: 3,
    name: "Maruti Swift",
    image: carSwift,
    price: "₹6.49 - 9.64 Lakh",
    originalPrice: "₹6.99 Lakh",
    discount: "₹50,000 OFF",
    fuelTypes: ["Petrol", "CNG"],
    transmission: ["Manual", "AMT"],
    availability: "2 Units Left",
    isHot: false,
    isLimited: true,
  },
  {
    id: 4,
    name: "Mahindra XUV700",
    image: carXuv700,
    price: "₹14.49 - 26.99 Lakh",
    originalPrice: "₹15.00 Lakh",
    discount: "₹75,000 OFF",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "Ready Stock",
    isHot: true,
    isLimited: false,
  },
  {
    id: 5,
    name: "Kia Seltos",
    image: carSeltos,
    price: "₹10.90 - 20.35 Lakh",
    originalPrice: "₹11.40 Lakh",
    discount: "₹50,000 OFF",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic", "iMT"],
    availability: "Ready Stock",
    isHot: false,
    isLimited: false,
  },
  {
    id: 6,
    name: "Toyota Innova Crysta",
    image: carInnova,
    price: "₹19.99 - 26.30 Lakh",
    originalPrice: "₹20.50 Lakh",
    discount: "₹60,000 OFF",
    fuelTypes: ["Petrol", "Diesel"],
    transmission: ["Manual", "Automatic"],
    availability: "1 Unit Left",
    isHot: false,
    isLimited: true,
  },
];

export const CarListings = () => {
  return (
    <section id="cars" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Hot Deals This Week
            </h2>
            <p className="text-muted-foreground">
              Exclusive discounts on India's most popular cars
            </p>
          </div>
          <Button variant="outline" size="lg">
            View All Cars
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car, index) => (
            <Card
              key={car.id}
              variant="deal"
              className="overflow-hidden animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                <img
                  src={car.image}
                  alt={car.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {car.isHot && (
                    <Badge variant="hot">🔥 Hot Deal</Badge>
                  )}
                  {car.isLimited && (
                    <Badge variant="limited">⚡ {car.availability}</Badge>
                  )}
                </div>
                
                {/* Discount Badge */}
                <div className="absolute top-3 right-3">
                  <Badge variant="deal" className="text-sm py-1 px-3">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {car.discount}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-5">
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                  {car.name}
                </h3>
                
                {/* Price */}
                <div className="mb-4">
                  <span className="text-2xl font-bold text-primary">{car.price}</span>
                  <span className="text-sm text-muted-foreground line-through ml-2">
                    {car.originalPrice}
                  </span>
                </div>

                {/* Specs */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Fuel className="h-4 w-4 text-primary" />
                    <span>{car.fuelTypes.join(" / ")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Cog className="h-4 w-4 text-primary" />
                    <span>{car.transmission[0]}</span>
                  </div>
                  {!car.isLimited && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-success" />
                      <span className="text-success font-medium">{car.availability}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-0 gap-2">
                <Button variant="cta" className="flex-1">
                  Get Best Price
                </Button>
                <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer">
                  <Button variant="whatsapp" size="icon">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </a>
                <a href="tel:+919876543210">
                  <Button variant="outline" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
