import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Shield, Building2, Star, TrendingUp } from "lucide-react";

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
}

const insurancePartners: InsurancePartner[] = [
  { 
    name: "HDFC ERGO", 
    logo: hdfcErgoLogo, 
    id: "hdfc-ergo",
    claimSettlementRatio: 98.3,
    networkGarages: 7500,
    rating: 4.5,
    highlight: "Fastest claim settlement"
  },
  { 
    name: "ICICI Lombard", 
    logo: iciciLombardLogo, 
    id: "icici-lombard",
    claimSettlementRatio: 97.8,
    networkGarages: 6800,
    rating: 4.4,
    highlight: "24/7 roadside assistance"
  },
  { 
    name: "Bajaj Allianz", 
    logo: bajajAllianzLogo, 
    id: "bajaj-allianz",
    claimSettlementRatio: 98.1,
    networkGarages: 6500,
    rating: 4.3,
    highlight: "Zero depreciation cover"
  },
  { 
    name: "Tata AIG", 
    logo: tataAigLogo, 
    id: "tata-aig",
    claimSettlementRatio: 96.5,
    networkGarages: 5500,
    rating: 4.2,
    highlight: "Comprehensive coverage"
  },
  { 
    name: "New India", 
    logo: newIndiaLogo, 
    id: "new-india",
    claimSettlementRatio: 94.2,
    networkGarages: 8000,
    rating: 4.0,
    highlight: "Largest PSU insurer"
  },
  { 
    name: "Reliance General", 
    logo: relianceGeneralLogo, 
    id: "reliance-general",
    claimSettlementRatio: 95.8,
    networkGarages: 4800,
    rating: 4.1,
    highlight: "Affordable premiums"
  },
  { 
    name: "United India", 
    logo: unitedIndiaLogo, 
    id: "united-india",
    claimSettlementRatio: 93.5,
    networkGarages: 7200,
    rating: 3.9,
    highlight: "Trusted PSU brand"
  },
  { 
    name: "Kotak General", 
    logo: kotakGeneralLogo, 
    id: "kotak-general",
    claimSettlementRatio: 96.2,
    networkGarages: 4200,
    rating: 4.2,
    highlight: "Hassle-free claims"
  },
  { 
    name: "National Insurance", 
    logo: nationalInsuranceLogo, 
    id: "national-insurance",
    claimSettlementRatio: 92.8,
    networkGarages: 6000,
    rating: 3.8,
    highlight: "Wide network coverage"
  },
  { 
    name: "Oriental Insurance", 
    logo: orientalInsuranceLogo, 
    id: "oriental-insurance",
    claimSettlementRatio: 91.5,
    networkGarages: 5800,
    rating: 3.7,
    highlight: "Competitive rates"
  },
  { 
    name: "SBI General", 
    logo: sbiGeneralLogo, 
    id: "sbi-general",
    claimSettlementRatio: 95.4,
    networkGarages: 5200,
    rating: 4.0,
    highlight: "SBI Group backing"
  },
  { 
    name: "Cholamandalam MS", 
    logo: cholaMsLogo, 
    id: "chola-ms",
    claimSettlementRatio: 94.8,
    networkGarages: 4500,
    rating: 4.1,
    highlight: "Quick online process"
  },
  { 
    name: "Future Generali", 
    logo: futureGeneraliLogo, 
    id: "future-generali",
    claimSettlementRatio: 93.2,
    networkGarages: 3800,
    rating: 3.9,
    highlight: "Flexible add-ons"
  },
  { 
    name: "Iffco Tokio", 
    logo: iffcoTokioLogo, 
    id: "iffco-tokio",
    claimSettlementRatio: 94.5,
    networkGarages: 4100,
    rating: 4.0,
    highlight: "Rural network strength"
  },
];

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
  const scrollToComparison = (insurerId: string) => {
    const comparisonSection = document.getElementById("insurance-comparison");
    if (comparisonSection) {
      comparisonSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <section className="py-8 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Trusted by leading insurance providers — Hover for details, click to compare
          </p>
          <div className="relative overflow-hidden">
            <div className="flex animate-scroll-left gap-12 items-center">
              {[...insurancePartners, ...insurancePartners].map((partner, index) => (
                <Tooltip key={`${partner.name}-${index}`}>
                  <TooltipTrigger asChild>
                    <motion.button
                      onClick={() => scrollToComparison(partner.id)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-shrink-0 h-16 w-40 flex items-center justify-center grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300 cursor-pointer rounded-lg hover:bg-background/50 hover:shadow-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      aria-label={`View ${partner.name} insurance quotes - ${partner.claimSettlementRatio}% claim settlement`}
                    >
                      <img
                        src={partner.logo}
                        alt={`${partner.name} logo`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="bg-popover border border-border shadow-lg"
                    sideOffset={8}
                  >
                    <InsurerTooltipContent partner={partner} />
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}