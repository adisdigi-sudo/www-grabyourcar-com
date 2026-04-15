import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Phone, PhoneCall, PhoneOff, Upload, UserCheck, UserX, Clock, CheckCircle2 } from "lucide-react";

export function AutoDialerDashboard() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState<string | null>(null);
  const [activeCalling, setActiveCalling] = useState<{ campaignId: string; contact: any } | null>(null);
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "", vertical: "car" });
  const [importText, setImportText] = useState("");
  const [disposition, setDisposition] = useState({ value: "", notes: "", followUpDate: "" });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["auto-dialer-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("auto_dialer_campaigns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("auto-dialer", {
        body: { action: "create_campaign", ...newCampaign },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-dialer-campaigns"] });
      setShowCreate(false);
      setNewCampaign({ name: "", description: "", vertical: "car" });
      toast.success("Campaign created!");
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const importMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const lines = importText.trim().split("\n").filter(Boolean);
      const contacts = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return { phone: parts[0], name: parts[1] || "", email: parts[2] || "", city: parts[3] || "" };
      }).filter((c) => c.phone);

      const { data, error } = await supabase.functions.invoke("auto-dialer", {
        body: { action: "import_contacts", campaign_id: campaignId, contacts },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auto-dialer-campaigns"] });
      setShowImport(null);
      setImportText("");
      toast.success(`${data?.imported || 0} contacts imported!`);
    },
    onError: (e) => toast.error("Import failed: " + e.message),
  });

  const getNextContact = async (campaignId: string) => {
    const { data, error } = await supabase.functions.invoke("auto-dialer", {
      body: { action: "get_next_contact", campaign_id: campaignId },
    });
    if (error) { toast.error("Error"); return; }
    if (!data?.contact) { toast.info("No pending contacts"); return; }
    setActiveCalling({ campaignId, contact: data.contact });
    setDisposition({ value: "", notes: "", followUpDate: "" });
  };

  const submitDisposition = async () => {
    if (!activeCalling || !disposition.value) return;
    const { error } = await supabase.functions.invoke("auto-dialer", {
      body: {
        action: "update_disposition",
        contact_id: activeCalling.contact.id,
        disposition: disposition.value,
        notes: disposition.notes,
        follow_up_date: disposition.followUpDate || null,
      },
    });
    if (error) { toast.error("Error saving"); return; }
    toast.success("Disposition saved!");
    queryClient.invalidateQueries({ queryKey: ["auto-dialer-campaigns"] });
    // Auto-get next contact
    await getNextContact(activeCalling.campaignId);
  };

  const createLeads = async (campaignId: string) => {
    const { data, error } = await supabase.functions.invoke("auto-dialer", {
      body: { action: "auto_create_leads", campaign_id: campaignId },
    });
    if (error) { toast.error("Error"); return; }
    toast.success(`${data?.created || 0} leads created from interested contacts!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-blue-500" />
            Auto-Dialer Campaigns
          </h2>
          <p className="text-muted-foreground">Upload contacts, dial, track dispositions, and auto-create leads</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Dialer Campaign</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Campaign name" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} />
              <Textarea placeholder="Description" value={newCampaign.description} onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })} />
              <Select value={newCampaign.vertical} onValueChange={(v) => setNewCampaign({ ...newCampaign, vertical: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car Sales</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="loan">Loans</SelectItem>
                  <SelectItem value="dealer">Dealer Inquiry</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => createMutation.mutate()} disabled={!newCampaign.name || createMutation.isPending} className="w-full">
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Calling Card */}
      {activeCalling && (
        <Card className="border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-blue-500 animate-pulse" />
                Now Calling
              </h3>
              <Button variant="destructive" size="sm" onClick={() => setActiveCalling(null)}>
                <PhoneOff className="h-4 w-4 mr-1" />End Session
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-2xl font-bold">{activeCalling.contact.name || "Unknown"}</p>
                <a href={`tel:${activeCalling.contact.phone}`} className="text-xl text-blue-600 hover:underline font-mono">
                  📞 {activeCalling.contact.phone}
                </a>
                {activeCalling.contact.city && <p className="text-muted-foreground mt-1">📍 {activeCalling.contact.city}</p>}
                {activeCalling.contact.email && <p className="text-muted-foreground">✉️ {activeCalling.contact.email}</p>}
              </div>
              <div className="space-y-3">
                <Select value={disposition.value} onValueChange={(v) => setDisposition({ ...disposition, value: v })}>
                  <SelectTrigger><SelectValue placeholder="Select disposition" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interested">✅ Interested</SelectItem>
                    <SelectItem value="not_interested">❌ Not Interested</SelectItem>
                    <SelectItem value="no_answer">📵 No Answer</SelectItem>
                    <SelectItem value="busy">⏳ Busy</SelectItem>
                    <SelectItem value="callback">📅 Callback</SelectItem>
                    <SelectItem value="wrong_number">🚫 Wrong Number</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Notes" value={disposition.notes} onChange={(e) => setDisposition({ ...disposition, notes: e.target.value })} />
                {(disposition.value === "callback" || disposition.value === "interested") && (
                  <Input type="datetime-local" value={disposition.followUpDate} onChange={(e) => setDisposition({ ...disposition, followUpDate: e.target.value })} />
                )}
                <Button onClick={submitDisposition} disabled={!disposition.value} className="w-full">
                  Save & Next Contact →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
      ) : !campaigns?.length ? (
        <Card className="p-12 text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No Dialer Campaigns</h3>
          <p className="text-muted-foreground mb-4">Create a campaign and upload contacts to start calling</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: any) => {
            const progress = campaign.total_contacts > 0
              ? Math.round(((campaign.completed_contacts || 0) / campaign.total_contacts) * 100)
              : 0;
            return (
              <Card key={campaign.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{campaign.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{campaign.vertical}</Badge>
                        <Badge variant={campaign.status === "active" ? "default" : "secondary"}>{campaign.status}</Badge>
                        {campaign.description && <span>{campaign.description}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowImport(campaign.id)}>
                        <Upload className="h-4 w-4 mr-1" />Import
                      </Button>
                      <Button size="sm" onClick={() => getNextContact(campaign.id)} disabled={!campaign.pending_contacts}>
                        <PhoneCall className="h-4 w-4 mr-1" />Start Calling
                      </Button>
                      {(campaign.interested_contacts || 0) > 0 && (
                        <Button variant="outline" size="sm" onClick={() => createLeads(campaign.id)}>
                          <UserCheck className="h-4 w-4 mr-1" />Create Leads
                        </Button>
                      )}
                    </div>
                  </div>
                  <Progress value={progress} className="h-2 mb-2" />
                  <div className="grid grid-cols-6 gap-2 text-center text-sm">
                    <div>
                      <div className="font-bold">{campaign.total_contacts || 0}</div>
                      <div className="text-muted-foreground text-xs">Total</div>
                    </div>
                    <div>
                      <div className="font-bold text-yellow-600">{campaign.pending_contacts || 0}</div>
                      <div className="text-muted-foreground text-xs">Pending</div>
                    </div>
                    <div>
                      <div className="font-bold text-blue-600">{campaign.completed_contacts || 0}</div>
                      <div className="text-muted-foreground text-xs">Called</div>
                    </div>
                    <div>
                      <div className="font-bold text-green-600">{campaign.interested_contacts || 0}</div>
                      <div className="text-muted-foreground text-xs">Interested</div>
                    </div>
                    <div>
                      <div className="font-bold text-red-600">{campaign.not_interested_contacts || 0}</div>
                      <div className="text-muted-foreground text-xs">Not Int.</div>
                    </div>
                    <div>
                      <div className="font-bold text-gray-600">{campaign.no_answer_contacts || 0}</div>
                      <div className="text-muted-foreground text-xs">No Answer</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={!!showImport} onOpenChange={() => setShowImport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import Contacts</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste contacts, one per line: <code>phone, name, email, city</code>
            </p>
            <Textarea
              placeholder="9876543210, John Doe, john@email.com, Delhi
9876543211, Jane Smith, , Mumbai"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
            />
            <Button
              onClick={() => showImport && importMutation.mutate(showImport)}
              disabled={!importText.trim() || importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? "Importing..." : `Import ${importText.trim().split("\n").filter(Boolean).length} Contacts`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
