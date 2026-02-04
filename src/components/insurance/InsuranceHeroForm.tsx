import { useState } from "react";
import { motion } from "framer-motion";
import { Car, ArrowRight, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface InsuranceHeroFormProps {
  onSubmit?: (data: FormData) => void;
}

interface FormData {
  vehicleNumber: string;
  mobileNumber: string;
  policyType: string;
}

export function InsuranceHeroForm({ onSubmit }: InsuranceHeroFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    vehicleNumber: "",
    mobileNumber: "",
    policyType: "comprehensive",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.vehicleNumber) {
      toast.error("Please enter your vehicle number");
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    if (!formData.mobileNumber || formData.mobileNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    
    toast.success("We'll call you with the best quotes shortly!");
    onSubmit?.(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-card rounded-2xl shadow-xl border p-6 md:p-8 max-w-md w-full"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Car className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg">Car Insurance</h3>
          <p className="text-sm text-muted-foreground">Get quotes in 2 minutes</p>
        </div>
      </div>

      <div className="space-y-4">
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber" className="text-sm font-medium">
                Vehicle Registration Number
              </Label>
              <Input
                id="vehicleNumber"
                placeholder="e.g., DL01AB1234"
                value={formData.vehicleNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vehicleNumber: e.target.value.toUpperCase(),
                  })
                }
                className="h-12 text-base uppercase"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Policy Type</Label>
              <Select
                value={formData.policyType}
                onValueChange={(value) =>
                  setFormData({ ...formData, policyType: value })
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">
                    Comprehensive (Own + Third Party)
                  </SelectItem>
                  <SelectItem value="thirdparty">
                    Third Party Only (Mandatory)
                  </SelectItem>
                  <SelectItem value="standalone">
                    Standalone Own Damage
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-2"
          >
            <Label htmlFor="mobileNumber" className="text-sm font-medium">
              Mobile Number
            </Label>
            <Input
              id="mobileNumber"
              placeholder="Enter 10-digit mobile number"
              value={formData.mobileNumber}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  mobileNumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              className="h-12 text-base"
              type="tel"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              We'll send you quotes via SMS and call
            </p>
          </motion.div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 text-base font-semibold gap-2"
          size="lg"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
              />
              Getting Quotes...
            </span>
          ) : step === 1 ? (
            <>
              View Prices
              <ArrowRight className="h-5 w-5" />
            </>
          ) : (
            <>
              Get Free Quotes
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>

        {step === 2 && (
          <button
            onClick={() => setStep(1)}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to vehicle details
          </button>
        )}
      </div>

      <div className="mt-6 pt-6 border-t space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          <span>Compare 20+ insurers instantly</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>Cashless claims at 10,000+ garages</span>
        </div>
      </div>
    </motion.div>
  );
}
