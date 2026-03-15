import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useMemo, useRef } from "react";
import {
  RefreshCw, AlertTriangle, Clock, CheckCircle2, XCircle,
  Bell, Calendar, Phone, Loader2, Zap, MessageSquare,
  Share2, Mail, Search, TrendingUp, Star, PhoneCall, FileSpreadsheet as FileSpreadsheetIcon,
  Megaphone, Send, Upload, FileText
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, differenceInDays } from "date-fns";
import { InsuranceBulkQuoteImport } from "./InsuranceBulkQuoteImport";

// === TEMPLATES ===
function buildRenewalNotice(p: any): string {
  const c = p.insurance_clients;
  const customerName = c?.customer_name || "Valued Customer";
  const vehicleModel = c?.vehicle_model || c?.vehicle_make || "your vehicle";
  const vehicleNumber = c?.vehicle_number || "";
  const vehicleNumberLine = vehicleNumber ? ` (${vehicleNumber})` : "";
  const expiryDate = p.expiry_date ? format(new Date(p.expiry_date), "dd MMM yyyy") : "soon";
  const daysRemaining = p.daysLeft != null ? (p.daysLeft <= 0 ? 0 : p.daysLeft) : 0;
  const policyNumber = p.policy_number || "";
  const insurer = p.insurer || c?.current_insurer || "";
  const premium = p.premium_amount || c?.current_premium || "";

  let policySection = "";
  if (policyNumber || insurer || premium || vehicleNumber) {
    policySection = "\n📋 *Your Policy Details:*\n";
    if (policyNumber) policySection += `📄 Policy: ${policyNumber}\n`;
    if (insurer) policySection += `🏢 Insurer: ${insurer}\n`;
    if (premium) policySection += `💰 Premium: ₹${Number(premium).toLocaleString("en-IN")}\n`;
    if (vehicleNumber) policySection += `🚗 Vehicle: ${vehicleNumber}\n`;
  }

  return `🚗 *Grabyourcar Policy Renewal Reminder*
━━━━━━━━━━━━━━━━━━━━━

Hello *${customerName}*,

We hope you are enjoying a smooth and safe drive!

This is a friendly reminder from *Grabyourcar Insurance Desk* that your *${vehicleModel}*${vehicleNumberLine} insurance policy is set to expire on *${expiryDate}* — just *${daysRemaining} days* to go.

Renewing your policy before the expiry helps you:

✅ Avoid inspection hassles
✅ Maintain your No Claim Bonus
✅ Stay financially protected
✅ Ensure uninterrupted coverage

Our team has already prepared renewal assistance for you to make the process quick and seamless.

👉 Simply *reply to this message* or click below to get your renewal quote instantly.

🔗 Renew Now: https://www.grabyourcar.com/insurance
${policySection}
If you need any help, feel free to contact your dedicated advisor.

📞 +91 98559 24442
🌐 www.grabyourcar.com

Thank you for trusting *Grabyourcar* — we look forward to protecting your journeys ahead.

Drive safe! 🚘`.replace(/\n{3,}/g, "\n\n");
}

