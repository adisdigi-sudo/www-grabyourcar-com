import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Download, MessageCircle, Mail, Copy, Shield, IndianRupee,
  Plus, Check, X, Car, Percent, Zap, Info, Calculator,
  ChevronDown, ChevronUp
} from "lucide-react";
import { generateInsuranceQuotePdf, InsuranceQuoteData } from "@/lib/generateInsuranceQuotePdf";
import { INSURANCE_COMPANIES, getShortName } from "@/lib/insuranceCompanies";
import { motion, AnimatePresence } from "framer-motion";

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
  { label: "0% — New / 1st Year", value: 0 },
  { label: "20% — 2nd Year", value: 20 },
  { label: "25% — 3rd Year", value: 25 },
  { label: "35% — 4th Year", value: 35 },
  { label: "45% — 5th Year", value: 45 },
  { label: "50% — 6th Year+", value: 50 },
];

const DEFAULT_ADDONS = [
  { id: "zero_dep", name: "Zero Depreciation", price: 3500, enabled: true },
  { id: "engine", name: "Engine Protector", price: 2500, enabled: true },
  { id: "rsa", name: "Roadside Assistance (RSA)", price: 500, enabled: true },
  { id: "rti", name: "Return to Invoice", price: 1200, enabled: false },
  { id: "ncb_protect", name: "NCB Protect", price: 800, enabled: false },
  { id: "consumable", name: "Consumable Cover", price: 1500, enabled: false },
  { id: "key_replace", name: "Key Replacement", price: 600, enabled: false },
  { id: "tyre_cover", name: "Tyre Protect", price: 1000, enabled: false },
  { id: "pa_cover", name: "PA Cover (Owner)", price: 900, enabled: false },
];
type Addon = typeof DEFAULT_ADDONS[number];

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "LPG"];

interface ClientData {
  customer_name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
  vehicle_year: number | null;
  current_insurer: string | null;
  current_policy_type: string | null;
  ncb_percentage: number | null;
  current_premium: number | null;
}

