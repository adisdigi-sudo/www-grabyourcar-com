import { SearchBar } from "@/components/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Shield, Award, Users, CheckCircle, Sparkles, MessageCircle, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { PremiumBannerCarousel } from "@/components/PremiumBannerCarousel";
import heroBg from "@/assets/hero-bg.jpg";
import logoImage from "@/assets/logo-grabyourcar-main.png";

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
          {/* Logo Watermark for Brand Authority */}
          <div className="flex justify-center mb-6">
            <img 
              src={logoImage} 
              alt="GrabYourCar" 
              className="h-14 md:h-16 lg:h-20 w-auto brightness-0 invert opacity-90 drop-shadow-2xl"
            />
          </div>

          {/* Trust Badge - More Premium */}
          <Badge variant="trust" className="mb-6 py-2.5 px-5 text-sm border-2 border-success/30 backdrop-blur-sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            500+ Happy Customers Trust Us Every Day
          </Badge>

          {/* Main Heading - Stronger Tagline */}
          <h1 className="font-heading text-4xl md:text-5xl lg:text-7xl font-bold text-card mb-4 leading-tight tracking-tight">
            Grab Your <span className="text-success">New Car</span>{" "}
            <br className="hidden md:block" />
            Hassle-Free & Memorable
          </h1>

          {/* Subheading - Value Props */}
          <p className="text-lg md:text-2xl text-card/90 mb-4 max-w-3xl mx-auto font-medium">
            India's Smarter Way to Buy New Cars
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

          {/* Premium Service Banner Carousel */}
          <div className="mb-8">
            <PremiumBannerCarousel />
          </div>

          {/* Search Bar */}
          <SearchBar />

           {/* CTA Button */}
           <div className="mt-8 flex justify-center">
             <a 
               href="https://wa.me/919577200023?text=Hi%20Grabyourcar!%20I%27m%20interested%20in%20buying%20a%20new%20car%20and%20would%20like%20to%20speak%20with%20an%20expert." 
               target="_blank" 
               rel="noopener noreferrer"
             >
               <Button 
                 variant="accent" 
                 size="lg" 
                 className="gap-2 text-base px-8 py-6 font-semibold hover:scale-105 transition-transform shadow-xl"
               >
                 <MessageCircle className="h-5 w-5" />
                 Talk to Our Expert
                 <ArrowRight className="h-4 w-4" />
               </Button>
             </a>
           </div>
           <p className="text-sm text-card/60 mt-3">Get personalized car recommendations instantly</p>

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
