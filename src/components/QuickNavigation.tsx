import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Car, CreditCard, Shield, Package, Building2, CarFront,
  RectangleHorizontal, MapPin, Brain, Newspaper, GitCompare,
  FileText, BookOpen, Info, Sparkles, Clock, ArrowRight,
} from "lucide-react";

const navGroups = [
  {
    title: "Buy a Car",
    items: [
      { label: "Explore New Cars", href: "/cars", icon: Car, desc: "Browse 50+ brands" },
      { label: "Zero Waiting Cars", href: "/no-waiting-cars", icon: Clock, desc: "Ready stock available" },
      { label: "Compare Offers", href: "/compare", icon: GitCompare, desc: "Side-by-side comparison" },
      { label: "Best Deals", href: "/best-car-deals", icon: Sparkles, desc: "Exclusive discounts" },
    ],
  },
  {
    title: "Finance & Insurance",
    items: [
      { label: "Car Loans", href: "/car-loans", icon: CreditCard, desc: "Rates from 8.5%" },
      { label: "Car Insurance", href: "/car-insurance", icon: Shield, desc: "Save up to 25%" },
      { label: "Corporate Buying", href: "/corporate", icon: Building2, desc: "Fleet & bulk deals" },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Self-Drive Rentals", href: "/self-drive", icon: CarFront, desc: "Premium cars on rent" },
      { label: "HSRP Plates", href: "/hsrp", icon: RectangleHorizontal, desc: "Book online" },
      { label: "Accessories", href: "/accessories", icon: Package, desc: "HSRP frames & more" },
      { label: "Find Dealers", href: "/dealers", icon: MapPin, desc: "Nearest showrooms" },
    ],
  },
  {
    title: "Research",
    items: [
      { label: "Auto Intelligence", href: "/auto-intelligence", icon: Brain, desc: "AI-powered insights" },
      { label: "Auto News", href: "/auto-news", icon: Newspaper, desc: "Latest updates" },
      { label: "Upcoming Cars", href: "/upcoming-cars", icon: Car, desc: "New launches 2025" },
      { label: "Features & Specs", href: "/features-specs", icon: FileText, desc: "Detailed specs" },
      { label: "Blog", href: "/blog", icon: BookOpen, desc: "Tips & guides" },
      { label: "About Us", href: "/about", icon: Info, desc: "Our story" },
    ],
  },
];

export const QuickNavigation = () => {
  return (
    <section className="py-10 md:py-14 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, amount: 0.2 }}
          className="text-center mb-8"
        >
          <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2">
            Quick Navigation
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Jump to any section of GrabYourCar in one click
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {navGroups.map((group, gi) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: gi * 0.08 }}
              viewport={{ once: true, amount: 0.2 }}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="px-4 py-3 bg-muted/50 border-b">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
              </div>
              <div className="p-1.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
