import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, IndianRupee, Percent, Calendar, PieChart } from "lucide-react";

const EMICalculator = () => {
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

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Calculator className="w-3 h-3 mr-1" />
            Car Loan EMI Calculator
          </Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Plan Your Car Finance
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Calculate your monthly EMI instantly. Get the best car loan rates from top banks & NBFCs.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Calculator Inputs */}
            <Card className="border-2 border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Calculator className="w-5 h-5 text-primary" />
                  Calculate EMI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Loan Amount */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <IndianRupee className="w-4 h-4 text-muted-foreground" />
                      Loan Amount
                    </Label>
                    <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-lg">
                      <span className="text-primary font-bold">{formatCurrency(loanAmount)}</span>
                    </div>
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
                    <span>₹1 Lakh</span>
                    <span>₹50 Lakh</span>
                  </div>
                </div>

                {/* Interest Rate */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Percent className="w-4 h-4 text-muted-foreground" />
                      Interest Rate (p.a.)
                    </Label>
                    <div className="flex items-center gap-1 bg-accent/10 px-3 py-1 rounded-lg">
                      <span className="text-accent font-bold">{interestRate}%</span>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-base font-medium">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Loan Tenure
                    </Label>
                    <div className="flex items-center gap-1 bg-secondary/50 px-3 py-1 rounded-lg">
                      <span className="text-foreground font-bold">{tenure} Months</span>
                      <span className="text-muted-foreground text-sm">({(tenure / 12).toFixed(1)} Yrs)</span>
                    </div>
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
                    <span>1 Year</span>
                    <span>7 Years</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {/* EMI Result Card */}
              <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-xl">
                <CardContent className="p-8 text-center">
                  <p className="text-primary-foreground/80 mb-2">Your Monthly EMI</p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <IndianRupee className="w-8 h-8" />
                    <span className="text-5xl font-display font-bold">
                      {emiDetails.emi.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-primary-foreground/70 text-sm">per month for {tenure} months</p>
                </CardContent>
              </Card>

              {/* Breakdown */}
              <Card className="border-2 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PieChart className="w-5 h-5 text-primary" />
                    Loan Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Visual Bar */}
                  <div className="h-4 rounded-full overflow-hidden flex bg-muted">
                    <div
                      className="bg-primary transition-all duration-500"
                      style={{ width: `${emiDetails.principalPercent}%` }}
                    />
                    <div
                      className="bg-accent transition-all duration-500"
                      style={{ width: `${emiDetails.interestPercent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-sm text-muted-foreground">Principal</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{formatCurrency(loanAmount)}</p>
                      <p className="text-xs text-muted-foreground">{emiDetails.principalPercent}% of total</p>
                    </div>
                    <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <span className="text-sm text-muted-foreground">Interest</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{formatCurrency(emiDetails.totalInterest)}</p>
                      <p className="text-xs text-muted-foreground">{emiDetails.interestPercent}% of total</p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Payment</span>
                      <span className="text-2xl font-bold text-foreground">{formatCurrency(emiDetails.totalPayment)}</span>
                    </div>
                  </div>

                  <Button className="w-full" size="lg">
                    Apply for Car Loan
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bank Partners */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">Loan partners with lowest interest rates</p>
            <div className="flex flex-wrap justify-center gap-6 opacity-60">
              {["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak", "Yes Bank"].map((bank) => (
                <span key={bank} className="text-lg font-semibold text-foreground/70">{bank}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EMICalculator;
