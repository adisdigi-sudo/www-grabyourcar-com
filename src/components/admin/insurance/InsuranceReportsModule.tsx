import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText, Download, Search, Filter, Columns, AlertTriangle,
  ChevronLeft, ChevronRight, X, SlidersHorizontal,
} from "lucide-react";
import { format, differenceInDays, addDays, isBefore, isAfter, parseISO } from "date-fns";

type Policy = {
  id: string;
  policy_number: string | null;
  policy_type: string | null;
  insurer: string | null;
  premium_amount: number | null;
  net_premium: number | null;
  start_date: string | null;
  expiry_date: string | null;
  status: string | null;
  renewal_status: string | null;
  is_renewal: boolean | null;
  client_id: string | null;
  created_at: string;
};

type Client = {
  id: string;
  customer_name: string;
  phone: string;
  vehicle_number: string | null;
};

const ALL_COLUMNS = [
  { key: "policy_name", label: "Policy Name" },
  { key: "policy_holder", label: "Policy Holder" },
  { key: "insurer", label: "Insurance Company" },
  { key: "policy_number", label: "Policy Number" },
  { key: "start_date", label: "Start Date" },
  { key: "expiry_date", label: "Expiry Date" },
  { key: "client_name", label: "Client Name" },
  { key: "net_premium", label: "Net Premium" },
  { key: "premium", label: "Premium" },
  { key: "status", label: "Status" },
  { key: "renewal_status", label: "Renewal Status" },
  { key: "days_left", label: "Days Left" },
];

const DEFAULT_COLS = ["policy_name", "policy_holder", "insurer", "policy_number", "start_date", "client_name", "net_premium", "premium"];

const REPORT_TABS = [
  { key: "all", label: "All Policy", desc: "Comprehensive view of all insurance policies across different types" },
  { key: "upcoming", label: "Upcoming Renewal & Due Premium", desc: "Policies expiring in the next 30/60/90 days" },
  { key: "overdue", label: "Overdue Premium", desc: "Policies with overdue or unpaid premium amounts" },
  { key: "expired", label: "Expired Policy", desc: "All expired and lapsed policies" },
  { key: "renewal", label: "Update Renewal Premium", desc: "Track renewal status and updated premiums" },
];

