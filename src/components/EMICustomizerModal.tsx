import { forwardRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Download,
  Share2,
  IndianRupee,
  Percent,
  Calendar,
  PiggyBank,
  TrendingUp,
  Edit3,
  RotateCcw,
  Gift,
  Tag,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateEMIPdf, generateEMIWhatsAppMessage, EMIData, OnRoadPriceBreakup, EMIPDFConfig, DiscountDetails } from "@/lib/generateEMIPdf";

interface EMICustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carName: string;
  variantName: string;
  selectedColor?: string;
  selectedCity?: string;
  onRoadPrice: OnRoadPriceBreakup;
  pdfConfig?: Partial<EMIPDFConfig>;
}

export const EMICustomizerModal = forwardRef<HTMLDivElement, EMICustomizerModalProps>(({ 
  open,
  onOpenChange,
  carName,
  variantName,
  selectedColor,
  selectedCity,
  onRoadPrice,
  pdfConfig,
}, ref) => {
  const basePrice = onRoadPrice.onRoadPrice;
  
  // Default values
  const defaultDownPaymentPercent = 20;
  const defaultInterestRate = 8.5;
  const defaultTenure = 60;
  
  // State for editable fields
  const [downPaymentPercent, setDownPaymentPercent] = useState(defaultDownPaymentPercent);
  const [interestRate, setInterestRate] = useState(defaultInterestRate);
  const [tenure, setTenure] = useState(defaultTenure);
  const [isEditing, setIsEditing] = useState(false);
  
  // Discount state
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountDetails['type']>('cash');
  const [discountRemarks, setDiscountRemarks] = useState('');
  
  // Reset to defaults when modal opens
  useEffect(() => {
    if (open) {
      setDownPaymentPercent(defaultDownPaymentPercent);
      setInterestRate(defaultInterestRate);
      setTenure(defaultTenure);
      setIsEditing(false);
      setEnableDiscount(false);
      setDiscountAmount(0);
      setDiscountType('cash');
      setDiscountRemarks('');
    }
  }, [open]);

  // Calculated values
  const downPayment = Math.round(basePrice * (downPaymentPercent / 100));
  const loanPrincipal = basePrice - downPayment;
  const monthlyRate = interestRate / 12 / 100;
  const emi = monthlyRate > 0 
    ? Math.round((loanPrincipal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1))
    : Math.round(loanPrincipal / tenure);
  const totalPayment = emi * tenure;
  const totalInterest = totalPayment - loanPrincipal;

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const resetToDefaults = () => {
    setDownPaymentPercent(defaultDownPaymentPercent);
    setInterestRate(defaultInterestRate);
    setTenure(defaultTenure);
  };

  // Build discount object if enabled
  const discount: DiscountDetails | undefined = enableDiscount && discountAmount > 0 
    ? { amount: discountAmount, type: discountType, remarks: discountRemarks || undefined }
    : undefined;

  const handleDownloadPdf = () => {
    const emiData: EMIData = {
      loanAmount: basePrice,
      downPayment,
      loanPrincipal,
      interestRate,
      tenure,
      emi,
      totalPayment,
      totalInterest,
      carName,
      variantName,
      selectedColor,
      selectedCity,
      onRoadPrice,
      discount,
    };
    
    generateEMIPdf(emiData, pdfConfig);
    onOpenChange(false);
  };

  const handleShareWhatsApp = () => {
    const emiData: EMIData = {
      loanAmount: basePrice,
      downPayment,
      loanPrincipal,
      interestRate,
      tenure,
      emi,
      totalPayment,
      totalInterest,
      carName,
      variantName,
      selectedColor,
      selectedCity,
      onRoadPrice,
      discount,
    };
    
    const message = generateEMIWhatsAppMessage(emiData, pdfConfig);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const discountTypes = [
    { value: 'cash', label: 'Cash Discount' },
    { value: 'exchange', label: 'Exchange Bonus' },
    { value: 'accessory', label: 'Accessory Discount' },
    { value: 'corporate', label: 'Corporate Discount' },
    { value: 'festival', label: 'Festival Offer' },
    { value: 'custom', label: 'Special Discount' },
  ];

  const tenureOptions = [12, 24, 36, 48, 60, 72, 84, 96, 108, 120];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={ref} className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-foreground" />
            Customize EMI & Download Quote
          </DialogTitle>
          <DialogDescription>
            Adjust loan parameters before downloading your personalized quote
          </DialogDescription>
        </DialogHeader>

        {/* Car Details Summary */}
        <div className="bg-gradient-to-r from-primary/10 to-success/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg">{carName}</h3>
              <p className="text-sm text-muted-foreground">{variantName}</p>
              {selectedColor && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {selectedColor}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">On-Road Price</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(basePrice)}</p>
              {selectedCity && (
                <p className="text-xs text-muted-foreground mt-1">in {selectedCity}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* EMI Calculator Controls */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Loan Parameters
            </h4>
            <Button variant="ghost" size="sm" onClick={resetToDefaults}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>

          {/* Down Payment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-foreground" />
                Down Payment
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(Math.min(90, Math.max(0, Number(e.target.value))))}
                  className="w-16 h-8 text-right text-sm"
                  min={0}
                  max={90}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <Slider
              value={[downPaymentPercent]}
              onValueChange={(v) => setDownPaymentPercent(v[0])}
              min={0}
              max={90}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-medium text-foreground">{formatCurrency(downPayment)}</span>
              <span>90%</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-amber-500" />
                Interest Rate (p.a.)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Math.min(30, Math.max(0, Number(e.target.value))))}
                  className="w-20 h-8 text-right text-sm"
                  min={0}
                  max={30}
                  step={0.1}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <Slider
              value={[interestRate]}
              onValueChange={(v) => setInterestRate(v[0])}
              min={5}
              max={20}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5%</span>
              <span>20%</span>
            </div>
          </div>

          {/* Tenure */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Loan Tenure
              </Label>
              <span className="text-sm font-medium">
                {tenure} months ({Math.floor(tenure / 12)} yr {tenure % 12 > 0 ? `${tenure % 12} mo` : ''})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tenureOptions.map((t) => (
                <Button
                  key={t}
                  variant={tenure === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTenure(t)}
                  className="text-xs h-8"
                >
                  {t / 12}Y
                </Button>
              ))}
            </div>
          </div>

          {/* Discount Section */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-foreground" />
                Add Discount Offer
              </Label>
              <Button
                variant={enableDiscount ? "default" : "outline"}
                size="sm"
                onClick={() => setEnableDiscount(!enableDiscount)}
                className="h-8"
              >
                {enableDiscount ? "Remove" : "Add Discount"}
              </Button>
            </div>

            {enableDiscount && (
              <div className="space-y-3 p-4 bg-success/5 rounded-lg border border-success/20">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Discount Type</Label>
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountDetails['type'])}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {discountTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Discount Amount</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                        placeholder="e.g. 25000"
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Remarks (Optional)</Label>
                  <Input
                    value={discountRemarks}
                    onChange={(e) => setDiscountRemarks(e.target.value)}
                    placeholder="e.g. Limited time offer, valid till month-end"
                    className="h-9"
                  />
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between p-2 bg-success/10 rounded-md">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      Final Price After Discount
                    </span>
                    <span className="font-bold text-foreground">{formatCurrency(basePrice - discountAmount)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* EMI Result Summary */}
        <div className="space-y-4">
          {/* Main EMI Display */}
          <div className="bg-gradient-to-br from-primary via-success to-primary rounded-xl p-5 text-white text-center">
            <p className="text-sm opacity-90">Your Monthly EMI</p>
            <p className="text-4xl font-bold my-2">
              ₹{emi.toLocaleString('en-IN')}
            </p>
            <p className="text-xs opacity-80">
              for {tenure} months @ {interestRate}% p.a.
            </p>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Down Payment</p>
              <p className="font-bold text-foreground">{formatCurrency(downPayment)}</p>
              <p className="text-xs text-muted-foreground">{downPaymentPercent}% of price</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Loan Amount</p>
              <p className="font-bold">{formatCurrency(loanPrincipal)}</p>
              <p className="text-xs text-muted-foreground">{100 - downPaymentPercent}% financed</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Interest</p>
              <p className="font-bold text-foreground">{formatCurrency(totalInterest)}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {((totalInterest / loanPrincipal) * 100).toFixed(1)}% of loan
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Payable</p>
              <p className="font-bold text-foreground">{formatCurrency(totalPayment + downPayment)}</p>
              <p className="text-xs text-muted-foreground">incl. down payment</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleShareWhatsApp} className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share on WhatsApp
          </Button>
          <Button onClick={handleDownloadPdf} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download PDF Quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

EMICustomizerModal.displayName = "EMICustomizerModal";
