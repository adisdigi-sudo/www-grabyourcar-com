import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GitBranch, User, Phone, Car, Shield, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PIPELINE_STAGES = [
  { value: "new", label: "New Inquiry", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { value: "quote_shared", label: "Quote Shared", color: "bg-orange-500" },
  { value: "negotiating", label: "Negotiating", color: "bg-purple-500" },
  { value: "converted", label: "Converted", color: "bg-green-500" },
  { value: "lost", label: "Lost", color: "bg-muted-foreground" },
];

interface Client {
  id: string;
  customer_name: string;
  phone: string;
  vehicle_model: string | null;
  current_insurer: string | null;
  lead_status: string | null;
  current_premium: number | null;
  lead_source: string | null;
  created_at: string;
}

export function InsuranceStatusPipeline() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [note, setNote] = useState("");
  const { toast } = useToast();

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("insurance_clients")
      .select("id, customer_name, phone, vehicle_model, current_insurer, lead_status, current_premium, lead_source, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setClients((data || []) as Client[]);
  };

  const updateStatus = async (clientId: string, newStatus: string) => {
    await supabase.from("insurance_clients").update({ lead_status: newStatus }).eq("id", clientId);
    await supabase.from("insurance_activity_log").insert({
      client_id: clientId,
      activity_type: "status_change",
      title: "Status Changed",
      description: `Status changed to ${PIPELINE_STAGES.find(s => s.value === newStatus)?.label}`,
      metadata: { new_status: newStatus },
    } as any);
    toast({ title: `Status updated` });
    fetchClients();
    setSelectedClient(null);
  };

  const addNote = async () => {
    if (!selectedClient || !note.trim()) return;
    await supabase.from("insurance_activity_log").insert({
      client_id: selectedClient.id,
      activity_type: "note",
      title: "Note Added",
      description: note,
    } as any);
    toast({ title: "Note added" });
    setNote("");
  };

  const sendQuickWhatsApp = async (client: Client) => {
    try {
      await supabase.functions.invoke("messaging-service", {
        body: {
          action: "trigger_event",
          event: "insurance_inquiry",
          phone: client.phone,
          name: client.customer_name,
          data: { car_model: client.vehicle_model || "", insurer: client.current_insurer || "" },
        },
      });
      toast({ title: "WhatsApp triggered" });
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    }
  };

  const stageCounts = PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: clients.filter(c => c.lead_status === stage.value).length,
  }));

  const filteredClients = selectedStage === "all" ? clients : clients.filter(c => c.lead_status === selectedStage);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" /> Insurance Sales Pipeline
        </h2>
        <p className="text-sm text-muted-foreground">Track clients through the insurance journey</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button variant={selectedStage === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedStage("all")}>
          All ({clients.length})
        </Button>
        {stageCounts.map(stage => (
          <Button key={stage.value} variant={selectedStage === stage.value ? "default" : "outline"} size="sm"
            onClick={() => setSelectedStage(stage.value)} className="whitespace-nowrap">
            <div className={`h-2 w-2 rounded-full ${stage.color} mr-1.5`} />
            {stage.label} ({stage.count})
          </Button>
        ))}
      </div>

      <div className="grid gap-3">
        {filteredClients.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No clients in this stage</CardContent></Card>
        ) : filteredClients.map(client => {
          const stage = PIPELINE_STAGES.find(s => s.value === client.lead_status);
          return (
            <Card key={client.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedClient(client)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${stage?.color || "bg-muted"}`} />
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <User className="h-3.5 w-3.5" /> {client.customer_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>
                        {client.vehicle_model && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {client.vehicle_model}</span>}
                        {client.current_insurer && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {client.current_insurer}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {client.current_premium && <Badge variant="secondary">₹{client.current_premium.toLocaleString()}</Badge>}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); sendQuickWhatsApp(client); }}>
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedClient?.customer_name}</DialogTitle></DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Phone:</span> {selectedClient.phone}</div>
                <div><span className="text-muted-foreground">Car:</span> {selectedClient.vehicle_model || "—"}</div>
                <div><span className="text-muted-foreground">Insurer:</span> {selectedClient.current_insurer || "—"}</div>
                <div><span className="text-muted-foreground">Source:</span> {selectedClient.lead_source || "—"}</div>
              </div>

              <div className="space-y-2">
                <Label>Move to Stage</Label>
                <div className="flex flex-wrap gap-2">
                  {PIPELINE_STAGES.map(stage => (
                    <Button key={stage.value} size="sm"
                      variant={selectedClient.lead_status === stage.value ? "default" : "outline"}
                      onClick={() => updateStatus(selectedClient.id, stage.value)}
                      className="text-xs">
                      <div className={`h-2 w-2 rounded-full ${stage.color} mr-1`} />
                      {stage.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add Note</Label>
                <div className="flex gap-2">
                  <Textarea placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} rows={2} className="flex-1" />
                  <Button size="sm" onClick={addNote} disabled={!note.trim()}>Save</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
