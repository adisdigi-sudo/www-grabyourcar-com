import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Bot, Target, Users, MessageSquare, TrendingUp } from "lucide-react";

export function WAPerformanceDashboard() {
  const { data: analytics = [] } = useQuery({
    queryKey: ["ai-conversation-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversation_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["wa-conversations-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_conversations")
        .select("id, ai_enabled, human_takeover, intent_detected, status")
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Compute stats
  const totalConversations = analytics.length;
  const leadsCapture = analytics.filter((a: any) => a.lead_captured).length;
  const captureRate = totalConversations > 0 ? ((leadsCapture / totalConversations) * 100).toFixed(1) : "0";

  // Intent distribution
  const intentMap: Record<string, number> = {};
  analytics.forEach((a: any) => {
    const intent = a.intent_detected || "general";
    intentMap[intent] = (intentMap[intent] || 0) + 1;
  });
  const topIntents = Object.entries(intentMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Channel distribution
  const channelMap: Record<string, number> = {};
  analytics.forEach((a: any) => {
    channelMap[a.channel] = (channelMap[a.channel] || 0) + 1;
  });

  const aiActiveConvos = conversations.filter((c: any) => c.ai_enabled && !c.human_takeover).length;
  const humanTakeoverConvos = conversations.filter((c: any) => c.human_takeover).length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total Conversations</span>
            </div>
            <p className="text-2xl font-bold">{totalConversations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Leads Captured</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{leadsCapture}</p>
            <p className="text-xs text-muted-foreground">{captureRate}% capture rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">AI Active</span>
            </div>
            <p className="text-2xl font-bold">{aiActiveConvos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Human Takeover</span>
            </div>
            <p className="text-2xl font-bold">{humanTakeoverConvos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Intent Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Intent Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topIntents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No analytics data yet. Start receiving messages to see intent distribution.</p>
          ) : (
            <div className="space-y-3">
              {topIntents.map(([intent, count]) => {
                const pct = totalConversations > 0 ? (count / totalConversations) * 100 : 0;
                return (
                  <div key={intent} className="flex items-center gap-3">
                    <Badge variant="outline" className="min-w-[120px] justify-center text-xs">{intent}</Badge>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium min-w-[50px] text-right">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Channel Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {Object.entries(channelMap).map(([channel, count]) => (
              <div key={channel} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <Badge variant="secondary">{channel}</Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(channelMap).length === 0 && (
              <p className="text-sm text-muted-foreground">No channel data yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
