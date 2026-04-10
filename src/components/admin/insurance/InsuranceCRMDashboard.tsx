import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, FileText, AlertTriangle, Clock, Search,
  Download, ChevronLeft, ChevronRight, Phone, Mail,
  Share2, Bell, CalendarDays, ArrowRight, Copy, ExternalLink,
  Shield, Car, TrendingUp, CheckCircle2, MessageSquare, PhoneCall,
  Eye, Send, Tag, Trophy, XCircle, Play, Edit, Zap, Loader2, Upload
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, addDays, differenceInDays, isBefore, isAfter, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, getWeek, getMonth, getYear } from "date-fns";
import { InsurancePolicyDocumentUploader } from "./InsurancePolicyDocumentUploader";
import { BulkQuoteSharePanel, BulkLeadItem } from "./BulkQuoteSharePanel";
import { FileSpreadsheet } from "lucide-react";
import InsuranceQuoteModal from "./InsuranceQuoteModal";
import { openInsuranceStorageFile } from "@/lib/insuranceDocumentViewer";

type ViewFilter = "all" | "7" | "15" | "30" | "60" | "expired";
type StatusFilter = "all" | "won" | "lost" | "running" | "new" | "grabyourcar";
type PolicySegment = "upcoming" | "running" | "expired";
type RenewalViewMode = "all" | "month" | "week" | "date";

type PolicyRow = {
  id: string;
  client_id: string;
  policy_number: string | null;
  customer_name: string | null;
  agent_name: string | null;
  insurer: string | null;
  renewal_date: string | null;
  start_date: string | null;
  phone: string | null;
  rawPhone: string | null;
  email: string | null;
  vehicle_number: string | null;
  premium: number | null;
  status: string | null;
  policy_type: string | null;
  plan_name: string | null;
  product_type: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  daysUntilRenewal: number | null;
  lead_status: string | null;
  lead_source: string | null;
  created_at: string | null;
  policy_document_url: string | null;
};

const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New", icon: Tag, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "won", label: "Won", icon: Trophy, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "lost", label: "Lost", icon: XCircle, color: "bg-red-100 text-red-700 border-red-200" },
  { value: "running", label: "Running", icon: Play, color: "bg-amber-100 text-amber-700 border-amber-200" },
];

