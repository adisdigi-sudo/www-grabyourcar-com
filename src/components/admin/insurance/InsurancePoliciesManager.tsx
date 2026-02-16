import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Plus, FileText, Calendar, DollarSign, Shield, Eye, Edit,
  Trash2, Download, Upload, Filter, Settings2, ChevronDown, ChevronLeft,
  ChevronRight, AlertTriangle, FileUp, X
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

const ALL_COLUMNS = [
  { key: "client_name", label: "Client Name", default: true },
  { key: "policy_holder", label: "Policy Holder", default: true },
  { key: "agent_name", label: "Agent Name", default: true },
  { key: "insurance_company", label: "Insurance Company", default: true },
  { key: "insurance_type", label: "Insurance Type", default: false },
  { key: "policy_number", label: "Policy Number", default: false },
  { key: "policy_start_date", label: "Policy Start Date", default: false },
  { key: "policy_end_date", label: "Policy End Date", default: false },
  { key: "total_premium", label: "Total Premium", default: true },
  { key: "net_premium", label: "Net Premium", default: false },
  { key: "reference_by", label: "Reference By Name", default: false },
  { key: "broker_name", label: "Broker Name", default: false },
  { key: "date_of_entry", label: "Date of entry", default: false },
  { key: "agency_broker_code", label: "Agency/Broker code", default: false },
  { key: "registration_number", label: "Registration Number", default: false },
  { key: "class_of_vehicle", label: "Class of Vehicle", default: false },
  { key: "policy_type", label: "Policy type", default: false },
];

const INSURANCE_TYPES = [
  { value: "all", label: "All Insurance" },
  { value: "motor", label: "Motor Insurance" },
  { value: "health", label: "Health Insurance" },
  { value: "life", label: "Life Insurance" },
  { value: "wc", label: "Wc Insurance" },
  { value: "other", label: "Other Insurance" },
];

