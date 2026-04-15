import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TrendingUp, IndianRupee, Send, CheckCheck, Eye, MessageSquare,
  Target, Percent, PieChart, BarChart3, AlertCircle, Zap
} from "lucide-react";
import { format } from "date-fns";

export function WAHubCampaignROI() {
  const { data: campaigns } = useQuery({
    queryKey: ["campaign-roi-data"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_campaigns")
        .select("*")
        .eq("channel", "whatsapp")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: messageLogs } = useQuery({
    queryKey: ["campaign-message-costs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_message_logs")
        .select("status, cost_category, created_at")
        .or("channel.is.null,channel.eq.whatsapp")
        .limit(1000);
      return data || [];
    },
  });

  // Calculate aggregate metrics
  const totalSent = campaigns?.reduce((s, c: any) => s + (c.total_sent || 0), 0) || 0;
  const totalDelivered = campaigns?.reduce((s, c: any) => s + (c.total_delivered || 0), 0) || 0;
  const totalRead = campaigns?.reduce((s, c: any) => s + (c.total_read || 0), 0) || 0;
  const totalFailed = campaigns?.reduce((s, c: any) => s + (c.total_failed || 0), 0) || 0;
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
  
  // Cost estimation (Meta pricing)
  const serviceMsgs = (messageLogs || []).filter((m: any) => m.cost_category === "service").length;
  const utilityMsgs = (messageLogs || []).filter((m: any) => m.cost_category === "utility").length;
  const marketingMsgs = (messageLogs || []).filter((m: any) => m.cost_category === "marketing").length;
  const freeMsgs = (messageLogs || []).filter((m: any) => !m.cost_category || m.cost_category === "service").length;
  const estimatedCost = (utilityMsgs * 0.35) + (marketingMsgs * 0.80);
  const costSaved = freeMsgs * 0.35; // approx saved by using service window

  const kpis = [
    { label: "Total Sent", value: totalSent.toLocaleString(), icon: Send, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Delivered", value: `${deliveryRate}%`, icon: CheckCheck, color: "text-green-500", bg: "bg-green-50" },
    { label: "Read Rate", value: `${readRate}%`, icon: Eye, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Failed", value: totalFailed.toLocaleString(), icon: AlertCircle, color: "text-destructive", bg: "bg-red-50" },
    { label: "Est. Cost", value: `₹${estimatedCost.toFixed(0)}`, icon: IndianRupee, color: "text-violet-500", bg: "bg-violet-50" },
    { label: "Cost Saved", value: `₹${costSaved.toFixed(0)}`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-6 gap-2">
        {kpis.map(k => (
          <Card key={k.label} className="p-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-green-500" />
            <h4 className="text-xs font-semibold">Service (Free)</h4>
          </div>
          <p className="text-2xl font-bold">{serviceMsgs + freeMsgs}</p>
          <p className="text-[10px] text-muted-foreground">Within 24hr window — ₹0</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-amber-500" />
            <h4 className="text-xs font-semibold">Utility</h4>
          </div>
          <p className="text-2xl font-bold">{utilityMsgs}</p>
          <p className="text-[10px] text-muted-foreground">Renewals, bookings — ₹0.35/msg</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="h-4 w-4 text-purple-500" />
            <h4 className="text-xs font-semibold">Marketing</h4>
          </div>
          <p className="text-2xl font-bold">{marketingMsgs}</p>
          <p className="text-[10px] text-muted-foreground">Campaigns, broadcasts — ₹0.80/msg</p>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[45vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Read</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Delivery %</TableHead>
                  <TableHead>Read %</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campaigns || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">No campaigns yet</TableCell>
                  </TableRow>
                ) : (campaigns || []).map((c: any) => {
                  const delRate = (c.total_sent || 0) > 0 ? Math.round(((c.total_delivered || 0) / c.total_sent) * 100) : 0;
                  const rdRate = (c.total_delivered || 0) > 0 ? Math.round(((c.total_read || 0) / c.total_delivered) * 100) : 0;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{c.campaign_type || "broadcast"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={c.status === "completed" ? "default" : c.status === "sending" ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{(c.total_sent || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">{(c.total_delivered || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-blue-600">{(c.total_read || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive">{(c.total_failed || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${delRate}%` }} />
                          </div>
                          <span className="text-[10px] font-mono">{delRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rdRate}%` }} />
                          </div>
                          <span className="text-[10px] font-mono">{rdRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.created_at ? format(new Date(c.created_at), "dd MMM") : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
