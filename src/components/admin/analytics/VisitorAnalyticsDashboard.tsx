/**
 * VisitorAnalyticsDashboard — admin view of website visitor traffic.
 *
 * Reads from public.visitor_sessions / visitor_page_views / visitor_events /
 * visitor_captured_leads. Shows live visitors, top sources, page-time/bounce,
 * and captured leads with source attribution.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Users,
  Eye,
  Phone,
  RefreshCw,
  Globe,
  Smartphone,
  Clock,
  TrendingDown,
  MousePointerClick,
  MessageCircle,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SessionRow = {
  id: string;
  session_key: string;
  visitor_id: string;
  source: string | null;
  medium: string | null;
  referrer: string | null;
  landing_page: string | null;
  exit_page: string | null;
  device_type: string | null;
  browser: string | null;
  country: string | null;
  page_count: number;
  total_time_seconds: number;
  is_bounced: boolean;
  captured_phone: string | null;
  captured_email: string | null;
  captured_name: string | null;
  last_active_at: string;
  started_at: string;
};

type PageViewRow = {
  page_path: string;
  time_spent_seconds: number;
  scroll_depth: number;
  entered_at: string;
  session_key: string;
};

type CapturedLeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  capture_source: string;
  capture_page: string | null;
  source: string | null;
  utm_campaign: string | null;
  pages_viewed: number | null;
  time_on_site_seconds: number | null;
  created_at: string;
};

const RANGE_OPTIONS = [
  { label: "Today", days: 1 },
  { label: "Last 7d", days: 7 },
  { label: "Last 30d", days: 30 },
  { label: "Last 90d", days: 90 },
];

const formatDuration = (sec: number) => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const sourceColor = (src: string) => {
  const s = src.toLowerCase();
  if (s.includes("google")) return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  if (s.includes("facebook") || s.includes("instagram")) return "bg-purple-500/15 text-purple-600 border-purple-500/30";
  if (s.includes("whatsapp")) return "bg-green-500/15 text-green-600 border-green-500/30";
  if (s.includes("direct")) return "bg-slate-500/15 text-slate-600 border-slate-500/30";
  return "bg-amber-500/15 text-amber-600 border-amber-500/30";
};

export function VisitorAnalyticsDashboard() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [pageViews, setPageViews] = useState<PageViewRow[]>([]);
  const [leads, setLeads] = useState<CapturedLeadRow[]>([]);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const [s, p, l] = await Promise.all([
      supabase
        .from("visitor_sessions")
        .select(
          "id, session_key, visitor_id, source, medium, referrer, landing_page, exit_page, device_type, browser, country, page_count, total_time_seconds, is_bounced, captured_phone, captured_email, captured_name, last_active_at, started_at",
        )
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(1000),
      supabase
        .from("visitor_page_views")
        .select("page_path, time_spent_seconds, scroll_depth, entered_at, session_key")
        .gte("entered_at", since)
        .order("entered_at", { ascending: false })
        .limit(2000),
      supabase
        .from("visitor_captured_leads")
        .select(
          "id, name, phone, email, message, capture_source, capture_page, source, utm_campaign, pages_viewed, time_on_site_seconds, created_at",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (s.data) setSessions(s.data as SessionRow[]);
    if (p.data) setPageViews(p.data as PageViewRow[]);
    if (l.data) setLeads(l.data as CapturedLeadRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [days]);

  // Live visitors = active in last 5 minutes
  const live = useMemo(() => {
    const cutoff = Date.now() - 5 * 60_000;
    return sessions.filter((s) => new Date(s.last_active_at).getTime() >= cutoff);
  }, [sessions]);

  const totals = useMemo(() => {
    const total = sessions.length;
    const uniqueVisitors = new Set(sessions.map((s) => s.visitor_id)).size;
    const bounced = sessions.filter((s) => s.is_bounced).length;
    const avgTime = total > 0 ? Math.round(sessions.reduce((a, s) => a + s.total_time_seconds, 0) / total) : 0;
    const captured = sessions.filter((s) => s.captured_phone || s.captured_email).length;
    const totalPageViews = sessions.reduce((a, s) => a + s.page_count, 0);
    return {
      total,
      uniqueVisitors,
      bounceRate: total > 0 ? Math.round((bounced / total) * 100) : 0,
      avgTime,
      captured,
      conversionRate: total > 0 ? ((captured / total) * 100).toFixed(1) : "0",
      totalPageViews,
    };
  }, [sessions]);

  const topSources = useMemo(() => {
    const map = new Map<string, { sessions: number; captured: number }>();
    sessions.forEach((s) => {
      const k = s.source || "direct";
      const cur = map.get(k) || { sessions: 0, captured: 0 };
      cur.sessions += 1;
      if (s.captured_phone || s.captured_email) cur.captured += 1;
      map.set(k, cur);
    });
    return [...map.entries()]
      .sort((a, b) => b[1].sessions - a[1].sessions)
      .slice(0, 10)
      .map(([source, v]) => ({
        source,
        sessions: v.sessions,
        captured: v.captured,
        convRate: v.sessions > 0 ? ((v.captured / v.sessions) * 100).toFixed(1) : "0",
      }));
  }, [sessions]);

  const topPages = useMemo(() => {
    const map = new Map<string, { views: number; totalTime: number; bounces: number }>();
    pageViews.forEach((pv) => {
      const cur = map.get(pv.page_path) || { views: 0, totalTime: 0, bounces: 0 };
      cur.views += 1;
      cur.totalTime += pv.time_spent_seconds;
      if (pv.time_spent_seconds < 10) cur.bounces += 1;
      map.set(pv.page_path, cur);
    });
    return [...map.entries()]
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, 15)
      .map(([page, v]) => ({
        page,
        views: v.views,
        avgTime: v.views > 0 ? Math.round(v.totalTime / v.views) : 0,
        bounceRate: v.views > 0 ? Math.round((v.bounces / v.views) * 100) : 0,
      }));
  }, [pageViews]);

  const stats = [
    { label: "Live Now", value: live.length, icon: Activity, tone: "text-green-600 bg-green-500/10", live: true },
    { label: "Total Visitors", value: totals.uniqueVisitors, icon: Users, tone: "text-blue-600 bg-blue-500/10" },
    { label: "Sessions", value: totals.total, icon: Eye, tone: "text-indigo-600 bg-indigo-500/10" },
    { label: "Page Views", value: totals.totalPageViews, icon: MousePointerClick, tone: "text-purple-600 bg-purple-500/10" },
    { label: "Avg. Time", value: formatDuration(totals.avgTime), icon: Clock, tone: "text-amber-600 bg-amber-500/10" },
    { label: "Bounce Rate", value: `${totals.bounceRate}%`, icon: TrendingDown, tone: "text-red-600 bg-red-500/10" },
    { label: "Leads Captured", value: totals.captured, icon: Phone, tone: "text-emerald-600 bg-emerald-500/10" },
    { label: "Conversion", value: `${totals.conversionRate}%`, icon: MessageCircle, tone: "text-pink-600 bg-pink-500/10" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📊 Visitor Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Real-time website traffic — kaun aaya, kaha se aaya, kya kiya, number capture hua ya nahi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-background p-0.5">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.days}
                onClick={() => setDays(o.days)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-sm transition-colors",
                  days === o.days ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                    {s.label}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{s.value}</p>
                </div>
                <div className={cn("p-1.5 rounded-md", s.tone)}>
                  <s.icon className={cn("h-3.5 w-3.5", s.live && "animate-pulse")} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="live">🟢 Live</TabsTrigger>
          <TabsTrigger value="sources">📥 Sources</TabsTrigger>
          <TabsTrigger value="pages">📄 Pages</TabsTrigger>
          <TabsTrigger value="leads">📞 Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Active Visitors (last 5 minutes) — {live.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {live.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Koi abhi online nahi hai.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Landing</TableHead>
                        <TableHead>Exit / Current</TableHead>
                        <TableHead className="text-right">Pages</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                        <TableHead>Captured?</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {live.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Badge variant="outline" className={cn("font-normal", sourceColor(s.source || "direct"))}>
                              {s.source || "direct"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              {s.device_type === "mobile" ? <Smartphone className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                              {s.device_type || "—"}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[180px] truncate">
                            {s.landing_page || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[180px] truncate">
                            {s.exit_page || s.landing_page || "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{s.page_count}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs">
                            {formatDuration(s.total_time_seconds)}
                          </TableCell>
                          <TableCell>
                            {s.captured_phone ? (
                              <Badge className="bg-green-600 text-white">📞 {s.captured_phone}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              {topSources.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Data nahi hai.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Captured Leads</TableHead>
                      <TableHead className="text-right">Conv. Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSources.map((row) => (
                      <TableRow key={row.source}>
                        <TableCell>
                          <Badge variant="outline" className={cn("font-normal", sourceColor(row.source))}>
                            {row.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.sessions}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.captured}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Badge variant="secondary">{row.convRate}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Page-wise Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              {topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Data nahi hai.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Avg. Time</TableHead>
                      <TableHead className="text-right">Bounce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPages.map((row) => (
                      <TableRow key={row.page}>
                        <TableCell className="font-mono text-xs max-w-[400px] truncate">{row.page}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.views}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatDuration(row.avgTime)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.bounceRate > 60 ? "destructive" : "secondary"}>
                            {row.bounceRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Captured Leads ({leads.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Abhi koi lead capture nahi hua.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Page</TableHead>
                        <TableHead className="text-right">Pages/Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </TableCell>
                          <TableCell>{l.name || "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              {l.phone && (
                                <a
                                  href={`tel:${l.phone}`}
                                  className="text-xs flex items-center gap-1 text-green-600 hover:underline"
                                >
                                  <Phone className="h-3 w-3" />
                                  {l.phone}
                                </a>
                              )}
                              {l.email && (
                                <a
                                  href={`mailto:${l.email}`}
                                  className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
                                >
                                  <Mail className="h-3 w-3" />
                                  {l.email}
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{l.capture_source}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("font-normal text-xs", sourceColor(l.source || "direct"))}>
                              {l.source || "direct"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[160px] truncate">
                            {l.capture_page || "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {l.pages_viewed || 0}p / {formatDuration(l.time_on_site_seconds || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default VisitorAnalyticsDashboard;