const getStatusBadge = (status: string | null) => {
  const opt = LEAD_STATUS_OPTIONS.find(o => o.value === status?.toLowerCase());
  if (!opt) return null;
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${opt.color}`}>
      {opt.label}
    </Badge>
  );
};

export function InsuranceCRMDashboard() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [statusFilterVal, setStatusFilterVal] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyRow | null>(null);
  const [activeTab, setActiveTab] = useState("policies");
  const [renewalView, setRenewalView] = useState<RenewalViewMode>("all");
  const [selectedRenewalDate, setSelectedRenewalDate] = useState<string>("");
  const [searchField, setSearchField] = useState<"all" | "policy" | "phone" | "vehicle" | "insurer">("all");
  const [showPendingDocs, setShowPendingDocs] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const pageSize = 12;
  const queryClient = useQueryClient();

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    const channel = supabase
      .channel("insurance-crm-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insurance_clients" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ins-dash-clients-policy-book"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insurance_policies" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ins-dash-policies"] });
          queryClient.invalidateQueries({ queryKey: ["ins-dash-clients-policy-book"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: clients } = useQuery({
    queryKey: ["ins-dash-clients-policy-book"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, vehicle_number, vehicle_make, vehicle_model, advisor_name, lead_status, lead_source")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["ins-dash-policies"],
    queryFn: async () => {
      // Only fetch active/lapsed policies — exclude 'renewed'/'cancelled' to prevent duplicate entries
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("id, client_id, policy_number, insurer, premium_amount, expiry_date, status, start_date, policy_type, plan_name, created_at, policy_document_url")
        .in("status", ["active", "lapsed"])
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Mark client status mutation
  const [wonClientForUpload, setWonClientForUpload] = useState<string | null>(null);

  const markStatus = useMutation({
    mutationFn: async ({ clientId, status }: { clientId: string; status: string }) => {
      const { error } = await supabase
        .from("insurance_clients")
        .update({ lead_status: status })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ins-dash-clients-policy-book"] });
      toast.success(`Client marked as ${vars.status.toUpperCase()}`);
    },
    onError: () => toast.error("Failed to update status"),
  });

  const handleMarkStatus = useCallback((clientId: string, status: string) => {
    if (status === "won") {
      supabase
        .from("insurance_clients")
        .update({ lead_status: "won" })
        .eq("id", clientId)
        .then(({ error }) => {
          if (error) { toast.error("Failed to update status"); return; }
          queryClient.invalidateQueries({ queryKey: ["ins-dash-clients-policy-book"] });
          queryClient.invalidateQueries({ queryKey: ["ins-dash-policies"] });
          toast.success("🎉 Client marked as WON! Upload their policy now.");
          setWonClientForUpload(clientId);
          setShowUploadPolicy(true);
        });
    } else {
      markStatus.mutate({ clientId, status });
    }
  }, [queryClient, markStatus]);

  // Merge into flat list
  const rows: PolicyRow[] = useMemo(() => {
    if (!clients || !policies) return [];
    const clientMap = new Map(clients.map(c => [c.id, c]));
    return policies
      .filter(p => !!p.client_id && clientMap.has(p.client_id))
      .map(p => {
        const c = clientMap.get(p.client_id || "");
        const rawPhone = c?.phone || "";
        const displayPhone = rawPhone.startsWith("IB_") ? null : rawPhone;
        const daysUntil = p.expiry_date ? differenceInDays(new Date(p.expiry_date), now) : null;
        return {
          id: p.id,
          client_id: p.client_id || "",
          policy_number: p.policy_number,
          customer_name: c?.customer_name || "—",
          agent_name: c?.advisor_name || "—",
          insurer: p.insurer,
          renewal_date: p.expiry_date,
          start_date: p.start_date,
          phone: displayPhone,
          rawPhone: rawPhone,
          email: c?.email || null,
          vehicle_number: c?.vehicle_number || null,
          vehicle_make: c?.vehicle_make || null,
          vehicle_model: c?.vehicle_model || null,
          premium: p.premium_amount ? Number(p.premium_amount) : null,
          status: p.status,
          policy_type: p.policy_type,
          plan_name: p.plan_name || null,
          product_type: c?.vehicle_make ? (c.vehicle_model?.toLowerCase().includes("activa") || c.vehicle_model?.toLowerCase().includes("splendor") || c.vehicle_model?.toLowerCase().includes("passion") || c.vehicle_model?.toLowerCase().includes("meteor") ? "Two Wheeler" : "Car") : null,
          daysUntilRenewal: daysUntil,
          lead_status: c?.lead_status || null,
          lead_source: c?.lead_source || null,
          created_at: p.created_at || null,
          policy_document_url: (p as any).policy_document_url || null,
        };
      });
  }, [clients, policies, now]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter(r => r.status === "active").length;
    const expired = rows.filter(r => r.daysUntilRenewal !== null && r.daysUntilRenewal < 0).length;
    const due7 = rows.filter(r => r.daysUntilRenewal !== null && r.daysUntilRenewal >= 0 && r.daysUntilRenewal <= 7).length;
    const due30 = rows.filter(r => r.daysUntilRenewal !== null && r.daysUntilRenewal >= 0 && r.daysUntilRenewal <= 30).length;
    const totalPremium = rows.reduce((sum, r) => sum + (r.premium || 0), 0);
    const won = rows.filter(r => r.lead_status?.toLowerCase() === "won").length;
    const lost = rows.filter(r => r.lead_status?.toLowerCase() === "lost").length;
    const running = rows.filter(r => r.lead_status?.toLowerCase() === "running").length;
    return { total, active, expired, due7, due30, totalPremium, won, lost, running };
  }, [rows]);

  // Filter + Search
  const filtered = useMemo(() => {
    let result = [...rows];

    // Calendar date range filter (by created_at)
    if (dateFrom) {
      result = result.filter(r => {
        if (!r.created_at) return false;
        return new Date(r.created_at) >= dateFrom;
      });
    }
    if (dateTo) {
      const toEnd = new Date(dateTo);
      toEnd.setHours(23, 59, 59, 999);
      result = result.filter(r => {
        if (!r.created_at) return false;
        return new Date(r.created_at) <= toEnd;
      });
    }

    // Days filter
    if (filter !== "all") {
      result = result.filter(r => {
        if (r.daysUntilRenewal === null) return false;
        if (filter === "expired") return r.daysUntilRenewal < 0;
        const days = parseInt(filter);
        return r.daysUntilRenewal >= 0 && r.daysUntilRenewal <= days;
      });
    }

    // Status filter (Won/Lost/Running/GrabYourCar)
    if (statusFilterVal !== "all") {
      if (statusFilterVal === "grabyourcar") {
        result = result.filter(r => r.lead_source?.toLowerCase().includes("grabyourcar") || r.lead_source?.toLowerCase().includes("grab"));
      } else {
        result = result.filter(r => r.lead_status?.toLowerCase() === statusFilterVal);
      }
    }

    // Pending docs filter
    if (showPendingDocs) {
      result = result.filter(r => !r.policy_number || r.policy_number === "N/A" || r.status === "pending");
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      if (searchField === "policy") {
        result = result.filter(r => r.policy_number?.toLowerCase().includes(s));
      } else if (searchField === "phone") {
        result = result.filter(r => r.phone?.includes(s));
      } else if (searchField === "vehicle") {
        result = result.filter(r => r.vehicle_number?.toLowerCase().includes(s));
      } else if (searchField === "insurer") {
        result = result.filter(r => r.insurer?.toLowerCase().includes(s));
      } else {
        result = result.filter(r =>
          r.customer_name?.toLowerCase().includes(s) ||
          r.policy_number?.toLowerCase().includes(s) ||
          r.phone?.includes(s) ||
          r.vehicle_number?.toLowerCase().includes(s) ||
          r.insurer?.toLowerCase().includes(s) ||
          r.agent_name?.toLowerCase().includes(s)
        );
      }
    }

    return result;
  }, [rows, filter, statusFilterVal, search, searchField, showPendingDocs, dateFrom, dateTo]);

   // Upcoming renewals: expiring within 60 days OR recently expired (within last 15 days) for actionability
  const upcomingRenewals = useMemo(() => {
    return rows
      .filter(r => r.daysUntilRenewal !== null && r.daysUntilRenewal >= -15 && r.daysUntilRenewal <= 60)
      .sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0));
  }, [rows]);

  // Grouped upcoming renewals by month
  const renewalsByMonth = useMemo(() => {
    const map = new Map<string, PolicyRow[]>();
    upcomingRenewals.forEach(r => {
      if (!r.renewal_date) return;
      const d = new Date(r.renewal_date);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMMM yyyy");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: format(new Date(key + "-01"), "MMMM yyyy"),
      items,
      totalPremium: items.reduce((s, r) => s + (r.premium || 0), 0),
    }));
  }, [upcomingRenewals]);

  // Grouped upcoming renewals by week
  const renewalsByWeek = useMemo(() => {
    const map = new Map<string, PolicyRow[]>();
    upcomingRenewals.forEach(r => {
      if (!r.renewal_date) return;
      const d = new Date(r.renewal_date);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const we = endOfWeek(d, { weekStartsOn: 1 });
      const key = format(ws, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => {
        const ws = new Date(key);
        const we = endOfWeek(ws, { weekStartsOn: 1 });
        return {
          key,
          label: `${format(ws, "dd MMM")} – ${format(we, "dd MMM yyyy")}`,
          items,
          totalPremium: items.reduce((s, r) => s + (r.premium || 0), 0),
        };
      });
  }, [upcomingRenewals]);

  // Grouped upcoming renewals by date
  const renewalsByDate = useMemo(() => {
    const map = new Map<string, PolicyRow[]>();
    upcomingRenewals.forEach(r => {
      if (!r.renewal_date) return;
      const key = format(new Date(r.renewal_date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        key,
        label: format(new Date(key), "dd MMM yyyy (EEEE)"),
        items,
        totalPremium: items.reduce((s, r) => s + (r.premium || 0), 0),
      }));
  }, [upcomingRenewals]);

  // Running policies (active, not expiring within 60 days)
  const runningPolicies = useMemo(() => {
    return rows
      .filter(r => r.status === "active" && r.daysUntilRenewal !== null && r.daysUntilRenewal > 60)
      .sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0));
  }, [rows]);

  // Expired / Closed policies
  const expiredPolicies = useMemo(() => {
    return rows
      .filter(r => r.daysUntilRenewal !== null && r.daysUntilRenewal < 0)
      .sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0));
  }, [rows]);

  // Follow-ups
  const followUps = useMemo(() => {
    return rows
      .filter(r => r.daysUntilRenewal !== null && r.daysUntilRenewal <= 7)
      .sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0));
  }, [rows]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const exportCSV = useCallback(() => {
    if (!filtered.length) return;
    const headers = ["Policy Number", "Customer Name", "Agent", "Insurance Company", "Renewal Date", "Days Left", "Mobile", "Email", "Vehicle No", "Premium", "Status", "Lead Status"];
    const csvRows = filtered.map(r => [
      r.policy_number, r.customer_name, r.agent_name, r.insurer,
      r.renewal_date ? format(new Date(r.renewal_date), "dd/MM/yyyy") : "",
      r.daysUntilRenewal ?? "",
      r.phone || "", r.email || "", r.vehicle_number || "", r.premium || "", r.status || "", r.lead_status || ""
    ]);
    const csv = [headers.join(","), ...csvRows.map(r => r.map(v => `"${v || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `policies-${format(now, "yyyy-MM-dd")}.csv`;
    a.click();
  }, [filtered, now]);

  // Reminder preview state
  const [reminderPreview, setReminderPreview] = useState<{ policy: PolicyRow; type: "notice" | "quote" } | null>(null);
  const [showUploadPolicy, setShowUploadPolicy] = useState(false);
  const [uploadTargetPolicyId, setUploadTargetPolicyId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [quoteModalPolicy, setQuoteModalPolicy] = useState<PolicyRow | null>(null);

  const handleBulkSendMessage = useCallback(async () => {
    const phonePolicies = filtered.filter(p => p.rawPhone && p.rawPhone.length >= 10);
    if (phonePolicies.length === 0) {
      toast.error("No policies with valid phone numbers found");
      return;
    }
    setBulkSending(true);
    let sent = 0, failed = 0;
    for (const p of phonePolicies) {
      try {
        const daysLeft = p.renewal_date ? differenceInDays(new Date(p.renewal_date), now) : null;
        const msg = `Hi ${p.customer_name || "Customer"},\nYour ${p.insurer || "insurance"} policy ${p.policy_number || ""} ${daysLeft !== null && daysLeft <= 0 ? "has expired" : `expires in ${daysLeft} days`}.\nRenew now to stay protected! 🚗\n— GrabYourCar Insurance`;
        const phone = p.rawPhone!.replace(/\D/g, "");
        const fullPhone = phone.startsWith("91") ? phone : `91${phone}`;
        
        await supabase.from("wa_message_logs").insert({
          phone: phone.length > 10 ? phone.slice(-10) : phone,
          customer_name: p.customer_name || null,
          message_type: "text",
          message_content: msg,
          trigger_event: "bulk_renewal_reminder",
          provider: "meta",
          status: "queued",
        });
        sent++;
      } catch {
        failed++;
      }
    }
    setBulkSending(false);
    toast.success(`Bulk message queued: ${sent} sent, ${failed} failed out of ${phonePolicies.length}`);
  }, [filtered, now]);

  const handleBulkSendNotification = useCallback(async () => {
    const policies = filtered.filter(p => p.renewal_date);
    if (policies.length === 0) {
      toast.error("No policies with renewal dates found");
      return;
    }
    setBulkSending(true);
    try {
      const logs = policies.map(p => ({
        client_id: p.client_id,
        activity_type: "renewal_reminder_sent",
        title: "Bulk renewal notification",
        description: `Reminder sent for ${p.insurer || "policy"} ${p.policy_number || ""}`,
      }));
      const BATCH = 50;
      for (let i = 0; i < logs.length; i += BATCH) {
        await supabase.from("insurance_activity_log").insert(logs.slice(i, i + BATCH));
      }
      toast.success(`Notifications logged for ${policies.length} policies`);
    } catch {
      toast.error("Failed to send notifications");
    }
    setBulkSending(false);
  }, [filtered]);

  const openReminderPreview = useCallback((r: PolicyRow, type: "notice" | "quote") => {
    setReminderPreview({ policy: r, type });
  }, []);

  const [shareDialogPolicy, setShareDialogPolicy] = useState<PolicyRow | null>(null);

  const getPolicyText = (r: PolicyRow) => {
    return `📋 *Policy Details*\n━━━━━━━━━━━━━━━━\n👤 Customer: ${r.customer_name}\n📄 Policy: ${r.policy_number || "N/A"}\n🏢 Insurer: ${r.insurer || "N/A"}\n🚗 Vehicle: ${r.vehicle_number || "N/A"}\n💰 Premium: ₹${r.premium?.toLocaleString("en-IN") || "N/A"}\n📅 Renewal: ${r.renewal_date ? format(new Date(r.renewal_date), "dd MMM yyyy") : "N/A"}\n⏳ Days Left: ${r.daysUntilRenewal !== null ? (r.daysUntilRenewal < 0 ? `Expired ${Math.abs(r.daysUntilRenewal)}d ago` : `${r.daysUntilRenewal} days`) : "N/A"}\n📱 Mobile: ${r.phone || "N/A"}\n✉️ Email: ${r.email || "N/A"}\n👨‍💼 Agent: ${r.agent_name || "N/A"}\n\n🔗 Powered by Grabyourcar Insurance`;
  };

  const downloadPolicyPDF = useCallback((r: PolicyRow) => {
    const text = getPolicyText(r).replace(/\*/g, "");
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `policy-${r.policy_number || r.customer_name}-${format(now, "yyyyMMdd")}.txt`;
    a.click();
    toast.success("Policy details downloaded!");
  }, [now]);

  const shareViaWhatsApp = useCallback(async (r: PolicyRow, phone: string) => {
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone, message: getPolicyText(r), name: r.customer_name });
  }, []);

  const shareViaEmail = useCallback((r: PolicyRow, email: string) => {
    const subject = encodeURIComponent(`Policy Details - ${r.customer_name} | ${r.policy_number || "N/A"}`);
    const body = encodeURIComponent(getPolicyText(r).replace(/\*/g, ""));
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    toast.success("Opening email client...");
  }, []);

  const getUrgencyColor = (days: number | null) => {
    if (days === null) return "text-muted-foreground";
    if (days < 0) return "text-destructive";
    if (days <= 7) return "text-destructive";
    if (days <= 15) return "text-chart-5";
    if (days <= 30) return "text-chart-4";
    return "text-chart-2";
  };

  const getUrgencyBg = (days: number | null) => {
    if (days === null) return "bg-muted/30";
    if (days < 0) return "bg-destructive/5 border-destructive/20";
    if (days <= 7) return "bg-destructive/5 border-destructive/20";
    if (days <= 15) return "bg-chart-5/5 border-chart-5/20";
    if (days <= 30) return "bg-chart-4/5 border-chart-4/20";
    return "bg-chart-2/5 border-chart-2/20";
  };

  const getUrgencyLabel = (days: number | null) => {
    if (days === null) return "N/A";
    if (days < 0) return `Expired ${Math.abs(days)}d ago`;
    if (days === 0) return "Today!";
    if (days === 1) return "Tomorrow";
    return `${days} days left`;
  };

  const pendingDocsCount = useMemo(() => {
    return rows.filter(r => !r.policy_number || r.policy_number === "N/A" || r.status === "pending").length;
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* ── PBPartners-style Header ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Booking Data</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Insurance Policy Book — All booked policies & documents</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 h-8 text-xs border-primary/30 text-primary hover:bg-primary/5">
            <Download className="h-3.5 w-3.5" /> Download Report
          </Button>
          <Button variant="default" size="sm" onClick={() => { setUploadTargetPolicyId(null); setShowUploadPolicy(true); }} className="gap-1.5 h-8 text-xs">
            <Upload className="h-3.5 w-3.5" /> Upload Policy Doc
          </Button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs cursor-pointer">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {dateFrom ? format(dateFrom, "dd MMM yyyy") : "Start"} - {dateTo ? format(dateTo, "dd MMM yyyy") : format(now, "dd MMM yyyy")}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="end">
              <div className="p-3 space-y-3">
                <div className="text-xs font-medium text-muted-foreground">Filter by Policy Created Date</div>
                <div className="flex gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">From</p>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(d) => { setDateFrom(d); setPage(0); }}
                      initialFocus
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">To</p>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(d) => { setDateTo(d); setPage(0); }}
                      className="rounded-md border"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setPage(0); setCalendarOpen(false); }}>
                    Clear
                  </Button>
                  <Button size="sm" className="text-xs h-7" onClick={() => setCalendarOpen(false)}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Stats Banner (compact) ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "Total Policies", value: stats.total, icon: FileText, gradient: "from-blue-500/10 to-blue-600/5", iconColor: "text-blue-600" },
          { label: "Active", value: stats.active, icon: CheckCircle2, gradient: "from-emerald-500/10 to-emerald-600/5", iconColor: "text-emerald-600" },
          { label: "Due 7 Days", value: stats.due7, icon: AlertTriangle, gradient: "from-red-500/10 to-red-600/5", iconColor: "text-red-600" },
          { label: "Won", value: stats.won, icon: Trophy, gradient: "from-emerald-500/10 to-emerald-600/5", iconColor: "text-emerald-600" },
          { label: "Lost", value: stats.lost, icon: XCircle, gradient: "from-red-500/10 to-red-600/5", iconColor: "text-red-600" },
          { label: "Premium", value: `₹${(stats.totalPremium / 1000).toFixed(0)}K`, icon: TrendingUp, gradient: "from-primary/10 to-primary/5", iconColor: "text-primary" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border bg-gradient-to-br ${s.gradient} p-3 hover:shadow-sm transition-all`}>
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</span>
            </div>
            <p className="text-lg font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs (PBPartners style) ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex">
              <button
                onClick={() => { setActiveTab("policies"); setShowPendingDocs(false); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "policies" && !showPendingDocs
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setActiveTab("policies"); setShowPendingDocs(true); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  showPendingDocs
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Pending Documents
                {pendingDocsCount > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 font-bold">
                    {pendingDocsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("renewals")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "renewals"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Upcoming
                {upcomingRenewals.length > 0 && (
                  <Badge variant="destructive" className="h-4 text-[10px] px-1">{upcomingRenewals.length}</Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab("running")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "running"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Play className="h-3.5 w-3.5" /> Running
              </button>
              <button
                onClick={() => setActiveTab("expired")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "expired"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <XCircle className="h-3.5 w-3.5" /> Expired
              </button>
              <button
                onClick={() => setActiveTab("followups")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "followups"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bell className="h-3.5 w-3.5" /> Follow-ups
                {followUps.length > 0 && (
                  <Badge variant="destructive" className="h-4 text-[10px] px-1">{followUps.length}</Badge>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Search & Filters Bar (PBPartners style) ── */}
        {activeTab === "policies" && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Product filter */}
            <Select value={statusFilterVal} onValueChange={(v) => { setStatusFilterVal(v as StatusFilter); setPage(0); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="won">✅ Won</SelectItem>
                <SelectItem value="lost">❌ Lost</SelectItem>
                <SelectItem value="running">🔄 Running</SelectItem>
                <SelectItem value="new">🆕 New</SelectItem>
                <SelectItem value="grabyourcar">🚗 GrabYourCar</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter} onValueChange={(v) => { setFilter(v as ViewFilter); setPage(0); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Policies</SelectItem>
                <SelectItem value="7">Due in 7 Days</SelectItem>
                <SelectItem value="15">Due in 15 Days</SelectItem>
                <SelectItem value="30">Due in 30 Days</SelectItem>
                <SelectItem value="60">Due in 60 Days</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            {/* Search field selector + input (PBPartners style) */}
            <Select value={searchField} onValueChange={(v: any) => setSearchField(v)}>
              <SelectTrigger className="w-[110px] h-8 text-xs rounded-r-none border-r-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="policy">Policy No</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="vehicle">Vehicle No</SelectItem>
                <SelectItem value="insurer">Insurer</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Input
                placeholder="Search..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="h-8 w-48 text-xs rounded-l-none pl-3"
              />
            </div>
            <Button size="sm" className="h-8 px-3 text-xs gap-1" onClick={() => setPage(0)}>
              <Search className="h-3 w-3" /> Search
            </Button>

            {/* Bulk actions */}
            <div className="border-l pl-2 ml-1 flex gap-1">
              <Button variant="secondary" size="sm" onClick={handleBulkSendMessage} disabled={bulkSending} className="gap-1 h-8 text-[10px] px-2">
                {bulkSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Bulk WA
              </Button>
              <Button variant="secondary" size="sm" onClick={handleBulkSendNotification} disabled={bulkSending} className="gap-1 h-8 text-[10px] px-2">
                {bulkSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                Notify All
              </Button>
              <Button
                variant={showBulkPanel ? "default" : "secondary"}
                size="sm"
                onClick={() => setShowBulkPanel(!showBulkPanel)}
                className="gap-1 h-8 text-[10px] px-2"
              >
                <FileSpreadsheet className="h-3 w-3" />
                {showBulkPanel ? "Hide Bulk" : "Bulk Quote/Share"}
              </Button>
            </div>
          </div>
        )}

        {/* ── All Policies Tab — PBPartners Style Row List ── */}
        <TabsContent value="policies" className="mt-3 space-y-3">
          {/* Bulk Quote/Share Panel */}
          {showBulkPanel && (
            <BulkQuoteSharePanel
              leads={filtered.map(r => ({
                id: r.client_id,
                customer_name: r.customer_name,
                phone: r.phone,
                email: r.email,
                vehicle_number: r.vehicle_number,
                vehicle_make: r.vehicle_make,
                vehicle_model: r.vehicle_model,
                current_insurer: r.insurer,
                policy_expiry_date: r.renewal_date,
                current_policy_type: r.policy_type,
                current_premium: r.premium,
                policy_number: r.policy_number,
                premium: r.premium,
                renewal_date: r.renewal_date,
              } as BulkLeadItem))}
              source="policy_book"
              onDone={() => setShowBulkPanel(false)}
            />
          )}
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {/* Policy Rows */}
              <div className="divide-y divide-border/60">
                {paged.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No policies found</p>
                    <p className="text-xs mt-1">Try adjusting your filters or search</p>
                  </div>
                ) : (
                  paged.map((r) => {
                    const isSaleComplete = r.status === "active";
                    const statusLabel = isSaleComplete ? "Sale Complete" : r.status === "cancelled" ? "Rejected" : r.status === "pending" ? "Pending" : r.status || "—";
                    const statusColor = isSaleComplete
                      ? "text-emerald-600"
                      : r.status === "cancelled"
                        ? "text-red-600"
                        : "text-amber-600";
                    const borderColor = isSaleComplete
                      ? "border-l-emerald-500"
                      : r.status === "cancelled"
                        ? "border-l-red-500"
                        : "border-l-amber-500";

                    return (
                      <div key={r.id} className={`px-4 py-3.5 hover:bg-muted/20 transition-colors group border-l-[3px] ${borderColor}`}>
                        {/* Row 1: Customer Name + Lead Status + Sale Status + Created Date */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <h4 className="font-bold text-[13px] text-foreground tracking-tight uppercase">{r.customer_name}</h4>
                            {r.policy_number && (
                              <span className="text-[10px] text-muted-foreground font-mono">LEAD ID:{r.policy_number.replace(/[^0-9]/g, '').slice(0, 10)}</span>
                            )}
                            <span className={`text-[11px] font-semibold ${statusColor}`}>{statusLabel}</span>
                            {getStatusBadge(r.lead_status)}
                          </div>
                          <p className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                            Created On - {r.created_at ? format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss") : "—"}
                          </p>
                        </div>

                        {/* Row 2: Insurer • Policy • Agent • Product(Plan) • More Info */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[11px] text-muted-foreground leading-relaxed">
                          <span>{r.insurer || "—"}</span>
                          <span className="text-muted-foreground/30 mx-0.5">•</span>
                          <span>Policy: {r.policy_number || "N/A"}</span>
                          <span className="text-muted-foreground/30 mx-0.5">•</span>
                          <span>Booked by {r.agent_name || "—"}</span>
                          <span className="text-muted-foreground/30 mx-0.5">•</span>
                          <span>{r.product_type || "Car"}({r.plan_name || r.policy_type || "—"})</span>
                          <button
                            onClick={() => setSelectedPolicy(r)}
                            className="text-primary hover:underline font-medium ml-1 text-[11px]"
                          >
                            More Info
                          </button>
                        </div>

                        {/* Row 3: Vehicle + Premium + Expiry + Action buttons */}
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 text-[11px] flex-wrap">
                            {r.vehicle_number && (
                              <span className="flex items-center gap-1 font-mono bg-muted/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                <Car className="h-3 w-3 text-muted-foreground" /> {r.vehicle_number}
                              </span>
                            )}
                            {r.vehicle_make && r.vehicle_model && (
                              <span className="text-muted-foreground text-[10px]">{r.vehicle_make} {r.vehicle_model}</span>
                            )}
                            <span className="font-bold text-foreground text-xs">₹{r.premium?.toLocaleString("en-IN") || "—"}</span>
                            {r.renewal_date && (
                              <span className={`font-medium text-[10px] ${getUrgencyColor(r.daysUntilRenewal)}`}>
                                Exp: {format(new Date(r.renewal_date), "dd MMM yyyy")}
                                {r.daysUntilRenewal !== null && ` (${getUrgencyLabel(r.daysUntilRenewal)})`}
                              </span>
                            )}
                          </div>

                          {/* PBPartners-style action icons */}
                          <div className="flex items-center gap-1.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 text-[10px] text-primary hover:text-primary hover:bg-primary/5 px-2"
                              onClick={async () => {
                                if (r.policy_document_url) {
                                  try {
                                    await openInsuranceStorageFile({ url: r.policy_document_url });
                                  } catch (error) {
                                    console.error("Failed to open policy document", error);
                                    toast.error("Could not open policy document");
                                  }
                                } else {
                                  setUploadTargetPolicyId(r.id);
                                  setShowUploadPolicy(true);
                                }
                              }}
                            >
                              {r.policy_document_url ? (
                                <><Eye className="h-3 w-3" /> View Doc</>
                              ) : (
                                <><Upload className="h-3 w-3" /> Upload Doc</>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-[10px] px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={() => setQuoteModalPolicy(r)}
                            >
                              <FileText className="h-3 w-3" /> Quote
                            </Button>
                            {r.phone && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" className="h-7 gap-1 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Send className="h-3 w-3" /> Remind
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem onClick={() => openReminderPreview(r, "notice")} className="cursor-pointer gap-2 text-xs">
                                    <Bell className="h-3.5 w-3.5" /> Renewal Notice
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openReminderPreview(r, "quote")} className="cursor-pointer gap-2 text-xs">
                                    <FileText className="h-3.5 w-3.5" /> Renewal Quote
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-1.5 gap-1 text-[10px]">
                                  {getStatusBadge(r.lead_status) || <Badge variant="outline" className="text-[10px] px-1.5 py-0">Mark</Badge>}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[120px]">
                                {LEAD_STATUS_OPTIONS.map(opt => (
                                  <DropdownMenuItem key={opt.value} onClick={() => handleMarkStatus(r.client_id, opt.value)} className="text-xs gap-2">
                                    <opt.icon className="h-3 w-3" /> {opt.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {/* View icon */}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/5" title="View Details"
                              onClick={() => setSelectedPolicy(r)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {/* Share/Download icon */}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" title="Share"
                              onClick={() => setShareDialogPolicy(r)}>
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                            {/* Download icon */}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Download"
                              onClick={() => downloadPolicyPDF(r)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                <span>
                  {filtered.length === 0 ? "No entries" : `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length} policies`}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 text-xs">
                    <ChevronLeft className="h-3 w-3 mr-1" /> Prev
                  </Button>
                  {/* Page numbers */}
                  {totalPages <= 7 && Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i}
                      variant={page === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i)}
                      className="h-7 w-7 text-xs p-0"
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 text-xs">
                    Next <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Renewals Tab */}
        <TabsContent value="renewals" className="mt-4">
          <div className="space-y-3">
            {/* Sub-filters: All / Month / Week / Date */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">View by:</span>
              {(["all", "month", "week", "date"] as RenewalViewMode[]).map(mode => (
                <Button
                  key={mode}
                  size="sm"
                  variant={renewalView === mode ? "default" : "outline"}
                  className="h-7 text-xs capitalize"
                  onClick={() => { setRenewalView(mode); setSelectedRenewalDate(""); }}
                >
                  {mode === "all" ? "All" : mode === "month" ? "📅 Month-wise" : mode === "week" ? "📆 Week-wise" : "📋 Date-wise"}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground ml-auto">{upcomingRenewals.length} renewals in next 60 days</span>
            </div>

            {upcomingRenewals.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No upcoming renewals in the next 60 days</p>
                </CardContent>
              </Card>
            ) : renewalView === "all" ? (
              <div className="grid gap-3">
                {upcomingRenewals.map(r => (
                  <RenewalCard key={r.id} r={r} getUrgencyBg={getUrgencyBg} getUrgencyColor={getUrgencyColor} getUrgencyLabel={getUrgencyLabel} getStatusBadge={getStatusBadge} openReminderPreview={openReminderPreview} setShareDialogPolicy={setShareDialogPolicy} setSelectedPolicy={setSelectedPolicy} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(renewalView === "month" ? renewalsByMonth : renewalView === "week" ? renewalsByWeek : renewalsByDate).map(group => (
                  <Card key={group.key} className="border shadow-sm">
                    <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setSelectedRenewalDate(selectedRenewalDate === group.key ? "" : group.key)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <CardTitle className="text-sm">{group.label}</CardTitle>
                          <Badge variant="secondary" className="text-xs">{group.items.length} policies</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">₹{group.totalPremium.toLocaleString("en-IN")}</span>
                          <ChevronRight className={`h-4 w-4 transition-transform ${selectedRenewalDate === group.key ? "rotate-90" : ""}`} />
                        </div>
                      </div>
                    </CardHeader>
                    {selectedRenewalDate === group.key && (
                      <CardContent className="pt-0 px-4 pb-3">
                        <div className="grid gap-2">
                          {group.items.map(r => (
                            <RenewalCard key={r.id} r={r} getUrgencyBg={getUrgencyBg} getUrgencyColor={getUrgencyColor} getUrgencyLabel={getUrgencyLabel} getStatusBadge={getStatusBadge} openReminderPreview={openReminderPreview} setShareDialogPolicy={setShareDialogPolicy} setSelectedPolicy={setSelectedPolicy} />
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Running Policies Tab */}
        <TabsContent value="running" className="mt-4">
          <div className="space-y-3">
            {runningPolicies.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Play className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No running policies with 60+ days remaining</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <Play className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold">{runningPolicies.length} active policies running smoothly</p>
                </div>
                {runningPolicies.map(r => (
                  <Card key={r.id} className="border transition-all hover:shadow-md bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900">
                    <CardContent className="py-3 px-4">
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{r.customer_name}</h4>
                            <Badge variant="outline" className="text-[10px] shrink-0 bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                            {getStatusBadge(r.lead_status)}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {r.policy_number || "N/A"}</span>
                            <span>{r.insurer}</span>
                            {r.vehicle_number && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {r.vehicle_number}</span>}
                            {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</span>}
                            <span className="font-semibold">₹{r.premium?.toLocaleString("en-IN") || "—"}</span>
                          </div>
                        </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-600">{r.daysUntilRenewal}d left</p>
                              <p className="text-xs text-muted-foreground">
                                Expires {r.renewal_date && format(new Date(r.renewal_date), "dd MMM yyyy")}
                              </p>
                            </div>
                            {r.phone && (
                              <Button
                                size="icon"
                                className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Send on WhatsApp"
                                onClick={() => void shareViaWhatsApp(r, r.phone)}
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            )}
...
                            {r.phone && (
                              <Button
                                size="icon"
                                className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Send on WhatsApp"
                                onClick={() => void shareViaWhatsApp(r, r.phone)}
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            )}
...
                            {r.phone && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => void shareViaWhatsApp(r, r.phone)}
                              >
                                WhatsApp
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => setSelectedPolicy(r)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="mt-4">
          <div className="space-y-3">
            {followUps.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No immediate follow-ups needed</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">{followUps.length} policies need immediate attention</p>
                </div>
                <div className="grid gap-2">
                  {followUps.map(r => (
                    <Card key={r.id} className={`border transition-all hover:shadow-md ${getUrgencyBg(r.daysUntilRenewal)}`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className={`h-4 w-4 shrink-0 ${getUrgencyColor(r.daysUntilRenewal)}`} />
                              <h4 className="font-semibold text-sm truncate">{r.customer_name}</h4>
                              <span className={`text-xs font-bold ${getUrgencyColor(r.daysUntilRenewal)}`}>
                                {getUrgencyLabel(r.daysUntilRenewal)}
                              </span>
                              {getStatusBadge(r.lead_status)}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1 pl-6">
                              <span>{r.policy_number}</span>
                              <span>{r.insurer}</span>
                              <span>₹{r.premium?.toLocaleString("en-IN") || "—"}</span>
                              {r.vehicle_number && <span>{r.vehicle_number}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {r.phone && (
                              <a href={`tel:${r.phone}`}>
                                <Button size="sm" className="gap-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                  <Phone className="h-3 w-3" /> Call Now
                                </Button>
                              </a>
                            )}
                            {r.phone && (
                              <a href={`https://wa.me/91${r.phone}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                                  WhatsApp
                                </Button>
                              </a>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                                  <Tag className="h-3 w-3" /> Mark
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {LEAD_STATUS_OPTIONS.map(opt => (
                                  <DropdownMenuItem key={opt.value} onClick={() => handleMarkStatus(r.client_id, opt.value)} className="text-xs gap-2">
                                    <opt.icon className="h-3 w-3" /> {opt.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => setSelectedPolicy(r)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Policy Detail Dialog */}
      {selectedPolicy && (
        <PolicyDetailDialog
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          onShare={() => setShareDialogPolicy(selectedPolicy)}
          onMarkStatus={(status) => handleMarkStatus(selectedPolicy.client_id, status)}
          onSendReminder={(type) => openReminderPreview(selectedPolicy, type)}
        />
      )}

      {shareDialogPolicy && (
        <SharePolicyDialog
          policy={shareDialogPolicy}
          onClose={() => setShareDialogPolicy(null)}
          onDownload={downloadPolicyPDF}
          onWhatsApp={shareViaWhatsApp}
          onEmail={shareViaEmail}
        />
      )}

      {reminderPreview && (
        <ReminderPreviewDialog
          policy={reminderPreview.policy}
          templateType={reminderPreview.type}
          onClose={() => setReminderPreview(null)}
        />
      )}

      {/* Upload Policy Dialog */}
      <Dialog open={showUploadPolicy} onOpenChange={(open) => { setShowUploadPolicy(open); if (!open) { setWonClientForUpload(null); setUploadTargetPolicyId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Upload Policy Document
            </DialogTitle>
          </DialogHeader>
          <InsurancePolicyDocumentUploader
            defaultPolicyId={uploadTargetPolicyId || undefined}
            defaultClientId={wonClientForUpload || undefined}
            onDone={() => {
              setShowUploadPolicy(false);
              queryClient.invalidateQueries({ queryKey: ["ins-dash-policies"] });
              queryClient.invalidateQueries({ queryKey: ["ins-dash-clients-policy-book"] });
            }}
          />
        </DialogContent>
      </Dialog>
      {/* Quote Modal for Policy Book */}
      {quoteModalPolicy && (
        <InsuranceQuoteModal
          open={!!quoteModalPolicy}
          onOpenChange={() => setQuoteModalPolicy(null)}
          client={{
            customer_name: quoteModalPolicy.customer_name,
            phone: quoteModalPolicy.phone || "",
            email: quoteModalPolicy.email,
            city: null,
            vehicle_make: quoteModalPolicy.vehicle_make,
            vehicle_model: quoteModalPolicy.vehicle_model,
            vehicle_number: quoteModalPolicy.vehicle_number,
            vehicle_year: null,
            current_insurer: quoteModalPolicy.insurer,
            current_policy_type: quoteModalPolicy.policy_type,
            ncb_percentage: null,
            current_premium: quoteModalPolicy.premium,
          }}
        />
      )}
    </div>
  );
}

// ── Renewal Card (reusable) ──
function RenewalCard({ r, getUrgencyBg, getUrgencyColor, getUrgencyLabel, getStatusBadge, openReminderPreview, setShareDialogPolicy, setSelectedPolicy }: {
  r: PolicyRow;
  getUrgencyBg: (d: number | null) => string;
  getUrgencyColor: (d: number | null) => string;
  getUrgencyLabel: (d: number | null) => string;
  getStatusBadge: (s: string | null) => React.ReactNode;
  openReminderPreview: (r: PolicyRow, type: "notice" | "quote") => void;
  setShareDialogPolicy: (r: PolicyRow) => void;
  setSelectedPolicy: (r: PolicyRow) => void;
}) {
  return (
    <Card className={`border transition-all hover:shadow-md ${getUrgencyBg(r.daysUntilRenewal)}`}>
      <CardContent className="py-3 px-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{r.customer_name}</h4>
              <Badge variant="outline" className="text-[10px] shrink-0">{r.policy_type || "Policy"}</Badge>
              {getStatusBadge(r.lead_status)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {r.policy_number || "N/A"}</span>
              <span>{r.insurer}</span>
              {r.vehicle_number && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {r.vehicle_number}</span>}
              {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className={`text-sm font-bold ${getUrgencyColor(r.daysUntilRenewal)}`}>
                {getUrgencyLabel(r.daysUntilRenewal)}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.renewal_date && format(new Date(r.renewal_date), "dd MMM yyyy")}
              </p>
              <p className="text-xs font-semibold mt-0.5">₹{r.premium?.toLocaleString("en-IN") || "—"}</p>
            </div>
            <div className="flex flex-col gap-1">
              {r.phone && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-7 gap-1 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Send className="h-3 w-3" /> Remind
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => openReminderPreview(r, "notice")} className="cursor-pointer gap-2">
                      <Bell className="h-3.5 w-3.5" /> Renewal Notice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openReminderPreview(r, "quote")} className="cursor-pointer gap-2">
                      <FileText className="h-3.5 w-3.5" /> Renewal Quote
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {r.phone && (
                <a href={`tel:${r.phone}`}>
                  <Button size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white" title="Call Now">
                    <Phone className="h-3 w-3" />
                  </Button>
                </a>
              )}
              <Button variant="outline" size="icon" className="h-7 w-7" title="Share"
                onClick={() => setShareDialogPolicy(r)}>
                <Share2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Policy Detail Dialog ──
function PolicyDetailDialog({
  policy, onClose, onShare, onMarkStatus, onSendReminder
}: {
  policy: PolicyRow;
  onClose: () => void;
  onShare: () => void;
  onMarkStatus: (status: string) => void;
  onSendReminder: (type: "notice" | "quote") => void;
}) {
  const reminderDays = [60, 30, 15, 7, 1];

  const getReminderStatus = (days: number) => {
    if (policy.daysUntilRenewal === null) return "pending";
    if (policy.daysUntilRenewal <= days) return "sent";
    return "scheduled";
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Policy Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{policy.customer_name}</h3>
              {getStatusBadge(policy.lead_status)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
              {policy.phone && (
                <a href={`tel:${policy.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3 w-3" /> {policy.phone}
                </a>
              )}
              {policy.email && (
                <a href={`mailto:${policy.email}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Mail className="h-3 w-3" /> {policy.email}
                </a>
              )}
            </div>
          </div>

          {/* Mark Status */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Mark Client Status</Label>
            <div className="flex gap-2 flex-wrap">
              {LEAD_STATUS_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  variant={policy.lead_status?.toLowerCase() === opt.value ? "default" : "outline"}
                  size="sm"
                  className={`gap-1.5 text-xs ${
                    policy.lead_status?.toLowerCase() === opt.value
                      ? opt.value === "won" ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : opt.value === "lost" ? "bg-red-600 hover:bg-red-700 text-white"
                        : opt.value === "running" ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                      : ""
                  }`}
                  onClick={() => onMarkStatus(opt.value)}
                >
                  <opt.icon className="h-3 w-3" /> {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Policy Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Policy Number", value: policy.policy_number },
              { label: "Policy Type", value: policy.policy_type },
              { label: "Insurance Company", value: policy.insurer },
              { label: "Agent / Advisor", value: policy.agent_name },
              { label: "Vehicle Number", value: policy.vehicle_number },
              { label: "Premium Amount", value: policy.premium ? `₹${policy.premium.toLocaleString("en-IN")}` : null },
              { label: "Start Date", value: policy.start_date ? format(new Date(policy.start_date), "dd MMM yyyy") : null },
              { label: "Renewal Date", value: policy.renewal_date ? format(new Date(policy.renewal_date), "dd MMM yyyy") : null },
            ].map(item => (
              <div key={item.label} className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium">{item.value || "—"}</p>
              </div>
            ))}
          </div>

          {/* Renewal Reminders Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-primary" /> Renewal Reminders
            </h4>
            <div className="space-y-1.5">
              {reminderDays.map(d => {
                const status = getReminderStatus(d);
                return (
                  <div key={d} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                    status === "sent" ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700" : "bg-muted/30 text-muted-foreground"
                  }`}>
                    <span className="font-medium">{d}-day reminder</span>
                    <Badge variant={status === "sent" ? "default" : "secondary"} className={`text-[10px] h-5 ${status === "sent" ? "bg-emerald-600" : ""}`}>
                      {status === "sent" ? "✓ Triggered" : "Scheduled"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {policy.phone && (
              <a href={`tel:${policy.phone}`}>
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Phone className="h-3.5 w-3.5" /> Call Now
                </Button>
              </a>
            )}
            {policy.phone && (
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onSendReminder("notice")}>
                <Bell className="h-3.5 w-3.5" /> Renewal Notice
              </Button>
            )}
            {policy.phone && (
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onSendReminder("quote")}>
                <FileText className="h-3.5 w-3.5" /> Renewal Quote
              </Button>
            )}
            {policy.email && (
              <a href={`mailto:${policy.email}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onShare}>
              <Share2 className="h-3.5 w-3.5" /> Share Details
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={() => {
                const text = `Policy: ${policy.policy_number}\nCustomer: ${policy.customer_name}\nInsurer: ${policy.insurer}\nRenewal: ${policy.renewal_date ? format(new Date(policy.renewal_date), "dd MMM yyyy") : "N/A"}\nPremium: ₹${policy.premium?.toLocaleString("en-IN") || "N/A"}`;
                navigator.clipboard.writeText(text);
                toast.success("Copied!");
              }}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reminder Preview & Edit Dialog (Policy vs Renewal Quote separated) ──
function ReminderPreviewDialog({
  policy, templateType, onClose
}: {
  policy: PolicyRow;
  templateType: "notice" | "quote";
  onClose: () => void;
}) {
  const [activeTemplate, setActiveTemplate] = useState(templateType);
  const [editMode, setEditMode] = useState(false);
  const [sending, setSending] = useState(false);

  // ── CURRENT POLICY fields (read from DB, editable for correction) ──
  const [customerName, setCustomerName] = useState(policy.customer_name || "Valued Customer");
  const [vehicleNumber, setVehicleNumber] = useState(policy.vehicle_number || "");
  const [currentInsurer, setCurrentInsurer] = useState(policy.insurer || "");
  const [currentPolicyNumber, setCurrentPolicyNumber] = useState(policy.policy_number || "");
  const [currentPremium, setCurrentPremium] = useState(policy.premium ? String(policy.premium) : "");
  const [expiryDate, setExpiryDate] = useState(policy.renewal_date || "");
  const [phone, setPhone] = useState(policy.phone || "");

  // ── RENEWAL QUOTE fields (agent fills for the new quote) ──
  const [renewalInsurer, setRenewalInsurer] = useState("");
  const [renewalPremium, setRenewalPremium] = useState("");
  const [renewalPolicyType, setRenewalPolicyType] = useState(policy.policy_type || "Comprehensive");
  const [renewalIdv, setRenewalIdv] = useState("");
  const [renewalNcb, setRenewalNcb] = useState("");
  const [renewalAddons, setRenewalAddons] = useState("Zero Depreciation, RSA, Engine Protect");
  const [quoteValidity, setQuoteValidity] = useState("7 days");

  const daysLeft = expiryDate ? Math.max(0, differenceInDays(new Date(expiryDate), new Date())) : 0;
  const formattedExpiry = expiryDate ? format(new Date(expiryDate), "dd MMM yyyy") : "N/A";
  const formattedCurrentPremium = currentPremium ? `₹${Number(currentPremium).toLocaleString("en-IN")}` : "N/A";
  const formattedRenewalPremium = renewalPremium ? `₹${Number(renewalPremium).toLocaleString("en-IN")}` : "To be confirmed";

  // ── RENEWAL NOTICE: focuses on urgency + current policy ──
  const buildNotice = () => {
    return `🚗 *Grabyourcar Policy Renewal Reminder*
━━━━━━━━━━━━━━━━━━━━━

Hello *${customerName}*,

We hope you are enjoying a smooth and safe drive!

This is a friendly reminder from *Grabyourcar Insurance Desk* that your vehicle${vehicleNumber ? ` *(${vehicleNumber})*` : ""} insurance policy is set to expire on *${formattedExpiry}* — just *${daysLeft} days* to go.

📋 *Your Current Policy:*
${currentPolicyNumber ? `📄 Policy No: ${currentPolicyNumber}\n` : ""}${currentInsurer ? `🏢 Insurer: ${currentInsurer}\n` : ""}${currentPremium ? `💰 Current Premium: ${formattedCurrentPremium}\n` : ""}${vehicleNumber ? `🚗 Vehicle: ${vehicleNumber}\n` : ""}
Renewing your policy before the expiry helps you:

✅ Avoid inspection hassles
✅ Maintain your No Claim Bonus
✅ Stay financially protected
✅ Ensure uninterrupted coverage

Our team has already prepared renewal assistance for you to make the process quick and seamless.

👉 Simply *reply to this message* or click below to get your renewal quote instantly.

🔗 Renew Now: https://www.grabyourcar.com/insurance

📞 +91 98559 24442
🌐 www.grabyourcar.com

Thank you for trusting *Grabyourcar* — we look forward to protecting your journeys ahead.

Drive safe! 🚘`.replace(/\n{3,}/g, "\n\n");
  };

  // ── RENEWAL QUOTE: focuses on NEW quote details + comparison ──
  const buildQuote = () => {
    return `🚗 *Grabyourcar — Renewal Quote*
━━━━━━━━━━━━━━━━━━━━━

Dear *${customerName}*,

Your personalized renewal quote for${vehicleNumber ? ` *${vehicleNumber}*` : " your vehicle"} is ready!

📋 *Current Policy (Expiring):*
${currentPolicyNumber ? `📄 Policy No: ${currentPolicyNumber}\n` : ""}${currentInsurer ? `🏢 Current Insurer: ${currentInsurer}\n` : ""}${currentPremium ? `💰 Current Premium: ${formattedCurrentPremium}\n` : ""}📅 Expiry Date: ${formattedExpiry}

━━━━━━━━━━━━━━━━━━━━━

💰 *Renewal Quote Details:*
${renewalInsurer ? `🏢 Proposed Insurer: ${renewalInsurer}\n` : ""}💵 *Renewal Premium: ${formattedRenewalPremium}*
📑 Policy Type: ${renewalPolicyType}
${renewalIdv ? `🏷️ IDV: ₹${Number(renewalIdv).toLocaleString("en-IN")}\n` : ""}${renewalNcb ? `🎯 NCB Discount: ${renewalNcb}%\n` : ""}${renewalAddons ? `🛡️ Add-ons: ${renewalAddons}\n` : ""}📅 Quote Valid: ${quoteValidity}
${currentPremium && renewalPremium ? `\n📊 *Comparison:*\n💰 Current: ${formattedCurrentPremium}\n💵 Renewal: ${formattedRenewalPremium}\n${Number(renewalPremium) < Number(currentPremium) ? `✅ You save: ₹${(Number(currentPremium) - Number(renewalPremium)).toLocaleString("en-IN")}` : `📈 Difference: ₹${Math.abs(Number(renewalPremium) - Number(currentPremium)).toLocaleString("en-IN")}`}` : ""}

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
  };

  const currentMessage = activeTemplate === "notice" ? buildNotice() : buildQuote();

  const sendViaWhatsAppLink = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) { toast.error("Enter a valid phone number"); return; }
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: cleanPhone, message: currentMessage, logEvent: activeTemplate === "notice" ? "renewal_notice" : "renewal_quote" });
    onClose();
  };

  const sendViaAPI = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) { toast.error("Enter a valid phone number"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("insurance-renewal-engine", {
        body: {
          action: "send_single",
          client_id: policy.client_id,
          policy_id: policy.id,
          custom_message: currentMessage,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Reminder sent automatically via WhatsApp API!");
      } else {
        toast.error(data?.error || "Failed to send via API, try WhatsApp link instead");
      }
    } catch (err: any) {
      console.error("API send error:", err);
      toast.error("API send failed — try WhatsApp link instead");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="h-5 w-5 text-emerald-600" />
            Preview & Send — {activeTemplate === "notice" ? "Renewal Notice" : "Renewal Quote"}
          </DialogTitle>
        </DialogHeader>

        {/* Template Toggle */}
        <div className="flex gap-2">
          <Button
            variant={activeTemplate === "notice" ? "default" : "outline"}
            size="sm"
            className={`gap-1.5 text-xs flex-1 ${activeTemplate === "notice" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            onClick={() => setActiveTemplate("notice")}
          >
            <Bell className="h-3.5 w-3.5" /> Renewal Notice
          </Button>
          <Button
            variant={activeTemplate === "quote" ? "default" : "outline"}
            size="sm"
            className={`gap-1.5 text-xs flex-1 ${activeTemplate === "quote" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            onClick={() => setActiveTemplate("quote")}
          >
            <FileText className="h-3.5 w-3.5" /> Renewal Quote
          </Button>
        </div>

        {/* Editable Details - SEPARATED sections */}
        {editMode ? (
          <div className="space-y-3 p-3 rounded-xl border bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Edit className="h-3.5 w-3.5" /> Update Details Before Sending
              </Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditMode(false)}>
                Done Editing
              </Button>
            </div>

            {/* Current Policy Section */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b pb-1">📋 Current Policy Details</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Customer Name</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Phone Number</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Vehicle Number</Label>
                  <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Current Insurer</Label>
                  <Input value={currentInsurer} onChange={e => setCurrentInsurer(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Current Policy No</Label>
                  <Input value={currentPolicyNumber} onChange={e => setCurrentPolicyNumber(e.target.value)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Current Premium (₹)</Label>
                  <Input type="number" value={currentPremium} onChange={e => setCurrentPremium(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase text-muted-foreground">Expiry Date</Label>
                  <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            {/* Renewal Quote Section - only shown for quote template */}
            {activeTemplate === "quote" && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 border-b border-emerald-200 pb-1">💰 Renewal Quote Details (New)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Proposed Insurer</Label>
                    <Input value={renewalInsurer} onChange={e => setRenewalInsurer(e.target.value)} className="h-8 text-xs" placeholder="e.g. HDFC ERGO, ICICI Lombard" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Renewal Premium (₹)</Label>
                    <Input type="number" value={renewalPremium} onChange={e => setRenewalPremium(e.target.value)} className="h-8 text-xs" placeholder="New premium amount" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Policy Type</Label>
                    <Input value={renewalPolicyType} onChange={e => setRenewalPolicyType(e.target.value)} className="h-8 text-xs" placeholder="Comprehensive / TP" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">IDV (₹)</Label>
                    <Input type="number" value={renewalIdv} onChange={e => setRenewalIdv(e.target.value)} className="h-8 text-xs" placeholder="Insured Declared Value" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">NCB Discount (%)</Label>
                    <Input value={renewalNcb} onChange={e => setRenewalNcb(e.target.value)} className="h-8 text-xs" placeholder="e.g. 50" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Quote Validity</Label>
                    <Input value={quoteValidity} onChange={e => setQuoteValidity(e.target.value)} className="h-8 text-xs" placeholder="e.g. 7 days" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">Add-ons Included</Label>
                    <Input value={renewalAddons} onChange={e => setRenewalAddons(e.target.value)} className="h-8 text-xs" placeholder="Zero Dep, RSA, Engine Protect..." />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Current Policy Summary */}
            <div className="p-3 rounded-xl bg-muted/30 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">📋 Current Policy</span>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => setEditMode(true)}>
                  <Edit className="h-3 w-3" /> Edit Details
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{customerName}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{phone || "—"}</span></div>
                <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-mono font-medium">{vehicleNumber || "—"}</span></div>
                <div><span className="text-muted-foreground">Insurer:</span> <span className="font-medium">{currentInsurer || "—"}</span></div>
                <div><span className="text-muted-foreground">Policy:</span> <span className="font-medium">{currentPolicyNumber || "—"}</span></div>
                <div><span className="text-muted-foreground">Premium:</span> <span className="font-semibold">{formattedCurrentPremium}</span></div>
                <div><span className="text-muted-foreground">Expiry:</span> <span className="font-medium">{formattedExpiry}</span></div>
                <div><span className="text-muted-foreground">Days Left:</span> <span className="font-bold">{daysLeft}</span></div>
              </div>
            </div>

            {/* Renewal Quote Summary - only for quote */}
            {activeTemplate === "quote" && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">💰 Renewal Quote (New)</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-emerald-600" onClick={() => setEditMode(true)}>
                    <Edit className="h-3 w-3" /> Fill Quote
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-muted-foreground">Insurer:</span> <span className="font-medium">{renewalInsurer || "—"}</span></div>
                  <div><span className="text-muted-foreground">Premium:</span> <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formattedRenewalPremium}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{renewalPolicyType}</span></div>
                  <div><span className="text-muted-foreground">IDV:</span> <span className="font-medium">{renewalIdv ? `₹${Number(renewalIdv).toLocaleString("en-IN")}` : "—"}</span></div>
                  <div><span className="text-muted-foreground">NCB:</span> <span className="font-medium">{renewalNcb ? `${renewalNcb}%` : "—"}</span></div>
                  <div><span className="text-muted-foreground">Valid:</span> <span className="font-medium">{quoteValidity}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Add-ons:</span> <span className="font-medium">{renewalAddons || "—"}</span></div>
                </div>
                {currentPremium && renewalPremium && (
                  <div className={`mt-2 text-xs font-bold ${Number(renewalPremium) <= Number(currentPremium) ? "text-emerald-700" : "text-chart-5"}`}>
                    {Number(renewalPremium) <= Number(currentPremium)
                      ? `✅ Client saves ₹${(Number(currentPremium) - Number(renewalPremium)).toLocaleString("en-IN")}`
                      : `📈 ₹${(Number(renewalPremium) - Number(currentPremium)).toLocaleString("en-IN")} increase from current`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Preview */}
        <div className="rounded-xl border bg-[#e5ddd5] dark:bg-[#0b141a] p-3 max-h-48 overflow-y-auto">
          <div className="bg-white dark:bg-[#1f2c34] rounded-lg p-3 shadow-sm max-w-[95%]">
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans text-foreground">
              {currentMessage}
            </pre>
            <p className="text-[9px] text-muted-foreground text-right mt-1">Preview</p>
          </div>
        </div>

        {/* Attached notice info for quote */}
        {activeTemplate === "quote" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs">
            <Shield className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-blue-700 dark:text-blue-400">
              <strong>Renewal Notice attached:</strong> Current policy details + new quote comparison included in the message
            </span>
          </div>
        )}

        {/* Send Actions */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="gap-1.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={sendViaWhatsAppLink}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Send via WhatsApp
            </Button>
            <Button
              className="gap-1.5 h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
              onClick={sendViaAPI}
              disabled={sending}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              {sending ? "Sending..." : "Auto-Send via API"}
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground">
            💡 "WhatsApp" opens wa.me link • "Auto-Send" triggers WhatsApp API directly
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Share Policy Dialog ──
function SharePolicyDialog({
  policy, onClose, onDownload, onWhatsApp, onEmail
}: {
  policy: PolicyRow;
  onClose: () => void;
  onDownload: (r: PolicyRow) => void;
  onWhatsApp: (r: PolicyRow, phone: string) => void;
  onEmail: (r: PolicyRow, email: string) => void;
}) {
  const [whatsappNumber, setWhatsappNumber] = useState(policy.phone || "");
  const [emailAddress, setEmailAddress] = useState(policy.email || "");

  const daysLeft = policy.renewal_date
    ? differenceInDays(new Date(policy.renewal_date), new Date())
    : null;

  const buildRenewalNotice = () => {
    return `🚗 *Grabyourcar — Renewal Notice*
━━━━━━━━━━━━━━━━━━━━━

Dear *${policy.customer_name || "Valued Customer"}*,

This is a formal notice from *Grabyourcar Insurance Desk* regarding your motor insurance renewal.

📋 *Policy Details:*
📄 Policy No: ${policy.policy_number || "N/A"}
🏢 Insurer: ${policy.insurer || "N/A"}
🚗 Vehicle: ${policy.vehicle_number || "N/A"}
💰 Premium: ₹${policy.premium?.toLocaleString("en-IN") || "N/A"}
📅 Renewal Date: ${policy.renewal_date ? format(new Date(policy.renewal_date), "dd MMM yyyy") : "N/A"}
${daysLeft !== null ? `⏳ Days Remaining: *${daysLeft <= 0 ? "EXPIRED" : daysLeft + " days"}*` : ""}

⚠️ *Important:*
Renewing on time ensures:
✅ No inspection required
✅ No Claim Bonus preserved
✅ Continuous coverage protection

Please contact us to process your renewal immediately.

📞 +91 98559 24442
🌐 www.grabyourcar.com

— *Grabyourcar Insurance* 🛡️`;
  };

  const buildRenewalQuote = () => {
    return `🚗 *Grabyourcar — Renewal Quote*
━━━━━━━━━━━━━━━━━━━━━

Dear *${policy.customer_name || "Valued Customer"}*,

Thank you for choosing Grabyourcar for your motor insurance needs! Here's your personalized renewal quote:

📋 *Current Policy:*
📄 Policy: ${policy.policy_number || "N/A"}
🏢 Insurer: ${policy.insurer || "N/A"}
🚗 Vehicle: ${policy.vehicle_number || "N/A"}
📅 Expiry: ${policy.renewal_date ? format(new Date(policy.renewal_date), "dd MMM yyyy") : "N/A"}

💰 *Renewal Premium: ₹${policy.premium?.toLocaleString("en-IN") || "N/A"}*

🎁 *Benefits of Renewing with Grabyourcar:*
✅ Best market rates guaranteed
✅ Hassle-free claim settlement
✅ 24/7 roadside assistance
✅ No Claim Bonus protection
✅ Dedicated insurance advisor

👉 *Reply "RENEW" to confirm* or call us for custom quotes from multiple insurers.

📞 +91 98559 24442
🌐 www.grabyourcar.com

— *Grabyourcar Insurance* 🛡️`;
  };

  const sendTemplateViaWhatsApp = async (template: string) => {
    const phone = whatsappNumber.replace(/\D/g, "");
    if (!phone) { toast.error("Enter a valid phone number"); return; }
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone, message: template, logEvent: "template_send" });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-5 w-5 text-emerald-600" />
            Share Policy — {policy.customer_name}
          </DialogTitle>
        </DialogHeader>

        {/* Policy Preview Card */}
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div><span className="text-muted-foreground">Policy:</span> <span className="font-medium">{policy.policy_number || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Insurer:</span> <span className="font-medium">{policy.insurer || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-mono font-medium">{policy.vehicle_number || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Premium:</span> <span className="font-semibold text-emerald-700 dark:text-emerald-400">₹{policy.premium?.toLocaleString("en-IN") || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Renewal:</span> <span className="font-medium">{policy.renewal_date ? format(new Date(policy.renewal_date), "dd MMM yyyy") : "N/A"}</span></div>
            <div><span className="text-muted-foreground">Agent:</span> <span className="font-medium">{policy.agent_name || "N/A"}</span></div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Renewal Notice & Quote */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="gap-1.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={() => sendTemplateViaWhatsApp(buildRenewalNotice())}
            >
              <Bell className="h-3.5 w-3.5" /> Renewal Notice
            </Button>
            <Button
              className="gap-1.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={() => sendTemplateViaWhatsApp(buildRenewalQuote())}
            >
              <FileText className="h-3.5 w-3.5" /> Renewal Quote
            </Button>
          </div>

          {/* Download */}
          <Button
            variant="outline"
            className="w-full gap-2 h-10 justify-start border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={() => { onDownload(policy); onClose(); }}
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Download Policy Copy</span>
          </Button>

          {/* WhatsApp */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> Send via WhatsApp
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter WhatsApp number"
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                disabled={!whatsappNumber.replace(/\D/g, "")}
                onClick={() => { onWhatsApp(policy, whatsappNumber); onClose(); }}
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-emerald-600" /> Send via Email
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={emailAddress}
                onChange={e => setEmailAddress(e.target.value)}
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                disabled={!emailAddress.includes("@")}
                onClick={() => { onEmail(policy, emailAddress); onClose(); }}
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </div>

          {/* Copy */}
          <Button
            variant="ghost"
            className="w-full gap-2 h-9 text-xs text-muted-foreground hover:text-emerald-700"
            onClick={() => {
              const text = `Policy: ${policy.policy_number}\nCustomer: ${policy.customer_name}\nInsurer: ${policy.insurer}\nVehicle: ${policy.vehicle_number}\nPremium: ₹${policy.premium?.toLocaleString("en-IN") || "N/A"}\nRenewal: ${policy.renewal_date ? format(new Date(policy.renewal_date), "dd MMM yyyy") : "N/A"}\nAgent: ${policy.agent_name}`;
              navigator.clipboard.writeText(text);
              toast.success("Copied to clipboard!");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy to Clipboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

