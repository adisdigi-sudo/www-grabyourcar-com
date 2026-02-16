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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Plus, Phone, Mail, Car, Calendar, User, Eye, Edit, Trash2,
  Download, Upload, X, ChevronLeft, ChevronRight, AlertTriangle,
  Power, Shield, MapPin, FileUp
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

const STATUSES = ["new", "contacted", "quoted", "negotiating", "converted", "lost", "renewal"];

export function InsuranceClientsManager() {
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [viewClient, setViewClient] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const queryClient = useQueryClient();
  const pageSize = 15;

  const { data: clients, isLoading } = useQuery({
    queryKey: ["ins-clients-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["ins-clients-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("id, client_id, policy_number, insurer, premium_amount, expiry_date, status");
      if (error) throw error;
      return data;
    },
  });

  // Get unique agents
  const agents = useMemo(() => {
    if (!clients) return [];
    const set = new Set(clients.map(c => c.advisor_name).filter(Boolean));
    return Array.from(set) as string[];
  }, [clients]);

  // Expiring policies alert
  const expiringIn7Days = useMemo(() => {
    if (!policies) return 0;
    const now = new Date();
    return policies.filter(p => {
      if (!p.expiry_date || p.status !== "active") return false;
      const days = differenceInDays(new Date(p.expiry_date), now);
      return days >= 0 && days <= 7;
    }).length;
  }, [policies]);

  // Filtered & searched clients
  const filtered = useMemo(() => {
    if (!clients) return [];
    let result = clients;
    if (agentFilter !== "all") result = result.filter(c => c.advisor_name === agentFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.id?.includes(s)
      );
    }
    return result;
  }, [clients, agentFilter, search]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  // Get client ID (short)
  const clientId = (id: string) => id?.slice(0, 12).toUpperCase() || "—";

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("insurance_clients")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-clients-full"] });
      toast.success("Status updated");
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-clients-full"] });
      toast.success("Client deleted");
    },
  });

  const downloadCSV = () => {
    if (!filtered.length) return;
    const headers = ["Name", "Phone", "Email", "City", "Vehicle", "PolicyType", "Expiry", "Agent", "Status"];
    const rows = filtered.map(c => [
      c.customer_name, c.phone, c.email, c.city, c.vehicle_number,
      c.current_policy_type, c.policy_expiry_date, c.advisor_name, c.is_active ? "Active" : "Inactive"
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v || ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "insurance-customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Expiry Alert Banner */}
      {expiringIn7Days > 0 && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-medium">
            Your Plans Expired In 7 Days ! ({expiringIn7Days} policies)
          </AlertDescription>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Select value={agentFilter} onValueChange={v => { setAgentFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5">
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button variant="default" size="sm" onClick={downloadCSV} className="gap-1.5 bg-chart-2 hover:bg-chart-2/90 text-white">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => setShowAddSheet(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Customer List</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-10 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">S.NO.</TableHead>
                  <TableHead>CUSTOMER</TableHead>
                  <TableHead>CLIENT ID</TableHead>
                  <TableHead>PASSWORD</TableHead>
                  <TableHead>AGENT NAME</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead className="w-40">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No data available in table
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((c, i) => (
                    <TableRow key={c.id}>
                      <TableCell>{page * pageSize + i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{c.customer_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{c.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{clientId(c.id)}</TableCell>
                      <TableCell className="font-mono text-xs">{c.id?.slice(-5).toUpperCase() || "—"}</TableCell>
                      <TableCell className="text-sm">{c.advisor_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.is_active !== false ? "default" : "secondary"} className="text-xs">
                          {c.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-primary"
                            title="View" onClick={() => setViewClient(c)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-chart-2"
                            title="Edit" onClick={() => { setEditClient(c); setShowAddSheet(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            title="Delete" onClick={() => {
                              if (confirm("Delete this customer?")) deleteClient.mutate(c.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title={c.is_active !== false ? "Deactivate" : "Activate"}
                            onClick={() => toggleActive.mutate({ id: c.id, active: c.is_active === false })}
                          >
                            <Power className={`h-4 w-4 ${c.is_active !== false ? "text-chart-2" : "text-muted-foreground"}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>Showing {filtered.length === 0 ? 0 : page * pageSize + 1} to {Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} entries</span>
            <div className="flex gap-1 items-center">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <Button
                  key={i}
                  variant={page === i ? "default" : "outline"}
                  size="sm" className="w-8 h-8 p-0"
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Customer Sheet */}
      <Sheet open={showAddSheet} onOpenChange={(o) => { setShowAddSheet(o); if (!o) setEditClient(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editClient ? "Edit Customer" : "Add Customer"}</SheetTitle>
          </SheetHeader>
          <AddEditCustomerForm
            initial={editClient}
            onClose={() => { setShowAddSheet(false); setEditClient(null); }}
          />
        </SheetContent>
      </Sheet>

      {/* View Customer Dialog */}
      {viewClient && (
        <CustomerDetailDialog client={viewClient} onClose={() => setViewClient(null)} />
      )}

      {/* Import Dialog */}
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

function AddEditCustomerForm({ initial, onClose }: { initial: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>(initial || {});
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        customer_name: data.customer_name,
        phone: data.phone,
        email: data.email || null,
        city: data.city || null,
        state: data.state || null,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        vehicle_number: data.vehicle_number || null,
        vehicle_make: data.vehicle_make || null,
        vehicle_model: data.vehicle_model || null,
        vehicle_variant: data.vehicle_variant || null,
        vehicle_year: data.vehicle_year ? parseInt(data.vehicle_year) : null,
        vehicle_fuel_type: data.vehicle_fuel_type || null,
        engine_number: data.engine_number || null,
        chassis_number: data.chassis_number || null,
        current_insurer: data.current_insurer || null,
        current_policy_number: data.current_policy_number || null,
        current_policy_type: data.current_policy_type || null,
        policy_start_date: data.policy_start_date || null,
        policy_expiry_date: data.policy_expiry_date || null,
        current_premium: data.current_premium ? parseFloat(data.current_premium) : null,
        ncb_percentage: data.ncb_percentage ? parseFloat(data.ncb_percentage) : null,
        advisor_name: data.advisor_name || null,
        lead_source: data.lead_source || "manual",
        notes: data.notes || null,
        anniversary_date: data.anniversary_date || null,
      };

      if (initial?.id) {
        const { error } = await supabase.from("insurance_clients").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("insurance_clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-clients-full"] });
      toast.success(initial ? "Customer updated" : "Customer added");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const fields = [
    { key: "customer_name", label: "Full Name *", type: "text" },
    { key: "phone", label: "Phone *", type: "tel" },
    { key: "email", label: "Email", type: "email" },
    { key: "date_of_birth", label: "Date of Birth", type: "date" },
    { key: "anniversary_date", label: "Anniversary Date", type: "date" },
    { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
    { key: "city", label: "City", type: "text" },
    { key: "state", label: "State", type: "text" },
    { key: "vehicle_number", label: "Vehicle Number", type: "text" },
    { key: "vehicle_make", label: "Vehicle Make", type: "text" },
    { key: "vehicle_model", label: "Vehicle Model", type: "text" },
    { key: "vehicle_variant", label: "Vehicle Variant", type: "text" },
    { key: "vehicle_year", label: "Vehicle Year", type: "number" },
    { key: "vehicle_fuel_type", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"] },
    { key: "engine_number", label: "Engine Number", type: "text" },
    { key: "chassis_number", label: "Chassis Number", type: "text" },
    { key: "current_insurer", label: "Current Insurer", type: "text" },
    { key: "current_policy_number", label: "Policy Number", type: "text" },
    { key: "current_policy_type", label: "Policy Type", type: "select", options: ["Comprehensive", "Third Party", "Standalone OD"] },
    { key: "policy_start_date", label: "Policy Start", type: "date" },
    { key: "policy_expiry_date", label: "Policy Expiry", type: "date" },
    { key: "current_premium", label: "Premium (₹)", type: "number" },
    { key: "ncb_percentage", label: "NCB %", type: "number" },
    { key: "advisor_name", label: "Agent/Advisor", type: "text" },
    { key: "lead_source", label: "Source", type: "text" },
  ];

  return (
    <div className="space-y-4 mt-4">
      {/* Smart Extract hint */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
        <p className="font-medium text-primary">💡 Smart Tip</p>
        <p className="text-xs text-muted-foreground mt-1">
          Use the "AI Extractor" tab to auto-extract policy data from documents. It will fill all fields automatically!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key} className={f.key === "notes" ? "col-span-2" : ""}>
            <Label className="text-xs font-medium">{f.label}</Label>
            {f.type === "select" ? (
              <Select value={form[f.key] || ""} onValueChange={v => set(f.key, v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {f.options?.map(o => <SelectItem key={o} value={o.toLowerCase().replace(/ /g, "_")}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={f.type}
                value={form[f.key] || ""}
                onChange={e => set(f.key, e.target.value)}
                className="h-9 text-sm"
              />
            )}
          </div>
        ))}
        <div className="col-span-2">
          <Label className="text-xs font-medium">Notes</Label>
          <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} />
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => mutation.mutate(form)}
        disabled={mutation.isPending || !form.customer_name || !form.phone}
      >
        {mutation.isPending ? "Saving..." : initial ? "Update Customer" : "Add Customer"}
      </Button>
    </div>
  );
}

function CustomerDetailDialog({ client, onClose }: { client: any; onClose: () => void }) {
  const { data: clientPolicies } = useQuery({
    queryKey: ["ins-client-detail-policies", client.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["ins-client-detail-activities", client.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_activity_log")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const infoRows = [
    { icon: Phone, label: "Phone", value: client.phone },
    { icon: Mail, label: "Email", value: client.email },
    { icon: MapPin, label: "City", value: `${client.city || ""}${client.state ? `, ${client.state}` : ""}` },
    { icon: Calendar, label: "DOB", value: client.date_of_birth ? format(new Date(client.date_of_birth), "dd/MM/yyyy") : null },
    { icon: Car, label: "Vehicle", value: `${client.vehicle_number || ""} ${client.vehicle_make || ""} ${client.vehicle_model || ""}`.trim() },
    { icon: Shield, label: "Policy", value: `${client.current_policy_type || ""} • ${client.current_insurer || ""}`.trim() },
    { icon: Calendar, label: "Policy Expiry", value: client.policy_expiry_date ? format(new Date(client.policy_expiry_date), "dd/MM/yyyy") : null },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {client.customer_name} — <span className="text-xs font-mono text-muted-foreground">{client.id?.slice(0, 12).toUpperCase()}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 grid grid-cols-2 gap-2">
              {infoRows.map(r => (
                <div key={r.label} className="flex items-center gap-2 text-sm">
                  <r.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{r.label}:</span>
                  <span className="font-medium truncate">{r.value || "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {clientPolicies && clientPolicies.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Policies ({clientPolicies.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {clientPolicies.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{p.insurer} — {p.policy_type}</p>
                      <p className="text-xs text-muted-foreground">{p.policy_number} • Expires: {p.expiry_date ? format(new Date(p.expiry_date), "dd/MM/yyyy") : "N/A"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                      <p className="text-sm font-semibold mt-0.5">₹{p.premium_amount?.toLocaleString("en-IN") || 0}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              {activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((a: any) => (
                    <div key={a.id} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="font-medium">{a.title}</p>
                        {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(a.created_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No activity recorded yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("CSV must have headers and data"); return; }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.replace(/^"|"$/g, "").trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
        return obj;
      });

      const mapped = rows.map(r => ({
        customer_name: r.name || r.customer_name || r.customer || "",
        phone: (r.phone || r.mobile || r.contact || "").replace(/\D/g, "").slice(-10),
        email: r.email || null,
        city: r.city || null,
        vehicle_number: r.vehicle_number || r.vehicle || r.registration || null,
        vehicle_make: r.make || r.vehicle_make || r.brand || null,
        vehicle_model: r.model || r.vehicle_model || null,
        current_insurer: r.insurer || r.current_insurer || r.insurance_company || null,
        current_policy_number: r.policy_number || r.current_policy_number || null,
        policy_expiry_date: r.expiry_date || r.policy_expiry_date || r.expiry || null,
        lead_source: "csv_import",
      })).filter(r => r.customer_name && r.phone.length === 10);

      if (mapped.length === 0) { toast.error("No valid rows found"); return; }

      const { error } = await supabase.from("insurance_clients").insert(mapped);
      if (error) throw error;

      toast.success(`Imported ${mapped.length} customers`);
      queryClient.invalidateQueries({ queryKey: ["ins-clients-full"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with columns: name, phone, email, city, vehicle_number, make, model, insurer, policy_number, expiry_date
          </p>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <label className="cursor-pointer">
              <span className="text-sm font-medium text-primary hover:underline">
                {importing ? "Importing..." : "Choose CSV File"}
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={importing} />
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
