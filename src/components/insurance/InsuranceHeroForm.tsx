import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Car, Shield, Loader2, Zap, Sparkles, Gift, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { captureInsuranceLead } from "@/lib/insuranceLeadCapture";
import { InsuranceBrandedRedirect } from "./InsuranceBrandedRedirect";

const PARTNER_URL = "https://pbpci.policybazaar.com/?token=o5aMAq6qZ1tLXTODNpDyVbk4MP6pWDnq6hhpN5u%2BmyJLH9wHcj81JpXwkmKwLPBcDQlOpmql%2FtQgJKjQaQBk%2F6h5%2Bh6wxuKCTAtXRNQ1WBN7m6J2EwinhUfoywZ8E%2B%2BJFZQlcTcGh6a4upMh26MliMAXl%2FqWXTt%2B579hIW3zzfAGZ7aSNJ3WTeVCdfy%2FjJGe%2BQa3M6xdyWiN9%2FuvLVHo9A%3D%3D";

const scrollingOffers = [
  { icon: Car, text: "1 Day Free Self-Drive Car" },
  { icon: Sparkles, text: "3 Premium Car Wash Coupons" },
  { icon: Gift, text: "Free Perfumes + 6 Months Shipping" },
  { icon: Star, text: "98.3% Claim Settlement Rate" },
  { icon: Shield, text: "20+ Trusted Insurers" },
  { icon: Zap, text: "Instant Digital Policy in 2 Min" },
];

interface InsuranceHeroFormProps {
  policyType?: string;
  vehicleLabel?: string;
  compact?: boolean;
}

export function InsuranceHeroForm({ policyType = "comprehensive", vehicleLabel = "vehicle", compact = false }: InsuranceHeroFormProps) {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRedirect, setShowRedirect] = useState(false);
  const hasSubmittedRef = useRef(false);

  // Auto-submit when both fields are valid
  useEffect(() => {
    if (hasSubmittedRef.current) return;
    const phoneValid = /^[6-9]\d{9}$/.test(phone);
    const vehicleValid = vehicleNumber.length >= 4;
    if (phoneValid && vehicleValid) {
      hasSubmittedRef.current = true;
      handleSubmit();
    }
  }, [phone, vehicleNumber]);

  const handleSubmit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!vehicleNumber || vehicleNumber.length < 4) {
      toast.error(`Please enter a valid ${vehicleLabel} number`);
      return;
    }

    setIsLoading(true);
    try {
      await captureInsuranceLead({
        phone,
        vehicleNumber,
        policyType,
        source: `insurance_hero_${policyType}`,
      });
    } catch { /* Don't block flow */ }

    const { trackLeadConversion } = await import("@/lib/adTracking");
    trackLeadConversion("insurance_hero", { policyType });

    setIsLoading(false);
    setShowRedirect(true);
    toast.success("Redirecting you to get your quotes 🎉");
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
        <div className="bg-card rounded-2xl border-2 border-primary/20 p-4 md:p-5 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.15)] hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.25)] transition-all duration-300 space-y-3">
          {/* Vehicle Number */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <Input
              placeholder={`Enter ${vehicleLabel} number (e.g. DL01AB1234)`}
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              className="border-0 shadow-none focus-visible:ring-0 text-sm md:text-lg h-12 md:h-14 bg-transparent uppercase placeholder:normal-case placeholder:text-muted-foreground/50 font-bold tracking-wide"
              autoFocus
            />
          </div>

          <div className="border-t border-border/50" />

          {/* Phone Number */}
          <div className="flex items-center gap-3 px-2">
            <div className="flex items-center bg-muted rounded-xl px-3 py-2.5 text-sm font-bold text-muted-foreground shrink-0">+91</div>
            <Input
              type="tel"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="border-0 shadow-none focus-visible:ring-0 text-sm md:text-lg h-12 md:h-14 bg-transparent placeholder:text-muted-foreground/50 font-bold"
            />
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          {[
            { icon: Shield, text: "100% Secure" },
            { icon: Zap, text: "Instant Results" },
            { icon: Star, text: "20+ Insurers" },
          ].map((badge) => (
            <div key={badge.text} className="flex items-center gap-1.5">
              <badge.icon className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{badge.text}</span>
            </div>
          ))}
        </div>

        {/* Scrolling Offers Strip */}
        {!compact && (
          <>
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-muted/30">
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />
              <div className="flex animate-scroll-left items-center gap-8 py-3.5 px-4 whitespace-nowrap">
                {[...scrollingOffers, ...scrollingOffers, ...scrollingOffers].map((offer, i) => (
                  <div key={i} className="flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <offer.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-foreground/80">{offer.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>

      <InsuranceBrandedRedirect
        open={showRedirect}
        onClose={() => setShowRedirect(false)}
        redirectUrl={PARTNER_URL}
        planName={vehicleNumber}
        premium={policyType === "comprehensive" ? "Best Price Guaranteed" : undefined}
      />
    </div>
  );
}
