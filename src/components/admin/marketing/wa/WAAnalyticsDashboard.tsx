import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Send, CheckCircle, Eye, Reply, XCircle, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function WAAnalyticsDashboard() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [period, setPeriod] = useState("7d");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchAnalytics(); }, [period]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    const daysAgo = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - daysAgo);

    const { data } = await supabase
      .from("wa_campaigns")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (data) setCampaigns(data);
    setIsLoading(false);
  };

  const totals = campaigns.reduce((acc, c) => ({
    sent: acc.sent + (c.total_sent || 0),
    delivered: acc.delivered + (c.total_delivered || 0),
    read: acc.read + (c.total_read || 0),
    replied: acc.replied + (c.total_replied || 0),
    failed: acc.failed + (c.total_failed || 0),
    optedOut: acc.optedOut + (c.total_opted_out || 0),
  }), { sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, optedOut: 0 });

  const rate = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0;

  const metrics = [
    { label: "Total Sent", value: totals.sent, icon: Send, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Delivered", value: totals.delivered, rate: `${rate(totals.delivered, totals.sent)}%`, icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Read", value: totals.read, rate: `${rate(totals.read, totals.sent)}%`, icon: Eye, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { label: "Replied", value: totals.replied, rate: `${rate(totals.replied, totals.sent)}%`, icon: Reply, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { label: "Failed", value: totals.failed, rate: `${rate(totals.failed, totals.sent)}%`, icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
    { label: "Opt-Outs", value: totals.optedOut, icon: Ban, color: "text-muted-foreground", bgColor: "bg-muted" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Campaign Analytics</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className={cn("p-1.5 rounded-lg w-fit mb-2", m.bgColor)}>
                <m.icon className={cn("h-4 w-4", m.color)} />
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                {m.rate && <Badge variant="secondary" className="text-[10px]">{m.rate}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Campaign Performance</CardTitle></CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No campaigns in selected period</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => {
                const deliveryRate = rate(c.total_delivered, c.total_sent);
                const readRate = rate(c.total_read, c.total_sent);
                const replyRate = rate(c.total_replied, c.total_sent);
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold">{c.total_sent}</p>
                        <p className="text-[10px] text-muted-foreground">Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-green-600">{deliveryRate}%</p>
                        <p className="text-[10px] text-muted-foreground">Delivery</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-purple-600">{readRate}%</p>
                        <p className="text-[10px] text-muted-foreground">Read</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-orange-600">{replyRate}%</p>
                        <p className="text-[10px] text-muted-foreground">Reply</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
