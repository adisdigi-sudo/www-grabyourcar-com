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
import { Progress } from "@/components/ui/progress";
import { Plus, Target } from "lucide-react";
import { VERTICALS, fmt } from "./channelDefaults";

export const TargetsTab = () => {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ vertical_name: "", month_year: format(new Date(), "yyyy-MM"), target_leads: "", target_closures: "", target_revenue: "" });

  const { data: targets = [] } = useQuery({
    queryKey: ["vertical-targets"],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("vertical_targets").select("*").order("month_year", { ascending: false });
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await (supabase.from as any)("vertical_targets").upsert({
        vertical_name: t.vertical_name,
        month_year: t.month_year,
        target_leads: Number(t.target_leads || 0),
        target_closures: Number(t.target_closures || 0),
        target_revenue: Number(t.target_revenue || 0),
      }, { onConflict: "vertical_name,month_year" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vertical-targets"] }); toast.success("Target set"); setShow(false); setForm({ vertical_name: "", month_year: format(new Date(), "yyyy-MM"), target_leads: "", target_closures: "", target_revenue: "" }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Vertical Targets</h3>
        <Button size="sm" onClick={() => setShow(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Set Target</Button>
      </div>

      {targets.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">No targets set yet</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {targets.map((t: any) => {
            const v = VERTICALS.find(x => x.value === t.vertical_name);
            const leadPct = Number(t.target_leads) > 0 ? (Number(t.achieved_leads) / Number(t.target_leads)) * 100 : 0;
            const closurePct = Number(t.target_closures) > 0 ? (Number(t.achieved_closures) / Number(t.target_closures)) * 100 : 0;
            const revPct = Number(t.target_revenue) > 0 ? (Number(t.achieved_revenue) / Number(t.target_revenue)) * 100 : 0;
            return (
              <Card key={t.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{v?.label || t.vertical_name}</p>
                    <span className="text-[10px] text-muted-foreground">{t.month_year}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between mb-1"><span className="text-muted-foreground">Leads</span><span>{t.achieved_leads}/{t.target_leads}</span></div>
                      <Progress value={Math.min(leadPct, 100)} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><span className="text-muted-foreground">Closures</span><span>{t.achieved_closures}/{t.target_closures}</span></div>
                      <Progress value={Math.min(closurePct, 100)} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1"><span className="text-muted-foreground">Revenue</span><span>{fmt(t.achieved_revenue)}/{fmt(t.target_revenue)}</span></div>
                      <Progress value={Math.min(revPct, 100)} className="h-1.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={show} onOpenChange={setShow}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Vertical Target</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vertical *</Label>
                <Select value={form.vertical_name} onValueChange={v => setForm((p: any) => ({ ...p, vertical_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Month</Label><Input type="month" value={form.month_year} onChange={e => setForm((p: any) => ({ ...p, month_year: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Target Leads</Label><Input type="number" value={form.target_leads} onChange={e => setForm((p: any) => ({ ...p, target_leads: e.target.value }))} /></div>
              <div><Label>Target Closures</Label><Input type="number" value={form.target_closures} onChange={e => setForm((p: any) => ({ ...p, target_closures: e.target.value }))} /></div>
              <div><Label>Target Revenue (₹)</Label><Input type="number" value={form.target_revenue} onChange={e => setForm((p: any) => ({ ...p, target_revenue: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow(false)}>Cancel</Button>
            <Button onClick={() => upsert.mutate(form)} disabled={!form.vertical_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
