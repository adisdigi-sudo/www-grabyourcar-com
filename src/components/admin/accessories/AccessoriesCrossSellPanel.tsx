import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Repeat, TrendingUp, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function AccessoriesCrossSellPanel() {
  const [scanning, setScanning] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["crosssell-stats"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("cross-sell-engine", {
        body: { action: "stats" },
      });
      return res.data || { pending: 0, converted: 0, total: 0 };
    },
  });

  const { data: opportunities } = useQuery({
    queryKey: ["crosssell-opps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cross_sell_opportunities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await supabase.functions.invoke("cross-sell-engine", {
        body: { action: "scan" },
      });
      toast.success(`Scan complete. ${res.data?.total || 0} new opportunities found.`);
      refetch();
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "critical": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "high": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cross-Sell Engine</h1>
        <Button size="sm" onClick={runScan} disabled={scanning}>
          {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Scan Now
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">{stats?.converted || 0}</p>
            <p className="text-xs text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="h-4 w-4" /> Recent Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (opportunities || []).length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No opportunities yet. Run a scan to detect cross-sell leads.</p>
          ) : (
            <div className="space-y-2">
              {(opportunities || []).map((opp: any) => (
                <div key={opp.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{opp.opportunity_type?.replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{opp.suggested_action}</p>
                  </div>
                  <Badge className={`text-[10px] ${priorityColor(opp.priority)}`}>{opp.priority}</Badge>
                  <Badge variant={opp.status === "converted" ? "default" : "outline"} className="text-[10px]">{opp.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
