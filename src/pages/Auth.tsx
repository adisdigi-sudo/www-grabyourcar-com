import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Car, Phone, Shield, Bot } from "lucide-react";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";

const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signInWithPhone } = useAuth();
  const [phone, setPhone] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      phoneSchema.parse(phone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }
    setShowOTP(true);
  };

  const handleVerified = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithPhone(phone);
    if (error) {
      toast.error(error.message || "Login failed. Please try again.");
    } else {
      // Sync to unified CRM
      try {
        await supabase.functions.invoke("welcome-sync", {
          body: { phone: `91${phone}`, source: "auth_page" },
        });
      } catch { /* best effort */ }
      localStorage.setItem("gyc_otp_verified", "true");
      toast.success("Welcome to Grabyourcar! 🚗");
      navigate("/");
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center mx-auto mb-4 glow-border-pulse">
                <Car className="h-8 w-8 text-white" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-success/20">
                  <Bot className="h-4 w-4 text-success" />
                </div>
              </div>
              <h1 className="text-3xl font-heading font-bold">Welcome to Grabyourcar</h1>
              <p className="text-muted-foreground mt-2">
                Sign in with your WhatsApp number
              </p>
            </div>

            <Card className="glow-border-pulse">
              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {showOTP ? (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {isSubmitting ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-success" />
                          <p className="text-sm text-muted-foreground">Signing you in...</p>
                        </div>
                      ) : (
                        <WhatsAppOTPVerification
                          phone={phone}
                          onVerified={handleVerified}
                          onCancel={() => setShowOTP(false)}
                        />
                      )}
                    </motion.div>
                  ) : (
                    <motion.form
                      key="phone"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onSubmit={handleSendOTP}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-base font-medium">
                          WhatsApp Number
                        </Label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground text-sm">
                            <Phone className="h-4 w-4" />
                            <span>+91</span>
                          </div>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="Enter 10-digit number"
                            className="pl-16 h-12 text-base"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-12 text-base bg-[#25D366] hover:bg-[#128C7E] text-white">
                        <Shield className="h-4 w-4 mr-2" />
                        Continue with WhatsApp OTP
                      </Button>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 justify-center">
                        <Shield className="h-3.5 w-3.5 text-success" />
                        <span>OTP verified via WhatsApp • <strong className="text-foreground">100% Secure</strong></span>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Auth;
