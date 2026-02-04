import { cn } from "@/lib/utils";

// Import logo images
import gaurGroupLogo from "@/assets/logos/gaur-group.png";
import empathyRelocationsLogo from "@/assets/logos/empathy-relocations.png";
import sewaHospitalityLogo from "@/assets/logos/sewa-hospitality.png";
import orangeGroupLogo from "@/assets/logos/orange-group.png";
import dewanPublicSchoolLogo from "@/assets/logos/dewan-public-school.png";
import virmaniHospitalLogo from "@/assets/logos/virmani-hospital.png";
import flightNFaresLogo from "@/assets/logos/flight-n-fares.png";
import banshidharGroupLogo from "@/assets/logos/banshidhar-group.png";

interface CorporateClient {
  name: string;
  description: string;
  logo: string;
}

const corporateClients: CorporateClient[] = [
  {
    name: "Gaur Group",
    description: "Leading Real Estate Developer",
    logo: gaurGroupLogo,
  },
  {
    name: "Empathy Relocations LLP",
    description: "Fleet Management Company",
    logo: empathyRelocationsLogo,
  },
  {
    name: "Sewa Hospitality Services",
    description: "Hospitality Services Provider",
    logo: sewaHospitalityLogo,
  },
  {
    name: "Orange Group",
    description: "75+ Year Legacy in Education",
    logo: orangeGroupLogo,
  },
  {
    name: "Dewan Public School",
    description: "Established School Chain",
    logo: dewanPublicSchoolLogo,
  },
  {
    name: "Virmani Hospital",
    description: "Healthcare Institution",
    logo: virmaniHospitalLogo,
  },
  {
    name: "Flight n Fares",
    description: "Travel Services Company",
    logo: flightNFaresLogo,
  },
  {
    name: "Banshidhar Group",
    description: "75+ Year Legacy Business House",
    logo: banshidharGroupLogo,
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
          {corporateClients.map((client) => (
            <div
              key={client.name}
              className={cn(
                "group relative bg-card border border-border/50 rounded-xl p-5 md:p-8",
                "transition-all duration-300 ease-out",
                "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
                "hover:-translate-y-1"
              )}
            >
              {/* Logo Image */}
              <div className="aspect-[4/3] flex items-center justify-center mb-5 p-3">
                <img
                  src={client.logo}
                  alt={`${client.name} logo`}
                  className={cn(
                    "w-full h-full object-contain max-h-28 md:max-h-36",
                    "filter grayscale opacity-70",
                    "transition-all duration-300",
                    "group-hover:grayscale-0 group-hover:opacity-100"
                  )}
                />
              </div>

              <div className="text-center">
                <h3 className="font-heading font-semibold text-foreground text-base md:text-lg mb-1 line-clamp-1">
                  {client.name}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-2">
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
