import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Loader2, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number"),
  city: z.string().trim().min(2, "City is required").max(50),
});

interface BrochureLeadGateProps {
  brochureUrl: string;
  carName: string;
  carSlug?: string;
  children: React.ReactNode;
}

export const BrochureLeadGate = ({ brochureUrl, carName, carSlug, children }: BrochureLeadGateProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", city: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if lead already captured for this brochure
    const captured = localStorage.getItem(`gyc_brochure_lead_${carSlug || carName}`);
    if (captured) {
      triggerDownload();
      return;
    }

    setIsOpen(true);
    setStep("form");
  }, [carSlug, carName]);

  const triggerDownload = useCallback(() => {
    const link = document.createElement("a");
    link.href = brochureUrl;
    link.download = `${carSlug || carName}-brochure.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloading brochure...");
  }, [brochureUrl, carSlug, carName]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setStep("otp");
  };

  const handleOTPVerified = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: formData.name.trim(),
        customer_name: formData.name.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        car_model: carName,
        source: "brochure_download",
        lead_type: "brochure",
        status: "new",
        priority: "medium",
      });

      if (error) throw error;

      // Trigger WhatsApp confirmation
      try {
        await supabase.functions.invoke("whatsapp-send", {
          body: {
            phone: `91${formData.phone}`,
            template: "lead_created",
            params: { name: formData.name, car: carName },
          },
        });
      } catch { /* best effort */ }

      localStorage.setItem(`gyc_brochure_lead_${carSlug || carName}`, "true");
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      setStep("success");
      triggerDownload();

      setTimeout(() => setIsOpen(false), 3000);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div onClick={handleClick} className="cursor-pointer">
        {children}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <AnimatePresence mode="wait">
            {step === "form" && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Download {carName} Brochure
                  </DialogTitle>
                  <DialogDescription>
                    Enter your details to get the official brochure instantly
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label>Name *</Label>
                    <Input placeholder="Your name" className="mt-1" maxLength={100} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <Label>WhatsApp Number *</Label>
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-input bg-muted text-muted-foreground text-sm">+91</span>
                      <Input type="tel" placeholder="10-digit number" className="rounded-l-none" maxLength={10} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <Label>City *</Label>
                    <Input placeholder="e.g., Delhi, Mumbai" className="mt-1" maxLength={50} value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {isSubmitting ? "Processing..." : "Download Brochure"}
                  </Button>
                </form>
              </motion.div>
            )}


            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Brochure Downloaded! 🎉</h3>
                <p className="text-muted-foreground text-sm">
                  Check your downloads. Our team will also share exclusive offers on WhatsApp.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};
