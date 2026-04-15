import { forwardRef } from "react";
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin, MessageCircle } from "lucide-react";
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
    { label: "About Us", href: "/about" },
    { label: "Partner With Us", href: "/corporate" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Refund Policy", href: "#" },
  ],
};

export const Footer = forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"footer">>((props, ref) => {
  const { className, ...restProps } = props;

  return (
    <footer ref={ref} className={className ?? "bg-foreground text-background"} {...restProps}>
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Side - Logo & Brand Info */}
          <div className="lg:col-span-4 space-y-5">
            {/* Logo at Top */}
            <a href="/" className="inline-block">
              <ResponsiveLogo variant="footer" className="brightness-0 invert" />
            </a>
            
            {/* Tagline */}
            <p className="text-sm font-medium text-background/90">
              New Car — Hassle-Free & Memorable
            </p>
            
            {/* Description */}
            <p className="text-background/60 text-sm leading-relaxed">
              India's smarter way to buy new cars. Best Price. Faster Delivery. Zero Hassle. 500+ Happy Customers Trust Us Every Day.
            </p>
            
            {/* Newsletter */}
            <div className="pt-2">
              <p className="text-sm font-medium text-background/80 mb-3">Subscribe to Updates</p>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Enter your email"
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/50 min-w-0 flex-1"
                />
                <Button variant="accent" className="flex-shrink-0">Subscribe</Button>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              {[
                { Icon: Facebook, href: "https://www.facebook.com/share/p/188WKuB8zv/" },
                { Icon: Instagram, href: "https://www.instagram.com/grabyourcar_?igsh=MW9wM2V4N2I1Z2lodg==" },
                { Icon: MessageCircle, href: "https://whatsapp.com/channel/0029VaDndBYGpLHSSmJs551A" },
                { Icon: Linkedin, href: "https://www.linkedin.com/company/grabyourcar/" },
              ].map(({ Icon, href }, index) => (
                <a
                  key={index}
                  href={href}
                  className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-accent transition-colors group"
                >
                  <Icon className="h-5 w-5 text-background/70 group-hover:text-accent-foreground" />
                </a>
              ))}
            </div>
          </div>

          {/* Right Side - All Links in a Grid */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
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

              {/* Popular Brands */}
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

              {/* Contact Us */}
              <div>
                <h4 className="font-heading font-semibold mb-4 text-background">Contact Us</h4>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                    <div>
                     <a href="tel:+1155578093" className="text-sm text-background/70 hover:text-accent transition-colors">
                        +1 155578093
                      </a>
                      <p className="text-xs text-background/50">Mon-Sat, 9am-7pm</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageCircle className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                     <a 
                      href="https://wa.me/1155578093" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-background/70 hover:text-accent transition-colors"
                    >
                      WhatsApp Us
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                    <a href="mailto:hello@grabyourcar.com" className="text-sm text-background/70 hover:text-accent transition-colors">
                      hello@grabyourcar.com
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-background/70">MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana – 122001</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-background/50">
              © 2025 Adis Makethemoney Services Pvt Ltd. All rights reserved. | Trading as Grabyourcar
            </p>
            
            {/* Legal Links */}
            <div className="flex flex-wrap justify-center md:justify-end items-center gap-3 md:gap-6">
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
});

Footer.displayName = "Footer";
