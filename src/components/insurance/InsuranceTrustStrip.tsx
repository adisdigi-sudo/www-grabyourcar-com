import { motion } from "framer-motion";
import { Shield, Lock, Award, CheckCircle2, BadgeCheck } from "lucide-react";

/**
 * Reusable trust strip with IRDAI badge, security seals, and GrabYourCar branding.
 * Can be placed between any sections on the insurance page.
 */

interface InsuranceTrustStripProps {
  variant?: "full" | "compact" | "watermark";
}

const trustItems = [
  { icon: Shield, label: "IRDAI Authorised", sublabel: "Reg. Partner" },
  { icon: Lock, label: "256-bit SSL", sublabel: "Encrypted" },
  { icon: Award, label: "ISO 27001", sublabel: "Certified" },
  { icon: BadgeCheck, label: "50,000+", sublabel: "Customers" },
];

export function InsuranceTrustStrip({ variant = "full" }: InsuranceTrustStripProps) {
  if (variant === "watermark") {
    return (
      <div className="py-6 flex justify-center">
        <div className="flex items-center gap-2 opacity-40">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
            Secured by GrabYourCar • IRDAI Authorised • Adis Makethemoney Services Pvt Ltd
          </span>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 py-4">
        {trustItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <item.icon className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // Full variant — branded bar
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="bg-primary/[0.03] border-y border-primary/10"
    >
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-10">
          {/* GrabYourCar branding anchor */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-foreground leading-tight">GrabYourCar</p>
              <p className="text-[10px] text-muted-foreground">Authorised Insurance Partner</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-border" />

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-5 md:gap-8">
            {trustItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground leading-tight">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
