import { SearchBar } from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Shield, Award, Users, CheckCircle, Sparkles, MessageCircle, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import heroBg from "@/assets/hero-bg.jpg";

// Import banner images - Grabyourcar Service Banners
import banner1 from "@/assets/banners/banner-1.png";
import banner2 from "@/assets/banners/banner-2.png";
import banner3 from "@/assets/banners/banner-3.png";
import banner4 from "@/assets/banners/banner-4.png";
import banner5 from "@/assets/banners/banner-5.png";
import banner6 from "@/assets/banners/banner-6.png";
import banner7 from "@/assets/banners/banner-7.png";
import banner8 from "@/assets/banners/banner-8.png";

const banners = [
  { id: 1, src: banner1, alt: "New Cars - Pan-India Deals", link: "/cars" },
  { id: 2, src: banner2, alt: "No Waiting Period Cars", link: "/cars?filter=no-waiting" },
  { id: 3, src: banner3, alt: "Compare Car Offers", link: "/compare" },
  { id: 4, src: banner4, alt: "Car Insurance", link: "/car-insurance" },
  { id: 5, src: banner5, alt: "Car Loans - Banks & NBFCs", link: "/car-loans" },
  { id: 6, src: banner6, alt: "Corporate & Bulk Buying", link: "/corporate" },
  { id: 7, src: banner7, alt: "Self-Drive Rentals - Coming Soon", link: "/self-drive" },
  { id: 8, src: banner8, alt: "Accessories & HSRP Frames", link: "/accessories" },
];

export const HeroSection = () => {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Premium Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          alt="Premium car showroom"
          className="w-full h-full object-cover"
        />
        {/* Multi-layer premium gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/80 to-foreground/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-foreground/30" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-20 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          {/* Trust Badge - More Premium */}
          <Badge variant="trust" className="mb-6 py-2.5 px-5 text-sm border-2 border-success/30 backdrop-blur-sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Trusted by <AnimatedCounter value={50000} suffix="+" /> Car Buyers Across India
          </Badge>

          {/* Main Heading - Stronger Tagline */}
          <h1 className="font-heading text-4xl md:text-5xl lg:text-7xl font-bold text-card mb-4 leading-tight tracking-tight">
            India's <span className="text-success">Smarter</span> Way to{" "}
            <br className="hidden md:block" />
            Buy New Cars
          </h1>

          {/* Subheading - Value Props */}
          <p className="text-lg md:text-2xl text-card/90 mb-4 max-w-3xl mx-auto font-medium">
            Best Price. Faster Delivery. Zero Hassle.
          </p>
          
          {/* USP Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mb-8">
            <Badge variant="outline" className="bg-card/10 backdrop-blur-sm text-card border-card/30 py-1.5 px-3">
              <Zap className="h-3.5 w-3.5 mr-1.5 text-accent" />
              No Waiting Period
            </Badge>
            <Badge variant="outline" className="bg-card/10 backdrop-blur-sm text-card border-card/30 py-1.5 px-3">
              <Shield className="h-3.5 w-3.5 mr-1.5 text-success" />
              500+ Verified Dealers
            </Badge>
            <Badge variant="outline" className="bg-card/10 backdrop-blur-sm text-card border-card/30 py-1.5 px-3">
              <Award className="h-3.5 w-3.5 mr-1.5 text-primary-foreground" />
              Exclusive Discounts
            </Badge>
          </div>

          {/* Promotional Banner Carousel */}
          <div className="mb-8 max-w-5xl mx-auto">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 3000,
                  stopOnInteraction: false,
                  stopOnMouseEnter: true,
                }),
              ]}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {banners.map((banner) => (
                  <CarouselItem key={banner.id} className="pl-2 md:pl-4 basis-full md:basis-1/3">
                    <Link to={banner.link} className="group block">
                      <div className="relative overflow-hidden rounded-xl shadow-lg border border-card/20 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl">
                        <img 
                          src={banner.src} 
                          alt={banner.alt} 
                          className="w-full h-32 md:h-36 object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              {/* Carousel Indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {banners.map((_, index) => (
                  <div
                    key={index}
                    className="w-2 h-2 rounded-full bg-card/40 transition-all duration-300"
                  />
                ))}
              </div>
            </Carousel>
          </div>

          {/* Search Bar */}
          <SearchBar />

          {/* CTA Buttons Row */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/car-finder">
              <Button variant="accent" size="lg" className="gap-2 text-base px-6 py-6 font-semibold hover:scale-105 transition-transform shadow-lg">
                <Sparkles className="h-5 w-5" />
                Find Your Perfect Car
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a 
              href="https://wa.me/919855924442?text=Hi%20Grabyourcar!%20I%20want%20to%20know%20the%20best%20price%20for%20a%20new%20car." 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button 
                variant="whatsapp" 
                size="lg" 
                className="gap-2 text-base px-6 py-6 font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                <MessageCircle className="h-5 w-5" />
                Unlock Best Price
              </Button>
            </a>
          </div>
          <p className="text-sm text-card/60 mt-3">Get AI-powered recommendations in seconds</p>

          {/* Trust Indicators - Premium Design */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-3 text-card/90">
              <div className="w-14 h-14 rounded-2xl bg-card/10 backdrop-blur-sm flex items-center justify-center border border-card/20">
                <Shield className="h-7 w-7 text-success" />
              </div>
              <div className="text-left">
                <p className="font-heading font-bold text-lg">
                  <AnimatedCounter value={100} suffix="%" /> Verified
                </p>
                <p className="text-sm text-card/70">Authorized Dealers</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-card/90">
              <div className="w-14 h-14 rounded-2xl bg-card/10 backdrop-blur-sm flex items-center justify-center border border-card/20">
                <Award className="h-7 w-7 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-heading font-bold text-lg">Best Price</p>
                <p className="text-sm text-card/70">Guaranteed Deals</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-card/90">
              <div className="w-14 h-14 rounded-2xl bg-card/10 backdrop-blur-sm flex items-center justify-center border border-card/20">
                <Users className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-heading font-bold text-lg">
                  <AnimatedCounter value={500} suffix="+" /> Dealers
                </p>
                <p className="text-sm text-card/70">Pan-India Network</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave - Smoother */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 60L48 55C96 50 192 40 288 35C384 30 480 30 576 38C672 46 768 62 864 68C960 74 1056 70 1152 62C1248 54 1344 42 1392 36L1440 30V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0V60Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
};
