import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Phone, Mail, ArrowRight, CheckCircle, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppCTA, whatsappMessages } from "@/components/WhatsAppCTA";
import { captureWebsiteLead } from "@/lib/websiteLeadCapture";

export const CorporateCTA = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    city: "",
    fleetSize: "",
    carPreference: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName.trim() || !formData.contactPerson.trim() || !formData.phone.trim() || !formData.email.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      await captureWebsiteLead({
        name: `${formData.companyName} - ${formData.contactPerson}`,
        phone: formData.phone,
        email: formData.email,
        city: formData.city,
        carInterest: `Corporate Fleet: ${formData.fleetSize} vehicles - ${formData.carPreference}`,
        source: "corporate_cta",
        vertical: "corporate",
        type: "corporate",
        priority: "high",
        message: formData.message || `Corporate enquiry for ${formData.fleetSize || "multiple"} vehicles`,
      });

      const { trackLeadConversion } = await import("@/lib/adTracking");
      trackLeadConversion("corporate_enquiry");

      toast.success("Request submitted successfully!", {
        description: "Our corporate team will contact you within 24 hours.",
      });

      setFormData({
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        city: "",
        fleetSize: "",
        carPreference: "",
        message: "",
      });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          {/* Left Content */}
          <div className="text-white">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Looking for a Reliable{" "}
              <span className="text-foreground">Corporate Vehicle Partner?</span>
            </h2>
            <p className="text-slate-300 text-lg mb-8 leading-relaxed">
              Let's discuss how Grabyourcar can streamline your organization's 
              automotive needs with tailored solutions and dedicated support.
            </p>

            <div className="space-y-4 mb-8">
              {[
                "Volume discounts up to 15% on bulk orders",
                "Dedicated account manager for your organization",
                "Priority delivery and fast-track processing",
                "Flexible payment terms and financing options",
                "Comprehensive after-sales support",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <a 
                href="tel:+1155578093" 
                className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Call our corporate desk</p>
                  <p className="font-semibold">+91 98559 24442</p>
                </div>
              </a>
              <a 
                href="mailto:corporate@grabyourcar.com" 
                className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Email us</p>
                  <p className="font-semibold">corporate@grabyourcar.com</p>
                </div>
              </a>
            </div>

            {/* WhatsApp CTA */}
            <div className="mt-8">
              <WhatsAppCTA
                message={whatsappMessages.corporate}
                label="Chat for Corporate Deals"
                size="lg"
                className="w-full sm:w-auto"
              />
            </div>
          </div>

          {/* Form */}
          <Card className="p-6 md:p-8 bg-white dark:bg-card">
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">
              Request Corporate Pricing
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Fill out the form and our team will respond within 24 hours.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Company Name *
                  </label>
                  <Input
                    placeholder="Your Company"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    maxLength={100}
                    required
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Contact Person *
                  </label>
                  <Input
                    placeholder="Full Name"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    maxLength={100}
                    required
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="email@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    maxLength={255}
                    required
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Phone *
                  </label>
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    required
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    City
                  </label>
                  <Input
                    placeholder="Your City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    maxLength={50}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Fleet Size
                  </label>
                  <Input
                    placeholder="Number of vehicles"
                    value={formData.fleetSize}
                    onChange={(e) => setFormData({ ...formData, fleetSize: e.target.value })}
                    maxLength={20}
                    className="bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Car Preference
                </label>
                <Input
                  placeholder="e.g., SUVs, Sedans, Hatchbacks"
                  value={formData.carPreference}
                  onChange={(e) => setFormData({ ...formData, carPreference: e.target.value })}
                  maxLength={100}
                  className="bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Additional Requirements
                </label>
                <Textarea
                  placeholder="Tell us more about your fleet requirements..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  maxLength={500}
                  rows={3}
                  className="bg-background resize-none"
                />
              </div>

              <Button 
                type="submit" 
                variant="cta" 
                size="lg" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    Request Corporate Pricing
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By submitting, you agree to our terms and privacy policy
              </p>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};
