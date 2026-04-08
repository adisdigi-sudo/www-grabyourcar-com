import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import {
  Mail, Send, CheckCircle, XCircle, Eye, MousePointerClick,
  TrendingUp, Users, Calendar, Loader2, RefreshCw, BarChart3
} from "lucide-react";

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string | null;
  status: string;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  campaign_id: string | null;
}

interface Campaign {
  id: string;
  name: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  failed_count: number;
  total_recipients: number;
  status: string;
  completed_at: string | null;
}

export function EmailAnalyticsDashboard() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");

  useEffect(() => { fetchData(); }, [dateRange]);

  useEffect(() => {
    const channel = supabase
      .channel("email-logs-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "email_logs" }, (payload) => {
        setLogs(prev => [payload.new as EmailLog, ...prev].slice(0, 500));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const now = new Date();
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "all": 3650 };
    const since = new Date(now.getTime() - (daysMap[dateRange] || 30) * 24 * 60 * 60 * 1000).toISOString();

    const [logsRes, campaignsRes, subsRes] = await Promise.all([
      supabase.from("email_logs").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      supabase.from("email_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("email_subscribers").select("id", { count: "exact", head: true }),
    ]);

    if (logsRes.data) setLogs(logsRes.data as EmailLog[]);
    if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[]);
    setSubscriberCount(subsRes.count || 0);
    setIsLoading(false);
  };

  const stats = {
    totalSent: logs.filter(l => l.status === "sent" || l.status === "delivered").length,
    totalOpened: logs.filter(l => l.opened_at).length,
    totalClicked: logs.filter(l => l.clicked_at).length,
    totalFailed: logs.filter(l => l.status === "failed" || l.status === "bounced").length,
    openRate: logs.length > 0 ? Math.round((logs.filter(l => l.opened_at).length / Math.max(logs.filter(l => l.status === "sent" || l.status === "delivered").length, 1)) * 100) : 0,
    clickRate: logs.length > 0 ? Math.round((logs.filter(l => l.clicked_at).length / Math.max(logs.filter(l => l.opened_at).length, 1)) * 100) : 0,
  };

  // Daily send data for chart
  const dailyData = (() => {
    const map = new Map<string, { date: string; sent: number; opened: number; failed: number }>();
    logs.forEach(l => {
      const day = new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!map.has(day)) map.set(day, { date: day, sent: 0, opened: 0, failed: 0 });
      const d = map.get(day)!;
      if (l.status === "sent" || l.status === "delivered") d.sent++;
      if (l.opened_at) d.opened++;
      if (l.status === "failed" || l.status === "bounced") d.failed++;
    });
    return Array.from(map.values()).reverse().slice(-14);
  })();

  const statusDistribution = [
    { name: "Delivered", value: stats.totalSent, color: "#22c55e" },
    { name: "Opened", value: stats.totalOpened, color: "#3b82f6" },
    { name: "Clicked", value: stats.totalClicked, color: "#8b5cf6" },
    { name: "Failed", value: stats.totalFailed, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const topCampaigns = [...campaigns]
    .sort((a, b) => (b.open_count || 0) - (a.open_count || 0))
    .slice(0, 5);

  const metricCards = [
    { label: "Total Sent", value: stats.totalSent, icon: Send, color: "text-blue-600" },
    { label: "Opened", value: stats.totalOpened, icon: Eye, color: "text-green-600" },
    { label: "Clicked", value: stats.totalClicked, icon: MousePointerClick, color: "text-purple-600" },
    { label: "Failed", value: stats.totalFailed, icon: XCircle, color: "text-red-600" },
    { label: "Open Rate", value: `${stats.openRate}%`, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Subscribers", value: subscriberCount, icon: Users, color: "text-primary" },
  ];

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <div className="flex justify-between items-center">
        <Badge variant="secondary" className="gap-1"><Mail className="h-3 w-3" />{logs.length} email events</Badge>
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]"><Calendar className="h-3 w-3 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {metricCards.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="p-3">
                <m.icon className={`h-4 w-4 ${m.color} mb-1`} />
                <p className="text-xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Send Volume</CardTitle>
            <CardDescription className="text-xs">Daily email activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Bar dataKey="sent" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Sent" />
                  <Bar dataKey="opened" fill="#22c55e" radius={[3, 3, 0, 0]} name="Opened" />
                  <Bar dataKey="failed" fill="#ef4444" radius={[3, 3, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              {statusDistribution.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                      {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {statusDistribution.map(d => (
                <div key={d.name} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Campaigns */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top Campaigns by Opens</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Open Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCampaigns.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No campaigns yet</TableCell></TableRow>
              ) : topCampaigns.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm">{c.name}</TableCell>
                  <TableCell>
                    <Badge className={c.status === "completed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"} variant="outline">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.sent_count}</TableCell>
                  <TableCell>{c.open_count}</TableCell>
                  <TableCell>{c.click_count}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {c.sent_count > 0 ? Math.round((c.open_count / c.sent_count) * 100) : 0}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Email Logs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Email Activity</CardTitle>
          <CardDescription className="text-xs">Live stream of email events</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.slice(0, 20).map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{l.recipient_email}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{l.subject || "—"}</TableCell>
                  <TableCell>
                    <Badge className={
                      l.status === "sent" || l.status === "delivered" ? "bg-green-100 text-green-800" :
                      l.status === "failed" || l.status === "bounced" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }>{l.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{l.opened_at ? "✅ Yes" : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.sent_at ? new Date(l.sent_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
