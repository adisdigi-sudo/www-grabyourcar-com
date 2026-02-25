import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Phone, Shield, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import confetti from "canvas-confetti";
import { WhatsAppOTPVerification } from "@/components/WhatsAppOTPVerification";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const VERIFIED_KEY = "gyc_otp_verified";
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const WelcomeOTPGate = () => {
  const { user, signInWithPhone } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "otp" | "signing_in" | "welcome">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    // Don't show if already logged in or verified
    if (user) return;
    const verified = localStorage.getItem(VERIFIED_KEY);
    if (verified) return;

    // Show after 5 seconds
    const timer = setTimeout(() => setIsOpen(true), 5000);
    return () => clearTimeout(timer);
  }, [user]);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      phoneSchema.parse(phone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }
    setStep("otp");
  };

  const handleVerified = async () => {
    setStep("signing_in");

    // Sign in / create account
    const { error } = await signInWithPhone(phone);
    if (error) {
      toast.error("Login failed. Please try again.");
      setStep("phone");
      return;
    }

    // Sync to unified_customers (fire-and-forget)
    try {
      await supabase.functions.invoke("welcome-sync", {
        body: {
          phone: `91${phone}`,
          name: name.trim() || undefined,
          source: "welcome_otp_gate",
        },
      });
    } catch { /* best effort */ }

    localStorage.setItem(VERIFIED_KEY, "true");
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setStep("welcome");

    setTimeout(() => setIsOpen(false), 3000);
  };

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    // Don't persist dismiss — show again next visit until verified
  }, []);

  if (user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button]:hidden mx-3 md:mx-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Welcome verification</DialogTitle>
          <DialogDescription>Verify your WhatsApp number to continue without repeated OTPs.</DialogDescription>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-card rounded-2xl overflow-hidden shadow-2xl border border-border"
        >
          <AnimatePresence mode="wait">
            {step === "welcome" ? (
              <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                >
                  <Sparkles className="h-10 w-10 text-primary" />
                </motion.div>
                <h3 className="text-2xl font-heading font-bold mb-2">Welcome to Grabyourcar! 🚗</h3>
                <p className="text-muted-foreground">
                  You're all set. Explore cars, insurance, loans & more — no more OTPs needed.
                </p>
              </motion.div>
            ) : step === "signing_in" ? (
              <motion.div key="signing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Setting up your account...</p>
              </motion.div>
            ) : step === "otp" ? (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="p-6">
                  <WhatsAppOTPVerification
                    phone={phone}
                    onVerified={handleVerified}
                    onCancel={() => setStep("phone")}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div key="phone" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-primary-foreground">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <Car className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-heading font-bold">Welcome to Grabyourcar</h2>
                      <p className="text-sm text-primary-foreground/80">India's Smart Car Platform</p>
                    </div>
                  </div>
                  <p className="text-sm text-primary-foreground/90">
                    Verify once — access cars, insurance, loans & more without repeating OTPs.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handlePhoneSubmit} className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcome-name" className="text-sm font-medium">Your Name</Label>
                    <Input
                      id="welcome-name"
                      placeholder="Enter your name"
                      className="h-12"
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="welcome-phone" className="text-sm font-medium">WhatsApp Number *</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        <Phone className="h-4 w-4 mr-1" /> +91
                      </span>
                      <Input
                        id="welcome-phone"
                        type="tel"
                        placeholder="Enter 10-digit number"
                        className="rounded-l-none h-12 text-base"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 text-base font-semibold bg-success hover:bg-success/90 text-success-foreground">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Verify via WhatsApp
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span>One-time verification • No spam • 100% secure</span>
                  </div>

                  <button type="button" onClick={handleDismiss} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Skip for now
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
