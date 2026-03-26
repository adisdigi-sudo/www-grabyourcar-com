import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, IndianRupee, Percent, Calendar, FileText, MessageCircle, TrendingDown, Building2, Download, Share2, Plus, X } from "lucide-react";
import { generateEMIPdf, generateEMIWhatsAppMessage, EMIData, OnRoadPriceBreakup } from "@/lib/generateEMIPdf";
import { generateComparisonPdf } from "@/lib/generateComparisonPdf";
import { toast } from "sonner";

interface EMICalculatorProps {
  onGetQuote?: (loanDetails: string) => void;
  carName?: string;
  variantName?: string;
  onRoadPrice?: OnRoadPriceBreakup;
  selectedColor?: string;
  selectedCity?: string;
}

const BANKS = [
  "SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra",
  "IDFC First Bank", "Yes Bank", "Bank of Baroda", "PNB", "Canara Bank",
  "Union Bank", "IndusInd Bank", "Federal Bank", "AU Small Finance",
  "Bajaj Finance", "Tata Capital", "Mahindra Finance", "Sundaram Finance",
  "Cholamandalam", "L&T Finance", "Hero FinCorp", "IIFL Finance", "Shriram Finance"
];

interface BankColumn {
  id: string;
  bankName: string;
  interestRate: number;
  processingFee: number;
}

