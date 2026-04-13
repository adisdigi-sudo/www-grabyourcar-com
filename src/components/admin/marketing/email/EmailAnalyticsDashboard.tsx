import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import {
  Mail, Send, CheckCircle, XCircle, Eye, MousePointerClick,
  TrendingUp, Users, Calendar, Loader2, RefreshCw, BarChart3,
  AlertTriangle, Ban, Inbox, ArrowUpRight, Zap, MessageSquare
} from "lucide-react";
import { format, formatDistanceToNowStrict, subDays } from "date-fns";

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string | null;
  status: string;
  opened_at: string | null;
  clicked_at: string | null;
  delivered_at: string | null;
  bounced_at: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  campaign_id: string | null;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  failed_count: number;
  total_recipients: number;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface EmailEvent {
  id: string;
  event_type: string;
  recipient_email: string;
  campaign_id: string | null;
  link_url: string | null;
  created_at: string;
}

export function EmailAnalyticsDashboard() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [suppressedCount, setSuppressedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => { fetchData(); }, [dateRange]);

  // Real-time updates
  useEffect(() => {
    const ch1 = supabase
      .channel("email-logs-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_logs" }, () => fetchData())
      .subscribe();
    const ch2 = supabase
      .channel("email-events-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "email_events" }, (payload) => {
        setEvents(prev => [payload.new as EmailEvent, ...prev].slice(0, 200));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "all": 3650 };
    const since = subDays(new Date(), daysMap[dateRange] || 30).toISOString();

    const [logsRes, campaignsRes, subsRes, eventsRes, suppressedRes] = await Promise.all([
      supabase.from("email_logs").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("email_subscribers").select("id", { count: "exact", head: true }).eq("subscribed", true),
      supabase.from("email_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      supabase.from("suppressed_emails").select("id", { count: "exact", head: true }),
    ]);

    if (logsRes.data) setLogs(logsRes.data as EmailLog[]);
    if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[]);
    if (eventsRes.data) setEvents(eventsRes.data as EmailEvent[]);
    setSubscriberCount(subsRes.count || 0);
    setSuppressedCount(suppressedRes.count || 0);
    setIsLoading(false);
  };

  // ─── STATS ───
  const totalSent = logs.filter(l => ["sent", "delivered"].includes(l.status)).length;
  const totalDelivered = logs.filter(l => l.status === "delivered" || l.delivered_at).length;
  const totalOpened = logs.filter(l => l.opened_at).length;
  const totalClicked = logs.filter(l => l.clicked_at).length;
  const totalBounced = logs.filter(l => l.status === "bounced" || l.bounced_at).length;
  const totalFailed = logs.filter(l => l.status === "failed").length;
  const totalComplained = logs.filter(l => l.status === "complained").length;

  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const openRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;
  const clickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0;
  const bounceRate = totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0;

  // ─── DAILY CHART DATA ───
  const dailyData = (() => {
    const map = new Map<string, { date: string; sent: number; delivered: number; opened: number; clicked: number; bounced: number }>();
    logs.forEach(l => {
      const day = format(new Date(l.created_at), "MMM dd");
      if (!map.has(day)) map.set(day, { date: day, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 });
      const d = map.get(day)!;
      if (["sent", "delivered"].includes(l.status)) d.sent++;
      if (l.status === "delivered" || l.delivered_at) d.delivered++;
      if (l.opened_at) d.opened++;
      if (l.clicked_at) d.clicked++;
      if (l.status === "bounced") d.bounced++;
    });
    return Array.from(map.values()).reverse().slice(-14);
  })();

  // ─── STATUS PIE ───
  const statusPie = [
    { name: "Delivered", value: totalDelivered, color: "#22c55e" },
    { name: "Opened", value: totalOpened, color: "#3b82f6" },
    { name: "Clicked", value: totalClicked, color: "#8b5cf6" },
    { name: "Bounced", value: totalBounced, color: "#ef4444" },
    { name: "Failed", value: totalFailed, color: "#f97316" },
    { name: "Spam Reports", value: totalComplained, color: "#ec4899" },
  ].filter(d => d.value > 0);

  // ─── LIVE EVENT FEED ───
  const eventTypeLabel: Record<string, { label: string; emoji: string; color: string }> = {
    "email.sent": { label: "Sent", emoji: "📤", color: "text-blue-600" },
    "email.delivered": { label: "Delivered", emoji: "✅", color: "text-green-600" },
    "email.opened": { label: "Opened", emoji: "👁️", color: "text-emerald-600" },
    "email.clicked": { label: "Clicked", emoji: "🖱️", color: "text-purple-600" },
    "email.bounced": { label: "Bounced", emoji: "⚠️", color: "text-red-600" },
    "email.complained": { label: "Spam", emoji: "🚫", color: "text-pink-600" },
  };

  const topCampaigns = [...campaigns]
    .filter(c => c.sent_count > 0)
    .sort((a, b) => (b.open_count || 0) - (a.open_count || 0))
    .slice(0, 10);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />Email Analytics
          </h3>
          <p className="text-xs text-muted-foreground">Real-time delivery, opens, clicks & bounce tracking</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><Calendar className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ─── STAT CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {[
          { label: "Sent", value: totalSent, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Delivered", value: totalDelivered, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { label: "Opened", value: totalOpened, icon: Eye, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Clicked", value: totalClicked, icon: MousePointerClick, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Open Rate", value: `${openRate}%`, icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "Click Rate", value: `${clickRate}%`, icon: ArrowUpRight, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Bounced", value: totalBounced, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Subscribers", value: subscriberCount, icon: Users, color: "text-primary", bg: "bg-primary/5" },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="overflow-hidden">
              <CardContent className="p-2.5">
                <div className={`inline-flex p-1.5 rounded-md ${m.bg} mb-1`}>
                  <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                </div>
                <p className="text-lg font-bold leading-tight">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Delivery Health Bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Delivery Health</span>
            <Progress value={deliveryRate} className="flex-1 h-2" />
            <span className="text-sm font-bold">{deliveryRate}%</span>
            {bounceRate > 5 && (
              <Badge variant="destructive" className="text-xs">⚠️ High Bounce {bounceRate}%</Badge>
            )}
            {suppressedCount > 0 && (
              <Badge variant="secondary" className="text-xs gap-1"><Ban className="h-3 w-3" />{suppressedCount} suppressed</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="h-8">
          <TabsTrigger value="overview" className="text-xs">📊 Overview</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs">🚀 Campaigns</TabsTrigger>
          <TabsTrigger value="live" className="text-xs">⚡ Live Feed</TabsTrigger>
          <TabsTrigger value="recipients" className="text-xs">👥 Recipients</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ─── */}
        <TabsContent value="overview">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm">Daily Email Volume</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                      <Area type="monotone" dataKey="sent" stroke="#3b82f6" fill="url(#colorSent)" name="Sent" />
                      <Area type="monotone" dataKey="opened" stroke="#22c55e" fill="url(#colorOpened)" name="Opened" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-sm">Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="h-[180px] flex items-center justify-center">
                  {statusPie.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-1">
                  {statusPie.map(d => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[10px] text-muted-foreground">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── CAMPAIGNS ─── */}
        <TabsContent value="campaigns">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Recipients</TableHead>
                      <TableHead className="text-center">Sent</TableHead>
                      <TableHead className="text-center">Opens</TableHead>
                      <TableHead className="text-center">Clicks</TableHead>
                      <TableHead className="text-center">Open Rate</TableHead>
                      <TableHead className="text-center">CTR</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCampaigns.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No campaigns sent yet</TableCell></TableRow>
                    ) : topCampaigns.map(c => {
                      const or = c.sent_count > 0 ? Math.round((c.open_count / c.sent_count) * 100) : 0;
                      const cr = c.open_count > 0 ? Math.round((c.click_count / c.open_count) * 100) : 0;
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{c.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              c.status === "completed" ? "bg-green-50 text-green-700 border-green-200" :
                              c.status === "sending" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              "bg-gray-50 text-gray-600"
                            }>{c.status}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm">{c.total_recipients}</TableCell>
                          <TableCell className="text-center text-sm">{c.sent_count}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium text-green-600">{c.open_count}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-medium text-purple-600">{c.click_count}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={or >= 20 ? "default" : "secondary"} className="text-xs">{or}%</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs">{cr}%</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.completed_at ? format(new Date(c.completed_at), "dd MMM") : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LIVE EVENT FEED ─── */}
        <TabsContent value="live">
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />Live Email Events
                <Badge variant="secondary" className="text-xs ml-auto">{events.length} events</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No events yet — send a campaign to see live tracking
                      </TableCell></TableRow>
                    ) : events.slice(0, 50).map(e => {
                      const et = eventTypeLabel[e.event_type] || { label: e.event_type, emoji: "📨", color: "text-gray-600" };
                      return (
                        <TableRow key={e.id}>
                          <TableCell>
                            <span className={`text-sm font-medium ${et.color}`}>
                              {et.emoji} {et.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{e.recipient_email}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {e.link_url || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDistanceToNowStrict(new Date(e.created_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PER-RECIPIENT TRACKING ─── */}
        <TabsContent value="recipients">
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm">Per-Recipient Email Journey</CardTitle>
              <CardDescription className="text-xs">Track each email: sent → delivered → opened → clicked</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[450px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Delivered</TableHead>
                      <TableHead className="text-center">Opened</TableHead>
                      <TableHead className="text-center">Clicked</TableHead>
                      <TableHead>Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 50).map(l => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{l.recipient_name || l.recipient_email}</p>
                            {l.recipient_name && <p className="text-xs text-muted-foreground">{l.recipient_email}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{l.subject || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={
                            l.status === "delivered" ? "bg-green-50 text-green-700 border-green-200" :
                            l.status === "sent" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            l.status === "bounced" ? "bg-red-50 text-red-700 border-red-200" :
                            l.status === "complained" ? "bg-pink-50 text-pink-700 border-pink-200" :
                            l.status === "failed" ? "bg-orange-50 text-orange-700 border-orange-200" :
                            "bg-gray-50 text-gray-600"
                          }>{l.status}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {l.delivered_at || l.status === "delivered"
                            ? <span className="text-green-600">✅</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {l.opened_at
                            ? <span className="text-blue-600">👁️</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          {l.clicked_at
                            ? <span className="text-purple-600">🖱️</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {l.sent_at ? format(new Date(l.sent_at), "dd MMM, HH:mm") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
