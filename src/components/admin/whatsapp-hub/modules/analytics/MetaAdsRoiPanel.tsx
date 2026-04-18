import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Plus, Trash2, AlertTriangle, IndianRupee, MousePointerClick, Eye, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PERIOD_LABEL, PeriodKey, formatCurrency, formatNumber, sinceForPeriod } from "./analyticsHelpers";

interface MetaConfig {
  id: string;
  account_label: string;
  ad_account_id: string;
  is_active: boolean;
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

interface MetaMetric {
  campaign_id: string | null;
  campaign_name: string | null;
  level: string;
  metric_date: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  leads: number;
}

export function MetaAdsRoiPanel() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", ad_account_id: "", access_token: "" });

  const { data: configs = [] } = useQuery<MetaConfig[]>({
    queryKey: ["meta-ads-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("meta_ads_config")
        .select("id, account_label, ad_account_id, is_active, last_synced_at, last_sync_status, last_sync_error")
        .order("created_at");
      return (data || []) as MetaConfig[];
    },
  });

  const { data: metrics = [], isLoading: metricsLoading } = useQuery<MetaMetric[]>({
    queryKey: ["meta-ads-metrics", period],
    queryFn: async () => {
      const since = sinceForPeriod(period).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("meta_ads_daily_metrics")
        .select("campaign_id, campaign_name, level, metric_date, impressions, reach, clicks, spend, leads")
        .eq("level", "campaign")
        .gte("metric_date", since)
        .order("metric_date", { ascending: false });
      return (data || []) as MetaMetric[];
    },
  });

  const { data: leadsCount = 0 } = useQuery({
    queryKey: ["meta-leads-count", period],
    queryFn: async () => {
      const since = sinceForPeriod(period).toISOString();
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .or("source.ilike.%meta%,source.ilike.%facebook%,source.ilike.%instagram%,utm_source.ilike.%fb%,utm_source.ilike.%meta%");
      return count || 0;
    },
  });

  const { data: revenueRow } = useQuery({
    queryKey: ["meta-revenue", period],
    queryFn: async () => {
      const since = sinceForPeriod(period).toISOString();
      const { data } = await supabase
        .from("deals")
        .select("deal_value, payment_received_amount, source")
        .eq("payment_status", "received")
        .gte("closed_at", since);
      const total = (data || []).reduce(
        (sum, d: any) => sum + Number(d.payment_received_amount || d.deal_value || 0),
        0,
      );
      const closedDeals = (data || []).length;
      return { total, closedDeals };
    },
  });

  const totals = useMemo(() => {
    const t = { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0 };
    for (const m of metrics) {
      t.spend += Number(m.spend || 0);
      t.impressions += m.impressions || 0;
      t.reach += m.reach || 0;
      t.clicks += m.clicks || 0;
      t.leads += m.leads || 0;
    }
    return t;
  }, [metrics]);

  const cpl = leadsCount > 0 ? totals.spend / leadsCount : 0;
  const cac = revenueRow?.closedDeals && revenueRow.closedDeals > 0 ? totals.spend / revenueRow.closedDeals : 0;
  const roas = totals.spend > 0 && revenueRow?.total ? revenueRow.total / totals.spend : 0;

