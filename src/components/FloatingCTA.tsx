import { useState, useEffect } from "react";
import { Phone, MessageCircle, X, FileText, Zap, Loader2, CalendarClock, Shield, Car, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LeadForm } from "@/components/LeadForm";
import { WhatsAppOTPVerification } from "@/components/WhatsAppOTPVerification";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { triggerFeedback } from "@/lib/feedback";
import confetti from "canvas-confetti";

const quickFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
});

const scheduleFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  date: z.date({ required_error: "Please select a date" }),
  time: z.string().min(1, "Please select a time slot"),
});

const timeSlots = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM",
];

export const FloatingCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHiddenByScroll, setIsHiddenByScroll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showQuickDealForm, setShowQuickDealForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);
  const [quickFormData, setQuickFormData] = useState({ name: "", phone: "" });
  const [quickFormErrors, setQuickFormErrors] = useState<{ name?: string; phone?: string }>({});
  const [scheduleFormData, setScheduleFormData] = useState<{
    name: string;
    phone: string;
    date: Date | undefined;
    time: string;
  }>({ name: "", phone: "", date: undefined, time: "" });
  const [scheduleFormErrors, setScheduleFormErrors] = useState<{
    name?: string;
    phone?: string;
    date?: string;
    time?: string;
  }>({});
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingFormType, setPendingFormType] = useState<"quick" | "schedule" | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const heroHeight = window.innerHeight * 0.9;
      
      const pastHero = currentScrollY > heroHeight;
      setIsVisible(pastHero);
      
      // Only hide by scroll when menu is NOT expanded
      if (pastHero && !isExpanded) {
        const scrollingDown = currentScrollY > lastScrollY;
        const scrollDelta = Math.abs(currentScrollY - lastScrollY);
        
        if (scrollDelta > 10) {
          setIsHiddenByScroll(!scrollingDown);
        }
      } else if (isExpanded) {
        // Keep visible when expanded
        setIsHiddenByScroll(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isExpanded]);

  const handleRequestQuote = () => {
    setShowQuoteForm(true);
    setIsExpanded(false);
  };

  const handleGetBestDeal = () => {
    setShowQuickDealForm(true);
    setIsExpanded(false);
  };

  const handleScheduleCall = () => {
    setShowScheduleForm(true);
    setIsExpanded(false);
  };

  const handleOTPVerified = async () => {
    setShowOTPVerification(false);
    
    if (pendingFormType === "quick") {
      // Submit quick form lead
      try {
        const { error } = await supabase.from("leads").insert({
          name: quickFormData.name.trim(),
          phone: quickFormData.phone.trim(),
          source: "floating_cta",
          status: "new",
        });

        if (error) throw error;

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#16a34a', '#15803d', '#ffffff', '#fbbf24'],
        });

        toast.success("🎉 Thanks! We'll call you with the best deal shortly.");
        setShowQuickDealForm(false);
        setQuickFormData({ name: "", phone: "" });
      } catch (error) {
        console.error("Error submitting quick form:", error);
        toast.error("Something went wrong. Please try again.");
      }
    } else if (pendingFormType === "schedule") {
      // Submit schedule form
      try {
        const { error } = await supabase.from("call_bookings").insert({
          customer_name: scheduleFormData.name.trim(),
          phone: scheduleFormData.phone.trim(),
          preferred_date: format(scheduleFormData.date!, "yyyy-MM-dd"),
          preferred_time: scheduleFormData.time,
          source: "floating_cta",
          status: "pending",
        });

        if (error) throw error;

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#16a34a', '#15803d', '#ffffff', '#3b82f6'],
        });

        toast.success(`🎉 Call scheduled for ${format(scheduleFormData.date!, "PPP")} at ${scheduleFormData.time}!`);
        setShowScheduleForm(false);
        setScheduleFormData({ name: "", phone: "", date: undefined, time: "" });
      } catch (error) {
        console.error("Error scheduling call:", error);
        toast.error("Something went wrong. Please try again.");
      }
    }
    
    setPendingFormType(null);
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

    // Show OTP verification
    setPendingFormType("quick");
    setShowOTPVerification(true);
  };

  const handleScheduleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleFormErrors({});

    const result = scheduleFormSchema.safeParse(scheduleFormData);
    if (!result.success) {
      const errors: { name?: string; phone?: string; date?: string; time?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof typeof errors;
        errors[field] = err.message;
      });
      setScheduleFormErrors(errors);
      return;
    }

    // Show OTP verification
    setPendingFormType("schedule");
    setShowOTPVerification(true);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && !isHiddenByScroll && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: 50 }}
            animate={{ 
              opacity: 1, 
              scale: [0.3, 1.15, 0.95, 1.05, 1], 
              y: [50, -10, 5, -3, 0] 
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              duration: 0.6, 
              ease: "easeOut",
              times: [0, 0.4, 0.6, 0.8, 1]
            }}
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
                    onClick={() => { triggerFeedback(); handleGetBestDeal(); }}
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
                    onClick={() => { triggerFeedback(); handleRequestQuote(); }}
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

                  {/* Schedule a Call Button */}
                  <button
                    onClick={() => { triggerFeedback(); handleScheduleCall(); }}
                    className="group flex items-center gap-3"
                  >
                    <motion.span
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="px-3 py-1.5 bg-card rounded-lg shadow-md text-sm font-medium text-foreground whitespace-nowrap"
                    >
                      Schedule a Call
                    </motion.span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full shadow-lg group-hover:scale-110 transition-transform border-2 border-primary"
                    >
                      <CalendarClock className="h-5 w-5 text-primary" />
                    </Button>
                  </button>

                  {/* WhatsApp Button with Label - Sales-Driven */}
                  <a
                    href="https://wa.me/1155578093?text=Hi%20Grabyourcar!%20I%27m%20looking%20for%20a%20new%20car.%20Please%20help%20me%20find%20the%20best%20deal."
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
                      Get Best Price
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
                  <a href="tel:+1155578093" className="group flex items-center gap-3">
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
              onClick={() => {
                triggerFeedback();
                setIsExpanded(!isExpanded);
              }}
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
                autoFocus
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSubmitting) {
                    e.preventDefault();
                    handleQuickFormSubmit(e as unknown as React.FormEvent);
                  }
                }}
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

      {/* Schedule a Call Dialog */}
      <Dialog open={showScheduleForm} onOpenChange={setShowScheduleForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Schedule a Call
            </DialogTitle>
            <DialogDescription>
              Pick a convenient date and time, and our expert will call you.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleFormSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="schedule-name">Your Name *</Label>
              <Input
                id="schedule-name"
                placeholder="Enter your name"
                value={scheduleFormData.name}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, name: e.target.value })}
                className={scheduleFormErrors.name ? "border-destructive" : ""}
                autoFocus
              />
              {scheduleFormErrors.name && (
                <p className="text-xs text-destructive">{scheduleFormErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-phone">Mobile Number *</Label>
              <Input
                id="schedule-phone"
                placeholder="10-digit mobile number"
                value={scheduleFormData.phone}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                className={scheduleFormErrors.phone ? "border-destructive" : ""}
              />
              {scheduleFormErrors.phone && (
                <p className="text-xs text-destructive">{scheduleFormErrors.phone}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferred Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduleFormData.date && "text-muted-foreground",
                        scheduleFormErrors.date && "border-destructive"
                      )}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" />
                      {scheduleFormData.date ? format(scheduleFormData.date, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduleFormData.date}
                      onSelect={(date) => setScheduleFormData({ ...scheduleFormData, date })}
                      disabled={(date) => isBefore(date, startOfToday()) || isBefore(addDays(new Date(), 30), date)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {scheduleFormErrors.date && (
                  <p className="text-xs text-destructive">{scheduleFormErrors.date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Preferred Time *</Label>
                <Select
                  value={scheduleFormData.time}
                  onValueChange={(value) => setScheduleFormData({ ...scheduleFormData, time: value })}
                >
                  <SelectTrigger className={scheduleFormErrors.time ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {scheduleFormErrors.time && (
                  <p className="text-xs text-destructive">{scheduleFormErrors.time}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isScheduleSubmitting}>
              {isScheduleSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Schedule Call
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              We'll call you at your preferred time. Calls available Mon-Sat, 10 AM - 7 PM.
            </p>
          </form>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog open={showOTPVerification} onOpenChange={(open) => {
        if (!open) {
          setShowOTPVerification(false);
          setPendingFormType(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>Verify WhatsApp number</DialogTitle>
            <DialogDescription>Enter the one-time code sent to your WhatsApp to continue.</DialogDescription>
          </DialogHeader>
          <div>
            <WhatsAppOTPVerification
              phone={pendingFormType === "quick" ? quickFormData.phone : scheduleFormData.phone}
              onVerified={handleOTPVerified}
              onCancel={() => {
                setShowOTPVerification(false);
                setPendingFormType(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
