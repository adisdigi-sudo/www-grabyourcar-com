import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Car, Shield, CheckCircle2, Loader2, Zap, Sparkles, Gift, Star, Bike, ChevronLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { captureInsuranceLead } from "@/lib/insuranceLeadCapture";

import { useQuery } from "@tanstack/react-query";
import { InsuranceBrandedRedirect } from "./InsuranceBrandedRedirect";

const PARTNER_URL = "https://pbpci.policybazaar.com/?token=o5aMAq6qZ1tLXTODNpDyVbk4MP6pWDnq6hhpN5u%2BmyJLH9wHcj81JpXwkmKwLPBcDQlOpmql%2FtQgJKjQaQBk%2F6h5%2Bh6wxuKCTAtXRNQ1WBN7m6J2EwinhUfoywZ8E%2B%2BJFZQlcTcGh6a4upMh26MliMAXl%2FqWXTt%2B579hIW3zzfAGZ7aSNJ3WTeVCdfy%2FjJGe%2BQa3M6xdyWiN9%2FuvLVHo9A%3D%3D";

type FlowStep = "vehicle" | "brand" | "model" | "phone";

const bikeBrands = [
  "Hero", "Honda", "TVS", "Bajaj", "Royal Enfield", "Yamaha",
  "Suzuki", "KTM", "Kawasaki", "Harley-Davidson", "Jawa", "Ola Electric",
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
  compact?: boolean;
}

