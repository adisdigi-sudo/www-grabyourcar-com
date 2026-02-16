import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
  Search, Filter, Columns, Download, AlertTriangle, ChevronLeft, ChevronRight,
  SlidersHorizontal, X, DollarSign, Eye,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

// ── Commission Report columns ──
const REPORT_COLUMNS = [
  { key: "policy_name", label: "Policy Name" },
  { key: "policy_holder", label: "Policy Holder" },
  { key: "company_name", label: "Company Name" },
  { key: "policy_number", label: "Policy Number" },
  { key: "policy_start_date", label: "Policy Start Date" },
  { key: "added_by", label: "Added By" },
  { key: "client_mobile", label: "Client Mobile" },
  { key: "net_premium", label: "Net Premium" },
  { key: "total_premium", label: "Total Premium" },
  { key: "total_commission", label: "Total Commission" },
  { key: "net_commission", label: "Net Commission" },
  { key: "agent_commission", label: "Agent Commission" },
  { key: "net_agent_commission", label: "Net Agent Commission" },
  { key: "sub_agent_commission", label: "Sub Agent Commission" },
  { key: "net_sub_agent_commission", label: "Net Sub Agent Commission" },
  { key: "registration_no", label: "Registration No" },
];

const DEFAULT_REPORT_COLS = [
  "policy_name", "policy_holder", "company_name", "policy_number",
  "added_by", "client_mobile", "total_premium", "total_commission", "net_commission",
];

// ── Manage Commission columns ──
const MANAGE_COLUMNS = [
  { key: "policy_name", label: "Policy Name" },
  { key: "policy_number", label: "Policy Number" },
  { key: "company_name", label: "Company Name" },
  { key: "agent_name", label: "Agent Name" },
  { key: "sub_agent_commission", label: "Sub Agent Commission" },
];

