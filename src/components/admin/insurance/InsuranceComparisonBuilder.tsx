import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { INSURANCE_COMPANIES, getShortName } from "@/lib/insuranceCompanies";
import { generateInsuranceComparisonPdf, InsurerQuote, ComparisonPdfData } from "@/lib/generateInsuranceComparisonPdf";
import { persistInsuranceQuoteHistory } from "@/lib/insuranceQuotePersistence";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Download, Send, Copy, FileText,
  IndianRupee, BarChart3, X, Check, ChevronDown, ChevronUp, Shield, Zap
} from "lucide-react";
import { sendWhatsApp } from "@/lib/sendWhatsApp";

// ── Shared constants ──
function getTPPremium(cc: number): number {
  if (cc < 1000) return 2094;
  if (cc <= 1500) return 3416;
  return 7897;
}

const METRO_CITIES = ["delhi", "delhi ncr", "ncr", "new delhi", "noida", "gurgaon", "gurugram", "faridabad", "ghaziabad", "bangalore", "bengaluru"];
function getZone(city: string): "A" | "B" {
  return METRO_CITIES.includes(city.trim().toLowerCase()) ? "A" : "B";
}
const OD_RATES = {
  A: { above1500: 3.440, upto1500: 3.283 },
  B: { above1500: 3.343, upto1500: 3.191 },
};

const fmt = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

const DEFAULT_ADDONS = [
  { id: "zero_dep", name: "Zero Depreciation", price: 3500, enabled: true },
  { id: "engine", name: "Engine Protector", price: 2500, enabled: true },
  { id: "rsa", name: "Roadside Assistance", price: 500, enabled: true },
  { id: "rti", name: "Return to Invoice", price: 1200, enabled: false },
  { id: "ncb_protect", name: "NCB Protect", price: 800, enabled: false },
  { id: "consumable", name: "Consumable Cover", price: 1500, enabled: false },
];

interface InsurerEntry {
  id: string;
  insurer: string;
  customInsurer: string;
  showCustom: boolean;
  odDiscountPct: number;
  securePremium: number;
  customIdv: string; // per-insurer IDV override (empty = use global)
  customNcb: string; // per-insurer NCB override (empty = use global)
  addons: { id: string; name: string; price: number; enabled: boolean }[];
}

interface Props {
  // Pre-filled data from calculator context
  customerName?: string;
  customerPhone?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleNumber?: string;
  vehicleYear?: string | number;
  fuelType?: string;
  cc?: number;
  city?: string;
  policyType?: string;
  idv?: number;
  ncb?: number;
  ncbLocked?: boolean;
  clientId?: string;
  onQuoteSaved?: () => void;
}

function createEntry(insurer = ""): InsurerEntry {
  return {
    id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    insurer,
    customInsurer: "",
    showCustom: false,
    odDiscountPct: 0,
    securePremium: 500,
    addons: DEFAULT_ADDONS.map(a => ({ ...a })),
  };
}