export function InsuranceReportsModule() {
  const [activeReport, setActiveReport] = useState("all");
  const [search, setSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_COLS);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [daysRange, setDaysRange] = useState("30");
  const [insurerFilter, setInsurerFilter] = useState("all");
  const pageSize = 15;

  const { data: policies = [] } = useQuery({
    queryKey: ["ins-report-policies"],
    queryFn: async () => {
      // Fetch all policies ordered by expiry_date for correct renewal reporting
      const { data } = await supabase
        .from("insurance_policies")
        .select("*")
        .order("expiry_date", { ascending: true });
      return (data || []) as Policy[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["ins-report-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, vehicle_number");
      return (data || []) as Client[];
    },
  });

  const clientMap = useMemo(() => {
    const m: Record<string, Client> = {};
    clients.forEach((c) => (m[c.id] = c));
    return m;
  }, [clients]);

  const now = useMemo(() => new Date(), []);

  // Filter logic per report type
  const filteredPolicies = useMemo(() => {
    let list = [...policies];

    // Report-specific filters
    switch (activeReport) {
      case "upcoming": {
        const days = parseInt(daysRange);
        list = list.filter((p) => {
          if (!p.expiry_date || p.status === "expired" || p.status === "cancelled") return false;
          const exp = parseISO(p.expiry_date);
          return isAfter(exp, now) && isBefore(exp, addDays(now, days));
        });
        break;
      }
      case "overdue":
        list = list.filter((p) => {
          if (!p.expiry_date) return false;
          const exp = parseISO(p.expiry_date);
          return isBefore(exp, now) && p.renewal_status !== "renewed" && p.status !== "cancelled";
        });
        break;
      case "expired":
        list = list.filter(
          (p) => p.status === "expired" || (p.expiry_date && isBefore(parseISO(p.expiry_date), now))
        );
        break;
      case "renewal":
        list = list.filter(
          (p) => p.is_renewal || p.renewal_status === "renewed" || p.renewal_status === "pending"
        );
        break;
    }

    // Global filters
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (typeFilter !== "all") list = list.filter((p) => p.policy_type === typeFilter);
    if (insurerFilter !== "all") list = list.filter((p) => p.insurer === insurerFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => {
        const client = p.client_id ? clientMap[p.client_id] : null;
        return (
          (p.policy_number || "").toLowerCase().includes(q) ||
          (p.insurer || "").toLowerCase().includes(q) ||
          (p.policy_type || "").toLowerCase().includes(q) ||
          (client?.customer_name || "").toLowerCase().includes(q) ||
          (client?.phone || "").includes(q)
        );
      });
    }

    return list;
  }, [policies, activeReport, search, statusFilter, typeFilter, insurerFilter, daysRange, clientMap, now]);

  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / pageSize));
  const paged = filteredPolicies.slice((page - 1) * pageSize, page * pageSize);

  const totalPremium = filteredPolicies.reduce((s, p) => s + (p.premium_amount || 0), 0);
  const totalNetPremium = filteredPolicies.reduce((s, p) => s + (p.net_premium || 0), 0);

  const policyTypes = [...new Set(policies.map((p) => p.policy_type).filter(Boolean))];
  const statuses = [...new Set(policies.map((p) => p.status).filter(Boolean))];
  const insurers = [...new Set(policies.map((p) => p.insurer).filter(Boolean))];

  const getCellValue = (p: Policy, key: string) => {
    const client = p.client_id ? clientMap[p.client_id] : null;
    switch (key) {
      case "policy_name": return p.policy_type || "—";
      case "policy_holder": return client?.customer_name || "—";
      case "insurer": return p.insurer || "—";
      case "policy_number": return p.policy_number || "—";
      case "start_date": return p.start_date ? format(parseISO(p.start_date), "dd/MM/yyyy") : "—";
      case "expiry_date": return p.expiry_date ? format(parseISO(p.expiry_date), "dd/MM/yyyy") : "—";
      case "client_name": return client?.customer_name || "—";
      case "net_premium": return p.net_premium ? `₹${p.net_premium.toLocaleString("en-IN")}` : "—";
      case "premium": return p.premium_amount ? `₹${p.premium_amount.toLocaleString("en-IN")}` : "—";
      case "status": return p.status || "—";
      case "renewal_status": return p.renewal_status || "—";
      case "days_left": {
        if (!p.expiry_date) return "—";
        const d = differenceInDays(parseISO(p.expiry_date), now);
        return d < 0 ? `${Math.abs(d)}d overdue` : `${d}d`;
      }
      default: return "—";
    }
  };

  const getStatusBadge = (p: Policy, key: string) => {
    if (key === "status") {
      const s = p.status;
      if (s === "active") return <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Active</Badge>;
      if (s === "expired") return <Badge variant="destructive" className="text-[10px]">Expired</Badge>;
      if (s === "cancelled") return <Badge variant="secondary" className="text-[10px]">Cancelled</Badge>;
      return <Badge variant="outline" className="text-[10px]">{s}</Badge>;
    }
    if (key === "renewal_status") {
      const r = p.renewal_status;
      if (r === "renewed") return <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">Renewed</Badge>;
      if (r === "pending") return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px]">Pending</Badge>;
      if (r === "lapsed") return <Badge variant="destructive" className="text-[10px]">Lapsed</Badge>;
      return <Badge variant="outline" className="text-[10px]">{r || "—"}</Badge>;
    }
    if (key === "days_left" && p.expiry_date) {
      const d = differenceInDays(parseISO(p.expiry_date), now);
      if (d < 0) return <Badge variant="destructive" className="text-[10px]">{Math.abs(d)}d overdue</Badge>;
      if (d <= 7) return <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">{d}d left</Badge>;
      if (d <= 30) return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px]">{d}d left</Badge>;
      return <Badge variant="secondary" className="text-[10px]">{d}d left</Badge>;
    }
    return null;
  };

  const exportCSV = () => {
    const cols = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key));
    const header = cols.map((c) => c.label).join(",");
    const rows = filteredPolicies.map((p) => cols.map((c) => `"${getCellValue(p, c.key)}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insurance_report_${activeReport}_${format(now, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeTab = REPORT_TABS.find((t) => t.key === activeReport)!;

  // Expiry alert
  const expiringCount = policies.filter((p) => {
    if (!p.expiry_date || p.status === "expired") return false;
    const d = differenceInDays(parseISO(p.expiry_date), now);
    return d >= 0 && d <= 7;
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {activeTab.label}
          </h2>
          <p className="text-xs text-muted-foreground">{activeTab.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeReport} onValueChange={(v) => { setActiveReport(v); setPage(1); setSearch(""); setStatusFilter("all"); setTypeFilter("all"); setInsurerFilter("all"); }}>
            <SelectTrigger className="w-[220px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TABS.map((t) => (
                <SelectItem key={t.key} value={t.key} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expiry Alert */}
      {expiringCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">{expiringCount} policies expiring within 7 days!</span>
        </div>
      )}

      {/* Report Tabs */}
      <Tabs value={activeReport} onValueChange={(v) => { setActiveReport(v); setPage(1); setSearch(""); setStatusFilter("all"); setTypeFilter("all"); setInsurerFilter("all"); }}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50">
          {REPORT_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs gap-1">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Toolbar: Filters, Column config, Download */}
      <div className="flex flex-wrap items-center gap-2">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" /> Show Filters
              <SlidersHorizontal className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card>
              <CardContent className="pt-3 pb-3 flex flex-wrap gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    {statuses.map((s) => <SelectItem key={s} value={s!} className="text-xs capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Types</SelectItem>
                    {policyTypes.map((t) => <SelectItem key={t} value={t!} className="text-xs capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {activeReport === "upcoming" && (
                  <Select value={daysRange} onValueChange={setDaysRange}>
                    <SelectTrigger className="w-[130px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7" className="text-xs">Next 7 Days</SelectItem>
                      <SelectItem value="15" className="text-xs">Next 15 Days</SelectItem>
                      <SelectItem value="30" className="text-xs">Next 30 Days</SelectItem>
                      <SelectItem value="60" className="text-xs">Next 60 Days</SelectItem>
                      <SelectItem value="90" className="text-xs">Next 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Select value={insurerFilter} onValueChange={setInsurerFilter}>
                  <SelectTrigger className="w-[180px] text-xs"><SelectValue placeholder="Insurer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Insurers</SelectItem>
                    {insurers.map((ins) => <SelectItem key={ins} value={ins!} className="text-xs">{ins}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(statusFilter !== "all" || typeFilter !== "all" || insurerFilter !== "all") && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setInsurerFilter("all"); }}>
                    <X className="h-3 w-3 mr-1" /> Clear All
                  </Button>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex-1" />

        {/* Column Customizer */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Columns className="h-3.5 w-3.5" /> Display Columns
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader><DialogTitle className="text-sm">Customize Columns</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={visibleCols.includes(col.key)}
                    onCheckedChange={(v) =>
                      setVisibleCols((prev) =>
                        v ? [...prev, col.key] : prev.filter((k) => k !== col.key)
                      )
                    }
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Button size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> Download Report
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by policy name, policy number, or company name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-10 text-sm"
        />
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                    <TableHead key={col.key} className="text-xs whitespace-nowrap">{col.label}</TableHead>
                  ))}
                  <TableHead className="text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length + 1} className="text-center py-12 text-muted-foreground text-sm">
                      No data available in table
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((p) => (
                    <TableRow key={p.id}>
                      {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                        <TableCell key={col.key} className="text-xs whitespace-nowrap">
                          {getStatusBadge(p, col.key) || getCellValue(p, col.key)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs h-7">View</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer summary */}
          <div className="border-t px-4 py-2 flex items-center justify-between bg-muted/30">
            <div className="text-xs text-muted-foreground flex gap-4">
              <span>TOTAL: {filteredPolicies.length}</span>
              {totalNetPremium > 0 && <span>Net Premium: ₹{totalNetPremium.toLocaleString("en-IN")}</span>}
              {totalPremium > 0 && <span>Premium: ₹{totalPremium.toLocaleString("en-IN")}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {filteredPolicies.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, filteredPolicies.length)} of {filteredPolicies.length} entries
        </p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-xs gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page - 2 + i;
            if (p > totalPages) return null;
            return (
              <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="text-xs w-8 h-8" onClick={() => setPage(p)}>
                {p}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="text-xs gap-1">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
