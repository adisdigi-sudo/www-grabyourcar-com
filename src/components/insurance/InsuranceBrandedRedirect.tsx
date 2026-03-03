import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, CheckCircle2, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const REDIRECT_SECONDS = 5;

interface InsuranceBrandedRedirectProps {
  open: boolean;
  onClose: () => void;
  redirectUrl: string;
  planName?: string;
  premium?: string;
}

export function InsuranceBrandedRedirect({
  open,
  onClose,
  redirectUrl,
  planName,
  premium,
}: InsuranceBrandedRedirectProps) {
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [progress, setProgress] = useState(0);

  const doRedirect = useCallback(() => {
    window.location.href = redirectUrl;
  }, [redirectUrl]);

  useEffect(() => {
    if (!open) {
      setCountdown(REDIRECT_SECONDS);
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          doRedirect();
          return 0;
        }
        return prev - 1;
      });
      setProgress((prev) => Math.min(prev + 100 / REDIRECT_SECONDS, 100));
    }, 1000);

    return () => clearInterval(interval);
  }, [open, doRedirect]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="w-full max-w-lg mx-4 text-center space-y-8"
        >
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-10 w-10 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              Securing your redirect…
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              You're being securely redirected via{" "}
              <span className="font-bold text-primary">GrabYourCar</span> to
              complete your purchase.
            </p>
          </div>

          {/* Plan info if available */}
          {(planName || premium) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-2xl p-4 max-w-sm mx-auto"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Selected Plan</p>
                  <p className="font-bold text-foreground">{planName}</p>
                </div>
                {premium && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Premium</p>
                    <p className="text-lg font-bold text-primary">{premium}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Trust elements */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Shield, text: "IRDAI Authorised" },
              { icon: Lock, text: "256-bit Encrypted" },
              { icon: CheckCircle2, text: "Data Protected" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-1.5 bg-primary/8 rounded-full px-4 py-2 text-xs font-semibold text-foreground"
              >
                <item.icon className="h-3.5 w-3.5 text-primary" />
                {item.text}
              </div>
            ))}
          </div>

          {/* Progress bar + countdown */}
          <div className="space-y-3 max-w-xs mx-auto">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Redirecting in{" "}
              <span className="font-bold text-foreground">{countdown}s</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={doRedirect}
              className="gap-2 rounded-xl h-12 px-8 font-bold shadow-lg"
            >
              <ExternalLink className="h-4 w-4" />
              Continue Now
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground text-sm"
            >
              Cancel & Go Back
            </Button>
          </div>

          {/* Regulatory footer */}
          <p className="text-[10px] text-muted-foreground/60">
            GrabYourCar • Adis Makethemoney Services Pvt Ltd • IRDAI
            Authorised
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
