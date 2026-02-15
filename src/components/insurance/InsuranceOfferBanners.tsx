import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Sparkles, Gift, ArrowRight, CheckCircle2, Shield, Phone } from "lucide-react";
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
}

const offers: Offer[] = [
  {
    id: "free-self-drive",
    icon: Car,
    title: "1 Day Free Self-Drive Car",
    subtitle: "Once a year — on us!",
    highlight: "FREE",
    description: "Buy car insurance through GrabYourCar and enjoy 1 full day of self-drive car rental absolutely free every year.",
    badge: "🚗 Most Popular",
  },
  {
    id: "car-wash-coupons",
    icon: Sparkles,
    title: "3 Premium Car Wash Coupons",
    subtitle: "Sparkle your ride — free!",
    highlight: "3x FREE",
    description: "Get 3 complimentary premium car wash & detailing coupons. Valid at 500+ partner centres across India.",
    badge: "✨ Best Value",
  },
  {
    id: "free-perfumes",
    icon: Gift,
    title: "Free Car Perfumes + 6 Months Free Shipping",
    subtitle: "Premium fragrances delivered free!",
    highlight: "6 MONTHS",
    description: "Receive premium car perfumes with 6 months of free shipping on all car accessory orders from GrabYourCar.",
    badge: "🎁 Exclusive",
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

  const resetModal = () => { setSelectedOffer(null); setSubmitted(false); setName(""); setPhone(""); };

  return (
    <>
      {/* Offer Cards Section — Acko-inspired clean design */}
      <section className="py-20 md:py-28 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,hsl(var(--primary)/0.04),transparent)]" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-4">
              Exclusive <span className="text-primary">rewards</span> when you buy via GrabYourCar
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Purchase your car insurance through us and grab any of these premium freebies
            </p>
          </motion.div>

          {/* Scrolling marquee */}
          <div className="relative mb-12">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-muted/20 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-muted/20 to-transparent z-10 pointer-events-none" />

            <div className="overflow-hidden">
              <div className="flex animate-scroll-left gap-6 items-stretch py-2">
                {[...offers, ...offers, ...offers, ...offers].map((offer, index) => (
                  <motion.div
                    key={`${offer.id}-${index}`}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedOffer(offer)}
                    className="flex-shrink-0 w-[360px] cursor-pointer group"
                  >
                    <div className="bg-card rounded-3xl border border-border/60 p-6 h-full hover:border-primary/40 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.12)] transition-all duration-500">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0">
                          <offer.icon className="h-7 w-7 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{offer.badge}</span>
                          <h4 className="text-sm font-bold text-foreground mt-1.5 leading-tight">{offer.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{offer.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/40">
                        <span className="text-xs text-muted-foreground">Via GrabYourCar</span>
                        <div className="w-8 h-8 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Static cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {offers.map((offer, index) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onClick={() => setSelectedOffer(offer)}
                className="group cursor-pointer"
              >
                <div className="bg-card rounded-3xl border-2 border-border/60 p-8 hover:border-primary/50 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.15)] transition-all duration-500 h-full">
                  {/* Badge */}
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">{offer.badge}</span>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mt-5 mb-5">
                    <offer.icon className="h-8 w-8 text-primary" />
                  </div>

                  {/* Content */}
                  <span className="text-2xl font-heading font-bold text-primary">{offer.highlight}</span>
                  <h4 className="text-lg font-bold text-foreground mt-1 leading-tight">{offer.title}</h4>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{offer.description}</p>

                  {/* CTA — Acko-style arrow */}
                  <div className="flex items-center justify-between mt-6 pt-5 border-t border-border/40">
                    <span className="text-sm font-bold text-foreground">Grab This Offer</span>
                    <div className="w-10 h-10 rounded-full border-2 border-border/60 group-hover:border-primary group-hover:bg-primary flex items-center justify-center transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
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
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-heading">
                    <Gift className="h-5 w-5 text-primary" />
                    Grab Your Free Offer!
                  </DialogTitle>
                </DialogHeader>

                {selectedOffer && (
                  <div className="mt-4 space-y-5">
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <selectedOffer.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-primary">{selectedOffer.highlight}</span>
                          <h4 className="text-sm font-bold text-foreground leading-tight">{selectedOffer.title}</h4>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
                      <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>This offer is valid when you <strong className="text-foreground">buy car insurance through GrabYourCar</strong>.</span>
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
                          <Input type="tel" placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className="h-11 rounded-xl" onKeyDown={(e) => e.key === "Enter" && handleGrabOffer()} />
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleGrabOffer} disabled={isSubmitting} className="w-full h-12 rounded-xl font-bold text-base gap-2">
                      {isSubmitting ? "Submitting..." : <><Gift className="h-5 w-5" /> Grab This Offer Now <ArrowRight className="h-5 w-5" /></>}
                    </Button>

                    <p className="text-[10px] text-center text-muted-foreground">
                      By proceeding, you agree to our T&Cs. No spam, guaranteed.
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </motion.div>
                <h3 className="text-xl font-heading font-bold text-foreground mb-2">Offer Grabbed! 🎉</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  You've selected: <strong className="text-foreground">{selectedOffer?.title}</strong>
                </p>
                <p className="text-xs text-muted-foreground mb-6">Our insurance expert will call you within 30 minutes.</p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3 mx-auto max-w-xs">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span>Expect a call from <strong className="text-foreground">+91 98559 24442</strong></span>
                </div>
                <Button variant="outline" className="mt-5 rounded-xl" onClick={resetModal}>Close</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}
