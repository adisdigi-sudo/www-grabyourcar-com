import { Card } from "@/components/ui/card";
import { 
  Car, 
  Clock, 
  GitCompare, 
  Shield, 
  Banknote, 
  Building2, 
  CarFront, 
  Package 
} from "lucide-react";

const categories = [
  {
    icon: Car,
    title: "New Cars",
    description: "Pan-India Deals from Authorized Dealers",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Clock,
    title: "Zero Waiting",
    description: "Ready Stock Cars Available Now",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: GitCompare,
    title: "Compare Offers",
    description: "Best Deals from Multiple Dealers",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Shield,
    title: "Car Insurance",
    description: "Best Rates from Top Insurers",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Banknote,
    title: "Car Loans",
    description: "Easy Finance from Banks & NBFCs",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Building2,
    title: "Corporate Buying",
    description: "Bulk Deals for Businesses",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: CarFront,
    title: "Self-Drive Rentals",
    description: "Coming Soon",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  {
    icon: Package,
    title: "Accessories",
    description: "HSRP Frames & More",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
];

export const CategoryGrid = () => {
  // Duplicate categories for seamless infinite scroll
  const duplicatedCategories = [...categories, ...categories];

  return (
    <section className="py-12 md:py-16 bg-secondary/50 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <div className="text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
            Everything You Need to Buy Your Car
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            From finding the best deals to financing and insurance — we've got you covered
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-4 animate-scroll hover:pause-animation">
          {duplicatedCategories.map((category, index) => (
            <Card
              key={`${category.title}-${index}`}
              variant="deal"
              className="flex-shrink-0 w-40 md:w-48 p-4 cursor-pointer group"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg ${category.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <category.icon className={`h-5 w-5 md:h-6 md:w-6 ${category.color}`} />
              </div>
              <h3 className="font-heading font-semibold text-foreground text-sm md:text-base mb-1">
                {category.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {category.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};