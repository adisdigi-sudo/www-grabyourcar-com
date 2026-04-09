import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Send, Loader2, Mail, MessageSquare, Smartphone, BarChart3,
  Play, Pause, Trash2, Eye, RefreshCw, Users, Clock, Zap
} from "lucide-react";

type Channel = "email" | "whatsapp" | "rcs";

interface OmniCampaign {
  id: string;
  name: string;
  channel: Channel;
  status: string;
  subject: string | null;
  message_body: string | null;
  wa_template_name: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  open_count: number;
  click_count: number;
  failed_count: number;
  created_at: string;
  completed_at: string | null;
}

const CHANNEL_CONFIG = {
  email: { icon: Mail, label: "Email", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  whatsapp: { icon: MessageSquare, label: "WhatsApp", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  rcs: { icon: Smartphone, label: "RCS", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

export function OmniCampaignManager() {
  const [campaigns, setCampaigns] = useState<OmniCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [filterChannel, setFilterChannel] = useState<string>("all");

  // Form state
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [waTemplateName, setWaTemplateName] = useState("");
  const [batchSize, setBatchSize] = useState(50);

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("omni_campaigns").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) setCampaigns(data);
    setLoading(false);
  };

  const createCampaign = async () => {
    if (!name.trim()) { toast.error("Campaign name required"); return; }
    if (channel === "email" && !subject.trim()) { toast.error("Subject required for email"); return; }
    if (!messageBody.trim() && !waTemplateName.trim()) { toast.error("Message body or template required"); return; }

    const { error } = await (supabase as any).from("omni_campaigns").insert({
      name: name.trim(), channel, subject: subject || null,
      message_body: messageBody || null, html_content: channel === "email" ? messageBody : null,
      wa_template_name: waTemplateName || null, batch_size: batchSize,
    });

    if (error) { toast.error("Failed to create campaign"); return; }
    toast.success("Campaign created");
    setShowCreate(false);
    setName(""); setSubject(""); setMessageBody(""); setWaTemplateName("");
    fetchCampaigns();
  };

  const sendCampaign = async (id: string) => {
    setSending(id);
    try {
      const { data, error } = await supabase.functions.invoke("omni-campaign-send", { body: { campaign_id: id } });
      if (error) throw error;
      toast.success(`Campaign sent: ${data.sent} delivered, ${data.failed} failed`);
      fetchCampaigns();
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    } finally {
      setSending(null);
    }
  };

  const deleteCampaign = async (id: string) => {
    await (supabase as any).from("omni_campaigns").delete().eq("id", id);
    toast.success("Deleted");
    fetchCampaigns();
  };

  const filtered = filterChannel === "all" ? campaigns : campaigns.filter(c => c.channel === filterChannel);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Omni-Channel Campaigns
              </CardTitle>
              <CardDescription>Send campaigns via Email, WhatsApp, or RCS from one place</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="rcs">RCS</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />New Campaign</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No campaigns yet. Create your first omni-channel campaign.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Sent</TableHead>
                  <TableHead className="text-center">Delivered</TableHead>
                  <TableHead className="text-center">Opens</TableHead>
                  <TableHead className="text-center">Failed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => {
                  const cfg = CHANNEL_CONFIG[c.channel] || CHANNEL_CONFIG.email;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${cfg.color}`}><Icon className="h-3 w-3" />{cfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "completed" ? "default" : c.status === "sending" ? "secondary" : "outline"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{c.sent_count}</TableCell>
                      <TableCell className="text-center">{c.delivered_count}</TableCell>
                      <TableCell className="text-center">{c.open_count}</TableCell>
                      <TableCell className="text-center">{c.failed_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {c.status === "draft" && (
                            <Button size="sm" variant="default" disabled={sending === c.id} onClick={() => sendCampaign(c.id)}>
                              {sending === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => deleteCampaign(c.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Omni-Channel Campaign</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Campaign Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Summer Sale Blast" /></div>
              <div>
                <Label>Channel</Label>
                <Select value={channel} onValueChange={v => setChannel(v as Channel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="h-4 w-4" />Email</div></SelectItem>
                    <SelectItem value="whatsapp"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />WhatsApp</div></SelectItem>
                    <SelectItem value="rcs"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4" />RCS</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {channel === "email" && (
              <div><Label>Subject Line</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="🎉 Exclusive offer for {name}" /></div>
            )}

            {channel === "whatsapp" && (
              <div><Label>Template Name (optional, for approved templates)</Label><Input value={waTemplateName} onChange={e => setWaTemplateName(e.target.value)} placeholder="welcome_lead" /></div>
            )}

            <div>
              <Label>Message Body {channel === "email" ? "(HTML supported)" : ""}</Label>
              <Textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} rows={6}
                placeholder={channel === "email" ? "<h2>Hi {name}!</h2><p>Check out our deals...</p>" : "Hi {name}! Check out our latest offers at GrabYourCar 🚗"} />
              <p className="text-xs text-muted-foreground mt-1">Use {"{name}"} for personalization</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Batch Size</Label><Input type="number" value={batchSize} onChange={e => setBatchSize(+e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createCampaign}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
