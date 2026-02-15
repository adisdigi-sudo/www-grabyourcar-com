import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Shield, Building2, Star, TrendingUp, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import hdfcErgoLogo from "@/assets/insurers/hdfc-ergo.png";
import iciciLombardLogo from "@/assets/insurers/icici-lombard.png";
import bajajAllianzLogo from "@/assets/insurers/bajaj-allianz.png";
import tataAigLogo from "@/assets/insurers/tata-aig.png";
import newIndiaLogo from "@/assets/insurers/new-india.png";
import relianceGeneralLogo from "@/assets/insurers/reliance-general.png";
import unitedIndiaLogo from "@/assets/insurers/united-india.png";
import kotakGeneralLogo from "@/assets/insurers/kotak-general.png";
import nationalInsuranceLogo from "@/assets/insurers/national-insurance.png";
import orientalInsuranceLogo from "@/assets/insurers/oriental-insurance.png";
import sbiGeneralLogo from "@/assets/insurers/sbi-general.png";
import cholaMsLogo from "@/assets/insurers/chola-ms.png";
import futureGeneraliLogo from "@/assets/insurers/future-generali.png";
import iffcoTokioLogo from "@/assets/insurers/iffco-tokio.png";

interface InsurancePartner {
  name: string;
  logo: string;
  id: string;
  claimSettlementRatio: number;
  networkGarages: number;
  rating: number;
  highlight: string;
  tag?: string;
}

const insurancePartners: InsurancePartner[] = [
  { name: "HDFC ERGO", logo: hdfcErgoLogo, id: "hdfc-ergo", claimSettlementRatio: 98.3, networkGarages: 7500, rating: 4.5, highlight: "Fastest claim settlement", tag: "Top Rated" },
  { name: "ICICI Lombard", logo: iciciLombardLogo, id: "icici-lombard", claimSettlementRatio: 97.8, networkGarages: 6800, rating: 4.4, highlight: "24/7 roadside assistance" },
  { name: "Bajaj Allianz", logo: bajajAllianzLogo, id: "bajaj-allianz", claimSettlementRatio: 98.1, networkGarages: 6500, rating: 4.3, highlight: "Zero depreciation cover", tag: "Popular" },
  { name: "Tata AIG", logo: tataAigLogo, id: "tata-aig", claimSettlementRatio: 96.5, networkGarages: 5500, rating: 4.2, highlight: "Comprehensive coverage" },
  { name: "New India", logo: newIndiaLogo, id: "new-india", claimSettlementRatio: 94.2, networkGarages: 8000, rating: 4.0, highlight: "Largest PSU insurer" },
  { name: "Reliance General", logo: relianceGeneralLogo, id: "reliance-general", claimSettlementRatio: 95.8, networkGarages: 4800, rating: 4.1, highlight: "Affordable premiums" },
  { name: "United India", logo: unitedIndiaLogo, id: "united-india", claimSettlementRatio: 93.5, networkGarages: 7200, rating: 3.9, highlight: "Trusted PSU brand" },
  { name: "SBI General", logo: sbiGeneralLogo, id: "sbi-general", claimSettlementRatio: 95.4, networkGarages: 5200, rating: 4.0, highlight: "SBI Group backing", tag: "Trusted" },
  { name: "Kotak General", logo: kotakGeneralLogo, id: "kotak-general", claimSettlementRatio: 96.2, networkGarages: 4200, rating: 4.2, highlight: "Hassle-free claims" },
  { name: "National Insurance", logo: nationalInsuranceLogo, id: "national-insurance", claimSettlementRatio: 92.8, networkGarages: 6000, rating: 3.8, highlight: "Wide network coverage" },
  { name: "Oriental Insurance", logo: orientalInsuranceLogo, id: "oriental-insurance", claimSettlementRatio: 91.5, networkGarages: 5800, rating: 3.7, highlight: "Competitive rates" },
  { name: "Cholamandalam MS", logo: cholaMsLogo, id: "chola-ms", claimSettlementRatio: 94.8, networkGarages: 4500, rating: 4.1, highlight: "Quick online process" },
  { name: "Future Generali", logo: futureGeneraliLogo, id: "future-generali", claimSettlementRatio: 93.2, networkGarages: 3800, rating: 3.9, highlight: "Flexible add-ons" },
  { name: "Iffco Tokio", logo: iffcoTokioLogo, id: "iffco-tokio", claimSettlementRatio: 94.5, networkGarages: 4100, rating: 4.0, highlight: "Rural network strength" },
];

