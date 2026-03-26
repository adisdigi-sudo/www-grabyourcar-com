import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  BadgePercent, Car, Shield, Wrench, CreditCard, 
  FileText, Sparkles, ArrowRight, Tag, Zap, Gift
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface CrossSellOffer {
  id: string;
  title: string;
  subtitle: string;
  price?: string;
  originalPrice?: string;
  badge?: string;
  icon: React.ReactNode;
  href: string;
  ctaText: string;
  gradient: string;
  highlight?: boolean;
}

// All available cross-sell offers
const allOffers: CrossSellOffer[] = [
  {
    id: "hsrp-frame",
    title: "Premium HSRP Frame",
    subtitle: "Add style to your number plate",
    price: "₹49",
    originalPrice: "₹199",
    badge: "75% OFF",
    icon: <FileText className="h-5 w-5" />,
    href: "/hsrp?addon=frame",
    ctaText: "Add to Booking",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    highlight: true,
  },
  {
    id: "car-loan",
    title: "Hassle-Free Car Loan",
    subtitle: "Lowest EMI, instant approval",
    badge: "8.5% Interest",
    icon: <CreditCard className="h-5 w-5" />,
    href: "/car-loans",
    ctaText: "Check Eligibility",
    gradient: "from-blue-500/20 to-blue-600/10",
  },
  {
    id: "car-insurance",
    title: "Comprehensive Insurance",
    subtitle: "Zero paperwork, instant policy",
    badge: "Save ₹5000",
    icon: <Shield className="h-5 w-5" />,
    href: "/car-insurance",
    ctaText: "Get Quote",
    gradient: "from-purple-500/20 to-purple-600/10",
  },
  {
    id: "accessories",
    title: "Car Accessories",
    subtitle: "Genuine accessories at best prices",
    badge: "Up to 40% OFF",
    icon: <Wrench className="h-5 w-5" />,
    href: "/accessories",
    ctaText: "Shop Now",
    gradient: "from-amber-500/20 to-amber-600/10",
  },
  {
    id: "extended-warranty",
    title: "Extended Warranty",
    subtitle: "3 years extra peace of mind",
    price: "₹9,999",
    originalPrice: "₹14,999",
    badge: "Best Value",
    icon: <Sparkles className="h-5 w-5" />,
    href: "/cars?warranty=extended",
    ctaText: "Learn More",
    gradient: "from-rose-500/20 to-rose-600/10",
  },
  {
    id: "self-drive",
    title: "Try Before You Buy",
    subtitle: "Self-drive rental for test experience",
    badge: "From ₹999/day",
    icon: <Car className="h-5 w-5" />,
    href: "/self-drive-rentals",
    ctaText: "Book Test Drive",
    gradient: "from-teal-500/20 to-teal-600/10",
  },
  {
    id: "hsrp-booking",
    title: "HSRP Number Plate",
    subtitle: "Home delivery available in NCR",
    badge: "Govt. Approved",
    icon: <FileText className="h-5 w-5" />,
    href: "/hsrp",
    ctaText: "Book Now",
    gradient: "from-green-500/20 to-green-600/10",
  },
  {
    id: "finance-promo",
    title: "100% On-Road Financing",
    subtitle: "Zero down payment available",
    badge: "Limited Offer",
    icon: <BadgePercent className="h-5 w-5" />,
    href: "/car-loans",
    ctaText: "Apply Now",
    gradient: "from-indigo-500/20 to-indigo-600/10",
    highlight: true,
  },
];

// Context-based offer filtering
const contextOffers: Record<string, string[]> = {
  carDetail: ["hsrp-frame", "car-loan", "car-insurance", "extended-warranty"],
  hsrp: ["car-loan", "car-insurance", "accessories"],
  insurance: ["car-loan", "hsrp-booking", "extended-warranty"],
  loans: ["car-insurance", "hsrp-booking", "extended-warranty"],
  accessories: ["hsrp-frame", "car-insurance", "extended-warranty"],
  rentals: ["car-loan", "car-insurance", "hsrp-booking"],
  home: ["hsrp-frame", "car-loan", "car-insurance", "self-drive"],
  default: ["hsrp-frame", "car-loan", "car-insurance"],
};

interface CrossSellWidgetProps {
  context?: keyof typeof contextOffers;
  excludeIds?: string[];
  maxItems?: number;
  layout?: "horizontal" | "vertical" | "compact" | "compact-grid";
  title?: string;
  showTitle?: boolean;
}

