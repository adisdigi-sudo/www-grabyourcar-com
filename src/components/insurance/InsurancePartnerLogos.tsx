import { motion } from "framer-motion";

import hdfcErgoLogo from "@/assets/insurers/hdfc-ergo.png";
import iciciLombardLogo from "@/assets/insurers/icici-lombard.png";
import bajajAllianzLogo from "@/assets/insurers/bajaj-allianz.png";
import tataAigLogo from "@/assets/insurers/tata-aig.png";
import newIndiaLogo from "@/assets/insurers/new-india.png";
import relianceGeneralLogo from "@/assets/insurers/reliance-general.png";
import unitedIndiaLogo from "@/assets/insurers/united-india.png";
import kotakGeneralLogo from "@/assets/insurers/kotak-general.png";

const insurancePartners = [
  { name: "HDFC ERGO", logo: hdfcErgoLogo },
  { name: "ICICI Lombard", logo: iciciLombardLogo },
  { name: "Bajaj Allianz", logo: bajajAllianzLogo },
  { name: "Tata AIG", logo: tataAigLogo },
  { name: "New India", logo: newIndiaLogo },
  { name: "Reliance General", logo: relianceGeneralLogo },
  { name: "United India", logo: unitedIndiaLogo },
  { name: "Kotak General", logo: kotakGeneralLogo },
];

export function InsurancePartnerLogos() {
  return (
    <section className="py-8 border-y border-border/50 bg-muted/30">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-muted-foreground mb-6">
          Trusted by leading insurance providers
        </p>
        <div className="relative overflow-hidden">
          <div className="flex animate-scroll-left gap-12 items-center">
            {[...insurancePartners, ...insurancePartners].map((partner, index) => (
              <motion.div
                key={`${partner.name}-${index}`}
                whileHover={{ scale: 1.05 }}
                className="flex-shrink-0 h-16 w-40 flex items-center justify-center grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300"
              >
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  className="max-h-full max-w-full object-contain"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
