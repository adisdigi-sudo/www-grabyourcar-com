import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Send,
  Loader2,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { generateEMIPdf, EMIData, EMIPDFConfig, DiscountDetails } from "@/lib/generateEMIPdf";
import { useEMIPDFSettings } from "@/hooks/useEMIPDFSettings";
import { supabase } from "@/integrations/supabase/client";

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
  
  // Loan Offer Details
  const [showLoanOffer, setShowLoanOffer] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bookingAmount, setBookingAmount] = useState<number>(0);
  const [processingFees, setProcessingFees] = useState<number>(0);
  const [otherLoanExpenses, setOtherLoanExpenses] = useState<number>(0);
  const [otherLoanExpensesLabel, setOtherLoanExpensesLabel] = useState("");
  
  // Discount
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountDetails['type']>('cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountRemarks, setDiscountRemarks] = useState("");
  
  // Notes
  const [additionalNotes, setAdditionalNotes] = useState("");
  // DB-powered selectors
  const [dbCars, setDbCars] = useState<any[]>([]);
  const [dbColors, setDbColors] = useState<any[]>([]);
  const [selectedCarId, setSelectedCarId] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");

  // Email sending state
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Fetch cars from DB
  useEffect(() => {
    const fetchCars = async () => {
      const { data } = await supabase
        .from("cars")
        .select("id, name, brand, slug, brochure_url, price_range")
        .eq("is_discontinued", false)
        .order("brand");
      if (data) setDbCars(data);
    };
    fetchCars();
  }, []);

  // Fetch colors when car is selected
  useEffect(() => {
    if (!selectedCarId) {
      setDbColors([]);
      return;
    }
    const fetchColors = async () => {
      const { data } = await supabase
        .from("car_colors")
        .select("id, name, hex_code")
        .eq("car_id", selectedCarId)
        .order("sort_order");
      if (data) setDbColors(data);
    };
    fetchColors();
    
    // Set brochure URL
    const car = dbCars.find(c => c.id === selectedCarId);
    if (car) {
      setBrochureUrl(car.brochure_url || "");
      // Auto-fill brand and model
      setBrand(car.brand);
      setModel(car.name.replace(car.brand, "").trim() || car.name);
    }
  }, [selectedCarId, dbCars]);

  // Filter cars by brand
  const carsForBrand = useMemo(() => {
    if (!brand) return dbCars;
    return dbCars.filter(c => c.brand.toLowerCase().includes(brand.toLowerCase()));
  }, [brand, dbCars]);

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

  // Loan offer calculations
  const loanOfferDeductions = bookingAmount + processingFees + otherLoanExpenses;
  const loanOfferFinalAmount = showLoanOffer ? Math.max(finalPrice - loanOfferDeductions, 0) : loanAmount;
  const loanOfferEMI = (() => {
    if (!showLoanOffer || loanOfferFinalAmount <= 0) return 0;
    const r = interestRate / 12 / 100;
    if (r === 0) return Math.round(loanOfferFinalAmount / tenure);
    return Math.round((loanOfferFinalAmount * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1));
  })();
  const loanOfferTotalPayment = loanOfferEMI * tenure;
  const loanOfferTotalInterest = loanOfferTotalPayment - loanOfferFinalAmount;

  const formatPrice = (price: number) => {
    return `₹${Math.round(price).toLocaleString('en-IN')}`;
  };

  const getEMIData = (): EMIData => {
    const carName = `${brand} ${model}`;
    const calculatedEMI = showEMI ? emi : 0;
    const totalPayment = showEMI ? calculatedEMI * tenure : 0;
    const totalInterest = showEMI ? totalPayment - loanAmount : 0;
    
    return {
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
        accessories,
        extendedWarranty,
        otherCharges,
        otherChargesLabel: otherChargesLabel || undefined,
        onRoadPrice: subtotal,
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
  };

  const handleGeneratePDF = async () => {
    if (!brand || !model) {
      toast.error("Please enter car brand and model");
      return;
    }
    try {
      await generateEMIPdf(getEMIData(), pdfConfig || undefined);
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
    
    if (showEMI && emi > 0 && !showLoanOffer) {
      message += `\n💳 *EMI Option:*\n`;
      message += `• Down Payment: ${formatPrice(downPayment)}\n`;
      message += `• Loan Amount: ${formatPrice(loanAmount)}\n`;
      message += `• EMI: ${formatPrice(emi)}/month\n`;
      message += `• Rate: ${interestRate}% | Tenure: ${tenure} months\n`;
    }

    if (showLoanOffer && loanOfferFinalAmount > 0) {
      message += `\n🏦 *Loan Offer${bankName ? ` (${bankName})` : ''}:*\n`;
      message += `• Total Car Price: ${formatPrice(finalPrice)}\n`;
      if (bookingAmount > 0) message += `• Less Booking Amount: -${formatPrice(bookingAmount)}\n`;
      if (processingFees > 0) message += `• Less Processing Fees: -${formatPrice(processingFees)}\n`;
      if (otherLoanExpenses > 0) message += `• Less ${otherLoanExpensesLabel || 'Other Expenses'}: -${formatPrice(otherLoanExpenses)}\n`;
      message += `\n📊 *Final Loan Amount:* ${formatPrice(loanOfferFinalAmount)}\n`;
      message += `• EMI: *${formatPrice(loanOfferEMI)}/month*\n`;
      message += `• Rate: ${interestRate}% p.a. | Tenure: ${tenure} months\n`;
      message += `• Total Payable: ${formatPrice(loanOfferTotalPayment)}\n`;
      message += `• Total Interest: ${formatPrice(loanOfferTotalInterest)}\n`;
    }

    if (brochureUrl) {
      message += `\n📄 *Download Brochure:* ${brochureUrl}\n`;
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

  const handleSendEmail = async () => {
    if (!customerEmail) {
      toast.error("Please enter customer email address");
      return;
    }
    if (!brand || !model) {
      toast.error("Please enter car brand and model");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingEmail(true);
    try {
      const emiData = getEMIData();
      const { data, error } = await supabase.functions.invoke("send-quote", {
        body: {
          clientName: customerName,
          clientEmail: customerEmail,
          clientMobile: customerPhone,
          carName: `${brand} ${model}`,
          variantName: variant || "Standard",
          selectedColor: color || undefined,
          selectedCity: city || undefined,
          onRoadPrice: finalPrice,
          emi: showEMI ? emi : 0,
          downPayment: showEMI ? downPayment : 0,
          loanAmount: showEMI ? loanAmount : 0,
          interestRate: showEMI ? interestRate : 0,
          tenure: showEMI ? tenure : 0,
          totalPayment: showEMI ? emi * tenure : 0,
          totalInterest: showEMI ? (emi * tenure) - loanAmount : 0,
          brochureUrl: brochureUrl || undefined,
          priceBreakup: {
            exShowroom,
            rto,
            insurance,
            tcs,
            fastag,
            registration,
            handling,
          },
          discount: enableDiscount && discountAmount > 0 ? {
            amount: discountAmount,
            type: discountType,
            label: DISCOUNT_TYPES.find(d => d.value === discountType)?.label,
          } : undefined,
        },
      });

      if (error) throw error;
      
      setEmailSent(true);
      toast.success(`Quote sent to ${customerEmail}!`, {
        description: brochureUrl ? "Email includes brochure download link" : undefined,
      });
    } catch (error: any) {
      console.error("Email send error:", error);
      toast.error("Failed to send quote email. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAutoCalculate = () => {
    if (exShowroom > 0) {
      const estimatedRto = Math.round(exShowroom * 0.08);
      const estimatedInsurance = Math.round(exShowroom * 0.035);
      const estimatedTcs = exShowroom > 1000000 ? Math.round(exShowroom * 0.01) : 0;
      const estimatedHandling = 25000;
      const estimatedRegistration = 2500;
      
      setRto(estimatedRto);
      setInsurance(estimatedInsurance);
      setTcs(estimatedTcs);
      setHandling(estimatedHandling);
      setRegistration(estimatedRegistration);
      
      const total = exShowroom + estimatedRto + estimatedInsurance + estimatedTcs + fastag + estimatedHandling + estimatedRegistration;
      const dp = Math.round(total * 0.2);
      const loan = Math.round(total * 0.8);
      setDownPayment(dp);
      setLoanAmount(loan);
      setShowEMI(true);
      
      // Auto-calculate EMI
      const rate = interestRate / 12 / 100;
      const months = tenure;
      if (loan > 0 && rate > 0 && months > 0) {
        const autoEmi = Math.round((loan * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1));
        toast.success(`Estimated values calculated! EMI: Rs. ${autoEmi.toLocaleString('en-IN')}/month`);
      } else {
        toast.success("Estimated values calculated based on ex-showroom price");
      }
    }
  };

  const handleReset = () => {
    setBrand("");
    setModel("");
    setVariant("");
    setColor("");
    setCity("");
    setSelectedCarId("");
    setBrochureUrl("");
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
    setShowLoanOffer(false);
    setBankName("");
    setBookingAmount(0);
    setProcessingFees(0);
    setOtherLoanExpenses(0);
    setOtherLoanExpensesLabel("");
    setEnableDiscount(false);
    setDiscountAmount(0);
    setDiscountRemarks("");
    setAdditionalNotes("");
    setEmailSent(false);
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
            Create custom price quotes, select colors from catalog, and send via Email or WhatsApp
          </p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          Reset Form
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Input Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Car Details - Enhanced with DB Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Car Details
              </CardTitle>
              <CardDescription>
                Select from catalog to auto-fill colors & brochure, or enter manually
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick select from DB */}
              {dbCars.length > 0 && (
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20 space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Quick Select from Catalog
                  </Label>
                  <Select value={selectedCarId} onValueChange={setSelectedCarId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a car from catalog..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dbCars.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.brand} {c.name} {c.price_range ? `(${c.price_range})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {brochureUrl && (
                    <div className="flex items-center gap-2 text-xs text-success">
                      <FileDown className="h-3.5 w-3.5" />
                      <span>Brochure available — will be auto-attached to email</span>
                    </div>
                  )}
                </div>
              )}

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
                  {dbColors.length > 0 ? (
                    <Select value={color} onValueChange={setColor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {dbColors.map(c => (
                          <SelectItem key={c.id} value={c.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full border border-border" 
                                style={{ backgroundColor: c.hex_code }}
                              />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      placeholder="e.g., Pearl White"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  )}
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

              {/* Color swatches */}
              {dbColors.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {dbColors.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setColor(c.name)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        color === c.name 
                          ? "border-primary scale-110 ring-2 ring-primary/30" 
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex_code }}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
              <CardDescription>
                Enter email to send quote directly to the customer
              </CardDescription>
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
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input 
                    type="email"
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
                  <Input type="number" placeholder="0" value={exShowroom || ''} onChange={(e) => setExShowroom(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>RTO Charges</Label>
                  <Input type="number" placeholder="0" value={rto || ''} onChange={(e) => setRto(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Insurance (1 Year)</Label>
                  <Input type="number" placeholder="0" value={insurance || ''} onChange={(e) => setInsurance(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>TCS (1%)</Label>
                  <Input type="number" placeholder="0" value={tcs || ''} onChange={(e) => setTcs(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>FASTag</Label>
                  <Input type="number" placeholder="500" value={fastag || ''} onChange={(e) => setFastag(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Registration</Label>
                  <Input type="number" placeholder="0" value={registration || ''} onChange={(e) => setRegistration(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Handling Charges</Label>
                  <Input type="number" placeholder="0" value={handling || ''} onChange={(e) => setHandling(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Accessories</Label>
                  <Input type="number" placeholder="0" value={accessories || ''} onChange={(e) => setAccessories(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Extended Warranty</Label>
                  <Input type="number" placeholder="0" value={extendedWarranty || ''} onChange={(e) => setExtendedWarranty(Number(e.target.value))} />
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Other Charges Label</Label>
                  <Input placeholder="e.g., Coating, Accessories Kit" value={otherChargesLabel} onChange={(e) => setOtherChargesLabel(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Other Charges Amount</Label>
                  <Input type="number" placeholder="0" value={otherCharges || ''} onChange={(e) => setOtherCharges(Number(e.target.value))} />
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
                  <Switch id="show-emi" checked={showEMI} onCheckedChange={setShowEMI} />
                </div>
              </div>
            </CardHeader>
            {showEMI && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Down Payment</Label>
                    <Input type="number" placeholder="0" value={downPayment || ''} onChange={(e) => setDownPayment(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Loan Amount</Label>
                    <Input type="number" placeholder="0" value={loanAmount || ''} onChange={(e) => setLoanAmount(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Interest Rate (%)</Label>
                    <Input type="number" step="0.1" placeholder="8.5" value={interestRate || ''} onChange={(e) => setInterestRate(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tenure (Months)</Label>
                    <Input type="number" placeholder="60" value={tenure || ''} onChange={(e) => setTenure(Number(e.target.value))} />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Loan Offer Section */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Loan Offer Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-loan-offer">Include Loan Offer</Label>
                  <Switch id="show-loan-offer" checked={showLoanOffer} onCheckedChange={setShowLoanOffer} />
                </div>
              </div>
              <CardDescription>
                Calculate final loan amount after deductions and share complete loan offer
              </CardDescription>
            </CardHeader>
            {showLoanOffer && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bank / NBFC Name</Label>
                    <Input placeholder="e.g., HDFC Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Interest Rate (%)</Label>
                    <Input type="number" step="0.1" placeholder="8.5" value={interestRate || ''} onChange={(e) => setInterestRate(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tenure (Months)</Label>
                    <Input type="number" placeholder="60" value={tenure || ''} onChange={(e) => setTenure(Number(e.target.value))} />
                  </div>
                </div>
                <Separator />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductions from On-Road Price</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Booking Amount</Label>
                    <Input type="number" placeholder="0" value={bookingAmount || ''} onChange={(e) => setBookingAmount(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Processing Fees</Label>
                    <Input type="number" placeholder="0" value={processingFees || ''} onChange={(e) => setProcessingFees(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>{otherLoanExpensesLabel || 'Other Expenses'}</Label>
                    <Input type="number" placeholder="0" value={otherLoanExpenses || ''} onChange={(e) => setOtherLoanExpenses(Number(e.target.value))} />
                  </div>
                </div>
                {otherLoanExpenses > 0 && (
                  <div className="space-y-2">
                    <Label>Other Expenses Label</Label>
                    <Input placeholder="e.g., Insurance Advance, File Charges" value={otherLoanExpensesLabel} onChange={(e) => setOtherLoanExpensesLabel(e.target.value)} />
                  </div>
                )}
                {/* Loan Calculation Preview */}
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-2 text-sm border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Car Price (On-Road)</span>
                    <span className="font-medium">{formatPrice(finalPrice)}</span>
                  </div>
                  {bookingAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Less: Booking Amount</span>
                      <span>-{formatPrice(bookingAmount)}</span>
                    </div>
                  )}
                  {processingFees > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Less: Processing Fees</span>
                      <span>-{formatPrice(processingFees)}</span>
                    </div>
                  )}
                  {otherLoanExpenses > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Less: {otherLoanExpensesLabel || 'Other Expenses'}</span>
                      <span>-{formatPrice(otherLoanExpenses)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-blue-700 dark:text-blue-400 text-base">
                    <span>Final Loan Amount</span>
                    <span>{formatPrice(loanOfferFinalAmount)}</span>
                  </div>
                  {loanOfferEMI > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between font-bold text-primary text-lg">
                        <span>Monthly EMI</span>
                        <span>{formatPrice(loanOfferEMI)}/mo</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>@ {interestRate}% p.a. for {tenure} months</span>
                        <span>Total: {formatPrice(loanOfferTotalPayment)}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            )}
          </Card>


          <Card className="border-accent/30 bg-accent/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-accent" />
                  Special Discount / Offer
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="enable-discount">Enable Discount</Label>
                  <Switch id="enable-discount" checked={enableDiscount} onCheckedChange={setEnableDiscount} />
                </div>
              </div>
            </CardHeader>
            {enableDiscount && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountDetails['type'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DISCOUNT_TYPES.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Amount (₹)</Label>
                    <Input type="number" placeholder="0" value={discountAmount || ''} onChange={(e) => setDiscountAmount(Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Discount Remarks</Label>
                  <Textarea placeholder="e.g., Valid till end of month" value={discountRemarks} onChange={(e) => setDiscountRemarks(e.target.value)} rows={2} />
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
              <Textarea placeholder="Any additional terms, conditions, or notes..." value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} rows={3} />
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
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {color && (
                      <Badge variant="secondary" className="gap-1">
                        <Palette className="h-3 w-3" />
                        {color}
                      </Badge>
                    )}
                    {city && <Badge variant="outline">{city}</Badge>}
                  </div>
                  {brochureUrl && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-success">
                      <FileDown className="h-3 w-3" />
                      Brochure attached
                    </div>
                  )}
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
              
              <Separator />

              {/* Action Buttons - Tabbed */}
              <Tabs defaultValue="download" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="download" className="text-xs gap-1">
                    <Download className="h-3 w-3" />
                    PDF
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" className="text-xs gap-1">
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="email" className="text-xs gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="download" className="mt-3">
                  <Button 
                    className="w-full" 
                    onClick={handleGeneratePDF}
                    disabled={!brand || !model || exShowroom <= 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF Quote
                  </Button>
                </TabsContent>

                <TabsContent value="whatsapp" className="mt-3 space-y-2">
                  <Button 
                    variant="whatsapp" 
                    className="w-full"
                    onClick={handleShareWhatsApp}
                    disabled={!brand || !model || exShowroom <= 0}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {customerPhone ? `Send to +91 ${customerPhone}` : "Share via WhatsApp"}
                  </Button>
                  {!customerPhone && (
                    <p className="text-xs text-muted-foreground text-center">
                      Add customer phone above to send directly
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="email" className="mt-3 space-y-2">
                  {emailSent ? (
                    <div className="text-center py-4 space-y-2">
                      <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
                      <p className="text-sm font-medium">Quote sent to {customerEmail}!</p>
                      {brochureUrl && (
                        <p className="text-xs text-muted-foreground">📄 Brochure link included</p>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setEmailSent(false)}>
                        Send Again
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        className="w-full"
                        onClick={handleSendEmail}
                        disabled={!brand || !model || exShowroom <= 0 || !customerEmail || isSendingEmail}
                      >
                        {isSendingEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Quote via Email
                          </>
                        )}
                      </Button>
                      {!customerEmail && (
                        <p className="text-xs text-muted-foreground text-center">
                          Enter customer email above to enable
                        </p>
                      )}
                      {brochureUrl && customerEmail && (
                        <p className="text-xs text-success text-center flex items-center justify-center gap-1">
                          <FileDown className="h-3 w-3" />
                          Brochure download link will be included
                        </p>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