export function InsurancePoliciesManager() {
  const [search, setSearch] = useState("");
  const [insuranceType, setInsuranceType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [showColumns, setShowColumns] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>(
    ALL_COLUMNS.filter(c => c.default).map(c => c.key)
  );
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["ins-policies-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("*, insurance_clients(customer_name, phone, vehicle_number, advisor_name, vehicle_make, vehicle_model)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["ins-clients-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  // Expiring in 7 days
  const expiringCount = useMemo(() => {
    if (!policies) return 0;
    const now = new Date();
    return policies.filter((p: any) => {
      if (!p.expiry_date || p.status !== "active") return false;
      const d = differenceInDays(new Date(p.expiry_date), now);
      return d >= 0 && d <= 7;
    }).length;
  }, [policies]);

  // Unique agents
  const agents = useMemo(() => {
    if (!policies) return [];
    const s = new Set(policies.map((p: any) => p.insurance_clients?.advisor_name).filter(Boolean));
    return Array.from(s) as string[];
  }, [policies]);

  // Filtered
  const filtered = useMemo(() => {
    if (!policies) return [];
    let result = policies as any[];
    if (insuranceType !== "all") result = result.filter(p => (p.policy_type || "").toLowerCase().includes(insuranceType));
    if (statusFilter !== "all") result = result.filter(p => p.status === statusFilter);
    if (agentFilter !== "all") result = result.filter(p => p.insurance_clients?.advisor_name === agentFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(p =>
        p.insurance_clients?.customer_name?.toLowerCase().includes(s) ||
        p.policy_number?.toLowerCase().includes(s) ||
        p.insurer?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [policies, insuranceType, statusFilter, agentFilter, search]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const totalPremium = filtered.reduce((s, p: any) => s + (p.premium_amount || 0), 0);

  const toggleCol = (key: string) => {
    setVisibleCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const getColValue = (p: any, key: string) => {
    switch (key) {
      case "client_name": return p.insurance_clients?.customer_name || "—";
      case "policy_holder": return p.insurance_clients?.customer_name || "—";
      case "agent_name": return p.insurance_clients?.advisor_name || "—";
      case "insurance_company": return p.insurer || "—";
      case "insurance_type": return p.policy_type || "—";
      case "policy_number": return p.policy_number || "—";
      case "policy_start_date": return p.start_date ? format(new Date(p.start_date), "dd/MM/yyyy") : "—";
      case "policy_end_date": return p.expiry_date ? format(new Date(p.expiry_date), "dd/MM/yyyy") : "—";
      case "total_premium": return `₹${(p.premium_amount || 0).toLocaleString("en-IN")}`;
      case "net_premium": return `₹${(p.net_premium || 0).toLocaleString("en-IN")}`;
      case "reference_by": return "—";
      case "broker_name": return "—";
      case "date_of_entry": return p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : "—";
      case "agency_broker_code": return "—";
      case "registration_number": return p.insurance_clients?.vehicle_number || "—";
      case "class_of_vehicle": return `${p.insurance_clients?.vehicle_make || ""} ${p.insurance_clients?.vehicle_model || ""}`.trim() || "—";
      case "policy_type": return p.policy_type || "—";
      default: return "—";
    }
  };

  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-policies-full"] });
      toast.success("Policy deleted");
    },
  });

  const exportCSV = () => {
    const cols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key));
    const headers = cols.map(c => c.label);
    const rows = filtered.map((p: any) => cols.map(c => `"${getColValue(p, c.key)}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insurance-policies-${insuranceType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Insurance Type Tabs */}
      <Tabs value={insuranceType} onValueChange={v => { setInsuranceType(v); setPage(0); }}>
        <TabsList className="h-auto flex-wrap gap-1 p-1">
          {INSURANCE_TYPES.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Expiry Alert */}
      {expiringCount > 0 && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            Your Plans Expired In 7 Days ! ({expiringCount} policies)
          </AlertDescription>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-4 w-4" /> Show Filters <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="lapsed">Lapsed</SelectItem>
                <SelectItem value="renewed">Renewed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={v => { setAgentFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex-1" />

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowColumns(true)} className="gap-1.5">
            <Settings2 className="h-4 w-4" /> Display Columns
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="gap-1.5">
            <Upload className="h-4 w-4" /> Upload Policy
          </Button>
          <Button variant="default" size="sm" onClick={exportCSV} className="gap-1.5 bg-chart-2 hover:bg-chart-2/90 text-white">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => setShowAddSheet(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Motor Insurance
          </Button>
        </div>
      </div>

      {/* Policies Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg capitalize">
            {insuranceType === "all" ? "All" : insuranceType} Insurance Policies
          </CardTitle>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client name, policy number, or company name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-10 h-9 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(c => (
                    <TableHead key={c.key} className="text-xs font-semibold uppercase">{c.label}</TableHead>
                  ))}
                  <TableHead className="text-xs font-semibold uppercase w-24">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length + 1} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length + 1} className="text-center py-8 text-muted-foreground">No data available in table</TableCell>
                  </TableRow>
                ) : (
                  paged.map((p: any) => (
                    <TableRow key={p.id}>
                      {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(c => (
                        <TableCell key={c.key} className="text-sm">
                          {c.key === "total_premium" || c.key === "net_premium" ? (
                            <span className="font-semibold">{getColValue(p, c.key)}</span>
                          ) : (
                            getColValue(p, c.key)
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-chart-2" title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete"
                            onClick={() => { if (confirm("Delete this policy?")) deletePolicy.mutate(p.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {/* Total row */}
                {paged.length > 0 && (
                  <TableRow className="bg-muted/30 font-semibold">
                    {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(c => (
                      <TableCell key={c.key} className="text-sm">
                        {c.key === "total_premium" ? `TOTAL : ₹${totalPremium.toLocaleString("en-IN")}` :
                         c.key === "client_name" ? `${filtered.length} records` : ""}
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>Showing {filtered.length === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} entries</span>
            <div className="flex gap-1 items-center">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <Button key={i} variant={page === i ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(i)}>{i + 1}</Button>
              ))}
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customize Columns Dialog */}
      <Dialog open={showColumns} onOpenChange={setShowColumns}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Customize Columns</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary">Select Columns</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={visibleCols.length === ALL_COLUMNS.length}
                  onCheckedChange={(checked) => {
                    setVisibleCols(checked ? ALL_COLUMNS.map(c => c.key) : ["client_name"]);
                  }}
                />
                Check All
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_COLUMNS.map(c => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted/50">
                  <Checkbox
                    checked={visibleCols.includes(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowColumns(false)}>Cancel</Button>
              <Button onClick={() => setShowColumns(false)}>Apply Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Policy Sheet */}
      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Motor Insurance</SheetTitle>
          </SheetHeader>
          <AddPolicyForm clients={clients || []} onClose={() => setShowAddSheet(false)} />
        </SheetContent>
      </Sheet>

      {/* Upload Policy Dialog */}
      <UploadPolicyDialog open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}

function AddPolicyForm({ clients, onClose }: { clients: any[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({});
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("insurance_policies").insert({
        client_id: data.client_id,
        policy_number: data.policy_number || null,
        policy_type: data.policy_type,
        insurer: data.insurer,
        plan_name: data.plan_name || null,
        premium_amount: data.premium ? parseFloat(data.premium) : null,
        net_premium: data.net_premium ? parseFloat(data.net_premium) : null,
        gst_amount: data.gst ? parseFloat(data.gst) : null,
        idv: data.idv ? parseFloat(data.idv) : null,
        ncb_discount: data.ncb ? parseFloat(data.ncb) : null,
        start_date: data.start_date,
        expiry_date: data.expiry_date,
        addons: data.addons ? data.addons.split(",").map((s: string) => s.trim()) : null,
        payment_mode: data.payment_mode || null,
        payment_reference: data.payment_reference || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-policies-full"] });
      toast.success("Policy added!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const fields = [
    { key: "client_id", label: "Client *", type: "client-select" },
    { key: "policy_number", label: "Policy Number", type: "text" },
    { key: "policy_type", label: "Policy Type *", type: "select", options: ["Comprehensive", "Third Party", "Standalone OD"] },
    { key: "insurer", label: "Insurance Company *", type: "text" },
    { key: "plan_name", label: "Plan Name", type: "text" },
    { key: "premium", label: "Total Premium (₹)", type: "number" },
    { key: "net_premium", label: "Net Premium (₹)", type: "number" },
    { key: "gst", label: "GST (₹)", type: "number" },
    { key: "idv", label: "IDV (₹)", type: "number" },
    { key: "ncb", label: "NCB Discount (%)", type: "number" },
    { key: "start_date", label: "Start Date *", type: "date" },
    { key: "expiry_date", label: "Expiry Date *", type: "date" },
    { key: "payment_mode", label: "Payment Mode", type: "select", options: ["Cash", "Online", "Cheque", "UPI", "Card"] },
    { key: "payment_reference", label: "Payment Reference", type: "text" },
    { key: "addons", label: "Add-ons (comma separated)", type: "text" },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
        <p className="font-medium text-primary">💡 Smart Tip</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use "Upload Policy" to auto-extract all fields from a policy document using AI OCR!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key} className={f.key === "addons" ? "col-span-2" : ""}>
            <Label className="text-xs font-medium">{f.label}</Label>
            {f.type === "client-select" ? (
              <Select value={form.client_id || ""} onValueChange={v => set("client_id", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.customer_name || c.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : f.type === "select" ? (
              <Select value={form[f.key] || ""} onValueChange={v => set(f.key, v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {f.options?.map(o => <SelectItem key={o} value={o.toLowerCase().replace(/ /g, "_")}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input type={f.type} value={form[f.key] || ""} onChange={e => set(f.key, e.target.value)} className="h-9 text-sm"
                placeholder={f.key === "addons" ? "zero_dep, engine_protect, rsa..." : undefined}
              />
            )}
          </div>
        ))}
      </div>

      <Button
        className="w-full"
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending || !form.client_id || !form.policy_type || !form.insurer || !form.start_date || !form.expiry_date}
      >
        {mutation.isPending ? "Adding..." : "Add Motor Insurance"}
      </Button>
    </div>
  );
}

function UploadPolicyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Policy Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a policy PDF and our AI will automatically extract all policy details (insurer, premium, IDV, dates, add-ons, etc.)
          </p>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Drop policy PDF here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">Supports PDF, JPG, PNG up to 10MB</p>
            <label className="mt-3 inline-block cursor-pointer">
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <span><Upload className="h-4 w-4" /> Choose File</span>
              </Button>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={() => {
                toast.info("Use the AI Extractor tab for full OCR extraction of policy documents!");
                onClose();
              }} />
            </label>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <p className="font-medium text-primary">🤖 AI-Powered Extraction</p>
            <p className="text-xs text-muted-foreground mt-1">
              The AI Extractor tab can parse 20+ fields from your policy document automatically: IDV, premium breakdown, add-ons, engine/chassis numbers, and more.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
