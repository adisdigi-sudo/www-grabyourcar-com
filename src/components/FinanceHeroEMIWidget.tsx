import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IndianRupee, Calculator } from "lucide-react";
import { Link } from "react-router-dom";

export const FinanceHeroEMIWidget = () => {
  const [loanAmount, setLoanAmount] = useState(1000000);
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
      };
    }

    const emi = Math.round(
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1)
    );
    const totalPayment = emi * months;
    const totalInterest = totalPayment - principal;

    return { emi, totalPayment, totalInterest };
  }, [loanAmount, interestRate, tenure]);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const handleLoanAmountChange = (value: string) => {
    const num = parseInt(value.replace(/,/g, ''), 10);
    if (!isNaN(num)) {
      setLoanAmount(Math.min(Math.max(num, 100000), 100000000));
    } else if (value === '') {
      setLoanAmount(100000);
    }
  };

  return (
    <div 
      className="rounded-xl p-5 md:p-6 backdrop-blur-md border max-w-xl mx-auto"
      style={{
        background: "linear-gradient(135deg, rgba(0, 51, 102, 0.8) 0%, rgba(0, 51, 102, 0.6) 100%)",
        borderColor: "rgba(0, 51, 102, 0.6)",
        boxShadow: "0 0 40px rgba(0, 51, 102, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <Calculator className="w-5 h-5" style={{ color: "#00E5FF" }} />
        <h3 className="text-white font-heading font-bold text-lg">Quick EMI Calculator</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Left: Inputs */}
        <div className="space-y-4">
          {/* Loan Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white/70 text-xs font-medium">Loan Amount</label>
              <div className="flex items-center gap-1">
                <span className="text-white/50 text-xs">₹</span>
                <Input
                  type="text"
                  value={loanAmount.toLocaleString("en-IN")}
                  onChange={(e) => handleLoanAmountChange(e.target.value)}
                  className="w-24 h-6 text-xs text-right font-semibold px-2 bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            <Slider
              value={[loanAmount]}
              onValueChange={(value) => setLoanAmount(value[0])}
              min={100000}
              max={50000000}
              step={100000}
              className="w-full [&_[role=slider]]:bg-[#00E5FF] [&_[role=slider]]:border-[#00E5FF] [&_.bg-primary]:bg-[#00E5FF]"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>₹1L</span>
              <span>₹5Cr</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white/70 text-xs font-medium">Interest Rate</label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: "#00E5FF" }}>
                {interestRate}%
              </span>
            </div>
            <Slider
              value={[interestRate]}
              onValueChange={(value) => setInterestRate(value[0])}
              min={6}
              max={15}
              step={0.25}
              className="w-full [&_[role=slider]]:bg-[#00E5FF] [&_[role=slider]]:border-[#00E5FF] [&_.bg-primary]:bg-[#00E5FF]"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>6%</span>
              <span>15%</span>
            </div>
          </div>

          {/* Tenure */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white/70 text-xs font-medium">Tenure</label>
              <span className="text-xs font-semibold text-white">
                {tenure} months ({Math.floor(tenure / 12)}Y {tenure % 12}M)
              </span>
            </div>
            <Slider
              value={[tenure]}
              onValueChange={(value) => setTenure(value[0])}
              min={12}
              max={84}
              step={6}
              className="w-full [&_[role=slider]]:bg-[#00E5FF] [&_[role=slider]]:border-[#00E5FF] [&_.bg-primary]:bg-[#00E5FF]"
            />
            <div className="flex justify-between text-[10px] text-white/40">
              <span>1 Year</span>
              <span>7 Years</span>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="flex flex-col justify-between">
          {/* EMI Display */}
          <div 
            className="rounded-lg p-4 text-center mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(0, 51, 102, 0.6) 0%, rgba(0, 51, 102, 0.3) 100%)",
              border: "1px solid rgba(0, 51, 102, 0.5)"
            }}
          >
            <p className="text-white/60 text-xs mb-1">Your Monthly EMI</p>
            <div className="flex items-center justify-center gap-1">
              <IndianRupee className="w-5 h-5 text-white" />
              <span className="text-2xl md:text-3xl font-bold text-white">
                {emiDetails.emi.toLocaleString("en-IN")}
              </span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: "#00E5FF" }}>
              Total: {formatCurrency(emiDetails.totalPayment)}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4 text-center">
            <div className="rounded-md p-2" style={{ background: "rgba(0, 51, 102, 0.5)" }}>
              <p className="text-[10px] text-white/50">Principal</p>
              <p className="text-xs font-semibold text-white">{formatCurrency(loanAmount)}</p>
            </div>
            <div className="rounded-md p-2" style={{ background: "rgba(0, 51, 102, 0.5)" }}>
              <p className="text-[10px] text-white/50">Interest</p>
              <p className="text-xs font-semibold" style={{ color: "#F58220" }}>
                {formatCurrency(emiDetails.totalInterest)}
              </p>
            </div>
          </div>

          {/* CTA */}
          <Link to="/car-loans" className="block">
            <Button 
              className="w-full text-sm font-bold py-2 rounded transition-all hover:scale-[1.02]"
              style={{
                background: "#F58220",
                color: "white",
                boxShadow: "0 0 20px rgba(245, 130, 32, 0.4)"
              }}
            >
              Get Pre-Approved
            </Button>
          </Link>
        </div>
      </div>

      {/* Bank Partners */}
      <div className="mt-4 pt-3 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <p className="text-[10px] text-white/40">
          Partner Banks: SBI • HDFC • ICICI • Axis • Kotak • Yes Bank
        </p>
      </div>
    </div>
  );
};
