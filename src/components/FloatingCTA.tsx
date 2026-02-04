import { useState, useEffect } from "react";
import { Phone, MessageCircle, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LeadForm } from "@/components/LeadForm";

export const FloatingCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero section (approximately 90vh)
      const heroHeight = window.innerHeight * 0.9;
      setIsVisible(window.scrollY > heroHeight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleRequestQuote = () => {
    setShowQuoteForm(true);
    setIsExpanded(false);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
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

      <Dialog open={showQuoteForm} onOpenChange={setShowQuoteForm}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Request a Quote</DialogTitle>
          </DialogHeader>
          <LeadForm prefillCarInterest="General Quote Request" />
        </DialogContent>
      </Dialog>
    </>
  );
};
