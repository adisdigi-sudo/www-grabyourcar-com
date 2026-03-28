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
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 14;
    const contentW = pw - 2 * m;

    const green: [number, number, number] = [16, 185, 129];
    const darkGreen: [number, number, number] = [6, 95, 70];
    const lightGreen: [number, number, number] = [236, 253, 245];
    const mint: [number, number, number] = [209, 250, 229];
    const dark: [number, number, number] = [15, 23, 42];
    const gray: [number, number, number] = [100, 116, 139];
    const lightGray: [number, number, number] = [226, 232, 240];
    const white: [number, number, number] = [255, 255, 255];

    const footerH = 22;
    const footerYPos = ph - footerH;
    let y = 0;
    let pageNum = 0;

    const checkPageBreak = (needed: number) => {
      if (y + needed > footerYPos - 6) {
        drawFooter();
        doc.addPage();
        pageNum++;
        drawWatermark();
        y = 16;
      }
    };

    // ── Diagonal watermark ──
    const drawWatermark = () => {
      try {
        const GState = (doc as any).GState;
        if (GState) {
          doc.saveGraphicsState();
          doc.setGState(new GState({ opacity: 0.04 }));
          doc.setTextColor(16, 185, 129);
          doc.setFontSize(60);
          doc.setFont("helvetica", "bold");
          const cx = pw / 2;
          const cy = ph / 2;
          doc.text("GRABYOURCAR", cx, cy, { align: "center", angle: 35 });
          doc.setGState(new GState({ opacity: 1 }));
          doc.restoreGraphicsState();
        }
      } catch {
        // GState not supported — skip watermark
      }
    };

    const drawSectionLabel = (label: string, top: number) => {
      checkPageBreak(12);
      doc.setFillColor(...lightGreen);
      doc.roundedRect(m, top, contentW, 8, 2, 2, "F");
      doc.setTextColor(...darkGreen);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(label, m + 4, top + 5.4);
      return top + 10;
    };

    const drawInfoCard = (x: number, top: number, width: number, title: string, lines: string[], tone: [number, number, number]) => {
      const textLines = lines.flatMap((line) => doc.splitTextToSize(line, width - 10) as string[]);
      const height = Math.max(26, 12 + textLines.length * 4.8);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...lightGray);
      doc.roundedRect(x, top, width, height, 3, 3, "FD");
      doc.setFillColor(...tone);
      doc.roundedRect(x, top, width, 6, 3, 3, "F");
      doc.rect(x, top + 3, width, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...white);
      doc.text(title, x + 4, top + 4.2);
      doc.setTextColor(...dark);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      textLines.forEach((line, index) => {
        doc.text(line, x + 4, top + 11 + index * 4.8);
      });
      return height;
    };

    const drawKeyValueRow = (label: string, value: string, rowY: number, index: number, highlight?: boolean) => {
      const valueLines = doc.splitTextToSize(value || "-", 78) as string[];
      const rowHeight = Math.max(8, 4.5 + valueLines.length * 4.2);
      checkPageBreak(rowHeight);
      const rowFill: [number, number, number] = highlight ? mint : index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(...rowFill);
      doc.rect(m, rowY, contentW, rowHeight, "F");
      doc.setDrawColor(...lightGray);
      doc.line(m, rowY + rowHeight, pw - m, rowY + rowHeight);
      doc.setFont("helvetica", highlight ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...(highlight ? darkGreen : gray));
      doc.text(label, m + 4, rowY + 5.2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text(valueLines, pw - m - 4, rowY + 5.2, { align: "right" });
      return rowHeight;
    };

    const drawFooter = () => {
      const fy = ph - footerH;
      doc.setFillColor(...green);
      doc.rect(0, fy, pw, footerH, "F");
      doc.setFillColor(...darkGreen);
      doc.rect(0, fy, pw, 1.5, "F");
      doc.setFontSize(8);
      doc.setTextColor(...white);
      doc.setFont("helvetica", "bold");
      doc.text("Grabyourcar Insurance Desk", m, fy + 7.5);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Phone: +91 98559 24442  |  Email: hello@grabyourcar.com  |  Web: www.grabyourcar.com", m, fy + 12.5);
      doc.setFontSize(6.5);
      doc.text("MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana - 122001", pw - m, fy + 18, { align: "right" });
    };

    // ── WATERMARK on page 1 ──
    drawWatermark();

    // ── HEADER ──
    doc.setFillColor(...darkGreen);
    doc.rect(0, 0, pw, 38, "F");
    doc.setFillColor(...green);
    doc.rect(0, 30, pw, 8, "F");

    doc.setFontSize(18);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text("GRABYOURCAR", m, 15);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("India's Smarter Way to Buy New Cars", m, 21);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("www.grabyourcar.com", pw - m, 14, { align: "right" });

    y = 46;

    // ── Title ──
    const quoteRef = `GYC-INS-${Date.now().toString().slice(-6)}`;
    doc.setFontSize(15);
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text("Insurance Premium Quote", m, y);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(`Prepared for ${customerName || "Valued Customer"}  --  ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, m, y + 5.5);
    doc.text(`Ref: ${quoteRef}`, pw - m, y + 5.5, { align: "right" });
    y += 12;

    // ── Info Cards ──
    const cardW = (contentW - 4) / 2;
    const leftH = drawInfoCard(m, y, cardW, "CUSTOMER DETAILS", [
      customerName || "Valued Customer",
      customerPhone || "Phone not provided",
      city || "City not captured",
    ], green);
    const rightH = drawInfoCard(m + cardW + 4, y, cardW, "VEHICLE DETAILS", [
      `${vehicleMake} ${vehicleModel}`.trim() || "Vehicle",
      `Reg: ${(vehicleNumber || "-").toUpperCase()}`,
      `Year: ${vehicleYear || "-"}  |  Fuel: Petrol`,
    ], darkGreen);
    y += Math.max(leftH, rightH) + 6;

    // ── Vehicle & Pricing ──
    y = drawSectionLabel("VEHICLE & PRICING DETAILS", y);
    let rowIdx = 0;
    const addRow = (label: string, value: string, highlight?: boolean) => {
      const h = drawKeyValueRow(label, value, y, rowIdx, highlight);
      y += h;
      rowIdx++;
    };

    addRow("IDV (Insured Declared Value)", fmt(idvNum));
    addRow("Engine CC", `${ccNum}cc`);
    addRow("Zone", `${zone} (${city})`);
    y += 3; rowIdx = 0;

    addRow(`Basic OD Premium (${calc.odRate}%)`, fmt(calc.basicOD));
    if (discountPct > 0) addRow(`OD Discount (${discountPct}%)`, `- ${fmt(calc.odDiscount)}`);
    if (ncb > 0) addRow(`NCB Discount (${ncb}%)`, `- ${fmt(calc.ncbDiscount)}`);
    addRow("Net OD Premium", fmt(calc.netOD), true);
    y += 3; rowIdx = 0;

    addRow("Third Party Premium", fmt(calc.tp));

    // ── Add-ons ──
    const enabledAddons = addons.filter(a => a.enabled);
    if (enabledAddons.length > 0) {
      y += 3;
      y = drawSectionLabel("ADD-ONS", y);
      rowIdx = 0;
      enabledAddons.forEach(a => addRow(a.name, fmt(a.price)));
      addRow("Total Add-ons", fmt(calc.addonTotal), true);
    }

    // ── Totals ──
    y += 3; rowIdx = 0;
    addRow("Subtotal", fmt(calc.subtotal));
    addRow("GST (18%)", fmt(calc.gst));

    // ── Total Premium Banner ──
    checkPageBreak(20);
    doc.setFillColor(...darkGreen);
    doc.roundedRect(m, y + 3, contentW, 13, 4, 4, "F");
    doc.setFontSize(9);
    doc.setTextColor(...white);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL PREMIUM PAYABLE", m + 5, y + 10.8);
    doc.setFontSize(13);
    doc.text(fmt(calc.total), pw - m - 5, y + 10.8, { align: "right" });
    y += 21;

    // ── Terms & Conditions ──
    checkPageBreak(60);
    y = drawSectionLabel("TERMS & CONDITIONS", y);
    const tcItems = [
      "This quotation is issued by Grabyourcar (Adis Makethemoney Services Pvt Ltd), a licensed Insurance Broking entity.",
      "This is an indicative premium quotation only. Final premium is subject to insurer underwriting, vehicle inspection, and claim/NCB verification.",
      "The quote is valid for 7 days from the date of issue. Premiums may change post-validity due to rate revisions by the insurer.",
      "Policy issuance is subject to receipt of complete KYC documents, vehicle inspection (if applicable), and full premium payment.",
      "Grabyourcar acts as an insurance broker and does not underwrite risk. All policies are issued by the respective insurance companies.",
      "GST at 18% is applicable on the net premium as per prevailing tax regulations.",
      "NCB (No Claim Bonus) discount is subject to verification of previous policy claims history by the insurer.",
      "Add-on covers are optional and available at additional cost. Coverage details are as per the insurer's policy wordings.",
      "In case of any claim, the policyholder must intimate the insurance company directly as per policy terms.",
      "For grievance redressal, contact Grabyourcar Insurance Desk at +91 98559 24442 or hello@grabyourcar.com.",
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...gray);
    tcItems.forEach((item, i) => {
      const tcLine = `${i + 1}. ${item}`;
      const wrapped = doc.splitTextToSize(tcLine, contentW - 8) as string[];
      const lineH = wrapped.length * 3.2 + 1;
      checkPageBreak(lineH);
      doc.text(wrapped, m + 4, y);
      y += lineH;
    });
    y += 4;

    // ── Important Notes ──
    checkPageBreak(24);
    doc.setFillColor(...lightGreen);
    doc.setDrawColor(...mint);
    const notes = [
      "Grabyourcar (Adis Makethemoney Services Pvt Ltd) is a registered Insurance Broking firm.",
      `Quote validity: 7 days from ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`,
      "All premiums are inclusive of applicable taxes unless stated otherwise.",
    ];
    const noteText = notes.map((n) => `- ${n}`);
    const noteLines = noteText.flatMap((n) => doc.splitTextToSize(n, contentW - 10) as string[]);
    const noteBoxH = Math.max(16, 8 + noteLines.length * 3.6);
    doc.roundedRect(m, y, contentW, noteBoxH, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...darkGreen);
    doc.text("Important Notes", m + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    doc.setFontSize(7);
    doc.text(noteLines, m + 4, y + 9.5);

    // ── Footer ──
    drawFooter();

    return { doc, quoteRef };
  };

  const uploadPdfToStorage = async (doc: any, fileName: string): Promise<string | null> => {
    try {
      const pdfBlob = doc.output("blob");
      const storagePath = `quotes/${new Date().toISOString().slice(0, 10)}/${fileName}`;
      const { error } = await supabase.storage.from("quote-pdfs").upload(storagePath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (error) { console.error("PDF upload error:", error); return null; }
      return storagePath;
    } catch { return null; }
  };

  const saveShareHistory = async (shareMethod: string, pdfPath: string | null, quoteRef: string) => {
    if (!calc) return;
    const netOD = Math.max(0, calc.basicOD - calc.odDiscount - calc.ncbDiscount);
    const netPremium = netOD + calc.tp + calc.addonTotal;
    const gst = Math.round(netPremium * 0.18);

    await supabase.from("quote_share_history" as any).insert({
      customer_name: customerName || "Manual Quote",
      customer_phone: customerPhone || null,
      vehicle_number: vehicleNumber || null,
      vehicle_make: vehicleMake || null,
      vehicle_model: vehicleModel || null,
      vehicle_year: vehicleYear || null,
      insurance_company: "Calculator Quote",
      policy_type: "Comprehensive",
      idv: idvNum,
      total_premium: calc.total,
      premium_breakup: {
        basicOD: Math.round(calc.basicOD),
        odDiscount: Math.round(calc.odDiscount),
        ncbDiscount: Math.round(calc.ncbDiscount),
        netOD: Math.round(calc.netOD),
        tp: Math.round(calc.tp),
        addonTotal: Math.round(calc.addonTotal),
        subtotal: Math.round(calc.subtotal),
        gst: Math.round(calc.gst),
        total: Math.round(calc.total),
      },
      addons: addons.filter(a => a.enabled).map(a => a.name),
      share_method: shareMethod,
      pdf_storage_path: pdfPath,
      quote_ref: quoteRef,
      notes: `Zone: ${zone} | OD Discount: ${discountPct}% | NCB: ${ncb}%`,
    } as any);
  };

  const downloadPDF = async () => {
    const result = generatePDF();
    if (!result) return;
    const { doc, quoteRef } = result;
    const fileName = `Quote_${(customerName || "Customer").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

    // Upload and save history in background
    const pdfPath = await uploadPdfToStorage(doc, fileName);
    await saveShareHistory("pdf_download", pdfPath, quoteRef);
    toast.success("PDF downloaded & saved!");
  };

  const saveAndShareQuote = async (method: "whatsapp" | "pdf_only") => {
    if (!calc) return;
    setIsSaving(true);
    try {
      const result = generatePDF();
      if (!result) throw new Error("Failed to generate PDF");
      const { doc, quoteRef } = result;
      const fileName = `Quote_${(customerName || "Customer").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;

      // Upload PDF to storage
      const pdfPath = await uploadPdfToStorage(doc, fileName);

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

      // Save share history
      await saveShareHistory(method === "whatsapp" ? "whatsapp" : "pdf_download", pdfPath, quoteRef);

      onQuoteSaved?.();

      if (method === "whatsapp") {
        const quoteText = getQuoteText();
        const phone = customerPhone?.replace(/\D/g, "") || "";
        const waPhone = phone.startsWith("91") ? phone : `91${phone}`;
        const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(quoteText)}`;
        window.open(waUrl, "_blank");
        toast.success("Quote saved & WhatsApp opened!");
      } else {
        doc.save(fileName);
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
