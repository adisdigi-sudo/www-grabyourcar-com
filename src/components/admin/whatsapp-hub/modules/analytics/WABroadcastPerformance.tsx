import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PERIOD_LABEL, PeriodKey, formatNumber, rate, sinceForPeriod } from "./analyticsHelpers";

interface BroadcastRow {
  id: string;
  name: string;
  template_name: string | null;
  status: string | null;
  total_recipients: number | null;
  sent_count: number | null;
  delivered_count: number | null;
  read_count: number | null;
  failed_count: number | null;
  created_at: string;
  completed_at: string | null;
}

export function WABroadcastPerformance() {
  const [period, setPeriod] = useState<PeriodKey>("30d");

  const { data: broadcasts = [], isLoading } = useQuery<BroadcastRow[]>({
    queryKey: ["wa-broadcasts-analytics", period],
    queryFn: async () => {
      const since = sinceForPeriod(period).toISOString();
      const { data } = await supabase
        .from("wa_broadcasts")
        .select("id, name, template_name, status, total_recipients, sent_count, delivered_count, read_count, failed_count, created_at, completed_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      return (data || []) as BroadcastRow[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Broadcast Performance</h2>
          <p className="text-xs text-muted-foreground">Per-campaign delivery, read & failure rates</p>
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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
          ) : broadcasts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No broadcasts in this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Read</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((b) => {
                  const sent = b.sent_count || 0;
                  const total = b.total_recipients || sent || 0;
                  const delivered = b.delivered_count || 0;
                  const read = b.read_count || 0;
                  const failed = b.failed_count || 0;
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.template_name || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{b.status || "draft"}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatNumber(total)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatNumber(sent)}
                        <p className="text-[10px] text-muted-foreground">{rate(sent, total)}%</p>
                      </TableCell>
                      <TableCell className="text-right text-sm text-emerald-600">
                        {formatNumber(delivered)}
                        <p className="text-[10px] text-muted-foreground">{rate(delivered, sent)}%</p>
                      </TableCell>
                      <TableCell className="text-right text-sm text-violet-600">
                        {formatNumber(read)}
                        <p className="text-[10px] text-muted-foreground">{rate(read, sent)}%</p>
                      </TableCell>
                      <TableCell className="text-right text-sm text-destructive">
                        {formatNumber(failed)}
                        <p className="text-[10px] text-muted-foreground">{rate(failed, sent || total)}%</p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}