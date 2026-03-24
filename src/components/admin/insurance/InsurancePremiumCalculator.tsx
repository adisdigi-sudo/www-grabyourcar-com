import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calculator, Car, Shield, Percent, IndianRupee, Zap,
  ChevronDown, ChevronUp, Info, CheckCircle2, Copy, Download
} from "lucide-react";
import { toast } from "sonner";

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

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function InsurancePremiumCalculator() {
  // Inputs
  const [idv, setIdv] = useState<string>("");
  const [cc, setCc] = useState<string>("");
  const [city, setCity] = useState<string>("Delhi NCR");
  const [ncb, setNcb] = useState<number>(0);
  const [discount, setDiscount] = useState<string>("0");
  const [addons, setAddons] = useState<Addon[]>(DEFAULT_ADDONS);
  const [customAddonName, setCustomAddonName] = useState("");
  const [customAddonPrice, setCustomAddonPrice] = useState("");
  const [showAddons, setShowAddons] = useState(true);

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

  const copyQuote = () => {
    if (!calc) return;
    const lines = [
      `🚗 Insurance Quote`,
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
    navigator.clipboard.writeText(lines);
    toast.success("Quote copied to clipboard!");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">Premium Calculator</h2>
            <p className="text-xs text-muted-foreground">Auto-calculate OD + TP + Add-ons + GST</p>
          </div>
        </div>
        {calc && (
          <Button size="sm" variant="outline" onClick={copyQuote} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copy Quote
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── LEFT: Inputs ── */}
        <div className="lg:col-span-2 space-y-4">
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
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={idv}
                  onChange={e => setIdv(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Engine CC</Label>
              <Input
                type="number"
                placeholder="e.g. 1199"
                value={cc}
                onChange={e => setCc(e.target.value)}
                className="h-9 text-sm mt-1"
              />
              {ccNum > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  TP: {ccNum < 1000 ? "< 1000cc → ₹2,094" : ccNum <= 1500 ? "1000-1500cc → ₹3,416" : "> 1500cc → ₹7,897"}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">City / RTO Zone</Label>
              <Input
                placeholder="e.g. Delhi NCR, Bangalore, Jaipur"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="h-9 text-sm mt-1"
              />
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
              <Input
                type="number"
                placeholder="0"
                min={0}
                max={100}
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="h-9 text-sm mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Deal-specific discount on OD premium</p>
            </div>

            <div>
              <Label className="text-xs">No Claim Bonus (NCB)</Label>
              <Select value={String(ncb)} onValueChange={v => setNcb(Number(v))}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
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
            <button
              onClick={() => setShowAddons(!showAddons)}
              className="flex items-center gap-2 w-full"
            >
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Add-ons</span>
              <Badge variant="outline" className="ml-1 text-[10px]">
                {addons.filter(a => a.enabled).length} selected
              </Badge>
              <div className="ml-auto">
                {showAddons ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            <AnimatePresence>
              {showAddons && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  {addons.map(addon => (
                    <div key={addon.id} className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                      addon.enabled ? "border-primary/30 bg-primary/5" : "border-border/50"
                    )}>
                      <Switch
                        checked={addon.enabled}
                        onCheckedChange={() => toggleAddon(addon.id)}
                        className="scale-75"
                      />
                      <span className={cn("text-xs flex-1", addon.enabled ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {addon.name}
                      </span>
                      <div className="relative w-20">
                        <IndianRupee className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          type="number"
                          value={addon.price}
                          onChange={e => updateAddonPrice(addon.id, parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs pl-5 pr-1"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Custom add-on */}
                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    <Input
                      placeholder="Add-on name"
                      value={customAddonName}
                      onChange={e => setCustomAddonName(e.target.value)}
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={customAddonPrice}
                      onChange={e => setCustomAddonPrice(e.target.value)}
                      className="h-7 text-xs w-20"
                    />
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
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 sticky top-4"
            >
              {/* Total Hero */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Total Premium</span>
                  <Badge className="bg-primary/20 text-primary border-0 text-[10px]">Incl. 18% GST</Badge>
                </div>
                <div className="text-3xl md:text-4xl font-heading font-black text-foreground">
                  {fmt(calc.total)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Zone {zone} • {ccNum}cc • IDV {fmt(idvNum)}
                </p>
              </div>

              {/* Breakdown */}
              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {/* OD Section */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">Own Damage (OD)</span>
                  </div>
                  <Row label={`Basic OD (${calc.odRate}% of IDV)`} value={fmt(calc.basicOD)} />
                  {discountPct > 0 && (
                    <Row label={`OD Discount (${discountPct}%)`} value={`-${fmt(calc.odDiscount)}`} negative />
                  )}
                  {ncb > 0 && (
                    <Row label={`NCB Discount (${ncb}%)`} value={`-${fmt(calc.ncbDiscount)}`} negative />
                  )}
                  <div className="pt-1 border-t border-dashed border-border/60">
                    <Row label="Net OD Premium" value={fmt(calc.netOD)} bold />
                  </div>
                </div>

                {/* TP Section */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">Third Party (TP)</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">Mandatory</span>
                  </div>
                  <Row label={`TP Premium (${ccNum < 1000 ? "<1000" : ccNum <= 1500 ? "1000-1500" : ">1500"}cc)`} value={fmt(calc.tp)} bold />
                </div>

                {/* Add-ons Section */}
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

                {/* Subtotal & GST */}
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

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-1.5" onClick={copyQuote}>
                  <Copy className="h-3.5 w-3.5" /> Copy Quote
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => {
                  setIdv(""); setCc(""); setDiscount("0"); setNcb(0);
                  setAddons(DEFAULT_ADDONS);
                  toast.info("Calculator reset");
                }}>
                  Reset
                </Button>
              </div>
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
