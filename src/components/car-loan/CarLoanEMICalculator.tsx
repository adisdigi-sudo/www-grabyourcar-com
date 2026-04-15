import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Calculator, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";

export const CarLoanEMICalculator = () => {
  const [loanAmount, setLoanAmount] = useState(800000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(60);
  const [downPayment, setDownPayment] = useState(200000);

  const effectiveLoan = Math.max(loanAmount - downPayment, 0);

  const emi = useMemo(() => {
    const r = interestRate / 12 / 100;
    const n = tenure;
    if (r === 0) return Math.round(effectiveLoan / n);
    return Math.round((effectiveLoan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }, [effectiveLoan, interestRate, tenure]);

  const totalPayment = emi * tenure;
  const totalInterest = totalPayment - effectiveLoan;

  const formatCurrency = (amt: number) => {
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
    return `₹${amt.toLocaleString("en-IN")}`;
  };

  // Donut chart percentages
  const principalPct = effectiveLoan > 0 ? (effectiveLoan / totalPayment) * 100 : 0;

  return (
    <section className="py-16 md:py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3 border-primary/30">
            <Calculator className="w-3.5 h-3.5 mr-1.5" />
            EMI Calculator
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
            Calculate Your Monthly EMI
          </h2>
          <p className="text-muted-foreground">
            Own your dream car starting at just <span className="font-bold text-foreground">₹{emi.toLocaleString("en-IN")}/month</span>
          </p>
        </div>

        <Card className="border-0 shadow-xl max-w-4xl mx-auto overflow-hidden">
          <CardContent className="p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-10">
              {/* Sliders */}
              <div className="space-y-8">
                {/* Car Price */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-foreground">Car Price</label>
                    <span className="text-sm font-bold text-primary">{formatCurrency(loanAmount)}</span>
                  </div>
                  <Slider value={[loanAmount]} onValueChange={(v) => setLoanAmount(v[0])} min={200000} max={50000000} step={50000} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>₹2L</span><span>₹5Cr</span></div>
                </div>

                {/* Down Payment */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-foreground">Down Payment</label>
                    <span className="text-sm font-bold text-foreground">{formatCurrency(downPayment)}</span>
                  </div>
                  <Slider value={[downPayment]} onValueChange={(v) => setDownPayment(v[0])} min={0} max={loanAmount * 0.8} step={10000} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>₹0</span><span>{formatCurrency(loanAmount * 0.8)}</span></div>
                </div>

                {/* Interest Rate */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-foreground">Interest Rate</label>
                    <span className="text-sm font-bold text-primary">{interestRate}% p.a.</span>
                  </div>
                  <Slider value={[interestRate]} onValueChange={(v) => setInterestRate(v[0])} min={6} max={18} step={0.25} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>6%</span><span>18%</span></div>
                </div>

                {/* Tenure */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-foreground">Loan Tenure</label>
                    <span className="text-sm font-bold text-foreground">{tenure} months ({Math.floor(tenure / 12)}Y {tenure % 12}M)</span>
                  </div>
                  <Slider value={[tenure]} onValueChange={(v) => setTenure(v[0])} min={12} max={84} step={6} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1 Year</span><span>7 Years</span></div>
                </div>
              </div>

              {/* Results */}
              <div className="flex flex-col justify-center">
                {/* EMI Display */}
                <motion.div
                  key={emi}
                  initial={{ scale: 0.95, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 text-center mb-6 border border-primary/10"
                >
                  <p className="text-sm text-muted-foreground mb-1">Your Monthly EMI</p>
                  <div className="flex items-center justify-center gap-1">
                    <IndianRupee className="w-7 h-7 text-primary" />
                    <span className="text-4xl md:text-5xl font-extrabold text-foreground">
                      {emi.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">per month</p>
                </motion.div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Loan Amount</p>
                    <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(effectiveLoan)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Interest</p>
                    <p className="text-sm font-bold text-orange-500 mt-1">{formatCurrency(totalInterest)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-xl">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Cost</p>
                    <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(totalPayment)}</p>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="space-y-2">
                  <div className="h-4 rounded-full overflow-hidden bg-muted flex">
                    <div className="bg-primary rounded-l-full transition-all" style={{ width: `${principalPct}%` }} />
                    <div className="bg-orange-400 rounded-r-full transition-all" style={{ width: `${100 - principalPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Principal ({principalPct.toFixed(0)}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Interest ({(100 - principalPct).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
