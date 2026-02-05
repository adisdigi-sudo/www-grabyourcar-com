import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

interface AdminForgotPasswordProps {
  onBack: () => void;
}

const AdminForgotPassword = ({ onBack }: AdminForgotPasswordProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const redirectUrl = `${window.location.origin}/admin-reset-password`;
      
      const { data, error } = await supabase.functions.invoke("admin-password-reset", {
        body: { email, redirectUrl },
      });

      if (error) throw error;

      if (data?.success) {
        setIsSuccess(true);
        toast.success("Reset link sent! Check your email.");
      } else {
        throw new Error(data?.error || "Failed to send reset link");
      }
    } catch (error) {
      console.error("Reset error:", error);
      // Always show success to prevent email enumeration
      setIsSuccess(true);
      toast.success("If an account exists, a reset link has been sent.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm">
          <CardContent className="pt-8 pb-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mx-auto mb-6 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center"
            >
              <CheckCircle className="h-8 w-8 text-green-500" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">Check Your Email</h3>
            <p className="text-muted-foreground text-sm mb-6">
              If an admin account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              The link will expire in 1 hour. Don't forget to check your spam folder.
            </p>
            <Button
              variant="outline"
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

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
            <KeyRound className="h-8 w-8 text-primary" />
          </motion.div>
          <CardTitle className="text-xl">Forgot Password?</CardTitle>
          <CardDescription className="text-center">
            Enter your admin email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="admin@grabyourcar.com"
                  className="pl-10 h-11 bg-background/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11"
              disabled={isSubmitting || !email}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminForgotPassword;