function buildRenewalQuote(p: any): string {
  const c = p.insurance_clients;
  const customerName = c?.customer_name || "Valued Customer";
  const vehicleModel = c?.vehicle_model || c?.vehicle_make || "your vehicle";
  const vehicleNumber = c?.vehicle_number || "";
  const expiryDate = p.expiry_date ? format(new Date(p.expiry_date), "dd MMM yyyy") : "soon";
  const policyNumber = p.policy_number || "";
  const insurer = p.insurer || c?.current_insurer || "";
  const premium = p.premium_amount || c?.current_premium || "";

  return `🚗 *Grabyourcar — Renewal Quote*
━━━━━━━━━━━━━━━━━━━━━

Dear *${customerName}*,

Your renewal quote for *${vehicleModel}*${vehicleNumber ? ` (${vehicleNumber})` : ""} is ready!

📋 *Quote Details:*
${policyNumber ? `📄 Policy: ${policyNumber}\n` : ""}${insurer ? `🏢 Current Insurer: ${insurer}\n` : ""}${premium ? `💰 Renewal Premium: ₹${Number(premium).toLocaleString("en-IN")}\n` : ""}📅 Current Expiry: ${expiryDate}

🎁 *Renewal Benefits:*
✅ NCB (No Claim Bonus) Protection
✅ Roadside Assistance Included
✅ Zero Depreciation Option
✅ Instant Policy Issuance
✅ Hassle-free Claim Settlement

💡 *Why renew with Grabyourcar?*
• Best rates from 15+ insurers
• Dedicated advisor support
• Instant digital policy copy
• Free claim assistance

👉 *Reply YES* to confirm your renewal or call us now.

📞 +91 98559 24442
🌐 www.grabyourcar.com

— *Grabyourcar Insurance Desk* 🚘`.replace(/\n{3,}/g, "\n\n");
}

