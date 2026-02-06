import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Building2, Award, CheckCircle2 } from "lucide-react";

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
  industry: string;
}

const corporateClients: CorporateClient[] = [
  {
    name: "Gaur Group",
    description: "Leading Real Estate Developer",
    logo: gaurGroupLogo,
    industry: "Real Estate",
  },
  {
    name: "Empathy Relocations LLP",
    description: "Fleet Management Company",
    logo: empathyRelocationsLogo,
    industry: "Logistics",
  },
  {
    name: "Sewa Hospitality Services",
    description: "Hospitality Services Provider",
    logo: sewaHospitalityLogo,
    industry: "Hospitality",
  },
  {
    name: "Orange Group",
    description: "75+ Year Legacy in Education",
    logo: orangeGroupLogo,
    industry: "Education",
  },
  {
    name: "Dewan Public School",
    description: "Established School Chain",
    logo: dewanPublicSchoolLogo,
    industry: "Education",
  },
  {
    name: "Virmani Hospital",
    description: "Healthcare Institution",
    logo: virmaniHospitalLogo,
    industry: "Healthcare",
  },
  {
    name: "Flight n Fares",
    description: "Travel Services Company",
    logo: flightNFaresLogo,
    industry: "Travel",
  },
  {
    name: "Banshidhar Group",
    description: "75+ Year Legacy Business House",
    logo: banshidharGroupLogo,
    industry: "Conglomerate",
  },
];

const LogoCard = ({ client, index }: { client: CorporateClient; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.95 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay: index * 0.08 }}
    viewport={{ once: true }}
    className={cn(
      "group relative flex-shrink-0 w-72 md:w-80",
      "bg-gradient-to-br from-card via-card to-primary/5",
      "border-2 border-primary/20 rounded-3xl",
      "transition-all duration-500 ease-out overflow-hidden",
      "hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/50",
      "hover:-translate-y-3 hover:scale-[1.02]"
    )}
  >
    {/* Premium gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
    
    {/* Decorative corner accent */}
    <div className="absolute top-0 right-0 w-24 h-24">
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-[100px]" />
      <div className="absolute top-3 right-3">
        <CheckCircle2 className="w-5 h-5 text-primary" />
      </div>
    </div>

    {/* Industry Badge */}
    <div className="absolute top-4 left-4 z-10">
      <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-full shadow-lg">
        {client.industry}
      </span>
    </div>

    {/* Logo Container */}
    <div className="relative pt-14 pb-4 px-6">
      <div className="relative aspect-[3/2] flex items-center justify-center p-6 rounded-2xl bg-background/80 backdrop-blur-sm border border-border/50 shadow-inner">
        <img
          src={client.logo}
          alt={`${client.name} logo`}
          className={cn(
            "w-full h-full object-contain max-h-20",
            "transition-all duration-500",
            "group-hover:scale-110"
          )}
        />
        {/* Logo glow effect on hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </div>

    {/* Text Content */}
    <div className="relative px-6 pb-6">
      <h3 className="font-heading font-bold text-foreground text-lg mb-1.5 line-clamp-1 group-hover:text-primary transition-colors duration-300">
        {client.name}
      </h3>
      <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
        {client.description}
      </p>
      
      {/* Verified Partner Badge */}
      <div className="mt-4 flex items-center gap-2 text-xs text-primary font-medium">
        <Award className="w-4 h-4" />
        <span>Verified Corporate Partner</span>
      </div>
    </div>

    {/* Bottom accent bar */}
    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
  </motion.div>
);

export const CorporateLogoGrid = () => {
  // Double the clients for seamless infinite scroll
  const duplicatedClients = [...corporateClients, ...corporateClients];

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-secondary/30 via-background to-secondary/20 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16 md:mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2 mb-6 text-sm font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full border border-primary/20"
          >
            <Building2 className="w-4 h-4" />
            Trusted Corporate Partners
          </motion.div>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5">
            Organizations That{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-accent">
              Trust Us
            </span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Partnering with industry leaders to deliver exceptional automotive solutions with unmatched reliability
          </p>
        </motion.div>

        {/* Infinite Scroll Marquee */}
        <div className="relative">
          {/* Gradient Overlays for fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

          {/* First Row - Scrolling Left */}
          <div className="flex gap-8 mb-8 animate-scroll-left">
            {duplicatedClients.map((client, index) => (
              <LogoCard key={`row1-${client.name}-${index}`} client={client} index={index % corporateClients.length} />
            ))}
          </div>

          {/* Second Row - Scrolling Right (reverse) */}
          <div className="flex gap-8 animate-scroll-right">
            {[...duplicatedClients].reverse().map((client, index) => (
              <LogoCard key={`row2-${client.name}-${index}`} client={client} index={index % corporateClients.length} />
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto"
        >
          {[
            { value: "8+", label: "Enterprise Clients", icon: Building2 },
            { value: "70+", label: "Vehicles Delivered", icon: CheckCircle2 },
            { value: "100%", label: "Satisfaction Rate", icon: Award },
          ].map((stat, index) => (
            <motion.div 
              key={stat.label} 
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              viewport={{ once: true }}
              className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
