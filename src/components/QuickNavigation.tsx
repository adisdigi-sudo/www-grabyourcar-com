import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Building2,
  Car,
  CarFront,
  Clock,
  CreditCard,
  FileText,
  GitCompare,
  Info,
  MapPin,
  Newspaper,
  Package,
  RectangleHorizontal,
  Shield,
  Sparkles,
} from "lucide-react";

const navGroups = [
  {
    title: "Buy a Car",
    eyebrow: "Discovery",
    items: [
      { label: "Explore New Cars", href: "/cars", icon: Car, desc: "Browse 50+ brands" },
      { label: "Zero Waiting Cars", href: "/no-waiting-cars", icon: Clock, desc: "Ready stock available" },
      { label: "Compare Offers", href: "/compare", icon: GitCompare, desc: "Side-by-side comparison" },
      { label: "Best Deals", href: "/best-car-deals", icon: Sparkles, desc: "Exclusive discounts" },
    ],
  },
  {
    title: "Finance & Insurance",
    eyebrow: "Ownership",
    items: [
      { label: "Car Loans", href: "/car-loans", icon: CreditCard, desc: "EMI plans & approvals" },
      { label: "Car Insurance", href: "/car-insurance", icon: Shield, desc: "Save on renewals" },
      { label: "Corporate Buying", href: "/corporate", icon: Building2, desc: "Fleet & bulk deals" },
    ],
  },
  {
    title: "Services",
    eyebrow: "Support",
    items: [
      { label: "Self-Drive Rentals", href: "/self-drive", icon: CarFront, desc: "Premium cars on rent" },
      { label: "HSRP Plates", href: "/hsrp", icon: RectangleHorizontal, desc: "Book online" },
      { label: "Accessories", href: "/accessories", icon: Package, desc: "Premium add-ons" },
      { label: "Find Dealers", href: "/dealers", icon: MapPin, desc: "Nearest showrooms" },
    ],
  },
  {
    title: "Research",
    eyebrow: "Insights",
    items: [
      { label: "Auto Intelligence", href: "/auto-intelligence", icon: Brain, desc: "AI-powered insights" },
      { label: "Auto News", href: "/auto-news", icon: Newspaper, desc: "Latest updates" },
      { label: "Upcoming Cars", href: "/upcoming-cars", icon: Car, desc: "New launches" },
      { label: "Features & Specs", href: "/features-specs", icon: FileText, desc: "Detailed specs" },
      { label: "Blog", href: "/blog", icon: BookOpen, desc: "Tips & guides" },
      { label: "About Us", href: "/about", icon: Info, desc: "Our story" },
    ],
  },
];

export const QuickNavigation = () => {
  return (
    <section className="bg-background py-6 md:py-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, amount: 0.2 }}
          className="overflow-hidden rounded-[2rem] border border-border bg-gradient-card shadow-card"
        >
          <div className="border-b border-border bg-muted/40 px-5 py-5 md:px-8 md:py-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  All Navigation
                </p>
                <h2 className="text-balance font-heading text-2xl font-bold text-foreground md:text-3xl">
                  Explore every service right below our Services section
                </h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
                  Jump directly into buying, finance, insurance, rentals, research, and support from one rich navigation panel.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:min-w-[18rem]">
                <div className="rounded-2xl border border-border bg-background px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sections</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">4</div>
                </div>
                <div className="rounded-2xl border border-border bg-background px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quick Links</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">17</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px bg-border lg:grid-cols-4">
            {navGroups.map((group, groupIndex) => (
              <motion.div
                key={group.title}
                initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: groupIndex * 0.08, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true, amount: 0.2 }}
                className="bg-background p-4 md:p-5"
              >
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {group.eyebrow}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{group.title}</h3>
                </div>

                <div className="space-y-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="group flex items-center gap-3 rounded-2xl border border-transparent bg-muted/40 px-3 py-3 transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:border-border hover:bg-background hover:shadow-md active:scale-[0.98]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <item.icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {item.label}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
                      </div>

                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};