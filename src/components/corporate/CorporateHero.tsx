import { Button } from "@/components/ui/button";
import { Phone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { PHONE_NUMBER } from "@/config/contact";

// Import logos for inline strip
import gaurGroupLogo from "@/assets/logos/gaur-group.png";
import empathyRelocationsLogo from "@/assets/logos/empathy-relocations.png";
import sewaHospitalityLogo from "@/assets/logos/sewa-hospitality.png";
import orangeGroupLogo from "@/assets/logos/orange-group.png";
import dewanPublicSchoolLogo from "@/assets/logos/dewan-public-school.png";
import virmaniHospitalLogo from "@/assets/logos/virmani-hospital.png";
import flightNFaresLogo from "@/assets/logos/flight-n-fares.png";
import banshidharGroupLogo from "@/assets/logos/banshidhar-group.png";

const logos = [
  { src: gaurGroupLogo, alt: "Gaur Group" },
  { src: empathyRelocationsLogo, alt: "Empathy Relocations" },
  { src: sewaHospitalityLogo, alt: "Sewa Hospitality" },
  { src: orangeGroupLogo, alt: "Orange Group" },
  { src: dewanPublicSchoolLogo, alt: "Dewan Public School" },
  { src: virmaniHospitalLogo, alt: "Virmani Hospital" },
  { src: flightNFaresLogo, alt: "Flight n Fares" },
  { src: banshidharGroupLogo, alt: "Banshidhar Group" },
];

const stats = [
  { value: "50+", label: "Corporate Clients" },
  { value: "70+", label: "Vehicles Delivered" },
  { value: "100%", label: "Satisfaction Rate" },
];

export const CorporateHero = () => {
  const scrollToCTA = () => {
    document.getElementById("corporate-cta")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative py-20 md:py-28 lg:py-36 overflow-hidden">
      {/* Dark authoritative background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight"
          >
            Streamlined Fleet Procurement{" "}
            <span className="text-primary">for Modern Enterprises</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            One partner for all brands. Volume pricing, dedicated account management, 
            and pan-India delivery — from inquiry to keys in 2 weeks.
          </motion.p>

          {/* Dual CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          >
            <Button
              onClick={scrollToCTA}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 py-6 rounded-xl shadow-lg shadow-primary/25 gap-2"
            >
              Get Corporate Quote
              <ArrowRight className="h-5 w-5" />
            </Button>
            <a href={`tel:${PHONE_NUMBER}`}>
              <Button
                variant="outline"
                size="lg"
                className="border-slate-600 text-white hover:bg-slate-800 hover:text-white text-base px-8 py-6 rounded-xl gap-2"
              >
                <Phone className="h-5 w-5" />
                Talk to Our Team
              </Button>
            </a>
          </motion.div>

          {/* Trust Stats — single line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex items-center justify-center gap-8 md:gap-12 mb-14"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">{s.value}</div>
                <div className="text-xs md:text-sm text-slate-400 font-medium">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Inline Logo Strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-6">
              Trusted by leading organizations
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
              {logos.map((logo) => (
                <img
                  key={logo.alt}
                  src={logo.src}
                  alt={`${logo.alt} logo`}
                  className="h-8 md:h-10 w-auto object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
