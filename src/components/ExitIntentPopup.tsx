import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Gift, Loader2, CheckCircle, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

const DISMISS_KEY = "gyc_exit_intent_dismissed";
const CAPTURED_KEY = "gyc_exit_intent_captured";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number"),
});

export const ExitIntentPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const captured = localStorage.getItem(CAPTURED_KEY);
    if (captured) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - parseInt(dismissed, 10) < SEVEN_DAYS_MS) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !isOpen) {
        setIsOpen(true);
        // Only trigger once per session
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    };

    // Delay listener to avoid triggering on page load
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 10000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isOpen]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
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
      const { error } = await supabase.from("leads").insert({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        source: "exit_intent",
        status: "new",
      });
      if (error) throw error;

      try {
        await supabase.functions.invoke("whatsapp-send", {
          body: {
            phone: `91${formData.phone}`,
            template: "lead_created",
            params: { name: formData.name, car: "Priority Delivery" },
          },
        });
      } catch { /* best effort */ }

      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      localStorage.setItem(CAPTURED_KEY, "true");
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
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden max-h-[90vh] overflow-y-auto mx-3 md:mx-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Exit offer</DialogTitle>
          <DialogDescription>Before leaving, submit your contact number for priority delivery deals.</DialogDescription>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl overflow-hidden shadow-2xl border border-border"
        >
          {isSubmitted ? (
            <div className="p-8 text-center">
              <CheckCircle className="h-14 w-14 text-success mx-auto mb-3" />
              <h3 className="text-xl font-heading font-bold mb-2">You're Locked In! 🔒</h3>
              <p className="text-sm text-muted-foreground">We'll share priority delivery offers on WhatsApp.</p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-destructive/90 to-destructive px-6 py-4 text-destructive-foreground text-center">
                <Badge className="bg-destructive-foreground/20 text-destructive-foreground border-0 mb-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Don't Miss Out
                </Badge>
                <h2 className="text-lg font-heading font-bold">
                  Wait! Unlock Priority Delivery Offers
                </h2>
                <p className="text-xs text-destructive-foreground/80 mt-1">
                  Skip the waiting period — exclusive deals just for you
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-3">
                <div>
                  <Label className="text-sm">Name *</Label>
                  <Input placeholder="Your name" className="mt-1 h-10" maxLength={100} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label className="text-sm">WhatsApp Number *</Label>
                  <div className="flex mt-1">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-input bg-muted text-muted-foreground text-sm">+91</span>
                    <Input type="tel" placeholder="10-digit number" className="rounded-l-none h-10" maxLength={10} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
                  </div>
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
                <Button type="submit" variant="destructive" className="w-full h-11 font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Gift className="h-4 w-4 mr-2" /> Unlock Offers Now</>}
                </Button>
                <button type="button" onClick={handleDismiss} className="w-full text-xs text-muted-foreground hover:text-foreground py-1">
                  No thanks, I'll pay full price
                </button>
              </form>
            </>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
