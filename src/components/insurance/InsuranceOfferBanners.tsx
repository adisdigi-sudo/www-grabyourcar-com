import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Sparkles, Gift, ShoppingBag, ArrowRight, X, CheckCircle2, Shield, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Offer {
  id: string;
  icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
  highlight: string;
  description: string;
  badge: string;
  gradient: string;
  iconBg: string;
}

const offers: Offer[] = [
  {
    id: "free-self-drive",
    icon: Car,
    title: "1 Day Free Self-Drive Car",
    subtitle: "Once a year — on us!",
    highlight: "FREE",
    description: "Buy car insurance through GrabYourCar and enjoy 1 full day of self-drive car rental absolutely free every year. Drive any car from our fleet!",
    badge: "🚗 Most Popular",
    gradient: "from-primary/20 via-primary/10 to-transparent",
    iconBg: "bg-primary/20 text-primary",
  },
  {
    id: "car-wash-coupons",
    icon: Sparkles,
    title: "3 Premium Car Wash Coupons",
    subtitle: "Sparkle your ride — free!",
    highlight: "3x FREE",
    description: "Get 3 complimentary premium car wash & detailing coupons when you purchase insurance through GrabYourCar. Valid at 500+ partner centres.",
    badge: "✨ Best Value",
    gradient: "from-chart-4/20 via-chart-4/10 to-transparent",
    iconBg: "bg-chart-4/20 text-chart-4",
  },
  {
    id: "free-perfumes",
    icon: Gift,
    title: "Free Car Perfumes + 6 Months Free Shipping",
    subtitle: "Premium fragrances delivered free!",
    highlight: "6 MONTHS",
    description: "Receive premium car perfumes with 6 months of free shipping on all car accessory orders from GrabYourCar. Freshen up your ride!",
    badge: "🎁 Exclusive",
    gradient: "from-chart-1/20 via-chart-1/10 to-transparent",
    iconBg: "bg-chart-1/20 text-chart-1",
  },
];

