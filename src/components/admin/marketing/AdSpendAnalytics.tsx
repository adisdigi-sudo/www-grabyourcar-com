import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, Target, BarChart3, RefreshCw,
  Megaphone, MousePointerClick, Users, IndianRupee, ArrowUpRight,
  Zap, Globe, Facebook, Search,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

type Period = "7d" | "30d" | "this_month" | "90d" | "all";

const PERIOD_MAP: Record<Period, { label: string; days: number | null }> = {
  "7d": { label: "Last 7 Days", days: 7 },
  "30d": { label: "Last 30 Days", days: 30 },
  this_month: { label: "This Month", days: null },
  "90d": { label: "Last 90 Days", days: 90 },
  all: { label: "All Time", days: null },
};

const PLATFORM_COLORS: Record<string, string> = {
  meta: "hsl(217 89% 61%)",
  google: "hsl(142 71% 45%)",
  facebook: "hsl(217 89% 61%)",
  instagram: "hsl(330 80% 60%)",
  unknown: "hsl(215 20% 65%)",
};

const COLORS = ["hsl(217 89% 61%)", "hsl(142 71% 45%)", "hsl(330 80% 60%)", "hsl(38 92% 50%)", "hsl(262 83% 58%)"];

const fmt = (n: number) => {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

function getDateRange(period: Period) {
  const now = new Date();
  if (period === "all") return { from: "2020-01-01", to: format(now, "yyyy-MM-dd") };
  if (period === "this_month") {
    return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd") };
  }
  const days = PERIOD_MAP[period].days!;
  return { from: format(subDays(now, days), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") };
}

export const AdSpendAnalytics = () => {
  const [period, setPeriod] = useState<Period>("30d");
  const { from, to } = getDateRange(period);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adSpendAnalytics", period],
    queryFn: async () => {
      const [campaigns, leadsBySource, leadsByPlatform] = await Promise.all([
        supabase.from("ad_campaigns").select("*").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }),
        supabase.from("leads").select("source, lead_source_type, utm_source, ad_platform, created_at").gte("created_at", from).lte("created_at", to),
        supabase.from("automation_lead_tracking").select("source, lead_source_type, utm_source, ad_platform, created_at").gte("created_at", from).lte("created_at", to),
      ]);

      // Aggregate campaign metrics
      const campaignList = campaigns.data || [];
      const totalSpend = campaignList.reduce((s, c) => s + (Number(c.total_spend) || 0), 0);
      const totalLeadsFromAds = campaignList.reduce((s, c) => s + (Number(c.leads_generated) || 0), 0);
      const totalClicks = campaignList.reduce((s, c) => s + (Number(c.clicks) || 0), 0);
      const totalImpressions = campaignList.reduce((s, c) => s + (Number(c.impressions) || 0), 0);
      const avgCPL = totalLeadsFromAds > 0 ? totalSpend / totalLeadsFromAds : 0;
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Lead source breakdown from actual leads
      const allLeads = [...(leadsBySource.data || []), ...(leadsByPlatform.data || [])];
      const sourceMap: Record<string, number> = {};
      const platformMap: Record<string, number> = {};

      allLeads.forEach((l: any) => {
        const src = l.lead_source_type || l.utm_source || l.source || "Unknown";
        sourceMap[src] = (sourceMap[src] || 0) + 1;
        const plat = l.ad_platform || (l.utm_source === "facebook" ? "meta" : l.utm_source === "google" ? "google" : null);
        if (plat) platformMap[plat] = (platformMap[plat] || 0) + 1;
      });

      const sourceBreakdown = Object.entries(sourceMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const platformBreakdown = Object.entries(platformMap)
        .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
        .sort((a, b) => b.count - a.count);

      // Spend by platform from campaigns
      const spendByPlatform: Record<string, { spend: number; leads: number; clicks: number }> = {};
      campaignList.forEach((c: any) => {
        const p = c.platform || "unknown";
        if (!spendByPlatform[p]) spendByPlatform[p] = { spend: 0, leads: 0, clicks: 0 };
        spendByPlatform[p].spend += Number(c.total_spend) || 0;
        spendByPlatform[p].leads += Number(c.leads_generated) || 0;
        spendByPlatform[p].clicks += Number(c.clicks) || 0;
      });

      const platformSpend = Object.entries(spendByPlatform).map(([platform, d]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        ...d,
        cpl: d.leads > 0 ? d.spend / d.leads : 0,
      }));

      return {
        campaigns: campaignList,
        totalSpend, totalLeadsFromAds, totalClicks, totalImpressions, avgCPL, ctr,
        sourceBreakdown, platformBreakdown, platformSpend,
        totalLeads: allLeads.length,
      };
    },
  });

  const d = data || {
    campaigns: [], totalSpend: 0, totalLeadsFromAds: 0, totalClicks: 0,
    totalImpressions: 0, avgCPL: 0, ctr: 0,
    sourceBreakdown: [], platformBreakdown: [], platformSpend: [],
    totalLeads: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Ad Spend & CAC Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Track ad performance, cost-per-lead, and ROI across platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIOD_MAP).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={IndianRupee} label="Total Ad Spend" value={fmt(d.totalSpend)} color="text-red-500" />
        <KPICard icon={Users} label="Total Leads" value={d.totalLeads.toLocaleString()} color="text-blue-500" />
        <KPICard icon={Target} label="Ad Leads" value={d.totalLeadsFromAds.toLocaleString()} color="text-green-500" />
        <KPICard icon={MousePointerClick} label="Total Clicks" value={d.totalClicks.toLocaleString()} color="text-purple-500" />
        <KPICard icon={Zap} label="Avg CPL" value={fmt(d.avgCPL)} color="text-orange-500" />
        <KPICard icon={BarChart3} label="CTR" value={`${d.ctr.toFixed(2)}%`} color="text-teal-500" />
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="platforms">Platform ROI</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lead Source Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {d.sourceBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={d.sourceBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No lead data for this period</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ad Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {d.platformBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={d.platformBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {d.platformBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No ad platform data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Platform Spend vs Leads (CPL Comparison)</CardTitle>
            </CardHeader>
            <CardContent>
              {d.platformSpend.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={d.platformSpend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(v: number, name: string) => name === "spend" || name === "cpl" ? fmt(v) : v} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="spend" fill="hsl(0 84% 60%)" name="Spend" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="leads" fill="hsl(142 71% 45%)" name="Leads" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="cpl" fill="hsl(38 92% 50%)" name="CPL" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Platform</th>
                          <th className="text-right py-2 px-3">Spend</th>
                          <th className="text-right py-2 px-3">Clicks</th>
                          <th className="text-right py-2 px-3">Leads</th>
                          <th className="text-right py-2 px-3">CPL</th>
                          <th className="text-right py-2 px-3">Conv. Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.platformSpend.map((p) => (
                          <tr key={p.platform} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3 font-medium">{p.platform}</td>
                            <td className="py-2 px-3 text-right">{fmt(p.spend)}</td>
                            <td className="py-2 px-3 text-right">{p.clicks.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right">{p.leads.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-medium">{fmt(p.cpl)}</td>
                            <td className="py-2 px-3 text-right">{p.clicks > 0 ? `${((p.leads / p.clicks) * 100).toFixed(1)}%` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Add campaign data to see platform ROI comparison</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {d.campaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Campaign</th>
                        <th className="text-left py-2 px-3">Platform</th>
                        <th className="text-right py-2 px-3">Spend</th>
                        <th className="text-right py-2 px-3">Impressions</th>
                        <th className="text-right py-2 px-3">Clicks</th>
                        <th className="text-right py-2 px-3">Leads</th>
                        <th className="text-right py-2 px-3">CPL</th>
                        <th className="text-center py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.campaigns.map((c: any) => (
                        <tr key={c.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium max-w-[200px] truncate">{c.campaign_name}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-xs">{c.platform}</Badge>
                          </td>
                          <td className="py-2 px-3 text-right">{fmt(Number(c.total_spend) || 0)}</td>
                          <td className="py-2 px-3 text-right">{(c.impressions || 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right">{(c.clicks || 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium">{(c.leads_generated || 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium">{c.leads_generated > 0 ? fmt(Number(c.total_spend) / c.leads_generated) : "—"}</td>
                          <td className="py-2 px-3 text-center">
                            <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs">
                              {c.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No campaigns tracked yet. Add campaigns to see performance data.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
