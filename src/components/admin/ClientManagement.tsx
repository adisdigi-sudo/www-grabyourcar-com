import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users, UserPlus, Search, Phone, Mail, Car, Shield, Calendar,
  MapPin, Clock, ArrowRight, ChevronRight, MessageSquare,
  FileText, Eye, Edit, Loader2, BarChart3, TrendingUp, Globe,
  ExternalLink, Upload, Download, Hash, Building2,
} from "lucide-react";

const SALES_LIFECYCLE_STAGES = [
  { value: "inquiry", label: "📋 Inquiry", color: "bg-blue-500/20 text-blue-600 border-blue-300", dot: "bg-blue-500" },
  { value: "test_drive", label: "🚗 Test Drive", color: "bg-purple-500/20 text-purple-600 border-purple-300", dot: "bg-purple-500" },
  { value: "negotiation", label: "💬 Negotiation", color: "bg-orange-500/20 text-orange-600 border-orange-300", dot: "bg-orange-500" },
  { value: "booking", label: "📝 Booking", color: "bg-yellow-500/20 text-yellow-600 border-yellow-300", dot: "bg-yellow-500" },
  { value: "delivery", label: "🎉 Delivery", color: "bg-green-500/20 text-green-600 border-green-300", dot: "bg-green-500" },
  { value: "post_delivery", label: "✅ Post-Delivery", color: "bg-teal-500/20 text-teal-600 border-teal-300", dot: "bg-teal-500" },
  { value: "service", label: "🔧 Service", color: "bg-gray-500/20 text-gray-600 border-gray-300", dot: "bg-gray-500" },
  { value: "renewal", label: "🔄 Renewal", color: "bg-red-500/20 text-red-600 border-red-300", dot: "bg-red-500" },
];

const INSURANCE_LIFECYCLE_STAGES = [
  { value: "inquiry", label: "📋 Inquiry", color: "bg-blue-500/20 text-blue-600 border-blue-300", dot: "bg-blue-500" },
  { value: "contacted", label: "📞 Contacted", color: "bg-cyan-500/20 text-cyan-600 border-cyan-300", dot: "bg-cyan-500" },
  { value: "quote_shared", label: "💰 Quote Shared", color: "bg-violet-500/20 text-violet-600 border-violet-300", dot: "bg-violet-500" },
  { value: "follow_up", label: "🔄 Follow-up", color: "bg-orange-500/20 text-orange-600 border-orange-300", dot: "bg-orange-500" },
  { value: "payment_pending", label: "⏳ Payment Pending", color: "bg-yellow-500/20 text-yellow-600 border-yellow-300", dot: "bg-yellow-500" },
  { value: "policy_issued", label: "✅ Policy Issued", color: "bg-green-500/20 text-green-600 border-green-300", dot: "bg-green-500" },
  { value: "renewal", label: "🔄 Renewal", color: "bg-teal-500/20 text-teal-600 border-teal-300", dot: "bg-teal-500" },
  { value: "lost", label: "❌ Lost", color: "bg-red-500/20 text-red-600 border-red-300", dot: "bg-red-500" },
];

interface ClientManagementProps {
  verticalSlug?: string;
}