// Top 7 partners for the card section
const topPartners = insurancePartners.slice(0, 7);

function InsurerTooltipContent({ partner }: { partner: InsurancePartner }) {
  return (
    <div className="p-1 min-w-[200px]">
      <div className="font-semibold text-sm mb-2">{partner.name}</div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-chart-2" />
          <span className="text-muted-foreground">Claim Settlement:</span>
          <span className="font-medium text-chart-2">{partner.claimSettlementRatio}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-chart-1" />
          <span className="text-muted-foreground">Network Garages:</span>
          <span className="font-medium">{partner.networkGarages.toLocaleString()}+</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-chart-4 fill-chart-4" />
          <span className="text-muted-foreground">Rating:</span>
          <span className="font-medium">{partner.rating}/5</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-primary font-medium">{partner.highlight}</span>
        </div>
      </div>
    </div>
  );
}

export function InsurancePartnerLogos() {
  const scrollToComparison = () => {
    const comparisonSection = document.getElementById("insurance-comparison");
    if (comparisonSection) {
      comparisonSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      {/* Premium Insurance Partner Cards */}
      <section className="relative py-16 bg-gradient-to-b from-background via-muted/20 to-background overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="container mx-auto px-4 relative z-10">
          {/* Section heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-primary/5 rounded-full px-4 py-1.5 mb-4 border border-primary/10">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-primary tracking-wide uppercase">IRDAI Licensed Partners</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
              Compare <span className="text-primary">20+ Top Insurers</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose from India's most trusted insurance providers with the highest claim settlement ratios
            </p>
          </motion.div>

          {/* Insurance Company Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-12">
            {topPartners.map((partner, index) => (
              <Tooltip key={partner.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -6, scale: 1.03 }}
                    onClick={scrollToComparison}
                    className="relative group cursor-pointer bg-card rounded-2xl border border-border/60 p-5 flex flex-col items-center text-center hover:border-primary/40 hover:shadow-[0_8px_30px_hsl(var(--primary)/0.12)] transition-all duration-300"
                  >
                    {/* Tag badge */}
                    {partner.tag && (
                      <div className="absolute -top-2.5 right-3">
                        <Badge className="text-[9px] px-2 py-0 font-bold shadow-sm">{partner.tag}</Badge>
                      </div>
                    )}

                    {/* Logo */}
                    <div className="w-16 h-16 mb-3 flex items-center justify-center rounded-xl bg-muted/50 group-hover:bg-primary/5 transition-colors p-2">
                      <img
                        src={partner.logo}
                        alt={`${partner.name} logo`}
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    {/* Name */}
                    <h3 className="text-xs font-bold text-foreground mb-1.5 leading-tight">{partner.name}</h3>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-2.5 w-2.5 ${i < Math.floor(partner.rating) ? 'fill-chart-4 text-chart-4' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-0.5">{partner.rating}</span>
                    </div>

                    {/* Claim ratio */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 text-chart-2" />
                      <span className="font-semibold text-chart-2">{partner.claimSettlementRatio}%</span>
                      <span className="text-muted-foreground">Claims</span>
                    </div>

                    {/* Hover glow */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-popover border border-border shadow-xl" sideOffset={8}>
                  <InsurerTooltipContent partner={partner} />
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Scrolling banner of ALL logos */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <div className="overflow-hidden py-4">
              <div className="flex animate-scroll-left gap-10 items-center">
                {[...insurancePartners, ...insurancePartners].map((partner, index) => (
                  <Tooltip key={`scroll-${partner.name}-${index}`}>
                    <TooltipTrigger asChild>
                      <motion.button
                        onClick={scrollToComparison}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex-shrink-0 h-14 w-36 flex items-center justify-center grayscale hover:grayscale-0 opacity-50 hover:opacity-100 transition-all duration-300 cursor-pointer rounded-xl hover:bg-muted/50 hover:shadow-md p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        aria-label={`${partner.name} - ${partner.claimSettlementRatio}% claim settlement`}
                      >
                        <img src={partner.logo} alt={`${partner.name}`} className="max-h-full max-w-full object-contain" />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-popover border border-border shadow-lg" sideOffset={8}>
                      <InsurerTooltipContent partner={partner} />
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
