import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Shield, Building2, Star, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";

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
    const el = document.getElementById("insurance-comparison");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <section className="relative py-20 md:py-28 bg-background overflow-hidden">
        {/* Acko-style clean background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.06),transparent)]" />

        <div className="container mx-auto px-4 relative z-10">
          {/* Section heading — Acko-style bold & clean */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-4 leading-tight">
              Compare plans from <span className="text-primary">20+ top insurers</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              India's most trusted insurance providers with the highest claim settlement ratios — all in one place
            </p>
          </motion.div>

          {/* Insurance Company Cards Grid — Acko-style large clean cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-5 mb-16">
            {topPartners.map((partner, index) => (
              <Tooltip key={partner.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06, duration: 0.5 }}
                    whileHover={{ y: -8 }}
                    onClick={scrollToComparison}
                    className="relative group cursor-pointer"
                  >
                    <div className="bg-card rounded-3xl border border-border/70 p-6 flex flex-col items-center text-center hover:border-primary/50 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.15)] transition-all duration-500 h-full">
                      {/* Tag */}
                      {partner.tag && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="text-[10px] font-bold bg-primary text-primary-foreground px-3 py-1 rounded-full shadow-md whitespace-nowrap">{partner.tag}</span>
                        </div>
                      )}

                      {/* Logo */}
                      <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-2xl bg-muted/40 group-hover:bg-primary/5 transition-colors duration-300 p-3">
                        <img
                          src={partner.logo}
                          alt={`${partner.name} logo`}
                          className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      {/* Name */}
                      <h3 className="text-sm font-bold text-foreground mb-2 leading-tight">{partner.name}</h3>

                      {/* Rating */}
                      <div className="flex items-center gap-0.5 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < Math.floor(partner.rating) ? 'fill-chart-4 text-chart-4' : 'text-muted-foreground/20'}`}
                          />
                        ))}
                      </div>

                      {/* Claim ratio badge */}
                      <div className="flex items-center gap-1.5 bg-chart-2/10 rounded-full px-3 py-1.5">
                        <CheckCircle2 className="h-3 w-3 text-chart-2" />
                        <span className="text-[11px] font-bold text-chart-2">{partner.claimSettlementRatio}%</span>
                      </div>

                      {/* Arrow button — Acko style */}
                      <div className="mt-4 w-9 h-9 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                      </div>
                    </div>
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
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <div className="overflow-hidden py-6 border-y border-border/40">
              <div className="flex animate-scroll-left gap-12 items-center">
                {[...insurancePartners, ...insurancePartners].map((partner, index) => (
                  <Tooltip key={`scroll-${partner.name}-${index}`}>
                    <TooltipTrigger asChild>
                      <motion.button
                        onClick={scrollToComparison}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex-shrink-0 h-14 w-36 flex items-center justify-center grayscale hover:grayscale-0 opacity-40 hover:opacity-100 transition-all duration-500 cursor-pointer rounded-xl hover:bg-muted/50 p-2.5 focus:outline-none"
                        aria-label={`${partner.name} - ${partner.claimSettlementRatio}% claim settlement`}
                      >
                        <img src={partner.logo} alt={partner.name} className="max-h-full max-w-full object-contain" />
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