const EMICalculator = ({ onGetQuote, carName, variantName, onRoadPrice, selectedColor, selectedCity }: EMICalculatorProps) => {
  // Editable text fields - allow blank for custom typing
  const [loanAmountText, setLoanAmountText] = useState("8,00,000");
  const [downPaymentText, setDownPaymentText] = useState("1,00,000");
  const [interestRateText, setInterestRateText] = useState("8.5");
  const [tenureText, setTenureText] = useState("60");

  // Parsed numeric values
  const loanAmount = useMemo(() => {
    const n = parseInt(loanAmountText.replace(/,/g, ''), 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(n, 50000000));
  }, [loanAmountText]);

  const downPayment = useMemo(() => {
    const n = parseInt(downPaymentText.replace(/,/g, ''), 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(n, loanAmount * 0.9));
  }, [downPaymentText, loanAmount]);

  const interestRate = useMemo(() => {
    const n = parseFloat(interestRateText);
    return isNaN(n) ? 0 : Math.max(0, Math.min(n, 30));
  }, [interestRateText]);

  const tenure = useMemo(() => {
    const n = parseInt(tenureText, 10);
    return isNaN(n) ? 12 : Math.max(6, Math.min(n, 120));
  }, [tenureText]);

  // Bank comparison columns
  const [bankColumns, setBankColumns] = useState<BankColumn[]>([
    { id: "1", bankName: "SBI", interestRate: 8.5, processingFee: 0 },
    { id: "2", bankName: "HDFC Bank", interestRate: 8.75, processingFee: 3000 },
    { id: "3", bankName: "ICICI Bank", interestRate: 9.0, processingFee: 2500 },
  ]);
  const [showComparison, setShowComparison] = useState(false);

  const calcEMI = (principal: number, rate: number, months: number) => {
    if (principal <= 0 || months <= 0) return { emi: 0, totalPayment: 0, totalInterest: 0 };
    const r = rate / 12 / 100;
    if (r === 0) return { emi: Math.round(principal / months), totalPayment: principal, totalInterest: 0 };
    const emi = Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
    const totalPayment = emi * months;
    return { emi, totalPayment, totalInterest: totalPayment - principal };
  };

  const principal = Math.max(loanAmount - downPayment, 0);
  const emiDetails = useMemo(() => {
    const result = calcEMI(principal, interestRate, tenure);
    return {
      ...result,
      principalPercent: result.totalPayment > 0 ? Math.round((principal / result.totalPayment) * 100) : 100,
      interestPercent: result.totalPayment > 0 ? Math.round((result.totalInterest / result.totalPayment) * 100) : 0,
      loanPrincipal: principal,
    };
  }, [principal, interestRate, tenure]);

  // Bank comparison EMIs
  const bankEMIs = useMemo(() => {
    return bankColumns.map(bank => {
      const result = calcEMI(principal, bank.interestRate, tenure);
      return { ...bank, ...result };
    });
  }, [bankColumns, principal, tenure]);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `Rs. ${(amount / 100000).toFixed(2)} L`;
    return `Rs. ${amount.toLocaleString("en-IN")}`;
  };

  const formatInputCurrency = (value: string) => {
    const clean = value.replace(/[^0-9]/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('en-IN');
  };

  const handleSliderLoanAmount = (v: number[]) => {
    setLoanAmountText(v[0].toLocaleString('en-IN'));
  };
  const handleSliderDownPayment = (v: number[]) => {
    setDownPaymentText(v[0].toLocaleString('en-IN'));
  };
  const handleSliderInterest = (v: number[]) => {
    setInterestRateText(v[0].toString());
  };
  const handleSliderTenure = (v: number[]) => {
    setTenureText(v[0].toString());
  };

  const updateBankColumn = (id: string, field: keyof BankColumn, value: string | number) => {
    setBankColumns(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBankColumn = (id: string) => {
    if (bankColumns.length <= 1) return;
    setBankColumns(prev => prev.filter(b => b.id !== id));
  };

  const addBankColumn = () => {
    if (bankColumns.length >= 3) return;
    const usedBanks = bankColumns.map(b => b.bankName);
    const nextBank = BANKS.find(b => !usedBanks.includes(b)) || BANKS[0];
    setBankColumns(prev => [...prev, { id: Date.now().toString(), bankName: nextBank, interestRate: 9.0, processingFee: 0 }]);
  };

  const handleDownloadPdf = () => {
    try {
      const data: EMIData = {
        loanAmount, downPayment, loanPrincipal: principal,
        interestRate, tenure, emi: emiDetails.emi,
        totalPayment: emiDetails.totalPayment, totalInterest: emiDetails.totalInterest,
        carName, variantName, onRoadPrice, selectedColor, selectedCity,
      };
      generateEMIPdf(data);
      toast.success("EMI estimate PDF downloaded!");
    } catch { toast.error("Failed to generate PDF"); }
  };

  const handleDownloadComparisonPdf = () => {
    try {
      generateComparisonPdf({
        carName: carName || "Car Loan",
        variantName,
        loanAmount,
        downPayment,
        principal,
        tenure,
        banks: bankEMIs.map(b => ({
          bankName: b.bankName,
          interestRate: b.interestRate,
          processingFee: b.processingFee,
          emi: b.emi,
          totalPayment: b.totalPayment,
          totalInterest: b.totalInterest,
        })),
      });
      toast.success("Comparison PDF downloaded!");
    } catch { toast.error("Failed to generate comparison PDF"); }
  };

  const handleShareWhatsApp = () => {
    const data: EMIData = {
      loanAmount, downPayment, loanPrincipal: principal,
      interestRate, tenure, emi: emiDetails.emi,
      totalPayment: emiDetails.totalPayment, totalInterest: emiDetails.totalInterest,
      carName, variantName, onRoadPrice, selectedColor, selectedCity,
    };
    const message = generateEMIWhatsAppMessage(data);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const quickEmiTable = useMemo(() => {
    const tenures = [12, 24, 36, 48, 60];
    return tenures.map(months => {
      const result = calcEMI(principal, interestRate, months);
      return { months, emi: result.emi };
    });
  }, [principal, interestRate]);

  // Find best bank (lowest EMI)
  const bestBankIdx = useMemo(() => {
    if (bankEMIs.length === 0) return -1;
    let minIdx = 0;
    bankEMIs.forEach((b, i) => { if (b.emi > 0 && b.emi < bankEMIs[minIdx].emi) minIdx = i; });
    return minIdx;
  }, [bankEMIs]);

  return (
    <section className="py-12 bg-gradient-to-br from-muted/50 via-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4 py-1.5 px-4">
              <Calculator className="w-4 h-4 mr-2" />
              Grabyourcar Finance
            </Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
              EMI Calculator
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Plan your car purchase with our easy EMI calculator. Compare quotes from multiple banks.
            </p>
          </div>

          <Card className="border-2 border-border/50 shadow-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-2">
                {/* Left: Calculator Inputs */}
                <div className="p-6 lg:p-8 space-y-6 bg-card">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-foreground" />
                    Loan Parameters
                  </h3>

                  {/* Car Price */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <IndianRupee className="w-4 h-4 text-foreground" />
                        Car Price
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">Rs.</span>
                        <Input
                          type="text"
                          value={loanAmountText}
                          onChange={(e) => setLoanAmountText(formatInputCurrency(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          placeholder="Enter amount"
                          className="w-36 h-9 text-sm text-right font-bold text-foreground px-2 border-primary/30 focus:border-primary"
                        />
                      </div>
                    </div>
                    <Slider value={[loanAmount]} onValueChange={handleSliderLoanAmount} min={10000} max={50000000} step={10000} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Rs. 10K</span><span>Rs. 5 Crore</span></div>
                  </div>

                  {/* Down Payment */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <TrendingDown className="w-4 h-4 text-green-600" />
                        Down Payment
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">Rs.</span>
                        <Input
                          type="text"
                          value={downPaymentText}
                          onChange={(e) => setDownPaymentText(formatInputCurrency(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          placeholder="Enter amount"
                          className="w-36 h-9 text-sm text-right font-bold text-green-600 px-2 border-green-600/30 focus:border-green-600"
                        />
                      </div>
                    </div>
                    <Slider value={[downPayment]} onValueChange={handleSliderDownPayment} min={0} max={Math.max(loanAmount * 0.9, 1)} step={5000} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Rs. 0</span><span>{formatCurrency(loanAmount * 0.9)} (90%)</span></div>
                  </div>

                  {/* Interest Rate */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <Percent className="w-4 h-4 text-foreground" />
                        Interest Rate (p.a.)
                      </Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={interestRateText}
                          onChange={(e) => setInterestRateText(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          placeholder="8.5"
                          className="w-20 h-9 text-sm text-right font-bold text-foreground px-2 border-accent/30 focus:border-accent"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <Slider value={[interestRate]} onValueChange={handleSliderInterest} min={1} max={30} step={0.1} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>1%</span><span>30%</span></div>
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
                          type="text"
                          value={tenureText}
                          onChange={(e) => setTenureText(e.target.value.replace(/[^0-9]/g, ''))}
                          onFocus={(e) => e.target.select()}
                          placeholder="60"
                          className="w-20 h-9 text-sm text-right font-bold text-foreground px-2"
                        />
                        <span className="text-sm text-muted-foreground">months</span>
                      </div>
                    </div>
                    <Slider value={[tenure]} onValueChange={handleSliderTenure} min={6} max={120} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>6 Months</span><span>10 Years</span></div>
                  </div>
                </div>

                {/* Right: Results */}
                <div className="p-6 lg:p-8 bg-gradient-to-br from-primary/5 via-primary/10 to-green-500/5 flex flex-col">
                  <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-6 text-center shadow-lg mb-6">
                    <p className="text-primary-foreground/80 text-sm mb-1 font-medium">Your Monthly EMI</p>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-lg font-semibold">Rs.</span>
                      <span className="text-4xl md:text-5xl font-bold tracking-tight">
                        {emiDetails.emi.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-primary-foreground/70 text-sm mt-2">for {tenure} months ({Math.floor(tenure/12)} years {tenure%12} months)</p>
                  </div>

                  {/* Breakdown */}
                  <div className="bg-card rounded-xl p-5 space-y-4 mb-6 border border-border/50">
                    <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                      <div className="bg-primary transition-all duration-500 rounded-l-full" style={{ width: `${emiDetails.principalPercent}%` }} />
                      <div className="bg-accent transition-all duration-500 rounded-r-full" style={{ width: `${emiDetails.interestPercent}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <div><p className="text-muted-foreground text-xs">Principal</p><p className="font-bold text-lg">{formatCurrency(principal)}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <div><p className="text-muted-foreground text-xs">Total Interest</p><p className="font-bold text-lg">{formatCurrency(emiDetails.totalInterest)}</p></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm text-muted-foreground font-medium">Total Payable</span>
                      <span className="text-xl font-bold text-foreground">{formatCurrency(emiDetails.totalPayment + downPayment)}</span>
                    </div>
                  </div>

                  {/* Quick EMI Reference */}
                  <div className="bg-card rounded-xl p-4 mb-6 border border-border/50">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Quick EMI Reference</p>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {quickEmiTable.map(({ months, emi }) => (
                        <div key={months}
                          className={`p-2 rounded-lg transition-all cursor-pointer ${tenure === months ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                          onClick={() => setTenureText(months.toString())}
                        >
                          <p className="text-xs opacity-75">{months}M</p>
                          <p className="text-sm font-bold">Rs.{(emi / 1000).toFixed(1)}K</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="mt-auto space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={handleDownloadPdf} className="h-11 font-semibold bg-gradient-to-r from-primary to-primary/90">
                        <Download className="w-4 h-4 mr-2" /> Download PDF
                      </Button>
                      <Button variant="outline" onClick={() => setShowComparison(!showComparison)} className="h-11 font-semibold">
                        <Building2 className="w-4 h-4 mr-2" /> {showComparison ? "Hide" : "Compare Banks"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={handleShareWhatsApp} className="h-11 font-semibold">
                        <Share2 className="w-4 h-4 mr-2" /> Share
                      </Button>
                      <a href={`https://wa.me/919855924442?text=Hi%20Grabyourcar!%20I%20need%20a%20car%20loan%20of%20${formatCurrency(principal)}%20for%20${tenure}%20months.`} target="_blank" rel="noopener noreferrer">
                        <Button variant="whatsapp" className="w-full h-11 font-semibold">
                          <MessageCircle className="w-4 h-4 mr-2" /> Get Quote
                        </Button>
                      </a>
                    </div>
                    {onGetQuote && (
                      <Button variant="outline" onClick={() => onGetQuote?.(`Car Loan: ${formatCurrency(loanAmount)} @ ${interestRate}% for ${tenure}m`)} className="w-full h-10">
                        <FileText className="w-4 h-4 mr-2" /> Request Callback
                      </Button>
                    )}
                  </div>

                  <div className="text-center mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
                      <Building2 className="h-4 w-4" />
                      <span>Partnered with leading banks</span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">SBI - HDFC Bank - ICICI Bank - Axis Bank - Kotak - IDFC First</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3-Bank Comparison Section */}
          {showComparison && (
            <Card className="mt-6 border-2 border-primary/20 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-foreground" />
                      Bank-wise EMI Comparison
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Loan: {formatCurrency(principal)} | Tenure: {tenure} months
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {bankColumns.length < 3 && (
                      <Button variant="outline" size="sm" onClick={addBankColumn}>
                        <Plus className="w-4 h-4 mr-1" /> Add Bank
                      </Button>
                    )}
                    <Button onClick={handleDownloadComparisonPdf} size="sm" className="bg-gradient-to-r from-primary to-primary/80">
                      <Download className="w-4 h-4 mr-1" /> Download Comparison PDF
                    </Button>
                  </div>
                </div>

                <div className={`grid gap-4 ${bankColumns.length === 1 ? 'grid-cols-1' : bankColumns.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                  {bankEMIs.map((bank, idx) => {
                    const isBest = idx === bestBankIdx && bankEMIs.length > 1;
                    return (
                      <div key={bank.id} className={`relative rounded-xl border-2 p-5 transition-all ${isBest ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20 shadow-lg' : 'border-border bg-card'}`}>
                        {isBest && (
                          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs">
                            Best Rate
                          </Badge>
                        )}
                        {bankColumns.length > 1 && (
                          <button onClick={() => removeBankColumn(bank.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        {/* Bank Name Select */}
                        <div className="mb-4">
                          <Label className="text-xs text-muted-foreground mb-1 block">Bank</Label>
                          <Select value={bank.bankName} onValueChange={(v) => updateBankColumn(bank.id, 'bankName', v)}>
                            <SelectTrigger className="h-9 font-semibold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Interest Rate */}
                        <div className="mb-4">
                          <Label className="text-xs text-muted-foreground mb-1 block">Interest Rate (%)</Label>
                          <Input
                            type="number" step="0.1" min="1" max="30"
                            value={bank.interestRate}
                            onChange={(e) => updateBankColumn(bank.id, 'interestRate', parseFloat(e.target.value) || 0)}
                            className="h-9 font-semibold"
                          />
                        </div>

                        {/* Processing Fee */}
                        <div className="mb-5">
                          <Label className="text-xs text-muted-foreground mb-1 block">Processing Fee (Rs.)</Label>
                          <Input
                            type="number" min="0"
                            value={bank.processingFee}
                            onChange={(e) => updateBankColumn(bank.id, 'processingFee', parseInt(e.target.value) || 0)}
                            className="h-9 font-semibold"
                          />
                        </div>

                        {/* Results */}
                        <div className={`rounded-xl p-4 text-center ${isBest ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
                          <p className="text-3xl font-extrabold text-foreground">
                            Rs. {bank.emi.toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Interest</span>
                            <span className="font-semibold text-orange-500">{formatCurrency(bank.totalInterest)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Payable</span>
                            <span className="font-semibold">{formatCurrency(bank.totalPayment)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Processing Fee</span>
                            <span className="font-semibold">{bank.processingFee === 0 ? 'FREE' : `Rs. ${bank.processingFee.toLocaleString('en-IN')}`}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border">
                            <span className="text-muted-foreground font-medium">Effective Cost</span>
                            <span className="font-bold text-foreground">{formatCurrency(bank.totalPayment + bank.processingFee)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Savings summary */}
                {bankEMIs.length > 1 && bestBankIdx >= 0 && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      <span className="font-bold">{bankEMIs[bestBankIdx].bankName}</span> saves you{" "}
                      <span className="font-bold">
                        {formatCurrency(
                          Math.max(...bankEMIs.map(b => b.totalPayment + b.processingFee)) -
                          (bankEMIs[bestBankIdx].totalPayment + bankEMIs[bestBankIdx].processingFee)
                        )}
                      </span>{" "}
                      compared to the most expensive option!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};

export default EMICalculator;
