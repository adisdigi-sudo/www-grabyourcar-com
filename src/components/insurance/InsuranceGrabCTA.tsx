import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Gift, CheckCircle2, Shield, Phone, Car, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { captureInsuranceLead } from "@/lib/insuranceLeadCapture";

interface InsuranceGrabCTAProps {
  variant?: "inline" | "banner" | "compact";
  source?: string;
  className?: string;
}

export function InsuranceGrabCTA({ variant = "inline", source = "insurance_page", className = "" }: InsuranceGrabCTAProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Enter a valid 10-digit mobile number"); return; }

    setIsSubmitting(true);
    try {
      await captureInsuranceLead({
        phone,
        customerName: name,
        policyType: "comprehensive",
        source,
        notes: `Grab CTA - ${source}`,
      });
      setSubmitted(true);
      toast.success("We'll call you with the best insurance deal! 🎉");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setIsSubmitting(false);
  };

  const reset = () => { setOpen(false); setSubmitted(false); setName(""); setPhone(""); };

  if (variant === "compact") {
    return (
      <>
        <Button onClick={() => setOpen(true)} size="sm" className={`rounded-full gap-1.5 font-bold text-xs ${className}`}>
          <Gift className="h-3.5 w-3.5" />
          Check Price & Grab Offer
        </Button>
        <GrabDialog open={open} onClose={reset} name={name} setName={setName} phone={phone} setPhone={setPhone} isSubmitting={isSubmitting} submitted={submitted} onSubmit={handleSubmit} />
      </>
    );
  }

  if (variant === "banner") {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`relative rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-chart-4/10 border border-primary/20 p-5 md:p-6 overflow-hidden ${className}`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">🎁 Buy Insurance & Get Free Gifts!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Free self-drive car rental • 3 car wash coupons • Premium perfumes</p>
              </div>
            </div>
            <Button onClick={() => setOpen(true)} className="rounded-xl gap-2 font-bold shrink-0">
              <Car className="h-4 w-4" />
              Check Price & Grab It
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
        <GrabDialog open={open} onClose={reset} name={name} setName={setName} phone={phone} setPhone={setPhone} isSubmitting={isSubmitting} submitted={submitted} onSubmit={handleSubmit} />
      </>
    );
  }

  // Default inline
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className={`flex flex-col sm:flex-row items-center justify-center gap-3 py-4 ${className}`}
      >
        <p className="text-sm text-muted-foreground">
          🎁 <span className="font-semibold text-foreground">Free gifts</span> when you buy insurance via GrabYourCar
        </p>
        <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="rounded-full gap-1.5 font-bold border-primary/30 hover:bg-primary/5 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Check Price & Grab
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </motion.div>
      <GrabDialog open={open} onClose={reset} name={name} setName={setName} phone={phone} setPhone={setPhone} isSubmitting={isSubmitting} submitted={submitted} onSubmit={handleSubmit} />
    </>
  );
}

function GrabDialog({ open, onClose, name, setName, phone, setPhone, isSubmitting, submitted, onSubmit }: {
  open: boolean; onClose: () => void;
  name: string; setName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  isSubmitting: boolean; submitted: boolean; onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Gift className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-bold text-foreground">Check Price & Grab Free Gifts</h3>
                <p className="text-sm text-muted-foreground mt-1">Get the best insurance quote + exclusive freebies</p>
              </div>

              {/* Offer pills */}
              <div className="flex flex-wrap gap-2 justify-center mb-5">
                {["🚗 Free Self-Drive Car", "✨ 3 Car Wash Coupons", "🎁 Free Perfumes"].map((o) => (
                  <span key={o} className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">{o}</span>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Your Name</label>
                  <Input placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Mobile Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-muted rounded-xl px-3 text-sm font-medium text-muted-foreground shrink-0">+91</div>
                    <Input type="tel" placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="h-11 rounded-xl" onKeyDown={(e) => e.key === "Enter" && onSubmit()} />
                  </div>
                </div>
              </div>

              <Button onClick={onSubmit} disabled={isSubmitting} className="w-full h-12 rounded-xl font-bold text-base gap-2 mt-5">
                {isSubmitting ? "Submitting..." : <><CheckCircle2 className="h-5 w-5" /> Check Price & Grab Offer <ArrowRight className="h-5 w-5" /></>}
              </Button>

              <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> 100% Secure</span>
                <span>•</span>
                <span>No Spam</span>
                <span>•</span>
                <span>IRDAI Licensed</span>
              </div>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </motion.div>
              <h3 className="text-xl font-heading font-bold text-foreground mb-2">You're All Set! 🎉</h3>
              <p className="text-sm text-muted-foreground mb-4">Our insurance expert will call you within 30 minutes with the best deal + your free gifts.</p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mx-auto max-w-xs">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span>Expect call from <strong className="text-foreground">+91 98559 24442</strong></span>
              </div>
              <Button variant="outline" className="mt-5 rounded-xl" onClick={onClose}>Close</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
