import { motion } from "framer-motion";

const insurancePartners = [
  { name: "HDFC ERGO", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/HDFC_Bank_Logo.svg/200px-HDFC_Bank_Logo.svg.png" },
  { name: "ICICI Lombard", logo: "https://www.icicilombard.com/content/dam/icicilombard/logos/ICICI-Lombard-logo.svg" },
  { name: "Bajaj Allianz", logo: "https://www.bajajallianz.com/content/dam/bagic/logos/bagic-logo.svg" },
  { name: "Tata AIG", logo: "https://www.tataaig.com/static/images/logo/TATA-AIG-Logo.svg" },
  { name: "New India", logo: "https://www.newindia.co.in/logo_1.png" },
  { name: "Reliance General", logo: "https://www.reliancegeneral.co.in/SiteAssets/RGI-Logo.svg" },
  { name: "United India", logo: "https://uiic.co.in/sites/default/files/UIICLogo2.jpg" },
  { name: "Kotak General", logo: "https://www.kotakgeneral.com/content/dam/kotakgeneral/footer/kotak-general-logo.svg" },
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
                className="flex-shrink-0 h-10 w-32 flex items-center justify-center grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
              >
                <div className="text-lg font-semibold text-muted-foreground">
                  {partner.name}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
