import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Plus, Phone, Mail, Eye, Edit, Trash2,
  Download, ChevronLeft, ChevronRight, User, X,
  MessageSquare, Share2, PhoneCall
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

export function InsuranceClientsManager() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [viewClient, setViewClient] = useState<any>(null);
  const [clientFilter, setClientFilter] = useState<"all" | "prospect" | "active" | "won" | "lost">("all");
  const queryClient = useQueryClient();
  const pageSize = 15;

  const { data: clients, isLoading } = useQuery({
    queryKey: ["ins-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, vehicle_number, advisor_name, created_at, is_active, lead_status, lead_source")
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

  const policyMap = useMemo(() => {
    if (!policies) return new Map();
    const map = new Map<string, typeof policies>();
    policies.forEach(p => {
      const arr = map.get(p.client_id || "") || [];
      arr.push(p);
      map.set(p.client_id || "", arr);
    });
    return map;
  }, [policies]);

  const filtered = useMemo(() => {
    if (!clients) return [];
    let result = [...clients];
    
    // Client type filter
    if (clientFilter === "prospect") {
      result = result.filter(c => !c.lead_status || c.lead_status === "new" || c.lead_status === "running");
    } else if (clientFilter === "active") {
      result = result.filter(c => c.lead_status === "won");
    } else if (clientFilter === "won") {
      result = result.filter(c => c.lead_status === "won");
    } else if (clientFilter === "lost") {
      result = result.filter(c => c.lead_status === "lost");
    }
    
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [clients, search, clientFilter]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("insurance_policies").delete().eq("client_id", id);
      const { error } = await supabase.from("insurance_clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-clients"] });
      queryClient.invalidateQueries({ queryKey: ["ins-clients-policies"] });
      toast.success("Client deleted");
    },
  });

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ["Customer Name", "Phone", "Email", "Vehicle Number", "Agent", "Policy Count"];
    const rows = filtered.map(c => {
      const phone = c.phone?.startsWith("IB_") ? "" : c.phone;
      return [c.customer_name, phone, c.email || "", c.vehicle_number || "", c.advisor_name || "", policyMap.get(c.id)?.length || 0];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clients-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const displayPhone = (phone: string | null) => {
    if (!phone || phone.startsWith("IB_")) return "—";
    return phone;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Clients</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} total clients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => { setEditClient(null); setShowAdd(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Client
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        {([
          { key: "all", label: "All Clients", count: clients?.length || 0 },
          { key: "prospect", label: "🔵 Prospects", count: clients?.filter(c => !c.lead_status || c.lead_status === "new" || c.lead_status === "running").length || 0 },
          { key: "active", label: "✅ Active (Won)", count: clients?.filter(c => c.lead_status === "won").length || 0 },
          { key: "lost", label: "❌ Lost", count: clients?.filter(c => c.lead_status === "lost").length || 0 },
        ] as { key: typeof clientFilter; label: string; count: number }[]).map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={clientFilter === f.key ? "default" : "outline"}
            className="h-7 text-xs gap-1"
            onClick={() => { setClientFilter(f.key); setPage(0); }}
          >
            {f.label} <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">{f.count}</Badge>
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, phone, email, vehicle..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="pl-10 h-9"
        />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Customer Name</TableHead>
                  <TableHead className="text-xs">Mobile</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Vehicle No.</TableHead>
                  <TableHead className="text-xs">Agent</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-center">Policies</TableHead>
                  <TableHead className="text-xs w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                     <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Loading...</TableCell>
                   </TableRow>
                 ) : paged.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No clients found</TableCell>
                  </TableRow>
                ) : (
                  paged.map((c, i) => {
                    const clientPolicies = policyMap.get(c.id) || [];
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs text-muted-foreground">{page * pageSize + i + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="font-medium text-sm">{c.customer_name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {displayPhone(c.phone) !== "—" ? (
                            <a href={`tel:${c.phone}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {displayPhone(c.phone)}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.email ? (
                            <a href={`mailto:${c.email}`} className="text-sm text-primary hover:underline">{c.email}</a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.vehicle_number ? (
                            <span className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">{c.vehicle_number}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.advisor_name || "—"}</TableCell>
                        <TableCell>
                          {c.lead_status ? (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${
                              c.lead_status === "won" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                              c.lead_status === "lost" ? "bg-red-100 text-red-700 border-red-200" :
                              c.lead_status === "running" ? "bg-amber-100 text-amber-700 border-amber-200" :
                              "bg-blue-100 text-blue-700 border-blue-200"
                            }`}>
                              {c.lead_status === "won" ? "Active" : c.lead_status === "new" || !c.lead_status ? "Prospect" : c.lead_status.charAt(0).toUpperCase() + c.lead_status.slice(1)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border bg-blue-100 text-blue-700 border-blue-200">Prospect</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="text-xs">{clientPolicies.length}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            {displayPhone(c.phone) !== "—" && (
                              <>
                                <a href={`tel:${c.phone}`}>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Call">
                                    <PhoneCall className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                </a>
                                <a href={`https://wa.me/91${c.phone}`} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="WhatsApp">
                                    <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                </a>
                              </>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View" onClick={() => setViewClient(c)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => { setEditClient(c); setShowAdd(true); }}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete"
                              onClick={() => { if (confirm("Delete this client and all their policies?")) deleteClient.mutate(c.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>{filtered.length === 0 ? "No entries" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`}</span>
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

      {/* Add/Edit Sheet */}
      <Sheet open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) setEditClient(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editClient ? "Edit Client" : "Add Client"}</SheetTitle>
          </SheetHeader>
          <QuickClientForm initial={editClient} onClose={() => { setShowAdd(false); setEditClient(null); }} />
        </SheetContent>
      </Sheet>

      {/* View Client Dialog */}
      {viewClient && (
        <ClientDetailDialog
          client={viewClient}
          policies={policyMap.get(viewClient.id) || []}
          onClose={() => setViewClient(null)}
        />
      )}
    </div>
  );
}

// ── Quick Add/Edit Form ──
function QuickClientForm({ initial, onClose }: { initial: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customer_name: initial?.customer_name || "",
    phone: (initial?.phone && !initial.phone.startsWith("IB_")) ? initial.phone : "",
    email: initial?.email || "",
    vehicle_number: initial?.vehicle_number || "",
    advisor_name: initial?.advisor_name || "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.customer_name) { toast.error("Customer name is required"); return; }
    const payload = {
      customer_name: form.customer_name,
      phone: form.phone || `IB_${Date.now()}`,
      email: form.email || null,
      vehicle_number: form.vehicle_number || null,
      advisor_name: form.advisor_name || null,
    };

    try {
      if (initial?.id) {
        const { error } = await supabase.from("insurance_clients").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("insurance_clients").insert(payload);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["ins-clients"] });
      toast.success(initial ? "Updated" : "Client added");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fields = [
    { key: "customer_name", label: "Customer Name *", placeholder: "Full name" },
    { key: "phone", label: "Mobile Number", placeholder: "10-digit number" },
    { key: "email", label: "Email", placeholder: "email@example.com" },
    { key: "vehicle_number", label: "Vehicle Number", placeholder: "HR26AB1234" },
    { key: "advisor_name", label: "Agent / Advisor", placeholder: "Agent name" },
  ];

  return (
    <div className="space-y-4 mt-4">
      {fields.map(f => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs font-medium">{f.label}</Label>
          <Input
            value={(form as any)[f.key]}
            onChange={e => set(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="h-9"
          />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button onClick={save} className="flex-1">Save</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Client Detail Dialog ──
function ClientDetailDialog({ client, policies, onClose }: { client: any; policies: any[]; onClose: () => void }) {
  const phone = client.phone?.startsWith("IB_") ? null : client.phone;

  const shareClient = () => {
    const text = `👤 Client: ${client.customer_name}\n📱 Mobile: ${phone || "N/A"}\n✉️ Email: ${client.email || "N/A"}\n🚗 Vehicle: ${client.vehicle_number || "N/A"}\n👨‍💼 Agent: ${client.advisor_name || "N/A"}\n📋 Policies: ${policies.length}\n\n— Grabyourcar Insurance`;
    if (navigator.share) {
      navigator.share({ title: `Client - ${client.customer_name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied!");
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {client.customer_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Mobile</p>
              <p className="font-medium">{phone || "Not available"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="font-medium">{client.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Vehicle</p>
              <p className="font-mono font-medium">{client.vehicle_number || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Agent</p>
              <p className="font-medium">{client.advisor_name || "—"}</p>
            </div>
          </div>

          {/* Communication Hub */}
          <div className="flex flex-wrap gap-2 py-2 border-y">
            {phone && (
              <>
                <a href={`tel:${phone}`}>
                  <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                    <PhoneCall className="h-3.5 w-3.5" /> Call
                  </Button>
                </a>
                <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-green-600" /> WhatsApp
                  </Button>
                </a>
                <a href={`sms:${phone}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">SMS</Button>
                </a>
              </>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Button>
              </a>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={shareClient}>
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
          </div>

          {policies.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Policies ({policies.length})</h4>
              <div className="space-y-2">
                {policies.map(p => (
                  <div key={p.id} className="p-3 rounded-lg bg-muted/30 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-medium">{p.policy_number}</p>
                        <p className="text-muted-foreground text-xs">{p.insurer}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{Number(p.premium_amount || 0).toLocaleString("en-IN")}</p>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs">{p.status}</Badge>
                      </div>
                    </div>
                    {p.expiry_date && (
                      <p className="text-xs text-muted-foreground mt-1">Renewal: {format(new Date(p.expiry_date), "dd MMM yyyy")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
