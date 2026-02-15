import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, Car, Shield, CheckCircle2, Loader2 } from "lucide-react";
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

// Simulated quotes (in production, these would come from scraping/API)
const sampleQuotes: QuotePlan[] = [
  {
    id: "1",
    insurer: "HDFC ERGO",
    type: "Comprehensive",
    premium: "₹4,999",
    premiumValue: 4999,
    idv: "₹6,50,000",
    claimRatio: "98.3%",
    features: ["Zero Depreciation", "24/7 RSA", "NCB Protection", "Engine Cover"],
    popular: true,
  },
  {
    id: "2",
    insurer: "ICICI Lombard",
    type: "Comprehensive",
    premium: "₹5,199",
    premiumValue: 5199,
    idv: "₹6,45,000",
    claimRatio: "97.8%",
    features: ["Personal Accident", "Engine Protection", "Key Replacement"],
  },
  {
    id: "3",
    insurer: "Bajaj Allianz",
    type: "Comprehensive",
    premium: "₹4,799",
    premiumValue: 4799,
    idv: "₹6,40,000",
    claimRatio: "98.1%",
    features: ["Consumables Cover", "Return to Invoice", "Tyre Cover"],
  },
  {
    id: "4",
    insurer: "Tata AIG",
    type: "Third Party + OD",
    premium: "₹5,399",
    premiumValue: 5399,
    idv: "₹6,55,000",
    claimRatio: "95.0%",
    features: ["Tyre Protection", "EMI Protection", "Daily Allowance"],
  },
];

export function InsuranceHeroForm() {
  const [step, setStep] = useState<FlowStep>("vehicle");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  const handleVehicleSubmit = () => {
    if (!vehicleNumber || vehicleNumber.length < 4) {
      toast.error("Please enter a valid vehicle number");
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
        source: "insurance_hero_form",
        policy_type: "comprehensive",
      });
    } catch {
      // Don't block flow on lead capture failure
    }
    setIsLoading(false);
    setStep("otp");
  };

  const handleOTPVerified = () => {
    setStep("quotes");
    toast.success("Verified! Here are your personalized quotes 🎉");
  };

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuote(quoteId);
  };

  const handleFinalize = () => {
    window.open(PB_PARTNERS_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full max-w-4xl">
      <AnimatePresence mode="wait">
        {/* STEP 1: Vehicle Number */}
        {step === "vehicle" && (
          <motion.div
            key="vehicle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center bg-card rounded-2xl shadow-2xl border border-border/50 p-2 pl-6 gap-2">
              <div className="flex items-center gap-3 flex-1">
                <Car className="h-5 w-5 text-primary shrink-0" />
                <Input
                  placeholder="Enter your car number (e.g. DL01AB1234)"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="border-0 shadow-none focus-visible:ring-0 text-base md:text-lg h-14 bg-transparent uppercase placeholder:normal-case placeholder:text-muted-foreground/60 font-medium"
                  onKeyDown={(e) => e.key === "Enter" && handleVehicleSubmit()}
                />
              </div>
              <Button
                onClick={handleVehicleSubmit}
                size="lg"
                className="rounded-xl h-12 px-8 text-base font-semibold shrink-0 gap-2 shadow-lg"
              >
                Check Prices
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* New car banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex items-center justify-between bg-card/90 backdrop-blur-sm rounded-2xl border border-border/50 px-5 py-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Getting a brand new car?</p>
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

        {/* STEP 2: Phone Number */}
        {step === "phone" && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="bg-card rounded-2xl shadow-2xl border border-border/50 p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Vehicle: <strong className="text-foreground">{vehicleNumber}</strong></span>
                <button onClick={() => setStep("vehicle")} className="text-primary text-xs ml-2 hover:underline">Change</button>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Enter your mobile number to get personalized quotes
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center bg-muted rounded-xl px-3 text-sm font-medium text-muted-foreground">
                    +91
                  </div>
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="h-12 rounded-xl text-base"
                    onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                  />
                  <Button
                    onClick={handlePhoneSubmit}
                    disabled={isLoading}
                    className="rounded-xl h-12 px-6 shrink-0 gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get OTP"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                <Shield className="h-3 w-3 inline mr-1" />
                Your data is 100% secure. We never spam.
              </p>
            </div>
          </motion.div>
        )}

        {/* STEP 3: OTP Verification */}
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

        {/* STEP 4: Quotes Display */}
        {step === "quotes" && (
          <motion.div
            key="quotes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="bg-card rounded-2xl shadow-2xl border border-border/50 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">Your Insurance Quotes</h3>
                  <p className="text-sm text-muted-foreground">
                    Vehicle: <strong>{vehicleNumber}</strong> • Best plans for you
                  </p>
                </div>
                <div className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
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
                  <Button
                    onClick={handleFinalize}
                    size="lg"
                    className="w-full h-14 text-base font-bold rounded-xl gap-2 shadow-lg"
                  >
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