export function InsuranceComparisonBuilder(props: Props) {
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<InsurerEntry[]>([createEntry()]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const ccNum = props.cc || 0;
  const idvNum = props.idv || 0;
  const zone = getZone(props.city || "Delhi NCR");
  const isTP = (props.policyType || "").toLowerCase().includes("third");
  const isStandaloneOD = (props.policyType || "").toLowerCase().includes("standalone");
  const showODFields = !isTP; // OD fields for Comprehensive & Standalone OD
  const showTPInCalc = !isStandaloneOD; // TP for Comprehensive & Third Party Only
  const ncbPct = props.ncbLocked ? 0 : (props.ncb || 0);

  const computeQuote = (entry: InsurerEntry): InsurerQuote | null => {
    if (!ccNum) return null;

    const resolvedInsurer = entry.showCustom ? entry.customInsurer : entry.insurer;
    if (!resolvedInsurer) return null;

    if (isTP) {
      const tp = getTPPremium(ccNum);
      const gst = Math.round(tp * 0.18);
      return {
        insurerName: resolvedInsurer,
        policyType: "Third Party",
        thirdParty: tp,
        subtotal: tp,
        gst,
        total: tp + gst,
      };
    }

    if (!idvNum) return null;
    const ccKey = ccNum > 1500 ? "above1500" : "upto1500";
    const odRate = OD_RATES[zone][ccKey];
    const basicOD = (idvNum * odRate) / 100;
    const odDiscount = (basicOD * entry.odDiscountPct) / 100;
    const odAfterDiscount = basicOD - odDiscount;
    const ncbDiscount = (odAfterDiscount * ncbPct) / 100;
    const netOD = odAfterDiscount - ncbDiscount;
    // Standalone OD: NO Third Party premium (IRDAI rule)
    const tp = isStandaloneOD ? 0 : getTPPremium(ccNum);
    const addonTotal = entry.addons.filter(a => a.enabled).reduce((s, a) => s + a.price, 0);
    const subtotal = netOD + tp + entry.securePremium + addonTotal;
    const gst = Math.round(subtotal * 0.18);

    return {
      insurerName: resolvedInsurer,
      policyType: props.policyType || "Comprehensive",
      idv: idvNum,
      basicOD: Math.round(basicOD),
      odDiscount: Math.round(odDiscount),
      ncbDiscount: Math.round(ncbDiscount),
      netOD: Math.round(netOD),
      thirdParty: tp,
      securePremium: entry.securePremium,
      addonPremium: addonTotal,
      addons: entry.addons.filter(a => a.enabled).map(a => a.name),
      subtotal: Math.round(subtotal),
      gst,
      total: Math.round(subtotal + gst),
    };
  };

  const quotes = useMemo(() => {
    return entries.map(e => computeQuote(e)).filter(Boolean) as InsurerQuote[];
  }, [entries, ccNum, idvNum, zone, isTP, isStandaloneOD, ncbPct]);

  const addEntry = () => {
    if (entries.length >= 3) { toast.info("Maximum 3 insurers for comparison"); return; }
    setEntries(prev => [...prev, createEntry()]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, updates: Partial<InsurerEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const toggleAddon = (entryId: string, addonId: string) => {
    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, addons: e.addons.map(a => a.id === addonId ? { ...a, enabled: !a.enabled } : a) }
        : e
    ));
  };

  const updateAddonPrice = (entryId: string, addonId: string, price: number) => {
    setEntries(prev => prev.map(e =>
      e.id === entryId
        ? { ...e, addons: e.addons.map(a => a.id === addonId ? { ...a, price } : a) }
        : e
    ));
  };

  const handleGenerate = async (action: "download" | "whatsapp") => {
    if (quotes.length < 2) {
      toast.error("Add at least 2 insurer quotes to compare");
      return;
    }

    setIsGenerating(true);
    try {
      const pdfData: ComparisonPdfData = {
        customerName: props.customerName || "Customer",
        phone: props.customerPhone || "",
        vehicleMake: props.vehicleMake || "N/A",
        vehicleModel: props.vehicleModel || "N/A",
        vehicleNumber: props.vehicleNumber || "N/A",
        vehicleYear: props.vehicleYear || new Date().getFullYear(),
        fuelType: props.fuelType || "Petrol",
        cc: ccNum,
        city: props.city,
        quotes,
      };

      const { doc, fileName } = generateInsuranceComparisonPdf(pdfData);

      // Persist with best quote info
      const bestQuote = quotes.reduce((b, q) => q.total < b.total ? q : b, quotes[0]);
      await persistInsuranceQuoteHistory({
        doc,
        fileName,
        shareMethod: action === "whatsapp" ? "whatsapp" : "pdf_download",
        customerName: props.customerName || "Comparison Quote",
        customerPhone: props.customerPhone || null,
        vehicleNumber: props.vehicleNumber || null,
        vehicleMake: props.vehicleMake || null,
        vehicleModel: props.vehicleModel || null,
        vehicleYear: props.vehicleYear ? String(props.vehicleYear) : null,
        insuranceCompany: `Comparison: ${quotes.map(q => q.insurerName).join(" vs ")}`,
        policyType: props.policyType || "Comprehensive",
        idv: idvNum,
        totalPremium: bestQuote.total,
        premiumBreakup: {
          basicOD: bestQuote.basicOD || 0,
          odDiscount: bestQuote.odDiscount || 0,
          ncbDiscount: bestQuote.ncbDiscount || 0,
          netOD: bestQuote.netOD || 0,
          tp: bestQuote.thirdParty,
          securePremium: bestQuote.securePremium || 0,
          addonTotal: bestQuote.addonPremium || 0,
          subtotal: bestQuote.subtotal,
          gst: bestQuote.gst,
          total: bestQuote.total,
        },
        addons: bestQuote.addons || [],
        notes: `Comparison: ${quotes.map(q => `${q.insurerName}: ${fmt(q.total)}`).join(" | ")}`,
        clientId: props.clientId,
        quoteAmount: bestQuote.total,
        quoteInsurer: bestQuote.insurerName,
        ncbPercentage: ncbPct,
        previousClaim: props.ncbLocked || false,
      });

      if (action === "download") {
        doc.save(fileName);
        toast.success("📄 Comparison PDF downloaded & saved!");
      } else {
        doc.save(fileName);
        const savings = Math.max(...quotes.map(q => q.total)) - bestQuote.total;
        const msg = `Hi ${props.customerName || ""}! 🚗\n\nHere's your *Insurance Comparison* from Grabyourcar:\n\n${quotes.map((q, i) => `${i + 1}. ${q.insurerName}: *${fmt(q.total)}*`).join("\n")}\n\n✅ Best Price: *${bestQuote.insurerName}* at *${fmt(bestQuote.total)}*${savings > 0 ? `\n💰 You save ${fmt(savings)}!` : ""}\n\nPDF comparison attached.\n\n— Grabyourcar Insurance Desk\n📞 +91 98559 24442`;
        const result = await sendWhatsApp({
          phone: props.customerPhone || "",
          message: msg,
          name: props.customerName || undefined,
          logEvent: "comparison_builder_share",
        });
        if (!result.success) return;
      }

      queryClient.invalidateQueries({ queryKey: ["client-quote-history"] });
      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      props.onQuoteSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate comparison");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-primary/5 transition-colors"
      >
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Compare Insurers</span>
        <Badge variant="outline" className="text-[10px] ml-1">{entries.length} / 3</Badge>
        {quotes.length >= 2 && (
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] ml-1">
            Ready to compare
          </Badge>
        )}
        <div className="ml-auto">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {entries.map((entry, idx) => {
                const quote = computeQuote(entry);
                return (
                  <div key={entry.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">Insurer {idx + 1}</Badge>
                      <div className="flex-1">
                        {entry.showCustom ? (
                          <div className="flex gap-1">
                            <Input
                              value={entry.customInsurer}
                              onChange={e => updateEntry(entry.id, { customInsurer: e.target.value })}
                              placeholder="Company name"
                              className="h-7 text-xs flex-1"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                              if (entry.customInsurer.trim()) updateEntry(entry.id, { insurer: entry.customInsurer.trim(), showCustom: false });
                            }}><Check className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateEntry(entry.id, { showCustom: false })}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={INSURANCE_COMPANIES.includes(entry.insurer) ? entry.insurer : "__custom__"}
                            onValueChange={v => {
                              if (v === "__add_new__") updateEntry(entry.id, { showCustom: true, customInsurer: "" });
                              else if (v !== "__custom__") updateEntry(entry.id, { insurer: v });
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Select insurer">
                                {entry.insurer ? getShortName(entry.insurer) : "Select insurer"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {!INSURANCE_COMPANIES.includes(entry.insurer) && entry.insurer && (
                                <SelectItem value="__custom__">{entry.insurer}</SelectItem>
                              )}
                              {INSURANCE_COMPANIES.map(ins => (
                                <SelectItem key={ins} value={ins}>{ins}</SelectItem>
                              ))}
                              <SelectItem value="__add_new__">
                                <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Add Custom</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {entries.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeEntry(entry.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {showODFields && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">OD Discount %</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={entry.odDiscountPct}
                            onChange={e => updateEntry(entry.id, { odDiscountPct: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Secure Premium</Label>
                          <Input
                            type="number"
                            value={entry.securePremium}
                            onChange={e => updateEntry(entry.id, { securePremium: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>
                      </div>
                    )}

                    {/* Addons — compact toggle row for non-TP */}
                    {showODFields && (
                      <div className="flex flex-wrap gap-1">
                        {entry.addons.map(addon => (
                          <button
                            key={addon.id}
                            onClick={() => toggleAddon(entry.id, addon.id)}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                              addon.enabled
                                ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                                : "bg-muted border-border text-muted-foreground"
                            )}
                          >
                            {addon.name} ({fmt(addon.price)})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Quote summary */}
                    {quote && (
                      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                        <span className="text-xs text-muted-foreground">Total Premium</span>
                        <span className="text-sm font-bold text-primary">{fmt(quote.total)}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {entries.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 border-dashed text-xs"
                  onClick={addEntry}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Insurer ({entries.length}/3)
                </Button>
              )}

              {/* Comparison summary */}
              {quotes.length >= 2 && (
                <div className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Quick Comparison</span>
                  </div>
                  <div className="space-y-1">
                    {quotes.map((q, i) => {
                      const isBest = q.total === Math.min(...quotes.map(x => x.total));
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className={cn("flex items-center gap-1", isBest && "font-bold text-emerald-700 dark:text-emerald-300")}>
                            {isBest && <Shield className="h-3 w-3" />}
                            {q.insurerName.length > 25 ? q.insurerName.slice(0, 23) + ".." : q.insurerName}
                          </span>
                          <span className={cn("font-mono font-bold", isBest ? "text-emerald-700 dark:text-emerald-300" : "text-foreground")}>
                            {fmt(q.total)}
                          </span>
                        </div>
                      );
                    })}
                    {(() => {
                      const best = Math.min(...quotes.map(q => q.total));
                      const worst = Math.max(...quotes.map(q => q.total));
                      const savings = worst - best;
                      if (savings > 0) return (
                        <div className="pt-1 border-t border-emerald-200 dark:border-emerald-700 mt-1">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            💰 Save {fmt(savings)} with the best option!
                          </span>
                        </div>
                      );
                      return null;
                    })()}
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={quotes.length < 2 || isGenerating}
                  onClick={() => handleGenerate("download")}
                >
                  <Download className="h-3.5 w-3.5" /> Download Comparison
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  disabled={quotes.length < 2 || isGenerating}
                  onClick={() => handleGenerate("whatsapp")}
                >
                  <Send className="h-3.5 w-3.5" /> Share WhatsApp
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
