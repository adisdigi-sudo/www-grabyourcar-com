import { cn } from "@/lib/utils";

interface CorporateClient {
  name: string;
  description: string;
  logo: string;
}

const corporateClients: CorporateClient[] = [
  {
    name: "Gaur Group",
    description: "Leading Real Estate Developer",
    logo: "/logos/gaur-group.png",
  },
  {
    name: "Empathy Relocations LLP",
    description: "Fleet Management Company",
    logo: "/logos/empathy-relocations.png",
  },
  {
    name: "Sewa Hospitality Services",
    description: "Hospitality Services Provider",
    logo: "/logos/sewa-hospitality.png",
  },
  {
    name: "Orange Group",
    description: "75+ Year Legacy in Education",
    logo: "/logos/orange-group.png",
  },
  {
    name: "Dewan Public School",
    description: "Established School Chain",
    logo: "/logos/dewan-public-school.png",
  },
  {
    name: "Virmani Hospital",
    description: "Healthcare Institution",
    logo: "/logos/virmani-hospital.png",
  },
  {
    name: "Flight n Fares",
    description: "Travel Services Company",
    logo: "/logos/flight-n-fares.png",
  },
  {
    name: "Banshidhar Group",
    description: "75+ Year Legacy Tobacco Company",
    logo: "/logos/banshidhar-group.png",
  },
];

export const CorporateLogoGrid = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Organizations That Trust Us
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Partnering with industry leaders to deliver exceptional automotive solutions
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto">
          {corporateClients.map((client) => (
            <div
              key={client.name}
              className={cn(
                "group relative bg-card border border-border/50 rounded-xl p-6 md:p-8",
                "transition-all duration-300 ease-out",
                "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
                "hover:-translate-y-1"
              )}
            >
              {/* Logo placeholder - styled as professional monogram */}
              <div className="aspect-[3/2] flex items-center justify-center mb-4">
                <div 
                  className={cn(
                    "w-full h-full rounded-lg flex items-center justify-center",
                    "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700",
                    "transition-all duration-300",
                    "group-hover:from-primary/10 group-hover:to-primary/5"
                  )}
                >
                  <span 
                    className={cn(
                      "font-heading font-bold text-2xl md:text-3xl",
                      "text-slate-400 dark:text-slate-500",
                      "transition-colors duration-300",
                      "group-hover:text-primary"
                    )}
                  >
                    {client.name.split(' ').map(word => word[0]).slice(0, 2).join('')}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <h3 className="font-heading font-semibold text-foreground text-sm md:text-base mb-1 line-clamp-1">
                  {client.name}
                </h3>
                <p className="text-muted-foreground text-xs md:text-sm line-clamp-2">
                  {client.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
