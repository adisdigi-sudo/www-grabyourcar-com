import { 
  Building2, 
  GraduationCap, 
  Heart, 
  Hotel, 
  Plane, 
  Car, 
  Landmark 
} from "lucide-react";
import { cn } from "@/lib/utils";

const industries = [
  { icon: Building2, name: "Real Estate" },
  { icon: GraduationCap, name: "Education" },
  { icon: Heart, name: "Healthcare" },
  { icon: Hotel, name: "Hospitality" },
  { icon: Plane, name: "Travel" },
  { icon: Car, name: "Fleet Operators" },
  { icon: Landmark, name: "Legacy Business Houses" },
];

export const CorporateIndustries = () => {
  return (
    <section className="py-12 md:py-16 bg-background border-y border-border/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            Industries We Serve
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-4xl mx-auto">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full",
                "bg-secondary/50 border border-border/50",
                "transition-all duration-300",
                "hover:border-primary/30 hover:bg-primary/5"
              )}
            >
              <industry.icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {industry.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
