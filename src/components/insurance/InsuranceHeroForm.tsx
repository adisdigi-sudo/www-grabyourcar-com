import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Car, Shield, CheckCircle2, Loader2, Zap, Sparkles, Gift, Star, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppOTPVerification } from "@/components/WhatsAppOTPVerification";

const PB_PARTNERS_URL = "https://www.pbpartners.com/v1/partner-dashboard";

type FlowStep = "vehicle" | "phone" | "otp" | "quotes" | "finalize";

interface QuotePlan {
  id: string;
  insurer: string;
  type: string;
  premium: string;
  premiumValue: number;
  idv: string;
  claimRatio: string;
  features: string[];
  popular?: boolean;
}

const sampleQuotes: QuotePlan[] = [
  { id: "1", insurer: "HDFC ERGO", type: "Comprehensive", premium: "₹4,999", premiumValue: 4999, idv: "₹6,50,000", claimRatio: "98.3%", features: ["Zero Depreciation", "24/7 RSA", "NCB Protection", "Engine Cover"], popular: true },
  { id: "2", insurer: "ICICI Lombard", type: "Comprehensive", premium: "₹5,199", premiumValue: 5199, idv: "₹6,45,000", claimRatio: "97.8%", features: ["Personal Accident", "Engine Protection", "Key Replacement"] },
  { id: "3", insurer: "Bajaj Allianz", type: "Comprehensive", premium: "₹4,799", premiumValue: 4799, idv: "₹6,40,000", claimRatio: "98.1%", features: ["Consumables Cover", "Return to Invoice", "Tyre Cover"] },
  { id: "4", insurer: "Tata AIG", type: "Third Party + OD", premium: "₹5,399", premiumValue: 5399, idv: "₹6,55,000", claimRatio: "95.0%", features: ["Tyre Protection", "EMI Protection", "Daily Allowance"] },
];

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
}

export function InsuranceHeroForm({ policyType = "comprehensive", vehicleLabel = "vehicle" }: InsuranceHeroFormProps) {
  const [step, setStep] = useState<FlowStep>("vehicle");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  const handleVehicleSubmit = () => {
    if (!vehicleNumber || vehicleNumber.length < 4) {
      toast.error(`Please enter a valid ${vehicleLabel} number`);
      return;
    }
    setStep("phone");
  };

  const handlePhoneSubmit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setIsLoading(true);
    try {
      await supabase.from("insurance_leads").insert({
        phone,
        vehicle_number: vehicleNumber,
        source: `insurance_hero_${policyType}`,
        policy_type: policyType,
      });
    } catch { /* Don't block flow */ }
    setIsLoading(false);
    setStep("otp");
  };

  const handleOTPVerified = () => {
    setStep("quotes");
    toast.success("Verified! Here are your personalized quotes 🎉");
  };

  const handleSelectQuote = (quoteId: string) => setSelectedQuote(quoteId);

  const handleFinalize = () => {
    window.open(PB_PARTNERS_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {/* ===== STEP 1: Vehicle Number ===== */}
        {step === "vehicle" && (
          <motion.div
            key="vehicle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            {/* Main Input Card */}
            <div className="bg-card rounded-2xl border-2 border-primary/20 p-2 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.15)] hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.25)] transition-all duration-300">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-3 flex-1 pl-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <Input
                    placeholder={`Enter ${vehicleLabel} number (e.g. DL01AB1234)`}
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="border-0 shadow-none focus-visible:ring-0 text-base md:text-lg h-14 bg-transparent uppercase placeholder:normal-case placeholder:text-muted-foreground/50 font-bold tracking-wide"
                    onKeyDown={(e) => e.key === "Enter" && handleVehicleSubmit()}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleVehicleSubmit}
                  size="lg"
                  className="rounded-xl h-12 px-6 md:px-8 text-sm md:text-base font-bold shrink-0 gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  Check Prices
                  <ArrowRight className="h-4 w-4" />
                </Button>
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

            {/* New Car Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between bg-card rounded-2xl border border-border/50 px-5 py-4 shadow-md hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Getting a brand new car?</p>
                  <p className="text-xs text-muted-foreground">
                    Save up to <strong className="text-primary">₹40,000*</strong> on your insurance
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs shrink-0"
                onClick={() => window.open(PB_PARTNERS_URL, "_blank", "noopener,noreferrer")}
              >
                Check prices
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* ===== STEP 2: Phone Number ===== */}
        {step === "phone" && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Vehicle: <strong className="text-foreground">{vehicleNumber}</strong></span>
                <button onClick={() => setStep("vehicle")} className="text-primary text-xs ml-2 hover:underline">Change</button>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Enter your mobile number to get personalized quotes
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center bg-muted rounded-xl px-3 text-sm font-bold text-muted-foreground">+91</div>
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="h-12 rounded-xl text-base font-medium"
                    onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                    autoFocus
                  />
                  <Button onClick={handlePhoneSubmit} disabled={isLoading} className="rounded-xl h-12 px-6 shrink-0 gap-2 font-bold">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get OTP"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3 text-primary" />
                Your data is 100% secure. We never spam.
              </p>
            </div>
          </motion.div>
        )}

        {/* ===== STEP 3: OTP Verification ===== */}
        {step === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <WhatsAppOTPVerification
              phone={`+91${phone}`}
              onVerified={handleOTPVerified}
              onCancel={() => setStep("phone")}
            />
          </motion.div>
        )}

        {/* ===== STEP 4: Quotes Display ===== */}
        {step === "quotes" && (
          <motion.div
            key="quotes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">Your Insurance Quotes</h3>
                  <p className="text-sm text-muted-foreground">
                    Vehicle: <strong>{vehicleNumber}</strong> • Best plans for you
                  </p>
                </div>
                <div className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
                  {sampleQuotes.length} plans found
                </div>
              </div>

              <div className="space-y-3">
                {sampleQuotes.map((quote, index) => (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSelectQuote(quote.id)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedQuote === quote.id
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border/50 hover:border-primary/40 hover:shadow-sm"
                    }`}
                  >
                    {quote.popular && (
                      <div className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] px-3 py-0.5 rounded-full font-bold">
                        BEST VALUE
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-foreground">{quote.insurer}</h4>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{quote.type}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {quote.features.slice(0, 3).map((f) => (
                            <span key={f} className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-full text-muted-foreground flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
                              {f}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>IDV: {quote.idv}</span>
                          <span>•</span>
                          <span>Claim: {quote.claimRatio}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-primary">{quote.premium}</p>
                        <p className="text-xs text-muted-foreground">/year</p>
                      </div>
                    </div>

                    {selectedQuote === quote.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-3 pt-3 border-t border-border/50"
                      >
                        <div className="flex flex-wrap gap-2">
                          {quote.features.map((f) => (
                            <span key={f} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {f}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>

              {selectedQuote && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5"
                >
                  <Button onClick={handleFinalize} size="lg" className="w-full h-14 text-base font-bold rounded-xl gap-2 shadow-lg">
                    <Shield className="h-5 w-5" />
                    Buy This Policy — {sampleQuotes.find((q) => q.id === selectedQuote)?.premium}/yr
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    You'll be securely redirected to complete the purchase
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
