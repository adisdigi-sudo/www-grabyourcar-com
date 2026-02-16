import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GitBranch, User, Phone, Car, Shield, MessageSquare,
  Mail, Search, ArrowRight, Play, CheckCircle2,
  Clock, AlertTriangle, Share2, PhoneCall
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

const PIPELINE_STAGES = [
  { value: "new", label: "New Lead", color: "bg-blue-500", textColor: "text-blue-700 dark:text-blue-400" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500", textColor: "text-yellow-700 dark:text-yellow-400" },
  { value: "follow_up", label: "Follow-up", color: "bg-orange-500", textColor: "text-orange-700 dark:text-orange-400" },
  { value: "quote_shared", label: "Quote Shared", color: "bg-purple-500", textColor: "text-purple-700 dark:text-purple-400" },
  { value: "negotiating", label: "Negotiation", color: "bg-indigo-500", textColor: "text-indigo-700 dark:text-indigo-400" },
  { value: "converted", label: "Won", color: "bg-green-500", textColor: "text-green-700 dark:text-green-400" },
  { value: "policy_uploaded", label: "Policy Uploaded", color: "bg-emerald-500", textColor: "text-emerald-700 dark:text-emerald-400" },
  { value: "renewal_active", label: "Renewal Active", color: "bg-teal-500", textColor: "text-teal-700 dark:text-teal-400" },
  { value: "lost", label: "Lost", color: "bg-muted-foreground", textColor: "text-muted-foreground" },
  { value: "not_interested", label: "Not Interested", color: "bg-muted-foreground", textColor: "text-muted-foreground" },
  { value: "future_prospect", label: "Future Prospect", color: "bg-sky-500", textColor: "text-sky-700 dark:text-sky-400" },
];

const NEXT_ACTIONS: Record<string, string> = {
  new: "Call the lead to introduce yourself and understand their insurance needs.",
  contacted: "Schedule a follow-up call and gather vehicle/policy details.",
  follow_up: "Share a competitive quote based on their requirements.",
  quote_shared: "Follow up on the quote and address any concerns.",
  negotiating: "Finalize the deal — offer best price or added benefits.",
  converted: "Collect documents and upload the policy.",
  policy_uploaded: "Confirm policy delivery and schedule renewal reminder.",
  renewal_active: "Monitor renewal date and send timely reminders.",
  lost: "Try a recovery call after 2 weeks with a better offer.",
  not_interested: "Park for 3 months, then re-engage with new offers.",
  future_prospect: "Set a reminder and reach out when timing is right.",
};

interface Client {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
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
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const { toast: uiToast } = useToast();

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("insurance_clients")
      .select("id, customer_name, phone, email, vehicle_model, vehicle_number, current_insurer, lead_status, current_premium, lead_source, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setClients((data || []) as Client[]);
  };

  const stageCounts = useMemo(() =>
    PIPELINE_STAGES.map(stage => ({
      ...stage,
      count: clients.filter(c => c.lead_status === stage.value).length,
    })),
    [clients]
  );

  const filteredClients = useMemo(() => {
    let result = selectedStage === "all" ? clients : clients.filter(c => c.lead_status === selectedStage);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [clients, selectedStage, search]);

  const updateStatus = async (clientId: string, newStatus: string) => {
    await supabase.from("insurance_clients").update({ lead_status: newStatus }).eq("id", clientId);
    await supabase.from("insurance_activity_log").insert({
      client_id: clientId,
      activity_type: "status_change",
      title: "Pipeline Stage Changed",
      description: `Moved to: ${PIPELINE_STAGES.find(s => s.value === newStatus)?.label}`,
      metadata: { new_status: newStatus },
    } as any);
    toast.success(`Moved to ${PIPELINE_STAGES.find(s => s.value === newStatus)?.label}`);
    fetchClients();
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, lead_status: newStatus } : null);
    }
  };

  const addNote = async () => {
    if (!selectedClient || !note.trim()) return;
    await supabase.from("insurance_activity_log").insert({
      client_id: selectedClient.id,
      activity_type: "note",
      title: "Note Added",
      description: note,
    } as any);
    toast.success("Note saved");
    setNote("");
  };

  const shareClientDetails = (client: Client) => {
    const displayPhone = client.phone?.startsWith("IB_") ? "N/A" : client.phone;
    const text = `👤 Lead: ${client.customer_name}\n📱 Mobile: ${displayPhone}\n✉️ Email: ${client.email || "N/A"}\n🚗 Vehicle: ${client.vehicle_number || "N/A"}\n🏢 Insurer: ${client.current_insurer || "N/A"}\n💰 Premium: ₹${client.current_premium?.toLocaleString("en-IN") || "N/A"}\n📊 Stage: ${PIPELINE_STAGES.find(s => s.value === client.lead_status)?.label || "New"}\n\n— Grabyourcar Insurance`;
    if (navigator.share) {
      navigator.share({ title: `Lead - ${client.customer_name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Details copied!");
    }
  };

  const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

  const currentStageIndex = (status: string | null) => {
    const idx = PIPELINE_STAGES.findIndex(s => s.value === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" /> Sales Pipeline
        </h2>
        <p className="text-sm text-muted-foreground">Track leads through the insurance journey</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, phone, vehicle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Stage Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button variant={selectedStage === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedStage("all")}>
          All ({clients.length})
        </Button>
        {stageCounts.map(stage => (
          <Button key={stage.value} variant={selectedStage === stage.value ? "default" : "outline"} size="sm"
            onClick={() => setSelectedStage(stage.value)} className="whitespace-nowrap gap-1.5">
            <div className={`h-2 w-2 rounded-full ${stage.color}`} />
            {stage.label} ({stage.count})
          </Button>
        ))}
      </div>

      {/* Client Cards */}
      <div className="grid gap-2">
        {filteredClients.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No leads in this stage</CardContent></Card>
        ) : filteredClients.map(client => {
          const stage = PIPELINE_STAGES.find(s => s.value === client.lead_status);
          const phone = displayPhone(client.phone);
          return (
            <Card key={client.id} className="hover:shadow-md transition-all border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => { setSelectedClient(client); setEditPhone(phone || ""); setEditEmail(client.email || ""); }}>
                    <div className={`h-3 w-3 rounded-full shrink-0 ${stage?.color || "bg-muted"}`} />
                    <div className="min-w-0 cursor-pointer">
                      <p className="font-medium text-sm flex items-center gap-1.5 truncate">
                        <User className="h-3.5 w-3.5 shrink-0" /> {client.customer_name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {phone}</span>}
                        {client.vehicle_number && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {client.vehicle_number}</span>}
                        {client.current_insurer && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {client.current_insurer}</span>}
                      </div>
                    </div>
                  </div>
                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {client.current_premium && <Badge variant="secondary" className="text-xs">₹{client.current_premium.toLocaleString("en-IN")}</Badge>}
                    {phone && (
                      <>
                        <a href={`tel:${phone}`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Call">
                            <PhoneCall className="h-4 w-4 text-green-600" />
                          </Button>
                        </a>
                        <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="WhatsApp">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                          </Button>
                        </a>
                      </>
                    )}
                    {client.email && (
                      <a href={`mailto:${client.email}`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Email">
                          <Mail className="h-4 w-4 text-primary" />
                        </Button>
                      </a>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Share" onClick={() => shareClientDetails(client)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Client Detail + Pipeline Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {selectedClient?.customer_name}
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-5">
              {/* Contact Info (Editable) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mobile</Label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Enter mobile" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Enter email" className="h-8 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-mono font-medium">{selectedClient.vehicle_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="text-sm font-medium">{selectedClient.lead_source || "—"}</p>
                </div>
              </div>

              {/* Communication Hub */}
              <div className="flex flex-wrap gap-2">
                {editPhone && (
                  <>
                    <a href={`tel:${editPhone}`}>
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                        <PhoneCall className="h-3.5 w-3.5" /> Call
                      </Button>
                    </a>
                    <a href={`https://wa.me/91${editPhone}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-green-600" /> WhatsApp
                      </Button>
                    </a>
                    <a href={`sms:${editPhone}`}>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        SMS
                      </Button>
                    </a>
                  </>
                )}
                {editEmail && (
                  <a href={`mailto:${editEmail}`}>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Button>
                  </a>
                )}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => shareClientDetails(selectedClient)}>
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              </div>

              {/* Pipeline Journey */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Lead Journey</Label>
                <div className="space-y-1">
                  {PIPELINE_STAGES.slice(0, 8).map((stage, idx) => {
                    const currentIdx = currentStageIndex(selectedClient.lead_status);
                    const isActive = stage.value === selectedClient.lead_status;
                    const isPast = idx < currentIdx;
                    return (
                      <button
                        key={stage.value}
                        onClick={() => updateStatus(selectedClient.id, stage.value)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                          isActive ? "bg-primary/10 border border-primary/30 font-semibold" :
                          isPast ? "bg-muted/40 text-muted-foreground" :
                          "hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                          isPast ? "bg-green-500 text-white" :
                          isActive ? stage.color + " text-white" :
                          "bg-muted border"
                        }`}>
                          {isPast ? <CheckCircle2 className="h-3 w-3" /> :
                           isActive ? <Play className="h-3 w-3" /> :
                           <span className="text-[9px]">{idx + 1}</span>}
                        </div>
                        <span className="flex-1 text-left">{stage.label}</span>
                        {isActive && <ArrowRight className="h-3 w-3 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                {/* Alternative paths */}
                <div className="flex gap-1.5 mt-2 pt-2 border-t">
                  {PIPELINE_STAGES.slice(8).map(stage => (
                    <Button key={stage.value} size="sm" variant="outline"
                      className={`text-[10px] h-7 ${selectedClient.lead_status === stage.value ? "border-primary bg-primary/5" : ""}`}
                      onClick={() => updateStatus(selectedClient.id, stage.value)}>
                      {stage.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Next Best Action */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Play className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary mb-0.5">Next Best Action</p>
                      <p className="text-xs text-muted-foreground">
                        {NEXT_ACTIONS[selectedClient.lead_status || "new"]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add Note */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Add Note</Label>
                <div className="flex gap-2">
                  <Textarea placeholder="Type a note..." value={note} onChange={e => setNote(e.target.value)} rows={2} className="flex-1 text-sm" />
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
