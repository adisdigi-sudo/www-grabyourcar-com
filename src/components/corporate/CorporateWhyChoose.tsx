import { 
  Zap, 
  BadgePercent, 
  HeadphonesIcon, 
  Truck, 
  Globe, 
  FileCheck, 
  Shield 
} from "lucide-react";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Zap,
    title: "Priority Vehicle Allocation",
    description: "Skip the queue with dedicated inventory access for corporate orders",
  },
  {
    icon: BadgePercent,
    title: "Competitive Corporate Pricing",
    description: "Exclusive bulk discounts and special fleet rates unavailable elsewhere",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Relationship Support",
    description: "Personal account manager assigned to handle all your requirements",
  },
  {
    icon: Truck,
    title: "Fast Delivery Timelines",
    description: "Expedited processing and delivery for time-sensitive business needs",
  },
  {
    icon: Globe,
    title: "Pan-India Dealer Network",
    description: "Seamless delivery and service support across all major cities",
  },
  {
    icon: FileCheck,
    title: "End-to-End Documentation",
    description: "Complete paperwork handling from registration to compliance",
  },
  {
    icon: Shield,
    title: "Finance & Insurance Assistance",
    description: "Tailored financing options and comprehensive coverage solutions",
  },
];

export const CorporateWhyChoose = () => {
  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Corporates Choose Grabyourcar
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Enterprise-grade solutions designed for organizational efficiency
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className={cn(
                "group bg-card border border-border/50 rounded-xl p-6",
                "transition-all duration-300 ease-out",
                "hover:shadow-md hover:border-primary/20",
                // Center the last item if odd count
                index === benefits.length - 1 && benefits.length % 3 === 1 && "lg:col-start-2"
              )}
            >
              <div 
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  "bg-primary/10 text-foreground",
                  "transition-all duration-300",
                  "group-hover:bg-primary group-hover:text-primary-foreground"
                )}
              >
                <benefit.icon className="h-6 w-6" />
              </div>

              <h3 className="font-heading font-semibold text-foreground text-lg mb-2">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
