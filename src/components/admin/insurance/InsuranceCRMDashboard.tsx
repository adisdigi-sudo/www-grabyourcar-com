import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, FileText, AlertTriangle, Clock, Search,
  Download, ChevronLeft, ChevronRight, Phone, Mail,
  Share2, Bell, CalendarDays, ArrowRight, Copy, ExternalLink,
  Shield, Car, TrendingUp, CheckCircle2, MessageSquare, PhoneCall,
  Eye, Send
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, addDays, differenceInDays, isBefore, isAfter } from "date-fns";

type ViewFilter = "all" | "7" | "15" | "30" | "60" | "expired";

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
  daysUntilRenewal: number | null;
};

export function InsuranceCRMDashboard() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [page, setPage] = useState(0);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyRow | null>(null);
  const [activeTab, setActiveTab] = useState("policies");
  const pageSize = 12;

  // Use a stable "now" for the component lifecycle
  const now = useMemo(() => new Date(), []);

  const { data: clients } = useQuery({
    queryKey: ["ins-dash-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, vehicle_number, advisor_name")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["ins-dash-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("id, client_id, policy_number, insurer, premium_amount, expiry_date, status, start_date, policy_type")
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Merge into flat list with days calculation
  const rows: PolicyRow[] = useMemo(() => {
    if (!clients || !policies) return [];
    const clientMap = new Map(clients.map(c => [c.id, c]));
    return policies.map(p => {
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
        premium: p.premium_amount ? Number(p.premium_amount) : null,
        status: p.status,
        policy_type: p.policy_type,
        daysUntilRenewal: daysUntil,
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
    return { total, active, expired, due7, due30, totalPremium };
  }, [rows]);

  // Filter + Search
  const filtered = useMemo(() => {
    let result = [...rows];

    if (filter !== "all") {
      result = result.filter(r => {
        if (r.daysUntilRenewal === null) return false;
        if (filter === "expired") return r.daysUntilRenewal < 0;
        const days = parseInt(filter);
        return r.daysUntilRenewal >= 0 && r.daysUntilRenewal <= days;
      });
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.customer_name?.toLowerCase().includes(s) ||
        r.policy_number?.toLowerCase().includes(s) ||
        r.phone?.includes(s) ||
        r.vehicle_number?.toLowerCase().includes(s) ||
        r.insurer?.toLowerCase().includes(s) ||
        r.agent_name?.toLowerCase().includes(s)
      );
    }

    return result;
  }, [rows, filter, search]);

  // Upcoming renewals (next 60 days, sorted by urgency)
  const upcomingRenewals = useMemo(() => {
    return rows
      .filter(r => r.daysUntilRenewal !== null && r.daysUntilRenewal >= 0 && r.daysUntilRenewal <= 60)
      .sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0));
  }, [rows]);

  // Follow-ups: expired + due in 7 days
  const followUps = useMemo(() => {
    return rows
      .filter(r => r.daysUntilRenewal !== null && r.daysUntilRenewal <= 7)
      .sort((a, b) => (a.daysUntilRenewal || 0) - (b.daysUntilRenewal || 0));
  }, [rows]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const exportCSV = useCallback(() => {
    if (!filtered.length) return;
    const headers = ["Policy Number", "Customer Name", "Agent", "Insurance Company", "Renewal Date", "Days Left", "Mobile", "Email", "Vehicle No", "Premium", "Status"];
    const csvRows = filtered.map(r => [
      r.policy_number, r.customer_name, r.agent_name, r.insurer,
      r.renewal_date ? format(new Date(r.renewal_date), "dd/MM/yyyy") : "",
      r.daysUntilRenewal ?? "",
      r.phone || "", r.email || "", r.vehicle_number || "", r.premium || "", r.status || ""
    ]);
    const csv = [headers.join(","), ...csvRows.map(r => r.map(v => `"${v || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `policies-${format(now, "yyyy-MM-dd")}.csv`;
    a.click();
  }, [filtered, now]);

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

  const shareViaWhatsApp = useCallback((r: PolicyRow, phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(getPolicyText(r));
    window.open(`https://wa.me/${fullPhone}?text=${text}`, "_blank");
    toast.success("Opening WhatsApp...");
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Insurance Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">Manage policies, renewals & follow-ups</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Policies", value: stats.total, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-chart-2", bg: "bg-chart-2/10" },
          { label: "Due 7 Days", value: stats.due7, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Due 30 Days", value: stats.due30, icon: Clock, color: "text-chart-4", bg: "bg-chart-4/10" },
          { label: "Expired", value: stats.expired, icon: AlertTriangle, color: "text-chart-5", bg: "bg-chart-5/10" },
          { label: "Total Premium", value: `₹${(stats.totalPremium / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
        ].map(s => (
          <Card key={s.label} className="border shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="pt-3 pb-3 px-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-xl font-bold pl-9">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs: Policies / Upcoming Renewals / Follow-ups */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="policies" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> All Policies
            </TabsTrigger>
            <TabsTrigger value="renewals" className="gap-1.5 text-xs">
              <CalendarDays className="h-3.5 w-3.5" /> Upcoming Renewals
              {upcomingRenewals.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">{upcomingRenewals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="followups" className="gap-1.5 text-xs">
              <Bell className="h-3.5 w-3.5" /> Follow-ups
              {followUps.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">{followUps.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {activeTab === "policies" && (
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, policy, vehicle..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  className="pl-10 h-9"
                />
              </div>
              <Select value={filter} onValueChange={(v) => { setFilter(v as ViewFilter); setPage(0); }}>
                <SelectTrigger className="w-[140px] h-9">
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
            </div>
          )}
        </div>

        {/* All Policies Tab */}
        <TabsContent value="policies" className="mt-4">
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10 text-xs">#</TableHead>
                      <TableHead className="text-xs">Policy Number</TableHead>
                      <TableHead className="text-xs">Customer</TableHead>
                      <TableHead className="text-xs">Agent</TableHead>
                      <TableHead className="text-xs">Insurer</TableHead>
                      <TableHead className="text-xs">Renewal</TableHead>
                      <TableHead className="text-xs">Days</TableHead>
                      <TableHead className="text-xs">Mobile</TableHead>
                      <TableHead className="text-xs">Vehicle</TableHead>
                      <TableHead className="text-xs text-right">Premium</TableHead>
                      <TableHead className="text-xs w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                          {filter !== "all" ? "No policies match this filter" : "No policies found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((r, i) => (
                        <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="text-xs text-muted-foreground">{page * pageSize + i + 1}</TableCell>
                          <TableCell className="font-mono text-xs font-medium">{r.policy_number || "—"}</TableCell>
                          <TableCell className="font-medium text-sm max-w-[140px] truncate">{r.customer_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">{r.agent_name}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{r.insurer || "—"}</TableCell>
                          <TableCell>
                            {r.renewal_date ? (
                              <span className="text-xs">{format(new Date(r.renewal_date), "dd MMM yy")}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-semibold ${getUrgencyColor(r.daysUntilRenewal)}`}>
                              {r.daysUntilRenewal !== null ? (r.daysUntilRenewal < 0 ? `${r.daysUntilRenewal}d` : `${r.daysUntilRenewal}d`) : "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {r.phone ? (
                              <a href={`tel:${r.phone}`} className="text-xs text-primary hover:underline">{r.phone}</a>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {r.vehicle_number ? (
                              <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded">{r.vehicle_number}</span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs">
                            {r.premium ? `₹${r.premium.toLocaleString("en-IN")}` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {r.phone && (
                                <a href={`tel:${r.phone}`}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Call">
                                    <PhoneCall className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                </a>
                              )}
                              {r.phone && (
                                <a href={`https://wa.me/91${r.phone}`} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="WhatsApp">
                                    <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                </a>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Share"
                                onClick={() => setShareDialogPolicy(r)}>
                                <Share2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details"
                                onClick={() => setSelectedPolicy(r)}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
                <span>
                  {filtered.length === 0 ? "No entries" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 text-xs">
                    <ChevronLeft className="h-3 w-3 mr-1" /> Prev
                  </Button>
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
            {upcomingRenewals.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No upcoming renewals in the next 60 days</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {upcomingRenewals.map(r => (
                  <Card key={r.id} className={`border transition-all hover:shadow-md ${getUrgencyBg(r.daysUntilRenewal)}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{r.customer_name}</h4>
                            <Badge variant="outline" className="text-[10px] shrink-0">{r.policy_type || "Policy"}</Badge>
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
                              <a href={`tel:${r.phone}`}>
                                <Button variant="outline" size="icon" className="h-7 w-7" title="Call">
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
                                <Button size="sm" className="gap-1 h-7 text-xs bg-chart-2 hover:bg-chart-2/90 text-white">
                                  <Phone className="h-3 w-3" /> Call
                                </Button>
                              </a>
                            )}
                            {r.phone && (
                              <a href={`https://wa.me/91${r.phone}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                                  WhatsApp
                                </Button>
                              </a>
                            )}
                            <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"
                              onClick={() => setShareDialogPolicy(r)}>
                              <Share2 className="h-3 w-3" /> Share
                            </Button>
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
    </div>
  );
}

// ── Policy Detail Dialog ──
function PolicyDetailDialog({
  policy, onClose, onShare
}: {
  policy: PolicyRow;
  onClose: () => void;
  onShare: () => void;
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
            <h3 className="font-semibold text-base">{policy.customer_name}</h3>
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
                    status === "sent" ? "bg-chart-2/10 text-chart-2" : "bg-muted/30 text-muted-foreground"
                  }`}>
                    <span className="font-medium">{d}-day reminder</span>
                    <Badge variant={status === "sent" ? "default" : "secondary"} className="text-[10px] h-5">
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
                <Button size="sm" className="gap-1.5 bg-chart-2 hover:bg-chart-2/90 text-white">
                  <Phone className="h-3.5 w-3.5" /> Call
                </Button>
              </a>
            )}
            {policy.phone && (
              <a href={`https://wa.me/91${policy.phone}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  WhatsApp
                </Button>
              </a>
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

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-5 w-5 text-primary" />
            Share Policy — {policy.customer_name}
          </DialogTitle>
        </DialogHeader>

        {/* Policy Preview Card */}
        <div className="p-3 rounded-xl bg-muted/50 border text-xs space-y-1.5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div><span className="text-muted-foreground">Policy:</span> <span className="font-medium">{policy.policy_number || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Insurer:</span> <span className="font-medium">{policy.insurer || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-mono font-medium">{policy.vehicle_number || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Premium:</span> <span className="font-semibold">₹{policy.premium?.toLocaleString("en-IN") || "N/A"}</span></div>
            <div><span className="text-muted-foreground">Renewal:</span> <span className="font-medium">{policy.renewal_date ? format(new Date(policy.renewal_date), "dd MMM yyyy") : "N/A"}</span></div>
            <div><span className="text-muted-foreground">Agent:</span> <span className="font-medium">{policy.agent_name || "N/A"}</span></div>
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-4">
          {/* 1. Download */}
          <Button
            variant="outline"
            className="w-full gap-2 h-10 justify-start"
            onClick={() => { onDownload(policy); onClose(); }}
          >
            <Download className="h-4 w-4 text-primary" />
            <span className="font-medium">Download Policy Copy</span>
          </Button>

          {/* 2. WhatsApp */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-chart-2" /> Send via WhatsApp
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
                className="gap-1.5 h-9 bg-chart-2 hover:bg-chart-2/90 text-white shrink-0"
                disabled={!whatsappNumber.replace(/\D/g, "")}
                onClick={() => { onWhatsApp(policy, whatsappNumber); onClose(); }}
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </div>

          {/* 3. Email */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" /> Send via Email
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
                variant="outline"
                className="gap-1.5 h-9 shrink-0"
                disabled={!emailAddress.includes("@")}
                onClick={() => { onEmail(policy, emailAddress); onClose(); }}
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </div>
          </div>

          {/* Copy to clipboard */}
          <Button
            variant="ghost"
            className="w-full gap-2 h-9 text-xs text-muted-foreground"
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
