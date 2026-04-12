import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateInsuranceQuotePdf } from "@/lib/generateInsuranceQuotePdf";
import { generateBulkQuoteExcel } from "@/lib/generateBulkQuoteExcel";
import { generateRenewalReminderPdf } from "@/lib/generateRenewalReminderPdf";
import {
  Users, Download, RefreshCw, MessageCircle, Zap, Loader2,
  FileSpreadsheet, CheckSquare, Square, Send, User, Car
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { motion } from "framer-motion";

export interface BulkLeadItem {
  id: string;
  customer_name: string | null;
  phone: string | null;
  email?: string | null;
  city?: string | null;
  vehicle_number?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  current_insurer?: string | null;
  policy_expiry_date?: string | null;
  current_policy_type?: string | null;
  ncb_percentage?: number | null;
  current_premium?: number | null;
  pipeline_stage?: string | null;
  policy_number?: string | null;
  premium?: number | null;
  renewal_date?: string | null;
  status?: string | null;
}

interface BulkQuoteSharePanelProps {
  leads: BulkLeadItem[];
  source: "policy_book" | "smart_calling" | "pipeline";
  onDone?: () => void;
}

// The CSV template columns for bulk quote import — pre-filled with DB data
const QUOTE_HEADERS = [
  "customer_name", "phone", "email", "city",
  "vehicle_make", "vehicle_model", "vehicle_number", "vehicle_year",
  "fuel_type", "insurance_company", "policy_type", "idv",
  "basic_od", "od_discount", "ncb_discount", "third_party",
  "secure_premium", "addon_premium", "addons"
];

const RENEWAL_HEADERS = [
  "customer_name", "phone", "email", "city",
  "vehicle_make", "vehicle_model", "vehicle_number", "vehicle_year",
  "current_insurer", "policy_number", "policy_type", "policy_expiry",
  "last_year_premium", "ncb_percentage", "idv", "addons"
];

export function BulkQuoteSharePanel({ leads, source, onDone }: BulkQuoteSharePanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  const selectedLeads = useMemo(() => leads.filter(l => selectedIds.has(l.id)), [leads, selectedIds]);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  }, [leads, selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Download pre-filled sample CSV for quotes
  const downloadPrefilledQuoteCSV = useCallback(() => {
    const target = selectedLeads.length > 0 ? selectedLeads : leads;
    const rows = target.map(l => [
      l.customer_name || "",
      l.phone || "",
      l.email || "",
      l.city || "",
      l.vehicle_make || "",
      l.vehicle_model || "",
      l.vehicle_number || "",
      l.vehicle_year || "",
      "", // fuel_type — to fill
      l.current_insurer || "",
      l.current_policy_type || "",
      "", // idv — to fill
      "", // basic_od — to fill
      "", // od_discount — to fill
      "", // ncb_discount — to fill
      "", // third_party — to fill
      "", // secure_premium — to fill
      "", // addon_premium — to fill
      "", // addons — to fill
    ]);
    const csv = [QUOTE_HEADERS.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quote_template_prefilled_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`📄 Quote template downloaded with ${target.length} pre-filled records. Fill the empty columns and re-upload!`);
  }, [selectedLeads, leads]);

  // Download pre-filled sample CSV for renewals
  const downloadPrefilledRenewalCSV = useCallback(() => {
    const target = selectedLeads.length > 0 ? selectedLeads : leads;
    const rows = target.map(l => {
      const expiry = l.policy_expiry_date || l.renewal_date || "";
      const premium = l.current_premium || l.premium || "";
      return [
        l.customer_name || "",
        l.phone || "",
        l.email || "",
        l.city || "",
        l.vehicle_make || "",
        l.vehicle_model || "",
        l.vehicle_number || "",
        l.vehicle_year || "",
        l.current_insurer || "",
        l.policy_number || "",
        l.current_policy_type || "",
        expiry,
        premium,
        l.ncb_percentage || "",
        "", // idv — to fill
        "", // addons — to fill
      ];
    });
    const csv = [RENEWAL_HEADERS.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `renewal_template_prefilled_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`🔔 Renewal template downloaded with ${target.length} pre-filled records!`);
  }, [selectedLeads, leads]);

  // Bulk generate quote PDFs
  const bulkGenerateQuotes = useCallback(async () => {
    const target = selectedLeads.length > 0 ? selectedLeads : [];
    if (target.length === 0) { toast.error("Select leads first"); return; }
    setSending(true); setProgress(0);
    let count = 0;
    for (const l of target) {
      try {
        generateInsuranceQuotePdf({
          customerName: l.customer_name || "Customer",
          phone: l.phone || "",
          email: l.email || undefined,
          city: l.city || undefined,
          vehicleMake: l.vehicle_make || "N/A",
          vehicleModel: l.vehicle_model || "N/A",
          vehicleNumber: l.vehicle_number || "N/A",
          vehicleYear: l.vehicle_year || new Date().getFullYear(),
          fuelType: "Petrol",
          insuranceCompany: l.current_insurer || "Best Available",
          policyType: l.current_policy_type || "Comprehensive",
          idv: 500000,
          basicOD: 8000, odDiscount: 1500,
          ncbDiscount: Math.round((l.ncb_percentage || 0) * 80),
          thirdParty: 6521, securePremium: 500, addonPremium: 3500,
          addons: ["Zero Depreciation", "Engine Protection", "Roadside Assistance (RSA)"],
        });
        count++;
      } catch (e) { console.error(e); }
      setProgress(Math.round((count / target.length) * 100));
      await new Promise(r => setTimeout(r, 400));
    }
    setSending(false);
    toast.success(`📄 ${count} Quote PDFs generated!`);
    onDone?.();
  }, [selectedLeads, onDone]);

  // Bulk generate renewal PDFs
  const bulkGenerateRenewals = useCallback(async () => {
    const target = selectedLeads.length > 0 ? selectedLeads : [];
    if (target.length === 0) { toast.error("Select leads first"); return; }
    setSending(true); setProgress(0);
    let count = 0;
    for (const l of target) {
      try {
        generateRenewalReminderPdf({
          customerName: l.customer_name || "Customer",
          phone: l.phone || "",
          email: l.email || undefined,
          city: l.city || undefined,
          vehicleMake: l.vehicle_make || "N/A",
          vehicleModel: l.vehicle_model || "N/A",
          vehicleNumber: l.vehicle_number || "N/A",
          vehicleYear: l.vehicle_year || new Date().getFullYear(),
          currentInsurer: l.current_insurer || "N/A",
          policyType: l.current_policy_type || "Comprehensive",
          policyExpiry: l.policy_expiry_date || l.renewal_date || new Date().toISOString(),
          currentPremium: l.current_premium || l.premium || 0,
          ncbPercentage: l.ncb_percentage || 0,
        });
        count++;
      } catch (e) { console.error(e); }
      setProgress(Math.round((count / target.length) * 100));
      await new Promise(r => setTimeout(r, 400));
    }
    setSending(false);
    toast.success(`🔔 ${count} Renewal PDFs generated!`);
    onDone?.();
  }, [selectedLeads, onDone]);

  // Bulk WhatsApp with PDF
  const bulkWhatsApp = useCallback(async () => {
    const target = selectedLeads.filter(l => l.phone && !l.phone.startsWith("IB_"));
    if (target.length === 0) { toast.error("No leads with valid phone numbers"); return; }
    setSending(true); setProgress(0);
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    let sent = 0;
    for (let i = 0; i < target.length; i++) {
      const l = target[i];
      try {
        const daysLeft = l.policy_expiry_date ? differenceInDays(new Date(l.policy_expiry_date), new Date()) :
                         l.renewal_date ? differenceInDays(new Date(l.renewal_date), new Date()) : 0;
        const msg = `Hi ${l.customer_name || ""}! Your insurance renewal is ${daysLeft <= 0 ? "overdue" : `due in ${daysLeft} days`} for ${l.vehicle_make || ""} ${l.vehicle_model || ""} (${l.vehicle_number || ""}).\n\nCurrent Insurer: ${l.current_insurer || "N/A"}\nNCB: ${l.ncb_percentage ?? 0}%\n\nWe have the best renewal offers!\n📞 +91 98559 24442\n🌐 www.grabyourcar.com\n— Grabyourcar Insurance`;

        // Generate PDF silently & upload
        const pdfResult = generateInsuranceQuotePdf({
          customerName: l.customer_name || "Customer",
          phone: l.phone || "",
          vehicleMake: l.vehicle_make || "N/A",
          vehicleModel: l.vehicle_model || "N/A",
          vehicleNumber: l.vehicle_number || "N/A",
          vehicleYear: l.vehicle_year || new Date().getFullYear(),
          fuelType: "Petrol",
          insuranceCompany: l.current_insurer || "Best Available",
          policyType: l.current_policy_type || "Comprehensive",
          idv: 500000, basicOD: 8000, odDiscount: 1500,
          ncbDiscount: Math.round((l.ncb_percentage || 0) * 80),
          thirdParty: 6521, securePremium: 500, addonPremium: 3500,
          addons: ["Zero Depreciation", "Engine Protection", "RSA"],
        }, { skipDownload: true });

        const pdfBlob = pdfResult.doc.output("blob");
        console.log("PDF blob size:", pdfBlob.size, "bytes for", l.customer_name);
        const storagePath = `shares/${Date.now()}_${pdfResult.fileName}`;
        const { error: uploadErr } = await supabase.storage.from("quote-pdfs").upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });
        if (uploadErr) console.error("PDF upload failed:", uploadErr.message, uploadErr);
        const pdfUrl = !uploadErr ? supabase.storage.from("quote-pdfs").getPublicUrl(storagePath).data?.publicUrl : null;
        console.log("PDF URL:", pdfUrl ? "OK" : "MISSING", pdfUrl);

        const vehicleLabel = l.vehicle_number || `${l.vehicle_make || ""} ${l.vehicle_model || ""}`.trim() || "Your Vehicle";
        const premiumStr = `Rs. ${(l.current_premium || l.premium || 0).toLocaleString("en-IN")}`;
        const expiryStr = l.policy_expiry_date || l.renewal_date || "N/A";

        // Step 1: Send approved Meta template (SAFE — Marketing category, approved)
        const result = await sendWhatsApp({
          phone: l.phone || "", message: "", name: l.customer_name || "", logEvent: "bulk_quote", silent: true,
          templateName: "renewal_reminder",
          templateVariables: { var_1: l.customer_name || "Valued Customer", var_2: vehicleLabel, var_3: premiumStr + " | Expiry: " + expiryStr },
          messageType: "template",
        });

        // Step 2: Send PDF as document (FREE — within 24h window opened by template)
        if (result.success && pdfUrl) {
          await new Promise(r => setTimeout(r, 800));
          console.log("Sending PDF document to", l.phone, "URL:", pdfUrl);
          const pdfSendResult = await sendWhatsApp({ phone: l.phone || "", message: `📄 ${l.customer_name || "Customer"} - Insurance Quote`, name: l.customer_name || "", messageType: "document", mediaUrl: pdfUrl, mediaFileName: pdfResult.fileName, silent: true, logEvent: "bulk_quote_pdf" });
          console.log("PDF send result:", pdfSendResult);
        } else {
          console.warn("Skipping PDF send - template success:", result.success, "pdfUrl:", !!pdfUrl);
        }
        if (result.success) sent++;
      } catch (e) { console.error(e); }
      setProgress(Math.round(((i + 1) / target.length) * 100));
      if (i < target.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
    setSending(false);
    toast.success(`📨 Sent ${sent}/${target.length} quotes with PDFs via WhatsApp`);
    onDone?.();
  }, [selectedLeads, onDone]);

  // Bulk WhatsApp API with PDF
  const bulkWhatsAppAPI = useCallback(async () => {
    const target = selectedLeads.filter(l => l.phone && !l.phone.startsWith("IB_"));
    if (target.length === 0) { toast.error("No leads with valid phone numbers"); return; }
    setSending(true); setProgress(0);
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    let sent = 0;
    for (let i = 0; i < target.length; i++) {
      const l = target[i];
      try {
        const daysLeft = l.policy_expiry_date ? differenceInDays(new Date(l.policy_expiry_date), new Date()) :
                         l.renewal_date ? differenceInDays(new Date(l.renewal_date), new Date()) : 0;

        // Generate PDF silently & upload
        const pdfResult = generateRenewalReminderPdf({
          customerName: l.customer_name || "Customer",
          phone: l.phone || "",
          vehicleMake: l.vehicle_make || "N/A",
          vehicleModel: l.vehicle_model || "N/A",
          vehicleNumber: l.vehicle_number || "N/A",
          vehicleYear: l.vehicle_year || new Date().getFullYear(),
          currentInsurer: l.current_insurer || "N/A",
          policyType: l.current_policy_type || "Comprehensive",
          policyExpiry: l.policy_expiry_date || l.renewal_date || new Date().toISOString(),
          currentPremium: l.current_premium || l.premium || 0,
          ncbPercentage: l.ncb_percentage || 0,
        }, { skipDownload: true });

        const pdfBlob = pdfResult.doc.output("blob");
        const storagePath = `shares/${Date.now()}_${pdfResult.fileName}`;
        const { error: uploadErr } = await supabase.storage.from("quote-pdfs").upload(storagePath, pdfBlob, { contentType: "application/pdf", upsert: true });
        const pdfUrl = !uploadErr ? supabase.storage.from("quote-pdfs").getPublicUrl(storagePath).data?.publicUrl : null;

        const vehicleLabel = l.vehicle_number || `${l.vehicle_make || ""} ${l.vehicle_model || ""}`.trim() || "Your Vehicle";
        const premiumStr = `Rs. ${(l.current_premium || l.premium || 0).toLocaleString("en-IN")}`;
        const expiryStr = l.policy_expiry_date || l.renewal_date || "N/A";

        // Step 1: Send approved Meta template (SAFE — Marketing category, approved)
        const result = await sendWhatsApp({
          phone: l.phone || "", message: "", name: l.customer_name || "", logEvent: "bulk_renewal_api", silent: true,
          templateName: "renewal_reminder",
          templateVariables: { var_1: l.customer_name || "Valued Customer", var_2: vehicleLabel, var_3: premiumStr + " | Expiry: " + expiryStr },
          messageType: "template",
        });

        // Step 2: Send PDF as document (FREE — within 24h window opened by template)
        if (result.success && pdfUrl) {
          await new Promise(r => setTimeout(r, 800));
          await sendWhatsApp({ phone: l.phone || "", message: `📄 ${l.customer_name || "Customer"} - Renewal Reminder`, name: l.customer_name || "", messageType: "document", mediaUrl: pdfUrl, mediaFileName: pdfResult.fileName, silent: true, logEvent: "bulk_renewal_pdf" });
        }
        if (result.success) sent++;
      } catch { /* continue */ }
      setProgress(Math.round(((i + 1) / target.length) * 100));
      if (i < target.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
    setSending(false);
    toast.success(`🚀 Sent ${sent}/${target.length} renewal reminders with PDFs via WA API!`);
    onDone?.();
  }, [selectedLeads, onDone]);

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Bulk Quote & Renewal Share</h3>
                <p className="text-xs text-white/80">
                  {selectedIds.size} of {leads.length} selected • Generate, share & send in bulk
                </p>
              </div>
            </div>
            <Button
              variant="outline" size="sm"
              className="h-8 text-xs gap-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={toggleAll}
            >
              {selectedIds.size === leads.length ? <Square className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
              {selectedIds.size === leads.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {/* Pre-filled sample downloads */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 gap-2 flex-col border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              onClick={async () => {
                const target = selectedLeads.length > 0 ? selectedLeads : leads;
                await generateBulkQuoteExcel(target);
                toast.success(`📊 Excel template with ${target.length} records & auto-calc formulas downloaded!`);
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="text-xs font-bold">⬇️ Excel Template ⚡</span>
              <span className="text-[10px] text-muted-foreground">Auto-calc formulas • {selectedIds.size > 0 ? selectedIds.size : leads.length} records</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 gap-2 flex-col border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              onClick={downloadPrefilledQuoteCSV}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="text-xs font-bold">⬇️ Quote CSV</span>
              <span className="text-[10px] text-muted-foreground">Pre-filled with {selectedIds.size > 0 ? selectedIds.size : leads.length} records</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 gap-2 flex-col border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              onClick={downloadPrefilledRenewalCSV}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="text-xs font-bold">⬇️ Renewal CSV</span>
              <span className="text-[10px] text-muted-foreground">Pre-filled with {selectedIds.size > 0 ? selectedIds.size : leads.length} records</span>
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              className="h-auto py-3 gap-2 flex-col bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
              disabled={selectedIds.size === 0 || sending}
              onClick={bulkGenerateQuotes}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="text-xs font-bold">Quotes ({selectedIds.size})</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 gap-2 flex-col border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              disabled={selectedIds.size === 0 || sending}
              onClick={bulkGenerateRenewals}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="text-xs font-bold">Renewals ({selectedIds.size})</span>
            </Button>
            <Button
              className="h-auto py-3 gap-2 flex-col bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg"
              disabled={selectedIds.size === 0 || sending}
              onClick={bulkWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-bold">WhatsApp ({selectedIds.size})</span>
            </Button>
            <Button
              className="h-auto py-3 gap-2 flex-col bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg"
              disabled={selectedIds.size === 0 || sending}
              onClick={bulkWhatsAppAPI}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              <span className="text-xs font-bold">WA API ({selectedIds.size})</span>
            </Button>
          </div>

          {/* Progress */}
          {sending && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-[10px] text-center text-muted-foreground">Processing... {progress}%</p>
            </div>
          )}

          {/* Lead list */}
          <ScrollArea className="max-h-[320px]">
            <div className="space-y-1.5">
              {leads.map(l => {
                const isSelected = selectedIds.has(l.id);
                const expiry = l.policy_expiry_date || l.renewal_date;
                const daysLeft = expiry ? differenceInDays(new Date(expiry), new Date()) : null;
                return (
                  <div
                    key={l.id}
                    className={`flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-sm"
                        : "border-border/30 hover:bg-muted/50 hover:border-border/50"
                    }`}
                    onClick={() => toggle(l.id)}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-foreground">{l.customer_name || "Unknown"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {l.vehicle_make} {l.vehicle_model} • {l.vehicle_number || "No Reg"} • {l.current_insurer || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {daysLeft !== null && (
                        <Badge className={`text-[10px] h-5 border-0 ${
                          daysLeft < 0 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" :
                          daysLeft <= 15 ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        }`}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                        </Badge>
                      )}
                      {l.current_premium || l.premium ? (
                        <span className="text-[10px] font-semibold text-foreground">
                          ₹{((l.current_premium || l.premium || 0) as number).toLocaleString("en-IN")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
