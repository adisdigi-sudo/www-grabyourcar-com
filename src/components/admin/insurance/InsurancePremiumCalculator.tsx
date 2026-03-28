import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Calculator, Car, Shield, Percent, IndianRupee, Zap,
  ChevronDown, ChevronUp, Info, Copy, Send, FileText
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

// ── Zone logic ──
const METRO_CITIES = ["delhi", "delhi ncr", "ncr", "new delhi", "noida", "gurgaon", "gurugram", "faridabad", "ghaziabad", "bangalore", "bengaluru"];

function getZone(city: string): "A" | "B" {
  return METRO_CITIES.includes(city.trim().toLowerCase()) ? "A" : "B";
}

// ── OD rate table (% of IDV) ──
const OD_RATES = {
  A: { above1500: 3.440, upto1500: 3.283 },
  B: { above1500: 3.343, upto1500: 3.191 },
};

// ── TP rates (FY 2026) ──
function getTPPremium(cc: number): number {
  if (cc < 1000) return 2094;
  if (cc <= 1500) return 3416;
  return 7897;
}

// ── NCB slabs ──
const NCB_OPTIONS = [
  { label: "0% — New Car / 1st Year", value: 0 },
  { label: "20% — 2nd Year", value: 20 },
  { label: "25% — 3rd Year", value: 25 },
  { label: "35% — 4th Year", value: 35 },
  { label: "45% — 5th Year", value: 45 },
  { label: "50% — 6th Year+", value: 50 },
];

const GST_RATE = 18;

// ── Default add-ons ──
const DEFAULT_ADDONS = [
  { id: "rti", name: "Return to Invoice", price: 1200, enabled: false },
  { id: "engine", name: "Engine Protector", price: 2500, enabled: false },
  { id: "ncb_protect", name: "NCB Protect", price: 800, enabled: false },
  { id: "rsa", name: "24×7 Roadside Assistance", price: 500, enabled: false },
  { id: "consumable", name: "Consumable Cover", price: 1500, enabled: false },
  { id: "key_replace", name: "Key Replacement", price: 600, enabled: false },
  { id: "tyre_cover", name: "Tyre Protect", price: 1000, enabled: false },
  { id: "pa_cover", name: "PA Cover (Owner)", price: 900, enabled: false },
  { id: "zero_dep", name: "Zero Depreciation", price: 3500, enabled: false },
];

type Addon = typeof DEFAULT_ADDONS[number];

const fmt = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

interface Props {
  onQuoteSaved?: () => void;
}

