import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
 import { Calculator, IndianRupee, Percent, Calendar, FileText, MessageCircle, TrendingDown, Building2, Download, Share2 } from "lucide-react";
 import { generateEMIPdf, generateEMIWhatsAppMessage, EMIData } from "@/lib/generateEMIPdf";
 import { toast } from "sonner";

interface EMICalculatorProps {
  onGetQuote?: (loanDetails: string) => void;
   carName?: string;
   variantName?: string;
}

 const EMICalculator = ({ onGetQuote, carName, variantName }: EMICalculatorProps) => {
  const [loanAmount, setLoanAmount] = useState(800000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(60);
  const [downPayment, setDownPayment] = useState(100000);

  const emiDetails = useMemo(() => {
    const principal = loanAmount - downPayment;
    const monthlyRate = interestRate / 12 / 100;
    const months = tenure;

    if (monthlyRate === 0 || principal <= 0) {
      return {
        emi: principal > 0 ? Math.round(principal / months) : 0,
        totalPayment: principal,
        totalInterest: 0,
        interestPercent: 0,
        principalPercent: 100,
        loanPrincipal: principal,
      };
    }

    const emi = Math.round(
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1)
    );
    const totalPayment = emi * months;
    const totalInterest = totalPayment - principal;
    const interestPercent = Math.round((totalInterest / totalPayment) * 100);
    const principalPercent = 100 - interestPercent;

    return {
      emi,
      totalPayment,
      totalInterest,
      interestPercent,
      principalPercent,
      loanPrincipal: principal,
    };
  }, [loanAmount, interestRate, tenure, downPayment]);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const handleGetQuote = () => {
    const loanDetails = `Car Loan: ${formatCurrency(loanAmount)} @ ${interestRate}% for ${tenure} months (EMI: ₹${emiDetails.emi.toLocaleString("en-IN")}/month)`;
    onGetQuote?.(loanDetails);
  };

   const getEMIData = (): EMIData => ({
     loanAmount,
     downPayment,
     loanPrincipal: emiDetails.loanPrincipal,
     interestRate,
     tenure,
     emi: emiDetails.emi,
     totalPayment: emiDetails.totalPayment,
     totalInterest: emiDetails.totalInterest,
     carName,
     variantName,
   });
 
   const handleDownloadPdf = () => {
     try {
       generateEMIPdf(getEMIData());
       toast.success("EMI estimate PDF downloaded!");
     } catch (error) {
       toast.error("Failed to generate PDF");
     }
   };
 
   const handleShareWhatsApp = () => {
     const message = generateEMIWhatsAppMessage(getEMIData());
     window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
   };
 
  const handleLoanAmountChange = (value: string) => {
    const num = parseInt(value.replace(/,/g, ''), 10);
    if (!isNaN(num)) {
      setLoanAmount(Math.min(Math.max(num, 100000), 100000000));
    } else if (value === '') {
      setLoanAmount(100000);
    }
  };

  const handleDownPaymentChange = (value: string) => {
    const num = parseInt(value.replace(/,/g, ''), 10);
    if (!isNaN(num)) {
      setDownPayment(Math.min(Math.max(num, 0), loanAmount * 0.5));
    } else if (value === '') {
      setDownPayment(0);
    }
  };

  const handleInterestRateChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setInterestRate(Math.min(Math.max(num, 6), 18));
    } else if (value === '') {
      setInterestRate(6);
    }
  };

  const handleTenureChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      setTenure(Math.min(Math.max(num, 12), 84));
    } else if (value === '') {
      setTenure(12);
    }
  };

  // Quick EMI reference table
  const quickEmiTable = useMemo(() => {
    const tenures = [36, 48, 60, 72, 84];
    const principal = loanAmount - downPayment;
    const monthlyRate = interestRate / 12 / 100;
    
    return tenures.map(months => {
      if (monthlyRate === 0 || principal <= 0) {
        return { months, emi: principal > 0 ? Math.round(principal / months) : 0 };
      }
      const emi = Math.round(
        (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
          (Math.pow(1 + monthlyRate, months) - 1)
      );
      return { months, emi };
    });
  }, [loanAmount, downPayment, interestRate]);

  return (
    <section className="py-12 bg-gradient-to-br from-muted/50 via-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4 py-1.5 px-4">
              <Calculator className="w-4 h-4 mr-2" />
              Grabyourcar Finance
            </Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
              EMI Calculator
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Plan your car purchase with our easy EMI calculator. Get instant loan quotes from top banks.
            </p>
          </div>

          <Card className="border-2 border-border/50 shadow-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-2">
                {/* Left: Calculator Inputs */}
                <div className="p-6 lg:p-8 space-y-6 bg-card">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    Loan Parameters
                  </h3>

                  {/* Car Price / Loan Amount */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <IndianRupee className="w-4 h-4 text-primary" />
                        Car Price
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <Input
                          type="text"
                          value={loanAmount.toLocaleString("en-IN")}
                          onChange={(e) => handleLoanAmountChange(e.target.value)}
                          className="w-32 h-9 text-sm text-right font-bold text-primary px-2 border-primary/30 focus:border-primary"
                        />
                      </div>
                    </div>
                    <Slider
                      value={[loanAmount]}
                      onValueChange={(value) => setLoanAmount(value[0])}
                      min={100000}
                      max={100000000}
                      step={100000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>₹1 Lakh</span>
                      <span>₹10 Crore</span>
                    </div>
                  </div>

                  {/* Down Payment */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <TrendingDown className="w-4 h-4 text-success" />
                        Down Payment
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <Input
                          type="text"
                          value={downPayment.toLocaleString("en-IN")}
                          onChange={(e) => handleDownPaymentChange(e.target.value)}
                          className="w-32 h-9 text-sm text-right font-bold text-success px-2 border-success/30 focus:border-success"
                        />
                      </div>
                    </div>
                    <Slider
                      value={[downPayment]}
                      onValueChange={(value) => setDownPayment(value[0])}
                      min={0}
                      max={loanAmount * 0.5}
                      step={10000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>₹0</span>
                      <span>{formatCurrency(loanAmount * 0.5)} (50%)</span>
                    </div>
                  </div>

                  {/* Interest Rate */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Percent className="w-4 h-4 text-accent" />
                        Interest Rate (p.a.)
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={interestRate}
                          onChange={(e) => handleInterestRateChange(e.target.value)}
                          step="0.1"
                          min="6"
                          max="18"
                          className="w-20 h-9 text-sm text-right font-bold text-accent px-2 border-accent/30 focus:border-accent"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[interestRate]}
                      onValueChange={(value) => setInterestRate(value[0])}
                      min={6}
                      max={18}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>6%</span>
                      <span>18%</span>
                    </div>
                  </div>

                  {/* Tenure */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Loan Tenure
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={tenure}
                          onChange={(e) => handleTenureChange(e.target.value)}
                          min="12"
                          max="84"
                          className="w-20 h-9 text-sm text-right font-bold text-foreground px-2"
                        />
                        <span className="text-sm text-muted-foreground">months</span>
                      </div>
                    </div>
                    <Slider
                      value={[tenure]}
                      onValueChange={(value) => setTenure(value[0])}
                      min={12}
                      max={84}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 Year</span>
                      <span>7 Years</span>
                    </div>
                  </div>
                </div>

                {/* Right: Results */}
                <div className="p-6 lg:p-8 bg-gradient-to-br from-primary/5 via-primary/10 to-success/5 flex flex-col">
                  {/* EMI Result - Hero Display */}
                  <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-6 text-center shadow-lg mb-6">
                    <p className="text-primary-foreground/80 text-sm mb-1 font-medium">Your Monthly EMI</p>
                    <div className="flex items-center justify-center gap-1">
                      <IndianRupee className="w-8 h-8" />
                      <span className="text-4xl md:text-5xl font-bold tracking-tight">
                        {emiDetails.emi.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-primary-foreground/70 text-sm mt-2">for {tenure} months ({Math.floor(tenure/12)} years {tenure%12} months)</p>
                  </div>

                  {/* Breakdown */}
                  <div className="bg-card rounded-xl p-5 space-y-4 mb-6 border border-border/50">
                    {/* Visual Bar */}
                    <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                      <div
                        className="bg-primary transition-all duration-500 rounded-l-full"
                        style={{ width: `${emiDetails.principalPercent}%` }}
                      />
                      <div
                        className="bg-accent transition-all duration-500 rounded-r-full"
                        style={{ width: `${emiDetails.interestPercent}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <div>
                          <p className="text-muted-foreground text-xs">Principal Amount</p>
                          <p className="font-bold text-lg">{formatCurrency(emiDetails.loanPrincipal)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <div>
                          <p className="text-muted-foreground text-xs">Total Interest</p>
                          <p className="font-bold text-lg">{formatCurrency(emiDetails.totalInterest)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm text-muted-foreground font-medium">Total Amount Payable</span>
                      <span className="text-xl font-bold text-foreground">{formatCurrency(emiDetails.totalPayment + downPayment)}</span>
                    </div>
                  </div>

                  {/* Quick EMI Reference */}
                  <div className="bg-card rounded-xl p-4 mb-6 border border-border/50">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Quick EMI Reference</p>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {quickEmiTable.map(({ months, emi }) => (
                        <div 
                          key={months} 
                          className={`p-2 rounded-lg transition-all cursor-pointer ${tenure === months ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                          onClick={() => setTenure(months)}
                        >
                          <p className="text-xs opacity-75">{months}M</p>
                          <p className="text-sm font-bold">₹{(emi / 1000).toFixed(1)}K</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="mt-auto space-y-3">
                    <Button 
                       onClick={handleDownloadPdf}
                       className="w-full h-12 text-base font-semibold hover:scale-[1.02] transition-transform bg-gradient-to-r from-primary to-primary/90"
                      size="lg"
                    >
                       <Download className="w-5 h-5 mr-2" />
                       Download EMI PDF
                    </Button>
                    
                     <div className="grid grid-cols-2 gap-2">
                       <Button 
                         variant="outline"
                         onClick={handleShareWhatsApp}
                         className="h-11 font-semibold hover:scale-[1.02] transition-transform"
                       >
                         <Share2 className="w-4 h-4 mr-2" />
                         Share
                       </Button>
                       <a 
                         href={`https://wa.me/919577200023?text=Hi%20Grabyourcar!%20I%20need%20a%20car%20loan%20of%20${formatCurrency(emiDetails.loanPrincipal)}%20at%20${interestRate}%25%20for%20${tenure}%20months.%20EMI%3A%20₹${emiDetails.emi.toLocaleString("en-IN")}.%20Please%20connect%20me%20with%20banks.`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="block"
                       >
                         <Button 
                           variant="whatsapp"
                           className="w-full h-11 font-semibold hover:scale-[1.02] transition-transform"
                         >
                           <MessageCircle className="w-4 h-4 mr-2" />
                           Get Quote
                         </Button>
                       </a>
                     </div>
                     
                     {onGetQuote && (
                      <Button 
                         variant="outline"
                         onClick={handleGetQuote}
                         className="w-full h-10"
                      >
                         <FileText className="w-4 h-4 mr-2" />
                         Request Callback
                      </Button>
                     )}
                  </div>

                  {/* Bank Partners */}
                  <div className="text-center mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
                      <Building2 className="h-4 w-4" />
                      <span>Partnered with leading banks</span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                      SBI • HDFC Bank • ICICI Bank • Axis Bank • Kotak • IDFC First
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default EMICalculator;
