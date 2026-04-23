import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, TrendingDown, IndianRupee, MessageSquare, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { estimateMessageCost, META_PRICE_INR, type CostTier } from "@/lib/wa/utilityValidator";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from "recharts";

type TemplateRow = { name: string; category: string | null; status: string | null };
type MsgRow = {
  id: string;
  template_name: string | null;
  message_type: string | null;
  status: string | null;
  direction: string | null;
  created_at: string;
  conversation_id: string | null;
};
type ConvoRow = { id: string; window_expires_at: string | null };

interface DayBucket {
  date: string;
  marketing: number;
  utility: number;
  authentication: number;
  service: number;
  cost: number;
  delivered: number;
  failed: number;
  read: number;
  sent: number;
}

const TIER_COLORS: Record<CostTier, string> = {
  marketing: "hsl(0 84% 60%)",
  utility: "hsl(142 71% 45%)",
  authentication: "hsl(199 89% 48%)",
  service: "hsl(220 9% 46%)",
};

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
];

export function WAHubCostDashboard() {
  const [rangeDays, setRangeDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [convos, setConvos] = useState<Record<string, string | null>>({});

  async function load() {
    setRefreshing(true);
    const since = new Date(Date.now() - parseInt(rangeDays, 10) * 86400 * 1000).toISOString();

    const [msgsRes, tplRes] = await Promise.all([
      supabase
        .from("wa_inbox_messages")
        .select("id, template_name, message_type, status, direction, created_at, conversation_id")
        .eq("direction", "outbound")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("wa_templates").select("name, category, status"),
    ]);

    const msgs = (msgsRes.data as MsgRow[]) || [];
    setMessages(msgs);
    setTemplates((tplRes.data as TemplateRow[]) || []);

    // Fetch conversation window data for the involved conversations (for free-tier accounting)
    const convoIds = Array.from(new Set(msgs.map((m) => m.conversation_id).filter(Boolean))) as string[];
    if (convoIds.length > 0) {
      const { data: convoData } = await supabase
        .from("wa_conversations")
        .select("id, window_expires_at")
        .in("id", convoIds);
      const map: Record<string, string | null> = {};
      ((convoData as ConvoRow[]) || []).forEach((c) => { map[c.id] = c.window_expires_at; });
      setConvos(map);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  // Build template -> category map
  const templateCategoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of templates) m[t.name] = (t.category || "").toLowerCase();
    return m;
  }, [templates]);

  // Classify each message + assign cost
  const enriched = useMemo(() => {
    return messages.map((msg) => {
      const cat = msg.template_name ? templateCategoryMap[msg.template_name] || "utility" : null;
      // window-open check is approximated using current value; not historic but close enough for cost estimation
      const windowExpiry = msg.conversation_id ? convos[msg.conversation_id] : null;
      const windowOpen = windowExpiry ? new Date(windowExpiry) > new Date(msg.created_at) : false;

      const { tier, cost } = estimateMessageCost({
        category: cat,
        messageType: msg.message_type,
        windowOpen,
      });

      // Failed messages: don't count cost (Meta refunds)
      const isFailed = msg.status === "failed";
      return {
        ...msg,
        tier,
        cost: isFailed ? 0 : cost,
        attemptedCost: cost,
        category: cat,
      };
    });
  }, [messages, templateCategoryMap, convos]);

  // Aggregates
  const totals = useMemo(() => {
    const acc = {
      total: 0,
      cost: 0,
      attemptedCost: 0,
      delivered: 0,
      failed: 0,
      read: 0,
      sent: 0,
      byTier: { marketing: 0, utility: 0, authentication: 0, service: 0 } as Record<CostTier, number>,
      costByTier: { marketing: 0, utility: 0, authentication: 0, service: 0 } as Record<CostTier, number>,
    };
    for (const m of enriched) {
      acc.total++;
      acc.cost += m.cost;
      acc.attemptedCost += m.attemptedCost;
      acc.byTier[m.tier]++;
      acc.costByTier[m.tier] += m.cost;
      if (m.status === "delivered") acc.delivered++;
      else if (m.status === "failed") acc.failed++;
      else if (m.status === "read") acc.read++;
      else if (m.status === "sent") acc.sent++;
    }
    return acc;
  }, [enriched]);

  // Daily buckets for chart
  const daily = useMemo(() => {
    const days = parseInt(rangeDays, 10);
    const buckets: Record<string, DayBucket> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = {
        date: key.slice(5), // MM-DD
        marketing: 0, utility: 0, authentication: 0, service: 0,
        cost: 0, delivered: 0, failed: 0, read: 0, sent: 0,
      };
    }
    for (const m of enriched) {
      const key = m.created_at.slice(0, 10);
      const b = buckets[key];
      if (!b) continue;
      b[m.tier]++;
      b.cost += m.cost;
      if (m.status === "delivered") b.delivered++;
      else if (m.status === "failed") b.failed++;
      else if (m.status === "read") b.read++;
      else if (m.status === "sent") b.sent++;
    }
    return Object.values(buckets);
  }, [enriched, rangeDays]);

  // Top templates by cost
  const topTemplatesByCost = useMemo(() => {
    const map: Record<string, { name: string; tier: CostTier; sends: number; cost: number; failed: number }> = {};
    for (const m of enriched) {
      const name = m.template_name || (m.message_type === "text" ? "(plain text)" : `(${m.message_type})`);
      if (!map[name]) {
        map[name] = { name, tier: m.tier, sends: 0, cost: 0, failed: 0 };
      }
      map[name].sends++;
      map[name].cost += m.cost;
      if (m.status === "failed") map[name].failed++;
    }
    return Object.values(map).sort((a, b) => b.cost - a.cost).slice(0, 10);
  }, [enriched]);

  // Potential savings: marketing sends * (marketing - utility price)
  const potentialSavings = totals.byTier.marketing * (META_PRICE_INR.marketing - META_PRICE_INR.utility);

  const successRate = totals.total > 0
    ? (((totals.delivered + totals.read) / totals.total) * 100)
    : 0;

  const failureRate = totals.total > 0 ? (totals.failed / totals.total) * 100 : 0;

  const pieData: Array<{ name: CostTier; value: number; cost: number }> = (["marketing", "utility", "authentication", "service"] as CostTier[])
    .filter((t) => totals.byTier[t] > 0)
    .map((t) => ({ name: t, value: totals.byTier[t], cost: totals.costByTier[t] }));

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            WhatsApp Cost &amp; Spend Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last {rangeDays} days · Meta India pricing · Failed sends excluded from cost
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={rangeDays === r.value ? "default" : "outline"}
              onClick={() => setRangeDays(r.value)}
              className="h-8 text-xs"
            >
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={load} disabled={refreshing} className="h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Spend"
          value={`Rs ${totals.cost.toFixed(2)}`}
          sub={`${totals.total} sends`}
          icon={IndianRupee}
          tone="emerald"
        />
        <KpiCard
          label="Potential Savings"
          value={`Rs ${potentialSavings.toFixed(2)}`}
          sub={`If ${totals.byTier.marketing} marketing → utility`}
          icon={TrendingDown}
          tone={potentialSavings > 50 ? "amber" : "muted"}
        />
        <KpiCard
          label="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          sub={`${totals.delivered + totals.read} delivered/read`}
          icon={CheckCircle2}
          tone={successRate >= 90 ? "emerald" : successRate >= 70 ? "amber" : "red"}
        />
        <KpiCard
          label="Failure Rate"
          value={`${failureRate.toFixed(1)}%`}
          sub={`${totals.failed} failed (Rs 0 charged)`}
          icon={AlertTriangle}
          tone={failureRate <= 5 ? "emerald" : failureRate <= 15 ? "amber" : "red"}
        />
      </div>

      {/* Tier breakdown cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["marketing", "utility", "authentication", "service"] as CostTier[]).map((t) => (
          <Card key={t} className="border-l-4" style={{ borderLeftColor: TIER_COLORS[t] }}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t}</span>
                <span className="text-[10px] text-muted-foreground">
                  Rs {META_PRICE_INR[t].toFixed(2)}/msg
                </span>
              </div>
              <div className="text-lg font-bold">{totals.byTier[t]}</div>
              <div className="text-xs text-muted-foreground">Rs {totals.costByTier[t].toFixed(2)} spent</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="trend" className="w-full">
        <TabsList>
          <TabsTrigger value="trend">Daily Trend</TabsTrigger>
          <TabsTrigger value="mix">Category Mix</TabsTrigger>
          <TabsTrigger value="templates">Top Templates</TabsTrigger>
          <TabsTrigger value="savings">Savings Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Daily sends by category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="marketing" stackId="a" fill={TIER_COLORS.marketing} name="Marketing" />
                  <Bar dataKey="utility" stackId="a" fill={TIER_COLORS.utility} name="Utility" />
                  <Bar dataKey="authentication" stackId="a" fill={TIER_COLORS.authentication} name="Auth" />
                  <Bar dataKey="service" stackId="a" fill={TIER_COLORS.service} name="Service (free)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Daily spend (Rs)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: number) => [`Rs ${v.toFixed(2)}`, "Cost"]}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" name="Spend" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Daily delivery status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="delivered" stackId="b" fill="hsl(142 71% 45%)" name="Delivered" />
                  <Bar dataKey="read" stackId="b" fill="hsl(199 89% 48%)" name="Read" />
                  <Bar dataKey="sent" stackId="b" fill="hsl(220 9% 46%)" name="Sent (no DR)" />
                  <Bar dataKey="failed" stackId="b" fill="hsl(0 84% 60%)" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mix">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Category distribution</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={(e) => `${e.name}: ${e.value}`}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={TIER_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((p) => {
                  const pct = totals.total > 0 ? (p.value / totals.total) * 100 : 0;
                  return (
                    <div key={p.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded" style={{ background: TIER_COLORS[p.name] }} />
                        <span className="text-sm font-medium capitalize">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{p.value} ({pct.toFixed(0)}%)</div>
                        <div className="text-xs text-muted-foreground">Rs {p.cost.toFixed(2)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top spend by template / message type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {topTemplatesByCost.map((t) => (
                  <div key={t.name} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize shrink-0"
                        style={{ borderColor: TIER_COLORS[t.tier], color: TIER_COLORS[t.tier] }}
                      >
                        {t.tier}
                      </Badge>
                      <span className="text-xs font-mono truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{t.sends} sends</span>
                      {t.failed > 0 && (
                        <span className="text-xs text-red-600">{t.failed} failed</span>
                      )}
                      <span className="text-sm font-bold w-20 text-right">Rs {t.cost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {topTemplatesByCost.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-8">No sends in this range</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="savings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-amber-600" />
                  Marketing → Utility migration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Re-submit marketing-classified templates as strict UTILITY (no emojis, no promo phrases).
                </p>
                <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
                  <span className="text-xs">Current marketing sends</span>
                  <span className="font-bold">{totals.byTier.marketing}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
                  <span className="text-xs">Cost at marketing rate</span>
                  <span className="font-bold text-red-600">Rs {(totals.byTier.marketing * META_PRICE_INR.marketing).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
                  <span className="text-xs">Cost at utility rate</span>
                  <span className="font-bold text-emerald-600">Rs {(totals.byTier.marketing * META_PRICE_INR.utility).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-300">
                  <span className="text-xs font-semibold">You save</span>
                  <span className="font-bold text-lg text-emerald-700">Rs {potentialSavings.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  24-hour window utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Free service messages sent within the 24-hour window (replies to customer messages).
                </p>
                <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
                  <span className="text-xs">Free service messages</span>
                  <span className="font-bold text-emerald-600">{totals.byTier.service}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-card border">
                  <span className="text-xs">Avoided cost</span>
                  <span className="font-bold text-emerald-600">~ Rs {(totals.byTier.service * META_PRICE_INR.utility).toFixed(2)}</span>
                </div>
                {failureRate > 10 && (
                  <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 mt-2">
                    <p className="text-xs font-semibold text-red-700">⚠ {failureRate.toFixed(1)}% failure rate</p>
                    <p className="text-[10px] text-red-600 mt-1">
                      Most failures = sending plain text outside 24h window. Use approved templates instead.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Weekly forecast (extrapolated)
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  const days = parseInt(rangeDays, 10);
                  const factor = 7 / days;
                  return (
                    <>
                      <div className="p-3 rounded-lg bg-muted/40">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Weekly sends</div>
                        <div className="text-xl font-bold">{Math.round(totals.total * factor)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Weekly spend</div>
                        <div className="text-xl font-bold">Rs {(totals.cost * factor).toFixed(0)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                        <div className="text-[10px] uppercase text-emerald-700 tracking-wider">Optimized weekly</div>
                        <div className="text-xl font-bold text-emerald-700">
                          Rs {((totals.cost - potentialSavings) * factor).toFixed(0)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                        <div className="text-[10px] uppercase text-amber-700 tracking-wider">Monthly savings</div>
                        <div className="text-xl font-bold text-amber-700">
                          Rs {(potentialSavings * factor * 4.3).toFixed(0)}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({
  label, value, sub, icon: Icon, tone,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType;
  tone: "emerald" | "amber" | "red" | "muted";
}) {
  const tones = {
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    red: "text-red-600 bg-red-50 dark:bg-red-950/40",
    muted: "text-muted-foreground bg-muted/40",
  };
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${tones[tone]}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold leading-tight">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
