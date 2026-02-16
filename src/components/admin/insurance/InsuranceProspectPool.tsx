import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, Phone, Search, ArrowRightCircle, AlertTriangle,
  PhoneCall, MessageSquare, Mail, Clock, Plus, Filter,
  Database, UserCheck, UserX, PhoneOff, CalendarClock, RotateCcw
} from "lucide-react";

const STATUSES = [
  { value: "new", label: "New", icon: Database, color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", icon: PhoneCall, color: "bg-sky-500" },
  { value: "interested", label: "Interested", icon: UserCheck, color: "bg-emerald-500" },
  { value: "callback", label: "Call Back", icon: CalendarClock, color: "bg-amber-500" },
  { value: "not_reachable", label: "Not Reachable", icon: PhoneOff, color: "bg-orange-500" },
  { value: "not_interested", label: "Not Interested", icon: UserX, color: "bg-red-500" },
  { value: "converted", label: "Converted", icon: ArrowRightCircle, color: "bg-green-600" },
] as const;

const DATA_SOURCES = [
  { value: "rollover_data", label: "Rollover Data" },
  { value: "purchased_database", label: "Purchased Database" },
  { value: "corporate_data", label: "Corporate Data" },
  { value: "marketing_campaign", label: "Marketing Campaign" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "website_lead", label: "Website Lead" },
  { value: "other", label: "Other" },
];

type Prospect = {
  id: string;
  phone: string;
  customer_name: string | null;
  email: string | null;
  vehicle_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  policy_type: string | null;
  expiry_date: string | null;
  insurer: string | null;
  premium_amount: number | null;
  city: string | null;
  prospect_status: string;
  data_source: string;
  is_grabyourcar_customer: boolean | null;
  duplicate_of_client_id: string | null;
  last_contacted_at: string | null;
  next_callback_at: string | null;
  call_count: number | null;
  notes: string | null;
  converted_to_lead_id: string | null;
  converted_at: string | null;
  created_at: string;
};

export function InsuranceProspectPool() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState<Prospect | null>(null);
  const [detailOpen, setDetailOpen] = useState<Prospect | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{ prospect: any; existingClient: any } | null>(null);

  // Form state for add
  const [form, setForm] = useState({
    phone: "", customer_name: "", email: "", vehicle_number: "",
    vehicle_make: "", vehicle_model: "", policy_type: "comprehensive",
    expiry_date: "", insurer: "", premium_amount: "",
    data_source: "website_lead", notes: "", city: "",
  });

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["insurance-prospects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_prospects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Prospect[];
    },
  });

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      const matchSearch = !search || 
        p.phone?.includes(search) ||
        p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.vehicle_number?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.prospect_status === statusFilter;
      const matchSource = sourceFilter === "all" || p.data_source === sourceFilter;
      return matchSearch && matchStatus && matchSource;
    });
  }, [prospects, search, statusFilter, sourceFilter]);

  const stats = useMemo(() => ({
    total: prospects.length,
    new: prospects.filter(p => p.prospect_status === "new").length,
    contacted: prospects.filter(p => p.prospect_status === "contacted").length,
    interested: prospects.filter(p => p.prospect_status === "interested").length,
    converted: prospects.filter(p => p.prospect_status === "converted").length,
    notInterested: prospects.filter(p => p.prospect_status === "not_interested").length,
  }), [prospects]);

  // Duplicate check
  const checkDuplicate = async (phone: string) => {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length < 10) return null;
    const { data } = await supabase
      .from("insurance_clients")
      .select("id, customer_name, phone")
      .eq("phone", cleaned)
      .limit(1);
    return data?.length ? data[0] : null;
  };

  // Add prospect
  const addMutation = useMutation({
    mutationFn: async () => {
      const cleaned = form.phone.replace(/\D/g, "").slice(-10);
      if (cleaned.length < 10) throw new Error("Invalid phone number");

      // Check duplicate against existing clients
      const existing = await checkDuplicate(cleaned);
      if (existing) {
        setDuplicateAlert({ prospect: form, existingClient: existing });
        throw new Error("DUPLICATE");
      }

      const { error } = await supabase.from("insurance_prospects").insert({
        phone: cleaned,
        customer_name: form.customer_name || null,
        email: form.email || null,
        vehicle_number: form.vehicle_number || null,
        vehicle_make: form.vehicle_make || null,
        vehicle_model: form.vehicle_model || null,
        policy_type: form.policy_type || null,
        expiry_date: form.expiry_date || null,
        insurer: form.insurer || null,
        premium_amount: form.premium_amount ? Number(form.premium_amount) : null,
        data_source: form.data_source as any,
        notes: form.notes || null,
        city: form.city || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prospect added to pool");
      qc.invalidateQueries({ queryKey: ["insurance-prospects"] });
      setAddOpen(false);
      setForm({ phone: "", customer_name: "", email: "", vehicle_number: "", vehicle_make: "", vehicle_model: "", policy_type: "comprehensive", expiry_date: "", insurer: "", premium_amount: "", data_source: "website_lead", notes: "", city: "" });
    },
    onError: (e: any) => {
      if (e.message !== "DUPLICATE") toast.error(e.message);
    },
  });

  // Update status
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: any = {
        prospect_status: status,
        last_contacted_at: new Date().toISOString(),
        call_count: undefined,
      };
      if (notes) updates.notes = notes;

      // Increment call count
      const prospect = prospects.find(p => p.id === id);
      if (prospect) updates.call_count = (prospect.call_count || 0) + 1;

      const { error } = await supabase.from("insurance_prospects").update(updates).eq("id", id);
      if (error) throw error;

      // Log activity
      await supabase.from("insurance_prospect_activity").insert({
        prospect_id: id,
        activity_type: "status_change",
        title: `Status → ${status}`,
        description: notes || `Prospect marked as ${status}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance-prospects"] });
    },
  });

  // Convert to Lead
  const convertMutation = useMutation({
    mutationFn: async (prospect: Prospect) => {
      // Insert into insurance_clients
      const { data: newClient, error } = await supabase.from("insurance_clients").insert({
        phone: prospect.phone,
        customer_name: prospect.customer_name || null,
        email: prospect.email || null,
        vehicle_number: prospect.vehicle_number || null,
        vehicle_make: prospect.vehicle_make || null,
        vehicle_model: prospect.vehicle_model || null,
        current_policy_type: prospect.policy_type || null,
        lead_source: prospect.data_source,
        notes: prospect.notes || null,
      }).select("id").single();
      if (error) throw error;

      // Update prospect as converted
      await supabase.from("insurance_prospects").update({
        prospect_status: "converted",
        converted_to_lead_id: newClient.id,
        converted_at: new Date().toISOString(),
      }).eq("id", prospect.id);

      // Log activity
      await supabase.from("insurance_prospect_activity").insert({
        prospect_id: prospect.id,
        activity_type: "converted",
        title: "Converted to Lead",
        description: `Prospect converted to qualified lead`,
        metadata: { lead_id: newClient.id },
      });

      // Log in client activity
      await supabase.from("insurance_activity_log").insert({
        client_id: newClient.id,
        activity_type: "lead_created",
        title: "Converted from Prospect Pool",
        description: `Originally from ${prospect.data_source}`,
        metadata: { prospect_id: prospect.id, source: prospect.data_source },
      });
    },
    onSuccess: () => {
      toast.success("Prospect converted to qualified lead!");
      qc.invalidateQueries({ queryKey: ["insurance-prospects"] });
      qc.invalidateQueries({ queryKey: ["insurance-clients"] });
      setConvertOpen(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(x => x.value === status);
    if (!s) return <Badge variant="outline">{status}</Badge>;
    return (
      <Badge className={`${s.color} text-white text-[10px] px-2`}>
        {s.label}
      </Badge>
    );
  };

  const getSourceLabel = (src: string) => DATA_SOURCES.find(d => d.value === src)?.label || src;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-primary", icon: Database },
          { label: "New", value: stats.new, color: "text-blue-500", icon: Plus },
          { label: "Contacted", value: stats.contacted, color: "text-sky-500", icon: PhoneCall },
          { label: "Interested", value: stats.interested, color: "text-emerald-500", icon: UserCheck },
          { label: "Converted", value: stats.converted, color: "text-green-600", icon: ArrowRightCircle },
          { label: "Not Int.", value: stats.notInterested, color: "text-red-500", icon: UserX },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-3 pb-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search phone, name, vehicle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[170px]"><Database className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {DATA_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Prospect
        </Button>
      </div>

      {/* Prospect Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Prospect Pool — Data Bank</CardTitle>
          <CardDescription>Pre-qualified records. Convert to lead when interested.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground py-8 text-center">Loading prospects...</p> : (
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Phone</th>
                    <th className="text-left py-2 px-2 font-medium">Name</th>
                    <th className="text-left py-2 px-2 font-medium">Status</th>
                    <th className="text-left py-2 px-2 font-medium">Source</th>
                    <th className="text-left py-2 px-2 font-medium hidden md:table-cell">Vehicle</th>
                    <th className="text-left py-2 px-2 font-medium hidden lg:table-cell">Calls</th>
                    <th className="text-left py-2 px-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className={`border-b hover:bg-muted/50 transition-colors ${p.is_grabyourcar_customer ? "bg-green-500/5" : ""}`}>
                      <td className="py-2 px-2 font-mono text-xs">
                        <div className="flex items-center gap-1">
                          {p.is_grabyourcar_customer && <Badge className="bg-green-600 text-white text-[8px] px-1">GYC</Badge>}
                          {p.phone}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <button onClick={() => setDetailOpen(p)} className="text-primary hover:underline text-left">
                          {p.customer_name || "—"}
                        </button>
                      </td>
                      <td className="py-2 px-2">{getStatusBadge(p.prospect_status)}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{getSourceLabel(p.data_source)}</td>
                      <td className="py-2 px-2 hidden md:table-cell text-xs">{p.vehicle_number || "—"}</td>
                      <td className="py-2 px-2 hidden lg:table-cell text-xs">{p.call_count || 0}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          {/* Quick communication */}
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={`tel:${p.phone}`}><Phone className="h-3.5 w-3.5 text-blue-500" /></a>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={`https://wa.me/91${p.phone}`} target="_blank"><MessageSquare className="h-3.5 w-3.5 text-green-500" /></a>
                          </Button>

                          {/* Quick status buttons */}
                          {p.prospect_status !== "converted" && p.prospect_status !== "not_interested" && (
                            <Select onValueChange={v => {
                              if (v === "interested") {
                                statusMutation.mutate({ id: p.id, status: v });
                                setTimeout(() => setConvertOpen(p), 500);
                              } else {
                                statusMutation.mutate({ id: p.id, status: v });
                              }
                            }}>
                              <SelectTrigger className="h-7 w-7 p-0 border-0 [&>svg]:hidden">
                                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.filter(s => s.value !== "converted").map(s => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Convert button for interested */}
                          {(p.prospect_status === "interested" || p.prospect_status === "contacted") && (
                            <Button variant="default" size="sm" className="h-7 text-[10px] px-2 bg-green-600 hover:bg-green-700" onClick={() => setConvertOpen(p)}>
                              <ArrowRightCircle className="h-3 w-3 mr-1" /> Convert
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <p className="text-sm text-muted-foreground text-center py-8">No prospects found</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Prospect Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Prospect to Pool</DialogTitle>
            <DialogDescription>Enter contact details. This will NOT create a lead until qualified.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="10-digit mobile" /></div>
              <div><Label className="text-xs">Name</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Vehicle Number</Label><Input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} /></div>
              <div><Label className="text-xs">Vehicle Make</Label><Input value={form.vehicle_make} onChange={e => setForm(f => ({ ...f, vehicle_make: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Vehicle Model</Label><Input value={form.vehicle_model} onChange={e => setForm(f => ({ ...f, vehicle_model: e.target.value }))} /></div>
              <div><Label className="text-xs">Insurer</Label><Input value={form.insurer} onChange={e => setForm(f => ({ ...f, insurer: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Premium ₹</Label><Input type="number" value={form.premium_amount} onChange={e => setForm(f => ({ ...f, premium_amount: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="text-xs">Data Source *</Label>
              <Select value={form.data_source} onValueChange={v => setForm(f => ({ ...f, data_source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DATA_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Checking..." : "Add to Prospect Pool"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Lead Dialog */}
      <Dialog open={!!convertOpen} onOpenChange={() => setConvertOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-green-600" />
              Convert to Qualified Lead
            </DialogTitle>
            <DialogDescription>This will create a lead in the Insurance CRM and preserve all activity history.</DialogDescription>
          </DialogHeader>
          {convertOpen && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Name:</strong> {convertOpen.customer_name || "—"}</p>
                <p><strong>Phone:</strong> {convertOpen.phone}</p>
                <p><strong>Vehicle:</strong> {convertOpen.vehicle_number || "—"}</p>
                <p><strong>Source:</strong> {getSourceLabel(convertOpen.data_source)}</p>
                <p><strong>Call Count:</strong> {convertOpen.call_count || 0}</p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                <div className="text-sm">
                  <p className="font-medium">Data will transfer seamlessly</p>
                  <p className="text-muted-foreground text-xs">Notes, call logs, and activity history will be preserved.</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => convertOpen && convertMutation.mutate(convertOpen)} disabled={convertMutation.isPending}>
              {convertMutation.isPending ? "Converting..." : "Convert to Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Alert Dialog */}
      <Dialog open={!!duplicateAlert} onOpenChange={() => setDuplicateAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Existing Grabyourcar Customer Found!
            </DialogTitle>
            <DialogDescription>This number is already registered as a customer in the CRM.</DialogDescription>
          </DialogHeader>
          {duplicateAlert && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Existing Client:</p>
              <p className="text-sm">{duplicateAlert.existingClient.customer_name || "Unknown"}</p>
              <p className="text-sm font-mono">{duplicateAlert.existingClient.phone}</p>
              <p className="text-xs text-muted-foreground mt-2">Do NOT cold-call this customer. They are already in the Grabyourcar ecosystem.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateAlert(null)}>Close</Button>
            <Button variant="secondary" onClick={() => {
              // Force add with duplicate flag
              const cleaned = duplicateAlert!.prospect.phone.replace(/\D/g, "").slice(-10);
              supabase.from("insurance_prospects").insert({
                ...duplicateAlert!.prospect,
                phone: cleaned,
                is_grabyourcar_customer: true,
                duplicate_of_client_id: duplicateAlert!.existingClient.id,
                prospect_status: "duplicate",
              }).then(() => {
                qc.invalidateQueries({ queryKey: ["insurance-prospects"] });
                toast.info("Added with duplicate flag");
              });
              setDuplicateAlert(null);
              setAddOpen(false);
            }}>
              Add with Duplicate Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prospect Details</DialogTitle>
          </DialogHeader>
          {detailOpen && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{detailOpen.customer_name || "Unknown"}</h3>
                {getStatusBadge(detailOpen.prospect_status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Phone:</span> {detailOpen.phone}</div>
                <div><span className="text-muted-foreground">Email:</span> {detailOpen.email || "—"}</div>
                <div><span className="text-muted-foreground">City:</span> {detailOpen.city || "—"}</div>
                <div><span className="text-muted-foreground">Source:</span> {getSourceLabel(detailOpen.data_source)}</div>
                <div><span className="text-muted-foreground">Vehicle:</span> {detailOpen.vehicle_number || "—"}</div>
                <div><span className="text-muted-foreground">Make:</span> {detailOpen.vehicle_make || "—"}</div>
                <div><span className="text-muted-foreground">Insurer:</span> {detailOpen.insurer || "—"}</div>
                <div><span className="text-muted-foreground">Premium:</span> {detailOpen.premium_amount ? `₹${detailOpen.premium_amount.toLocaleString()}` : "—"}</div>
                <div><span className="text-muted-foreground">Expiry:</span> {detailOpen.expiry_date || "—"}</div>
                <div><span className="text-muted-foreground">Calls:</span> {detailOpen.call_count || 0}</div>
              </div>
              {detailOpen.notes && (
                <div className="bg-muted/50 rounded p-2 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  {detailOpen.notes}
                </div>
              )}
              {/* Quick actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild><a href={`tel:${detailOpen.phone}`}><Phone className="h-3.5 w-3.5 mr-1" /> Call</a></Button>
                <Button size="sm" variant="outline" asChild><a href={`https://wa.me/91${detailOpen.phone}`} target="_blank"><MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp</a></Button>
                <Button size="sm" variant="outline" asChild><a href={`mailto:${detailOpen.email || ""}`}><Mail className="h-3.5 w-3.5 mr-1" /> Email</a></Button>
              </div>
              {detailOpen.prospect_status !== "converted" && (
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => { setDetailOpen(null); setConvertOpen(detailOpen); }}>
                  <ArrowRightCircle className="h-4 w-4 mr-2" /> Convert to Qualified Lead
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