export function InsurancePremiumCalculator({ onQuoteSaved }: Props) {
  const [idv, setIdv] = useState<string>("");
  const [cc, setCc] = useState<string>("");
  const [city, setCity] = useState<string>("Delhi NCR");
  const [ncb, setNcb] = useState<number>(0);
  const [discount, setDiscount] = useState<string>("0");
  const [addons, setAddons] = useState<Addon[]>(DEFAULT_ADDONS);
  const [customAddonName, setCustomAddonName] = useState("");
  const [customAddonPrice, setCustomAddonPrice] = useState("");
  const [showAddons, setShowAddons] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleYear, setVehicleYear] = useState<string>(String(new Date().getFullYear()));
  const [isSaving, setIsSaving] = useState(false);

  const zone = getZone(city);
  const ccNum = parseInt(cc) || 0;
  const idvNum = parseFloat(idv) || 0;
  const discountPct = parseFloat(discount) || 0;

  const calc = useMemo(() => {
    if (!idvNum || !ccNum) return null;

    const ccKey = ccNum > 1500 ? "above1500" : "upto1500";
    const odRate = OD_RATES[zone][ccKey];
    const basicOD = (idvNum * odRate) / 100;
    const odDiscount = (basicOD * discountPct) / 100;
    const odAfterDiscount = basicOD - odDiscount;
    const ncbDiscount = (odAfterDiscount * ncb) / 100;
    const netOD = odAfterDiscount - ncbDiscount;

    const tp = getTPPremium(ccNum);
    const addonTotal = addons.filter(a => a.enabled).reduce((s, a) => s + a.price, 0);
    const subtotal = netOD + tp + addonTotal;
    const gst = (subtotal * GST_RATE) / 100;
    const total = subtotal + gst;

    return { odRate, basicOD, odDiscount, odAfterDiscount, ncbDiscount, netOD, tp, addonTotal, subtotal, gst, total };
  }, [idvNum, ccNum, zone, discountPct, ncb, addons]);

  const toggleAddon = (id: string) => {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const updateAddonPrice = (id: string, price: number) => {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, price } : a));
  };

  const addCustomAddon = () => {
    if (!customAddonName || !customAddonPrice) return;
    const newAddon: Addon = {
      id: `custom_${Date.now()}`,
      name: customAddonName,
      price: parseFloat(customAddonPrice) || 0,
      enabled: true,
    };
    setAddons(prev => [...prev, newAddon]);
    setCustomAddonName("");
    setCustomAddonPrice("");
    toast.success(`Add-on "${newAddon.name}" added`);
  };

  const getQuoteText = () => {
    if (!calc) return "";
    const lines = [
      `🚗 Insurance Quote`,
      customerName ? `Customer: ${customerName}` : null,
      vehicleNumber ? `Vehicle: ${vehicleNumber}` : null,
      `IDV: ${fmt(idvNum)} | CC: ${ccNum} | Zone: ${zone} (${city})`,
      `──────────────────`,
      `Basic OD: ${fmt(calc.basicOD)} (${calc.odRate}%)`,
      discountPct > 0 ? `OD Discount: -${fmt(calc.odDiscount)} (${discountPct}%)` : null,
      ncb > 0 ? `NCB Discount: -${fmt(calc.ncbDiscount)} (${ncb}%)` : null,
      `Net OD Premium: ${fmt(calc.netOD)}`,
      `Third Party: ${fmt(calc.tp)}`,
      calc.addonTotal > 0 ? `Add-ons: ${fmt(calc.addonTotal)}` : null,
      `──────────────────`,
      `Subtotal: ${fmt(calc.subtotal)}`,
      `GST (18%): ${fmt(calc.gst)}`,
      `✅ Total Premium: ${fmt(calc.total)}`,
    ].filter(Boolean).join("\n");
    return lines;
  };

  const copyQuote = () => {
    if (!calc) return;
    navigator.clipboard.writeText(getQuoteText());
    toast.success("Quote copied to clipboard!");
  };

  const generatePDF = () => {
    if (!calc) return null;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageW, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Insurance Premium Quote", 15, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, pageW - 15, 25, { align: "right" });
    doc.text("GrabYourCar Insurance", pageW - 15, 32, { align: "right" });

    y = 52;
    doc.setTextColor(0, 0, 0);

    // Customer Info
    if (customerName || vehicleNumber) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Customer Details", 15, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (customerName) { doc.text(`Name: ${customerName}`, 15, y); y += 6; }
      if (customerPhone) { doc.text(`Phone: ${customerPhone}`, 15, y); y += 6; }
      if (vehicleNumber) { doc.text(`Vehicle: ${vehicleNumber}`, 15, y); y += 6; }
      if (vehicleMake || vehicleModel) { doc.text(`${vehicleMake} ${vehicleModel}`.trim(), 15, y); y += 6; }
      y += 4;
    }

    // Vehicle & Pricing Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Vehicle & Pricing", 15, y);
    y += 8;

    const rows: [string, string][] = [
      ["IDV (Insured Declared Value)", fmt(idvNum)],
      ["Engine CC", `${ccNum}cc`],
      ["Zone", `${zone} (${city})`],
      ["", ""],
      ["Basic OD Premium (" + calc.odRate + "%)", fmt(calc.basicOD)],
    ];
    if (discountPct > 0) rows.push(["OD Discount (" + discountPct + "%)", "-" + fmt(calc.odDiscount)]);
    if (ncb > 0) rows.push(["NCB Discount (" + ncb + "%)", "-" + fmt(calc.ncbDiscount)]);
    rows.push(["Net OD Premium", fmt(calc.netOD)]);
    rows.push(["", ""]);
    rows.push(["Third Party Premium", fmt(calc.tp)]);

    if (calc.addonTotal > 0) {
      rows.push(["", ""]);
      rows.push(["ADD-ONS", ""]);
      addons.filter(a => a.enabled).forEach(a => {
        rows.push(["  " + a.name, fmt(a.price)]);
      });
      rows.push(["Total Add-ons", fmt(calc.addonTotal)]);
    }

    rows.push(["", ""]);
    rows.push(["Subtotal", fmt(calc.subtotal)]);
    rows.push(["GST (18%)", fmt(calc.gst)]);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    rows.forEach(([label, value]) => {
      if (!label && !value) { y += 3; return; }
      if (label === "ADD-ONS") {
        doc.setFont("helvetica", "bold");
        doc.text(label, 15, y);
        doc.setFont("helvetica", "normal");
        y += 6;
        return;
      }
      doc.text(label, 15, y);
      doc.text(value, pageW - 15, y, { align: "right" });
      y += 6;
    });

    // Grand Total
    y += 4;
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(12, y - 5, pageW - 24, 16, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Total Premium", 18, y + 5);
    doc.text(fmt(calc.total), pageW - 18, y + 5, { align: "right" });

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.text("This is a system-generated quote. Final premium may vary based on insurer underwriting.", 15, footerY);
    doc.text("© GrabYourCar Insurance", pageW - 15, footerY, { align: "right" });

    return doc;
  };

  const downloadPDF = () => {
    const doc = generatePDF();
    if (!doc) return;
    const fileName = `Quote_${customerName || "Customer"}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded!");
  };

  const saveAndShareQuote = async (method: "whatsapp" | "pdf_only") => {
    if (!calc) return;
    setIsSaving(true);
    try {
      // Save to bulk_renewal_quotes
      const enabledAddons = addons.filter(a => a.enabled).map(a => a.name);
      const { error } = await supabase.from("bulk_renewal_quotes").insert({
        customer_name: customerName || "Manual Quote",
        phone: customerPhone || null,
        city: city || null,
        vehicle_make: vehicleMake || "Unknown",
        vehicle_model: vehicleModel || "Model",
        vehicle_number: vehicleNumber || null,
        vehicle_year: parseInt(vehicleYear) || new Date().getFullYear(),
        fuel_type: "Petrol",
        insurance_company: "Calculator Quote",
        policy_type: "Comprehensive",
        idv: idvNum,
        basic_od: Math.round(calc.basicOD),
        od_discount: Math.round(calc.odDiscount),
        ncb_discount: Math.round(calc.ncbDiscount),
        third_party: Math.round(calc.tp),
        secure_premium: Math.round(calc.total),
        addon_premium: Math.round(calc.addonTotal),
        addons: enabledAddons,
        status: method === "whatsapp" ? "sent" : "draft",
        batch_label: `Calculator-${new Date().toISOString().slice(0, 10)}`,
        notes: `Zone: ${zone} | OD Discount: ${discountPct}% | NCB: ${ncb}% | GST: ${fmt(calc.gst)}`,
        pdf_generated: true,
        pdf_generated_at: new Date().toISOString(),
        whatsapp_sent: method === "whatsapp",
        whatsapp_sent_at: method === "whatsapp" ? new Date().toISOString() : null,
      });

      if (error) throw error;

      onQuoteSaved?.();

      if (method === "whatsapp") {
        const quoteText = getQuoteText();
        const phone = customerPhone?.replace(/\D/g, "") || "";
        const waPhone = phone.startsWith("91") ? phone : `91${phone}`;
        const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(quoteText)}`;
        window.open(waUrl, "_blank");
        toast.success("Quote saved & WhatsApp opened!");
      } else {
        downloadPDF();
        toast.success("Quote saved & PDF generated!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save quote");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── LEFT: Inputs ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Info */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Customer Info</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">For Quote</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input placeholder="Mobile" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Vehicle No.</Label>
                <Input placeholder="HR26XX1234" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Make</Label>
                <Input placeholder="Maruti" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Model</Label>
                <Input placeholder="Swift" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
            </div>
          </div>

          {/* Vehicle Details Card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Car className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Vehicle Details</span>
              <Badge variant="secondary" className="ml-auto text-[10px]">Zone {zone}</Badge>
            </div>

            <div>
              <Label className="text-xs">IDV (Insured Declared Value)</Label>
              <div className="relative mt-1">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="number" placeholder="e.g. 500000" value={idv} onChange={e => setIdv(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Engine CC</Label>
              <Input type="number" placeholder="e.g. 1199" value={cc} onChange={e => setCc(e.target.value)} className="h-9 text-sm mt-1" />
              {ccNum > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  TP: {ccNum < 1000 ? "< 1000cc → ₹2,094" : ccNum <= 1500 ? "1000-1500cc → ₹3,416" : "> 1500cc → ₹7,897"}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">City / RTO Zone</Label>
              <Input placeholder="e.g. Delhi NCR, Bangalore, Jaipur" value={city} onChange={e => setCity(e.target.value)} className="h-9 text-sm mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {zone === "A" ? "🏙 Metro (Delhi NCR / Bangalore)" : "🌍 Non-Metro"} — OD Rate: {ccNum > 1500 ? OD_RATES[zone].above1500 : OD_RATES[zone].upto1500}%
              </p>
            </div>
          </div>

          {/* Discount & NCB Card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Discount & NCB</span>
            </div>

            <div>
              <Label className="text-xs">OD Discount (%)</Label>
              <Input type="number" placeholder="0" min={0} max={100} value={discount} onChange={e => setDiscount(e.target.value)} className="h-9 text-sm mt-1" />
            </div>

            <div>
              <Label className="text-xs">No Claim Bonus (NCB)</Label>
              <Select value={String(ncb)} onValueChange={v => setNcb(Number(v))}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NCB_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Info className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  NCB is only eligible if no claim was made during the previous policy year.
                </p>
              </div>
            </div>
          </div>

          {/* Add-ons Card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <button onClick={() => setShowAddons(!showAddons)} className="flex items-center gap-2 w-full">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Add-ons</span>
              <Badge variant="outline" className="ml-1 text-[10px]">{addons.filter(a => a.enabled).length} selected</Badge>
              <div className="ml-auto">
                {showAddons ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            <AnimatePresence>
              {showAddons && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
                  {addons.map(addon => (
                    <div key={addon.id} className={cn("flex items-center gap-3 p-2 rounded-lg border transition-colors", addon.enabled ? "border-primary/30 bg-primary/5" : "border-border/50")}>
                      <Switch checked={addon.enabled} onCheckedChange={() => toggleAddon(addon.id)} className="scale-75" />
                      <span className={cn("text-xs flex-1", addon.enabled ? "font-semibold text-foreground" : "text-muted-foreground")}>{addon.name}</span>
                      <div className="relative w-20">
                        <IndianRupee className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input type="number" value={addon.price} onChange={e => updateAddonPrice(addon.id, parseFloat(e.target.value) || 0)} className="h-7 text-xs pl-5 pr-1" />
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    <Input placeholder="Add-on name" value={customAddonName} onChange={e => setCustomAddonName(e.target.value)} className="h-7 text-xs flex-1" />
                    <Input type="number" placeholder="Price" value={customAddonPrice} onChange={e => setCustomAddonPrice(e.target.value)} className="h-7 text-xs w-20" />
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={addCustomAddon}>+</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── RIGHT: Live Quote ── */}
        <div className="lg:col-span-3">
          {!calc ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <Calculator className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Enter IDV & Engine CC</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Premium will auto-calculate</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 sticky top-4">
              {/* Total Hero */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Total Premium</span>
                  <Badge className="bg-primary/20 text-primary border-0 text-[10px]">Incl. 18% GST</Badge>
                </div>
                <div className="text-3xl md:text-4xl font-heading font-black text-foreground">{fmt(calc.total)}</div>
                <p className="text-xs text-muted-foreground mt-1">Zone {zone} • {ccNum}cc • IDV {fmt(idvNum)}</p>
              </div>

              {/* Breakdown */}
              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">Own Damage (OD)</span>
                  </div>
                  <Row label={`Basic OD (${calc.odRate}% of IDV)`} value={fmt(calc.basicOD)} />
                  {discountPct > 0 && <Row label={`OD Discount (${discountPct}%)`} value={`-${fmt(calc.odDiscount)}`} negative />}
                  {ncb > 0 && <Row label={`NCB Discount (${ncb}%)`} value={`-${fmt(calc.ncbDiscount)}`} negative />}
                  <div className="pt-1 border-t border-dashed border-border/60">
                    <Row label="Net OD Premium" value={fmt(calc.netOD)} bold />
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">Third Party (TP)</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">Mandatory</span>
                  </div>
                  <Row label={`TP Premium (${ccNum < 1000 ? "<1000" : ccNum <= 1500 ? "1000-1500" : ">1500"}cc)`} value={fmt(calc.tp)} bold />
                </div>

                {calc.addonTotal > 0 && (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wide">Add-ons</span>
                    </div>
                    {addons.filter(a => a.enabled).map(a => (
                      <Row key={a.id} label={a.name} value={fmt(a.price)} />
                    ))}
                    <div className="pt-1 border-t border-dashed border-border/60">
                      <Row label="Total Add-ons" value={fmt(calc.addonTotal)} bold />
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <Row label="Subtotal" value={fmt(calc.subtotal)} />
                  <Row label="GST (18%)" value={fmt(calc.gst)} />
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">Grand Total</span>
                      <span className="text-lg font-black text-primary">{fmt(calc.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={copyQuote}>
                  <Copy className="h-3.5 w-3.5" /> Copy Quote
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadPDF}>
                  <FileText className="h-3.5 w-3.5" /> Download PDF
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => saveAndShareQuote("whatsapp")} disabled={isSaving}>
                  <Send className="h-3.5 w-3.5" /> Share WhatsApp
                </Button>
                <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => saveAndShareQuote("pdf_only")} disabled={isSaving}>
                  <FileText className="h-3.5 w-3.5" /> Save & PDF
                </Button>
              </div>

              <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => {
                setIdv(""); setCc(""); setDiscount("0"); setNcb(0);
                setAddons(DEFAULT_ADDONS); setCustomerName(""); setCustomerPhone("");
                setVehicleMake(""); setVehicleModel(""); setVehicleNumber("");
                toast.info("Calculator reset");
              }}>
                Reset Calculator
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn("text-xs", bold ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-xs font-mono", bold ? "font-bold text-foreground" : negative ? "text-green-600" : "text-foreground")}>{value}</span>
    </div>
  );
}
