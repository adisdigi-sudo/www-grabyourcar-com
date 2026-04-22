import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, BarChart3 } from "lucide-react";
import { CHANNELS, VERTICALS, fmt } from "./channelDefaults";

export const DailyTrackerTab = () => {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<any>({
    spend_date: format(new Date(), "yyyy-MM-dd"),
    channel: "",
    vertical: "",
    spent_amount: "",
    leads_generated: "",
    closures: "",
    revenue: "",
  });

  const { data: spends = [] } = useQuery({
    queryKey: ["daily-marketing-spend"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("daily_marketing_spend").select("*").order("spend_date", { ascending: false }).limit(60);
      return data || [];
    },
  });

  const addSpend = useMutation({
    mutationFn: async (s: any) => {
      const spent = Number(s.spent_amount);
      const leads = Number(s.leads_generated || 0);
      const cpl = leads > 0 ? spent / leads : 0;
      const { error } = await (supabase.from as any)("daily_marketing_spend").insert({
        spend_date: s.spend_date,
        channel: s.channel,
        vertical: s.vertical || null,
        spent_amount: spent,
        leads_generated: leads,
        closures: Number(s.closures || 0),
        revenue: Number(s.revenue || 0),
        cost_per_lead: cpl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-marketing-spend"] });
      toast.success("Spend logged");
      setShowAdd(false);
      setForm({ spend_date: format(new Date(), "yyyy-MM-dd"), channel: "", vertical: "", spent_amount: "", leads_generated: "", closures: "", revenue: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const todaySpends = spends.filter((s: any) => s.spend_date === today);
  const todaySpent = todaySpends.reduce((s: number, x: any) => s + Number(x.spent_amount || 0), 0);
  const todayLeads = todaySpends.reduce((s: number, x: any) => s + Number(x.leads_generated || 0), 0);
  const todayClosures = todaySpends.reduce((s: number, x: any) => s + Number(x.closures || 0), 0);
  const todayRevenue = todaySpends.reduce((s: number, x: any) => s + Number(x.revenue || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Today Spent</p><p className="text-lg font-bold">{fmt(todaySpent)}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Today Leads</p><p className="text-lg font-bold text-blue-600">{todayLeads}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Today Closures</p><p className="text-lg font-bold text-amber-600">{todayClosures}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[11px] text-muted-foreground">Today Revenue</p><p className="text-lg font-bold text-emerald-600">{fmt(todayRevenue)}</p></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Recent Daily Spend</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Log Spend</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {spends.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No spend logged yet</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Channel</th>
                  <th className="p-2.5">Vertical</th>
                  <th className="p-2.5 text-right">Spent</th>
                  <th className="p-2.5 text-right">Leads</th>
                  <th className="p-2.5 text-right">CPL</th>
                  <th className="p-2.5 text-right">Closures</th>
                  <th className="p-2.5 text-right">Revenue</th>
                  <th className="p-2.5 text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {spends.map((s: any) => {
                  const ch = CHANNELS.find(c => c.value === s.channel);
                  const v = VERTICALS.find(x => x.value === s.vertical);
                  const roi = Number(s.spent_amount) > 0 ? Number(s.revenue) / Number(s.spent_amount) : 0;
                  return (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-2.5">{format(new Date(s.spend_date), "dd MMM")}</td>
                      <td className="p-2.5">{ch?.icon} {ch?.label || s.channel}</td>
                      <td className="p-2.5">{v?.label || "—"}</td>
                      <td className="p-2.5 text-right">{fmt(s.spent_amount)}</td>
                      <td className="p-2.5 text-right">{s.leads_generated}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{fmt(s.cost_per_lead || 0)}</td>
                      <td className="p-2.5 text-right text-amber-600 font-medium">{s.closures}</td>
                      <td className="p-2.5 text-right text-emerald-600 font-medium">{fmt(s.revenue)}</td>
                      <td className={`p-2.5 text-right font-bold ${roi >= 1 ? "text-emerald-600" : "text-red-600"}`}>{roi.toFixed(1)}x</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Daily Spend</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.spend_date} onChange={e => setForm((p: any) => ({ ...p, spend_date: e.target.value }))} /></div>
              <div><Label>Channel *</Label>
                <Select value={form.channel} onValueChange={v => setForm((p: any) => ({ ...p, channel: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Vertical</Label>
              <Select value={form.vertical} onValueChange={v => setForm((p: any) => ({ ...p, vertical: v }))}>
                <SelectTrigger><SelectValue placeholder="All verticals" /></SelectTrigger>
                <SelectContent>{VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Spent (₹) *</Label><Input type="number" value={form.spent_amount} onChange={e => setForm((p: any) => ({ ...p, spent_amount: e.target.value }))} /></div>
              <div><Label>Leads</Label><Input type="number" value={form.leads_generated} onChange={e => setForm((p: any) => ({ ...p, leads_generated: e.target.value }))} /></div>
              <div><Label>Closures</Label><Input type="number" value={form.closures} onChange={e => setForm((p: any) => ({ ...p, closures: e.target.value }))} /></div>
              <div><Label>Revenue (₹)</Label><Input type="number" value={form.revenue} onChange={e => setForm((p: any) => ({ ...p, revenue: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addSpend.mutate(form)} disabled={!form.channel || !form.spent_amount}>Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
