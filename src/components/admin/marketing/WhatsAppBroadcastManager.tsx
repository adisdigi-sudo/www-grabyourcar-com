import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, Plus, Send, Users, CheckCircle, XCircle,
  Clock, Eye, Reply, Filter, Search, BarChart3, Calendar,
  Trash2, Play, Pause, AlertCircle, TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Broadcast {
  id: string;
  name: string;
  template_id: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  reply_count: number;
  failed_count: number;
  message_content: string | null;
  created_at: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[] | null;
}

interface LeadSegment {
  label: string;
  value: string;
  count: number;
  filter: any;
}

const SEGMENTS: LeadSegment[] = [
  { label: "All Leads", value: "all", count: 0, filter: {} },
  { label: "Hot Leads", value: "hot", count: 0, filter: { priority: "high" } },
  { label: "Warm Leads", value: "warm", count: 0, filter: { priority: "medium" } },
  { label: "New This Week", value: "new_week", count: 0, filter: { created_recent: true } },
  { label: "SUV Interest", value: "suv", count: 0, filter: { car_type: "SUV" } },
  { label: "Finance Inquiries", value: "finance", count: 0, filter: { service_category: "finance" } },
];

export function WhatsAppBroadcastManager() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [segments, setSegments] = useState<LeadSegment[]>(SEGMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [newBroadcast, setNewBroadcast] = useState({
    name: "",
    template_id: "",
    segment: "all",
    scheduled_at: "",
    message_content: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [broadcastsRes, templatesRes, leadsRes] = await Promise.all([
        supabase.from("whatsapp_broadcasts").select("*").order("created_at", { ascending: false }),
        supabase.from("whatsapp_templates").select("id, name, category, content, variables").eq("is_active", true),
        supabase.from("leads").select("id, priority, service_category, created_at", { count: "exact" }),
      ]);

      if (broadcastsRes.data) setBroadcasts(broadcastsRes.data);
      if (templatesRes.data) {
        // Map to expected shape
        const mapped = templatesRes.data.map(t => ({
          ...t,
          variables: t.variables as string[] | null
        }));
        setTemplates(mapped);
      }

      // Update segment counts
      if (leadsRes.data) {
        const leads = leadsRes.data;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const updatedSegments = SEGMENTS.map(seg => {
          let count = 0;
          switch (seg.value) {
            case "all": count = leads.length; break;
            case "hot": count = leads.filter(l => l.priority === "high").length; break;
            case "warm": count = leads.filter(l => l.priority === "medium").length; break;
            case "new_week": count = leads.filter(l => new Date(l.created_at) >= oneWeekAgo).length; break;
            case "finance": count = leads.filter(l => l.service_category === "finance").length; break;
            default: count = 0;
          }
          return { ...seg, count };
        });
        setSegments(updatedSegments);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBroadcast = async () => {
    if (!newBroadcast.name) {
      toast({ title: "Error", description: "Broadcast name is required", variant: "destructive" });
      return;
    }

    try {
      const segment = segments.find(s => s.value === newBroadcast.segment);
      const template = templates.find(t => t.id === newBroadcast.template_id);

      const { error } = await supabase
        .from("whatsapp_broadcasts")
        .insert([{
          name: newBroadcast.name,
          template_id: newBroadcast.template_id || null,
          target_segment: { segment: newBroadcast.segment },
          segment_filters: segment?.filter || {},
          status: newBroadcast.scheduled_at ? "scheduled" : "draft",
          scheduled_at: newBroadcast.scheduled_at || null,
          total_recipients: segment?.count || 0,
          message_content: template?.content || newBroadcast.message_content,
        }]);

      if (error) throw error;

      toast({ title: "Broadcast created", description: "Ready to send" });
      setIsCreating(false);
      setNewBroadcast({ name: "", template_id: "", segment: "all", scheduled_at: "", message_content: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleStartBroadcast = async (broadcast: Broadcast) => {
    if (!confirm(`Send WhatsApp messages to ${broadcast.total_recipients} recipients via Finbite API? This will use your WhatsApp credits.`)) return;

    try {
      toast({ title: "Broadcast started", description: "Sending messages via WhatsApp API..." });
      fetchData();

      // Call the real broadcast-send edge function
      const { data, error } = await supabase.functions.invoke("broadcast-send", {
        body: { broadcastId: broadcast.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ 
          title: "Broadcast completed ✅", 
          description: `${data.summary.sent} sent, ${data.summary.failed} failed out of ${data.summary.total}` 
        });
      } else {
        toast({ 
          title: "Broadcast issue", 
          description: data?.error || "Some messages may have failed", 
          variant: "destructive" 
        });
      }

      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      fetchData();
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm("Delete this broadcast?")) return;

    try {
      await supabase.from("whatsapp_broadcasts").delete().eq("id", id);
      toast({ title: "Broadcast deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "sending":
        return <Badge className="bg-blue-500 animate-pulse"><Send className="w-3 h-3 mr-1" /> Sending</Badge>;
      case "scheduled":
        return <Badge className="bg-purple-500"><Calendar className="w-3 h-3 mr-1" /> Scheduled</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
    }
  };

  const stats = {
    total: broadcasts.length,
    sent: broadcasts.reduce((sum, b) => sum + b.sent_count, 0),
    delivered: broadcasts.reduce((sum, b) => sum + b.delivered_count, 0),
    read: broadcasts.reduce((sum, b) => sum + b.read_count, 0),
    replied: broadcasts.reduce((sum, b) => sum + b.reply_count, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Campaigns</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="text-xl font-bold">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Read</p>
                <p className="text-xl font-bold">{stats.read}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Reply className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Replied</p>
                <p className="text-xl font-bold">{stats.replied}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            WhatsApp Broadcasts
          </h2>
          <p className="text-sm text-muted-foreground">
            Send bulk messages to lead segments
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Broadcast
        </Button>
      </div>

      {/* Broadcasts Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      No broadcasts yet. Create your first campaign.
                    </TableCell>
                  </TableRow>
                ) : (
                  broadcasts.map((broadcast) => (
                    <TableRow key={broadcast.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{broadcast.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(broadcast.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Users className="w-3 h-3 mr-1" />
                          {broadcast.total_recipients}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(broadcast.status)}</TableCell>
                      <TableCell>
                        {broadcast.status !== "draft" ? (
                          <div className="space-y-1">
                            <Progress 
                              value={broadcast.total_recipients > 0 
                                ? (broadcast.delivered_count / broadcast.total_recipients) * 100 
                                : 0
                              } 
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground">
                              {broadcast.delivered_count}/{broadcast.sent_count} delivered
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {broadcast.sent_count > 0 ? (
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3 text-purple-500" />
                              {Math.round((broadcast.read_count / broadcast.sent_count) * 100)}%
                            </span>
                            <span className="flex items-center gap-1">
                              <Reply className="h-3 w-3 text-orange-500" />
                              {Math.round((broadcast.reply_count / broadcast.sent_count) * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {broadcast.status === "draft" && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStartBroadcast(broadcast)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteBroadcast(broadcast.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Broadcast Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Broadcast Campaign</DialogTitle>
            <DialogDescription>Send WhatsApp messages to a targeted audience</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input
                placeholder="e.g., Diwali Special Offers"
                value={newBroadcast.name}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Segment</Label>
              <Select 
                value={newBroadcast.segment}
                onValueChange={(v) => setNewBroadcast({ ...newBroadcast, segment: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((seg) => (
                    <SelectItem key={seg.value} value={seg.value}>
                      <span className="flex items-center justify-between w-full">
                        {seg.label}
                        <Badge variant="outline" className="ml-2">{seg.count}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Will send to {segments.find(s => s.value === newBroadcast.segment)?.count || 0} leads
              </p>
            </div>

            <div className="space-y-2">
              <Label>Message Template</Label>
              <Select 
                value={newBroadcast.template_id}
                onValueChange={(v) => setNewBroadcast({ ...newBroadcast, template_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{template.category}</Badge>
                        {template.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!newBroadcast.template_id && (
              <div className="space-y-2">
                <Label>Custom Message</Label>
                <Textarea
                  placeholder="Type your message here..."
                  value={newBroadcast.message_content}
                  onChange={(e) => setNewBroadcast({ ...newBroadcast, message_content: e.target.value })}
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Schedule (Optional)</Label>
              <Input
                type="datetime-local"
                value={newBroadcast.scheduled_at}
                onChange={(e) => setNewBroadcast({ ...newBroadcast, scheduled_at: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Leave empty to save as draft</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateBroadcast}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
