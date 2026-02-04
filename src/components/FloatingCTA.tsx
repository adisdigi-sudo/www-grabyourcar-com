import { useState, useEffect } from "react";
import { Phone, MessageCircle, X, FileText, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LeadForm } from "@/components/LeadForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const quickFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
});

export const FloatingCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHiddenByScroll, setIsHiddenByScroll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showQuickDealForm, setShowQuickDealForm] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickFormData, setQuickFormData] = useState({ name: "", phone: "" });
  const [quickFormErrors, setQuickFormErrors] = useState<{ name?: string; phone?: string }>({});

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const heroHeight = window.innerHeight * 0.9;
      
      const pastHero = currentScrollY > heroHeight;
      setIsVisible(pastHero);
      
      if (pastHero) {
        const scrollingDown = currentScrollY > lastScrollY;
        const scrollDelta = Math.abs(currentScrollY - lastScrollY);
        
        if (scrollDelta > 10) {
          setIsHiddenByScroll(!scrollingDown);
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleRequestQuote = () => {
    setShowQuoteForm(true);
    setIsExpanded(false);
  };

  const handleGetBestDeal = () => {
    setShowQuickDealForm(true);
    setIsExpanded(false);
  };

  const handleQuickFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickFormErrors({});

    const result = quickFormSchema.safeParse(quickFormData);
    if (!result.success) {
      const errors: { name?: string; phone?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "name") errors.name = err.message;
        if (err.path[0] === "phone") errors.phone = err.message;
      });
      setQuickFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        customer_name: quickFormData.name.trim(),
        phone: quickFormData.phone.trim(),
        source: "floating_cta",
        lead_type: "quick_deal",
        status: "new",
        priority: "high",
      });

      if (error) throw error;

      toast.success("Thanks! We'll call you with the best deal shortly.");
      setShowQuickDealForm(false);
      setQuickFormData({ name: "", phone: "" });
    } catch (error) {
      console.error("Error submitting quick form:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && !isHiddenByScroll && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
          >
            {/* Expanded Menu */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3 mb-2"
                >
                  {/* Get Best Deal - Quick Form */}
                  <button
                    onClick={handleGetBestDeal}
                    className="group flex items-center gap-3"
                  >
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0 }}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg shadow-md text-sm font-medium whitespace-nowrap"
                    >
                      Get Best Deal
                    </motion.span>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-12 w-12 rounded-full shadow-lg group-hover:scale-110 transition-transform bg-primary hover:bg-primary/90"
                    >
                      <Zap className="h-5 w-5" />
                    </Button>
                  </button>

                  {/* Request Quote Button with Label */}
                  <button
                    onClick={handleRequestQuote}
                    className="group flex items-center gap-3"
                  >
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 }}
                      className="px-3 py-1.5 bg-card rounded-lg shadow-md text-sm font-medium text-foreground whitespace-nowrap"
                    >
                      Request Quote
                    </motion.span>
                    <Button
                      variant="accent"
                      size="icon"
                      className="h-12 w-12 rounded-full shadow-lg group-hover:scale-110 transition-transform"
                    >
                      <FileText className="h-5 w-5" />
                    </Button>
                  </button>

                  {/* WhatsApp Button with Label */}
                  <a
                    href="https://wa.me/919855924442"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3"
                  >
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="px-3 py-1.5 bg-card rounded-lg shadow-md text-sm font-medium text-foreground whitespace-nowrap"
                    >
                      Chat on WhatsApp
                    </motion.span>
                    <Button
                      variant="whatsapp"
                      size="icon"
                      className="h-12 w-12 rounded-full shadow-lg group-hover:scale-110 transition-transform"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </a>

                  {/* Call Button with Label */}
                  <a href="tel:+919855924442" className="group flex items-center gap-3">
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="px-3 py-1.5 bg-card rounded-lg shadow-md text-sm font-medium text-foreground whitespace-nowrap"
                    >
                      Call Now
                    </motion.span>
                    <Button
                      variant="call"
                      size="icon"
                      className="h-12 w-12 rounded-full shadow-lg group-hover:scale-110 transition-transform"
                    >
                      <Phone className="h-5 w-5" />
                    </Button>
                  </a>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Toggle Button */}
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative h-14 w-14 rounded-full shadow-xl flex items-center justify-center",
                "bg-gradient-to-br from-primary to-primary/80",
                "transition-all duration-300",
                isExpanded && "rotate-0"
              )}
            >
              {/* Pulse animation ring */}
              {!isExpanded && (
                <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              )}
              
              <AnimatePresence mode="wait">
                {isExpanded ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="h-6 w-6 text-primary-foreground" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="contact"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MessageCircle className="h-6 w-6 text-primary-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Quick access hint */}
            {!isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute -left-2 bottom-0 transform -translate-x-full"
              >
                <span className="px-3 py-1.5 bg-card rounded-lg shadow-md text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Need help?
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Quote Dialog */}
      <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Request a Quote</DialogTitle>
          </DialogHeader>
          <LeadForm prefillCarInterest="General Quote Request" />
        </DialogContent>
      </Dialog>

      {/* Get Best Deal Quick Form Dialog */}
      <Dialog open={showQuickDealForm} onOpenChange={setShowQuickDealForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Get Best Deal
            </DialogTitle>
            <DialogDescription>
              Share your details and we'll call you with exclusive offers within 30 minutes!
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickFormSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="quick-name">Your Name *</Label>
              <Input
                id="quick-name"
                placeholder="Enter your name"
                value={quickFormData.name}
                onChange={(e) => setQuickFormData({ ...quickFormData, name: e.target.value })}
                className={quickFormErrors.name ? "border-destructive" : ""}
              />
              {quickFormErrors.name && (
                <p className="text-xs text-destructive">{quickFormErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-phone">Mobile Number *</Label>
              <Input
                id="quick-phone"
                placeholder="10-digit mobile number"
                value={quickFormData.phone}
                onChange={(e) => setQuickFormData({ ...quickFormData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                className={quickFormErrors.phone ? "border-destructive" : ""}
              />
              {quickFormErrors.phone && (
                <p className="text-xs text-destructive">{quickFormErrors.phone}</p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Get Best Deal Now
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By submitting, you agree to receive calls from our team.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