export const ClientManagement = ({ verticalSlug }: ClientManagementProps) => {
  const LIFECYCLE_STAGES = verticalSlug === "insurance" ? INSURANCE_LIFECYCLE_STAGES : SALES_LIFECYCLE_STAGES;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "detail">("list");
  const [newClient, setNewClient] = useState({
    customer_name: "", phone: "", email: "", city: "",
    car_brand: "", car_model: "", lifecycle_stage: "inquiry",
    source: "", notes: "", external_portal: "", external_portal_url: "",
  });

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clientProfiles", search, stageFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("client_profiles")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (stageFilter !== "all") query = query.eq("lifecycle_stage", stageFilter);
      if (search) {
        query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,vehicle_number.ilike.%${search}%,insurance_policy_number.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch interactions for selected client
  const { data: interactions } = useQuery({
    queryKey: ["clientInteractions", selectedClient?.id],
    enabled: !!selectedClient?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_interactions")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch follow-ups
  const { data: followUps } = useQuery({
    queryKey: ["followUpReminders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("follow_up_reminders")
        .select("*, client_profiles(customer_name, phone)")
        .eq("status", "pending")
        .order("scheduled_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  // Stage counts
  const { data: stageCounts } = useQuery({
    queryKey: ["clientStageCounts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_profiles")
        .select("lifecycle_stage");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        counts[c.lifecycle_stage] = (counts[c.lifecycle_stage] || 0) + 1;
      });
      return counts;
    },
  });

  // Add client
  const addClientMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("client_profiles")
        .insert(newClient);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client added");
      setShowAddDialog(false);
      setNewClient({ customer_name: "", phone: "", email: "", city: "", car_brand: "", car_model: "", lifecycle_stage: "inquiry", source: "", notes: "", external_portal: "", external_portal_url: "" });
      queryClient.invalidateQueries({ queryKey: ["clientProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["clientStageCounts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update lifecycle
  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await (supabase as any)
        .from("client_profiles")
        .update({ lifecycle_stage: stage, last_interaction_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      await (supabase as any).from("client_interactions").insert({
        client_id: id,
        interaction_type: "note",
        summary: `Lifecycle updated to: ${stage}`,
      });
    },
    onSuccess: () => {
      toast.success("Stage updated");
      queryClient.invalidateQueries({ queryKey: ["clientProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["clientStageCounts"] });
      queryClient.invalidateQueries({ queryKey: ["clientInteractions"] });
    },
  });

  // Add interaction
  const addInteractionMutation = useMutation({
    mutationFn: async (data: { client_id: string; interaction_type: string; summary: string }) => {
      const { error } = await (supabase as any).from("client_interactions").insert(data);
      if (error) throw error;
      await (supabase as any).from("client_profiles").update({ last_interaction_at: new Date().toISOString() }).eq("id", data.client_id);
    },
    onSuccess: () => {
      toast.success("Interaction logged");
      queryClient.invalidateQueries({ queryKey: ["clientInteractions"] });
    },
  });

  const getStageConfig = (stage: string) => LIFECYCLE_STAGES.find(s => s.value === stage) || LIFECYCLE_STAGES[0];

  const totalClients = clients?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Client Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Full lifecycle tracking • {totalClients} clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" /> Add Client</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Customer Name *</Label>
                  <Input value={newClient.customer_name} onChange={e => setNewClient(p => ({ ...p, customer_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Phone *</Label>
                  <Input value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={newClient.city} onChange={e => setNewClient(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Source</Label>
                  <Input value={newClient.source} onChange={e => setNewClient(p => ({ ...p, source: e.target.value }))} placeholder="e.g. insurebook, walk-in" />
                </div>
                <div>
                  <Label className="text-xs">Car Brand</Label>
                  <Input value={newClient.car_brand} onChange={e => setNewClient(p => ({ ...p, car_brand: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Car Model</Label>
                  <Input value={newClient.car_model} onChange={e => setNewClient(p => ({ ...p, car_model: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">External Portal</Label>
                  <Input value={newClient.external_portal} onChange={e => setNewClient(p => ({ ...p, external_portal: e.target.value }))} placeholder="InsureBook" />
                </div>
                <div>
                  <Label className="text-xs">Portal URL</Label>
                  <Input value={newClient.external_portal_url} onChange={e => setNewClient(p => ({ ...p, external_portal_url: e.target.value }))} placeholder="https://insurebook.in/..." />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={newClient.notes} onChange={e => setNewClient(p => ({ ...p, notes: e.target.value }))} className="h-16" />
                </div>
                <div className="col-span-2">
                  <Button
                    className="w-full"
                    onClick={() => addClientMutation.mutate()}
                    disabled={!newClient.customer_name || !newClient.phone || addClientMutation.isPending}
                  >
                    {addClientMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Client
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stage Pipeline Cards */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {LIFECYCLE_STAGES.map(stage => {
          const count = stageCounts?.[stage.value] || 0;
          const isActive = stageFilter === stage.value;
          return (
            <button
              key={stage.value}
              onClick={() => setStageFilter(isActive ? "all" : stage.value)}
              className={`rounded-lg p-2 text-center transition-all border ${
                isActive ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] leading-tight text-muted-foreground truncate">{stage.label}</p>
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">All Clients</TabsTrigger>
          <TabsTrigger value="followups">
            Follow-ups
            {followUps?.length ? <Badge variant="destructive" className="ml-1 text-[10px]">{followUps.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          {/* Search & Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, email, vehicle, policy..."
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {LIFECYCLE_STAGES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeView === "list" ? (
            /* ── Rich Card List View (Inspired by Reference) ── */
            <div className="space-y-1">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : !clients?.length ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No clients found</CardContent></Card>
              ) : (
                clients.map((client: any) => {
                  const stage = getStageConfig(client.lifecycle_stage);
                  return (
                    <div
                      key={client.id}
                      className={`group relative flex items-start gap-4 p-4 bg-card rounded-lg border-l-4 transition-all hover:shadow-md cursor-pointer ${
                        selectedClient?.id === client.id ? "ring-1 ring-primary" : ""
                      }`}
                      style={{ borderLeftColor: `var(--${stage.dot === "bg-green-500" ? "success" : "primary"})` }}
                      onClick={() => { setSelectedClient(client); setActiveView("detail"); }}
                    >
                      {/* Left accent dot */}
                      <div className={`mt-1.5 h-3 w-3 rounded-full shrink-0 ${stage.dot}`} />

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-base uppercase tracking-wide">{client.customer_name}</h3>
                          {client.id && (
                            <span className="text-xs text-muted-foreground font-mono">
                              ID:{client.id.slice(0, 8).toUpperCase()}
                            </span>
                          )}
                          <Badge className={`text-[10px] px-2 py-0.5 font-semibold ${stage.color}`}>
                            {stage.label}
                          </Badge>
                        </div>
                        
                        {/* Detail Line */}
                        <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground flex-wrap">
                          {client.insurance_provider && (
                            <>
                              <span>{client.insurance_provider}</span>
                              <span className="text-muted-foreground/40">•</span>
                            </>
                          )}
                          {client.insurance_policy_number && (
                            <>
                              <span>Policy: {client.insurance_policy_number}</span>
                              <span className="text-muted-foreground/40">•</span>
                            </>
                          )}
                          {client.phone && (
                            <>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />{client.phone}
                              </span>
                              <span className="text-muted-foreground/40">•</span>
                            </>
                          )}
                          {(client.car_brand || client.car_model) && (
                            <>
                              <span className="flex items-center gap-1">
                                <Car className="h-3 w-3" />{client.car_brand} {client.car_model} {client.car_variant}
                              </span>
                              <span className="text-muted-foreground/40">•</span>
                            </>
                          )}
                          {client.vehicle_number && (
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{client.vehicle_number}</span>
                          )}
                          {client.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{client.city}
                            </span>
                          )}
                          {client.source && (
                            <Badge variant="outline" className="text-[9px]">{client.source}</Badge>
                          )}
                          {client.external_portal && (
                            <Badge variant="secondary" className="text-[9px]">{client.external_portal}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Right Side - Date & Actions */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-2">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          Created: {new Date(client.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {client.external_portal_url && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" asChild onClick={e => e.stopPropagation()}>
                              <a href={client.external_portal_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setSelectedClient(client); setActiveView("detail"); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ── Detail View ── */
            <div>
              <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => setActiveView("list")}>
                ← Back to list
              </Button>
              {selectedClient && (
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{selectedClient.customer_name}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2 flex-wrap">
                          <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selectedClient.phone}</span>
                          {selectedClient.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selectedClient.email}</span>}
                          {selectedClient.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selectedClient.city}, {selectedClient.state}</span>}
                          <span className="text-xs font-mono text-muted-foreground">ID: {selectedClient.id.slice(0, 12).toUpperCase()}</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedClient.external_portal_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={selectedClient.external_portal_url} target="_blank" rel="noopener noreferrer" className="gap-1">
                              <Globe className="h-3 w-3" /> {selectedClient.external_portal || "Portal"}
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    {/* Lifecycle Stage */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Lifecycle Stage</Label>
                      <div className="flex flex-wrap gap-1">
                        {LIFECYCLE_STAGES.map(stage => (
                          <Button
                            key={stage.value}
                            size="sm"
                            variant={selectedClient.lifecycle_stage === stage.value ? "default" : "outline"}
                            className="text-xs h-7"
                            onClick={() => {
                              updateStageMutation.mutate({ id: selectedClient.id, stage: stage.value });
                              setSelectedClient({ ...selectedClient, lifecycle_stage: stage.value });
                            }}
                          >
                            {stage.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedClient.car_brand && (
                        <InfoCard icon={<Car className="h-4 w-4" />} label="Vehicle" value={`${selectedClient.car_brand} ${selectedClient.car_model || ""} ${selectedClient.car_variant || ""}`} />
                      )}
                      {selectedClient.vehicle_number && (
                        <InfoCard icon={<Hash className="h-4 w-4" />} label="Reg. Number" value={selectedClient.vehicle_number} />
                      )}
                      {selectedClient.insurance_provider && (
                        <InfoCard icon={<Shield className="h-4 w-4" />} label="Insurer" value={selectedClient.insurance_provider} sub={selectedClient.insurance_expiry ? `Exp: ${new Date(selectedClient.insurance_expiry).toLocaleDateString()}` : undefined} />
                      )}
                      {selectedClient.insurance_policy_number && (
                        <InfoCard icon={<FileText className="h-4 w-4" />} label="Policy No." value={selectedClient.insurance_policy_number} />
                      )}
                      {selectedClient.insurance_premium && (
                        <InfoCard icon={<TrendingUp className="h-4 w-4" />} label="Premium" value={`₹${selectedClient.insurance_premium.toLocaleString()}`} />
                      )}
                      {selectedClient.source && (
                        <InfoCard icon={<Globe className="h-4 w-4" />} label="Source" value={selectedClient.source} />
                      )}
                      {selectedClient.total_spend && (
                        <InfoCard icon={<BarChart3 className="h-4 w-4" />} label="Total Spend" value={`₹${selectedClient.total_spend.toLocaleString()}`} />
                      )}
                      {selectedClient.lifetime_value && (
                        <InfoCard icon={<TrendingUp className="h-4 w-4" />} label="Lifetime Value" value={`₹${selectedClient.lifetime_value.toLocaleString()}`} />
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <QuickInteraction clientId={selectedClient.id} type="call" icon={<Phone className="h-3 w-3" />} label="Log Call" onAdd={addInteractionMutation.mutate} />
                      <QuickInteraction clientId={selectedClient.id} type="whatsapp" icon={<MessageSquare className="h-3 w-3" />} label="WhatsApp" onAdd={addInteractionMutation.mutate} />
                      <QuickInteraction clientId={selectedClient.id} type="note" icon={<FileText className="h-3 w-3" />} label="Note" onAdd={addInteractionMutation.mutate} />
                    </div>

                    {/* Interaction Timeline */}
                    <div>
                      <p className="text-sm font-medium mb-2">Interaction Timeline</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {interactions?.length ? interactions.map((i: any) => (
                          <div key={i.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border text-xs">
                            <Badge variant="outline" className="text-[9px] shrink-0">{i.interaction_type}</Badge>
                            <div className="flex-1">
                              <p>{i.summary}</p>
                              <p className="text-muted-foreground mt-0.5">{new Date(i.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        )) : (
                          <p className="text-xs text-muted-foreground text-center py-4">No interactions yet</p>
                        )}
                      </div>
                    </div>

                    {selectedClient.notes && (
                      <div className="p-3 rounded-lg bg-muted/50 border">
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{selectedClient.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="followups">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Pending Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!followUps?.length ? (
                <p className="text-center text-muted-foreground py-8">No pending follow-ups</p>
              ) : (
                <div className="space-y-2">
                  {followUps.map((fu: any) => (
                    <div key={fu.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{fu.reminder_type}</Badge>
                        <div>
                          <p className="text-sm font-medium">{fu.client_profiles?.customer_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(fu.scheduled_at).toLocaleString()} • {fu.notes}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await (supabase as any).from("follow_up_reminders")
                            .update({ status: "completed", completed_at: new Date().toISOString() })
                            .eq("id", fu.id);
                          queryClient.invalidateQueries({ queryKey: ["followUpReminders"] });
                          toast.success("Follow-up completed");
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Info card for detail view
function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-medium text-sm truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// Quick interaction dialog
function QuickInteraction({ clientId, type, icon, label, onAdd }: any) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs gap-1">{icon}{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log {label}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder={`What happened in this ${type}?`}
            className="h-24"
          />
          <Button
            className="w-full"
            disabled={!summary.trim()}
            onClick={() => {
              onAdd({ client_id: clientId, interaction_type: type, summary });
              setSummary("");
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
