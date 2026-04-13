import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Database, TrendingUp, Download, FileSpreadsheet } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export const DataRoom = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch monthly lead stats
  const { data: leadStats, isLoading: leadsLoading } = useQuery({
    queryKey: ["data-room-leads"],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();
        
        const { count: totalLeads } = await (supabase
          .from("leads") as any)
          .select("id", { count: "exact", head: true })
          .gte("created_at", start)
          .lte("created_at", end);

        const { count: wonLeads } = await (supabase
          .from("leads") as any)
          .select("id", { count: "exact", head: true })
          .gte("created_at", start)
          .lte("created_at", end)
          .eq("lead_status", "won");

        months.push({
          month: format(date, "MMM yy"),
          leads: totalLeads || 0,
          won: wonLeads || 0,
          conversion: totalLeads ? Math.round(((wonLeads || 0) / totalLeads) * 100) : 0,
        });
      }
      return months;
    },
  });

  // Fetch team stats
  const { data: teamStats, isLoading: teamLoading } = useQuery({
    queryKey: ["data-room-team"],
    queryFn: async () => {
      const { count: totalMembers } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const { data: verticals } = await supabase
        .from("business_verticals")
        .select("name, slug")
        .eq("is_active", true);

      return { totalMembers: totalMembers || 0, verticals: verticals || [] };
    },
  });

  const isLoading = leadsLoading || teamLoading;

  const handleExportCSV = () => {
    if (!leadStats) return;
    const csv = ["Month,Total Leads,Won,Conversion %", ...leadStats.map(m => `${m.month},${m.leads},${m.won},${m.conversion}%`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gyc-data-room-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Growth calculation
  const growth = leadStats && leadStats.length >= 2
    ? {
        leadGrowth: leadStats[leadStats.length - 2].leads > 0
          ? Math.round(((leadStats[leadStats.length - 1].leads - leadStats[leadStats.length - 2].leads) / leadStats[leadStats.length - 2].leads) * 100)
          : 0,
        conversionGrowth: leadStats[leadStats.length - 1].conversion - leadStats[leadStats.length - 2].conversion,
      }
    : { leadGrowth: 0, conversionGrowth: 0 };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Database className="h-6 w-6" /> Data Room</h2>
          <p className="text-muted-foreground text-sm">Centralized business data — Super Admin only</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Growth KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{leadStats?.[leadStats.length - 1]?.leads || 0}</div>
          <div className="text-xs text-muted-foreground">This Month Leads</div>
          <Badge variant={growth.leadGrowth >= 0 ? "default" : "destructive"} className="mt-1 text-xs">
            {growth.leadGrowth >= 0 ? "+" : ""}{growth.leadGrowth}% MoM
          </Badge>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{leadStats?.[leadStats.length - 1]?.won || 0}</div>
          <div className="text-xs text-muted-foreground">Won This Month</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{leadStats?.[leadStats.length - 1]?.conversion || 0}%</div>
          <div className="text-xs text-muted-foreground">Conversion Rate</div>
          <Badge variant={growth.conversionGrowth >= 0 ? "default" : "destructive"} className="mt-1 text-xs">
            {growth.conversionGrowth >= 0 ? "+" : ""}{growth.conversionGrowth}pp
          </Badge>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{teamStats?.totalMembers}</div>
          <div className="text-xs text-muted-foreground">Active Team</div>
          <div className="text-xs text-muted-foreground mt-1">{teamStats?.verticals.length} verticals</div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Lead Trends</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle className="text-lg">Monthly Lead Volume (6 months)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leadStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="leads" fill="hsl(var(--primary))" name="Total Leads" radius={[4,4,0,0]} />
                    <Bar dataKey="won" fill="hsl(142, 76%, 36%)" name="Won" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <Card>
            <CardHeader><CardTitle className="text-lg">Conversion Rate Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={leadStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Line type="monotone" dataKey="conversion" stroke="hsl(var(--primary))" strokeWidth={2} name="Conversion %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
