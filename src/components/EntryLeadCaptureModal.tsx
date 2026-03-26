import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Zap, Shield, CheckCircle, Loader2, Gift, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import confetti from "canvas-confetti";
import { captureWebsiteLead } from "@/lib/websiteLeadCapture";

const STORAGE_KEY = "gyc_entry_lead_captured";
const DISMISS_KEY = "gyc_entry_lead_dismissed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const getStoredValue = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStoredValue = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore blocked storage
  }
};

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number"),
  city: z.string().trim().min(2, "City is required").max(50),
  carInterest: z.string().optional(),
  purchaseTimeline: z.string().optional(),
  budgetRange: z.string().optional(),
});

export const EntryLeadCaptureModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    city: "",
    carInterest: "",
    purchaseTimeline: "",
    budgetRange: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if already captured or dismissed within 7 days
    const captured = getStoredValue(STORAGE_KEY);
    const dismissed = getStoredValue(DISMISS_KEY);

    if (captured) return;
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < SEVEN_DAYS_MS) return;
    }

    const isMobile = window.innerWidth < 768;
    const timer = setTimeout(() => setIsOpen(true), isMobile ? 20000 : 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    setStoredValue(DISMISS_KEY, Date.now().toString());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);
    try {
      await captureWebsiteLead({
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        carInterest: formData.carInterest,
        source: "entry_popup",
        vertical: "car",
        type: "high_intent",
        priority: "high",
        message: [
          formData.purchaseTimeline && `Timeline: ${formData.purchaseTimeline}`,
          formData.budgetRange && `Budget: ${formData.budgetRange}`,
        ].filter(Boolean).join(" | ") || null,
      });

      const { trackLeadConversion } = await import("@/lib/adTracking");
      trackLeadConversion("entry_popup");

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setStoredValue(STORAGE_KEY, "true");
      setIsSubmitted(true);

      setTimeout(() => setIsOpen(false), 3000);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden max-h-[90vh] overflow-y-auto mx-3 md:mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-card rounded-2xl overflow-hidden shadow-2xl border border-border"
        >
          {isSubmitted ? (
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="h-10 w-10 text-foreground" />
              </motion.div>
              <h3 className="text-2xl font-heading font-bold mb-2">You're In! 🎉</h3>
              <p className="text-muted-foreground">
                Our car expert will call you within 30 minutes with the best deals.
              </p>
            </div>
          ) : (
            <>
              {/* Header Banner */}
              <div className="relative bg-gradient-to-r from-primary to-primary/80 px-4 py-4 md:px-6 md:py-5 text-primary-foreground">
                <button
                  onClick={handleDismiss}
                  className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <Badge className="bg-primary-foreground/20 text-primary-foreground mb-2 md:mb-3 border-0 text-[10px] md:text-xs">
                  <Gift className="h-3 w-3 mr-1" />
                  Limited Time
                </Badge>
                <h2 className="text-lg md:text-2xl font-heading font-bold leading-tight pr-6">
                  Skip Waiting Period — Unlock Best Deals
                </h2>
                <p className="text-xs md:text-sm text-primary-foreground/80 mt-1">
                  Get ready stock car offers from 500+ dealers instantly
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-3 md:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entry-name" className="text-sm font-medium">Name *</Label>
                    <Input
                      id="entry-name"
                      placeholder="Your name"
                      className="mt-1 h-11"
                      maxLength={100}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="entry-phone" className="text-sm font-medium">WhatsApp Number *</Label>
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-input bg-muted text-muted-foreground text-sm">+91</span>
                      <Input
                        id="entry-phone"
                        type="tel"
                        placeholder="10-digit number"
                        className="rounded-l-none h-11"
                        maxLength={10}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entry-city" className="text-sm font-medium">City *</Label>
                    <Input
                      id="entry-city"
                      placeholder="e.g., Delhi, Mumbai"
                      className="mt-1 h-11"
                      maxLength={50}
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                    {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <Label htmlFor="entry-car" className="text-sm font-medium">Interested Car</Label>
                    <Input
                      id="entry-car"
                      placeholder="e.g., Creta, Nexon"
                      className="mt-1 h-11"
                      maxLength={100}
                      value={formData.carInterest}
                      onChange={(e) => setFormData({ ...formData, carInterest: e.target.value })}
                    />
                  </div>
                </div>

                {/* Smart Qualification Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Purchase Timeline</Label>
                    <Select value={formData.purchaseTimeline} onValueChange={(v) => setFormData({ ...formData, purchaseTimeline: v })}>
                      <SelectTrigger className="mt-1 h-11"><SelectValue placeholder="When?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="1_month">Within 1 Month</SelectItem>
                        <SelectItem value="3_months">Within 3 Months</SelectItem>
                        <SelectItem value="exploring">Just Exploring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Budget Range</Label>
                    <Select value={formData.budgetRange} onValueChange={(v) => setFormData({ ...formData, budgetRange: v })}>
                      <SelectTrigger className="mt-1 h-11"><SelectValue placeholder="Budget?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_5L">Under ₹5 Lakh</SelectItem>
                        <SelectItem value="5_10L">₹5 - 10 Lakh</SelectItem>
                        <SelectItem value="10_15L">₹10 - 15 Lakh</SelectItem>
                        <SelectItem value="15_25L">₹15 - 25 Lakh</SelectItem>
                        <SelectItem value="25_50L">₹25 - 50 Lakh</SelectItem>
                        <SelectItem value="above_50L">Above ₹50 Lakh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" /> Unlock Best Deals Now</>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-foreground" /> 100% Free</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-foreground" /> Callback in 30 min</span>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
