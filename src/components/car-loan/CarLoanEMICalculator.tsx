import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calculator, IndianRupee, FileDown, Plus, Trash2, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { generateComparisonPdf } from "@/lib/generateComparisonPdf";
import { toast } from "sonner";

const BANK_LIST = [
  "SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
  "Bank of Baroda", "Punjab National Bank", "Union Bank", "Canara Bank",
  "IndusInd Bank", "Yes Bank", "IDFC First Bank", "Federal Bank",
  "Bajaj Finance", "Tata Capital", "Mahindra Finance", "Sundaram Finance",
  "Cholamandalam", "AU Small Finance Bank", "Hero FinCorp", "L&T Finance",
  "Shriram Finance", "HDB Financial", "Custom"
];

interface BankEntry {
  id: string;
  bankName: string;
  customName: string;
  interestRate: string;
  processingFee: string;
  tenure: string;
}

const createEmptyBank = (): BankEntry => ({
  id: crypto.randomUUID(),
  bankName: "",
  customName: "",
  interestRate: "",
  processingFee: "0",
  tenure: "",
});

export const CarLoanEMICalculator = () => {
  const [loanAmount, setLoanAmount] = useState(800000);
  const [loanAmountText, setLoanAmountText] = useState("8,00,000");
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(60);
  const [downPayment, setDownPayment] = useState(200000);

  // PDF dialog
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [carName, setCarName] = useState("");
  const [variantName, setVariantName] = useState("");
  const [banks, setBanks] = useState<BankEntry[]>([createEmptyBank()]);

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

  const formatInputCurrency = (val: string) => {
    const num = val.replace(/[^0-9]/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("en-IN");
  };

  const parseInputCurrency = (val: string) => {
    return Number(val.replace(/[^0-9]/g, "")) || 0;
  };

  const principalPct = effectiveLoan > 0 ? (effectiveLoan / totalPayment) * 100 : 0;

  const updateBank = (id: string, field: keyof BankEntry, value: string) => {
    setBanks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const addBank = () => {
    if (banks.length >= 3) return;
    setBanks(prev => [...prev, createEmptyBank()]);
  };

  const removeBank = (id: string) => {
    if (banks.length <= 1) return;
    setBanks(prev => prev.filter(b => b.id !== id));
  };

  const calcEMI = (principal: number, rate: number, months: number) => {
    const r = rate / 12 / 100;
    if (r === 0) return Math.round(principal / months);
    return Math.round((principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
  };

  const handleGeneratePdf = () => {
    const validBanks = banks.filter(b => {
      const name = b.bankName === "Custom" ? b.customName : b.bankName;
      return name && parseFloat(b.interestRate) > 0 && parseInt(b.tenure) > 0;
    });

    if (validBanks.length === 0) {
      toast.error("Please add at least one bank with valid details");
      return;
    }

    const bankData = validBanks.map(b => {
      const name = b.bankName === "Custom" ? b.customName : b.bankName;
      const rate = parseFloat(b.interestRate);
      const months = parseInt(b.tenure);
      const fee = parseFloat(b.processingFee) || 0;
      const bankEmi = calcEMI(effectiveLoan, rate, months);
      const total = bankEmi * months;
      return {
        bankName: name,
        interestRate: rate,
        processingFee: fee,
        emi: bankEmi,
        totalPayment: total,
        totalInterest: total - effectiveLoan,
      };
    });

    generateComparisonPdf({
      carName: carName || "Car Loan",
      variantName,
      loanAmount,
      downPayment,
      principal: effectiveLoan,
      tenure: parseInt(banks[0].tenure) || tenure,
      banks: bankData,
    });

    toast.success("Comparison PDF downloaded!");
    setShowPdfDialog(false);
  };

  const openPdfDialog = () => {
    // Pre-fill first bank with current calculator values
    setBanks([{
      ...createEmptyBank(),
      interestRate: interestRate.toString(),
      tenure: tenure.toString(),
    }]);
    setShowPdfDialog(true);
  };

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
                {/* Car Price - editable */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-foreground">Car Price</label>
                    <Input
                      type="text"
                      value={loanAmountText}
                      onChange={(e) => {
                        const formatted = formatInputCurrency(e.target.value);
                        setLoanAmountText(formatted);
                        const num = parseInputCurrency(e.target.value);
                        if (num >= 200000 && num <= 50000000) setLoanAmount(num);
                      }}
                      onBlur={() => {
                        const num = parseInputCurrency(loanAmountText);
                        const clamped = Math.max(200000, Math.min(50000000, num || 200000));
                        setLoanAmount(clamped);
                        setLoanAmountText(clamped.toLocaleString("en-IN"));
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-32 h-8 text-right font-bold text-primary text-sm border-primary/20"
                    />
                  </div>
                  <Slider value={[loanAmount]} onValueChange={(v) => { setLoanAmount(v[0]); setLoanAmountText(v[0].toLocaleString("en-IN")); }} min={200000} max={50000000} step={50000} />
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

                <div className="space-y-2 mb-6">
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

                {/* Generate PDF Button */}
                <Button onClick={openPdfDialog} className="w-full gap-2" size="lg">
                  <FileDown className="w-4 h-4" />
                  Compare Banks & Download PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDF Generation Dialog */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              Bank Comparison — Generate PDF
            </DialogTitle>
            <DialogDescription>
              Add up to 3 banks to compare EMI, interest & total cost side-by-side.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Car details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Car Name</Label>
                <Input placeholder="e.g. Hyundai Creta" value={carName} onChange={e => setCarName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Variant (optional)</Label>
                <Input placeholder="e.g. SX(O) Turbo" value={variantName} onChange={e => setVariantName(e.target.value)} />
              </div>
            </div>

            {/* Loan summary strip */}
            <div className="bg-muted/50 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Car Price</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(loanAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Down Payment</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(downPayment)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Loan Amount</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(effectiveLoan)}</p>
              </div>
            </div>

            {/* Bank entries */}
            <div className="space-y-4">
              {banks.map((bank, idx) => {
                const bankRate = parseFloat(bank.interestRate) || 0;
                const bankTenure = parseInt(bank.tenure) || 0;
                const bankEmi = bankRate > 0 && bankTenure > 0 ? calcEMI(effectiveLoan, bankRate, bankTenure) : 0;

                return (
                  <Card key={bank.id} className="border border-border/60 shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">Bank {idx + 1}</Badge>
                        {banks.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBank(bank.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Bank Name</Label>
                          <Select value={bank.bankName} onValueChange={v => updateBank(bank.id, "bankName", v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select Bank" /></SelectTrigger>
                            <SelectContent>
                              {BANK_LIST.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {bank.bankName === "Custom" && (
                          <div>
                            <Label className="text-xs">Custom Bank Name</Label>
                            <Input className="h-9" placeholder="Bank name" value={bank.customName} onChange={e => updateBank(bank.id, "customName", e.target.value)} />
                          </div>
                        )}
                        <div>
                          <Label className="text-xs">Interest Rate (% p.a.)</Label>
                          <Input className="h-9" type="number" step="0.25" placeholder="8.5" value={bank.interestRate} onChange={e => updateBank(bank.id, "interestRate", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Tenure (months)</Label>
                          <Input className="h-9" type="number" placeholder="60" value={bank.tenure} onChange={e => updateBank(bank.id, "tenure", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Processing Fee (₹)</Label>
                          <Input className="h-9" type="number" placeholder="0" value={bank.processingFee} onChange={e => updateBank(bank.id, "processingFee", e.target.value)} />
                        </div>
                      </div>

                      {/* Live preview */}
                      {bankEmi > 0 && (
                        <div className="bg-primary/5 rounded-lg p-2.5 flex items-center justify-between border border-primary/10">
                          <span className="text-xs text-muted-foreground">EMI Preview</span>
                          <span className="text-base font-bold text-primary">₹{bankEmi.toLocaleString("en-IN")}/mo</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {banks.length < 3 && (
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={addBank}>
                <Plus className="w-3.5 h-3.5" /> Add Bank ({banks.length}/3)
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>Cancel</Button>
            <Button onClick={handleGeneratePdf} className="gap-2">
              <FileDown className="w-4 h-4" /> Generate Comparison PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
