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
  return (
    <section className="py-16 md:py-24 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Buy Your Car
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From finding the best deals to financing and insurance — we've got you covered
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <Card
              key={category.title}
              variant="deal"
              className="p-6 cursor-pointer group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl ${category.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <category.icon className={`h-7 w-7 ${category.color}`} />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1">
                {category.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
