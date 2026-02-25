import { useState } from "react";
import { useCrmAccess } from "@/hooks/useCrmAccess";
import { useDashboardMetrics, useExecutivePerformance } from "@/hooks/useCrmCustomers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export default function CrmDashboard() {
  const { crmUser, accessibleVerticals, isSuperAdmin, isAdmin, isManager, isExecutive } = useCrmAccess();
  const [selectedVertical, setSelectedVertical] = useState<string>("");

  const metricsFilters: any = {};
  if (selectedVertical) metricsFilters.vertical_name = selectedVertical;
  if (isExecutive && !isAdmin && !isManager) metricsFilters.assigned_to = crmUser?.user_id;

  const { data: metricsData, isLoading: metricsLoading } = useDashboardMetrics(metricsFilters);
  const { data: perfData, isLoading: perfLoading } = useExecutivePerformance({
    vertical_name: selectedVertical || undefined,
  });

  const metrics = metricsData?.metrics;
  const verticals = metrics?.verticals || {};
  const performance = perfData?.performance || [];

  const roleName = isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : isManager ? "Manager" : "Executive";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {crmUser?.name || "User"} · {roleName}
          </p>
        </div>
        {accessibleVerticals.length > 1 && (
          <Select value={selectedVertical} onValueChange={setSelectedVertical}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Verticals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              {accessibleVerticals.map((v) => (
                <SelectItem key={v} value={v}>{v.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Global Stats */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Calls Today" value={metrics.total_calls_today} warn={metrics.total_calls_today === 0} />
          <StatCard label="Followups Today" value={metrics.followups_scheduled_today} />
          <StatCard
            label="Total Overdue"
            value={Object.values(verticals as Record<string, any>).reduce((sum: number, v: any) => sum + (v.overdue_followups || 0), 0)}
            danger={Object.values(verticals as Record<string, any>).reduce((sum: number, v: any) => sum + (v.overdue_followups || 0), 0) > 10}
          />
          <StatCard
            label="Total Leads"
            value={Object.values(verticals as Record<string, any>).reduce((sum: number, v: any) => sum + (v.total_leads || 0), 0)}
          />
        </div>
      )}

      {metricsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Per-Vertical Cards */}
      {Object.keys(verticals).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Vertical Breakdown</h2>
          {Object.entries(verticals).map(([vName, vData]: [string, any]) => (
            <div key={vName} className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-base">
                {vName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <MiniStat label="Total Leads" value={vData.total_leads} />
                <MiniStat label="Done" value={vData.done_clients} good />
                <MiniStat label="Lost" value={vData.lost_clients} danger={vData.lost_clients > vData.done_clients} />
                <MiniStat label="Overdue" value={vData.overdue_followups} danger={vData.overdue_followups > 10} />
                <MiniStat
                  label="Active"
                  value={vData.total_leads - vData.done_clients - vData.lost_clients}
                />
              </div>

              {/* Stage Breakdown Table */}
              {vData.stage_breakdown && Object.keys(vData.stage_breakdown).length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(vData.stage_breakdown).map(([stage, count]: [string, any]) => (
                      <TableRow key={stage}>
                        <TableCell className="text-sm">{stage}</TableCell>
                        <TableCell className="text-right font-medium">{count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Executive Performance */}
      {(isAdmin || isSuperAdmin || isManager) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Executive Performance</h2>
          {perfLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : performance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No executives found.</p>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">Calls Today</TableHead>
                    <TableHead className="text-right">Final Stage</TableHead>
                    <TableHead className="text-right">Lost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.map((exec: any) => (
                    <TableRow key={exec.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{exec.name}</p>
                          <p className="text-xs text-muted-foreground">{exec.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{exec.assigned_leads}</TableCell>
                      <TableCell className={`text-right font-medium ${exec.overdue_followups > 10 ? "text-red-600" : ""}`}>
                        {exec.overdue_followups}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${exec.calls_today === 0 ? "text-orange-500" : ""}`}>
                        {exec.calls_today}
                      </TableCell>
                      <TableCell className="text-right">{exec.leads_final_stage}</TableCell>
                      <TableCell className={`text-right font-medium ${exec.leads_lost > exec.leads_final_stage ? "text-amber-600" : ""}`}>
                        {exec.leads_lost}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, danger, warn }: { label: string; value: number; danger?: boolean; warn?: boolean }) {
  return (
    <div className={`border rounded-lg p-4 ${danger ? "border-red-400 bg-red-50 dark:bg-red-950/20" : warn ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${danger ? "text-red-600" : warn ? "text-orange-500" : ""}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, danger, good }: { label: string; value: number; danger?: boolean; good?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${danger ? "text-red-600" : good ? "text-green-600" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
