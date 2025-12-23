import { Phone, MessageCircle, Menu, X, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navLinks = [
  { label: "New Cars", href: "#cars" },
  { label: "Compare", href: "#compare" },
  { label: "Offers", href: "#offers" },
  { label: "Car Loans", href: "#loans" },
  { label: "Insurance", href: "#insurance" },
];

export const Header = () => {
  // Header is sticky below the promo banner
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Car className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-xl md:text-2xl text-foreground">
              Grab<span className="text-accent">your</span>car
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer">
              <Button variant="whatsapp" size="sm" className="hidden md:flex">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>
            <a href="tel:+919876543210">
              <Button variant="call" size="sm" className="hidden md:flex">
                <Phone className="h-4 w-4" />
                Call Now
              </Button>
            </a>
            <Button variant="cta" size="sm">
              Get Best Deal
            </Button>
            
            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex gap-2 mt-4 px-4">
                <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="whatsapp" className="w-full">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
                <a href="tel:+919876543210" className="flex-1">
                  <Button variant="call" className="w-full">
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                </a>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