// === MAIN COMPONENT ===
export function InsuranceRenewalsEngine() {
  const [windowFilter, setWindowFilter] = useState("all");
  const [runningEngine, setRunningEngine] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [bulkSendingWA, setBulkSendingWA] = useState(false);
  const [bulkSendingEmail, setBulkSendingEmail] = useState(false);
  const [previewPolicy, setPreviewPolicy] = useState<any>(null);
  const [sendingPreview, setSendingPreview] = useState(false);
  const [templateType, setTemplateType] = useState<"notice" | "quote">("notice");
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["ins-renewals-engine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("*, insurance_clients(id, customer_name, phone, email, vehicle_number, vehicle_model, vehicle_make, city, current_insurer, current_policy_number, current_premium)")
        .eq("status", "active")
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const now = useMemo(() => new Date(), []);

  const enriched = useMemo(() => {
    if (!policies) return [];
    return policies.map((p: any) => {
      const daysLeft = p.expiry_date ? differenceInDays(new Date(p.expiry_date), now) : null;
      let urgency = "safe";
      if (daysLeft === null) urgency = "unknown";
      else if (daysLeft <= 0) urgency = "expired";
      else if (daysLeft <= 7) urgency = "critical";
      else if (daysLeft <= 15) urgency = "urgent";
      else if (daysLeft <= 30) urgency = "warning";
      else if (daysLeft <= 60) urgency = "upcoming";

      const premium = Number(p.premium_amount || 0);
      let priorityScore = 0;
      if (premium >= 50000) priorityScore += 3;
      else if (premium >= 20000) priorityScore += 2;
      else if (premium >= 10000) priorityScore += 1;
      if (daysLeft !== null && daysLeft <= 7 && daysLeft >= 0) priorityScore += 3;
      else if (daysLeft !== null && daysLeft <= 15) priorityScore += 2;
      else if (daysLeft !== null && daysLeft <= 30) priorityScore += 1;

      return { ...p, daysLeft, urgency, priorityScore };
    });
  }, [policies, now]);

  const filtered = useMemo(() => {
    let result = windowFilter === "all" ? enriched : enriched.filter((p) => {
      if (windowFilter === "expired") return p.urgency === "expired";
      if (windowFilter === "7") return p.daysLeft !== null && p.daysLeft > 0 && p.daysLeft <= 7;
      if (windowFilter === "15") return p.daysLeft !== null && p.daysLeft > 0 && p.daysLeft <= 15;
      if (windowFilter === "30") return p.daysLeft !== null && p.daysLeft > 0 && p.daysLeft <= 30;
      if (windowFilter === "60") return p.daysLeft !== null && p.daysLeft > 0 && p.daysLeft <= 60;
      if (windowFilter === "high_value") return Number(p.premium_amount || 0) >= 20000;
      return true;
    });

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        p.insurance_clients?.customer_name?.toLowerCase().includes(s) ||
        p.insurance_clients?.phone?.includes(s) ||
        p.insurance_clients?.vehicle_number?.toLowerCase().includes(s) ||
        p.policy_number?.toLowerCase().includes(s)
      );
    }

    return result.sort((a, b) => b.priorityScore - a.priorityScore);
  }, [enriched, windowFilter, search]);

  const summary = useMemo(() => ({
    expired: enriched.filter(p => p.urgency === "expired").length,
    critical: enriched.filter(p => p.urgency === "critical").length,
    urgent: enriched.filter(p => p.urgency === "urgent").length,
    warning: enriched.filter(p => p.urgency === "warning").length,
    upcoming: enriched.filter(p => p.urgency === "upcoming").length,
    highValue: enriched.filter(p => Number(p.premium_amount || 0) >= 20000).length,
    totalPremium: enriched.reduce((s, p) => s + Number(p.premium_amount || 0), 0),
  }), [enriched]);

  const URGENCY_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
    expired: { bg: "bg-destructive/10", text: "text-destructive", icon: XCircle },
    critical: { bg: "bg-destructive/5", text: "text-destructive", icon: AlertTriangle },
    urgent: { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-700 dark:text-orange-400", icon: Clock },
    warning: { bg: "bg-yellow-50 dark:bg-yellow-950/20", text: "text-yellow-700 dark:text-yellow-400", icon: Bell },
    upcoming: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", icon: Calendar },
    safe: { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-700 dark:text-green-400", icon: CheckCircle2 },
    unknown: { bg: "bg-muted/30", text: "text-muted-foreground", icon: Clock },
  };

  const runRenewalEngine = async () => {
    setRunningEngine(true);
    try {
      const { data, error } = await supabase.functions.invoke("insurance-renewal-engine", {
        body: { action: "all" },
      });
      if (error) throw error;
      toast.success(`Engine complete: ${data.triggered} reminders, ${data.tasks_created} tasks, ${data.recovered} recoveries`);
      queryClient.invalidateQueries({ queryKey: ["ins-renewals-engine"] });
    } catch (e: any) {
      toast.error(e.message || "Engine failed");
    } finally {
      setRunningEngine(false);
    }
  };

  const getPreviewMessage = (p: any, type: "notice" | "quote") => {
    return type === "notice" ? buildRenewalNotice(p) : buildRenewalQuote(p);
  };

  const showRenewalPreview = (p: any, type: "notice" | "quote" = "notice") => {
    const client = p.insurance_clients;
    if (!client?.phone || client.phone.startsWith("IB_")) { toast.error("No valid phone number"); return; }
    setTemplateType(type);
    setPreviewPolicy(p);
  };

  const confirmSendRenewal = async () => {
    if (!previewPolicy) return;
    setSendingPreview(true);
    const client = previewPolicy.insurance_clients;
    try {
      const { data, error } = await supabase.functions.invoke("insurance-renewal-engine", {
        body: { action: "send_single", client_id: client.id, policy_id: previewPolicy.id },
      });
      if (error) throw error;
      toast.success(`✅ Renewal reminder sent to ${client.customer_name || client.phone}`);
      setPreviewPolicy(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSendingPreview(false);
    }
  };

  const sendDirectWhatsApp = (p: any, type: "notice" | "quote" = "notice") => {
    const client = p.insurance_clients;
    if (!client?.phone || client.phone.startsWith("IB_")) { toast.error("No phone number"); return; }
    const message = getPreviewMessage(p, type);
    const phone = client.phone.replace(/\D/g, "");
    const fullPhone = phone.startsWith("91") ? phone : `91${phone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`, "_blank");
    toast.success(`WhatsApp opened for ${client.customer_name || client.phone}`);
  };

  const sendRenewalEmail = (p: any) => {
    const client = p.insurance_clients;
    if (!client?.email) { toast.error("No email address"); return; }
    const subject = encodeURIComponent(`🚗 Renew Your Motor Insurance — ${client.customer_name || "Customer"}`);
    const body = encodeURIComponent(
      `Dear ${client.customer_name || "Valued Customer"},\n\nThis is a friendly reminder from Grabyourcar Insurance Desk.\n\nYour ${p.insurer || "motor insurance"} policy${p.policy_number ? ` (${p.policy_number})` : ""} for vehicle ${client.vehicle_number || ""} is${p.expiry_date ? ` set to expire on ${format(new Date(p.expiry_date), "dd MMM yyyy")}` : " due for renewal"}.\n\nRenewing on time helps you:\n✅ Avoid inspection hassles\n✅ Maintain No Claim Bonus\n✅ Stay financially protected\n\nReply to this email or call us at +91 98559 24442 for the best renewal quote.\n\nBest regards,\nGrabyourcar Insurance\nwww.grabyourcar.com`
    );
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, "_blank");
    toast.success(`📧 Email opened for ${client.customer_name || client.email}`);
  };

  const bulkSendWhatsApp = async () => {
    const eligible = filtered.filter(p => {
      const phone = p.insurance_clients?.phone;
      return phone && !phone.startsWith("IB_");
    });
    if (eligible.length === 0) { toast.error("No clients with valid phone numbers"); return; }
    setBulkSendingWA(true);
    let sent = 0;
    const toastId = toast.loading(`Sending WhatsApp reminders... 0/${eligible.length}`);
    for (const p of eligible) {
      try {
        const { error } = await supabase.functions.invoke("insurance-renewal-engine", {
          body: { action: "send_single", client_id: p.insurance_clients.id, policy_id: p.id },
        });
        if (!error) sent++;
        toast.loading(`Sending... ${sent}/${eligible.length}`, { id: toastId });
      } catch { /* continue */ }
      await new Promise(r => setTimeout(r, 500));
    }
    toast.success(`✅ Sent ${sent}/${eligible.length} WhatsApp renewal reminders!`, { id: toastId });
    setBulkSendingWA(false);
  };

  const bulkSendEmail = async () => {
    const eligible = filtered.filter(p => p.insurance_clients?.email);
    if (eligible.length === 0) { toast.error("No clients with email addresses"); return; }
    setBulkSendingEmail(true);
    let sent = 0;
    const toastId = toast.loading(`Opening emails... 0/${eligible.length}`);
    for (const p of eligible) {
      sendRenewalEmail(p);
      sent++;
      toast.loading(`Opening emails... ${sent}/${eligible.length}`, { id: toastId });
      await new Promise(r => setTimeout(r, 200));
    }
    toast.success(`✅ Opened ${sent} email drafts!`, { id: toastId });
    setBulkSendingEmail(false);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
      const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("customer"));
      const expiryIdx = headers.findIndex(h => h.includes("expiry") || h.includes("renewal") || h.includes("date"));

      if (phoneIdx === -1) { toast.error("CSV must have a phone/mobile column"); return; }

      let sent = 0;
      const toastId = toast.loading(`Processing CSV... 0/${lines.length - 1}`);
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        const phone = cols[phoneIdx]?.replace(/\D/g, "");
        if (!phone || phone.length < 10) continue;
        const fullPhone = phone.startsWith("91") ? phone : `91${phone}`;
        const name = nameIdx >= 0 ? cols[nameIdx] : "Valued Customer";
        const expiry = expiryIdx >= 0 ? cols[expiryIdx] : "";

        const message = `🚗 *Grabyourcar Policy Renewal Reminder*\n━━━━━━━━━━━━━━━━━━━━━\n\nHello *${name}*,\n\nThis is a friendly reminder from *Grabyourcar Insurance Desk* that your motor insurance policy is${expiry ? ` set to expire on *${expiry}*` : " due for renewal"}.\n\nRenewing your policy before the expiry helps you:\n\n✅ Avoid inspection hassles\n✅ Maintain your No Claim Bonus\n✅ Stay financially protected\n✅ Ensure uninterrupted coverage\n\n👉 Simply *reply to this message* or click below to renew.\n\n🔗 https://www.grabyourcar.com/insurance\n\n📞 +91 98559 24442\n🌐 www.grabyourcar.com\n\nDrive safe! 🚘`;

        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ to: fullPhone, message }),
            }
          );
          sent++;
        } catch { /* continue */ }
        toast.loading(`Processing... ${sent}/${lines.length - 1}`, { id: toastId });
        await new Promise(r => setTimeout(r, 500));
      }
      toast.success(`✅ Bulk upload complete! Sent ${sent} reminders.`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setBulkUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sharePolicy = (p: any) => {
    const c = p.insurance_clients;
    const text = `📋 Renewal Alert\n━━━━━━━━━━━━━━━━\n👤 ${c?.customer_name || "—"}\n📄 Policy: ${p.policy_number || "N/A"}\n🏢 ${p.insurer || "—"}\n🚗 ${c?.vehicle_number || "—"}\n💰 Premium: ₹${Number(p.premium_amount || 0).toLocaleString("en-IN")}\n📅 Expiry: ${p.expiry_date ? format(new Date(p.expiry_date), "dd MMM yyyy") : "N/A"}\n⏳ ${p.daysLeft !== null ? (p.daysLeft <= 0 ? `Expired ${Math.abs(p.daysLeft)}d ago` : `${p.daysLeft} days left`) : "N/A"}\n\n— Grabyourcar Insurance`;
    if (navigator.share) {
      navigator.share({ title: `Renewal - ${c?.customer_name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied!");
    }
  };

  const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" /> Renewal Conversion Engine
            </h2>
            <p className="text-sm text-muted-foreground">
              {enriched.length} active policies • ₹{(summary.totalPremium / 100000).toFixed(1)}L total premium
            </p>
          </div>
          <Button onClick={runRenewalEngine} disabled={runningEngine} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            {runningEngine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {runningEngine ? "Running..." : "Run Auto-Reminders"}
          </Button>
        </div>

        {/* Bulk Actions Bar */}
        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-300 mr-auto">
            <Megaphone className="h-4 w-4" />
            <span>Bulk Remind ({filtered.length} shown)</span>
          </div>
          <Button
            size="sm"
            onClick={bulkSendWhatsApp}
            disabled={bulkSendingWA || filtered.length === 0}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {bulkSendingWA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
            {bulkSendingWA ? "Sending..." : "WhatsApp All"}
          </Button>
          <Button
            size="sm"
            onClick={bulkSendEmail}
            disabled={bulkSendingEmail || filtered.length === 0}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {bulkSendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            {bulkSendingEmail ? "Opening..." : "Email All"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={bulkUploading}
            className="gap-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
          >
            {bulkUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {bulkUploading ? "Uploading..." : "Bulk Upload CSV"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          <InsuranceBulkQuoteImport />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {[
          { label: "Expired", count: summary.expired, color: "text-destructive", bg: "bg-destructive/10", filter: "expired" },
          { label: "≤ 7 Days", count: summary.critical, color: "text-destructive", bg: "bg-destructive/5", filter: "7" },
          { label: "≤ 15 Days", count: summary.urgent, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20", filter: "15" },
          { label: "≤ 30 Days", count: summary.warning, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/20", filter: "30" },
          { label: "≤ 60 Days", count: summary.upcoming, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20", filter: "60" },
          { label: "High Value", count: summary.highValue, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20", filter: "high_value" },
          { label: "All Active", count: enriched.length, color: "text-foreground", bg: "bg-muted/50", filter: "all" },
        ].map(s => (
          <Card
            key={s.label}
            className={`cursor-pointer hover:shadow-md transition-all ${windowFilter === s.filter ? "ring-2 ring-emerald-500" : ""}`}
            onClick={() => setWindowFilter(windowFilter === s.filter ? "all" : s.filter)}
          >
            <CardContent className="pt-3 pb-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, phone, policy, vehicle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
      </div>

      {/* Renewals List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Renewal Pipeline — {filtered.length} policies
          </CardTitle>
          <CardDescription className="text-xs">Sorted by priority score (high premium + urgency)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No policies in this window</p>
          ) : (
            <div className="divide-y">
              {filtered.map((p: any) => {
                const style = URGENCY_STYLES[p.urgency] || URGENCY_STYLES.unknown;
                const Icon = style.icon;
                const client = p.insurance_clients;
                const phone = displayPhone(client?.phone);
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedPolicy(p)}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                        <Icon className={`h-4 w-4 ${style.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{client?.customer_name || "—"}</p>
                          {p.priorityScore >= 4 && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="font-mono">{p.policy_number || "—"}</span>
                          <span>{p.insurer || "—"}</span>
                          {client?.vehicle_number && <span>{client.vehicle_number}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right hidden sm:block">
                        <Badge className={`${style.bg} ${style.text} border-0 text-[10px]`}>
                          {p.daysLeft !== null ? (p.daysLeft <= 0 ? `Expired ${Math.abs(p.daysLeft)}d` : `${p.daysLeft}d left`) : "—"}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          ₹{Number(p.premium_amount || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      {phone && (
                        <a href={`tel:${phone}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Call">
                            <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        </a>
                      )}
                      {/* GREEN Remind button with Renewal Notice / Quote options */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" className="h-7 gap-1 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={e => e.stopPropagation()}>
                            <Send className="h-3 w-3" /> Remind
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <div className="px-2 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">📲 WhatsApp</div>
                          {phone && (
                            <>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); showRenewalPreview(p, "notice"); }} className="cursor-pointer gap-2">
                                <Bell className="h-3.5 w-3.5 text-emerald-600" />
                                <div>
                                  <p className="text-xs font-medium">Renewal Notice</p>
                                  <p className="text-[10px] text-muted-foreground">Urgency reminder with countdown</p>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); showRenewalPreview(p, "quote"); }} className="cursor-pointer gap-2">
                                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                <div>
                                  <p className="text-xs font-medium">Renewal Quote</p>
                                  <p className="text-[10px] text-muted-foreground">Premium details with benefits</p>
                                </div>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">📧 Other</div>
                          {client?.email && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); sendRenewalEmail(p); }} className="cursor-pointer gap-2">
                              <Mail className="h-3.5 w-3.5 text-blue-600" />
                              <p className="text-xs font-medium">Email Reminder</p>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); sharePolicy(p); }} className="cursor-pointer gap-2">
                            <Share2 className="h-3.5 w-3.5" />
                            <p className="text-xs font-medium">Copy Details</p>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Detail Dialog */}
      {selectedPolicy && (
        <Dialog open onOpenChange={() => setSelectedPolicy(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">Renewal Details</DialogTitle>
            </DialogHeader>
            <RenewalDetailView
              policy={selectedPolicy}
              onShare={() => sharePolicy(selectedPolicy)}
              onNotice={() => showRenewalPreview(selectedPolicy, "notice")}
              onQuote={() => showRenewalPreview(selectedPolicy, "quote")}
              onEmail={() => sendRenewalEmail(selectedPolicy)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* WhatsApp Message Preview Dialog */}
      {previewPolicy && (
        <Dialog open onOpenChange={() => setPreviewPolicy(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                {templateType === "notice" ? "Renewal Notice Preview" : "Renewal Quote Preview"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Preview your message before sending to {previewPolicy.insurance_clients?.customer_name || "the customer"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Template Toggle */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={templateType === "notice" ? "default" : "outline"}
                  className={templateType === "notice" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}
                  onClick={() => setTemplateType("notice")}
                >
                  <Bell className="h-3.5 w-3.5 mr-1.5" /> Renewal Notice
                </Button>
                <Button
                  size="sm"
                  variant={templateType === "quote" ? "default" : "outline"}
                  className={templateType === "quote" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}
                  onClick={() => setTemplateType("quote")}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> Renewal Quote
                </Button>
              </div>

              {/* Message Preview */}
              <div className="bg-[#DCF8C6] rounded-xl p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed shadow-sm border border-emerald-200 max-h-[45vh] overflow-y-auto">
                {getPreviewMessage(previewPolicy, templateType)}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>Sending to <strong>{previewPolicy.insurance_clients?.phone}</strong></span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={confirmSendRenewal}
                  disabled={sendingPreview}
                >
                  {sendingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sendingPreview ? "Sending..." : "Send via API"}
                </Button>
                <Button
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => sendDirectWhatsApp(previewPolicy, templateType)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Open WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// === DETAIL VIEW ===
function RenewalDetailView({
  policy, onShare, onNotice, onQuote, onEmail
}: {
  policy: any; onShare: () => void; onNotice: () => void; onQuote: () => void; onEmail: () => void;
}) {
  const client = policy.insurance_clients;
  const phone = (!client?.phone || client.phone.startsWith("IB_")) ? null : client.phone;
  const reminderSchedule = [
    { days: 45, label: "45-day reminder" },
    { days: 30, label: "30-day reminder" },
    { days: 15, label: "15-day urgency" },
    { days: 7, label: "7-day priority" },
    { days: 1, label: "Final reminder" },
  ];

  return (
    <div className="space-y-4">
      {/* Customer */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
        <CardContent className="p-3">
          <h3 className="font-semibold">{client?.customer_name || "—"}</h3>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
            {phone && <a href={`tel:${phone}`} className="text-emerald-600 hover:underline flex items-center gap-1"><Phone className="h-3 w-3" /> {phone}</a>}
            {client?.email && <a href={`mailto:${client.email}`} className="text-emerald-600 hover:underline flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</a>}
          </div>
        </CardContent>
      </Card>

      {/* Policy Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Policy Number", value: policy.policy_number },
          { label: "Insurer", value: policy.insurer },
          { label: "Vehicle", value: client?.vehicle_number },
          { label: "Premium", value: policy.premium_amount ? `₹${Number(policy.premium_amount).toLocaleString("en-IN")}` : null },
          { label: "Expiry", value: policy.expiry_date ? format(new Date(policy.expiry_date), "dd MMM yyyy") : null },
          { label: "Days Left", value: policy.daysLeft !== null ? (policy.daysLeft <= 0 ? `Expired ${Math.abs(policy.daysLeft)}d ago` : `${policy.daysLeft} days`) : null },
        ].map(item => (
          <div key={item.label}>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium">{item.value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Reminder Schedule */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-emerald-600" /> Auto-Reminder Schedule
        </h4>
        <div className="space-y-1">
          {reminderSchedule.map(r => {
            const triggered = policy.daysLeft !== null && policy.daysLeft <= r.days;
            return (
              <div key={r.days} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                triggered ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400" : "bg-muted/30 text-muted-foreground"
              }`}>
                <span className="font-medium">{r.label}</span>
                <Badge variant={triggered ? "default" : "secondary"} className={`text-[10px] h-5 ${triggered ? "bg-emerald-600" : ""}`}>
                  {triggered ? "✓ Triggered" : "Scheduled"}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions - ALL GREEN */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {phone && (
          <>
            <a href={`tel:${phone}`}>
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <PhoneCall className="h-3.5 w-3.5" /> Call
              </Button>
            </a>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onNotice}>
              <Bell className="h-3.5 w-3.5" /> Renewal Notice
            </Button>
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onQuote}>
              <FileText className="h-3.5 w-3.5" /> Renewal Quote
            </Button>
          </>
        )}
        {client?.email && (
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onEmail}>
            <Mail className="h-3.5 w-3.5" /> Email
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={onShare}>
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
      </div>
    </div>
  );
}
