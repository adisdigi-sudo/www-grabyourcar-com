import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PB_PARTNERS_URL = "https://www.pbpartners.com/v1/partner-dashboard";

export function InsuranceHeroForm() {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckPrices = async () => {
    if (!vehicleNumber || vehicleNumber.length < 4) {
      toast.error("Please enter a valid vehicle number");
      return;
    }

    setIsSubmitting(true);
    try {
      // Capture lead before redirect
      await supabase.from("insurance_leads").insert({
        phone: "pending",
        vehicle_number: vehicleNumber,
        source: "insurance_hero_redirect",
        policy_type: "comprehensive",
      });
    } catch {
      // Don't block redirect on lead capture failure
    }

    // Redirect to PB Partners
    window.open(PB_PARTNERS_URL, "_blank", "noopener,noreferrer");
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full max-w-xl"
    >
      {/* Inline search bar — Acko style */}
      <div className="flex items-center bg-card rounded-full shadow-xl border border-border/50 p-1.5 pl-6 gap-2">
        <Input
          placeholder="Enter your car number"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
          className="border-0 shadow-none focus-visible:ring-0 text-base md:text-lg h-12 bg-transparent uppercase placeholder:normal-case placeholder:text-muted-foreground/60"
          onKeyDown={(e) => e.key === "Enter" && handleCheckPrices()}
        />
        <Button
          onClick={handleCheckPrices}
          disabled={isSubmitting}
          size="lg"
          className="rounded-full h-12 px-8 text-base font-semibold shrink-0 gap-2"
        >
          {isSubmitting ? "Loading..." : "Check Prices"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* New car banner — Acko style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="mt-4 flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 px-5 py-3.5 shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
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
  );
}
