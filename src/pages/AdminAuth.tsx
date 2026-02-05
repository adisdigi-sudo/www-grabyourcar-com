import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, Loader2, Shield, KeyRound, Building2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@/assets/logo-grabyourcar-main.png";
import AdminForgotPassword from "@/components/admin/AdminForgotPassword";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const AdminAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/admin");
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        setIsSubmitting(false);
        return;
      }
    }

    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password");
      } else {
        toast.error(error.message);
      }
      setIsSubmitting(false);
      return;
    }

    toast.success("Welcome to Admin Dashboard!");
    navigate("/admin");
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <img 
                  src={logoImage} 
                  alt="Grabyourcar Admin" 
                  className="h-16 relative dark:invert"
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Admin Portal</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                Welcome Back, Admin
              </h1>
              <p className="text-muted-foreground mt-2">
                {showForgotPassword ? "Reset your password" : "Sign in to access the control center"}
              </p>
            </motion.div>
          </div>

          {/* Forgot Password or Login Card */}
          <AnimatePresence mode="wait">
            {showForgotPassword ? (
              <AdminForgotPassword
                key="forgot"
                onBack={() => setShowForgotPassword(false)}
              />
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <Card className="border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Admin Sign In
                    </CardTitle>
                    <CardDescription>
                      Enter your credentials to continue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="admin-email" className="text-sm font-medium">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="admin-email"
                            type="email"
                            placeholder="admin@grabyourcar.com"
                            className="pl-10 h-11 bg-background/50"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin-password" className="text-sm font-medium">
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="admin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-10 h-11 bg-background/50"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25" 
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Sign In to Dashboard
                          </>
                        )}
                      </Button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    </form>

                    {/* Security Notice */}
                    <div className="mt-6 pt-4 border-t border-border/50">
                      <div className="flex items-start gap-3 text-xs text-muted-foreground">
                        <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p>
                          This is a protected area. All login attempts are monitored and logged for security purposes.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-center mt-8"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Grabyourcar Admin Console</span>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-2">
              © {new Date().getFullYear()} Grabyourcar. All rights reserved.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAuth;
