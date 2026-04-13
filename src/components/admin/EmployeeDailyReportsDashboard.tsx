import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Clock, TrendingUp, Users, Calendar, Search } from "lucide-react";

export function EmployeeDailyReportsDashboard() {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["daily-reports", dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_daily_reports")
        .select("*")
        .eq("report_date", dateFilter)
        .order("performance_score", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = search
    ? reports.filter((r: any) => r.user_name?.toLowerCase().includes(search.toLowerCase()))
    : reports;

  const avgScore = filtered.length
    ? Math.round(filtered.reduce((s: number, r: any) => s + Number(r.performance_score || 0), 0) / filtered.length)
    : 0;
  const totalLeads = filtered.reduce((s: number, r: any) => s + (r.leads_handled || 0), 0);
  const totalOverdue = filtered.reduce((s: number, r: any) => s + (r.tasks_overdue || 0), 0);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Team Performance</h3>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 text-xs pl-7 w-[160px]"
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Input
            type="date"
            className="h-8 text-xs w-[140px]"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl font-bold text-primary">{filtered.length}</p>
          <p className="text-[10px] text-muted-foreground">Members</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{avgScore}%</p>
          <p className="text-[10px] text-muted-foreground">Avg Score</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{totalLeads}</p>
          <p className="text-[10px] text-muted-foreground">Total Leads</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className={`text-2xl font-bold ${totalOverdue > 0 ? "text-destructive" : "text-green-600"}`}>{totalOverdue}</p>
          <p className="text-[10px] text-muted-foreground">Overdue Tasks</p>
        </CardContent></Card>
      </div>

      {/* Individual Reports */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No reports for this date</p>
        ) : (
          filtered.map((r: any) => (
            <Card key={r.id} className="hover:shadow-sm transition-all">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {(r.user_name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.user_name || "Unknown"}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={`text-[9px] py-0 border-0 ${
                            r.performance_score >= 70 ? "bg-green-100 text-green-700"
                            : r.performance_score >= 40 ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.performance_score}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />{r.leads_handled} leads
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />{r.follow_ups_done} follow-ups
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                  <div className="bg-muted/50 rounded px-2 py-1">
                    <p className="text-xs font-semibold text-green-600">✅ {r.tasks_completed}</p>
                    <p className="text-[9px] text-muted-foreground">Done</p>
                  </div>
                  <div className="bg-muted/50 rounded px-2 py-1">
                    <p className="text-xs font-semibold">⏳ {r.tasks_pending}</p>
                    <p className="text-[9px] text-muted-foreground">Pending</p>
                  </div>
                  <div className="bg-muted/50 rounded px-2 py-1">
                    <p className={`text-xs font-semibold ${r.tasks_overdue > 0 ? "text-destructive" : ""}`}>
                      🔴 {r.tasks_overdue}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Overdue</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3 text-green-500" />
                    Active: {formatDuration(r.active_seconds || 0)}
                  </span>
                  <span>Idle: {formatDuration(r.idle_seconds || 0)}</span>
                  <span>Break: {formatDuration(r.break_seconds || 0)}</span>
                </div>

                <Progress
                  value={r.performance_score || 0}
                  className="h-1 mt-2"
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
