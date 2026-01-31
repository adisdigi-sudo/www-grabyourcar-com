import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Clock, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export const CarFinanceHero = () => {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Deep Navy Radial Gradient Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse at center, #003366 0%, #001B3D 70%, #000d1f 100%)"
        }}
      />

      {/* Circuit Board Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 z-[1] opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 229, 255, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.3) 1px, transparent 1px),
            linear-gradient(rgba(0, 229, 255, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 229, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px"
        }}
      />

      {/* Horizontal Cyan Light Streaks */}
      <div className="absolute inset-0 z-[2] overflow-hidden">
        {/* Primary streak - center */}
        <div 
          className="absolute left-0 right-0 h-[2px] top-1/2 -translate-y-1/2"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #00E5FF 20%, #00E5FF 50%, #00E5FF 80%, transparent 100%)",
            boxShadow: "0 0 60px 20px rgba(0, 229, 255, 0.4), 0 0 120px 40px rgba(0, 229, 255, 0.2)",
            filter: "blur(1px)"
          }}
        />
        {/* Secondary streak - above */}
        <div 
          className="absolute left-[10%] right-[20%] h-[1px] top-[40%]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #00E5FF 30%, #00E5FF 70%, transparent 100%)",
            boxShadow: "0 0 40px 10px rgba(0, 229, 255, 0.3)",
            filter: "blur(1px)",
            opacity: 0.6
          }}
        />
        {/* Tertiary streak - below */}
        <div 
          className="absolute left-[20%] right-[10%] h-[1px] top-[60%]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, #00E5FF 30%, #00E5FF 70%, transparent 100%)",
            boxShadow: "0 0 40px 10px rgba(0, 229, 255, 0.3)",
            filter: "blur(1px)",
            opacity: 0.5
          }}
        />
      </div>

      {/* Glow orbs for depth */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full z-[1]"
        style={{
          background: "radial-gradient(circle, rgba(0, 229, 255, 0.1) 0%, transparent 70%)",
          filter: "blur(60px)"
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full z-[1]"
        style={{
          background: "radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, transparent 70%)",
          filter: "blur(40px)"
        }}
      />

      {/* Content Container */}
      <div className="container mx-auto px-4 relative z-10 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Brand Badge */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #00E5FF 0%, #0088CC 100%)",
                boxShadow: "0 0 30px rgba(0, 229, 255, 0.5)"
              }}
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
            <span 
              className="text-xl font-heading font-bold tracking-wider"
              style={{ color: "#00E5FF" }}
            >
              GRABYOURCAR
            </span>
          </div>

          {/* Main Headline */}
          <h2 
            className="font-heading font-extrabold text-3xl md:text-5xl lg:text-6xl uppercase tracking-tight mb-4 text-white"
            style={{ textShadow: "0 0 40px rgba(255, 255, 255, 0.2)" }}
          >
            Same Day Loan Disbursement
          </h2>

          {/* Sub-headline with highlighted zero */}
          <p className="text-xl md:text-2xl lg:text-3xl font-heading font-semibold mb-8 text-white/90">
            Get <span style={{ color: "#F58220" }} className="font-extrabold text-3xl md:text-4xl">0</span>% Processing Fee
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <div className="flex items-center gap-2 text-white/80 text-sm md:text-base">
              <Zap className="h-5 w-5" style={{ color: "#00E5FF" }} />
              <span>Instant Approval</span>
            </div>
            <div className="w-px h-5 bg-white/20 hidden md:block" />
            <div className="flex items-center gap-2 text-white/80 text-sm md:text-base">
              <Clock className="h-5 w-5" style={{ color: "#00E5FF" }} />
              <span>24-Hour Disbursement</span>
            </div>
            <div className="w-px h-5 bg-white/20 hidden md:block" />
            <div className="flex items-center gap-2 text-white/80 text-sm md:text-base">
              <Shield className="h-5 w-5" style={{ color: "#00E5FF" }} />
              <span>100% Secure Process</span>
            </div>
          </div>

          {/* CTA Button and Badge Container */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12">
            {/* Apply Now Button */}
            <Link to="/car-loans">
              <Button 
                className="text-lg md:text-xl font-bold px-10 py-7 rounded-[4px] uppercase tracking-wide transition-all duration-300 hover:scale-105"
                style={{
                  background: "#F58220",
                  color: "white",
                  boxShadow: "0 0 30px rgba(245, 130, 32, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)"
                }}
              >
                Apply Now
              </Button>
            </Link>

            {/* Instant Approval Seal */}
            <div 
              className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center"
            >
              <div 
                className="absolute inset-0 rounded-full border-2 border-white/80 animate-pulse"
                style={{
                  boxShadow: "0 0 20px rgba(0, 229, 255, 0.3), inset 0 0 20px rgba(0, 229, 255, 0.1)"
                }}
              />
              <div className="text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-1" style={{ color: "#00E5FF" }} />
                <span className="text-[10px] md:text-xs font-bold text-white uppercase leading-tight block">
                  Instant<br/>Approval
                </span>
              </div>
            </div>
          </div>

          {/* Car Image with Motion Effect */}
          <div className="relative mx-auto max-w-3xl">
            {/* Motion blur effect behind car */}
            <div 
              className="absolute inset-x-0 bottom-0 h-20"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(0, 229, 255, 0.2) 20%, rgba(0, 229, 255, 0.3) 50%, rgba(0, 229, 255, 0.2) 80%, transparent 100%)",
                filter: "blur(20px)",
                transform: "scaleX(1.2)"
              }}
            />
            {/* Placeholder for car image - using SVG representation */}
            <div className="relative z-10">
              <svg 
                viewBox="0 0 400 150" 
                className="w-full max-w-2xl mx-auto drop-shadow-2xl"
                style={{
                  filter: "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 60px rgba(0, 229, 255, 0.2))"
                }}
              >
                {/* Simplified luxury car silhouette */}
                <defs>
                  <linearGradient id="carGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#4a5568", stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: "#1a202c", stopOpacity: 1 }} />
                  </linearGradient>
                  <linearGradient id="windowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#00E5FF", stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: "#003366", stopOpacity: 0.8 }} />
                  </linearGradient>
                </defs>
                {/* Car body */}
                <path 
                  d="M40 100 L60 70 L120 55 L280 55 L340 70 L360 100 L360 110 L40 110 Z" 
                  fill="url(#carGradient)"
                />
                {/* Windows */}
                <path 
                  d="M70 70 L120 58 L200 58 L200 70 L130 70 Z" 
                  fill="url(#windowGradient)"
                />
                <path 
                  d="M210 58 L280 58 L330 70 L200 70 L200 58 Z" 
                  fill="url(#windowGradient)"
                />
                {/* Wheels */}
                <circle cx="100" cy="110" r="25" fill="#1a202c" />
                <circle cx="100" cy="110" r="20" fill="#2d3748" />
                <circle cx="100" cy="110" r="10" fill="#4a5568" />
                <circle cx="300" cy="110" r="25" fill="#1a202c" />
                <circle cx="300" cy="110" r="20" fill="#2d3748" />
                <circle cx="300" cy="110" r="10" fill="#4a5568" />
                {/* Headlights */}
                <ellipse cx="355" cy="85" rx="8" ry="5" fill="#00E5FF" opacity="0.8" />
                <ellipse cx="45" cy="85" rx="8" ry="5" fill="#F58220" opacity="0.6" />
              </svg>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-10 text-white/60 text-xs md:text-sm">
            <span>✓ RBI Registered Partners</span>
            <span>✓ 50+ Bank Tie-ups</span>
            <span>✓ 1 Lakh+ Happy Customers</span>
          </div>
        </div>
      </div>
    </section>
  );
};
