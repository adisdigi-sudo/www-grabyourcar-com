import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Filter, TrendingUp, IndianRupee } from "lucide-react";
import { format, subDays } from "date-fns";
import { useRealtimeTable } from "@/hooks/useRealtimeSync";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

type DateRange = "today" | "7d" | "30d" | "90d";

const DATE_RANGES: Record<DateRange, { label: string; days: number }> = {
  today: { label: "Today", days: 1 },
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
};

export function LiveDealsAttribution() {
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  useRealtimeTable("deals", ["live-deals-attribution"]);

  const { from, to } = useMemo(() => {
    const now = new Date();
    const days = DATE_RANGES[dateRange].days;
    return { from: subDays(now, days - 1), to: now };
  }, [dateRange]);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["live-deals-attribution", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id,deal_number,vertical_name,deal_value,payment_received_amount,payment_status,deal_status,closed_at,created_at,assigned_to,source,customer_id,lead_id")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Lookup customer names
  const customerIds = useMemo(
    () => Array.from(new Set(deals.map((d: any) => d.customer_id).filter(Boolean))),
    [deals],
  );

  const { data: customers = [] } = useQuery({
    queryKey: ["live-deals-customers", customerIds.join(",")],
    queryFn: async () => {
      if (customerIds.length === 0) return [] as any[];
      const { data } = await (supabase as any)
        .from("customers")
        .select("id,name,phone,source")
        .in("id", customerIds);
      return (data || []) as any[];
    },
    enabled: customerIds.length > 0,
  });

  const customerMap = useMemo(() => {
    const m = new Map<string, any>();
    customers.forEach((c: any) => m.set(c.id, c));
    return m;
  }, [customers]);

  const verticals = useMemo(() => {
    return Array.from(new Set(deals.map((d: any) => d.vertical_name).filter(Boolean))) as string[];
  }, [deals]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    deals.forEach((d: any) => {
      if (d.source) set.add(d.source);
      const cust = customerMap.get(d.customer_id);
      if (cust?.source) set.add(cust.source);
    });
    return Array.from(set);
  }, [deals, customerMap]);

  const filtered = useMemo(() => {
    return deals.filter((d: any) => {
      if (verticalFilter !== "all" && d.vertical_name !== verticalFilter) return false;
      if (sourceFilter !== "all") {
        const dealSource = d.source || customerMap.get(d.customer_id)?.source;
        if (dealSource !== sourceFilter) return false;
      }
      return true;
    });
  }, [deals, verticalFilter, sourceFilter, customerMap]);

  const stats = useMemo(() => {
    const totalValue = filtered.reduce((s: number, d: any) => s + Number(d.deal_value || 0), 0);
    const totalReceived = filtered.reduce((s: number, d: any) => s + Number(d.payment_received_amount || 0), 0);
    const closed = filtered.filter((d: any) => d.payment_status === "received").length;
    return { totalValue, totalReceived, closed, count: filtered.length };
  }, [filtered]);

  const sourceBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    filtered.forEach((d: any) => {
      const src = d.source || customerMap.get(d.customer_id)?.source || "Direct";
      const cur = map.get(src) || { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(d.payment_received_amount || d.deal_value || 0);
      map.set(src, cur);
    });
    return Array.from(map.entries())
      .map(([src, v]) => ({ source: src, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered, customerMap]);

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Live Deals Attribution
            <Badge variant="outline" className="ml-1 text-xs">
              {filtered.length} deals
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATE_RANGES).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={verticalFilter} onValueChange={setVerticalFilter}>
              <SelectTrigger className="h-8 text-xs w-36">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Vertical" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Verticals</SelectItem>
                {verticals.map((v) => (
                  <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Total Deals</p>
              <p className="text-lg font-bold">{stats.count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Closed</p>
              <p className="text-lg font-bold text-green-600">{stats.closed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Pipeline Value</p>
              <p className="text-lg font-bold">{formatINR(stats.totalValue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/30">
            <CardContent className="p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Revenue Received</p>
              <p className="text-lg font-bold text-green-700">{formatINR(stats.totalReceived)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Source attribution breakdown */}
        {sourceBreakdown.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
              <TrendingUp className="h-3.5 w-3.5" /> Source Attribution
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {sourceBreakdown.slice(0, 8).map((s) => (
                <div key={s.source} className="border rounded-lg p-2">
                  <p className="text-xs font-medium truncate" title={s.source}>{s.source}</p>
                  <p className="text-sm font-bold text-primary">{formatINR(s.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{s.count} deal{s.count === 1 ? "" : "s"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deals list */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
            <IndianRupee className="h-3.5 w-3.5" /> Recent Deals
          </h4>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
              <p className="text-sm text-muted-foreground">No deals match the current filters</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {filtered.slice(0, 50).map((d: any) => {
                const cust = customerMap.get(d.customer_id);
                const src = d.source || cust?.source || "Direct";
                return (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{d.deal_number || d.id.slice(0, 6)}</span>
                        {d.vertical_name && (
                          <Badge variant="outline" className="text-[10px] py-0">{d.vertical_name}</Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 ${
                            d.payment_status === "received"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : d.payment_status === "partial"
                                ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {d.payment_status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] py-0">📍 {src}</Badge>
                      </div>
                      <p className="text-xs mt-0.5 truncate">
                        {cust?.name || "Customer"} {cust?.phone ? `· ${cust.phone}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatINR(Number(d.payment_received_amount || d.deal_value || 0))}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(d.created_at), "dd MMM, HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })}
              {filtered.length > 50 && (
                <p className="text-[11px] text-center text-muted-foreground pt-2">
                  Showing 50 of {filtered.length} deals — refine filters to narrow down
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
