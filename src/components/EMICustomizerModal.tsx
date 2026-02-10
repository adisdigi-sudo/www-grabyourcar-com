import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calculator,
  Download,
  Share2,
  IndianRupee,
  Percent,
  Calendar,
  PiggyBank,
  TrendingUp,
  RotateCcw,
  Gift,
  Tag,
  Mail,
  Phone,
  User,
  Send,
  MessageCircle,
  FileText,
  Loader2,
  CheckCircle2,
  Palette,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateEMIPdf, generateEMIWhatsAppMessage, EMIData, OnRoadPriceBreakup, EMIPDFConfig, DiscountDetails } from "@/lib/generateEMIPdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EMICustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carName: string;
  variantName: string;
  selectedColor?: string;
  selectedCity?: string;
  onRoadPrice: OnRoadPriceBreakup;
  pdfConfig?: Partial<EMIPDFConfig>;
  brochureUrl?: string;
  availableColors?: { name: string; hex: string }[];
  onColorChange?: (colorName: string) => void;
}

export const EMICustomizerModal = ({
  open,
  onOpenChange,
  carName,
  variantName,
  selectedColor,
  selectedCity,
  onRoadPrice,
  pdfConfig,
  brochureUrl,
  availableColors,
  onColorChange,
}: EMICustomizerModalProps) => {
  const basePrice = onRoadPrice.onRoadPrice;
  
  const defaultDownPaymentPercent = 20;
  const defaultInterestRate = 8.5;
  const defaultTenure = 60;
  
  const [downPaymentPercent, setDownPaymentPercent] = useState(defaultDownPaymentPercent);
  const [interestRate, setInterestRate] = useState(defaultInterestRate);
  const [tenure, setTenure] = useState(defaultTenure);
  
  // Discount state
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountDetails['type']>('cash');
  const [discountRemarks, setDiscountRemarks] = useState('');
  
  // Client details for sharing
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  useEffect(() => {
    if (open) {
      setDownPaymentPercent(defaultDownPaymentPercent);
      setInterestRate(defaultInterestRate);
      setTenure(defaultTenure);
      setEnableDiscount(false);
      setDiscountAmount(0);
      setDiscountType('cash');
      setDiscountRemarks('');
      setClientName('');
      setClientEmail('');
      setClientMobile('');
      setIsSending(false);
      setEmailSent(false);
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
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const resetToDefaults = () => {
    setDownPaymentPercent(defaultDownPaymentPercent);
    setInterestRate(defaultInterestRate);
    setTenure(defaultTenure);
  };

  const discount: DiscountDetails | undefined = enableDiscount && discountAmount > 0 
    ? { amount: discountAmount, type: discountType, remarks: discountRemarks || undefined }
    : undefined;

  const getEMIData = (): EMIData => ({
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
  });

  const handleDownloadPdf = () => {
    generateEMIPdf(getEMIData(), pdfConfig);
    toast.success("Quote PDF downloaded!");
  };

  const handleShareWhatsApp = () => {
    const message = generateEMIWhatsAppMessage(getEMIData(), pdfConfig);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleShareWhatsAppToClient = () => {
    if (!clientMobile || clientMobile.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    const message = generateEMIWhatsAppMessage(getEMIData(), pdfConfig);
    window.open(`https://wa.me/91${clientMobile}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleSendEmail = async () => {
    if (!clientEmail) {
      toast.error("Please enter client email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-quote", {
        body: {
          clientName,
          clientEmail,
          clientMobile,
          carName,
          variantName,
          selectedColor,
          selectedCity,
          onRoadPrice: basePrice,
          emi,
          downPayment,
          loanAmount: loanPrincipal,
          interestRate,
          tenure,
          totalPayment,
          totalInterest,
          brochureUrl,
          priceBreakup: {
            exShowroom: onRoadPrice.exShowroom,
            rto: onRoadPrice.rto,
            insurance: onRoadPrice.insurance,
            tcs: onRoadPrice.tcs,
            fastag: onRoadPrice.fastag,
            registration: onRoadPrice.registration,
            handling: onRoadPrice.handling,
          },
          discount: discount ? {
            amount: discount.amount,
            type: discount.type,
            label: discount.remarks,
          } : undefined,
        },
      });

      if (error) throw error;
      
      setEmailSent(true);
      toast.success(`Quote sent to ${clientEmail}!`, {
        description: brochureUrl ? "Email includes brochure download link" : undefined,
      });
    } catch (error: any) {
      console.error("Failed to send quote:", error);
      toast.error("Failed to send quote email. Please try again.");
    } finally {
      setIsSending(false);
    }
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Customize & Share Quote
          </DialogTitle>
          <DialogDescription>
            Configure EMI, add discounts, and share via Email or WhatsApp
          </DialogDescription>
        </DialogHeader>

        {/* Car Details Summary */}
        <div className="bg-gradient-to-r from-primary/10 to-success/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg">{carName}</h3>
              <p className="text-sm text-muted-foreground">{variantName}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {selectedColor && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Palette className="h-3 w-3" />
                    {selectedColor}
                  </Badge>
                )}
                {selectedCity && (
                  <Badge variant="outline" className="text-xs">
                    {selectedCity}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">On-Road Price</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(basePrice)}</p>
            </div>
          </div>

          {/* Inline Color Picker */}
          {availableColors && availableColors.length > 1 && onColorChange && (
            <div className="mt-3 pt-3 border-t border-primary/10">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Palette className="h-3 w-3" /> Change Color
              </p>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => onColorChange(color.name)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      selectedColor === color.name
                        ? "border-primary scale-110 ring-2 ring-primary/30"
                        : "border-border hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="customize" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customize" className="gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              Customize EMI
            </TabsTrigger>
            <TabsTrigger value="share" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Send Quote
            </TabsTrigger>
          </TabsList>

          {/* ========== CUSTOMIZE TAB ========== */}
          <TabsContent value="customize" className="space-y-5 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Loan Parameters</h4>
              <Button variant="ghost" size="sm" onClick={resetToDefaults}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            </div>

            {/* Down Payment */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <PiggyBank className="h-4 w-4 text-primary" />
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
                <Label className="flex items-center gap-2 text-sm">
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
              />
            </div>

            {/* Tenure */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Loan Tenure
                </Label>
                <span className="text-sm font-medium">
                  {tenure} months ({Math.floor(tenure / 12)} yr{tenure % 12 > 0 ? ` ${tenure % 12} mo` : ''})
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
                <Label className="flex items-center gap-2 text-sm">
                  <Gift className="h-4 w-4 text-success" />
                  Add Discount
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
                      <Label className="text-xs mb-1.5 block">Type</Label>
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
                      <Label className="text-xs mb-1.5 block">Amount</Label>
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
                  <Input
                    value={discountRemarks}
                    onChange={(e) => setDiscountRemarks(e.target.value)}
                    placeholder="Remarks (Optional)"
                    className="h-9"
                  />
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between p-2 bg-success/10 rounded-md">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        Final Price
                      </span>
                      <span className="font-bold text-success">{formatCurrency(basePrice - discountAmount)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* EMI Result */}
            <div className="bg-gradient-to-br from-primary via-success to-primary rounded-xl p-5 text-white text-center">
              <p className="text-sm opacity-90">Your Monthly EMI</p>
              <p className="text-4xl font-bold my-2">₹{emi.toLocaleString('en-IN')}</p>
              <p className="text-xs opacity-80">for {tenure} months @ {interestRate}% p.a.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Down Payment</p>
                <p className="font-bold text-primary">{formatCurrency(downPayment)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Loan Amount</p>
                <p className="font-bold">{formatCurrency(loanPrincipal)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Interest</p>
                <p className="font-bold text-accent">{formatCurrency(totalInterest)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Payable</p>
                <p className="font-bold text-primary">{formatCurrency(totalPayment + downPayment)}</p>
              </div>
            </div>

            {/* Download & WhatsApp Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleShareWhatsApp} className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share WhatsApp
              </Button>
              <Button onClick={handleDownloadPdf} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </TabsContent>

          {/* ========== SEND QUOTE TAB ========== */}
          <TabsContent value="share" className="space-y-5 mt-4">
            {emailSent ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Quote Sent Successfully! 🎉</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {carName} quote sent to <strong>{clientEmail}</strong>
                  </p>
                  {brochureUrl && (
                    <p className="text-xs text-muted-foreground mt-2">
                      📄 Brochure download link included in email
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => setEmailSent(false)}>
                    Send Another
                  </Button>
                  <Button size="sm" onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-muted/50 rounded-xl p-4 border">
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Send Quote to Client
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Enter client details below. A beautifully branded quote email will be sent with full price breakup, EMI details{brochureUrl ? ", and brochure download link" : ""}.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Client Name
                    </Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Enter client name"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Client Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@email.com"
                      className="h-11"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Client Mobile
                    </Label>
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 bg-muted rounded-lg text-sm text-muted-foreground border">+91</span>
                      <Input
                        type="tel"
                        value={clientMobile}
                        onChange={(e) => setClientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="h-11 flex-1"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Quote Summary */}
                <div className="bg-gradient-to-r from-primary/5 to-success/5 rounded-xl p-4 border border-primary/10">
                  <h4 className="text-sm font-semibold mb-3">Quote Summary</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-muted-foreground">Car</span>
                    <span className="font-medium text-right">{carName}</span>
                    <span className="text-muted-foreground">Variant</span>
                    <span className="font-medium text-right">{variantName}</span>
                    {selectedColor && (
                      <>
                        <span className="text-muted-foreground">Color</span>
                        <span className="font-medium text-right">{selectedColor}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">On-Road Price</span>
                    <span className="font-bold text-primary text-right">{formatCurrency(basePrice)}</span>
                    <span className="text-muted-foreground">Monthly EMI</span>
                    <span className="font-bold text-success text-right">₹{emi.toLocaleString('en-IN')}</span>
                    {discount && (
                      <>
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-bold text-success text-right">- {formatCurrency(discount.amount)}</span>
                      </>
                    )}
                  </div>
                  {brochureUrl && (
                    <div className="mt-3 pt-3 border-t border-primary/10 flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Official brochure will be attached</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    onClick={handleSendEmail}
                    disabled={isSending || !clientEmail}
                    className="w-full h-12 text-base font-semibold gap-2"
                    size="lg"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Sending Quote...
                      </>
                    ) : (
                      <>
                        <Mail className="h-5 w-5" />
                        Send Quote via Email
                      </>
                    )}
                  </Button>

                  {clientMobile.length === 10 && (
                    <Button
                      variant="whatsapp"
                      onClick={handleShareWhatsAppToClient}
                      className="w-full h-11 gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Send Quote on WhatsApp to +91 {clientMobile}
                    </Button>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
