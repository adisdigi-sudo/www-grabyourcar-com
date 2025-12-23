import { SearchBar } from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Award, Users, CheckCircle } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          alt="Premium car showroom"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/50" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-16 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <Badge variant="trust" className="mb-6 py-2 px-4 text-sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Trusted by 50,000+ Car Buyers Pan-India
          </Badge>

          {/* Main Heading */}
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-card mb-6 leading-tight">
            Buy Your New Car at the{" "}
            <span className="text-accent">Best Price</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-card/80 mb-8 max-w-2xl mx-auto">
            No Waiting Period • Pan-India Dealer Network • Exclusive Discounts
          </p>

          {/* Search Bar */}
          <SearchBar />

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-12">
            <div className="flex items-center gap-3 text-card/90">
              <div className="w-12 h-12 rounded-full bg-card/10 backdrop-blur-sm flex items-center justify-center">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <div className="text-left">
                <p className="font-heading font-semibold">100% Verified</p>
                <p className="text-sm text-card/70">Authorized Dealers</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-card/90">
              <div className="w-12 h-12 rounded-full bg-card/10 backdrop-blur-sm flex items-center justify-center">
                <Award className="h-6 w-6 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-heading font-semibold">Best Price</p>
                <p className="text-sm text-card/70">Guaranteed Deals</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-card/90">
              <div className="w-12 h-12 rounded-full bg-card/10 backdrop-blur-sm flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-heading font-semibold">500+ Dealers</p>
                <p className="text-sm text-card/70">Across India</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 50L48 45.7C96 41.3 192 32.7 288 29.2C384 25.7 480 27.3 576 33.3C672 39.3 768 49.7 864 52.5C960 55.3 1056 50.7 1152 47.2C1248 43.7 1344 41.3 1392 40.2L1440 39V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
};