export function InsuranceCommissionsTracker() {
  const [activeTab, setActiveTab] = useState("report");
  const [search, setSearch] = useState("");
  const [reportCols, setReportCols] = useState<string[]>(DEFAULT_REPORT_COLS);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [agentFilter, setAgentFilter] = useState("all");
  const pageSize = 15;

  const { data: commissions = [] } = useQuery({
    queryKey: ["ins-commissions-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_commissions")
        .select("*, insurance_clients(customer_name, phone, vehicle_number), insurance_policies(policy_number, insurer, policy_type, premium_amount, net_premium, start_date)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const agents = useMemo(() => {
    const set = new Set<string>();
    commissions.forEach((c: any) => { if (c.advisor_name) set.add(c.advisor_name); });
    return [...set].sort();
  }, [commissions]);

  // Expiry alert
  const { data: policies = [] } = useQuery({
    queryKey: ["ins-comm-expiry-check"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("expiry_date, status")
        .eq("status", "active");
      return data || [];
    },
  });

  const now = new Date();
  const expiringCount = policies.filter((p: any) => {
    if (!p.expiry_date) return false;
    const d = differenceInDays(parseISO(p.expiry_date), now);
    return d >= 0 && d <= 7;
  }).length;

  const filtered = useMemo(() => {
    let list = [...commissions];
    if (agentFilter !== "all") list = list.filter((c: any) => c.advisor_name === agentFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c: any) =>
        (c.insurance_policies?.policy_number || "").toLowerCase().includes(q) ||
        (c.insurance_policies?.insurer || "").toLowerCase().includes(q) ||
        (c.insurance_clients?.customer_name || "").toLowerCase().includes(q) ||
        (c.advisor_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [commissions, search, agentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getReportCellValue = (c: any, key: string) => {
    const pol = c.insurance_policies;
    const cli = c.insurance_clients;
    switch (key) {
      case "policy_name": return pol?.policy_type || "—";
      case "policy_holder": return cli?.customer_name || "—";
      case "company_name": return pol?.insurer || "—";
      case "policy_number": return pol?.policy_number || "—";
      case "policy_start_date": return pol?.start_date ? format(parseISO(pol.start_date), "dd/MM/yyyy") : "—";
      case "added_by": return c.advisor_name || "—";
      case "client_mobile": return cli?.phone || "—";
      case "net_premium": return pol?.net_premium ? `₹${pol.net_premium.toLocaleString("en-IN")}` : "—";
      case "total_premium": return c.premium_amount ? `₹${c.premium_amount.toLocaleString("en-IN")}` : "—";
      case "total_commission": return c.total_earned ? `₹${c.total_earned.toLocaleString("en-IN")}` : "—";
      case "net_commission": return c.total_earned ? `₹${(c.total_earned * 0.82).toFixed(0)}` : "—";
      case "agent_commission": return c.total_earned ? `₹${(c.total_earned * (c.commission_percentage || 0) / 100).toFixed(0)}` : "—";
      case "net_agent_commission": return "—";
      case "sub_agent_commission": return "—";
      case "net_sub_agent_commission": return "—";
      case "registration_no": return cli?.vehicle_number || "—";
      default: return "—";
    }
  };

  const getManageCellValue = (c: any, key: string) => {
    const pol = c.insurance_policies;
    switch (key) {
      case "policy_name": return pol?.policy_type || "—";
      case "policy_number": return pol?.policy_number || "—";
      case "company_name": return pol?.insurer || "—";
      case "agent_name": return c.advisor_name || "—";
      case "sub_agent_commission": return "—";
      default: return "—";
    }
  };

  const exportCSV = () => {
    const cols = activeTab === "report"
      ? REPORT_COLUMNS.filter(c => reportCols.includes(c.key))
      : MANAGE_COLUMNS;
    const header = cols.map(c => c.label).join(",");
    const rows = filtered.map(c =>
      cols.map(col => `"${activeTab === "report" ? getReportCellValue(c, col.key) : getManageCellValue(c, col.key)}"`).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission_${activeTab}_${format(now, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCommission = filtered.reduce((s, c: any) => s + (c.total_earned || 0), 0);
  const totalPremium = filtered.reduce((s, c: any) => s + (c.premium_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(1); setSearch(""); }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {activeTab === "report" ? "Commission Report" : "Manage Commission"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {activeTab === "report"
                ? "Detailed commission analysis across all insurance policies"
                : "Track and manage sub-agent commissions"}
            </p>
          </div>
        </div>

        <TabsList className="mt-3 h-auto p-1 bg-muted/50">
          <TabsTrigger value="report" className="text-xs gap-1">Commission Report</TabsTrigger>
          <TabsTrigger value="manage" className="text-xs gap-1">Manage Commission</TabsTrigger>
        </TabsList>

        {/* Expiry Alert */}
        {expiringCount > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm text-destructive mt-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Your Plans Expired In 7 Days!</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><X className="h-3.5 w-3.5" /></Button>
          </div>
        )}

        {/* ── Commission Report Tab ── */}
        <TabsContent value="report" className="space-y-4 mt-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Filter className="h-3.5 w-3.5" /> Show Filters <SlidersHorizontal className="h-3 w-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <Card>
                  <CardContent className="pt-3 pb-3 flex flex-wrap gap-3">
                    <Select value={agentFilter} onValueChange={v => { setAgentFilter(v); setPage(1); }}>
                      <SelectTrigger className="w-[160px] text-xs"><SelectValue placeholder="Agent" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Agents</SelectItem>
                        {agents.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {agentFilter !== "all" && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAgentFilter("all")}>
                        <X className="h-3 w-3 mr-1" /> Clear
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
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle className="text-sm">Customize Columns</DialogTitle></DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">Select Columns</span>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={reportCols.length === REPORT_COLUMNS.length}
                      onCheckedChange={v => setReportCols(v ? REPORT_COLUMNS.map(c => c.key) : [])}
                    />
                    Check All
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {REPORT_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox
                        checked={reportCols.includes(col.key)}
                        onCheckedChange={v => setReportCols(prev => v ? [...prev, col.key] : prev.filter(k => k !== col.key))}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <Button variant="outline" size="sm" className="text-xs">Cancel</Button>
                  <Button size="sm" className="text-xs">Apply Changes</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" /> Download Report
            </Button>
          </div>

          {/* Search & Title */}
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm">Commission Report</h3>
            <div className="flex-1" />
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by policy name, policy number, or company name..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 text-xs"
              />
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {REPORT_COLUMNS.filter(c => reportCols.includes(c.key)).map(col => (
                        <TableHead key={col.key} className="text-xs whitespace-nowrap">{col.label.toUpperCase()}</TableHead>
                      ))}
                      <TableHead className="text-xs">ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={reportCols.length + 1} className="text-center py-12 text-muted-foreground text-sm">
                          No data available in table
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((c: any) => (
                        <TableRow key={c.id}>
                          {REPORT_COLUMNS.filter(col => reportCols.includes(col.key)).map(col => (
                            <TableCell key={col.key} className="text-xs whitespace-nowrap">
                              {getReportCellValue(c, col.key)}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Footer totals */}
              <div className="border-t px-4 py-2 flex items-center justify-between bg-muted/30">
                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>TOTAL: {filtered.length}</span>
                  {totalPremium > 0 && <span>Total Premium: ₹{totalPremium.toLocaleString("en-IN")}</span>}
                  {totalCommission > 0 && <span>Total Commission: ₹{totalCommission.toLocaleString("en-IN")}</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          <PaginationBar page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} pageSize={pageSize} />
        </TabsContent>

        {/* ── Manage Commission Tab ── */}
        <TabsContent value="manage" className="space-y-4 mt-4">
          {/* Sub Agents filter */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Sub Agents</span>
            <Select value={agentFilter} onValueChange={v => { setAgentFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px] text-xs"><SelectValue placeholder="All Agents" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Agents</SelectItem>
                {agents.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Search & Title */}
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm">Commissions Insurance</h3>
            <div className="flex-1" />
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by policy name, policy number, or company name..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 text-xs"
              />
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {MANAGE_COLUMNS.map(col => (
                        <TableHead key={col.key} className="text-xs whitespace-nowrap">{col.label.toUpperCase()}</TableHead>
                      ))}
                      <TableHead className="text-xs">ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={MANAGE_COLUMNS.length + 1} className="text-center py-12 text-muted-foreground text-sm">
                          No data available in table
                        </TableCell>
                      </TableRow>
                    ) : (
                      paged.map((c: any) => (
                        <TableRow key={c.id}>
                          {MANAGE_COLUMNS.map(col => (
                            <TableCell key={col.key} className="text-xs whitespace-nowrap">
                              {getManageCellValue(c, col.key)}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t px-4 py-2 bg-muted/30">
                <p className="text-xs text-muted-foreground">Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries</p>
              </div>
            </CardContent>
          </Card>

          <PaginationBar page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} pageSize={pageSize} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PaginationBar({ page, setPage, totalPages, total, pageSize }: { page: number; setPage: (p: number) => void; totalPages: number; total: number; pageSize: number }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
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
  );
}