interface PolicyData {
  insurer: string | null;
  idv: number | null;
  ncb_discount: number | null;
  addons: string[] | null;
  policy_type: string | null;
  premium_amount: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData;
  policy?: PolicyData | null;
  onQuoteSent?: () => void;
}

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function InsuranceQuoteModal({ open, onOpenChange, client, policy, onQuoteSent }: Props) {
  // Insurer
  const [showCustomInsurer, setShowCustomInsurer] = useState(false);
  const [customInsurerInput, setCustomInsurerInput] = useState("");
  const [insuranceCompany, setInsuranceCompany] = useState(
    policy?.insurer || client.current_insurer || "ICICI Lombard General Insurance Co Ltd"
  );
  const [policyType, setPolicyType] = useState(
    policy?.policy_type || client.current_policy_type || "comprehensive"
  );
  const [fuelType, setFuelType] = useState("Petrol");

  // Calculator inputs
  const [idv, setIdv] = useState<string>(String(policy?.idv || 500000));
  const [cc, setCc] = useState<string>("1199");
  const [city, setCity] = useState<string>(client.city || "Delhi NCR");
  const [ncb, setNcb] = useState<number>(
    policy?.ncb_discount ? policy.ncb_discount : client.ncb_percentage ? client.ncb_percentage : 0
  );
  const [claimTaken, setClaimTaken] = useState(false);
  const [odDiscountPct, setOdDiscountPct] = useState<string>("0");
  const [addons, setAddons] = useState<Addon[]>(DEFAULT_ADDONS);
  const [securePremium, setSecurePremium] = useState<string>("500");
  const [showAddons, setShowAddons] = useState(true);

  const zone = getZone(city);
  const ccNum = parseInt(cc) || 0;
  const idvNum = parseFloat(idv) || 0;
  const discountPct = parseFloat(odDiscountPct) || 0;
  const securePremiumNum = parseFloat(securePremium) || 0;

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
    const subtotal = netOD + tp + securePremiumNum + addonTotal;
    const gst = Math.round(subtotal * 0.18);
    const total = subtotal + gst;
    return { odRate, basicOD, odDiscount, ncbDiscount, netOD, tp, addonTotal, subtotal, gst, total };
  }, [idvNum, ccNum, zone, discountPct, ncb, addons, securePremiumNum]);

  const toggleAddon = (id: string) => {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };
  const updateAddonPrice = (id: string, price: number) => {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, price } : a));
  };

  const buildQuoteData = (): InsuranceQuoteData | null => {
    if (!calc) return null;
    return {
      customerName: client.customer_name || "Customer",
      phone: client.phone,
      email: client.email || undefined,
      city: client.city || undefined,
      vehicleMake: client.vehicle_make || "N/A",
      vehicleModel: client.vehicle_model || "N/A",
      vehicleNumber: client.vehicle_number || "N/A",
      vehicleYear: client.vehicle_year || new Date().getFullYear(),
      fuelType,
      insuranceCompany,
      policyType,
      idv: idvNum,
      basicOD: Math.round(calc.basicOD),
      odDiscount: Math.round(calc.odDiscount),
      ncbDiscount: Math.round(calc.ncbDiscount),
      thirdParty: calc.tp,
      securePremium: securePremiumNum,
      addonPremium: calc.addonTotal,
      addons: addons.filter(a => a.enabled).map(a => a.name),
      claimTaken,
    };
  };

  const handleDownload = () => {
    const data = buildQuoteData();
    if (!data) { toast.error("Enter IDV & CC first"); return; }
    generateInsuranceQuotePdf(data);
    toast.success("📄 Quote PDF downloaded!");
    onQuoteSent?.();
  };

  const handleWhatsApp = async () => {
    const data = buildQuoteData();
    if (!data || !calc) { toast.error("Enter IDV & CC first"); return; }
    generateInsuranceQuotePdf(data);
    const msg = `Hi ${client.customer_name || ""}! 🚗\n\nHere's your *Motor Insurance Quotation* from Grabyourcar:\n\n🏢 Insurer: ${insuranceCompany}\n🚘 Vehicle: ${client.vehicle_make || ""} ${client.vehicle_model || ""}\n📋 Reg: ${client.vehicle_number || "N/A"}\n💰 IDV: ${fmt(idvNum)}\n\n📊 *Premium Breakup:*\nNet OD: ${fmt(calc.netOD)}\nThird Party: ${fmt(calc.tp)}\nAdd-ons: ${fmt(calc.addonTotal)}\nGST (18%): ${fmt(calc.gst)}\n*Total: ${fmt(calc.total)}*\n\n✅ Coverage: ${addons.filter(a => a.enabled).map(a => a.name).join(", ")}\n\nPlease find the detailed PDF quote attached.\n\n— Grabyourcar Insurance Desk\n📞 +91 98559 24442`;
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: client.phone || "", message: msg, name: client.customer_name, logEvent: "insurance_quote" });
    onQuoteSent?.();
  };

  const handleEmail = () => {
    const data = buildQuoteData();
    if (!data || !calc) { toast.error("Enter IDV & CC first"); return; }
    generateInsuranceQuotePdf(data);
    const subject = `Motor Insurance Quote – ${client.vehicle_make || ""} ${client.vehicle_model || ""} | Grabyourcar`;
    const body = `Dear ${client.customer_name || "Customer"},\n\nInsurer: ${insuranceCompany}\nVehicle: ${client.vehicle_make || ""} ${client.vehicle_model || ""}\nReg: ${client.vehicle_number || "N/A"}\nIDV: ${fmt(idvNum)}\n\nTotal Premium: ${fmt(calc.total)}\n\nRegards,\nGrabyourcar Insurance Desk\n+91 98559 24442`;
    window.open(`mailto:${client.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    toast.success("📧 PDF downloaded & Email opened");
    onQuoteSent?.();
  };

  const handleCopy = () => {
    if (!calc) { toast.error("Enter IDV & CC first"); return; }
    const lines = [
      `🚗 MOTOR INSURANCE QUOTATION`,
      `Customer: ${client.customer_name}`,
      `Vehicle: ${client.vehicle_make} ${client.vehicle_model} | ${client.vehicle_number}`,
      `Insurer: ${insuranceCompany}`,
      `IDV: ${fmt(idvNum)} | CC: ${ccNum} | Zone: ${zone}`,
      `──────────────────`,
      `Basic OD: ${fmt(calc.basicOD)} (${calc.odRate}%)`,
      discountPct > 0 ? `OD Discount: -${fmt(calc.odDiscount)} (${discountPct}%)` : null,
      ncb > 0 ? `NCB Discount: -${fmt(calc.ncbDiscount)} (${ncb}%)` : null,
      `Net OD: ${fmt(calc.netOD)}`,
      `Third Party: ${fmt(calc.tp)}`,
      securePremiumNum > 0 ? `Secure Premium: ${fmt(securePremiumNum)}` : null,
      calc.addonTotal > 0 ? `Add-ons: ${fmt(calc.addonTotal)}` : null,
      `──────────────────`,
      `Subtotal: ${fmt(calc.subtotal)}`,
      `GST (18%): ${fmt(calc.gst)}`,
      `✅ Total Premium: ${fmt(calc.total)}`,
      ``,
      `Coverage: ${addons.filter(a => a.enabled).map(a => a.name).join(", ")}`,
      `— Grabyourcar Insurance Desk | +91 98559 24442`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("📋 Quote copied!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 bg-gradient-to-r from-emerald-500 to-green-600">
          <DialogTitle className="text-white text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" /> Auto Quote Calculator
          </DialogTitle>
          <DialogDescription className="text-emerald-100 text-xs">
            {client.customer_name} • {client.vehicle_make} {client.vehicle_model} • {client.vehicle_number}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(92vh-80px)]">
          <div className="px-6 py-4 space-y-4">
            {/* Row 1: Insurer + Fuel + Policy */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Insurance Company</Label>
                {showCustomInsurer ? (
                  <div className="flex gap-1 mt-1">
                    <Input value={customInsurerInput} onChange={e => setCustomInsurerInput(e.target.value)} placeholder="Company name" className="h-8 text-xs flex-1" autoFocus
                      onKeyDown={e => { if (e.key === "Enter" && customInsurerInput.trim()) { setInsuranceCompany(customInsurerInput.trim()); setShowCustomInsurer(false); } }} />
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { if (customInsurerInput.trim()) setInsuranceCompany(customInsurerInput.trim()); setShowCustomInsurer(false); }}><Check className="h-3.5 w-3.5" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setShowCustomInsurer(false)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : (
                  <Select
                    value={INSURANCE_COMPANIES.includes(insuranceCompany) ? insuranceCompany : "__custom_current__"}
                    onValueChange={v => {
                      if (v === "__add_new__") { setShowCustomInsurer(true); setCustomInsurerInput(""); }
                      else if (v !== "__custom_current__") setInsuranceCompany(v);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue>{getShortName(insuranceCompany)}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {!INSURANCE_COMPANIES.includes(insuranceCompany) && <SelectItem value="__custom_current__">{insuranceCompany}</SelectItem>}
                      {INSURANCE_COMPANIES.map(ins => <SelectItem key={ins} value={ins}>{ins}</SelectItem>)}
                      <SelectItem value="__add_new__"><span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Add Custom</span></SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Fuel Type</Label>
                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Policy Type</Label>
                <Select value={policyType} onValueChange={setPolicyType}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">Comprehensive</SelectItem>
                    <SelectItem value="third_party">Third Party Only</SelectItem>
                    <SelectItem value="standalone_od">Standalone OD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: IDV, CC, City, NCB */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">IDV (₹)</Label>
                <Input type="number" value={idv} onChange={e => setIdv(e.target.value)} className="h-8 text-xs mt-1" placeholder="500000" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Engine CC</Label>
                <Input type="number" value={cc} onChange={e => setCc(e.target.value)} className="h-8 text-xs mt-1" placeholder="1199" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">City / Zone</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} className="h-8 text-xs mt-1" placeholder="Delhi NCR" />
                <p className="text-[9px] text-muted-foreground mt-0.5">Zone {zone} ({zone === "A" ? "Metro" : "Non-Metro"})</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">NCB</Label>
                <Select value={String(ncb)} onValueChange={v => setNcb(Number(v))}>
                  <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{NCB_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* OD Discount + Secure Premium */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">OD Discount (%)</Label>
                <Input type="number" min={0} max={100} value={odDiscountPct} onChange={e => setOdDiscountPct(e.target.value)} className="h-8 text-xs mt-1" placeholder="0" />
                <p className="text-[9px] text-muted-foreground mt-0.5">Deal-specific discount on OD</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Secure Premium (₹)</Label>
                <Input type="number" value={securePremium} onChange={e => setSecurePremium(e.target.value)} className="h-8 text-xs mt-1" placeholder="500" />
              </div>
            </div>

            {/* NCB eligibility note */}
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Info className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                NCB is only eligible if no claim was made during the previous policy year.
              </p>
            </div>

            <Separator />

            {/* Add-ons */}
            <div>
              <button onClick={() => setShowAddons(!showAddons)} className="flex items-center gap-2 w-full">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Coverage Add-ons</span>
                <Badge variant="outline" className="ml-1 text-[10px]">{addons.filter(a => a.enabled).length} selected</Badge>
                <div className="ml-auto">{showAddons ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
              </button>

              <AnimatePresence>
                {showAddons && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1.5 overflow-hidden mt-3">
                    {addons.map(addon => (
                      <div key={addon.id} className={cn(
                        "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                        addon.enabled ? "border-primary/30 bg-primary/5" : "border-border/50"
                      )}>
                        <Switch checked={addon.enabled} onCheckedChange={() => toggleAddon(addon.id)} className="scale-75" />
                        <span className={cn("text-xs flex-1", addon.enabled ? "font-semibold text-foreground" : "text-muted-foreground")}>{addon.name}</span>
                        <div className="relative w-20">
                          <IndianRupee className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input type="number" value={addon.price} onChange={e => updateAddonPrice(addon.id, parseFloat(e.target.value) || 0)} className="h-7 text-xs pl-5 pr-1" />
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* LIVE CALCULATION */}
            {calc ? (
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Auto-Calculated Breakup</span>
                  <Badge className="ml-auto bg-primary/20 text-primary border-0 text-[10px]">Zone {zone} • {calc.odRate}%</Badge>
                </div>

                <PremRow label={`Basic OD (${calc.odRate}% of IDV)`} value={fmt(calc.basicOD)} />
                {discountPct > 0 && <PremRow label={`OD Discount (${discountPct}%)`} value={`-${fmt(calc.odDiscount)}`} negative />}
                {ncb > 0 && <PremRow label={`NCB Discount (${ncb}%)`} value={`-${fmt(calc.ncbDiscount)}`} negative />}
                <div className="border-t border-dashed border-border/60 pt-1">
                  <PremRow label="Net OD Premium" value={fmt(calc.netOD)} bold />
                </div>
                <PremRow label={`Third Party (${ccNum < 1000 ? "<1000" : ccNum <= 1500 ? "1000-1500" : ">1500"}cc)`} value={fmt(calc.tp)} />
                {securePremiumNum > 0 && <PremRow label="Secure Premium" value={fmt(securePremiumNum)} />}
                {calc.addonTotal > 0 && <PremRow label={`Add-ons (${addons.filter(a => a.enabled).length})`} value={fmt(calc.addonTotal)} />}

                <div className="border-t border-border pt-1">
                  <PremRow label="Net Premium" value={fmt(calc.subtotal)} />
                  <PremRow label="GST (18%)" value={fmt(calc.gst)} />
                </div>

                <div className="border-t-2 border-primary/30 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground">Total Premium Payable</span>
                    <span className="text-xl font-black text-primary">{fmt(calc.total)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
                <Calculator className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Enter IDV & Engine CC to auto-calculate premium</p>
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pb-2">
              <Button onClick={handleDownload} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-10" disabled={!calc}>
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button onClick={handleWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700 text-white h-10" disabled={!calc}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
              <Button onClick={handleEmail} variant="outline" className="gap-2 h-10" disabled={!calc}>
                <Mail className="h-4 w-4" /> Send Email
              </Button>
              <Button onClick={handleCopy} variant="outline" className="gap-2 h-10" disabled={!calc}>
                <Copy className="h-4 w-4" /> Copy Quote
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function PremRow({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn("text-xs", bold ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-xs font-mono", bold ? "font-bold text-foreground" : negative ? "text-green-600" : "text-foreground")}>{value}</span>
    </div>
  );
}
