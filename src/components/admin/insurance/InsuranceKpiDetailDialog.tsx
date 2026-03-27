import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { normalizeStage as sharedNormalizeStage, type Client } from "./InsuranceLeadPipeline";
import type { PolicyRecord } from "./InsurancePolicyBook";

type KpiType = "total_leads" | "in_pipeline" | "won" | "active_policies" | "conversion" | null;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kpiType: KpiType;
  clients: Client[];
  policies: PolicyRecord[];
  monthWiseConversion: { month: string; total: number; won: number; rate: string; renewals: number; rollovers: number }[];
  monthLabel?: string;
}

function normalizeStage(stage?: string | null, status?: string | null, client?: Pick<Client, "current_policy_number"> | null): string {
  const result = sharedNormalizeStage(stage || null, status || null, client || null);
  // Map policy_issued to won for KPI display
  if (result === "policy_issued") return "won";
  return result;
}

export function InsuranceKpiDetailDialog({ open, onOpenChange, kpiType, clients, policies, monthWiseConversion, monthLabel }: Props) {
  if (!kpiType) return null;

  const titles: Record<string, string> = {
    total_leads: `All Leads${monthLabel ? ` — ${monthLabel}` : ""}`,
    in_pipeline: `In Pipeline${monthLabel ? ` — ${monthLabel}` : ""}`,
    won: `Won / Policy Issued${monthLabel ? ` — ${monthLabel}` : ""}`,
    active_policies: `Active Policies${monthLabel ? ` — ${monthLabel}` : ""}`,
    conversion: "Monthly Conversion Rate",
  };

  const filteredClients = (() => {
    switch (kpiType) {
      case "total_leads": return clients;
      case "in_pipeline": {
        return clients.filter(c => {
          const st = normalizeStage(c.pipeline_stage, c.lead_status, c);
          return st !== "won" && st !== "lost";
        });
      }
      case "won": {
        return clients.filter(c => {
          const st = normalizeStage(c.pipeline_stage, c.lead_status, c);
          return st === "won";
        });
      }
      default: return [];
    }
  })();

  const stageBadgeColor = (stage: string) => {
    const s = stage.toLowerCase();
    if (s.includes("won") || s.includes("issued")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    if (s.includes("lost")) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (s.includes("quoted")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (s.includes("follow")) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{titles[kpiType] || "Details"}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          {/* Conversion month-wise view */}
          {kpiType === "conversion" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-2">Performance breakdown by month — Renewal vs Rollover leads</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Month</th>
                      <th className="text-center px-3 py-2 font-medium">Total</th>
                      <th className="text-center px-3 py-2 font-medium">Won</th>
                      <th className="text-center px-3 py-2 font-medium">Conv %</th>
                      <th className="text-center px-3 py-2 font-medium">Renewals</th>
                      <th className="text-center px-3 py-2 font-medium">Rollovers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthWiseConversion.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No data</td></tr>
                    ) : (
                      monthWiseConversion.map(m => (
                        <tr key={m.month} className="border-t">
                          <td className="px-3 py-2 font-medium">{m.month}</td>
                          <td className="text-center px-3 py-2">{m.total}</td>
                          <td className="text-center px-3 py-2 text-emerald-600 font-semibold">{m.won}</td>
                          <td className="text-center px-3 py-2">
                            <Badge variant="outline" className={cn("text-xs", parseFloat(m.rate) >= 20 ? "border-emerald-500 text-emerald-700" : parseFloat(m.rate) >= 10 ? "border-amber-500 text-amber-700" : "border-red-500 text-red-700")}>
                              {m.rate}%
                            </Badge>
                          </td>
                          <td className="text-center px-3 py-2">{m.renewals}</td>
                          <td className="text-center px-3 py-2">{m.rollovers}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active policies detail */}
          {kpiType === "active_policies" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">{policies.length} active policies</p>
              {policies.map(p => {
                const client = (p as any).insurance_clients;
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">{client?.customer_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{client?.phone || ""} • {client?.vehicle_number || p.policy_number || ""}</p>
                      <p className="text-xs text-muted-foreground">{p.insurer} • {p.policy_type}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="font-semibold text-sm">₹{(p.premium_amount || 0).toLocaleString("en-IN")}</p>
                      {p.expiry_date && <p className="text-xs text-muted-foreground">Exp: {format(new Date(p.expiry_date), "dd MMM yyyy")}</p>}
                      <Badge variant="outline" className="text-[10px]">{p.is_renewal ? "Renewal" : "New"}</Badge>
                    </div>
                  </div>
                );
              })}
              {policies.length === 0 && <p className="text-center py-6 text-muted-foreground">No active policies</p>}
            </div>
          )}

          {/* Won policies detail - show actual policy records */}
          {kpiType === "won" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">{policies.length} won policies{monthLabel ? ` in ${monthLabel}` : ""}</p>
              {policies.map(p => {
                const client = (p as any).insurance_clients;
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">{client?.customer_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{client?.phone || ""} • {client?.vehicle_number || ""}</p>
                      <p className="text-xs text-muted-foreground">{p.insurer || "—"} • {p.policy_type || "—"}</p>
                      {p.policy_number && <p className="text-[10px] font-mono text-muted-foreground">{p.policy_number}</p>}
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="font-semibold text-sm">₹{(p.premium_amount || 0).toLocaleString("en-IN")}</p>
                      {p.start_date && <p className="text-xs text-muted-foreground">Start: {format(new Date(p.start_date), "dd MMM yyyy")}</p>}
                      {p.expiry_date && <p className="text-xs text-muted-foreground">Exp: {format(new Date(p.expiry_date), "dd MMM yyyy")}</p>}
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Won</Badge>
                    </div>
                  </div>
                );
              })}
              {policies.length === 0 && <p className="text-center py-6 text-muted-foreground">No won policies{monthLabel ? ` in ${monthLabel}` : ""}</p>}
            </div>
          )}

          {/* Client lists for total/pipeline */}
          {["total_leads", "in_pipeline"].includes(kpiType) && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">{filteredClients.length} records</p>
              {filteredClients.slice(0, 100).map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="space-y-0.5">
                    <p className="font-medium text-sm">{c.customer_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{c.phone} • {c.vehicle_make} {c.vehicle_model}</p>
                    <p className="text-xs text-muted-foreground">{c.lead_source || "—"} • {c.city || ""}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <Badge className={cn("text-[10px]", stageBadgeColor(c.pipeline_stage || c.lead_status || "new"))}>
                      {(c.pipeline_stage || c.lead_status || "new").replace(/_/g, " ")}
                    </Badge>
                    {c.policy_expiry_date && <p className="text-xs text-muted-foreground">Exp: {format(new Date(c.policy_expiry_date), "dd MMM yyyy")}</p>}
                    {c.quote_amount && <p className="text-xs font-medium">₹{c.quote_amount.toLocaleString("en-IN")}</p>}
                  </div>
                </div>
              ))}
              {filteredClients.length > 100 && <p className="text-xs text-center text-muted-foreground py-2">Showing first 100 of {filteredClients.length}</p>}
              {filteredClients.length === 0 && <p className="text-center py-6 text-muted-foreground">No records</p>}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
