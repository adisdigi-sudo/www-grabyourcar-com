import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitBranch, User, Phone, Car, Shield, MessageSquare,
  Mail, Search, ArrowRight, Play, CheckCircle2, Flame,
  Clock, AlertTriangle, Share2, PhoneCall, Star, Trophy,
  XCircle, ThumbsUp, ThumbsDown, Zap, TrendingUp,
  UserPlus, Target, Eye, ChevronRight, BarChart3,
  FileText, Plus, Send, ShieldCheck, Loader2, Save, Upload,
  Bell, Users, Megaphone, FileSpreadsheet, Download
} from "lucide-react";
import { BulkQuoteSharePanel, BulkLeadItem } from "./BulkQuoteSharePanel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import InsuranceQuoteModal from "./InsuranceQuoteModal";
import { SharePdfDialog } from "./SharePdfDialog";
import { generateInsuranceQuotePdf } from "@/lib/generateInsuranceQuotePdf";

const PIPELINE_STAGES = [
  { value: "new", label: "New Lead", icon: UserPlus, color: "bg-blue-500", lightBg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800", textColor: "text-blue-700 dark:text-blue-300", emoji: "🆕" },
  { value: "contacted", label: "Contacted", icon: Phone, color: "bg-yellow-500", lightBg: "bg-yellow-50 dark:bg-yellow-950/40", border: "border-yellow-200 dark:border-yellow-800", textColor: "text-yellow-700 dark:text-yellow-300", emoji: "📞" },
  { value: "follow_up", label: "Follow-up", icon: Clock, color: "bg-orange-500", lightBg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800", textColor: "text-orange-700 dark:text-orange-300", emoji: "🔁" },
  { value: "in_process", label: "In Process", icon: Zap, color: "bg-violet-500", lightBg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800", textColor: "text-violet-700 dark:text-violet-300", emoji: "⚡" },
  { value: "interested", label: "Interested", icon: ThumbsUp, color: "bg-cyan-500", lightBg: "bg-cyan-50 dark:bg-cyan-950/40", border: "border-cyan-200 dark:border-cyan-800", textColor: "text-cyan-700 dark:text-cyan-300", emoji: "👍" },
  { value: "not_interested", label: "Not Interested", icon: ThumbsDown, color: "bg-gray-400", lightBg: "bg-gray-50 dark:bg-gray-900/40", border: "border-gray-200 dark:border-gray-700", textColor: "text-gray-500 dark:text-gray-400", emoji: "👎" },
  { value: "hot_prospect", label: "Hot Prospect", icon: Flame, color: "bg-red-500", lightBg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-800", textColor: "text-red-600 dark:text-red-400", emoji: "🔥" },
  { value: "converted", label: "Won 🏆", icon: Trophy, color: "bg-emerald-500", lightBg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", textColor: "text-emerald-700 dark:text-emerald-300", emoji: "🏆" },
  { value: "lost", label: "Lost", icon: XCircle, color: "bg-slate-400", lightBg: "bg-slate-50 dark:bg-slate-900/40", border: "border-slate-200 dark:border-slate-700", textColor: "text-slate-500 dark:text-slate-400", emoji: "❌" },
];

const NEXT_ACTIONS: Record<string, string> = {
  new: "📞 Call the lead to introduce yourself and understand their insurance needs.",
  contacted: "📋 Schedule a follow-up call and gather vehicle/policy details.",
  follow_up: "💰 Share a competitive quote based on their requirements.",
  in_process: "📄 Collect documents, verify details, and prepare the proposal.",
  interested: "🎯 Push for closure — share best offer and address final concerns.",
  not_interested: "⏸️ Park for 3 months, then re-engage with new offers.",
  hot_prospect: "🔥 Act NOW! This lead is ready — call immediately with your best deal.",
  converted: "✅ Congratulations! Upload policy & add to Grabyourcar customer database.",
  lost: "🔄 Try a recovery call after 2 weeks with a better offer.",
};

interface Client {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
  current_insurer: string | null;
  lead_status: string | null;
  current_premium: number | null;
  lead_source: string | null;
  created_at: string;
  vehicle_make: string | null;
}

export function InsuranceStatusPipeline() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editVehicleNumber, setEditVehicleNumber] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "kanban">("cards");
  const [converting, setConverting] = useState(false);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [clientPolicies, setClientPolicies] = useState<any[]>([]);
  const [policyForm, setPolicyForm] = useState({
    policy_number: "", policy_type: "comprehensive", insurer: "",
    premium_amount: "", start_date: "", expiry_date: "", status: "active",
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [dialogTab, setDialogTab] = useState("journey");
  const [bulkSending, setBulkSending] = useState(false);
  const [renewalPreviewClient, setRenewalPreviewClient] = useState<Client | null>(null);
  const [renewalPreviewMsg, setRenewalPreviewMsg] = useState("");
  const [sendingRenewal, setSendingRenewal] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    // Only fetch leads that have been worked on (have a lead_status set)
    const { data } = await supabase
      .from("insurance_clients")
      .select("id, customer_name, phone, email, vehicle_model, vehicle_number, vehicle_make, current_insurer, lead_status, current_premium, lead_source, created_at")
      .not("lead_status", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    setClients((data || []) as Client[]);
  };

  const stageCounts = useMemo(() =>
    PIPELINE_STAGES.map(stage => ({
      ...stage,
      count: clients.filter(c => c.lead_status === stage.value).length,
    })),
    [clients]
  );

  const totalLeads = clients.length;
  const wonCount = clients.filter(c => c.lead_status === "converted").length;
  const hotCount = clients.filter(c => c.lead_status === "hot_prospect").length;
  const lostCount = clients.filter(c => c.lead_status === "lost").length;
  const conversionRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : "0";

  const filteredClients = useMemo(() => {
    let result = selectedStage === "all" ? clients : clients.filter(c => c.lead_status === selectedStage);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [clients, selectedStage, search]);

  const updateStatus = async (clientId: string, newStatus: string) => {
    const stage = PIPELINE_STAGES.find(s => s.value === newStatus);
    await supabase.from("insurance_clients").update({ lead_status: newStatus }).eq("id", clientId);
    await supabase.from("insurance_activity_log").insert({
      client_id: clientId,
      activity_type: "status_change",
      title: `Pipeline: ${stage?.label}`,
      description: `Lead moved to "${stage?.label}" stage`,
      metadata: { new_status: newStatus },
    } as any);

    // 🏆 WON: Auto-add to Grabyourcar customer database
    if (newStatus === "converted") {
      await handleWonConversion(clientId);
    }

    toast.success(`${stage?.emoji} Moved to ${stage?.label}!`);
    fetchClients();
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, lead_status: newStatus } : null);
    }
  };

  const handleWonConversion = async (clientId: string) => {
    setConverting(true);
    try {
      // Get full client details
      const { data: client } = await supabase
        .from("insurance_clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (!client) return;

      // Mark as Grabyourcar customer
      await supabase.from("insurance_clients").update({
        is_active: true,
        notes: `${client.notes || ""}\n🏆 Converted to Grabyourcar customer on ${new Date().toLocaleDateString("en-IN")}`.trim(),
      }).eq("id", clientId);

      // Log the conversion
      await supabase.from("insurance_activity_log").insert({
        client_id: clientId,
        activity_type: "conversion",
        title: "🏆 Lead Won — Grabyourcar Customer",
        description: `${client.customer_name} has been converted to a Grabyourcar customer. Added to the main customer database.`,
        metadata: { conversion_date: new Date().toISOString(), source: client.lead_source },
      } as any);

      // ── Auto-create policy in Policy Book ──
      // If same vehicle_number exists, mark old policies as "renewed"
      if (client.vehicle_number) {
        // Find existing active policies for this vehicle
        const { data: existingPolicies } = await supabase
          .from("insurance_policies")
          .select("id")
          .eq("client_id", clientId)
          .eq("status", "active");

        if (existingPolicies && existingPolicies.length > 0) {
          // Mark all existing active policies as "renewed"
          await supabase
            .from("insurance_policies")
            .update({ status: "renewed", renewal_status: "renewed" })
            .in("id", existingPolicies.map(p => p.id));
        }

        // Also check if another client has same vehicle_number with active policy
        const { data: otherVehiclePolicies } = await supabase
          .from("insurance_clients")
          .select("id")
          .eq("vehicle_number", client.vehicle_number)
          .neq("id", clientId);

        if (otherVehiclePolicies && otherVehiclePolicies.length > 0) {
          for (const otherClient of otherVehiclePolicies) {
            await supabase
              .from("insurance_policies")
              .update({ status: "renewed", renewal_status: "renewed" })
              .eq("client_id", otherClient.id)
              .eq("status", "active");
          }
        }
      }

      // Calculate policy dates
      const today = new Date();
      const startDate = client.policy_start_date || today.toISOString().split("T")[0];
      const expiryDate = client.policy_expiry_date || new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split("T")[0];

      // Create new policy in policy book
      const { error: policyError } = await supabase.from("insurance_policies").insert({
        client_id: clientId,
        policy_number: client.current_policy_number || null,
        policy_type: client.current_policy_type || "comprehensive",
        insurer: client.current_insurer || client.quote_insurer || "Unknown",
        premium_amount: client.quote_amount || client.current_premium || null,
        start_date: startDate,
        expiry_date: expiryDate,
        status: "active",
        is_renewal: false,
        issued_date: today.toISOString().split("T")[0],
      });

      if (policyError) {
        console.error("Policy creation failed:", policyError);
        toast.error("Lead won but policy creation failed. Please add manually.");
      } else {
        // Log policy creation
        await supabase.from("insurance_activity_log").insert({
          client_id: clientId,
          activity_type: "policy_created",
          title: "📋 Policy Auto-Created in Policy Book",
          description: `Policy for ${client.vehicle_number || client.vehicle_model || "vehicle"} created. Start: ${startDate}, Expiry: ${expiryDate}`,
          metadata: { start_date: startDate, expiry_date: expiryDate, insurer: client.current_insurer || client.quote_insurer },
        } as any);
      }

      toast.success("🎉 Lead converted & policy added to Policy Book!", {
        description: `${client.customer_name} — Policy: ${startDate} → ${expiryDate}`,
        duration: 5000,
      });
    } catch (e) {
      console.error("Won conversion failed:", e);
    } finally {
      setConverting(false);
    }
  };

  const fetchClientPolicies = async (clientId: string) => {
    const { data } = await supabase
      .from("insurance_policies")
      .select("id, policy_number, insurer, premium_amount, expiry_date, status, policy_type, start_date")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setClientPolicies(data || []);
  };

  const savePolicy = async () => {
    if (!selectedClient) return;
    if (!policyForm.policy_number) { toast.error("Policy number required"); return; }
    setSavingPolicy(true);
    try {
      const { error } = await supabase.from("insurance_policies").insert({
        client_id: selectedClient.id,
        policy_number: policyForm.policy_number,
        policy_type: policyForm.policy_type,
        insurer: policyForm.insurer || null,
        premium_amount: policyForm.premium_amount ? Number(policyForm.premium_amount) : null,
        start_date: policyForm.start_date || null,
        expiry_date: policyForm.expiry_date || null,
        status: policyForm.status,
      });
      if (error) throw error;
      await supabase.from("insurance_activity_log").insert({
        client_id: selectedClient.id,
        activity_type: "policy_uploaded",
        title: "Policy added from pipeline",
        description: `${policyForm.insurer || "Unknown"} policy ${policyForm.policy_number} added`,
      } as any);
      toast.success("✅ Policy added!");
      setPolicyForm({ policy_number: "", policy_type: "comprehensive", insurer: "", premium_amount: "", start_date: "", expiry_date: "", status: "active" });
      setShowAddPolicy(false);
      fetchClientPolicies(selectedClient.id);
      fetchClients();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSavingPolicy(false);
    }
  };

  const getWhatsAppPhone = (client: Client) => {
    const phone = client.phone?.startsWith("IB_") ? "" : client.phone;
    if (!phone) return null;
    const clean = phone.replace(/\D/g, "");
    return clean.startsWith("91") ? clean : `91${clean}`;
  };

  const requestPolicyViaWhatsApp = async (client: Client) => {
    if (!client.phone || client.phone.startsWith("IB_")) { toast.error("No phone number available"); return; }
    const msg = `🙏 Namaste ${client.customer_name || "Sir/Madam"},\n\nThis is *Grabyourcar Insurance* team.\n\nWe need your current motor insurance policy document for ${client.vehicle_number ? `vehicle *${client.vehicle_number}*` : "your vehicle"} to prepare the best renewal quote.\n\n📎 Please share:\n1️⃣ Current Policy PDF/Photo\n2️⃣ RC Copy (if available)\n\nYou can simply *reply to this message* with the documents.\n\nThank you! 🚗\n— *Grabyourcar Insurance*`;
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: client.phone, message: msg, name: client.customer_name, logEvent: "policy_doc_request" });
    supabase.from("insurance_activity_log").insert({
      client_id: client.id, activity_type: "whatsapp_sent",
      title: "Policy document requested via WhatsApp",
      description: `Document request sent to ${client.phone}`,
    } as any);
  };

  const openRenewalPreview = (client: Client) => {
    const vehicleModel = client.vehicle_model || client.vehicle_make || "your vehicle";
    const vehicleNumber = client.vehicle_number || "";
    const vehicleNumberLine = vehicleNumber ? `(${vehicleNumber}) ` : "";
    const customerName = client.customer_name || "Valued Customer";
    const insurer = client.current_insurer || "";
    const premium = client.current_premium ? `₹${client.current_premium.toLocaleString("en-IN")}` : "";

    let policyDetails = "";
    if (insurer || premium || vehicleNumber) {
      policyDetails = "📋 *Your Policy Details:*\n";
      if (insurer) policyDetails += `🏢 Insurer: ${insurer}\n`;
      if (premium) policyDetails += `💰 Premium: ${premium}\n`;
      if (vehicleNumber) policyDetails += `🚗 Vehicle: ${vehicleNumber}\n`;
    }

    const preview = `🚗 *Grabyourcar Policy Renewal Reminder*\n━━━━━━━━━━━━━━━━━━━━━\n\nHello *${customerName}*,\n\nWe hope you are enjoying a smooth and safe drive!\n\nThis is a friendly reminder from *Grabyourcar Insurance Desk* that your *${vehicleModel}* ${vehicleNumberLine}insurance policy is due for renewal.\n\nRenewing your policy before the expiry helps you:\n\n✅ Avoid inspection hassles\n✅ Maintain your No Claim Bonus\n✅ Stay financially protected\n✅ Ensure uninterrupted coverage\n\nOur team has already prepared renewal assistance for you to make the process quick and seamless.\n\n👉 Simply *reply to this message* or click below to get your renewal quote instantly.\n\n🔗 Renew Now: https://www.grabyourcar.com/insurance\n\n${policyDetails}\nIf you need any help, feel free to contact your dedicated advisor.\n\n📞 +91 98559 24442\n🌐 www.grabyourcar.com\n\nThank you for trusting *Grabyourcar* — we look forward to protecting your journeys ahead.\n\nDrive safe! 🚘`;

    setRenewalPreviewMsg(preview);
    setRenewalPreviewClient(client);
  };

  const sendRenewalViaEngine = async (client: Client) => {
    setSendingRenewal(true);
    try {
      const { data, error } = await supabase.functions.invoke("insurance-renewal-engine", {
        body: { action: "send_single", client_id: client.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("✅ Premium renewal reminder sent!", {
          description: `Sent to ${client.customer_name || client.phone}`,
        });
      } else {
        toast.error("Failed to send", { description: data?.error || "Unknown error" });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send renewal reminder");
    } finally {
      setSendingRenewal(false);
      setRenewalPreviewClient(null);
    }
  };

  const sendRenewalReminderWhatsApp = (client: Client) => {
    openRenewalPreview(client);
  };

  const sendBulkRenewalReminders = async () => {
    const eligibleClients = filteredClients.filter(c => getWhatsAppPhone(c));
    if (eligibleClients.length === 0) {
      toast.error("No clients with valid phone numbers in current view");
      return;
    }
    setBulkSending(true);
    let sent = 0;
    const toastId = toast.loading(`Sending premium renewal reminders... 0/${eligibleClients.length}`);

    for (const client of eligibleClients) {
      try {
        const { data, error } = await supabase.functions.invoke("insurance-renewal-engine", {
          body: { action: "send_single", client_id: client.id },
        });
        if (!error && data?.success) sent++;
        toast.loading(`Sending premium renewal reminders... ${sent}/${eligibleClients.length}`, { id: toastId });
      } catch {
        // Continue sending to others
      }
      await new Promise(r => setTimeout(r, 500));
    }

    toast.success(`✅ Sent ${sent}/${eligibleClients.length} premium renewal reminders!`, { id: toastId });
    setBulkSending(false);
  };

  const addNote = async () => {
    if (!selectedClient || !note.trim()) return;
    await supabase.from("insurance_activity_log").insert({
      client_id: selectedClient.id,
      activity_type: "note",
      title: "Note Added",
      description: note,
    } as any);
    toast.success("Note saved");
    setNote("");
  };

  const shareClientDetails = (client: Client) => {
    const displayPhoneVal = client.phone?.startsWith("IB_") ? "N/A" : client.phone;
    const stage = PIPELINE_STAGES.find(s => s.value === client.lead_status);
    const text = `${stage?.emoji || "👤"} Lead: ${client.customer_name}\n📱 Mobile: ${displayPhoneVal}\n✉️ Email: ${client.email || "N/A"}\n🚗 Vehicle: ${client.vehicle_number || "N/A"}\n🏢 Insurer: ${client.current_insurer || "N/A"}\n💰 Premium: ₹${client.current_premium?.toLocaleString("en-IN") || "N/A"}\n📊 Stage: ${stage?.label || "New"}\n\n— Grabyourcar Insurance`;
    if (navigator.share) {
      navigator.share({ title: `Lead - ${client.customer_name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Details copied!");
    }
  };

  const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

  const currentStageIndex = (status: string | null) => {
    const idx = PIPELINE_STAGES.findIndex(s => s.value === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-5">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row gap-4 items-start justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" /> Lead Pipeline
          </h2>
          <p className="text-sm text-muted-foreground">Track & convert insurance leads through the journey</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={sendBulkRenewalReminders}
            disabled={bulkSending || filteredClients.length === 0}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-md"
          >
            {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
            {bulkSending ? "Sending..." : `Bulk Reminder (${filteredClients.filter(c => getWhatsAppPhone(c)).length})`}
          </Button>
          <Button
            variant={showBulkPanel ? "default" : "outline"}
            onClick={() => setShowBulkPanel(!showBulkPanel)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {showBulkPanel ? "Hide Bulk Panel" : "Bulk Quote/Share"}
          </Button>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Total", value: totalLeads, icon: Target, color: "text-primary", bg: "bg-primary/10" },
            { label: "Hot 🔥", value: hotCount, icon: Flame, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
            { label: "Won 🏆", value: wonCount, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { label: "Lost", value: lostCount, icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/50" },
            { label: "Conv. Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-chart-2", bg: "bg-chart-2/10" },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${s.bg} border`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <div className="text-center">
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + View Toggle */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, vehicle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Stage Filters — Rich Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedStage("all")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium whitespace-nowrap transition-all ${
            selectedStage === "all"
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-transparent bg-muted/40 hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          All ({totalLeads})
        </button>
        {stageCounts.map(stage => (
          <button
            key={stage.value}
            onClick={() => setSelectedStage(stage.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium whitespace-nowrap transition-all ${
              selectedStage === stage.value
                ? `${stage.border} ${stage.lightBg} ${stage.textColor} shadow-sm`
                : "border-transparent bg-muted/40 hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            <div className={`h-3 w-3 rounded-full ${stage.color}`} />
            <span>{stage.emoji} {stage.label}</span>
            <Badge variant="secondary" className="h-5 text-[10px] px-1.5 ml-0.5">{stage.count}</Badge>
          </button>
        ))}
      </div>

      {/* Bulk Quote/Share Panel */}
      {showBulkPanel && (
        <BulkQuoteSharePanel
          leads={filteredClients.map(c => ({
            id: c.id,
            customer_name: c.customer_name,
            phone: c.phone,
            email: c.email,
            vehicle_number: c.vehicle_number,
            vehicle_make: c.vehicle_make,
            vehicle_model: c.vehicle_model,
            current_insurer: c.current_insurer,
            current_premium: c.current_premium,
          } as BulkLeadItem))}
          source="pipeline"
          onDone={() => setShowBulkPanel(false)}
        />
      )}

      {/* Client Cards */}
      <AnimatePresence mode="popLayout">
        <div className="grid gap-2">
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No leads in this stage</p>
                <p className="text-xs text-muted-foreground mt-1">Add leads or change the filter</p>
              </CardContent>
            </Card>
          ) : filteredClients.map((client, idx) => {
            const stage = PIPELINE_STAGES.find(s => s.value === client.lead_status) || PIPELINE_STAGES[0];
            const phone = displayPhone(client.phone);
            const isHot = client.lead_status === "hot_prospect";
            const isWon = client.lead_status === "converted";

            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Card className={`hover:shadow-lg transition-all border-2 ${
                  isHot ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" :
                  isWon ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" :
                  `${stage.border} hover:${stage.lightBg}`
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedClient(client); setEditPhone(phone || ""); setEditEmail(client.email || ""); setEditVehicleNumber(client.vehicle_number || ""); }}>
                        {/* Stage Indicator */}
                        <div className={`h-10 w-10 rounded-xl ${stage.color} flex items-center justify-center shrink-0 shadow-sm`}>
                          <stage.icon className="h-5 w-5 text-white" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm truncate">{client.customer_name}</p>
                            {isHot && <span className="text-xs animate-pulse">🔥</span>}
                            {isWon && <Badge className="bg-emerald-500 text-white text-[10px] h-4 px-1.5">Grabyourcar ✓</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {phone}</span>}
                            {client.vehicle_number && <span className="flex items-center gap-1 font-mono"><Car className="h-3 w-3" /> {client.vehicle_number}</span>}
                            {client.current_insurer && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {client.current_insurer}</span>}
                            {client.lead_source && <Badge variant="outline" className="text-[10px] h-4">{client.lead_source}</Badge>}
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge className={`text-[10px] h-5 ${stage.lightBg} ${stage.textColor} border ${stage.border}`}>
                          {stage.label}
                        </Badge>
                        {client.current_premium && (
                          <Badge variant="secondary" className="text-[10px] h-5">₹{client.current_premium.toLocaleString("en-IN")}</Badge>
                        )}
                        {/* Prepare Quote Button */}
                        <Button
                          size="sm"
                          className="h-7 gap-1 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setDialogTab("quote"); }}
                        >
                          <FileText className="h-3 w-3" /> Quote
                        </Button>
                        {phone && (
                          <>
                            <a href={`tel:${phone}`}>
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-950/30" title="Call">
                                <PhoneCall className="h-4 w-4 text-green-600" />
                              </Button>
                            </a>
                             <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-950/30" title="WhatsApp">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </Button>
                            </a>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Share Options">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => requestPolicyViaWhatsApp(client)} className="cursor-pointer gap-2">
                              <Upload className="h-3.5 w-3.5 text-green-600" />
                              <div>
                                <p className="text-xs font-medium">Policy Share</p>
                                <p className="text-[10px] text-muted-foreground">Request policy docs via WA</p>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendRenewalReminderWhatsApp(client)} className="cursor-pointer gap-2">
                              <Bell className="h-3.5 w-3.5 text-amber-600" />
                              <div>
                                <p className="text-xs font-medium">Renewal Reminder</p>
                                <p className="text-[10px] text-muted-foreground">Send renewal nudge via WA</p>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => shareClientDetails(client)} className="cursor-pointer gap-2">
                              <Share2 className="h-3.5 w-3.5" />
                              <div>
                                <p className="text-xs font-medium">Share Details</p>
                                <p className="text-[10px] text-muted-foreground">Copy lead info to clipboard</p>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {/* ── Client Detail + Pipeline Dialog ── */}
      <Dialog open={!!selectedClient} onOpenChange={() => { setSelectedClient(null); setShowAddPolicy(false); setDialogTab("journey"); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-lg ${PIPELINE_STAGES.find(s => s.value === selectedClient?.lead_status)?.color || "bg-primary"} flex items-center justify-center`}>
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <span>{selectedClient?.customer_name}</span>
                {selectedClient?.lead_status === "converted" && (
                  <Badge className="ml-2 bg-emerald-500 text-white text-[10px]">Grabyourcar Customer ✓</Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mobile</Label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Enter mobile" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Enter email" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vehicle Number</Label>
                  <Input value={editVehicleNumber} onChange={e => setEditVehicleNumber(e.target.value.toUpperCase())} placeholder="e.g. DL01AB1234" className="h-8 text-sm font-mono uppercase" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="text-sm font-medium">{selectedClient.lead_source || "—"}</p>
                </div>
              </div>

              {/* Save Contact Button */}
              <Button
                size="sm"
                className="w-full gap-2"
                disabled={savingContact}
                onClick={async () => {
                  setSavingContact(true);
                  try {
                    const updates: Record<string, any> = {};
                    if (editPhone !== (displayPhone(selectedClient.phone) || "")) updates.phone = editPhone;
                    if (editEmail !== (selectedClient.email || "")) updates.email = editEmail || null;
                    if (editVehicleNumber !== (selectedClient.vehicle_number || "")) updates.vehicle_number = editVehicleNumber || null;
                    if (Object.keys(updates).length === 0) { toast.info("No changes to save"); setSavingContact(false); return; }
                    const { error } = await supabase.from("insurance_clients").update(updates).eq("id", selectedClient.id);
                    if (error) throw error;
                    toast.success("✅ Details updated!");
                    fetchClients();
                    setSelectedClient({ ...selectedClient, ...updates } as any);
                  } catch (e: any) {
                    toast.error(e.message || "Failed to save");
                  } finally {
                    setSavingContact(false);
                  }
                }}
              >
                {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingContact ? "Saving..." : "Save Changes"}
              </Button>

              {/* Communication Hub + WhatsApp Doc Request */}
              <div className="flex flex-wrap gap-2 py-2 border-y">
                {editPhone && (
                  <>
                    <a href={`tel:${editPhone}`}>
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                        <PhoneCall className="h-3.5 w-3.5" /> Call
                      </Button>
                    </a>
                    <a href={`https://wa.me/91${editPhone}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-green-600" /> WhatsApp
                      </Button>
                    </a>
                  </>
                )}
                {editEmail && (
                  <a href={`mailto:${editEmail}`}>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Button>
                  </a>
                )}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => shareClientDetails(selectedClient)}>
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
                <div className="ml-auto flex gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950" onClick={() => requestPolicyViaWhatsApp(selectedClient)}>
                    <Upload className="h-3.5 w-3.5" /> Policy Share
                  </Button>
                  <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => sendRenewalReminderWhatsApp(selectedClient)}>
                    <Clock className="h-3.5 w-3.5" /> Renewal Reminder
                  </Button>
                </div>
              </div>

              {/* Tabs: Journey / Quote / Policies / Notes */}
              <Tabs value={dialogTab} onValueChange={(v) => { setDialogTab(v); if (v === "policies") fetchClientPolicies(selectedClient.id); }}>
                <TabsList className="w-full bg-muted/50">
                  <TabsTrigger value="journey" className="flex-1 gap-1.5 text-xs">
                    <GitBranch className="h-3.5 w-3.5" /> Journey
                  </TabsTrigger>
                  <TabsTrigger value="quote" className="flex-1 gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5" /> Prepare Quote
                  </TabsTrigger>
                  <TabsTrigger value="policies" className="flex-1 gap-1.5 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" /> Policies
                    {clientPolicies.length > 0 && <Badge variant="secondary" className="h-4 text-[10px] px-1">{clientPolicies.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1 gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5" /> Notes
                  </TabsTrigger>
                </TabsList>

                {/* Journey Tab */}
                <TabsContent value="journey" className="mt-3 space-y-4">
                  <div className="space-y-1.5">
                    {PIPELINE_STAGES.map((stage, idx) => {
                      const currentIdx = currentStageIndex(selectedClient.lead_status);
                      const isActive = stage.value === selectedClient.lead_status;
                      const isPast = idx < currentIdx && stage.value !== "not_interested" && stage.value !== "lost";
                      const StageIcon = stage.icon;
                      return (
                        <button
                          key={stage.value}
                          onClick={() => updateStatus(selectedClient.id, stage.value)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group ${
                            isActive
                              ? `${stage.lightBg} border-2 ${stage.border} font-semibold shadow-sm`
                              : isPast
                                ? "bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/30"
                                : "hover:bg-muted/40 text-muted-foreground border border-transparent"
                          }`}
                        >
                          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                            isPast ? "bg-emerald-500 text-white" :
                            isActive ? `${stage.color} text-white shadow-sm` :
                            "bg-muted/60 border group-hover:border-primary/20"
                          }`}>
                            {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                             <StageIcon className="h-3.5 w-3.5" />}
                          </div>
                          <span className={`flex-1 text-left ${isActive ? stage.textColor : ""}`}>
                            {stage.emoji} {stage.label}
                          </span>
                          {isActive && (
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Current</span>
                          )}
                          {isPast && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Best Action */}
                  <Card className={`border-2 ${
                    selectedClient.lead_status === "hot_prospect"
                      ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                      : selectedClient.lead_status === "converted"
                        ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                        : "border-primary/20 bg-primary/5"
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2.5">
                        {selectedClient.lead_status === "hot_prospect" ? (
                          <Flame className="h-5 w-5 text-red-500 mt-0.5 shrink-0 animate-pulse" />
                        ) : selectedClient.lead_status === "converted" ? (
                          <Trophy className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-semibold mb-0.5">
                            {selectedClient.lead_status === "hot_prospect" ? "🔥 URGENT ACTION" :
                             selectedClient.lead_status === "converted" ? "🏆 WON — Next Steps" :
                             "⚡ Next Best Action"}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {NEXT_ACTIONS[selectedClient.lead_status || "new"]}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Quote Tab */}
                <TabsContent value="quote" className="mt-3">
                  <div className="text-center space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
                      <FileText className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Prepare Insurance Quote</p>
                      <p className="text-xs text-muted-foreground mt-1">Generate a branded PDF quote for {selectedClient.customer_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                        onClick={() => {
                          const quoteData = {
                            customerName: selectedClient.customer_name || "Customer",
                            phone: selectedClient.phone,
                            email: selectedClient.email || undefined,
                            city: undefined,
                            vehicleMake: selectedClient.vehicle_make || "N/A",
                            vehicleModel: selectedClient.vehicle_model || "N/A",
                            vehicleNumber: selectedClient.vehicle_number || "N/A",
                            vehicleYear: new Date().getFullYear(),
                            fuelType: "Petrol",
                            insuranceCompany: selectedClient.current_insurer || "Best Available",
                            policyType: "Comprehensive",
                            idv: 500000,
                            basicOD: 8000,
                            odDiscount: 1500,
                            ncbDiscount: 2000,
                            thirdParty: 6521,
                            securePremium: 500,
                            addonPremium: 3500,
                            addons: ["Zero Depreciation", "Engine Protection", "Roadside Assistance (RSA)"],
                          };
                          generateInsuranceQuotePdf(quoteData);
                          toast.success("📄 Quote PDF downloaded!");
                        }}
                      >
                        <Download className="h-4 w-4" /> Download PDF
                      </Button>
                      <Button
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white h-11"
                        onClick={async () => {
                          const phone = (selectedClient.phone || "").replace(/\D/g, "");
                          const fullPhone = phone.startsWith("91") ? phone : `91${phone}`;
                          generateInsuranceQuotePdf({
                            customerName: selectedClient.customer_name || "Customer",
                            phone: selectedClient.phone,
                            vehicleMake: selectedClient.vehicle_make || "N/A",
                            vehicleModel: selectedClient.vehicle_model || "N/A",
                            vehicleNumber: selectedClient.vehicle_number || "N/A",
                            vehicleYear: new Date().getFullYear(),
                            fuelType: "Petrol",
                            insuranceCompany: selectedClient.current_insurer || "Best Available",
                            policyType: "Comprehensive",
                            idv: 500000,
                            basicOD: 8000,
                            odDiscount: 1500,
                            ncbDiscount: 2000,
                            thirdParty: 6521,
                            securePremium: 500,
                            addonPremium: 3500,
                            addons: ["Zero Depreciation", "Engine Protection", "Roadside Assistance (RSA)"],
                          });
                          const msgText = `Hi ${selectedClient.customer_name}! Here is your insurance quote. Please find the PDF attached.\n\n— Grabyourcar Insurance\n📞 +91 98559 24442`;
                          const { sendWhatsApp: sendWA } = await import("@/lib/sendWhatsApp");
                          await sendWA({ phone: selectedClient.phone, message: msgText, name: selectedClient.customer_name, logEvent: "quote_share" });
                        }}
                      >
                        <MessageSquare className="h-4 w-4" /> WhatsApp
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">For detailed quote customization, use the Quote Hub from the sidebar</p>
                  </div>
                </TabsContent>

                {/* Policies Tab */}
                <TabsContent value="policies" className="mt-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Policies ({clientPolicies.length})
                    </p>
                    <Button size="sm" onClick={() => setShowAddPolicy(!showAddPolicy)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Add Policy
                    </Button>
                  </div>

                  {/* Add Policy Form */}
                  {showAddPolicy && (
                    <Card className="border-2 border-primary/20 bg-primary/5">
                      <CardContent className="p-3 space-y-3">
                        <p className="text-xs font-semibold flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> New Policy for {selectedClient.customer_name}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Policy Number *</Label>
                            <Input value={policyForm.policy_number} onChange={e => setPolicyForm(p => ({ ...p, policy_number: e.target.value }))} placeholder="POL-123456" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Insurer</Label>
                            <Input value={policyForm.insurer} onChange={e => setPolicyForm(p => ({ ...p, insurer: e.target.value }))} placeholder="ICICI Lombard" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Premium (₹)</Label>
                            <Input type="number" value={policyForm.premium_amount} onChange={e => setPolicyForm(p => ({ ...p, premium_amount: e.target.value }))} placeholder="12000" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Policy Type</Label>
                            <Select value={policyForm.policy_type} onValueChange={v => setPolicyForm(p => ({ ...p, policy_type: v }))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="comprehensive">Comprehensive</SelectItem>
                                <SelectItem value="third_party">Third Party</SelectItem>
                                <SelectItem value="own_damage">Own Damage</SelectItem>
                                <SelectItem value="bundled">Bundled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Start Date</Label>
                            <Input type="date" value={policyForm.start_date} onChange={e => setPolicyForm(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Expiry Date</Label>
                            <Input type="date" value={policyForm.expiry_date} onChange={e => setPolicyForm(p => ({ ...p, expiry_date: e.target.value }))} className="h-8 text-xs" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={savePolicy} disabled={savingPolicy} className="gap-1.5">
                            {savingPolicy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Save Policy
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowAddPolicy(false)}>Cancel</Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Existing Policies */}
                  {clientPolicies.length === 0 ? (
                    <div className="text-center py-6">
                      <ShieldCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No policies yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Add a policy or request documents via WhatsApp</p>
                      <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => requestPolicyViaWhatsApp(selectedClient)}>
                        <Upload className="h-3.5 w-3.5" /> Request Policy via WhatsApp
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clientPolicies.map(p => (
                        <Card key={p.id} className="border hover:shadow-sm transition-all">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-sm font-semibold">{p.policy_number || "—"}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {p.insurer || "—"}</span>
                                  {p.premium_amount && <span>₹{Number(p.premium_amount).toLocaleString("en-IN")}</span>}
                                  {p.expiry_date && <span>Exp: {new Date(p.expiry_date).toLocaleDateString("en-IN")}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                                {/* Share policy via WhatsApp */}
                                {displayPhone(selectedClient.phone) && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Send policy via WhatsApp"
                                    onClick={async () => {
                                      const msgText = `📋 *Policy Details*\n━━━━━━━━━━━━━━━━\n📄 Policy: ${p.policy_number}\n🏢 Insurer: ${p.insurer || "N/A"}\n💰 Premium: ₹${p.premium_amount ? Number(p.premium_amount).toLocaleString("en-IN") : "N/A"}\n📅 Expiry: ${p.expiry_date ? new Date(p.expiry_date).toLocaleDateString("en-IN") : "N/A"}\n🚗 Vehicle: ${selectedClient.vehicle_number || "N/A"}\n\n— *Grabyourcar Insurance*`;
                                      const { sendWhatsApp: sendWA } = await import("@/lib/sendWhatsApp");
                                      await sendWA({ phone: selectedClient.phone, message: msgText, name: selectedClient.customer_name, logEvent: "policy_share" });
                                    }}>
                                    <Send className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Add Note</Label>
                    <div className="flex gap-2">
                      <Textarea placeholder="Type a note about this lead..." value={note} onChange={e => setNote(e.target.value)} rows={2} className="flex-1 text-sm" />
                      <Button size="sm" onClick={addNote} disabled={!note.trim()} className="self-end">Save</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Premium Renewal Preview Dialog ── */}
      <Dialog open={!!renewalPreviewClient} onOpenChange={() => setRenewalPreviewClient(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div>
                <span>Renewal Reminder Preview</span>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  {renewalPreviewClient?.customer_name} • {renewalPreviewClient?.phone}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {renewalPreviewClient && (
            <div className="space-y-4">
              {/* WhatsApp-style preview */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800 shadow-inner">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-200 dark:border-emerald-800">
                  <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <MessageSquare className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">WhatsApp Preview</span>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                  {renewalPreviewMsg}
                </pre>
              </div>

              {/* Client details summary */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-semibold">{renewalPreviewClient.vehicle_number || renewalPreviewClient.vehicle_model || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Insurer</p>
                  <p className="font-semibold">{renewalPreviewClient.current_insurer || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Premium</p>
                  <p className="font-semibold">{renewalPreviewClient.current_premium ? `₹${renewalPreviewClient.current_premium.toLocaleString("en-IN")}` : "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-semibold">{renewalPreviewClient.lead_source || "—"}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  onClick={() => sendRenewalViaEngine(renewalPreviewClient)}
                  disabled={sendingRenewal}
                >
                  {sendingRenewal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sendingRenewal ? "Sending..." : "Send via WhatsApp"}
                </Button>
                <Button variant="outline" onClick={() => setRenewalPreviewClient(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
