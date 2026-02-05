import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Youtube, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveLogo } from "@/components/ResponsiveLogo";

const footerLinks = {
  services: [
    { label: "Explore New Cars", href: "/cars" },
    { label: "Compare Cars", href: "/compare" },
    { label: "Car Finance", href: "/car-loans" },
    { label: "Insurance Solutions", href: "/car-insurance" },
    { label: "Corporate & Fleet Sales", href: "/corporate" },
    { label: "Find Nearby Dealers", href: "/dealers" },
  ],
  brands: [
    { label: "Maruti Suzuki", href: "#" },
    { label: "Hyundai", href: "#" },
    { label: "Tata Motors", href: "#" },
    { label: "Mahindra", href: "#" },
    { label: "Kia", href: "#" },
    { label: "Toyota", href: "#" },
  ],
  company: [
    { label: "About Us", href: "#" },
    { label: "About Us", href: "/about" },
    { label: "Partner With Us", href: "/corporate" },
    { label: "Blog", href: "/blog" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Refund Policy", href: "#" },
  ],
};

export const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <a href="/" className="flex items-center mb-4">
              <ResponsiveLogo variant="footer" className="brightness-0 invert" />
            </a>
            <p className="text-xl md:text-2xl font-heading font-bold text-background mb-2">
              Grab Your New Car — Hassle-Free & Memorable
            </p>
            <p className="text-background/70 mb-6 text-sm leading-relaxed">
              India's smarter way to buy new cars. Best Price. Faster Delivery. Zero Hassle. 500+ Happy Customers Trust Us Every Day.
            </p>
            
            {/* Newsletter */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter your email"
                className="bg-background/10 border-background/20 text-background placeholder:text-background/50"
              />
              <Button variant="accent">Subscribe</Button>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading font-semibold mb-4 text-background">Services</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-background/70 hover:text-accent transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Brands */}
          <div>
            <h4 className="font-heading font-semibold mb-4 text-background">Popular Brands</h4>
            <ul className="space-y-3">
              {footerLinks.brands.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-background/70 hover:text-accent transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-heading font-semibold mb-4 text-background">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-background/70 hover:text-accent transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold mb-4 text-background">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-accent mt-1" />
                <div>
                  <a href="tel:+919577200023" className="text-sm text-background/70 hover:text-accent transition-colors">
                    +91 95772 00023
                  </a>
                  <p className="text-xs text-background/50">Mon-Sat, 9am-7pm</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="h-4 w-4 text-accent mt-1" />
                <a 
                  href="https://wa.me/919577200023" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-background/70 hover:text-accent transition-colors"
                >
                  WhatsApp Us
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-accent mt-1" />
                <a href="mailto:hello@grabyourcar.com" className="text-sm text-background/70 hover:text-accent transition-colors">
                  hello@grabyourcar.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-accent mt-1" />
                <p className="text-sm text-background/70">Mumbai, Maharashtra, India</p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-background/50">
              © 2024 Grabyourcar. All rights reserved.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {[Facebook, Instagram, Twitter, Youtube].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-accent transition-colors group"
                >
                  <Icon className="h-5 w-5 text-background/70 group-hover:text-accent-foreground" />
                </a>
              ))}
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-6">
              {footerLinks.legal.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-background/50 hover:text-accent transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
