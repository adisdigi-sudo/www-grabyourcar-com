import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  SlidersHorizontal, X, Car, Eye, Edit, Trash2,
} from "lucide-react";
import { format, differenceInDays, isBefore, parseISO } from "date-fns";

const DOC_FIELDS = [
  { key: "state_permit_expiry", label: "State Permit" },
  { key: "national_permit_expiry", label: "National Permit" },
  { key: "fitness_expiry", label: "Fitness" },
  { key: "puc_expiry", label: "PUC" },
  { key: "rc_expiry", label: "RC" },
  { key: "rto_tax_expiry", label: "RTO Tax" },
] as const;

const ALL_COLUMNS = [
  { key: "customer_name", label: "Client Name" },
  { key: "vehicle_number", label: "Registration Number" },
  ...DOC_FIELDS,
];

const DEFAULT_COLS = ALL_COLUMNS.map(c => c.key);

export function InsuranceVehicleDocValidity() {
  const [search, setSearch] = useState("");
  const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_COLS);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [docFilter, setDocFilter] = useState("all"); // all | expired | expiring | valid
  const pageSize = 15;

  const { data: clients = [] } = useQuery({
    queryKey: ["ins-veh-doc-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, vehicle_number, state_permit_expiry, national_permit_expiry, fitness_expiry, puc_expiry, rc_expiry, rto_tax_expiry")
        .order("customer_name");
      return data || [];
    },
  });

  const now = new Date();

  const getDocStatus = (dateStr: string | null) => {
    if (!dateStr) return { label: "N/A", variant: "secondary" as const, days: null, status: "na" };
    const exp = parseISO(dateStr);
    const days = differenceInDays(exp, now);
    if (days < 0) return { label: `Expired ${format(exp, "dd/MM/yy")}`, variant: "destructive" as const, days, status: "expired" };
    if (days <= 30) return { label: format(exp, "dd/MM/yy"), variant: "outline" as const, days, status: "expiring" };
    return { label: format(exp, "dd/MM/yy"), variant: "secondary" as const, days, status: "valid" };
  };

  const filtered = useMemo(() => {
    let list = [...clients];

    // Doc status filter
    if (docFilter !== "all") {
      list = list.filter(c => {
        const statuses = DOC_FIELDS.map(f => getDocStatus((c as any)[f.key]).status);
        if (docFilter === "expired") return statuses.some(s => s === "expired");
        if (docFilter === "expiring") return statuses.some(s => s === "expiring");
        if (docFilter === "valid") return statuses.every(s => s === "valid" || s === "na");
        return true;
      });
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.customer_name || "").toLowerCase().includes(q) ||
        (c.vehicle_number || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
      );
    }

    return list;
  }, [clients, search, docFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Count expired docs
  const expiredDocCount = clients.filter(c =>
    DOC_FIELDS.some(f => {
      const d = (c as any)[f.key];
      return d && isBefore(parseISO(d), now);
    })
  ).length;

  const exportCSV = () => {
    const cols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key));
    const header = cols.map(c => c.label).join(",");
    const rows = filtered.map(c => cols.map(col => {
      if (col.key === "customer_name") return `"${c.customer_name}"`;
      if (col.key === "vehicle_number") return `"${c.vehicle_number || ""}"`;
      const val = (c as any)[col.key];
      return val ? format(parseISO(val), "dd/MM/yyyy") : "N/A";
    }).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vehicle_documents_validity_${format(now, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Vehicle Documents Validity
          </h2>
          <p className="text-xs text-muted-foreground">Track and manage vehicle document validity and expiry dates</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="client_id">
            <SelectTrigger className="w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="client_id" className="text-xs">Client ID</SelectItem>
              <SelectItem value="vehicle" className="text-xs">Vehicle No.</SelectItem>
              <SelectItem value="name" className="text-xs">Name</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Enter Client ID" className="w-[160px] text-xs" />
        </div>
      </div>

      {/* Expiry Alert */}
      {expiredDocCount > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">{expiredDocCount} vehicles have expired documents!</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"><X className="h-3.5 w-3.5" /></Button>
        </div>
      )}

      {/* Toolbar */}
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
                <Select value={docFilter} onValueChange={v => { setDocFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Documents</SelectItem>
                    <SelectItem value="expired" className="text-xs">Has Expired Docs</SelectItem>
                    <SelectItem value="expiring" className="text-xs">Expiring in 30 Days</SelectItem>
                    <SelectItem value="valid" className="text-xs">All Valid</SelectItem>
                  </SelectContent>
                </Select>
                {docFilter !== "all" && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDocFilter("all")}>
                    <X className="h-3 w-3 mr-1" /> Clear
                  </Button>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex-1" />

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Columns className="h-3.5 w-3.5" /> Display Columns
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader><DialogTitle className="text-sm">Customize Columns</DialogTitle></DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={visibleCols.includes(col.key)}
                    onCheckedChange={v => setVisibleCols(prev => v ? [...prev, col.key] : prev.filter(k => k !== col.key))}
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
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-sm">Vehicle Documents Validity</h3>
        <div className="flex-1" />
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name..."
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
                  {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(col => (
                    <TableHead key={col.key} className="text-xs whitespace-nowrap">{col.label.toUpperCase()}</TableHead>
                  ))}
                  <TableHead className="text-xs">ACTION</TableHead>
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
                  paged.map(c => (
                    <TableRow key={c.id}>
                      {ALL_COLUMNS.filter(col => visibleCols.includes(col.key)).map(col => {
                        if (col.key === "customer_name") return <TableCell key={col.key} className="text-xs font-medium">{c.customer_name}</TableCell>;
                        if (col.key === "vehicle_number") return <TableCell key={col.key} className="text-xs">{c.vehicle_number || "—"}</TableCell>;
                        const status = getDocStatus((c as any)[col.key]);
                        return (
                          <TableCell key={col.key} className="text-xs">
                            <Badge variant={status.variant} className="text-[10px]">
                              {status.label}
                            </Badge>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2 flex items-center justify-between bg-muted/30">
            <div className="flex gap-4">
              {ALL_COLUMNS.filter(c => visibleCols.includes(c.key) && c.key !== "customer_name" && c.key !== "vehicle_number").map(col => (
                <TableCell key={col.key} className="text-[10px] font-medium uppercase p-0">{col.label.toUpperCase()}</TableCell>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
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
