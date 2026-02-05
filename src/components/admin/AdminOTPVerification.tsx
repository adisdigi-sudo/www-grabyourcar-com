import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Shield, Mail, RefreshCw, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface AdminOTPVerificationProps {
  email: string;
  userId: string;
  onVerified: () => void;
  onCancel: () => void;
}

const AdminOTPVerification = ({ email, userId, onVerified, onCancel }: AdminOTPVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // Send OTP on mount
  useEffect(() => {
    sendOTP();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const sendOTP = async () => {
    if (cooldown > 0) return;
    
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-otp", {
        body: { action: "send", email, userId },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Verification code sent to your email");
        setCooldown(60); // 60 second cooldown
        setAttemptsLeft(3);
      } else {
        throw new Error(data?.error || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send verification code");
    } finally {
      setIsSending(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-otp", {
        body: { action: "verify", email, userId, otp },
      });

      if (error) throw error;

      if (data?.verified) {
        toast.success("Verification successful!");
        onVerified();
      } else if (data?.expired || data?.maxAttempts) {
        toast.error(data.error);
        setOtp("");
        setCooldown(0); // Allow resend
      } else if (data?.attemptsLeft !== undefined) {
        setAttemptsLeft(data.attemptsLeft);
        toast.error(`${data.error}. ${data.attemptsLeft} attempts remaining.`);
        setOtp("");
      } else {
        throw new Error(data?.error || "Verification failed");
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === 6) {
      verifyOTP();
    }
  }, [otp]);

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm">
        <CardHeader className="pb-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Mail className="h-8 w-8 text-primary" />
          </motion.div>
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-center">
            We've sent a 6-digit verification code to<br />
            <span className="font-medium text-foreground">{maskedEmail}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OTP Input */}
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              disabled={isVerifying}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Attempts indicator */}
          <AnimatePresence>
            {attemptsLeft < 3 && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm text-destructive"
              >
                {attemptsLeft} attempts remaining
              </motion.p>
            )}
          </AnimatePresence>

          {/* Verify Button */}
          <Button
            onClick={verifyOTP}
            disabled={otp.length !== 6 || isVerifying}
            className="w-full h-11"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Code
              </>
            )}
          </Button>

          {/* Resend Button */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Didn't receive the code?</span>
            <Button
              variant="link"
              size="sm"
              onClick={sendOTP}
              disabled={cooldown > 0 || isSending}
              className="p-0 h-auto"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : cooldown > 0 ? (
                <span className="text-muted-foreground">Resend in {cooldown}s</span>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Resend Code
                </>
              )}
            </Button>
          </div>

          {/* Cancel Button */}
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>

          {/* Security Notice */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-start gap-3 text-xs text-muted-foreground">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                This code expires in 5 minutes. For security, never share this code with anyone.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminOTPVerification;