  const campaignAgg = useMemo(() => {
    const map = new Map<string, { name: string; spend: number; impressions: number; clicks: number; leads: number }>();
    for (const m of metrics) {
      const key = m.campaign_id || m.campaign_name || "unknown";
      const e = map.get(key) || { name: m.campaign_name || key, spend: 0, impressions: 0, clicks: 0, leads: 0 };
      e.spend += Number(m.spend || 0);
      e.impressions += m.impressions || 0;
      e.clicks += m.clicks || 0;
      e.leads += m.leads || 0;
      map.set(key, e);
    }
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }, [metrics]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-ads-sync", {
        body: { days: 30 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(data?.ok ? "Meta sync complete" : data?.message || "Sync finished");
      qc.invalidateQueries({ queryKey: ["meta-ads-config"] });
      qc.invalidateQueries({ queryKey: ["meta-ads-metrics"] });
    },
    onError: (err: any) => toast.error(err?.message || "Sync failed"),
  });

  const addConfig = useMutation({
    mutationFn: async () => {
      if (!form.label || !form.ad_account_id) throw new Error("Account label & ID required");
      const { error } = await supabase.from("meta_ads_config").insert({
        account_label: form.label,
        ad_account_id: form.ad_account_id,
        access_token: form.access_token || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account added");
      setAdding(false);
      setForm({ label: "", ad_account_id: "", access_token: "" });
      qc.invalidateQueries({ queryKey: ["meta-ads-config"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add"),
  });

  const toggleActive = async (cfg: MetaConfig, value: boolean) => {
    await supabase.from("meta_ads_config").update({ is_active: value }).eq("id", cfg.id);
    qc.invalidateQueries({ queryKey: ["meta-ads-config"] });
  };

  const removeConfig = async (id: string) => {
    if (!confirm("Remove this Meta ad account configuration?")) return;
    await supabase.from("meta_ads_config").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["meta-ads-config"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Meta Ads spend & ROI</h2>
          <p className="text-xs text-muted-foreground">Real-time spend, leads & ROAS — synced from Meta Marketing API</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => (
                <SelectItem key={k} value={k} className="text-xs">{PERIOD_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="h-8 text-xs gap-1.5">
            {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sync now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Spend" value={formatCurrency(totals.spend)} icon={IndianRupee} tone="text-emerald-600" bg="bg-emerald-500/10" />
        <KpiCard label="Impressions" value={formatNumber(totals.impressions)} icon={Eye} tone="text-blue-500" bg="bg-blue-500/10" />
        <KpiCard label="Reach" value={formatNumber(totals.reach)} icon={Users} tone="text-violet-500" bg="bg-violet-500/10" />
        <KpiCard label="Clicks" value={formatNumber(totals.clicks)} icon={MousePointerClick} tone="text-orange-500" bg="bg-orange-500/10" />
        <KpiCard label="CPL" value={cpl > 0 ? formatCurrency(cpl) : "—"} icon={IndianRupee} tone="text-foreground" bg="bg-muted/40" sub={`${formatNumber(leadsCount)} leads`} />
        <KpiCard label="CAC / ROAS" value={cac > 0 ? formatCurrency(cac) : "—"} icon={IndianRupee} tone="text-foreground" bg="bg-muted/40" sub={roas > 0 ? `${roas.toFixed(2)}x ROAS` : `${revenueRow?.closedDeals || 0} deals`} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-3 border-b">
            <p className="text-sm font-semibold">Campaigns</p>
          </div>
          {metricsLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
          ) : campaignAgg.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No spend data yet — add an account & hit Sync.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignAgg.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell className="text-sm">{c.name}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(c.spend)}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(c.impressions)}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(c.clicks)}</TableCell>
                    <TableCell className="text-right text-sm">{formatNumber(c.leads)}</TableCell>
                    <TableCell className="text-right text-sm">{c.leads > 0 ? formatCurrency(c.spend / c.leads) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Connected ad accounts</p>
              <p className="text-xs text-muted-foreground">Add your Meta ad account ID + system user token to fetch live insights</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setAdding((v) => !v)}>
              <Plus className="h-3.5 w-3.5" /> Add account
            </Button>
          </div>

          {adding && (
            <div className="rounded-md border p-3 space-y-2 bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input className="h-8 text-sm" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="GYC India" />
                </div>
                <div>
                  <Label className="text-xs">Ad Account ID</Label>
                  <Input className="h-8 text-sm" value={form.ad_account_id} onChange={(e) => setForm((f) => ({ ...f, ad_account_id: e.target.value }))} placeholder="act_1234567890" />
                </div>
                <div>
                  <Label className="text-xs">Access Token</Label>
                  <Input type="password" className="h-8 text-sm" value={form.access_token} onChange={(e) => setForm((f) => ({ ...f, access_token: e.target.value }))} placeholder="EAAB…" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                <Button size="sm" onClick={() => addConfig.mutate()} disabled={addConfig.isPending}>Save</Button>
              </div>
            </div>
          )}

          {configs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No accounts yet.</p>
          ) : (
            <div className="space-y-2">
              {configs.map((cfg) => (
                <div key={cfg.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{cfg.account_label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{cfg.ad_account_id}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {cfg.last_sync_status === "ok" && <Badge variant="secondary" className="text-[10px]">synced {cfg.last_synced_at ? new Date(cfg.last_synced_at).toLocaleString() : ""}</Badge>}
                      {cfg.last_sync_status === "failed" && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="h-3 w-3" /> {cfg.last_sync_error?.slice(0, 60) || "failed"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={cfg.is_active} onCheckedChange={(v) => toggleActive(cfg, v)} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeConfig(cfg.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  bg,
  sub,
}: {
  label: string;
  value: string;
  icon: any;
  tone: string;
  bg: string;
  sub?: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-3">
        <div className={`p-1.5 rounded-md w-fit mb-2 ${bg}`}>
          <Icon className={`h-3.5 w-3.5 ${tone}`} />
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}{sub ? ` · ${sub}` : ""}</p>
      </CardContent>
    </Card>
  );
}