export function CrossSellWidget({
  context = "default",
  excludeIds = [],
  maxItems = 3,
  layout = "horizontal",
  title = "Complete Your Purchase",
  showTitle = true,
}: CrossSellWidgetProps) {
  const offerIds = contextOffers[context] || contextOffers.default;
  const offers = allOffers
    .filter((o) => offerIds.includes(o.id) && !excludeIds.includes(o.id))
    .slice(0, maxItems);

  if (offers.length === 0) return null;

  // 2x2 branded icon grid for mobile
  if (layout === "compact-grid") {
    return (
      <div className="space-y-3">
        {showTitle && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-success/10 rounded-lg">
              <Zap className="h-4 w-4 text-success" />
            </div>
            <h3 className="font-bold text-base">{title}</h3>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {offers.map((offer, index) => (
            <Link key={offer.id} to={offer.href}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="relative group rounded-xl border border-border/60 bg-card p-4 hover:border-success/50 hover:shadow-md transition-all active:scale-[0.97] h-full"
              >
                {offer.badge && (
                  <Badge className="absolute -top-2 -right-1 text-[9px] px-1.5 py-0 bg-success text-success-foreground shadow-sm z-10">
                    {offer.badge}
                  </Badge>
                )}
                <div className="flex flex-col items-center text-center gap-2.5">
                  <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center text-success group-hover:scale-110 transition-transform">
                    {offer.icon}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-xs leading-tight line-clamp-2">{offer.title}</h4>
                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">{offer.subtitle}</p>
                  </div>
                  {offer.price && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-success">{offer.price}</span>
                      {offer.originalPrice && (
                        <span className="text-[10px] text-muted-foreground line-through">{offer.originalPrice}</span>
                      )}
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-success flex items-center gap-0.5">
                    {offer.ctaText} <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (layout === "compact") {
    return (
      <div className="space-y-3">
        {showTitle && (
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm">{title}</h4>
          </div>
        )}
        <div className="space-y-2">
          {offers.map((offer) => (
            <Link key={offer.id} to={offer.href}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {offer.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{offer.title}</span>
                    {offer.badge && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        {offer.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{offer.subtitle}</p>
                </div>
                {offer.price && (
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-primary">{offer.price}</span>
                    {offer.originalPrice && (
                      <span className="text-xs text-muted-foreground line-through ml-1">
                        {offer.originalPrice}
                      </span>
                    )}
                  </div>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="py-8">
      {showTitle && (
        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-bold">{title}</h3>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            Recommended
          </Badge>
        </div>
      )}

      <div
        className={
          layout === "vertical"
            ? "space-y-4"
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        }
      >
        {offers.map((offer, index) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={offer.href}>
              <Card
                className={`group h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-gradient-to-br ${offer.gradient} ${
                  offer.highlight ? "ring-2 ring-primary/30" : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      {offer.icon}
                    </div>
                    {offer.badge && (
                      <Badge
                        className={
                          offer.highlight
                            ? "bg-primary text-primary-foreground"
                            : "bg-background/80"
                        }
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {offer.badge}
                      </Badge>
                    )}
                  </div>

                  <h4 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">
                    {offer.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">{offer.subtitle}</p>

                  <div className="flex items-center justify-between">
                    {offer.price ? (
                      <div>
                        <span className="text-xl font-bold text-primary">{offer.price}</span>
                        {offer.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through ml-2">
                            {offer.originalPrice}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span />
                    )}
                    <Button size="sm" variant={offer.highlight ? "default" : "outline"} className="gap-1">
                      {offer.ctaText}
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// Inline cross-sell strip for checkout/booking flows
export function CrossSellStrip({
  offers,
  onAdd,
}: {
  offers?: CrossSellOffer[];
  onAdd?: (offerId: string) => void;
}) {
  const displayOffers = offers || allOffers.filter((o) => o.highlight).slice(0, 2);

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Add to Your Order</span>
        <Badge variant="secondary" className="text-[10px]">
          Special Offers
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayOffers.map((offer) => (
          <div
            key={offer.id}
            className="flex items-center gap-3 p-3 bg-background/80 rounded-lg border border-border/50"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {offer.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm">{offer.title}</span>
                {offer.badge && (
                  <Badge className="text-[9px] px-1 py-0 bg-primary text-primary-foreground">
                    {offer.badge}
                  </Badge>
                )}
              </div>
              {offer.price && (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-primary">{offer.price}</span>
                  {offer.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {offer.originalPrice}
                    </span>
                  )}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs h-8"
              onClick={() => onAdd?.(offer.id)}
            >
              + Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
