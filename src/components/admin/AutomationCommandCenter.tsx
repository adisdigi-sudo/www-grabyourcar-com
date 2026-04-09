import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  Zap, Activity, Clock, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Play, Pause, Settings2, Send, PhoneCall, Mail,
  MessageSquare, TrendingUp, Users, ArrowRight, Filter,
  BarChart3, Bot, Workflow, Globe, ChevronRight, Eye,
  Shield, Database, Rocket, Timer, Bell, Target
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───
interface AutomationLead {
  id: string;
  lead_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  vertical: string;
  source: string | null;
  status: string;
  contacted: boolean;
  executive_notified: boolean;
  follow_up_due: string | null;
  follow_up_alert_sent: boolean;
  manager_alerted: boolean;
  created_at: string;
  last_updated: string;
  city: string | null;
}

// ─── Edge Function Endpoints ───
const EDGE_BASE = `https://ynoiwioypxpurwdbjvyt.supabase.co/functions/v1`;

// ─── Overview Stats Card ───
function StatsCard({ icon: Icon, label, value, subtext, color }: {
  icon: React.ElementType; label: string; value: string | number; subtext?: string; color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Automation Engines Config ───
const ENGINES = [
  { id: "lead-intake-engine", name: "Lead Intake Engine", icon: Rocket, description: "Webhook → Normalize → Classify → Dedup → Store → Notify", color: "bg-blue-500", status: "active" },
  { id: "lead-followup-checker", name: "30-Min Follow-up Checker", icon: Timer, description: "Checks untouched leads every 5 min → Manager alert", color: "bg-amber-500", status: "active" },
  { id: "insurance-renewal-engine", name: "Insurance Renewal Engine", icon: Shield, description: "Multi-touch WhatsApp reminders at 90/45/15 days", color: "bg-emerald-500", status: "active" },
  { id: "customer-journey-engine", name: "Customer Journey Engine", icon: Workflow, description: "Cross-vertical automated journey triggers", color: "bg-purple-500", status: "active" },
  { id: "wa-automation-trigger", name: "WhatsApp Automation", icon: MessageSquare, description: "Behavioral event-based WhatsApp messaging", color: "bg-green-500", status: "active" },
  { id: "lead-scoring", name: "AI Lead Scoring", icon: Bot, description: "ML-powered lead quality scoring", color: "bg-indigo-500", status: "active" },
];

// ─── Vertical Colors ───
const VERTICAL_COLORS: Record<string, string> = {
  "Car Sales": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Insurance": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Loan": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Self Drive": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "HSRP": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Accessories": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "General Enquiry": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const STATUS_COLORS: Record<string, string> = {
  "new": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "contacted": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "follow_up": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "escalated": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "converted": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "lost": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

export function AutomationCommandCenter() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPayload, setTestPayload] = useState(JSON.stringify({
    name: "Test Lead",
    phone: "9876543210",
    email: "test@example.com",
    source: "Manual Test",
    message: "Testing automation pipeline",
    service: "car"
  }, null, 2));
  const [isTesting, setIsTesting] = useState(false);

  // ─── Fetch automation leads ───
  const { data: leads = [], isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ["automation-leads", verticalFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("automation_lead_tracking")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      
      if (verticalFilter !== "all") query = query.eq("vertical", verticalFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AutomationLead[];
    },
  });

  // ─── Stats ───
  const { data: stats } = useQuery({
    queryKey: ["automation-stats"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const [total, todayLeads, contacted, escalated, byVertical] = await Promise.all([
        supabase.from("automation_lead_tracking").select("id", { count: "exact", head: true }),
        supabase.from("automation_lead_tracking").select("id", { count: "exact", head: true }).gte("created_at", today),
        supabase.from("automation_lead_tracking").select("id", { count: "exact", head: true }).eq("contacted", true),
        supabase.from("automation_lead_tracking").select("id", { count: "exact", head: true }).eq("manager_alerted", true),
        supabase.from("automation_lead_tracking").select("vertical"),
      ]);

      const verticalBreakdown: Record<string, number> = {};
      (byVertical.data || []).forEach((r: any) => {
        verticalBreakdown[r.vertical] = (verticalBreakdown[r.vertical] || 0) + 1;
      });

      return {
        total: total.count || 0,
        today: todayLeads.count || 0,
        contacted: contacted.count || 0,
        escalated: escalated.count || 0,
        contactRate: (total.count || 0) > 0 ? Math.round(((contacted.count || 0) / (total.count || 1)) * 100) : 0,
        verticalBreakdown,
      };
    },
  });

  // ─── Test webhook ───
  const handleTestWebhook = async () => {
    setIsTesting(true);
    try {
      const payload = JSON.parse(testPayload);
      const res = await fetch(`${EDGE_BASE}/lead-intake-engine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("✅ Test lead processed!", { description: `Lead ID: ${result.lead_id || "Created"}` });
        refetchLeads();
        queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
      } else {
        toast.error("Test failed", { description: result.error || "Unknown error" });
      }
    } catch (e: any) {
      toast.error("Invalid payload", { description: e.message });
    } finally {
      setIsTesting(false);
      setTestDialogOpen(false);
    }
  };

  // ─── Trigger follow-up checker manually ───
  const handleTriggerFollowup = async () => {
    try {
      const res = await fetch(`${EDGE_BASE}/lead-followup-checker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual: true }),
      });
      const result = await res.json();
      toast.success("Follow-up checker ran", { description: `${result.escalated || 0} leads escalated` });
      refetchLeads();
    } catch (e: any) {
      toast.error("Failed to trigger", { description: e.message });
    }
  };

  // ─── Mark lead as contacted ───
  const markContacted = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("automation_lead_tracking")
        .update({ contacted: true, contacted_at: new Date().toISOString(), status: "contacted" })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead marked as contacted");
      refetchLeads();
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
    },
  });

  const filteredLeads = leads.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (l.name || "").toLowerCase().includes(q) || l.phone.includes(q) || (l.email || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            Automation Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            End-to-end lead automation, follow-ups, escalations & journey orchestration
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Play className="h-4 w-4" /> Test Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>🧪 Test Lead Intake Engine</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Label>Webhook Payload (JSON)</Label>
                <Textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Endpoint: <code className="bg-muted px-1 rounded text-[10px]">{EDGE_BASE}/lead-intake-engine</code>
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTestDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleTestWebhook} disabled={isTesting} className="gap-2">
                  {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isTesting ? "Sending..." : "Send Test"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="gap-2" onClick={handleTriggerFollowup}>
            <Bell className="h-4 w-4" /> Run Follow-up Check
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => { refetchLeads(); queryClient.invalidateQueries({ queryKey: ["automation-stats"] }); }}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <Users className="h-4 w-4" /> Lead Tracker
          </TabsTrigger>
          <TabsTrigger value="engines" className="gap-2">
            <Workflow className="h-4 w-4" /> Engines
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" /> Config
          </TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard icon={Database} label="Total Tracked" value={stats?.total || 0} color="bg-blue-500" />
            <StatsCard icon={Rocket} label="Today's Intake" value={stats?.today || 0} color="bg-green-500" />
            <StatsCard icon={CheckCircle2} label="Contacted" value={`${stats?.contactRate || 0}%`} subtext={`${stats?.contacted || 0} of ${stats?.total || 0}`} color="bg-emerald-500" />
            <StatsCard icon={AlertTriangle} label="Escalated" value={stats?.escalated || 0} subtext="Manager alerts sent" color="bg-red-500" />
          </div>

          {/* Vertical Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" /> Vertical Breakdown
              </CardTitle>
              <CardDescription>Lead distribution across business verticals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats?.verticalBreakdown || {}).sort((a, b) => b[1] - a[1]).map(([vertical, count]) => (
                  <div key={vertical} className="flex items-center gap-3">
                    <Badge className={VERTICAL_COLORS[vertical] || "bg-gray-100 text-gray-800"}>{vertical}</Badge>
                    <div className="flex-1">
                      <Progress value={stats?.total ? (count / stats.total) * 100 : 0} className="h-2" />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                  </div>
                ))}
                {Object.keys(stats?.verticalBreakdown || {}).length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-6">No leads tracked yet. Use the Test Webhook button to send a test lead.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Engines Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" /> Active Automation Engines
              </CardTitle>
              <CardDescription>{ENGINES.length} engines running natively</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ENGINES.map(engine => (
                  <div key={engine.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className={`p-2 rounded-lg ${engine.color} shrink-0`}>
                      <engine.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{engine.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{engine.description}</p>
                      <Badge variant="outline" className="mt-1.5 text-[10px] gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" /> Live
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" /> Recent Automation Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {leads.slice(0, 15).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {leads.slice(0, 15).map(lead => (
                      <div key={lead.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${lead.contacted ? "bg-green-500" : lead.manager_alerted ? "bg-red-500" : "bg-amber-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{lead.name || lead.phone}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.source || "Direct"} → {lead.vertical}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[lead.status] || STATUS_COLORS["new"]} variant="secondary">
                          {lead.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LEAD TRACKER TAB ─── */}
        <TabsContent value="leads" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:max-w-xs"
            />
            <Select value={verticalFilter} onValueChange={setVerticalFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Verticals" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verticals</SelectItem>
                <SelectItem value="Car Sales">Car Sales</SelectItem>
                <SelectItem value="Insurance">Insurance</SelectItem>
                <SelectItem value="Loan">Loan</SelectItem>
                <SelectItem value="Self Drive">Self Drive</SelectItem>
                <SelectItem value="HSRP">HSRP</SelectItem>
                <SelectItem value="Accessories">Accessories</SelectItem>
                <SelectItem value="General Enquiry">General Enquiry</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="self-center">{filteredLeads.length} leads</Badge>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Vertical</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contacted</TableHead>
                      <TableHead>Escalated</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                    ) : filteredLeads.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
                    ) : (
                      filteredLeads.map(lead => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{lead.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{lead.phone}</p>
                              {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={VERTICAL_COLORS[lead.vertical] || ""} variant="secondary">{lead.vertical}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{lead.source || "Direct"}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[lead.status] || ""} variant="secondary">{lead.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {lead.contacted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            {lead.manager_alerted ? (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            {!lead.contacted && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs"
                                onClick={() => markContacted.mutate(lead.id)}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Mark Contacted
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ENGINES TAB ─── */}
        <TabsContent value="engines" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {ENGINES.map(engine => (
              <Card key={engine.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${engine.color} shrink-0`}>
                      <engine.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{engine.name}</h3>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" /> Active
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{engine.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <code className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">
                          {EDGE_BASE}/{engine.id}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Running
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Webhook Integration Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" /> Webhook Integration Guide
              </CardTitle>
              <CardDescription>Connect external forms, CRMs, or third-party tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Endpoint URL:</p>
                <code className="block text-xs bg-background p-2 rounded border font-mono break-all">
                  POST {EDGE_BASE}/lead-intake-engine
                </code>
              </div>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Sample Payload:</p>
                <pre className="text-xs bg-background p-2 rounded border font-mono overflow-x-auto">
{`{
  "name": "John Doe",
  "phone": "9876543210",
  "email": "john@example.com",
  "source": "Website Form",
  "message": "Interested in new car",
  "service": "car",
  "city": "Mumbai"
}`}
                </pre>
              </div>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Supported Fields:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {["name", "phone (required)", "email", "source", "message / service", "city", "car_brand", "utm_source / utm_medium / utm_campaign"].map(f => (
                    <Badge key={f} variant="outline" className="justify-center">{f}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── CONFIG TAB ─── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">⏱️ Follow-up Rules</CardTitle>
                <CardDescription>Configure escalation timing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>30-Minute Follow-up Check</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Manager WhatsApp Alert</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Manager Email Alert</Label>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cron Schedule (every 5 min)</Label>
                  <Input value="*/5 * * * *" disabled className="font-mono text-xs" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📱 Notification Channels</CardTitle>
                <CardDescription>Where alerts are delivered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    <Label>WhatsApp (Meta API)</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <Label>Email (Resend)</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-500" />
                    <Label>In-App Notifications</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Escalation Recipients</Label>
                  <Input placeholder="manager@grabyourcar.com" className="text-xs" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🏷️ Vertical Classification</CardTitle>
                <CardDescription>Keyword-based auto-routing rules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { keyword: "insurance, car insurance", vertical: "Insurance" },
                    { keyword: "loan, car loan, finance", vertical: "Loan" },
                    { keyword: "rental, self drive", vertical: "Self Drive" },
                    { keyword: "hsrp, fastag", vertical: "HSRP" },
                    { keyword: "accessories", vertical: "Accessories" },
                    { keyword: "car, new car", vertical: "Car Sales" },
                  ].map(rule => (
                    <div key={rule.vertical} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <Badge className={VERTICAL_COLORS[rule.vertical] || ""} variant="secondary">{rule.vertical}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{rule.keyword}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔄 Deduplication</CardTitle>
                <CardDescription>Duplicate detection settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Phone Number Dedup</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Cross-Table Check (leads, insurance, loans)</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-Tag Multi-Vertical Leads</Label>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AutomationCommandCenter;
