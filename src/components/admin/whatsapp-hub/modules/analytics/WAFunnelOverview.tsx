import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, CheckCheck, Eye, Reply, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PERIOD_LABEL, PeriodKey, formatNumber, rate, sinceForPeriod } from "./analyticsHelpers";

interface FunnelRow {
  status: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
  failed_at: string | null;
}

export function WAFunnelOverview() {
  const [period, setPeriod] = useState<PeriodKey>("7d");

  const { data: rows = [], isLoading } = useQuery<FunnelRow[]>({
    queryKey: ["wa-funnel", period],
    queryFn: async () => {
      const since = sinceForPeriod(period).toISOString();
      const { data } = await supabase
        .from("wa_message_logs")
        .select("status, created_at, sent_at, delivered_at, read_at, replied_at, failed_at")
        .gte("created_at", since)
        .limit(20000);
      return (data || []) as FunnelRow[];
    },
  });

  const totals = useMemo(() => {
    const t = { total: rows.length, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, queued: 0 };
    for (const r of rows) {
      if (r.failed_at || r.status === "failed") t.failed++;
      else if (r.replied_at) t.replied++;
      if (r.sent_at) t.sent++;
      if (r.delivered_at) t.delivered++;
      if (r.read_at) t.read++;
      if (!r.sent_at && !r.failed_at) t.queued++;
    }
    return t;
  }, [rows]);

  const denominator = totals.sent || totals.total;

  const cards = [
    { label: "Total", value: totals.total, icon: Send, tone: "text-foreground", bg: "bg-muted/40" },
    { label: "Sent", value: totals.sent, sub: `${rate(totals.sent, totals.total)}%`, icon: Send, tone: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Delivered", value: totals.delivered, sub: `${rate(totals.delivered, denominator)}%`, icon: CheckCheck, tone: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Read", value: totals.read, sub: `${rate(totals.read, denominator)}%`, icon: Eye, tone: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Replied", value: totals.replied, sub: `${rate(totals.replied, denominator)}%`, icon: Reply, tone: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Failed", value: totals.failed, sub: `${rate(totals.failed, totals.total)}%`, icon: XCircle, tone: "text-destructive", bg: "bg-destructive/10" },
    { label: "Queued", value: totals.queued, icon: Clock, tone: "text-muted-foreground", bg: "bg-muted" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">WhatsApp Funnel</h2>
          <p className="text-xs text-muted-foreground">Real-time send → delivered → read → reply → fail breakdown</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => (
              <SelectItem key={k} value={k} className="text-xs">{PERIOD_LABEL[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60">
            <CardContent className="p-3">
              <div className={cn("p-1.5 rounded-md w-fit mb-2", c.bg)}>
                <c.icon className={cn("h-3.5 w-3.5", c.tone)} />
              </div>
              <p className="text-xl font-bold">{isLoading ? "—" : formatNumber(c.value)}</p>
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11px] text-muted-foreground">{c.label}</p>
                {c.sub && <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{c.sub}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversion funnel</p>
          {[
            { label: "Sent", val: totals.sent, max: totals.total || 1, color: "bg-blue-500" },
            { label: "Delivered", val: totals.delivered, max: totals.sent || 1, color: "bg-emerald-500" },
            { label: "Read", val: totals.read, max: totals.delivered || totals.sent || 1, color: "bg-violet-500" },
            { label: "Replied", val: totals.replied, max: totals.read || totals.sent || 1, color: "bg-orange-500" },
          ].map((step) => (
            <div key={step.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{step.label}</span>
                <span className="font-semibold">{formatNumber(step.val)} <span className="text-muted-foreground font-normal">({rate(step.val, step.max)}%)</span></span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full", step.color)} style={{ width: `${Math.min(100, rate(step.val, step.max))}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}