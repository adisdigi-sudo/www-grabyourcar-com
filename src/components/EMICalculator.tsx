import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, IndianRupee, Percent, Calendar, FileText } from "lucide-react";

interface EMICalculatorProps {
  onGetQuote?: (loanDetails: string) => void;
}

const EMICalculator = ({ onGetQuote }: EMICalculatorProps) => {
  const [loanAmount, setLoanAmount] = useState(800000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(60);

  const emiDetails = useMemo(() => {
    const principal = loanAmount;
    const monthlyRate = interestRate / 12 / 100;
    const months = tenure;

    if (monthlyRate === 0) {
      return {
        emi: Math.round(principal / months),
        totalPayment: principal,
        totalInterest: 0,
        interestPercent: 0,
        principalPercent: 100,
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
    };
  }, [loanAmount, interestRate, tenure]);

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

  return (
    <section className="py-10 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border border-border/50 shadow-md">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center gap-2 mb-6">
                <Badge variant="secondary" className="text-xs">
                  <Calculator className="w-3 h-3 mr-1" />
                  EMI Calculator
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: Calculator Inputs */}
                <div className="space-y-5">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" />
                    Calculate EMI
                  </h3>

                  {/* Loan Amount */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <IndianRupee className="w-3 h-3 text-muted-foreground" />
                        Loan Amount
                      </Label>
                      <span className="text-sm font-semibold text-primary">{formatCurrency(loanAmount)}</span>
                    </div>
                    <Slider
                      value={[loanAmount]}
                      onValueChange={(value) => setLoanAmount(value[0])}
                      min={100000}
                      max={5000000}
                      step={50000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>₹1L</span>
                      <span>₹50L</span>
                    </div>
                  </div>

                  {/* Interest Rate */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        Interest Rate
                      </Label>
                      <span className="text-sm font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {interestRate.toFixed(1)}%
                      </span>
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        Tenure
                      </Label>
                      <span className="text-sm font-semibold text-foreground">{tenure}M ({(tenure / 12).toFixed(1)}Y)</span>
                    </div>
                    <Slider
                      value={[tenure]}
                      onValueChange={(value) => setTenure(value[0])}
                      min={12}
                      max={84}
                      step={6}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1Y</span>
                      <span>7Y</span>
                    </div>
                  </div>
                </div>

                {/* Right: Results */}
                <div className="space-y-4">
                  {/* EMI Result */}
                  <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-5 text-center">
                    <p className="text-primary-foreground/80 text-sm mb-1">Monthly EMI</p>
                    <div className="flex items-center justify-center gap-1">
                      <IndianRupee className="w-5 h-5" />
                      <span className="text-3xl font-bold">
                        {emiDetails.emi.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-primary-foreground/70 text-xs mt-1">for {tenure} months</p>
                  </div>

                  {/* Breakdown */}
                  <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                    {/* Visual Bar */}
                    <div className="h-2 rounded-full overflow-hidden flex bg-muted">
                      <div
                        className="bg-primary transition-all duration-500"
                        style={{ width: `${emiDetails.principalPercent}%` }}
                      />
                      <div
                        className="bg-accent transition-all duration-500"
                        style={{ width: `${emiDetails.interestPercent}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div>
                          <p className="text-muted-foreground text-xs">Principal</p>
                          <p className="font-semibold">{formatCurrency(loanAmount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <div>
                          <p className="text-muted-foreground text-xs">Interest</p>
                          <p className="font-semibold">{formatCurrency(emiDetails.totalInterest)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-lg font-bold">{formatCurrency(emiDetails.totalPayment)}</span>
                    </div>
                  </div>

                  {/* Get Quote Button */}
                  <Button 
                    onClick={handleGetQuote}
                    className="w-full"
                    size="sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Get Loan Quote
                  </Button>

                  {/* Bank Partners */}
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Partners: SBI • HDFC • ICICI • Axis</p>
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
