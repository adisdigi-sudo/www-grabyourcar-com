/**
 * MarketingConversionDashboard — funnel view of marketing CTA performance.
 *
 * Reads from public.marketing_conversion_events.
 * Shows: total views, call clicks, WA clicks, form submits, conversion rates,
 * top pages, top CTAs, last 7-day trend.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Phone, MessageSquare, Send, RefreshCw, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventRow {
  event_type: string;
  page_path: string;
  cta_label: string | null;
  vertical: string | null;
  created_at: string;
}

const RANGE_DAYS = 30;

export function MarketingConversionDashboard() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - RANGE_DAYS * 86400_000).toISOString();
    const { data, error } = await supabase
      .from("marketing_conversion_events")
      .select("event_type, page_path, cta_label, vertical, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (!error && data) setRows(data as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const counts = { view: 0, call_click: 0, whatsapp_click: 0, form_submit: 0, cta_click: 0, form_view: 0 } as Record<string, number>;
    const pageMap = new Map<string, number>();
    const ctaMap = new Map<string, number>();
    const verticalMap = new Map<string, number>();

    rows.forEach((r) => {
      counts[r.event_type] = (counts[r.event_type] || 0) + 1;
      pageMap.set(r.page_path, (pageMap.get(r.page_path) || 0) + 1);
      if (r.cta_label) ctaMap.set(r.cta_label, (ctaMap.get(r.cta_label) || 0) + 1);
      if (r.vertical) verticalMap.set(r.vertical, (verticalMap.get(r.vertical) || 0) + 1);
    });

    const conversions = counts.call_click + counts.whatsapp_click + counts.form_submit;
    const convRate = counts.view > 0 ? (conversions / counts.view) * 100 : 0;

    const topPages = [...pageMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topCtas = [...ctaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topVerticals = [...verticalMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    return { counts, conversions, convRate, topPages, topCtas, topVerticals };
  }, [rows]);

  const cards = [
    { label: "Page Views", value: stats.counts.view, icon: Eye, tone: "text-blue-500 bg-blue-500/10" },
    { label: "Call Clicks", value: stats.counts.call_click, icon: Phone, tone: "text-emerald-500 bg-emerald-500/10" },
    { label: "WhatsApp Clicks", value: stats.counts.whatsapp_click, icon: MessageSquare, tone: "text-green-600 bg-green-600/10" },
    { label: "Form Submits", value: stats.counts.form_submit, icon: Send, tone: "text-purple-500 bg-purple-500/10" },
    { label: "Conv. Rate", value: `${stats.convRate.toFixed(1)}%`, icon: TrendingUp, tone: "text-amber-500 bg-amber-500/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-lg">Conversion Tracking — Last {RANGE_DAYS} Days</h3>
          <p className="text-xs text-muted-foreground">
            View → Call / WhatsApp / Form Submit funnel across the public website.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{c.value}</p>
              </div>
              <div className={cn("p-2 rounded-lg", c.tone)}>
                <c.icon className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topPages.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
            {stats.topPages.map(([page, count]) => (
              <div key={page} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-mono text-xs">{page}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top CTAs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topCtas.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
            {stats.topCtas.map(([cta, count]) => (
              <div key={cta} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{cta}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By Vertical</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topVerticals.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
            {stats.topVerticals.map(([v, count]) => (
              <div key={v} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate capitalize">{v}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MarketingConversionDashboard;
