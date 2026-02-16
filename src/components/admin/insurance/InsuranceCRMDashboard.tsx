import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, FileText, AlertTriangle, Clock, Search,
  Download, ChevronLeft, ChevronRight, Phone, Mail, Eye, Car
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format, addDays, isBefore, isAfter } from "date-fns";

type ViewFilter = "all" | "7" | "15" | "30" | "60" | "expired";

type PolicyRow = {
  id: string;
  policy_number: string | null;
  customer_name: string | null;
  agent_name: string | null;
  insurer: string | null;
  renewal_date: string | null;
  phone: string | null;
  email: string | null;
  vehicle_number: string | null;
  premium: number | null;
  status: string | null;
};

export function InsuranceCRMDashboard() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [page, setPage] = useState(0);
  const pageSize = 15;

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

  const now = new Date();

  // Merge into a single flat list
  const rows: PolicyRow[] = useMemo(() => {
    if (!clients || !policies) return [];
    const clientMap = new Map(clients.map(c => [c.id, c]));
    return policies.map(p => {
      const c = clientMap.get(p.client_id || "");
      const rawPhone = c?.phone || "";
      const displayPhone = rawPhone.startsWith("IB_") ? "—" : rawPhone;
      return {
        id: p.id,
        policy_number: p.policy_number,
        customer_name: c?.customer_name || "—",
        agent_name: c?.advisor_name || "—",
        insurer: p.insurer,
        renewal_date: p.expiry_date,
        phone: displayPhone,
        email: c?.email || null,
        vehicle_number: c?.vehicle_number || null,
        premium: p.premium_amount ? Number(p.premium_amount) : null,
        status: p.status,
      };
    });
  }, [clients, policies]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter(r => r.status === "active").length;
    const expired = rows.filter(r => r.renewal_date && isBefore(new Date(r.renewal_date), now) && r.status === "active").length;
    const dueSoon = rows.filter(r => {
      if (!r.renewal_date) return false;
      const exp = new Date(r.renewal_date);
      return isAfter(exp, now) && isBefore(exp, addDays(now, 30));
    }).length;
    return { total, active, expired, dueSoon };
  }, [rows]);

  // Filter + Search
  const filtered = useMemo(() => {
    let result = rows;

    // Filter by renewal window
    if (filter !== "all") {
      result = result.filter(r => {
        if (!r.renewal_date) return false;
        const exp = new Date(r.renewal_date);
        if (filter === "expired") return isBefore(exp, now);
        const days = parseInt(filter);
        return isAfter(exp, now) && isBefore(exp, addDays(now, days));
      });
    }

    // Search
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

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ["Policy Number", "Customer Name", "Agent Name", "Insurance Company", "Renewal Date", "Mobile", "Email", "Vehicle Number", "Premium"];
    const csvRows = filtered.map(r => [
      r.policy_number, r.customer_name, r.agent_name, r.insurer,
      r.renewal_date ? format(new Date(r.renewal_date), "dd/MM/yyyy") : "",
      r.phone, r.email || "", r.vehicle_number || "", r.premium || ""
    ]);
    const csv = [headers.join(","), ...csvRows.map(r => r.map(v => `"${v || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insurance-policies-${format(now, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: "Total Policies", value: stats.total, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active", value: stats.active, icon: Users, color: "text-chart-2", bg: "bg-chart-2/10" },
    { label: "Due in 30 Days", value: stats.dueSoon, icon: Clock, color: "text-chart-4", bg: "bg-chart-4/10" },
    { label: "Expired", value: stats.expired, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  const getRenewalBadge = (date: string | null) => {
    if (!date) return null;
    const exp = new Date(date);
    const isExpired = isBefore(exp, now);
    const isDueSoon = !isExpired && isBefore(exp, addDays(now, 30));
    return (
      <Badge variant={isExpired ? "destructive" : isDueSoon ? "outline" : "secondary"} className="text-xs font-medium">
        {format(exp, "dd MMM yyyy")}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Policy Dashboard</h2>
          <p className="text-sm text-muted-foreground">All your insurance policies at a glance</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(s => (
          <Card key={s.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, policy, vehicle, phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-10 h-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => { setFilter(v as ViewFilter); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-9">
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

      {/* Policy Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Policy Number</TableHead>
                  <TableHead className="text-xs">Customer Name</TableHead>
                  <TableHead className="text-xs">Agent</TableHead>
                  <TableHead className="text-xs">Insurance Company</TableHead>
                  <TableHead className="text-xs">Renewal Date</TableHead>
                  <TableHead className="text-xs">Mobile</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Vehicle No.</TableHead>
                  <TableHead className="text-xs text-right">Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                      No policies found
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((r, i) => (
                    <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="text-xs text-muted-foreground">{page * pageSize + i + 1}</TableCell>
                      <TableCell className="font-mono text-xs font-medium">{r.policy_number || "—"}</TableCell>
                      <TableCell className="font-medium text-sm">{r.customer_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.agent_name}</TableCell>
                      <TableCell className="text-sm">{r.insurer || "—"}</TableCell>
                      <TableCell>{getRenewalBadge(r.renewal_date)}</TableCell>
                      <TableCell>
                        {r.phone && r.phone !== "—" ? (
                          <a href={`tel:${r.phone}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {r.phone}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.email ? (
                          <a href={`mailto:${r.email}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {r.email}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.vehicle_number ? (
                          <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">{r.vehicle_number}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {r.premium ? `₹${r.premium.toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>
              {filtered.length === 0
                ? "No entries"
                : `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
