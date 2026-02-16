import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search, Plus, Phone, Mail, Car, Calendar, User, ChevronRight,
  Filter, Download, Eye, Edit, Clock, MapPin, Shield
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  quoted: "bg-purple-100 text-purple-800",
  negotiating: "bg-orange-100 text-orange-800",
  converted: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
  renewal: "bg-teal-100 text-teal-800",
};

const STATUSES = ["new", "contacted", "quoted", "negotiating", "converted", "lost", "renewal"];

export function InsuranceClientsManager() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["ins-crm-clients", search, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("insurance_clients")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") q = q.eq("lead_status", statusFilter);
      if (search) {
        q = q.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,vehicle_number.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("insurance_clients")
        .update({ lead_status: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-crm-clients"] });
      toast.success("Status updated");
    },
  });

  const addClient = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const { error } = await supabase.from("insurance_clients").insert({
        customer_name: form.name,
        phone: form.phone,
        email: form.email || null,
        vehicle_number: form.vehicle || null,
        vehicle_make: form.make || null,
        vehicle_model: form.model || null,
        city: form.city || null,
        current_policy_type: form.policyType || null,
        lead_source: form.source || "manual",
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-crm-clients"] });
      toast.success("Client added");
      setShowAddDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, vehicle, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Insurance Client</DialogTitle>
            </DialogHeader>
            <AddClientForm onSubmit={(f) => addClient.mutate(f)} loading={addClient.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Loading clients...</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium">Client</th>
                    <th className="text-left py-3 px-4 font-medium">Vehicle</th>
                    <th className="text-left py-3 px-4 font-medium">Policy</th>
                    <th className="text-left py-3 px-4 font-medium">Expiry</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Source</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients?.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{c.customer_name || "—"}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </p>
                          {c.email && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {c.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {c.vehicle_number ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Car className="h-3 w-3" /> {c.vehicle_number}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {c.vehicle_make ? `${c.vehicle_make} ${c.vehicle_model || ""}` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{c.current_policy_type || "—"}</span>
                        </div>
                        {c.current_insurer && (
                          <p className="text-xs text-muted-foreground mt-0.5">{c.current_insurer}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {c.policy_expiry_date ? (
                          <span className={`text-xs flex items-center gap-1 ${
                            new Date(c.policy_expiry_date) < new Date() ? "text-destructive font-medium" : ""
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(c.policy_expiry_date).toLocaleDateString("en-IN")}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={c.lead_status || "new"}
                          onValueChange={(v) => updateStatus.mutate({ id: c.id, status: v })}
                        >
                          <SelectTrigger className="h-7 text-xs w-[110px] border-0 p-0">
                            <Badge className={`${STATUS_COLORS[c.lead_status || "new"]} text-[10px] border-0`}>
                              {c.lead_status || "new"}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => (
                              <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{c.lead_source || "—"}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setSelectedClient(c)}
                        >
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!clients || clients.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">No clients found</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Detail Sheet */}
      {selectedClient && (
        <ClientDetailSheet
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}

function AddClientForm({ onSubmit, loading }: { onSubmit: (f: Record<string, string>) => void; loading: boolean }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Name *</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} /></div>
        <div><Label className="text-xs">Phone *</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
        <div><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
        <div><Label className="text-xs">City</Label><Input value={form.city || ""} onChange={e => set("city", e.target.value)} /></div>
        <div><Label className="text-xs">Vehicle Number</Label><Input value={form.vehicle || ""} onChange={e => set("vehicle", e.target.value)} /></div>
        <div><Label className="text-xs">Make</Label><Input value={form.make || ""} onChange={e => set("make", e.target.value)} /></div>
        <div><Label className="text-xs">Model</Label><Input value={form.model || ""} onChange={e => set("model", e.target.value)} /></div>
        <div>
          <Label className="text-xs">Policy Type</Label>
          <Select value={form.policyType || ""} onValueChange={v => set("policyType", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="comprehensive">Comprehensive</SelectItem>
              <SelectItem value="third_party">Third Party</SelectItem>
              <SelectItem value="standalone_od">Standalone OD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs">Source</Label><Input value={form.source || ""} onChange={e => set("source", e.target.value)} placeholder="website, referral, walk-in..." /></div>
      <div><Label className="text-xs">Notes</Label><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.name || !form.phone} className="w-full">
        {loading ? "Adding..." : "Add Client"}
      </Button>
    </div>
  );
}

function ClientDetailSheet({ client, onClose }: { client: any; onClose: () => void }) {
  const { data: activities } = useQuery({
    queryKey: ["ins-client-activities", client.id],
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

  const { data: policies } = useQuery({
    queryKey: ["ins-client-policies", client.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {client.customer_name || client.phone}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Info */}
          <Card>
            <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{client.phone}</div>
              <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{client.email || "—"}</div>
              <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{client.city || "—"}</div>
              <div className="flex items-center gap-2"><Car className="h-3.5 w-3.5 text-muted-foreground" />{client.vehicle_number || "—"}</div>
              <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-muted-foreground" />{client.current_policy_type || "—"}</div>
              <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />{client.policy_expiry_date ? new Date(client.policy_expiry_date).toLocaleDateString("en-IN") : "—"}</div>
            </CardContent>
          </Card>

          {/* Policies */}
          {policies && policies.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Policies</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {policies.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                    <div>
                      <p className="font-medium">{p.insurer} — {p.policy_type}</p>
                      <p className="text-xs text-muted-foreground">{p.policy_number || "No policy #"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                      <p className="text-xs mt-0.5">₹{p.premium_amount?.toLocaleString("en-IN") || 0}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
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
