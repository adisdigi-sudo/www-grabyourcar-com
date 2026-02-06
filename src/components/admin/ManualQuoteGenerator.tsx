import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  Share2,
  Calculator,
  Car,
  IndianRupee,
  Sparkles,
  Gift,
  Building2,
  Palette,
  MapPin,
  User,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { generateEMIPdf, EMIData, EMIPDFConfig, DiscountDetails } from "@/lib/generateEMIPdf";
import { useEMIPDFSettings } from "@/hooks/useEMIPDFSettings";

const DISCOUNT_TYPES = [
  { value: 'cash', label: 'Cash Discount' },
  { value: 'exchange', label: 'Exchange Bonus' },
  { value: 'accessory', label: 'Free Accessories' },
  { value: 'corporate', label: 'Corporate Discount' },
  { value: 'festival', label: 'Festival Offer' },
  { value: 'custom', label: 'Custom Offer' },
];

const BRANDS = [
  "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Kia", "Toyota", 
  "Honda", "MG", "Skoda", "Volkswagen", "BMW", "Mercedes-Benz", "Audi"
];

export const ManualQuoteGenerator = () => {
  const { config: pdfConfig } = useEMIPDFSettings();
  
  // Car Details
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [color, setColor] = useState("");
  const [city, setCity] = useState("");
  
  // Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  
  // Price Components
  const [exShowroom, setExShowroom] = useState<number>(0);
  const [rto, setRto] = useState<number>(0);
  const [insurance, setInsurance] = useState<number>(0);
  const [tcs, setTcs] = useState<number>(0);
  const [fastag, setFastag] = useState<number>(500);
  const [registration, setRegistration] = useState<number>(0);
  const [handling, setHandling] = useState<number>(0);
  const [accessories, setAccessories] = useState<number>(0);
  const [extendedWarranty, setExtendedWarranty] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [otherChargesLabel, setOtherChargesLabel] = useState("");
  
  // EMI Details
  const [showEMI, setShowEMI] = useState(true);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenure, setTenure] = useState<number>(60);
  
  // Discount
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountDetails['type']>('cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountRemarks, setDiscountRemarks] = useState("");
  
  // Notes
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Calculate totals
  const subtotal = exShowroom + rto + insurance + tcs + fastag + registration + handling + accessories + extendedWarranty + otherCharges;
  const finalPrice = enableDiscount ? subtotal - discountAmount : subtotal;
  
  // Calculate EMI
  const calculateEMI = () => {
    if (!showEMI || loanAmount <= 0) return 0;
    const monthlyRate = interestRate / 12 / 100;
    const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
                (Math.pow(1 + monthlyRate, tenure) - 1);
    return Math.round(emi);
  };
  
  const emi = calculateEMI();

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const handleGeneratePDF = async () => {
    if (!brand || !model) {
      toast.error("Please enter car brand and model");
      return;
    }

    const carName = `${brand} ${model}`;
    
    // Calculate EMI-related values
    const calculatedEMI = showEMI ? emi : 0;
    const totalPayment = showEMI ? calculatedEMI * tenure : 0;
    const totalInterest = showEMI ? totalPayment - loanAmount : 0;
    
    const emiData: EMIData = {
      carName,
      variantName: variant || "Standard",
      selectedColor: color || undefined,
      selectedCity: city || undefined,
      onRoadPrice: {
        exShowroom,
        rto,
        insurance,
        tcs,
        fastag,
        registration,
        handling,
        onRoadPrice: finalPrice,
      },
      downPayment: showEMI ? downPayment : 0,
      loanAmount: showEMI ? loanAmount : 0,
      loanPrincipal: showEMI ? loanAmount : 0,
      interestRate: showEMI ? interestRate : 0,
      tenure: showEMI ? tenure : 0,
      emi: calculatedEMI,
      totalPayment,
      totalInterest,
      discount: enableDiscount ? {
        amount: discountAmount,
        type: discountType,
        label: DISCOUNT_TYPES.find(d => d.value === discountType)?.label,
        remarks: discountRemarks || undefined,
      } : undefined,
    };

    try {
      await generateEMIPdf(emiData, pdfConfig || undefined);
      toast.success("Quote PDF generated successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleShareWhatsApp = () => {
    if (!brand || !model) {
      toast.error("Please enter car brand and model");
      return;
    }

    const carName = `${brand} ${model}`;
    const companyName = pdfConfig?.companyName || "Grabyourcar";
    
    let message = `🚗 *${carName} Price Quote*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (variant) message += `📋 *Variant:* ${variant}\n`;
    if (color) message += `🎨 *Color:* ${color}\n`;
    if (city) message += `📍 *City:* ${city}\n`;
    if (variant || color || city) message += `\n`;
    
    message += `💰 *Price Breakup:*\n`;
    message += `• Ex-Showroom: ${formatPrice(exShowroom)}\n`;
    if (rto > 0) message += `• RTO Charges: ${formatPrice(rto)}\n`;
    if (insurance > 0) message += `• Insurance: ${formatPrice(insurance)}\n`;
    if (tcs > 0) message += `• TCS: ${formatPrice(tcs)}\n`;
    if (fastag > 0) message += `• FASTag: ${formatPrice(fastag)}\n`;
    if (registration > 0) message += `• Registration: ${formatPrice(registration)}\n`;
    if (handling > 0) message += `• Handling: ${formatPrice(handling)}\n`;
    if (accessories > 0) message += `• Accessories: ${formatPrice(accessories)}\n`;
    if (extendedWarranty > 0) message += `• Extended Warranty: ${formatPrice(extendedWarranty)}\n`;
    if (otherCharges > 0) message += `• ${otherChargesLabel || 'Other'}: ${formatPrice(otherCharges)}\n`;
    
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 *Total On-Road:* ${formatPrice(subtotal)}\n`;
    
    if (enableDiscount && discountAmount > 0) {
      message += `\n🎁 *${DISCOUNT_TYPES.find(d => d.value === discountType)?.label}:* -${formatPrice(discountAmount)}\n`;
      if (discountRemarks) message += `   _${discountRemarks}_\n`;
      message += `\n✨ *Final Price:* ${formatPrice(finalPrice)}\n`;
    }
    
    if (showEMI && emi > 0) {
      message += `\n💳 *EMI Option:*\n`;
      message += `• Down Payment: ${formatPrice(downPayment)}\n`;
      message += `• Loan Amount: ${formatPrice(loanAmount)}\n`;
      message += `• EMI: ${formatPrice(emi)}/month\n`;
      message += `• Rate: ${interestRate}% | Tenure: ${tenure} months\n`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🏢 *${companyName}*\n`;
    if (pdfConfig?.phone) message += `📞 ${pdfConfig.phone}\n`;
    if (pdfConfig?.website) message += `🌐 ${pdfConfig.website}\n`;
    
    const whatsappUrl = customerPhone 
      ? `https://wa.me/91${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleAutoCalculate = () => {
    // Auto-calculate common values based on ex-showroom
    if (exShowroom > 0) {
      const estimatedRto = Math.round(exShowroom * 0.08); // ~8% RTO
      const estimatedInsurance = Math.round(exShowroom * 0.035); // ~3.5% Insurance
      const estimatedTcs = exShowroom > 1000000 ? Math.round(exShowroom * 0.01) : 0; // 1% TCS for >10L
      const estimatedHandling = 25000;
      const estimatedRegistration = 2500;
      
      setRto(estimatedRto);
      setInsurance(estimatedInsurance);
      setTcs(estimatedTcs);
      setHandling(estimatedHandling);
      setRegistration(estimatedRegistration);
      
      // Auto-calculate loan details
      const total = exShowroom + estimatedRto + estimatedInsurance + estimatedTcs + fastag + estimatedHandling + estimatedRegistration;
      setDownPayment(Math.round(total * 0.2));
      setLoanAmount(Math.round(total * 0.8));
      
      toast.success("Estimated values calculated based on ex-showroom price");
    }
  };

  const handleReset = () => {
    setBrand("");
    setModel("");
    setVariant("");
    setColor("");
    setCity("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setExShowroom(0);
    setRto(0);
    setInsurance(0);
    setTcs(0);
    setFastag(500);
    setRegistration(0);
    setHandling(0);
    setAccessories(0);
    setExtendedWarranty(0);
    setOtherCharges(0);
    setOtherChargesLabel("");
    setDownPayment(0);
    setLoanAmount(0);
    setInterestRate(8.5);
    setTenure(60);
    setEnableDiscount(false);
    setDiscountAmount(0);
    setDiscountRemarks("");
    setAdditionalNotes("");
    toast.info("Form reset successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Manual Quote Generator
          </h2>
          <p className="text-muted-foreground mt-1">
            Create custom price quotes by entering all details manually
          </p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          Reset Form
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Input Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Car Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Car Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand *</Label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANDS.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model *</Label>
                  <Input 
                    placeholder="e.g., Swift, Creta, Nexon"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Variant</Label>
                  <Input 
                    placeholder="e.g., ZXI+ AT"
                    value={variant}
                    onChange={(e) => setVariant(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    Color
                  </Label>
                  <Input 
                    placeholder="e.g., Pearl White"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    City
                  </Label>
                  <Input 
                    placeholder="e.g., Delhi NCR"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Name
                  </Label>
                  <Input 
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <Input 
                    placeholder="10-digit mobile"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input 
                    placeholder="email@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Breakup */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  Price Breakup
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleAutoCalculate}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Auto Calculate
                </Button>
              </div>
              <CardDescription>
                Enter ex-showroom and click "Auto Calculate" to estimate other charges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ex-Showroom Price *</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={exShowroom || ''}
                    onChange={(e) => setExShowroom(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RTO Charges</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={rto || ''}
                    onChange={(e) => setRto(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Insurance (1 Year)</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={insurance || ''}
                    onChange={(e) => setInsurance(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>TCS (1%)</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={tcs || ''}
                    onChange={(e) => setTcs(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>FASTag</Label>
                  <Input 
                    type="number"
                    placeholder="500"
                    value={fastag || ''}
                    onChange={(e) => setFastag(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Registration</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={registration || ''}
                    onChange={(e) => setRegistration(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Handling Charges</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={handling || ''}
                    onChange={(e) => setHandling(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accessories</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={accessories || ''}
                    onChange={(e) => setAccessories(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Extended Warranty</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={extendedWarranty || ''}
                    onChange={(e) => setExtendedWarranty(Number(e.target.value))}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Other Charges Label</Label>
                  <Input 
                    placeholder="e.g., Coating, Accessories Kit"
                    value={otherChargesLabel}
                    onChange={(e) => setOtherChargesLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other Charges Amount</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={otherCharges || ''}
                    onChange={(e) => setOtherCharges(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* EMI Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  EMI Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-emi">Include EMI in Quote</Label>
                  <Switch 
                    id="show-emi"
                    checked={showEMI}
                    onCheckedChange={setShowEMI}
                  />
                </div>
              </div>
            </CardHeader>
            {showEMI && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Down Payment</Label>
                    <Input 
                      type="number"
                      placeholder="0"
                      value={downPayment || ''}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Loan Amount</Label>
                    <Input 
                      type="number"
                      placeholder="0"
                      value={loanAmount || ''}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Interest Rate (%)</Label>
                    <Input 
                      type="number"
                      step="0.1"
                      placeholder="8.5"
                      value={interestRate || ''}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tenure (Months)</Label>
                    <Input 
                      type="number"
                      placeholder="60"
                      value={tenure || ''}
                      onChange={(e) => setTenure(Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Discount Section */}
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-accent" />
                  Special Discount / Offer
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="enable-discount">Enable Discount</Label>
                  <Switch 
                    id="enable-discount"
                    checked={enableDiscount}
                    onCheckedChange={setEnableDiscount}
                  />
                </div>
              </div>
            </CardHeader>
            {enableDiscount && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountDetails['type'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISCOUNT_TYPES.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Amount (₹)</Label>
                    <Input 
                      type="number"
                      placeholder="0"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Discount Remarks</Label>
                  <Textarea 
                    placeholder="e.g., Valid till end of month, Subject to stock availability"
                    value={discountRemarks}
                    onChange={(e) => setDiscountRemarks(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Any additional terms, conditions, or notes for the customer..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          <Card className="sticky top-6 border-2 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary via-success to-primary/80 text-primary-foreground rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Quote Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Car Info */}
              {(brand || model) && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-semibold text-lg">{brand} {model}</p>
                  {variant && <p className="text-sm text-muted-foreground">{variant}</p>}
                  <div className="flex gap-2 mt-2">
                    {color && <Badge variant="secondary">{color}</Badge>}
                    {city && <Badge variant="outline">{city}</Badge>}
                  </div>
                </div>
              )}
              
              {/* Price Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ex-Showroom</span>
                  <span className="font-medium">{formatPrice(exShowroom)}</span>
                </div>
                {rto > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RTO</span>
                    <span>{formatPrice(rto)}</span>
                  </div>
                )}
                {insurance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Insurance</span>
                    <span>{formatPrice(insurance)}</span>
                  </div>
                )}
                {tcs > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TCS</span>
                    <span>{formatPrice(tcs)}</span>
                  </div>
                )}
                {(fastag + registration + handling) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Other Charges</span>
                    <span>{formatPrice(fastag + registration + handling)}</span>
                  </div>
                )}
                {accessories > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accessories</span>
                    <span>{formatPrice(accessories)}</span>
                  </div>
                )}
                {extendedWarranty > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extended Warranty</span>
                    <span>{formatPrice(extendedWarranty)}</span>
                  </div>
                )}
                {otherCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{otherChargesLabel || 'Other'}</span>
                    <span>{formatPrice(otherCharges)}</span>
                  </div>
                )}
                
                <Separator className="my-2" />
                
                <div className="flex justify-between font-medium">
                  <span>Total On-Road</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                
                {enableDiscount && discountAmount > 0 && (
                  <>
                    <div className="flex justify-between text-accent">
                      <span className="flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        {DISCOUNT_TYPES.find(d => d.value === discountType)?.label}
                      </span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                    <Separator className="my-2" />
                  </>
                )}
                
                <div className="flex justify-between text-lg font-bold text-primary">
                  <span>Final Price</span>
                  <span>{formatPrice(finalPrice)}</span>
                </div>
              </div>
              
              {/* EMI Summary */}
              {showEMI && emi > 0 && (
                <div className="bg-primary/10 rounded-lg p-3 mt-4">
                  <p className="text-xs text-muted-foreground mb-1">Monthly EMI</p>
                  <p className="text-xl font-bold text-primary">
                    {formatPrice(emi)}
                    <span className="text-xs font-normal text-muted-foreground">/month</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    @ {interestRate}% • {tenure} months
                  </p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="space-y-2 pt-4">
                <Button 
                  className="w-full" 
                  onClick={handleGeneratePDF}
                  disabled={!brand || !model || exShowroom <= 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF Quote
                </Button>
                <Button 
                  variant="whatsapp" 
                  className="w-full"
                  onClick={handleShareWhatsApp}
                  disabled={!brand || !model || exShowroom <= 0}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Share via WhatsApp
                </Button>
              </div>
              
              {/* Customer Quick Send */}
              {customerPhone && (
                <p className="text-xs text-center text-muted-foreground">
                  Will send to: +91 {customerPhone}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