export function InsuranceHeroForm({ policyType = "comprehensive", vehicleLabel = "vehicle", compact = false }: InsuranceHeroFormProps) {
  const isNewVehicle = policyType === "new_car" || policyType === "bike";
  const initialStep: FlowStep = isNewVehicle ? "brand" : "vehicle";

  const [step, setStep] = useState<FlowStep>(initialStep);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [showRedirect, setShowRedirect] = useState(false);

  // Fetch car brands from DB
  const { data: carBrands } = useQuery({
    queryKey: ["car-brands-insurance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("car_brands")
        .select("name, slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data?.map((b) => b.name) || [];
    },
    enabled: policyType === "new_car",
  });

  // Fetch car models for selected brand
  const { data: carModels } = useQuery({
    queryKey: ["car-models-insurance", selectedBrand],
    queryFn: async () => {
      const { data } = await supabase
        .from("cars")
        .select("name, slug")
        .ilike("brand", selectedBrand)
        .eq("is_discontinued", false)
        .order("name");
      return data?.map((c) => c.name) || [];
    },
    enabled: !!selectedBrand && policyType === "new_car",
  });

  const brands = policyType === "bike" ? bikeBrands : (carBrands || []);

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return brands;
    return brands.filter((b) => b.toLowerCase().includes(brandSearch.toLowerCase()));
  }, [brands, brandSearch]);

  const handleVehicleSubmit = () => {
    if (!vehicleNumber || vehicleNumber.length < 4) {
      toast.error(`Please enter a valid ${vehicleLabel} number`);
      return;
    }
    setStep("phone");
  };

  const handleBrandSelect = (brand: string) => {
    setSelectedBrand(brand);
    if (policyType === "bike") {
      // Bikes skip model selection, go to phone
      setStep("phone");
    } else {
      setStep("model");
    }
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    setStep("phone");
  };

  const handlePhoneSubmit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setIsLoading(true);
    try {
      await captureInsuranceLead({
        phone,
        vehicleNumber: isNewVehicle ? `NEW-${selectedBrand}-${selectedModel}` : vehicleNumber,
        vehicleMake: selectedBrand || undefined,
        vehicleModel: selectedModel || undefined,
        policyType,
        source: `insurance_hero_${policyType}`,
      });
    } catch { /* Don't block flow */ }
    setIsLoading(false);
    setShowRedirect(true);
    toast.success("Redirecting you to get your quotes 🎉");
  };



  const handleBack = () => {
    if (step === "model") setStep("brand");
    else if (step === "phone") setStep(isNewVehicle ? (policyType === "bike" ? "brand" : (selectedModel ? "model" : "brand")) : "vehicle");
  };

  const vehicleDisplayName = isNewVehicle
    ? [selectedBrand, selectedModel].filter(Boolean).join(" • ")
    : vehicleNumber;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {/* ===== STEP: Vehicle Number (renewal only) ===== */}
        {step === "vehicle" && (
          <motion.div key="vehicle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }} className="space-y-5">
            <div className="bg-card rounded-2xl border-2 border-primary/20 p-3 md:p-2 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.15)] hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.25)] transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
                <div className="flex items-center gap-3 flex-1 px-2 sm:pl-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Car className="h-5 w-5 text-primary" />
                  </div>
                  <Input
                    placeholder={`Enter ${vehicleLabel} number (e.g. DL01AB1234)`}
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="border-0 shadow-none focus-visible:ring-0 text-sm md:text-lg h-12 md:h-14 bg-transparent uppercase placeholder:normal-case placeholder:text-muted-foreground/50 font-bold tracking-wide"
                    onKeyDown={(e) => e.key === "Enter" && handleVehicleSubmit()}
                    autoFocus
                  />
                </div>
                <Button onClick={handleVehicleSubmit} size="lg" className="rounded-xl h-12 px-6 md:px-8 text-sm md:text-base font-bold shrink-0 gap-2 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
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

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="flex items-center justify-between bg-card rounded-2xl border border-border/50 px-5 py-4 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Getting a brand new car?</p>
                      <p className="text-xs text-muted-foreground">Save up to <strong className="text-primary">₹40,000*</strong> on your insurance</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full text-xs shrink-0"
                    onClick={() => setShowRedirect(true)}>
                    Check prices
                  </Button>
                </motion.div>
              </>
            )}
          </motion.div>
        )}

        {/* ===== STEP: Brand Selection (new car / bike) ===== */}
        {step === "brand" && (
          <motion.div key="brand" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-4 md:p-6 space-y-4">
              <div>
                <h3 className="font-heading font-bold text-lg text-foreground mb-1">
                  Select your {policyType === "bike" ? "bike" : "car"} brand
                </h3>
                <p className="text-sm text-muted-foreground">Choose the manufacturer of your new {policyType === "bike" ? "bike/scooter" : "car"}</p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search brand..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="pl-10 h-11 rounded-xl"
                  autoFocus
                />
              </div>

              {/* Brand Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {filteredBrands.map((brand, i) => (
                  <motion.button
                    key={brand}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => handleBrandSelect(brand)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground group-hover:bg-primary/10 transition-colors">
                      {brand.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-foreground text-center leading-tight line-clamp-2">{brand}</span>
                  </motion.button>
                ))}
                {filteredBrands.length === 0 && (
                  <p className="col-span-full text-center text-sm text-muted-foreground py-6">No brands found</p>
                )}
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3 text-primary" />
                All major brands covered with best rates
              </p>
            </div>
          </motion.div>
        )}

        {/* ===== STEP: Model Selection (new car only) ===== */}
        {step === "model" && (
          <motion.div key="model" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button onClick={handleBack} className="flex items-center gap-1 text-primary hover:underline text-xs font-semibold">
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </button>
                <span className="mx-1">•</span>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Brand: <strong className="text-foreground">{selectedBrand}</strong></span>
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-foreground mb-1">Select your car model</h3>
                <p className="text-sm text-muted-foreground">Pick the model you're buying</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {(carModels && carModels.length > 0 ? carModels : [`${selectedBrand} (Any Model)`]).map((model, i) => (
                  <motion.button
                    key={model}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => handleModelSelect(model)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{model}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== STEP: Phone Number ===== */}
        {step === "phone" && (
          <motion.div key="phone" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
            <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-4 md:p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <button onClick={handleBack} className="flex items-center gap-1 text-primary hover:underline text-xs font-semibold">
                  <ChevronLeft className="h-3.5 w-3.5" /> Back
                </button>
                <span className="mx-1">•</span>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{isNewVehicle ? "Vehicle" : "Reg No"}: <strong className="text-foreground">{vehicleDisplayName}</strong></span>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Enter your mobile number to get personalized quotes
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex gap-2 flex-1">
                    <div className="flex items-center bg-muted rounded-xl px-3 text-sm font-bold text-muted-foreground shrink-0">+91</div>
                    <Input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="h-12 rounded-xl text-base font-medium"
                      onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                      autoFocus
                    />
                  </div>
                  <Button onClick={handlePhoneSubmit} disabled={isLoading} className="rounded-xl h-12 px-6 shrink-0 gap-2 font-bold w-full sm:w-auto">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get Quotes"}
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


      </AnimatePresence>

      <InsuranceBrandedRedirect
        open={showRedirect}
        onClose={() => setShowRedirect(false)}
        redirectUrl={`${PARTNER_URL}&RegNo=${encodeURIComponent(isNewVehicle ? `${selectedBrand} ${selectedModel}`.trim() : vehicleNumber)}&MobileNo=${encodeURIComponent(phone)}`}
        planName={isNewVehicle ? vehicleDisplayName : vehicleNumber}
        premium={policyType === "comprehensive" ? "Best Price Guaranteed" : undefined}
      />
    </div>
  );
}
