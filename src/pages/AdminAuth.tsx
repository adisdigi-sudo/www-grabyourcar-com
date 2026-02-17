import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVerticalAccess, BusinessVertical } from "@/hooks/useVerticalAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Loader2, Shield, KeyRound, Building2, Eye, EyeOff, User, ArrowLeft, Crown, Phone, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@/assets/logo-grabyourcar-main.png";
import AdminForgotPassword from "@/components/admin/AdminForgotPassword";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type LoginStep =
  | "choose-type"
  | "team-login"        // Enter User ID + Password first
  | "select-vertical"   // Show ONLY assigned verticals after auth
  | "super-admin-phone"
  | "super-admin-otp"
  | "forgot-password";

const AdminAuth = () => {
  const navigate = useNavigate();
  const { user, signIn, signInWithPhone, loading } = useAuth();
  const { setActiveVertical } = useVerticalAccess();

  const [step, setStep] = useState<LoginStep>("choose-type");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Super Admin OTP state
  const [superAdminPhone, setSuperAdminPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  // After team login: store assigned verticals
  const [assignedVerticals, setAssignedVerticals] = useState<BusinessVertical[]>([]);
  const [verticalsLoading, setVerticalsLoading] = useState(false);

  // Redirect if already logged in (but not during vertical selection)
  useEffect(() => {
    if (user && !loading && step !== "select-vertical") {
      navigate("/workspace");
    }
  }, [user, loading, navigate, step]);

  const constructEmail = (uname: string): string => {
    if (uname.includes("@")) return uname;
    return `${uname.toLowerCase().trim()}@grabyourcar.app`;
  };

  // ── STEP 1: Team Login — credentials first ──
  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter User ID and Password");
      return;
    }
    setIsSubmitting(true);

    const email = constructEmail(username);
    const { error } = await signIn(email, password);

    if (error) {
      toast.error(
        error.message.includes("Invalid login credentials")
          ? "Invalid User ID or Password"
          : error.message
      );
      setIsSubmitting(false);
      return;
    }

    // Credentials valid → now fetch assigned verticals
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;

    if (!userId) {
      toast.error("Session error. Please try again.");
      await supabase.auth.signOut();
      setIsSubmitting(false);
      return;
    }

    // Check roles
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    // BLOCK super_admin from team login — they MUST use OTP
    const isSuperAdmin = userRoles?.some((r) => r.role === "super_admin");
    if (isSuperAdmin) {
      toast.error("Super Admins must login via WhatsApp OTP, not User ID/Password.");
      await supabase.auth.signOut();
      setIsSubmitting(false);
      return;
    }

    const isAdminUser = userRoles?.some(
      (r) => r.role === "admin"
    );

    // Fetch verticals
    setVerticalsLoading(true);
    let userVerticals: BusinessVertical[] = [];

    if (isAdminUser) {
      // Admins see all active verticals
      const { data } = await supabase
        .from("business_verticals")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      userVerticals = (data as BusinessVertical[]) || [];
    } else {
      // Regular users see ONLY assigned verticals
      const { data: accessData } = await supabase
        .from("user_vertical_access")
        .select("vertical_id")
        .eq("user_id", userId);

      if (!accessData || accessData.length === 0) {
        toast.error("No workspace assigned. Contact your Super Admin.");
        await supabase.auth.signOut();
        setIsSubmitting(false);
        setVerticalsLoading(false);
        return;
      }

      const verticalIds = accessData.map((a) => a.vertical_id);
      const { data: vData } = await supabase
        .from("business_verticals")
        .select("*")
        .in("id", verticalIds)
        .eq("is_active", true)
        .order("sort_order");
      userVerticals = (vData as BusinessVertical[]) || [];
    }

    setVerticalsLoading(false);

    if (userVerticals.length === 0) {
      toast.error("No active workspaces available. Contact your Super Admin.");
      await supabase.auth.signOut();
      setIsSubmitting(false);
      return;
    }

    // If only 1 vertical → auto-select and go directly
    if (userVerticals.length === 1) {
      setActiveVertical(userVerticals[0]);
      toast.success(`Welcome to ${userVerticals[0].name}!`);
      navigate("/admin");
      setIsSubmitting(false);
      return;
    }

    // Multiple verticals → show selection
    setAssignedVerticals(userVerticals);
    setStep("select-vertical");
    setIsSubmitting(false);
  };

  // ── STEP 2: Select vertical (after successful auth) ──
  const handleSelectVertical = (vertical: BusinessVertical) => {
    setActiveVertical(vertical);
    toast.success(`Welcome to ${vertical.name}!`);
    navigate("/admin");
  };

  // ── Super Admin: Send OTP ──
  // Registered Super Admin numbers (primary + backup)
  const REGISTERED_SA_NUMBERS = ["9855924442"];

  const handleSendSuperAdminOTP = async () => {
    const cleanNum = superAdminPhone.replace(/\D/g, "").replace(/^91/, "");
    if (cleanNum.length !== 10) {
      toast.error("Enter a valid 10-digit WhatsApp number");
      return;
    }
    if (!REGISTERED_SA_NUMBERS.includes(cleanNum)) {
      toast.error("This number is not registered as a Super Admin.");
      return;
    }
    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-otp", {
        body: { action: "send", phone: superAdminPhone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStep("super-admin-otp");
      toast.success("OTP sent to your WhatsApp!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  // ── Super Admin: Verify OTP → auto-login → check role → workspace ──
  const handleVerifySuperAdminOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Enter 6-digit OTP");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-otp", {
        body: { action: "verify", phone: superAdminPhone, otp },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setIsSubmitting(false);
        return;
      }

      if (!data?.verified) {
        toast.error("Invalid OTP. Try again.");
        setIsSubmitting(false);
        return;
      }

      // OTP verified → auto-login via phone shadow account
      const { error: loginError } = await signInWithPhone(superAdminPhone);
      if (loginError) {
        toast.error("Login failed: " + loginError.message);
        setIsSubmitting(false);
        return;
      }

      // Verify super_admin role
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (userId) {
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        const isSA = userRoles?.some((r) => r.role === "super_admin");
        if (!isSA) {
          toast.error("This number is not registered as a Super Admin.");
          await supabase.auth.signOut();
          setIsSubmitting(false);
          return;
        }
      }

      toast.success("Welcome, Super Admin!");
      navigate("/workspace");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === "team-login") setStep("choose-type");
    else if (step === "select-vertical") {
      // Sign out since they're authenticated but want to go back
      supabase.auth.signOut();
      setAssignedVerticals([]);
      setStep("team-login");
    }
    else if (step === "super-admin-phone") setStep("choose-type");
    else if (step === "super-admin-otp") setStep("super-admin-phone");
    else if (step === "forgot-password") setStep("team-login");
    else setStep("choose-type");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stepTitle: Record<LoginStep, string> = {
    "choose-type": "Sign In to CRM",
    "team-login": "Team Login",
    "select-vertical": "Select Your Workspace",
    "super-admin-phone": "Super Admin Login",
    "super-admin-otp": "WhatsApp Verification",
    "forgot-password": "Reset Password",
  };

  const stepSubtitle: Record<LoginStep, string> = {
    "choose-type": "Choose your login method",
    "team-login": "Enter your User ID & Password",
    "select-vertical": "You'll only see your assigned department(s)",
    "super-admin-phone": "Verify via WhatsApp OTP — no password needed",
    "super-admin-otp": `Enter the OTP sent to +91 ${superAdminPhone}`,
    "forgot-password": "We'll help you reset your password",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <img src={logoImage} alt="Grabyourcar Admin" className="h-16 relative dark:invert" />
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Enterprise CRM</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              {stepTitle[step]}
            </h1>
            <p className="text-muted-foreground mt-2">{stepSubtitle[step]}</p>
          </div>

          <AnimatePresence mode="wait">
            {/* ═══ CHOOSE TYPE ═══ */}
            {step === "choose-type" && (
              <motion.div key="choose" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className="space-y-4">
                  <Card
                    className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group"
                    onClick={() => setStep("team-login")}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground">Team Login</h3>
                        <p className="text-sm text-muted-foreground">
                          User ID & Password → Your workspace
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className="cursor-pointer hover:shadow-lg hover:border-amber-500/30 transition-all group"
                    onClick={() => setStep("super-admin-phone")}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Crown className="h-7 w-7 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground">Super Admin</h3>
                        <p className="text-sm text-muted-foreground">
                          WhatsApp OTP only — full access
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* ═══ TEAM LOGIN: Credentials first ═══ */}
            {step === "team-login" && (
              <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-border/50 shadow-xl shadow-primary/5">
                  <CardContent className="p-6">
                    <form onSubmit={handleTeamLogin} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="admin-username" className="text-sm font-medium">
                          User ID
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="admin-username"
                            type="text"
                            placeholder="your user ID"
                            className="pl-10 h-11 bg-background/50"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          e.g. rahul → rahul@grabyourcar
                        </p>
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Authenticating...
                          </>
                        ) : (
                          <>
                            <KeyRound className="h-4 w-4 mr-2" /> Sign In
                          </>
                        )}
                      </Button>

                      <div className="flex items-center justify-between">
                        <Button type="button" variant="ghost" size="sm" onClick={goBack}>
                          <ArrowLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                        <button
                          type="button"
                          onClick={() => setStep("forgot-password")}
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ═══ SELECT VERTICAL (after auth — shows ONLY assigned) ═══ */}
            {step === "select-vertical" && (
              <motion.div key="verticals" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-border/50 shadow-xl shadow-primary/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Authenticated successfully</span>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Select your workspace below — only your assigned departments are shown
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {verticalsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {assignedVerticals.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => handleSelectVertical(v)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left w-full group"
                          >
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                              style={{ backgroundColor: `${v.color}15` }}
                            >
                              <Shield className="h-5 w-5" style={{ color: v.color || "#3B82F6" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground">{v.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {v.description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <Button variant="ghost" className="w-full mt-4" onClick={goBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Sign Out & Go Back
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ═══ SUPER ADMIN: Phone Entry ═══ */}
            {step === "super-admin-phone" && (
              <motion.div key="sa-phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-border/50 shadow-xl shadow-amber-500/5">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      Super Admin Verification
                    </CardTitle>
                    <CardDescription>
                      Enter your registered WhatsApp number — OTP only, no password needed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">WhatsApp Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="10-digit mobile number"
                          className="pl-10 h-11"
                          value={superAdminPhone}
                          onChange={(e) =>
                            setSuperAdminPhone(
                              e.target.value.replace(/\D/g, "").slice(0, 10)
                            )
                          }
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSendSuperAdminOTP}
                      className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white"
                      disabled={otpSending || superAdminPhone.length < 10}
                    >
                      {otpSending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Shield className="h-4 w-4 mr-2" />
                      )}
                      Send WhatsApp OTP
                    </Button>

                    <Button variant="ghost" className="w-full" onClick={goBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ═══ SUPER ADMIN: OTP Entry → auto login ═══ */}
            {step === "super-admin-otp" && (
              <motion.div key="sa-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="border-border/50 shadow-xl shadow-amber-500/5">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      Enter OTP
                    </CardTitle>
                    <CardDescription>Sent to +91 {superAdminPhone}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot key={i} index={i} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <Button
                      onClick={handleVerifySuperAdminOTP}
                      className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white"
                      disabled={isSubmitting || otp.length !== 6}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Crown className="h-4 w-4 mr-2" />
                      )}
                      Verify & Enter CRM
                    </Button>

                    <Button variant="ghost" className="w-full" onClick={goBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ═══ FORGOT PASSWORD ═══ */}
            {step === "forgot-password" && (
              <motion.div key="forgot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <AdminForgotPassword onBack={goBack} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Grabyourcar Enterprise CRM</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-muted-foreground mt-3 justify-center">
              <Shield className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <p>Protected area. All login attempts are monitored &amp; logged.</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAuth;
