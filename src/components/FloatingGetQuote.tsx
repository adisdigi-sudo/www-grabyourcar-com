import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Shield, Car, FileText, Wrench, CreditCard, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const VERTICALS = [
  { value: "insurance", label: "Car Insurance", icon: Shield, color: "from-blue-500 to-blue-600", serviceCategory: "Insurance" },
  { value: "car_sales", label: "Buy a Car", icon: Car, color: "from-emerald-500 to-emerald-600", serviceCategory: "Car Sales" },
  { value: "car_loan", label: "Car Loan", icon: CreditCard, color: "from-purple-500 to-purple-600", serviceCategory: "Car Loan" },
  { value: "hsrp", label: "HSRP Plate", icon: FileText, color: "from-orange-500 to-orange-600", serviceCategory: "HSRP" },
  { value: "self_drive", label: "Self Drive Rental", icon: Wrench, color: "from-pink-500 to-pink-600", serviceCategory: "Self Drive" },
] as const;

export function FloatingGetQuote() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    vertical: "insurance",
    vehicle_number: "",
    city: "",
  });

  const selectedVertical = VERTICALS.find(v => v.value === form.vertical) || VERTICALS[0];

  const handleSubmit = async () => {
    if (!form.name.trim() || form.name.length > 100) {
      toast.error("Please enter a valid name");
      return;
    }
    const cleanPhone = form.phone.replace(/\D/g, "").replace(/^91/, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: form.name.trim().slice(0, 100),
        phone: cleanPhone,
        service_category: selectedVertical.serviceCategory,
        source: "Website Popup",
        city: form.city.trim().slice(0, 50) || null,
        car_model: form.vehicle_number.trim().slice(0, 30) || null,
        status: "New",
        priority: "high",
      });

      if (error) throw error;
      setSubmitted(true);
      toast.success("Quote request submitted! Our team will contact you shortly 🎉");
      setTimeout(() => { setSubmitted(false); setOpen(false); setForm({ name: "", phone: "", vertical: "insurance", vehicle_number: "", city: "" }); }, 3000);
    } catch (err: any) {
      console.error("Lead submission error:", err);
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 left-3 z-40 sm:bottom-24 sm:left-6 group"
          >
            <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-xl transition-all hover:scale-110">
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground relative z-10" />
            </div>
            <div className="hidden sm:flex absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border bg-card px-2.5 py-1 text-[11px] font-bold text-foreground shadow-lg items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 animate-pulse text-primary" />
              Get Quote
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Popup Form */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-auto sm:w-[420px] max-h-[90vh] overflow-auto rounded-2xl bg-card border shadow-2xl"
            >
              {submitted ? (
                /* Success State */
                <div className="p-8 text-center space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground">Quote Request Received! 🎉</h3>
                  <p className="text-sm text-muted-foreground">Our {selectedVertical.label} expert will call you within 15 minutes.</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className={cn("relative p-5 pb-4 rounded-t-2xl bg-gradient-to-br text-white", selectedVertical.color)}>
                    <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition">
                      <X className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                        <selectedVertical.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Get Free Quote</h3>
                        <p className="text-sm opacity-90">Instant {selectedVertical.label} quote</p>
                      </div>
                    </div>
                  </div>

                  {/* Vertical Selector */}
                  <div className="px-5 pt-4 pb-2">
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {VERTICALS.map(v => (
                        <button
                          key={v.value}
                          onClick={() => setForm(f => ({ ...f, vertical: v.value }))}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                            form.vertical === v.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                          )}
                        >
                          <v.icon className="h-3 w-3" />
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form */}
                  <div className="px-5 pb-5 space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-foreground">Full Name *</Label>
                      <Input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Enter your name"
                        className="h-10 mt-1"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-foreground">Phone Number *</Label>
                      <div className="flex mt-1">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-sm text-muted-foreground">+91</span>
                        <Input
                          value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                          placeholder="98XXXXXXXX"
                          className="h-10 rounded-l-none"
                          maxLength={10}
                          type="tel"
                        />
                      </div>
                    </div>
                    {(form.vertical === "insurance" || form.vertical === "hsrp") && (
                      <div>
                        <Label className="text-xs font-medium text-foreground">Vehicle Number</Label>
                        <Input
                          value={form.vehicle_number}
                          onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value.toUpperCase() }))}
                          placeholder="MH02AB1234"
                          className="h-10 mt-1 uppercase"
                          maxLength={15}
                        />
                      </div>
                    )}
                    {(form.vertical === "car_sales" || form.vertical === "car_loan") && (
                      <div>
                        <Label className="text-xs font-medium text-foreground">Preferred Car</Label>
                        <Input
                          value={form.vehicle_number}
                          onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))}
                          placeholder="e.g. Hyundai Creta"
                          className="h-10 mt-1"
                          maxLength={30}
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs font-medium text-foreground">City</Label>
                      <Input
                        value={form.city}
                        onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                        placeholder="e.g. Chandigarh"
                        className="h-10 mt-1"
                        maxLength={50}
                      />
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={loading}
                      className={cn("w-full h-11 text-sm font-semibold gap-2 rounded-xl bg-gradient-to-r shadow-lg transition-all hover:shadow-xl", selectedVertical.color)}
                    >
                      {loading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {loading ? "Submitting..." : "Get Free Quote"}
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground">
                      🔒 Your information is secure. We'll contact you within 15 minutes.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
