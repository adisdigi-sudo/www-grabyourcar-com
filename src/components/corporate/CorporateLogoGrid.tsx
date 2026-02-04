import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

const LogoCard = ({ client, index }: { client: CorporateClient; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    viewport={{ once: true }}
    className={cn(
      "group relative flex-shrink-0 w-64 md:w-72",
      "bg-gradient-to-br from-card via-card to-secondary/30",
      "border border-border/50 rounded-2xl p-6",
      "transition-all duration-500 ease-out",
      "hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30",
      "hover:-translate-y-2 hover:scale-105"
    )}
  >
    {/* Glow effect on hover */}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    
    {/* Decorative corner accent */}
    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/10 to-transparent rounded-tr-2xl rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    {/* Logo Container */}
    <div className="relative aspect-[3/2] flex items-center justify-center mb-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/30">
      <img
        src={client.logo}
        alt={`${client.name} logo`}
        className={cn(
          "w-full h-full object-contain max-h-24",
          "filter grayscale opacity-60",
          "transition-all duration-500",
          "group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110"
        )}
      />
    </div>

    {/* Text Content */}
    <div className="relative text-center">
      <h3 className="font-heading font-bold text-foreground text-base mb-1 line-clamp-1 group-hover:text-primary transition-colors duration-300">
        {client.name}
      </h3>
      <p className="text-muted-foreground text-sm line-clamp-2">
        {client.description}
      </p>
    </div>

    {/* Bottom accent line */}
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full group-hover:w-3/4 transition-all duration-500" />
  </motion.div>
);

export const CorporateLogoGrid = () => {
  // Double the clients for seamless infinite scroll
  const duplicatedClients = [...corporateClients, ...corporateClients];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background via-secondary/20 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-1.5 mb-4 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full border border-primary/20">
            Trusted Partners
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Organizations That{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Trust Us
            </span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Partnering with industry leaders to deliver exceptional automotive solutions
          </p>
        </motion.div>

        {/* Infinite Scroll Marquee */}
        <div className="relative">
          {/* Gradient Overlays for fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          {/* First Row - Scrolling Left */}
          <div className="flex gap-6 mb-6 animate-scroll-left">
            {duplicatedClients.map((client, index) => (
              <LogoCard key={`row1-${client.name}-${index}`} client={client} index={index % corporateClients.length} />
            ))}
          </div>

          {/* Second Row - Scrolling Right (reverse) */}
          <div className="flex gap-6 animate-scroll-right">
            {[...duplicatedClients].reverse().map((client, index) => (
              <LogoCard key={`row2-${client.name}-${index}`} client={client} index={index % corporateClients.length} />
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16"
        >
          {[
            { value: "8+", label: "Enterprise Clients" },
            { value: "70+", label: "Vehicles Delivered" },
            { value: "100%", label: "Satisfaction Rate" },
          ].map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
