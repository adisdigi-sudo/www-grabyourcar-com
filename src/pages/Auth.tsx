import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Lock, Loader2, Car, Phone, Shield, Bot, CheckCircle, Sparkles } from "lucide-react";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { WhatsAppOTPVerification } from "@/components/WhatsAppOTPVerification";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        setIsSubmitting(false);
        return;
      }
    }

    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
    
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      phoneSchema.parse(signupPhone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        setIsSubmitting(false);
        return;
      }
    }

    if (signupPassword !== signupConfirmPassword) {
      toast.error("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    // Require phone verification
    if (!isPhoneVerified) {
      setShowPhoneOTP(true);
      setIsSubmitting(false);
      return;
    }

    const { error } = await signUp(signupEmail, signupPassword);
    
    if (error) {
      if (error.message.includes("User already registered")) {
        toast.error("An account with this email already exists");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Account created successfully!");
      navigate("/");
    }
    
    setIsSubmitting(false);
  };

  const handlePhoneVerified = () => {
    setIsPhoneVerified(true);
    setShowPhoneOTP(false);
    toast.success("Phone verified! Complete your registration.");
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
                Sign in to save favorites and track your inquiries
              </p>
            </div>

            <Card className="glow-border-pulse">
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-2 w-full mb-6">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="Enter your password"
                            className="pl-10"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <AnimatePresence mode="wait">
                      {showPhoneOTP ? (
                        <motion.div
                          key="otp"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <WhatsAppOTPVerification
                            phone={signupPhone}
                            onVerified={handlePhoneVerified}
                            onCancel={() => setShowPhoneOTP(false)}
                          />
                        </motion.div>
                      ) : (
                        <motion.form
                          key="form"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          onSubmit={handleSignup}
                          className="space-y-4"
                        >
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="Enter your email"
                            className="pl-10"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-phone" className="flex items-center gap-2">
                          WhatsApp Number
                          {isPhoneVerified && (
                            <Badge variant="outline" className="text-[10px] border-success/50 text-success py-0">
                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                              Verified
                            </Badge>
                          )}
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-phone"
                            type="tel"
                            placeholder="10-digit WhatsApp number"
                            className="pl-10"
                            value={signupPhone}
                            onChange={(e) => {
                              setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                              setIsPhoneVerified(false);
                            }}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="Create a password (min 6 characters)"
                            className="pl-10"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-confirm-password"
                            type="password"
                            placeholder="Confirm your password"
                            className="pl-10"
                            value={signupConfirmPassword}
                            onChange={(e) => setSignupConfirmPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Verify & Create Account
                          </>
                        )}
                      </Button>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                        <Shield className="h-3.5 w-3.5 text-success" />
                        <span>WhatsApp OTP verified • <strong className="text-foreground">100% Secure</strong></span>
                      </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                </Tabs>
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