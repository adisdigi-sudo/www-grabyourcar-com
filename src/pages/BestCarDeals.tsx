import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Gift, Phone, Shield, Clock, Loader2, Car, MessageCircle, Percent, Star } from "lucide-react";
import { toast } from "sonner";
import { trackLeadConversion } from "@/lib/adTracking";
import { PHONE_NUMBER, getWhatsAppLink } from "@/config/contact";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { captureWebsiteLead } from "@/lib/websiteLeadCapture";

const BestCarDeals = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: deals, isLoading } = useQuery({
    queryKey: ["best-car-deals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cars")
        .select("id, name, brand, slug, price_range, discount, original_price")
        .not("discount", "is", null)
        .eq("is_discontinued", false)
        .order("is_hot", { ascending: false })
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
        source: "best_deals_landing",
        vertical: "car",
        type: "high_intent",
        priority: "high",
        message: "Best deals landing page lead",
      });
      trackLeadConversion("best_car_deals");
      navigate(`/thank-you?source=best-deals`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Best Car Deals This Month — Save Up To ₹2 Lakh | GrabYourCar</title>
        <meta name="description" content="Exclusive car deals and discounts this month. Save up to ₹2 Lakh on new cars with GrabYourCar." />
      </Helmet>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-destructive/5 to-background py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <Badge className="mb-4 bg-destructive/10 text-destructive border-destructive/30">
              <Gift className="h-3 w-3 mr-1" /> Limited Time Offers
            </Badge>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground mb-4">
              Best Car Deals — Save Up To <span className="text-destructive">₹2 Lakh</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Exclusive discounts, exchange bonuses, and festive offers on India's top-selling cars.
            </p>

            {/* Lead Form */}
            <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-card rounded-2xl border border-border p-6 shadow-xl space-y-4">
              <Input placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="h-12" maxLength={100} />
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-input bg-muted text-muted-foreground text-sm">+91</span>
                <Input type="tel" placeholder="10-digit number" className="rounded-l-none h-12" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </div>
              <Button type="submit" variant="destructive" className="w-full h-12 text-base font-bold" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Gift className="h-4 w-4 mr-2" /> Unlock Best Deals</>}
              </Button>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-success" /> No Spam</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-success" /> Expert Call in 30 min</span>
              </div>
            </form>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <a href={getWhatsAppLink("Hi! I want the best car deals this month.")} target="_blank" rel="noopener noreferrer">
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

        {/* Deals Grid */}
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-heading font-bold text-center mb-8">Featured Deals</h2>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {deals?.map((car) => (
                  <Card key={car.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/car/${car.slug}`)}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">{car.brand}</p>
                          <p className="font-bold text-foreground">{car.name}</p>
                        </div>
                        {car.discount && (
                          <Badge className="bg-destructive/10 text-destructive border-0">
                            <Percent className="h-3 w-3 mr-1" /> {car.discount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm text-primary font-semibold">{car.price_range || "Price on request"}</p>
                        {car.original_price && <p className="text-xs text-muted-foreground line-through">{car.original_price}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Trust */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              {["Verified Dealers", "Best Price Guarantee", "Free RC Transfer", "Pan-India Delivery"].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
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

export default BestCarDeals;
