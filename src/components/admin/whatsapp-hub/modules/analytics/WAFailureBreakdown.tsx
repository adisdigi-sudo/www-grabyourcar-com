import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { PERIOD_LABEL, PeriodKey, formatNumber, sinceForPeriod } from "./analyticsHelpers";

interface FailureRow {
  error_message: string | null;
  failed_at: string | null;
  template_name: string | null;
}

interface FailureCode {
  code: number;
  title: string;
  description: string | null;
  category: string | null;
  user_action: string | null;
}

const extractCode = (msg: string | null): number | null => {
  if (!msg) return null;
  const m = msg.match(/(\d{3,6})/);
  return m ? Number(m[1]) : null;
};

export function WAFailureBreakdown() {
  const [period, setPeriod] = useState<PeriodKey>("30d");

  const { data: failures = [], isLoading } = useQuery<FailureRow[]>({
    queryKey: ["wa-failures", period],
    queryFn: async () => {
      const since = sinceForPeriod(period).toISOString();
      const { data } = await supabase
        .from("wa_message_logs")
        .select("error_message, failed_at, template_name")
        .eq("status", "failed")
        .gte("created_at", since)
        .limit(20000);
      return (data || []) as FailureRow[];
    },
  });

  const { data: codes = [] } = useQuery<FailureCode[]>({
    queryKey: ["wa-failure-codes"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_failure_codes").select("*");
      return (data || []) as FailureCode[];
    },
    staleTime: 5 * 60_000,
  });

  const codeMap = useMemo(() => new Map(codes.map((c) => [c.code, c])), [codes]);

  const grouped = useMemo(() => {
    const m = new Map<string, { count: number; reason: string; sample: string; meta?: FailureCode }>();
    for (const f of failures) {
      const code = extractCode(f.error_message);
      const key = code ? String(code) : (f.error_message || "Unknown").slice(0, 80);
      const meta = code ? codeMap.get(code) : undefined;
      const entry = m.get(key);
      if (entry) {
        entry.count++;
      } else {
        m.set(key, {
          count: 1,
          reason: meta?.title || (code ? `Meta error ${code}` : "Unknown failure"),
          sample: f.error_message || "—",
          meta,
        });
      }
    }
    return Array.from(m.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [failures, codeMap]);

  const total = failures.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Failure Reasons</h2>
          <p className="text-xs text-muted-foreground">Why messages are failing — grouped by Meta error code</p>
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
        <CardContent className="p-3">
          <p className="text-2xl font-bold">{formatNumber(total)}</p>
          <p className="text-xs text-muted-foreground">total failed messages in period</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
          ) : grouped.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No failures 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Recommended action</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((g) => (
                  <TableRow key={g.key}>
                    <TableCell>
                      <p className="text-sm font-medium">{g.reason}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{g.meta?.description || g.sample}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {g.meta?.category || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {g.meta?.user_action || "Investigate via WA Cloud logs."}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatNumber(g.count)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {total > 0 ? `${Math.round((g.count / total) * 1000) / 10}%` : "0%"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}