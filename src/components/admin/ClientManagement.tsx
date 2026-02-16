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
} from "lucide-react";

const LIFECYCLE_STAGES = [
  { value: "inquiry", label: "📋 Inquiry", color: "bg-blue-500/20 text-blue-600" },
  { value: "test_drive", label: "🚗 Test Drive", color: "bg-purple-500/20 text-purple-600" },
  { value: "negotiation", label: "💬 Negotiation", color: "bg-orange-500/20 text-orange-600" },
  { value: "booking", label: "📝 Booking", color: "bg-yellow-500/20 text-yellow-600" },
  { value: "delivery", label: "🎉 Delivery", color: "bg-green-500/20 text-green-600" },
  { value: "post_delivery", label: "✅ Post-Delivery", color: "bg-teal-500/20 text-teal-600" },
  { value: "service", label: "🔧 Service", color: "bg-gray-500/20 text-gray-600" },
  { value: "renewal", label: "🔄 Renewal", color: "bg-red-500/20 text-red-600" },
];

export const ClientManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
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
        query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
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

      // Log interaction
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

  // Schedule follow-up
  const scheduleFollowUpMutation = useMutation({
    mutationFn: async (data: { client_id: string; reminder_type: string; scheduled_at: string; notes: string }) => {
      const { error } = await (supabase as any).from("follow_up_reminders").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Follow-up scheduled");
      queryClient.invalidateQueries({ queryKey: ["followUpReminders"] });
    },
  });

  const getStageConfig = (stage: string) => LIFECYCLE_STAGES.find(s => s.value === stage) || LIFECYCLE_STAGES[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Client Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Full lifecycle tracking: Inquiry → Delivery → Service → Renewal
          </p>
        </div>
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

      {/* Lifecycle Pipeline */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          size="sm"
          variant={stageFilter === "all" ? "default" : "outline"}
          onClick={() => setStageFilter("all")}
          className="shrink-0 text-xs"
        >
          All ({clients?.length || 0})
        </Button>
        {LIFECYCLE_STAGES.map(stage => (
          <Button
            key={stage.value}
            size="sm"
            variant={stageFilter === stage.value ? "default" : "outline"}
            onClick={() => setStageFilter(stage.value)}
            className="shrink-0 text-xs"
          >
            {stage.label} ({stageCounts?.[stage.value] || 0})
          </Button>
        ))}
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="followups">
            Follow-ups
            {followUps?.length ? <Badge variant="destructive" className="ml-1 text-[10px]">{followUps.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Client List */}
            <div className="lg:col-span-1 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="pl-9"
                />
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : !clients?.length ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No clients found</p>
                ) : (
                  clients.map((client: any) => {
                    const stage = getStageConfig(client.lifecycle_stage);
                    return (
                      <Card
                        key={client.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${selectedClient?.id === client.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setSelectedClient(client)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{client.customer_name}</p>
                            <Badge className={`text-[10px] ${stage.color}`}>{stage.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" /> {client.phone}
                          </div>
                          {client.car_model && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Car className="h-3 w-3" /> {client.car_brand} {client.car_model}
                            </div>
                          )}
                          {client.external_portal && (
                            <Badge variant="outline" className="text-[9px] mt-1">{client.external_portal}</Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Client Detail */}
            <div className="lg:col-span-2">
              {selectedClient ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedClient.customer_name}</CardTitle>
                        <CardDescription className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedClient.phone}</span>
                          {selectedClient.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedClient.email}</span>}
                          {selectedClient.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedClient.city}</span>}
                        </CardDescription>
                      </div>
                      {selectedClient.external_portal_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={selectedClient.external_portal_url} target="_blank" rel="noopener noreferrer" className="gap-1">
                            <Globe className="h-3 w-3" /> {selectedClient.external_portal || "Portal"}
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Lifecycle Stage Selector */}
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

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedClient.car_brand && (
                        <div>
                          <p className="text-xs text-muted-foreground">Car</p>
                          <p className="font-medium">{selectedClient.car_brand} {selectedClient.car_model} {selectedClient.car_variant}</p>
                        </div>
                      )}
                      {selectedClient.insurance_provider && (
                        <div>
                          <p className="text-xs text-muted-foreground">Insurance</p>
                          <p className="font-medium">{selectedClient.insurance_provider}</p>
                          {selectedClient.insurance_expiry && (
                            <p className="text-xs text-muted-foreground">Expires: {new Date(selectedClient.insurance_expiry).toLocaleDateString()}</p>
                          )}
                        </div>
                      )}
                      {selectedClient.vehicle_number && (
                        <div>
                          <p className="text-xs text-muted-foreground">Vehicle</p>
                          <p className="font-medium">{selectedClient.vehicle_number}</p>
                        </div>
                      )}
                      {selectedClient.source && (
                        <div>
                          <p className="text-xs text-muted-foreground">Source</p>
                          <p className="font-medium">{selectedClient.source}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick actions */}
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
                          <div key={i.id} className="flex items-start gap-2 p-2 rounded bg-muted text-xs">
                            <Badge variant="outline" className="text-[9px] shrink-0">{i.interaction_type}</Badge>
                            <div>
                              <p>{i.summary}</p>
                              <p className="text-muted-foreground">{new Date(i.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        )) : (
                          <p className="text-xs text-muted-foreground text-center py-4">No interactions yet</p>
                        )}
                      </div>
                    </div>

                    {selectedClient.notes && (
                      <div className="p-3 rounded bg-muted">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{selectedClient.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Users className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="font-medium">Select a client</p>
                    <p className="text-sm text-muted-foreground">Choose a client from the list to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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
