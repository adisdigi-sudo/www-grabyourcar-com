import { motion } from "framer-motion";

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

const insurancePartners = [
  { name: "HDFC ERGO", logo: hdfcErgoLogo, id: "hdfc-ergo" },
  { name: "ICICI Lombard", logo: iciciLombardLogo, id: "icici-lombard" },
  { name: "Bajaj Allianz", logo: bajajAllianzLogo, id: "bajaj-allianz" },
  { name: "Tata AIG", logo: tataAigLogo, id: "tata-aig" },
  { name: "New India", logo: newIndiaLogo, id: "new-india" },
  { name: "Reliance General", logo: relianceGeneralLogo, id: "reliance-general" },
  { name: "United India", logo: unitedIndiaLogo, id: "united-india" },
  { name: "Kotak General", logo: kotakGeneralLogo, id: "kotak-general" },
  { name: "National Insurance", logo: nationalInsuranceLogo, id: "national-insurance" },
  { name: "Oriental Insurance", logo: orientalInsuranceLogo, id: "oriental-insurance" },
  { name: "SBI General", logo: sbiGeneralLogo, id: "sbi-general" },
  { name: "Cholamandalam MS", logo: cholaMsLogo, id: "chola-ms" },
  { name: "Future Generali", logo: futureGeneraliLogo, id: "future-generali" },
  { name: "Iffco Tokio", logo: iffcoTokioLogo, id: "iffco-tokio" },
];

export function InsurancePartnerLogos() {
  const scrollToComparison = (insurerId: string) => {
    // Scroll to the comparison section
    const comparisonSection = document.getElementById("insurance-comparison");
    if (comparisonSection) {
      comparisonSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="py-8 border-y border-border/50 bg-muted/30">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-6">
          Trusted by leading insurance providers — Click to compare
        </p>
        <div className="relative overflow-hidden">
          <div className="flex animate-scroll-left gap-12 items-center">
            {[...insurancePartners, ...insurancePartners].map((partner, index) => (
              <motion.button
                key={`${partner.name}-${index}`}
                onClick={() => scrollToComparison(partner.id)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.98 }}
                className="flex-shrink-0 h-16 w-40 flex items-center justify-center grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300 cursor-pointer rounded-lg hover:bg-background/50 hover:shadow-md p-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label={`View ${partner.name} insurance quotes`}
              >
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
