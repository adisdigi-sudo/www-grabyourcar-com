import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Shield, Clock, Gift, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

interface LeadFormProps {
  prefillCarInterest?: string;
}

export const LeadForm = ({ prefillCarInterest }: LeadFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    city: "",
    carInterest: prefillCarInterest || "",
    purchaseTimeline: "",
    budgetRange: "",
    financeRequired: "",
  });

  useEffect(() => {
    if (prefillCarInterest) {
      setFormData(prev => ({ ...prev, carInterest: prefillCarInterest }));
    }
  }, [prefillCarInterest]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: "Please fill required fields", description: "Name and phone number are required", variant: "destructive" });
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      toast({ title: "Invalid phone number", description: "Please enter a valid 10-digit Indian mobile number", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("leads").insert({
        customer_name: formData.name.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim() || null,
        car_model: formData.carInterest.trim() || null,
        buying_timeline: formData.purchaseTimeline || null,
        source: "homepage_form",
        lead_type: "car_inquiry",
        status: "new",
        priority: formData.purchaseTimeline === "immediate" ? "high" : "medium",
        notes: [
          formData.budgetRange && `Budget: ${formData.budgetRange}`,
          formData.financeRequired && `Finance: ${formData.financeRequired}`,
        ].filter(Boolean).join(" | ") || null,
      });

      if (error) throw error;

      // Trigger WhatsApp
      try {
        await supabase.functions.invoke("whatsapp-send", {
          body: {
            phone: `91${formData.phone}`,
            template: "lead_created",
            params: { name: formData.name, car: formData.carInterest || "New Car" },
          },
        });
      } catch { /* best effort */ }

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setIsSubmitted(true);

      toast({ title: "🎉 Request Submitted!", description: "Our car expert will call you within 30 minutes." });
      setFormData({ name: "", phone: "", city: "", carInterest: "", purchaseTimeline: "", budgetRange: "", financeRequired: "" });
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="lead-form" className="py-16 md:py-24 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-primary-foreground">
              <Badge variant="secondary" className="mb-6">
                <Gift className="h-4 w-4 mr-2" />
                Free Quote in 2 Minutes
              </Badge>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Get the Best Deal on Your Dream Car
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8">
                Share your details and our car experts will find you the best offers from multiple authorized dealers across India.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, text: "100% Free, No Hidden Charges" },
                  { icon: Clock, text: "Get Callback Within 30 Minutes" },
                  { icon: CheckCircle, text: "Compare Offers from 500+ Dealers" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="p-8">
              {isSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">We've Got Your Request! 🎉</h3>
                  <p className="text-muted-foreground">Our expert will call you within 30 minutes.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Your Name *</label>
                    <Input placeholder="Enter your full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12" maxLength={100} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Mobile Number *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-input bg-muted text-muted-foreground">+91</span>
                      <Input placeholder="Enter 10-digit mobile" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="rounded-l-none h-12" type="tel" maxLength={10} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">City</label>
                      <Input placeholder="e.g., Mumbai, Delhi" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="h-12" maxLength={50} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Car Interest</label>
                      <Input placeholder="Which car?" value={formData.carInterest} onChange={(e) => setFormData({ ...formData, carInterest: e.target.value })} className="h-12" maxLength={100} />
                    </div>
                  </div>

                  {/* Smart Qualification */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Timeline</label>
                      <Select value={formData.purchaseTimeline} onValueChange={(v) => setFormData({ ...formData, purchaseTimeline: v })}>
                        <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="When?" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Now</SelectItem>
                          <SelectItem value="1_month">1 Month</SelectItem>
                          <SelectItem value="3_months">3 Months</SelectItem>
                          <SelectItem value="exploring">Exploring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Budget</label>
                      <Select value={formData.budgetRange} onValueChange={(v) => setFormData({ ...formData, budgetRange: v })}>
                        <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Range?" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under_5L">Under ₹5L</SelectItem>
                          <SelectItem value="5_10L">₹5-10L</SelectItem>
                          <SelectItem value="10_15L">₹10-15L</SelectItem>
                          <SelectItem value="15_25L">₹15-25L</SelectItem>
                          <SelectItem value="25L+">₹25L+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Finance?</label>
                      <Select value={formData.financeRequired} onValueChange={(v) => setFormData({ ...formData, financeRequired: v })}>
                        <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Need?" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="maybe">Maybe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" variant="hero" size="xl" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                    ) : (
                      "Get Best Deal Now"
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">By submitting, you agree to our Terms & Privacy Policy</p>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
