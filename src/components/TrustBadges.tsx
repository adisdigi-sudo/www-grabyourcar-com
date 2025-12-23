import { Shield, Award, Users, Clock, CheckCircle, Headphones } from "lucide-react";

const trustItems = [
  {
    icon: Shield,
    title: "100% Verified Dealers",
    description: "All our partner dealers are authorized and verified",
  },
  {
    icon: Award,
    title: "Best Price Guarantee",
    description: "We match or beat any genuine dealer quote",
  },
  {
    icon: Users,
    title: "50,000+ Happy Customers",
    description: "Trusted by car buyers across India",
  },
  {
    icon: Clock,
    title: "Zero Waiting Period",
    description: "Ready stock available for popular models",
  },
  {
    icon: CheckCircle,
    title: "No Hidden Charges",
    description: "Transparent pricing, what you see is what you pay",
  },
  {
    icon: Headphones,
    title: "Expert Support",
    description: "Dedicated car experts to guide your purchase",
  },
];

export const TrustBadges = () => {
  return (
    <section className="py-16 md:py-20 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
            Why Choose Grabyourcar?
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
          {trustItems.map((item, index) => (
            <div
              key={item.title}
              className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <item.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground text-sm mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
