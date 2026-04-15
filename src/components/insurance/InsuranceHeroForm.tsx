import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Shield, Loader2, Zap, Sparkles, Gift, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { captureInsuranceLead } from "@/lib/insuranceLeadCapture";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_PARTNER_URL = "https://pbpci.policybazaar.com/?token=o5aMAq6qZ1tLXTODNpDyVbk4MP6pWDnq6hhpN5u%2BmyJLH9wHcj81JpXwkmKwLPBcDQlOpmql%2FtQgJKjQaQBk%2F6h5%2Bh6wxuKCTAtXRNQ1WBN7m6J2EwinhUfoywZ8E%2B%2BJFZQlcTcGh6a4upMh26MliMAXl%2FqWXTt%2B579hIW3zzfAGZ7aSNJ3WTeVCdfy%2FjJGe%2BQa3M6xdyWiN9%2FuvLVHo9A%3D%3D";

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
  const [step, setStep] = useState<1 | 2>(1);
  const [state, setState] = useState("");
  const [rtoCode, setRtoCode] = useState("");
  const [series, setSeries] = useState("");
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [partnerUrl, setPartnerUrl] = useState(FALLBACK_PARTNER_URL);
  const hasSubmittedRef = useRef(false);

  // Fetch live partner URL from DB
  useEffect(() => {
    supabase
      .from("partner_links" as any)
      .select("partner_url")
      .eq("vertical", "insurance")
      .eq("partner_name", "PolicyBazaar")
      .eq("is_active", true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data && (data as any).partner_url) setPartnerUrl((data as any).partner_url);
      });
  }, []);

  const stateRef = useRef<HTMLInputElement>(null);
  const rtoRef = useRef<HTMLInputElement>(null);
  const seriesRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const getFullNumber = useCallback(() => {
    return `${state}${rtoCode}${series}${number}`.toUpperCase();
  }, [state, rtoCode, series, number]);

  const isVehicleComplete = useCallback(() => {
    // Minimum: 2 letter state + at least 3-4 digit number = 5+ chars total
    const full = getFullNumber();
    return state.length >= 2 && number.length >= 3 && full.length >= 5;
  }, [state, number, getFullNumber]);

  // Auto-advance to step 2 when vehicle number is complete
  useEffect(() => {
    if (step === 1 && isVehicleComplete() && number.length >= 4) {
      setStep(2);
    }
  }, [state, rtoCode, series, number, step, isVehicleComplete]);

  // Auto-focus phone input when step 2 appears
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => phoneInputRef.current?.focus(), 150);
    }
  }, [step]);

  // Auto-submit when phone is valid
  useEffect(() => {
    if (step !== 2 || hasSubmittedRef.current || isLoading) return;
    if (/^[6-9]\d{9}$/.test(phone)) {
      hasSubmittedRef.current = true;
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, step, isLoading]);

  const handleSubmit = async () => {
    const fullVehicle = getFullNumber();

    if (!isVehicleComplete()) {
      hasSubmittedRef.current = false;
      toast.error(`Please enter a valid ${vehicleLabel} registration number`);
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      hasSubmittedRef.current = false;
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);

    try {
      await captureInsuranceLead({
        phone,
        vehicleNumber: fullVehicle,
        policyType,
        source: `insurance_hero_${policyType}`,
      });
    } catch (error) {
      console.error("Insurance hero lead capture failed:", error);
      toast.warning("We could not confirm lead capture, but your quote flow will continue.");
    }

    try {
      await navigator.clipboard.writeText(fullVehicle);
    } catch {
      // Clipboard may be unavailable
    }

    const { trackLeadConversion } = await import("@/lib/adTracking");
    trackLeadConversion("insurance_hero", { policyType });

    toast.success("Redirecting you to get your quotes 🎉");
    window.location.assign(partnerUrl);
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
    setState(val);
    if (val.length >= 2) {
      setTimeout(() => rtoRef.current?.focus(), 30);
    }
  };

  const handleRtoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setRtoCode(val);
    if (val.length >= 2) {
      setTimeout(() => seriesRef.current?.focus(), 30);
    }
  };

  const handleSeriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // If user types a digit in series field, move it to number field
    const digitMatch = raw.match(/(\d+)$/);
    if (digitMatch) {
      const letters = raw.replace(/\d/g, "").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
      setSeries(letters);
      setNumber(digitMatch[1].slice(0, 4));
      setTimeout(() => numberRef.current?.focus(), 30);
      return;
    }
    const val = raw.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3);
    setSeries(val);
    // No auto-advance — series can be 0, 1, 2, or 3 chars
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setNumber(val);
  };

  // Handle backspace to go to previous field
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    prevRef: React.RefObject<HTMLInputElement> | null
  ) => {
    if (e.key === "Backspace" && currentValue === "" && prevRef?.current) {
      prevRef.current.focus();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    hasSubmittedRef.current = false;
    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const handleResetVehicle = () => {
    setStep(1);
    setPhone("");
    hasSubmittedRef.current = false;
    setTimeout(() => stateRef.current?.focus(), 100);
  };

  const fullDisplay = getFullNumber();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
        <div className="bg-card rounded-2xl border-2 border-primary/20 p-4 md:p-5 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.15)] hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.25)] transition-all duration-300 space-y-3">
          {/* Step 1: Segmented Vehicle Registration */}
          <div className="px-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Car className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-sm font-semibold text-muted-foreground">Enter {vehicleLabel} number</span>
              {step === 2 && (
                <button onClick={handleResetVehicle} className="ml-auto text-xs text-foreground font-bold hover:underline active:scale-95 transition-transform">
                  Edit
                </button>
              )}
            </div>

            {step === 1 ? (
              <div className="flex items-stretch gap-1.5 md:gap-2">
                {/* State */}
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <Input
                    ref={stateRef}
                    placeholder="DL"
                    value={state}
                    onChange={handleStateChange}
                    onKeyDown={(e) => handleKeyDown(e, state, null)}
                    className="text-center border border-border/60 focus-visible:ring-1 focus-visible:ring-primary text-base md:text-lg h-12 md:h-14 bg-muted/30 uppercase font-bold tracking-widest rounded-xl"
                    autoFocus
                    maxLength={3}
                  />
                  <span className="text-[10px] text-muted-foreground/60 mt-1 font-medium">State</span>
                </div>

                <span className="self-center text-muted-foreground/30 font-bold text-lg pt-0 -mt-3">–</span>

                {/* RTO Code */}
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <Input
                    ref={rtoRef}
                    placeholder="01"
                    value={rtoCode}
                    onChange={handleRtoChange}
                    onKeyDown={(e) => handleKeyDown(e, rtoCode, stateRef)}
                    className="text-center border border-border/60 focus-visible:ring-1 focus-visible:ring-primary text-base md:text-lg h-12 md:h-14 bg-muted/30 font-bold tracking-widest rounded-xl"
                    maxLength={2}
                  />
                  <span className="text-[10px] text-muted-foreground/60 mt-1 font-medium">RTO</span>
                </div>

                <span className="self-center text-muted-foreground/30 font-bold text-lg pt-0 -mt-3">–</span>

                {/* Series */}
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <Input
                    ref={seriesRef}
                    placeholder="AB"
                    value={series}
                    onChange={handleSeriesChange}
                    onKeyDown={(e) => handleKeyDown(e, series, rtoRef)}
                    className="text-center border border-border/60 focus-visible:ring-1 focus-visible:ring-primary text-base md:text-lg h-12 md:h-14 bg-muted/30 uppercase font-bold tracking-widest rounded-xl"
                    maxLength={3}
                  />
                  <span className="text-[10px] text-muted-foreground/60 mt-1 font-medium">Series</span>
                </div>

                <span className="self-center text-muted-foreground/30 font-bold text-lg pt-0 -mt-3">–</span>

                {/* Number */}
                <div className="flex flex-col items-center flex-[1.3] min-w-0">
                  <Input
                    ref={numberRef}
                    placeholder="1234"
                    value={number}
                    onChange={handleNumberChange}
                    onKeyDown={(e) => handleKeyDown(e, number, seriesRef)}
                    className="text-center border border-border/60 focus-visible:ring-1 focus-visible:ring-primary text-base md:text-lg h-12 md:h-14 bg-muted/30 font-bold tracking-widest rounded-xl"
                    maxLength={4}
                  />
                  <span className="text-[10px] text-muted-foreground/60 mt-1 font-medium">Number</span>
                </div>

                {isVehicleComplete() && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="self-center text-foreground text-sm font-bold shrink-0 -mt-3">✓</motion.div>
                )}
              </div>
            ) : (
              /* Show combined number when on step 2 */
              <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3">
                <span className="text-base md:text-lg font-bold tracking-widest text-foreground">{fullDisplay}</span>
              </div>
            )}
          </div>

          {/* Step 2: Phone Number */}
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="border-t border-border/50" />
                <div className="flex items-center gap-3 px-2 pt-3">
                  <div className="flex items-center bg-muted rounded-xl px-3 py-2.5 text-sm font-bold text-muted-foreground shrink-0">+91</div>
                  <Input
                    ref={phoneInputRef}
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="border-0 shadow-none focus-visible:ring-0 text-sm md:text-lg h-12 md:h-14 bg-transparent placeholder:text-muted-foreground/50 font-bold"
                    maxLength={10}
                  />
                  {isLoading && <Loader2 className="h-5 w-5 animate-spin text-foreground shrink-0" />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          {[
            { icon: Shield, text: "100% Secure" },
            { icon: Zap, text: "Instant Results" },
            { icon: Star, text: "20+ Insurers" },
          ].map((badge) => (
            <div key={badge.text} className="flex items-center gap-1.5">
              <badge.icon className="h-3.5 w-3.5 text-foreground" />
              <span className="font-medium">{badge.text}</span>
            </div>
          ))}
        </div>

        {!compact && (
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-muted/30">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />
            <div className="flex animate-scroll-left items-center gap-8 py-3.5 px-4 whitespace-nowrap">
              {[...scrollingOffers, ...scrollingOffers, ...scrollingOffers].map((offer, i) => (
                <div key={i} className="flex items-center gap-2 shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <offer.icon className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <span className="text-xs font-semibold text-foreground/80">{offer.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}