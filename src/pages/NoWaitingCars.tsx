import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Zap, Phone, Shield, Clock, CheckCircle, Loader2, Car, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { trackLeadConversion } from "@/lib/adTracking";
import { PHONE_NUMBER, getWhatsAppLink } from "@/config/contact";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { captureWebsiteLead } from "@/lib/websiteLeadCapture";

const NoWaitingCars = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: cars, isLoading } = useQuery({
    queryKey: ["no-waiting-cars"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cars")
        .select("id, name, brand, slug, price_range, body_type")
        .eq("availability", "in_stock")
        .eq("is_discontinued", false)
        .order("is_bestseller", { ascending: false })
        .limit(12);
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Please enter your name and valid 10-digit number");
      return;
    }
    setIsSubmitting(true);
    try {
      await captureWebsiteLead({
        name,
        phone,
        source: "no_waiting_cars_landing",
        vertical: "car",
        type: "high_intent",
        priority: "high",
        message: "Ready stock car lead from no waiting page",
      });
      trackLeadConversion("no_waiting_cars");
      navigate(`/thank-you?source=no-waiting&car=Ready+Stock`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Zero Waiting Period Cars — Drive Home Today | GrabYourCar</title>
        <meta name="description" content="Get ready-stock cars with zero waiting period. Drive home today with the best deals from GrabYourCar." />
      </Helmet>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <Badge className="mb-4 bg-success/10 text-foreground border-success/30">
              <Zap className="h-3 w-3 mr-1" /> Zero Waiting Period
            </Badge>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-4">
              Drive Home <span className="text-foreground">Today</span> — No Waiting
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Skip months of waiting. Get ready-stock cars at the best prices with instant delivery.
            </p>

            {/* Lead Form */}
            <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-card rounded-2xl border border-border p-6 shadow-xl space-y-4">
              <Input placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="h-12" maxLength={100} />
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-input bg-muted text-muted-foreground text-sm">+91</span>
                <Input type="tel" placeholder="10-digit number" className="rounded-l-none h-12" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Car className="h-4 w-4 mr-2" /> Get Instant Delivery Deals</>}
              </Button>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-foreground" /> 100% Free</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-foreground" /> Callback in 30 min</span>
              </div>
            </form>

            {/* Quick CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <a href={getWhatsAppLink("Hi! I want ready-stock cars with no waiting period.")} target="_blank" rel="noopener noreferrer">
                <Button variant="whatsapp" size="lg" className="w-full sm:w-auto gap-2">
                  <MessageCircle className="h-4 w-4" /> WhatsApp Us
                </Button>
              </a>
              <a href={`tel:${PHONE_NUMBER}`}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  <Phone className="h-4 w-4" /> Call Now
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Car Listings */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-heading font-bold text-center mb-8">Ready Stock Cars</h2>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {cars?.map((car) => (
                  <Card key={car.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/car/${car.slug}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{car.brand}</p>
                        <p className="font-bold text-foreground">{car.name}</p>
                        <p className="text-sm text-foreground font-semibold">{car.price_range || "Price on request"}</p>
                      </div>
                      <Badge variant="outline" className="text-foreground border-success/30">
                        <CheckCircle className="h-3 w-3 mr-1" /> In Stock
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              {["500+ Happy Customers", "50+ Brand Partners", "Zero Hidden Charges", "Pan-India Delivery"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-foreground" />
                  <span className="font-medium">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default NoWaitingCars;
