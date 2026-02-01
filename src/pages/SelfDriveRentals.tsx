import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Car, Clock, MapPin, Shield, Bell, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SelfDriveRentals = () => {
  const [email, setEmail] = useState("");

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("You'll be notified when Self-Drive Rentals launches!");
      setEmail("");
    }
  };

  const features = [
    {
      icon: Car,
      title: "Wide Range of Cars",
      description: "From hatchbacks to SUVs, choose from our diverse fleet",
    },
    {
      icon: Clock,
      title: "Flexible Duration",
      description: "Rent by the hour, day, week, or month",
    },
    {
      icon: MapPin,
      title: "Pan-India Coverage",
      description: "Pick up and drop at multiple locations across India",
    },
    {
      icon: Shield,
      title: "Fully Insured",
      description: "Complete peace of mind with comprehensive insurance",
    },
  ];

  const upcomingBenefits = [
    "No security deposit for premium members",
    "24/7 roadside assistance",
    "Unlimited kilometers on select plans",
    "Doorstep delivery and pickup",
    "Clean, sanitized vehicles",
    "Easy online booking",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Clock className="h-4 w-4" />
              Coming Soon
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Self-Drive Car Rentals
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Drive your dream car without owning it. Freedom to explore with our upcoming self-drive rental service.
            </p>

            {/* Notify Form */}
            <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email for early access"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
                required
              />
              <Button type="submit" variant="cta" size="lg" className="h-12 px-8">
                <Bell className="h-4 w-4 mr-2" />
                Notify Me
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            What to Expect
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
              Upcoming Benefits
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingBenefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/50">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Be the First to Know
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            We're working hard to bring you the best self-drive rental experience. Sign up for updates and get exclusive early access!
          </p>
          <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base"
              required
            />
            <Button type="submit" variant="cta" size="lg" className="h-12">
              Get Early Access
            </Button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SelfDriveRentals;
