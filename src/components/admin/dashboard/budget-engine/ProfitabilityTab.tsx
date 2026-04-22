import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { CHANNELS, fmt } from "./channelDefaults";

export const ProfitabilityTab = () => {
  const { data: spends = [] } = useQuery({
    queryKey: ["daily-marketing-spend-profit"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("daily_marketing_spend").select("*");
      return data || [];
    },
  });

  // Aggregate per channel
  const byChannel: Record<string, any> = {};
  spends.forEach((s: any) => {
    const k = s.channel;
    if (!byChannel[k]) byChannel[k] = { channel: k, spent: 0, leads: 0, closures: 0, revenue: 0 };
    byChannel[k].spent += Number(s.spent_amount || 0);
    byChannel[k].leads += Number(s.leads_generated || 0);
    byChannel[k].closures += Number(s.closures || 0);
    byChannel[k].revenue += Number(s.revenue || 0);
  });
  const rows = Object.values(byChannel).map((r: any) => ({
    ...r,
    cpl: r.leads > 0 ? r.spent / r.leads : 0,
    cpc: r.closures > 0 ? r.spent / r.closures : 0,
    convRate: r.leads > 0 ? (r.closures / r.leads) * 100 : 0,
    roi: r.spent > 0 ? r.revenue / r.spent : 0,
    profit: r.revenue - r.spent,
  })).sort((a: any, b: any) => b.roi - a.roi);

  const totals = rows.reduce((a: any, r: any) => ({
    spent: a.spent + r.spent, revenue: a.revenue + r.revenue, leads: a.leads + r.leads, closures: a.closures + r.closures
  }), { spent: 0, revenue: 0, leads: 0, closures: 0 });
  const overallROI = totals.spent > 0 ? totals.revenue / totals.spent : 0;
  const netProfit = totals.revenue - totals.spent;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Total Spent</p><p className="text-lg font-bold">{fmt(totals.spent)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Total Revenue</p><p className="text-lg font-bold text-emerald-600">{fmt(totals.revenue)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Net Profit</p><p className={`text-lg font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(netProfit)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Overall ROI</p><p className="text-lg font-bold text-primary">{overallROI.toFixed(2)}x</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Channel Performance & ROI</h3>
          </div>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Log daily spend to see profitability analysis</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="p-2.5">Channel</th>
                  <th className="p-2.5 text-right">Spent</th>
                  <th className="p-2.5 text-right">Leads</th>
                  <th className="p-2.5 text-right">CPL</th>
                  <th className="p-2.5 text-right">Closures</th>
                  <th className="p-2.5 text-right">Conv%</th>
                  <th className="p-2.5 text-right">Revenue</th>
                  <th className="p-2.5 text-right">Profit</th>
                  <th className="p-2.5 text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => {
                  const ch = CHANNELS.find(c => c.value === r.channel);
                  return (
                    <tr key={r.channel} className="border-t border-border hover:bg-muted/30">
                      <td className="p-2.5">{ch?.icon} {ch?.label || r.channel}</td>
                      <td className="p-2.5 text-right">{fmt(r.spent)}</td>
                      <td className="p-2.5 text-right">{r.leads}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{fmt(r.cpl)}</td>
                      <td className="p-2.5 text-right">{r.closures}</td>
                      <td className="p-2.5 text-right">{r.convRate.toFixed(1)}%</td>
                      <td className="p-2.5 text-right text-emerald-600">{fmt(r.revenue)}</td>
                      <td className={`p-2.5 text-right font-medium ${r.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(r.profit)}</td>
                      <td className={`p-2.5 text-right font-bold ${r.roi >= 1 ? "text-emerald-600" : "text-red-600"}`}>{r.roi.toFixed(2)}x</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
