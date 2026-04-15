 import { useState, useEffect, useRef } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { Input } from "@/components/ui/input";
 import { Button } from "@/components/ui/button";
 import { Label } from "@/components/ui/label";
 import { Badge } from "@/components/ui/badge";
 import { Car, Bot, Shield, CheckCircle2, Loader2, RefreshCw, Phone } from "lucide-react";
 import { toast } from "sonner";
 import { cn } from "@/lib/utils";
 import confetti from "canvas-confetti";
 
 interface WhatsAppOTPVerificationProps {
   phone: string;
   onVerified: () => void;
   onCancel?: () => void;
   className?: string;
 }
 
 export const WhatsAppOTPVerification = ({
   phone,
   onVerified,
   onCancel,
   className,
 }: WhatsAppOTPVerificationProps) => {
   const [otp, setOtp] = useState(["", "", "", "", "", ""]);
   const [isVerifying, setIsVerifying] = useState(false);
   const [isSending, setIsSending] = useState(false);
   const [otpSent, setOtpSent] = useState(false);
   const [countdown, setCountdown] = useState(0);
   const [error, setError] = useState("");
   const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
 
   // Send OTP on mount
   useEffect(() => {
     sendOTP();
   }, []);
 
   // Countdown timer
   useEffect(() => {
     if (countdown > 0) {
       const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
       return () => clearTimeout(timer);
     }
   }, [countdown]);
 
   const sendOTP = async () => {
     setIsSending(true);
     setError("");
     try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ action: "send", phone }),
          }
        );
 
       const data = await response.json();
 
       if (!response.ok) {
         if (data.cooldown) {
           setCountdown(60);
         }
         throw new Error(data.error || "Failed to send OTP");
       }
 
       setOtpSent(true);
       setCountdown(60);
       toast.success("🚗 OTP sent to your WhatsApp!");
       // Focus first input
       setTimeout(() => inputRefs.current[0]?.focus(), 100);
     } catch (err) {
       const message = err instanceof Error ? err.message : "Failed to send OTP";
       setError(message);
       toast.error(message);
     } finally {
       setIsSending(false);
     }
   };
 
   const handleOtpChange = (index: number, value: string) => {
     if (!/^\d*$/.test(value)) return;
 
     const newOtp = [...otp];
     newOtp[index] = value.slice(-1);
     setOtp(newOtp);
     setError("");
 
     // Auto-focus next input
     if (value && index < 5) {
       inputRefs.current[index + 1]?.focus();
     }
 
     // Auto-verify when all digits entered
     if (newOtp.every((d) => d) && newOtp.join("").length === 6) {
       verifyOTP(newOtp.join(""));
     }
   };
 
   const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
     if (e.key === "Backspace" && !otp[index] && index > 0) {
       inputRefs.current[index - 1]?.focus();
     }
   };
 
   const handlePaste = (e: React.ClipboardEvent) => {
     e.preventDefault();
     const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
     if (pasted.length === 6) {
       const newOtp = pasted.split("");
       setOtp(newOtp);
       verifyOTP(pasted);
     }
   };
 
   const verifyOTP = async (otpValue: string) => {
     setIsVerifying(true);
     setError("");
     try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ action: "verify", phone, otp: otpValue }),
          }
        );
 
       const data = await response.json();
 
       if (!response.ok) {
         if (data.expired || data.maxAttempts) {
           setOtp(["", "", "", "", "", ""]);
           setOtpSent(false);
         }
         throw new Error(data.error || "Verification failed");
       }
 
       // Success!
       confetti({
         particleCount: 100,
         spread: 70,
         origin: { y: 0.6 },
         colors: ["#22c55e", "#16a34a", "#15803d", "#ffffff"],
       });
 
       toast.success("✅ Phone verified successfully!");
       onVerified();
     } catch (err) {
       const message = err instanceof Error ? err.message : "Verification failed";
       setError(message);
       toast.error(message);
       setOtp(["", "", "", "", "", ""]);
       inputRefs.current[0]?.focus();
     } finally {
       setIsVerifying(false);
     }
   };
 
   return (
     <motion.div
       initial={{ opacity: 0, scale: 0.95 }}
       animate={{ opacity: 1, scale: 1 }}
       className={cn(
         "p-6 rounded-2xl bg-gradient-to-br from-success/10 via-primary/5 to-transparent border border-success/30 shadow-lg",
         className
       )}
     >
       {/* Header with AutoBot Branding */}
       <div className="flex items-center gap-3 mb-6">
         <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-lg glow-border-pulse">
           <Car className="h-6 w-6 text-white" />
           <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-success/20">
             <Bot className="h-3 w-3 text-[#25D366]" />
           </div>
         </div>
         <div>
           <h3 className="font-bold text-lg flex items-center gap-2">
             AutoBot Verification
             <Badge variant="outline" className="text-xs border-success/50 text-success">
               <Shield className="h-3 w-3 mr-1" />
               Secure
             </Badge>
           </h3>
           <p className="text-sm text-muted-foreground">
             Verify via WhatsApp • {phone}
           </p>
         </div>
       </div>
 
       {!otpSent ? (
         <div className="text-center space-y-4">
           <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
             {isSending ? (
               <Loader2 className="h-8 w-8 text-success animate-spin" />
             ) : (
               <Phone className="h-8 w-8 text-success" />
             )}
           </div>
           <p className="text-sm text-muted-foreground">
             {isSending ? "Sending OTP to your WhatsApp..." : "Ready to send verification code"}
           </p>
           {!isSending && (
             <Button onClick={sendOTP} variant="whatsapp" className="w-full">
               <Car className="h-4 w-4 mr-2" />
               Send OTP via WhatsApp
             </Button>
           )}
         </div>
       ) : (
         <div className="space-y-4">
           <Label className="text-sm text-center block">
             Enter the 6-digit code sent to your WhatsApp
           </Label>
 
           {/* OTP Input Boxes */}
           <div className="flex justify-center gap-2">
             {otp.map((digit, index) => (
               <Input
                 key={index}
                 ref={(el) => (inputRefs.current[index] = el)}
                 type="text"
                 inputMode="numeric"
                 maxLength={1}
                 value={digit}
                 onChange={(e) => handleOtpChange(index, e.target.value)}
                 onKeyDown={(e) => handleKeyDown(index, e)}
                 onPaste={handlePaste}
                 disabled={isVerifying}
                 className={cn(
                   "w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all",
                   digit ? "border-success bg-success/10" : "border-border",
                   error && "border-destructive",
                   isVerifying && "opacity-50"
                 )}
               />
             ))}
           </div>
 
           {/* Error Message */}
           <AnimatePresence>
             {error && (
               <motion.p
                 initial={{ opacity: 0, y: -10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0 }}
                 className="text-sm text-destructive text-center"
               >
                 {error}
               </motion.p>
             )}
           </AnimatePresence>
 
           {/* Verifying State */}
           {isVerifying && (
             <div className="flex items-center justify-center gap-2 text-success">
               <Loader2 className="h-4 w-4 animate-spin" />
               <span className="text-sm">Verifying...</span>
             </div>
           )}
 
           {/* Resend OTP */}
           <div className="flex items-center justify-center gap-2 text-sm">
             <span className="text-muted-foreground">Didn't receive?</span>
             {countdown > 0 ? (
               <span className="text-muted-foreground">Resend in {countdown}s</span>
             ) : (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={sendOTP}
                 disabled={isSending}
                 className="text-success hover:text-success/80"
               >
                 <RefreshCw className="h-3 w-3 mr-1" />
                 Resend OTP
               </Button>
             )}
           </div>
 
           {/* Cancel Button */}
           {onCancel && (
             <Button
               variant="ghost"
               size="sm"
               onClick={onCancel}
               className="w-full text-muted-foreground"
             >
               Cancel
             </Button>
           )}
         </div>
       )}
     </motion.div>
   );
 };
 
 export default WhatsAppOTPVerification;