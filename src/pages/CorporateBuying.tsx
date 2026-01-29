import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  TrendingDown, 
  Shield, 
  Clock, 
  CheckCircle,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const benefits = [
  {
    icon: TrendingDown,
    title: "Volume Discounts",
    description: "Get exclusive bulk pricing on fleet purchases",
  },
  {
    icon: Users,
    title: "Dedicated Account Manager",
    description: "Personal support for all your corporate needs",
  },
  {
    icon: Clock,
    title: "Priority Delivery",
    description: "Fast-track processing for corporate orders",
  },
  {
    icon: Shield,
    title: "Extended Warranty",
    description: "Enhanced coverage for business vehicles",
  },
];

const CorporateBuying = () => {
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

    // Validation
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
      const { error } = await supabase.functions.invoke("submit-lead", {
        body: {
          name: `${formData.companyName} - ${formData.contactPerson}`,
          phone: formData.phone,
          email: formData.email,
          city: formData.city,
          carInterest: `Corporate Fleet: ${formData.fleetSize} vehicles - ${formData.carPreference}`,
          message: formData.message,
          type: "corporate",
        },
      });

      if (error) throw error;

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
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-4">
              <Building2 className="h-3 w-3 mr-1" />
              Corporate Solutions
            </Badge>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-6">
              Fleet Solutions for Your Business
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Get exclusive bulk discounts, dedicated support, and priority delivery for your corporate fleet needs. 
              From startups to enterprises, we've got you covered.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12 md:py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Form */}
            <Card className="p-6 md:p-8">
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
                Request a Quote
              </h2>
              <p className="text-muted-foreground mb-6">
                Fill out the form and our corporate team will get back to you within 24 hours.
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
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Fleet Size
                    </label>
                    <Input
                      placeholder="Number of vehicles needed"
                      value={formData.fleetSize}
                      onChange={(e) => setFormData({ ...formData, fleetSize: e.target.value })}
                      maxLength={20}
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
                    rows={4}
                  />
                </div>

                <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Get Corporate Quote"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By submitting, you agree to our terms and privacy policy
                </p>
              </form>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-4">
                  Why Choose Us for Corporate Fleet?
                </h3>
                <ul className="space-y-3">
                  {[
                    "Pan-India dealer network for seamless delivery",
                    "Customized financing options for businesses",
                    "Comprehensive insurance packages",
                    "Dedicated after-sales support",
                    "Flexible payment terms",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Card className="p-6 bg-primary/5 border-primary/20">
                <h4 className="font-heading font-semibold text-foreground mb-4">
                  Contact Our Corporate Team
                </h4>
                <div className="space-y-3">
                  <a href="tel:+919876543210" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="h-5 w-5 text-primary" />
                    +91 98765 43210
                  </a>
                  <a href="mailto:corporate@grabyourcar.com" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-5 w-5 text-primary" />
                    corporate@grabyourcar.com
                  </a>
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>Pan-India Operations, Headquarters: Delhi NCR</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CorporateBuying;