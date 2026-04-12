import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Send, Users, CheckCircle, XCircle, Clock, Eye, Reply, 
  Trash2, Pause, Play, Ban, Copy, BarChart3, Calendar, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  status: string;
  template_id: string | null;
  message_content: string | null;
  segment_rules: any[];
  estimated_recipients: number;
  scheduled_at: string | null;
  batch_size: number;
  total_queued: number;
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_replied: number;
  total_failed: number;
  total_opted_out: number;
  tags: string[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function WACampaignDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    segment_id: "",
    template_id: "",
    message_content: "",
    scheduled_at: "",
    batch_size: "50",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    // Realtime subscription for campaign updates
    const channel = supabase
      .channel("wa-campaigns")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_campaigns" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [campRes, segRes, tmplRes] = await Promise.all([
      supabase.from("wa_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("wa_contact_segments").select("*").order("name"),
      supabase.from("wa_templates").select("id, name, category, body, variables").eq("status", "approved"),
    ]);
    if (campRes.data) setCampaigns(campRes.data as any);
    if (segRes.data) setSegments(segRes.data);
    if (tmplRes.data) setTemplates(tmplRes.data);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name) {
      toast({ title: "Campaign name is required", variant: "destructive" });
      return;
    }

    // Build segment rules from selected segment
    const segment = segments.find(s => s.id === form.segment_id);
    const template = templates.find(t => t.id === form.template_id);

    const { error } = await supabase.from("wa_campaigns").insert({
      name: form.name,
      description: form.description || null,
      campaign_type: "broadcast",
      status: form.scheduled_at ? "scheduled" : "draft",
      template_id: form.template_id || null,
      message_content: template?.content || form.message_content,
      segment_rules: segment?.rules || [],
      estimated_recipients: segment?.estimated_count || 0,
      scheduled_at: form.scheduled_at || null,
      batch_size: parseInt(form.batch_size) || 50,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campaign created" });
      setIsCreating(false);
      setForm({ name: "", description: "", segment_id: "", template_id: "", message_content: "", scheduled_at: "", batch_size: "50" });
      fetchData();
    }
  };

  const handleLaunch = async (campaign: Campaign) => {
    if (!confirm(`Launch "${campaign.name}"? Messages will be queued and sent via WhatsApp.`)) return;

    toast({ title: "Launching campaign...", description: "Building message queue" });

    const { data, error } = await supabase.functions.invoke("wa-campaign-launcher", {
      body: { campaignId: campaign.id, action: "launch" },
    });

    if (error) {
      toast({ title: "Launch failed", description: error.message, variant: "destructive" });
    } else if (data?.success) {
      toast({ title: "Campaign launched! 🚀", description: `${data.queued} messages queued` });
    } else {
      toast({ title: "Issue", description: data?.error || "Unknown error", variant: "destructive" });
    }
    fetchData();
  };

  const handleAction = async (campaignId: string, action: string) => {
    const { error } = await supabase.functions.invoke("wa-campaign-launcher", {
      body: { campaignId, action },
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: `Campaign ${action}d` });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign and all queued messages?")) return;
    await supabase.from("wa_message_queue").delete().eq("campaign_id", id);
    await supabase.from("wa_campaigns").delete().eq("id", id);
    toast({ title: "Campaign deleted" });
    fetchData();
  };

  const handleClone = async (campaign: Campaign) => {
    await supabase.from("wa_campaigns").insert({
      name: `${campaign.name} (Copy)`,
      description: campaign.description,
      campaign_type: campaign.campaign_type,
      template_id: campaign.template_id,
      message_content: campaign.message_content,
      segment_rules: campaign.segment_rules,
      estimated_recipients: campaign.estimated_recipients,
      batch_size: campaign.batch_size,
      tags: campaign.tags,
    });
    toast({ title: "Campaign cloned" });
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; icon: any; label: string }> = {
      draft: { className: "bg-muted text-muted-foreground", icon: Clock, label: "Draft" },
      scheduled: { className: "bg-purple-500/10 text-purple-600", icon: Calendar, label: "Scheduled" },
      queued: { className: "bg-blue-500/10 text-blue-600", icon: Clock, label: "Queued" },
      sending: { className: "bg-blue-500/10 text-blue-600 animate-pulse", icon: Send, label: "Sending" },
      paused: { className: "bg-yellow-500/10 text-yellow-600", icon: Pause, label: "Paused" },
      completed: { className: "bg-green-500/10 text-green-600", icon: CheckCircle, label: "Completed" },
      failed: { className: "bg-destructive/10 text-destructive", icon: XCircle, label: "Failed" },
      cancelled: { className: "bg-muted text-muted-foreground", icon: Ban, label: "Cancelled" },
    };
    const c = config[status] || config.draft;
    const Icon = c.icon;
    return <Badge className={c.className}><Icon className="w-3 h-3 mr-1" />{c.label}</Badge>;
  };

  const totals = {
    campaigns: campaigns.length,
    sent: campaigns.reduce((s, c) => s + c.total_sent, 0),
    delivered: campaigns.reduce((s, c) => s + c.total_delivered, 0),
    read: campaigns.reduce((s, c) => s + c.total_read, 0),
    replied: campaigns.reduce((s, c) => s + c.total_replied, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Campaigns", value: totals.campaigns, icon: Send, color: "text-primary" },
          { label: "Total Sent", value: totals.sent, icon: CheckCircle, color: "text-blue-500" },
          { label: "Delivered", value: totals.delivered, icon: CheckCircle, color: "text-green-500" },
          { label: "Read", value: totals.read, icon: Eye, color: "text-purple-500" },
          { label: "Replied", value: totals.replied, icon: Reply, color: "text-orange-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={cn("h-5 w-5", s.color)} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Campaigns</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No campaigns yet. Create your first WhatsApp campaign.
                    </TableCell>
                  </TableRow>
                ) : campaigns.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()} · {c.campaign_type}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline"><Users className="w-3 h-3 mr-1" />{c.total_queued || c.estimated_recipients}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.total_sent > 0 ? (
                        <div className="space-y-1">
                          <Progress value={c.total_queued > 0 ? ((c.total_sent + c.total_failed) / c.total_queued) * 100 : 0} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {c.total_delivered}/{c.total_sent} delivered
                          </p>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      {c.total_sent > 0 ? (
                        <div className="flex gap-3 text-sm">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-purple-500" />{Math.round((c.total_read / c.total_sent) * 100)}%</span>
                          <span className="flex items-center gap-1"><Reply className="h-3 w-3 text-orange-500" />{Math.round((c.total_replied / c.total_sent) * 100)}%</span>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {c.status === "draft" && <Button size="icon" variant="default" className="h-8 w-8" onClick={() => handleLaunch(c)}><Send className="h-3.5 w-3.5" /></Button>}
                        {c.status === "sending" && <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleAction(c.id, "pause")}><Pause className="h-3.5 w-3.5" /></Button>}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleClone(c)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create WhatsApp Campaign</DialogTitle>
            <DialogDescription>Build and launch targeted WhatsApp messages</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input placeholder="e.g., Diwali Special Offers" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Batch Size</Label>
                <Select value={form.batch_size} onValueChange={v => setForm({ ...form, batch_size: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 (Slow)</SelectItem>
                    <SelectItem value="50">50 (Normal)</SelectItem>
                    <SelectItem value="100">100 (Fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Campaign description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Segment</Label>
                <Select value={form.segment_id} onValueChange={v => setForm({ ...form, segment_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All leads" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leads</SelectItem>
                    {segments.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.estimated_count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={form.template_id} onValueChange={v => setForm({ ...form, template_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!form.template_id && (
              <div className="space-y-2">
                <Label>Message Content</Label>
                <Textarea
                  placeholder="Hello {name}! Check out our latest offers on {car_model}..."
                  value={form.message_content}
                  onChange={e => setForm({ ...form, message_content: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Variables: {"{name}"}, {"{phone}"}, {"{city}"}, {"{car_model}"}, {"{email}"}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Schedule (Optional)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Send className="h-4 w-4 mr-2" /> Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
