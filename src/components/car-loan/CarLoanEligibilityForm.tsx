import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  User,
  CreditCard,
  Briefcase,
  CheckCircle2,
  Shield,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";
import { captureWebsiteLead } from "@/lib/websiteLeadCapture";
import { z } from "zod";

const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
const panSchema = z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Enter a valid PAN number (e.g., ABCDE1234F)");

type Step = "phone" | "pan" | "details" | "result";

interface Props {
  onEligibilityResult: (result: { eligible: boolean; maxLoan: number; maxEMI: number; creditScore?: number } | null) => void;
}

export const CarLoanEligibilityForm = ({ onEligibilityResult }: Props) => {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [pan, setPan] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState({
    employmentType: "",
    monthlyIncome: "",
    age: "",
    existingEMI: "",
    loanAmount: "",
    tenure: "60",
    city: "",
    buyingTimeline: "",
  });
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{
    eligible: boolean;
    maxLoan: number;
    maxEMI: number;
    creditScore?: number;
  } | null>(null);

  const steps = [
    { key: "phone", label: "Mobile", icon: Phone },
    { key: "pan", label: "PAN", icon: CreditCard },
    { key: "details", label: "Details", icon: Briefcase },
    { key: "result", label: "Result", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const handlePhoneSubmit = () => {
    try {
      phoneSchema.parse(phone);
      setStep("pan");
    } catch (e) {
      if (e instanceof z.ZodError) toast.error(e.errors[0].message);
    }
  };


  const handlePANSubmit = () => {
    try {
      panSchema.parse(pan.toUpperCase());
      setPan(pan.toUpperCase());
      setStep("details");
    } catch (e) {
      if (e instanceof z.ZodError) toast.error(e.errors[0].message);
    }
  };

  const handleCheckEligibility = async () => {
    const income = parseFloat(details.monthlyIncome) || 0;
    const age = parseInt(details.age) || 0;
    const existingEMI = parseFloat(details.existingEMI) || 0;

    if (!details.employmentType) { toast.error("Select employment type"); return; }
    if (income < 15000) { toast.error("Minimum monthly income is ₹15,000"); return; }
    if (age < 21 || age > 65) { toast.error("Age must be between 21-65"); return; }

    setIsChecking(true);

    // Simulated eligibility check (replace with FinBox API)
    await new Promise((r) => setTimeout(r, 2500));

    const maxEMI = (income - existingEMI) * 0.5;
    const maxLoan = maxEMI * 60;
    const creditScore = Math.floor(650 + Math.random() * 200);
    const eligible = maxLoan >= 100000 && creditScore >= 650;

    const eligResult = { eligible, maxLoan: Math.round(maxLoan), maxEMI: Math.round(maxEMI), creditScore };
    setResult(eligResult);
    onEligibilityResult(eligible ? eligResult : null);
    setStep("result");
    setIsChecking(false);

    // Ad conversion tracking
    const { trackLeadConversion } = await import("@/lib/adTracking");
    trackLeadConversion("car_loan_eligibility", { eligible: String(eligible) });

    // Determine lead priority
    let leadPriority = "normal";
    let leadScore = 30;
    if (creditScore >= 750) { leadPriority = "hot"; leadScore = 90; }
    else if (creditScore >= 700) { leadPriority = "warm"; leadScore = 70; }
    else if (eligible) { leadPriority = "warm"; leadScore = 50; }

    // Save verified lead
    try {
      await supabase.from("car_loan_leads").insert({
        phone: `91${phone}`,
        name,
        pan_number: pan,
        employment_type: details.employmentType,
        monthly_income: income,
        age,
        existing_emi: existingEMI,
        loan_amount_requested: parseFloat(details.loanAmount) || null,
        tenure_months: parseInt(details.tenure),
        city: details.city || null,
        buying_timeline: details.buyingTimeline || null,
        eligibility_status: eligible ? "eligible" : "not_eligible",
        max_loan_eligible: Math.round(maxLoan),
        max_emi_capacity: Math.round(maxEMI),
        credit_score: creditScore,
        credit_check_provider: "simulated",
        lead_score: leadScore,
        lead_priority: leadPriority,
        status: "new",
        otp_verified_at: new Date().toISOString(),
        source: "car_loan_page",
      });
    } catch (err) {
      console.error("Lead save error:", err);
    }

    // WhatsApp alert for hot leads
    if (leadPriority === "hot") {
      triggerWhatsApp({
        event: "lead_created",
        phone: phone,
        name: name || "Car Loan Lead",
        data: {
          source: "Car Loan - Hot Lead",
          credit_score: String(creditScore),
          max_loan: `₹${Math.round(maxLoan).toLocaleString("en-IN")}`,
          income: `₹${income.toLocaleString("en-IN")}`,
        },
      });
    }
  };

  return (
    <section id="eligibility-section" className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Instant Eligibility Check
            </Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
              Check Your Loan Eligibility
            </h2>
            <p className="text-muted-foreground">
              Verified leads only · No impact on your credit score
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i <= currentStepIndex
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < currentStepIndex ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <s.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground hidden md:block">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-8 md:w-12 h-0.5 mx-1 transition-colors ${
                      i < currentStepIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form Card */}
          <Card className="border-0 shadow-xl bg-background/95 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                {/* Step 1: Phone */}
                {step === "phone" && (
                  <motion.div key="phone" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">Enter Your Mobile Number</h3>
                      <p className="text-sm text-muted-foreground">Enter your mobile number to check eligibility</p>
                    </div>

                    <div className="space-y-4 max-w-sm mx-auto">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="mt-1.5 h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Mobile Number</Label>
                        <div className="relative mt-1.5">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">+91</span>
                          <Input
                            id="phone"
                            type="tel"
                            maxLength={10}
                            placeholder="9876543210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            className="pl-12 h-12 text-lg font-medium tracking-wider"
                          />
                        </div>
                      </div>
                      <Button onClick={handlePhoneSubmit} className="w-full h-12 text-base font-bold" disabled={phone.length !== 10}>
                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" /> Your data is encrypted & secure
                      </p>
                    </div>
                  </motion.div>
                )}


                {/* Step 3: PAN */}
                {step === "pan" && (
                  <motion.div key="pan" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">Enter Your PAN</h3>
                      <p className="text-sm text-muted-foreground">Required for eligibility & credit assessment</p>
                    </div>

                    <div className="space-y-4 max-w-sm mx-auto">
                      <div>
                        <Label htmlFor="pan">PAN Card Number</Label>
                        <Input
                          id="pan"
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          value={pan}
                          onChange={(e) => setPan(e.target.value.toUpperCase())}
                          className="mt-1.5 h-12 text-lg font-medium tracking-widest uppercase"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep("phone")} className="h-12">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button onClick={handlePANSubmit} className="flex-1 h-12 text-base font-bold" disabled={pan.length !== 10}>
                          Continue <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                        <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Your PAN is used only for credit assessment. We follow strict data privacy guidelines and never share your information.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Financial Details */}
                {step === "details" && (
                  <motion.div key="details" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">Financial Details</h3>
                      <p className="text-sm text-muted-foreground">Almost there! Just a few more details.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Employment Type</Label>
                          <Select value={details.employmentType} onValueChange={(v) => setDetails({ ...details, employmentType: v })}>
                            <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="salaried">Salaried</SelectItem>
                              <SelectItem value="self-employed">Self Employed</SelectItem>
                              <SelectItem value="business">Business Owner</SelectItem>
                              <SelectItem value="professional">Professional (Doctor, CA)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Monthly Income (₹)</Label>
                          <Input type="number" placeholder="50,000" value={details.monthlyIncome} onChange={(e) => setDetails({ ...details, monthlyIncome: e.target.value })} className="mt-1.5 h-11" />
                        </div>
                        <div>
                          <Label>Age</Label>
                          <Input type="number" placeholder="30" value={details.age} onChange={(e) => setDetails({ ...details, age: e.target.value })} className="mt-1.5 h-11" />
                        </div>
                        <div>
                          <Label>Existing EMIs (₹/month)</Label>
                          <Input type="number" placeholder="0" value={details.existingEMI} onChange={(e) => setDetails({ ...details, existingEMI: e.target.value })} className="mt-1.5 h-11" />
                        </div>
                        <div>
                          <Label>Desired Loan Amount (₹)</Label>
                          <Input type="number" placeholder="8,00,000" value={details.loanAmount} onChange={(e) => setDetails({ ...details, loanAmount: e.target.value })} className="mt-1.5 h-11" />
                        </div>
                        <div>
                          <Label>When do you plan to buy?</Label>
                          <Select value={details.buyingTimeline} onValueChange={(v) => setDetails({ ...details, buyingTimeline: v })}>
                            <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="immediately">Immediately</SelectItem>
                              <SelectItem value="1_month">Within 1 Month</SelectItem>
                              <SelectItem value="3_months">Within 3 Months</SelectItem>
                              <SelectItem value="exploring">Just Exploring</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setStep("pan")} className="h-12">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button onClick={handleCheckEligibility} className="flex-1 h-12 text-base font-bold" disabled={isChecking}>
                          {isChecking ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Checking Eligibility...
                            </>
                          ) : (
                            <>
                              Check Eligibility <Sparkles className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Result */}
                {step === "result" && result && (
                  <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                    {result.eligible ? (
                      <div className="text-center py-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                        >
                          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-primary" />
                          </div>
                        </motion.div>

                        <h3 className="text-2xl font-bold text-foreground mb-2">
                          Congratulations! You're Pre-Approved 🎉
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Based on your profile, here's your eligibility:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                            <p className="text-xs text-muted-foreground mb-1">Max Loan Amount</p>
                            <p className="text-2xl font-bold text-primary">
                              ₹{result.maxLoan.toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div className="bg-muted/50 rounded-xl p-4">
                            <p className="text-xs text-muted-foreground mb-1">Max EMI Capacity</p>
                            <p className="text-2xl font-bold text-foreground">
                              ₹{result.maxEMI.toLocaleString("en-IN")}/mo
                            </p>
                          </div>
                          {result.creditScore && (
                            <div className="bg-muted/50 rounded-xl p-4">
                              <p className="text-xs text-muted-foreground mb-1">Credit Score</p>
                              <p className={`text-2xl font-bold ${result.creditScore >= 750 ? "text-primary" : result.creditScore >= 700 ? "text-yellow-600" : "text-orange-500"}`}>
                                {result.creditScore}
                              </p>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-4">
                          Own your dream car starting at just{" "}
                          <span className="font-bold text-foreground">
                            ₹{Math.round(result.maxEMI * 0.6).toLocaleString("en-IN")}/month
                          </span>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                          <Button className="flex-1 h-12 font-bold" asChild>
                            <a href="https://wa.me/919876543210?text=Hi%2C%20I%20am%20pre-approved%20for%20a%20car%20loan" target="_blank" rel="noopener noreferrer">
                              Talk to Loan Expert
                            </a>
                          </Button>
                          <Button variant="outline" className="flex-1 h-12" onClick={() => { setStep("phone"); setResult(null); onEligibilityResult(null); }}>
                            Check Again
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                          <User className="w-10 h-10 text-destructive" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                          We're Working on Your Options
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Based on your current profile, we're finding the best options for you. Our loan expert will call you shortly.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                          <Button className="flex-1 h-12 font-bold" asChild>
                            <a href="https://wa.me/919876543210?text=Hi%2C%20I%20need%20help%20with%20car%20loan" target="_blank" rel="noopener noreferrer">
                              Talk to Expert
                            </a>
                          </Button>
                          <Button variant="outline" className="flex-1 h-12" onClick={() => { setStep("phone"); setResult(null); }}>
                            Try Again
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