export function InsuranceOfferBanners() {
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleGrabOffer = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Please enter a valid 10-digit mobile number"); return; }

    setIsSubmitting(true);
    try {
      await supabase.from("insurance_leads").insert({
        phone,
        customer_name: name,
        source: `offer_grab_${selectedOffer?.id}`,
        policy_type: "comprehensive",
        notes: `Grabbed offer: ${selectedOffer?.title}`,
      });
      setSubmitted(true);
      toast.success("Offer grabbed! Our team will call you shortly 🎉");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setIsSubmitting(false);
  };

  const resetModal = () => {
    setSelectedOffer(null);
    setSubmitted(false);
    setName("");
    setPhone("");
  };

  return (
    <>
      {/* Scrolling Offer Banner Section */}
      <section className="py-6 bg-gradient-to-r from-primary/5 via-background to-primary/5 overflow-hidden border-y border-border/50">
        <div className="container mx-auto px-4 mb-4">
          <div className="flex items-center justify-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Exclusive Offers — Buy Insurance via GrabYourCar
            </h3>
          </div>
        </div>

        {/* Infinite scrolling marquee */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="overflow-hidden">
            <div className="flex animate-scroll-left gap-6 items-stretch py-2">
              {[...offers, ...offers, ...offers, ...offers].map((offer, index) => (
                <motion.div
                  key={`${offer.id}-${index}`}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedOffer(offer)}
                  className="flex-shrink-0 w-[340px] md:w-[400px] relative group cursor-pointer"
                >
                  <div className={`relative rounded-2xl border border-border/60 bg-card p-5 h-full hover:border-primary/40 hover:shadow-lg transition-all duration-300 overflow-hidden`}>
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${offer.gradient} opacity-50 group-hover:opacity-80 transition-opacity`} />

                    {/* Badge */}
                    <div className="absolute top-3 right-3 text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 z-10">
                      {offer.badge}
                    </div>

                    <div className="relative z-10 flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-2xl ${offer.iconBg} flex items-center justify-center shrink-0`}>
                        <offer.icon className="h-7 w-7" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Highlight */}
                        <span className="text-xs font-black text-primary uppercase tracking-widest">{offer.highlight}</span>
                        {/* Title */}
                        <h4 className="text-sm font-bold text-foreground mt-0.5 leading-tight">{offer.title}</h4>
                        {/* Subtitle */}
                        <p className="text-xs text-muted-foreground mt-1">{offer.subtitle}</p>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="relative z-10 mt-4 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Via GrabYourCar Insurance</span>
                      <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        Grab Now <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Static cards below for mobile / direct grab */}
        <div className="container mx-auto px-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {offers.map((offer, index) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedOffer(offer)}
                className="group cursor-pointer"
              >
                <div className={`relative rounded-2xl border-2 border-border/60 bg-card p-6 hover:border-primary/50 hover:shadow-xl transition-all duration-300 overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${offer.gradient} opacity-40 group-hover:opacity-70 transition-opacity`} />

                  <div className="relative z-10">
                    {/* Badge */}
                    <div className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 inline-block mb-3">
                      {offer.badge}
                    </div>

                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl ${offer.iconBg} flex items-center justify-center mb-4`}>
                      <offer.icon className="h-7 w-7" />
                    </div>

                    {/* Content */}
                    <span className="text-lg font-black text-primary">{offer.highlight}</span>
                    <h4 className="text-base font-bold text-foreground mt-1 leading-tight">{offer.title}</h4>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{offer.description}</p>

                    {/* CTA Button */}
                    <Button
                      className="mt-4 w-full rounded-xl gap-2 font-bold"
                      size="sm"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Grab This Offer
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Capture Modal */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && resetModal()}>
        <DialogContent className="sm:max-w-md">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-heading">
                    <Gift className="h-5 w-5 text-primary" />
                    Grab Your Free Offer!
                  </DialogTitle>
                </DialogHeader>

                {selectedOffer && (
                  <div className="mt-4 space-y-5">
                    {/* Selected offer summary */}
                    <div className={`rounded-xl border border-primary/20 bg-primary/5 p-4`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${selectedOffer.iconBg} flex items-center justify-center shrink-0`}>
                          <selectedOffer.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-primary">{selectedOffer.highlight}</span>
                          <h4 className="text-sm font-bold text-foreground leading-tight">{selectedOffer.title}</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{selectedOffer.subtitle}</p>
                        </div>
                      </div>
                    </div>

                    {/* Condition */}
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                      <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>This offer is valid when you <strong className="text-foreground">buy car insurance through GrabYourCar</strong>. Our team will assist you with the best plan.</span>
                    </div>

                    {/* Form */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Your Name</label>
                        <Input
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">Mobile Number</label>
                        <div className="flex gap-2">
                          <div className="flex items-center bg-muted rounded-xl px-3 text-sm font-medium text-muted-foreground shrink-0">
                            +91
                          </div>
                          <Input
                            type="tel"
                            placeholder="Enter 10-digit number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            className="h-11 rounded-xl"
                            onKeyDown={(e) => e.key === "Enter" && handleGrabOffer()}
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleGrabOffer}
                      disabled={isSubmitting}
                      className="w-full h-12 rounded-xl font-bold text-base gap-2"
                    >
                      {isSubmitting ? "Submitting..." : (
                        <>
                          <Gift className="h-5 w-5" />
                          Grab This Offer Now
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>

                    <p className="text-[10px] text-center text-muted-foreground">
                      By proceeding, you agree to our T&Cs. No spam, guaranteed.
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </motion.div>
                <h3 className="text-xl font-heading font-bold text-foreground mb-2">Offer Grabbed! 🎉</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  You've selected: <strong className="text-foreground">{selectedOffer?.title}</strong>
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  Our insurance expert will call you within 30 minutes to help you get the best car insurance deal.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mx-auto max-w-xs">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span>Expect a call from <strong className="text-foreground">+91 98559 24442</strong></span>
                </div>
                <Button variant="outline" className="mt-5 rounded-xl" onClick={resetModal}>
                  Close
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
