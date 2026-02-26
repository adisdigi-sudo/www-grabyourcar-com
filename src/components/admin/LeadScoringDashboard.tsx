import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Brain, Users, Target, Zap, RefreshCw, TrendingUp,
  ArrowUpRight, BarChart3, Loader2, Sparkles, Filter,
  UserCheck, UserMinus, UserPlus, Clock,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const SEGMENT_CONFIG = {
  hot_buyer: { label: "🔥 Hot Buyer", color: "hsl(0 84.2% 60.2%)", bg: "bg-red-500/10", text: "text-red-500", icon: Target },
  warm_prospect: { label: "🌤 Warm Prospect", color: "hsl(24.6 95% 53.1%)", bg: "bg-orange-500/10", text: "text-orange-500", icon: TrendingUp },
  nurture: { label: "🌱 Nurture", color: "hsl(217.2 91.2% 59.8%)", bg: "bg-blue-500/10", text: "text-blue-500", icon: Clock },
  cold: { label: "❄️ Cold", color: "hsl(220 8.9% 46.1%)", bg: "bg-gray-500/10", text: "text-gray-500", icon: UserMinus },
  unscored: { label: "❓ Unscored", color: "hsl(280 67% 50%)", bg: "bg-purple-500/10", text: "text-purple-500", icon: Users },
};

export const LeadScoringDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  // Fetch segment summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["leadSegmentSummary"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("lead-scoring", {
        body: { action: "segment-summary" },
      });
      if (error) throw error;
      return data as {
        segments: Record<string, number>;
        sources: Record<string, number>;
        total: number;
      };
    },
  });

  // Fetch scored leads
  const { data: scoredLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ["scoredLeads", selectedSegment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone, source, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Parse AI score from source field and filter/sort
      type ScoredLead = (typeof data)[number] & { ai_score: number | null };
      const scored: ScoredLead[] = (data || []).map((l: any) => {
        return { ...l, ai_score: null };
      });

      let filtered = scored;
      if (selectedSegment === "unscored") {
        filtered = scored.filter(l => l.ai_score === null);
      } else if (selectedSegment) {
        const ranges: Record<string, [number, number]> = {
          hot_buyer: [80, 100], warm_prospect: [50, 79], nurture: [25, 49], cold: [0, 24],
        };
        const [min, max] = ranges[selectedSegment] || [0, 100];
        filtered = scored.filter(l => l.ai_score !== null && l.ai_score >= min && l.ai_score <= max);
      }

      return filtered.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
    },
  });

  // Score leads mutation
  const scoreMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("lead-scoring", {
        body: { action: "score" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Scored ${data.scored} leads with AI`);
      queryClient.invalidateQueries({ queryKey: ["leadSegmentSummary"] });
      queryClient.invalidateQueries({ queryKey: ["scoredLeads"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to score leads");
    },
  });

  const segmentPieData = summary
    ? Object.entries(summary.segments)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name: SEGMENT_CONFIG[key as keyof typeof SEGMENT_CONFIG]?.label || key,
          value,
          fill: SEGMENT_CONFIG[key as keyof typeof SEGMENT_CONFIG]?.color || "hsl(var(--muted))",
        }))
    : [];

  const sourceBarData = summary
    ? Object.entries(summary.sources)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    : [];

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">🔥 {score}</Badge>;
    if (score >= 50) return <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">🌤 {score}</Badge>;
    if (score >= 25) return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">🌱 {score}</Badge>;
    return <Badge variant="outline">❄️ {score}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Lead Scoring & Segmentation
          </h1>
          <p className="text-muted-foreground text-sm">
            AI-powered lead prioritization and smart customer segments
          </p>
        </div>
        <Button
          onClick={() => scoreMutation.mutate()}
          disabled={scoreMutation.isPending}
          className="gap-2"
        >
          {scoreMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {scoreMutation.isPending ? "Scoring..." : "Run AI Scoring"}
        </Button>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(SEGMENT_CONFIG).map(([key, config]) => {
          const count = summary?.segments[key] || 0;
          const Icon = config.icon;
          const isActive = selectedSegment === key;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:shadow-md ${isActive ? "ring-2 ring-primary" : ""} ${config.bg}`}
              onClick={() => setSelectedSegment(isActive ? null : key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${config.text}`} />
                  {isActive && <Filter className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Scored Leads</TabsTrigger>
          <TabsTrigger value="analytics">Segment Analytics</TabsTrigger>
        </TabsList>

        {/* Scored Leads Table */}
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                {selectedSegment
                  ? `${SEGMENT_CONFIG[selectedSegment as keyof typeof SEGMENT_CONFIG]?.label || selectedSegment} Leads`
                  : "All Scored Leads"}
              </CardTitle>
              <CardDescription>
                {scoredLeads?.length || 0} leads • Click segment cards above to filter
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !scoredLeads?.length ? (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">No scored leads yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click "Run AI Scoring" to analyze your leads
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {scoredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{(lead as any).name || "Unknown"}</p>
                          {lead.ai_score !== null && getScoreBadge(lead.ai_score)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{(lead as any).phone}</span>
                          {(lead as any).source && <Badge variant="outline" className="text-[10px]">{(lead as any).source}</Badge>}
                        </div>
                      </div>
                      <div className="shrink-0 ml-3">
                        <div className="w-16">
                          <Progress value={lead.ai_score || 0} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Segment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={segmentPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {segmentPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(217.2 91.2% 59.8%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Scoring Insights */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  AI Scoring Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <Target className="h-5 w-5 text-red-500 mb-2" />
                    <p className="font-bold text-lg">{summary?.segments.hot_buyer || 0}</p>
                    <p className="text-sm font-medium">Hot Buyers</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ready to purchase — prioritize immediate follow-up via WhatsApp
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <UserPlus className="h-5 w-5 text-orange-500 mb-2" />
                    <p className="font-bold text-lg">{summary?.segments.warm_prospect || 0}</p>
                    <p className="text-sm font-medium">Warm Prospects</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      High potential — send personalized offers and test drive invites
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <BarChart3 className="h-5 w-5 text-blue-500 mb-2" />
                    <p className="font-bold text-lg">
                      {summary ? Math.round(((summary.segments.hot_buyer + summary.segments.warm_prospect) / Math.max(summary.total, 1)) * 100) : 0}%
                    </p>
                    <p className="text-sm font-medium">High-Intent Rate</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Percentage of leads with buying intent above 50/100
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
