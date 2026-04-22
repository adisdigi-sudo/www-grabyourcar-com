/**
 * LiveTeamPerformance — Founder-grade real-time team scoreboard.
 *
 * Pulls live data from:
 *   • team_members (HR roster) + crm_users (auth-linked CRM users)
 *   • leads (assigned_to, status, last_contacted_at)
 *   • deals (assigned_to, deal_value, payment_status, vertical)
 *   • insurance_clients (assigned_executive, lead_status, current_premium)
 *   • payment_received (collected_by → revenue collected)
 *
 * Renders a per-member scoreboard with totals, plus a per-vertical breakdown
 * and a grand-total row so the founder sees accurate, detailed performance.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Users, TrendingUp, IndianRupee, CheckCircle2, Phone, Trophy,
  Search, RefreshCw, Briefcase, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfMonth } from "date-fns";

type RangeKey = "7d" | "30d" | "mtd" | "90d" | "ytd";

interface Member {
  id: string;            // canonical key (team_members.user_id || crm_users.auth_user_id || crm_users.id)
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  role?: string;
  authIds: string[];     // ids that may appear in assigned_to columns
  assignedKeys: string[]; // string variants of authIds for text-based assigned_to fields
}

interface MemberStats {
  member: Member;
  totalLeads: number;
  contactedLeads: number;
  hotLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalDeals: number;
  closedDeals: number;
  pipelineValue: number;
  closedValue: number;
  collectedValue: number;
  insurancePolicies: number;
  insurancePremium: number;
  conversionRate: number;
  followUpRate: number;
  byVertical: Record<string, { deals: number; value: number }>;
}

const fmtINR = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

const RANGES: { id: RangeKey; label: string }[] = [
  { id: "7d", label: "Last 7d" },
  { id: "30d", label: "Last 30d" },
  { id: "mtd", label: "Month to date" },
  { id: "90d", label: "Last 90d" },
  { id: "ytd", label: "Year to date" },
];

const rangeFrom = (key: RangeKey): Date => {
  const now = new Date();
  if (key === "7d") return subDays(now, 7);
  if (key === "30d") return subDays(now, 30);
  if (key === "90d") return subDays(now, 90);
  if (key === "mtd") return startOfMonth(now);
  return new Date(now.getFullYear(), 0, 1);
};

export const LiveTeamPerformance = () => {
  const [range, setRange] = useState<RangeKey>("30d");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const fromDate = rangeFrom(range);
  const fromIso = fromDate.toISOString();

  // ── Roster: merge team_members + crm_users so EVERY active employee shows up ──
  const rosterQuery = useQuery({
    queryKey: ["founder-team-roster"],
    queryFn: async () => {
      const [tmRes, cuRes, rolesRes] = await Promise.all([
        supabase
          .from("team_members")
          .select("id, user_id, display_name, username, phone, designation, department, is_active")
          .eq("is_active", true),
        supabase
          .from("crm_users")
          .select("id, auth_user_id, name, email, role, is_active")
          .eq("is_active", true),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const rolesMap = new Map<string, string>();
      (rolesRes.data || []).forEach((r: any) => {
        if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, r.role);
      });

      const byKey = new Map<string, Member>();

      (tmRes.data || []).forEach((tm: any) => {
        const key = tm.user_id || tm.id;
        const authIds = [tm.user_id, tm.id].filter(Boolean);
        byKey.set(key, {
          id: key,
          name: tm.display_name || tm.username || "Team Member",
          phone: tm.phone || undefined,
          designation: tm.designation || undefined,
          department: tm.department || undefined,
          role: rolesMap.get(tm.user_id) || undefined,
          authIds,
          assignedKeys: authIds.map(String),
        });
      });

      (cuRes.data || []).forEach((cu: any) => {
        const key = cu.auth_user_id || cu.id;
        const existing = byKey.get(key);
        const authIds = [cu.auth_user_id, cu.id].filter(Boolean);
        if (existing) {
          existing.email = existing.email || cu.email || undefined;
          existing.role = existing.role || cu.role || rolesMap.get(cu.auth_user_id);
          existing.name = existing.name || cu.name || existing.name;
          // merge id variants for matching
          authIds.forEach(id => {
            if (!existing.authIds.includes(id)) existing.authIds.push(id);
            const s = String(id);
            if (!existing.assignedKeys.includes(s)) existing.assignedKeys.push(s);
          });
        } else {
          byKey.set(key, {
            id: key,
            name: cu.name || cu.email || "CRM User",
            email: cu.email || undefined,
            role: cu.role || rolesMap.get(cu.auth_user_id),
            authIds,
            assignedKeys: authIds.map(String),
          });
        }
      });

      return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 60_000,
  });

  // ── Live performance windows (single batched fetch, then group in memory) ──
  const dataQuery = useQuery({
    queryKey: ["founder-team-perf", range],
    queryFn: async () => {
      const [leadsRes, dealsRes, insRes, payRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, assigned_to, status, last_contacted_at, created_at")
          .gte("created_at", fromIso)
          .limit(10000),
        supabase
          .from("deals")
          .select("id, assigned_to, deal_value, payment_received_amount, payment_status, deal_status, vertical_name, created_at, closed_at")
          .gte("created_at", fromIso)
          .limit(10000),
        supabase
          .from("insurance_clients")
          .select("id, assigned_executive, lead_status, current_premium, created_at")
          .gte("created_at", fromIso)
          .limit(10000),
        supabase
          .from("payment_received")
          .select("id, collected_by, amount, payment_type, payment_date")
          .gte("payment_date", format(fromDate, "yyyy-MM-dd"))
          .limit(10000),
      ]);

      return {
        leads: leadsRes.data || [],
        deals: dealsRes.data || [],
        insurance: insRes.data || [],
        payments: payRes.data || [],
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const stats: MemberStats[] = useMemo(() => {
    const roster = rosterQuery.data || [];
    const data = dataQuery.data;
    if (!data) return [];

    const wonStatuses = new Set(["converted", "won", "closed_won", "policy_done", "booked", "delivered"]);
    const hotStatuses = new Set(["hot", "interested", "qualified"]);
    const lostStatuses = new Set(["lost", "closed_lost", "dropped"]);

    return roster.map<MemberStats>((m) => {
      const keySet = new Set(m.assignedKeys);
      const inMember = (assignedTo: any) => assignedTo != null && keySet.has(String(assignedTo));

      const myLeads = data.leads.filter((l: any) => inMember(l.assigned_to));
      const myDeals = data.deals.filter((d: any) => inMember(d.assigned_to));
      const myIns = data.insurance.filter((i: any) => inMember(i.assigned_executive));
      const myPay = data.payments.filter((p: any) => inMember(p.collected_by));

      const contactedLeads = myLeads.filter((l: any) => !!l.last_contacted_at).length;
      const wonLeads = myLeads.filter((l: any) => wonStatuses.has(String(l.status || "").toLowerCase())).length
        + myIns.filter((i: any) => wonStatuses.has(String(i.lead_status || "").toLowerCase())).length;
      const hotLeads = myLeads.filter((l: any) => hotStatuses.has(String(l.status || "").toLowerCase())).length;
      const lostLeads = myLeads.filter((l: any) => lostStatuses.has(String(l.status || "").toLowerCase())).length;

      const closedDeals = myDeals.filter((d: any) =>
        String(d.payment_status).toLowerCase() === "received"
        || String(d.deal_status).toLowerCase() === "closed"
      );
      const pipelineValue = myDeals.reduce((s, d: any) => s + Number(d.deal_value || 0), 0);
      const closedValue = closedDeals.reduce((s, d: any) =>
        s + Number(d.payment_received_amount || d.deal_value || 0), 0);
      const collectedValue = myPay.reduce((s, p: any) => {
        const v = Number(p.amount || 0);
        return String(p.payment_type).toLowerCase().includes("debit") ? s - v : s + v;
      }, 0);

      const byVertical: Record<string, { deals: number; value: number }> = {};
      myDeals.forEach((d: any) => {
        const v = d.vertical_name || "general";
        byVertical[v] = byVertical[v] || { deals: 0, value: 0 };
        byVertical[v].deals += 1;
        byVertical[v].value += Number(d.deal_value || 0);
      });
      if (myIns.length > 0) {
        byVertical.insurance = byVertical.insurance || { deals: 0, value: 0 };
        byVertical.insurance.deals += myIns.length;
        byVertical.insurance.value += myIns.reduce((s, i: any) => s + Number(i.current_premium || 0), 0);
      }

      const totalLeads = myLeads.length + myIns.length;
      const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
      const followUpRate = myLeads.length > 0 ? Math.round((contactedLeads / myLeads.length) * 100) : 0;

      return {
        member: m,
        totalLeads,
        contactedLeads,
        hotLeads,
        wonLeads,
        lostLeads,
        totalDeals: myDeals.length,
        closedDeals: closedDeals.length,
        pipelineValue,
        closedValue,
        collectedValue,
        insurancePolicies: myIns.filter((i: any) => wonStatuses.has(String(i.lead_status || "").toLowerCase())).length,
        insurancePremium: myIns.reduce((s, i: any) => s + Number(i.current_premium || 0), 0),
        conversionRate,
        followUpRate,
        byVertical,
      };
    });
  }, [rosterQuery.data, dataQuery.data]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    (rosterQuery.data || []).forEach(m => { if (m.department) set.add(m.department); });
    return Array.from(set).sort();
  }, [rosterQuery.data]);

  const filteredStats = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stats.filter(s => {
      if (departmentFilter !== "all" && s.member.department !== departmentFilter) return false;
      if (!q) return true;
      const hay = `${s.member.name} ${s.member.email ?? ""} ${s.member.designation ?? ""} ${s.member.department ?? ""} ${s.member.role ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [stats, search, departmentFilter]);

  const totals = useMemo(() => {
    return filteredStats.reduce(
      (acc, s) => ({
        totalLeads: acc.totalLeads + s.totalLeads,
        contactedLeads: acc.contactedLeads + s.contactedLeads,
        wonLeads: acc.wonLeads + s.wonLeads,
        totalDeals: acc.totalDeals + s.totalDeals,
        closedDeals: acc.closedDeals + s.closedDeals,
        pipelineValue: acc.pipelineValue + s.pipelineValue,
        closedValue: acc.closedValue + s.closedValue,
        collectedValue: acc.collectedValue + s.collectedValue,
        insurancePolicies: acc.insurancePolicies + s.insurancePolicies,
        insurancePremium: acc.insurancePremium + s.insurancePremium,
      }),
      { totalLeads: 0, contactedLeads: 0, wonLeads: 0, totalDeals: 0, closedDeals: 0,
        pipelineValue: 0, closedValue: 0, collectedValue: 0, insurancePolicies: 0, insurancePremium: 0 },
    );
  }, [filteredStats]);

  const verticalRollup = useMemo(() => {
    const map: Record<string, { deals: number; value: number }> = {};
    filteredStats.forEach(s => {
      Object.entries(s.byVertical).forEach(([v, b]) => {
        map[v] = map[v] || { deals: 0, value: 0 };
        map[v].deals += b.deals;
        map[v].value += b.value;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].value - a[1].value);
  }, [filteredStats]);

  const topPerformers = useMemo(() =>
    [...filteredStats]
      .sort((a, b) => (b.closedValue + b.collectedValue) - (a.closedValue + a.collectedValue))
      .slice(0, 5),
    [filteredStats],
  );

  const isLoading = rosterQuery.isLoading || dataQuery.isLoading;

  return (
    <Card className="col-span-full">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Live Team Performance
              <Badge variant="secondary" className="ml-2 text-[10px]">REAL-TIME</Badge>
            </CardTitle>
            <CardDescription>
              Accurate, per-member scoreboard across leads, deals, insurance & collections — auto-refreshed.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search member…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 w-[180px] h-9"
              />
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => { rosterQuery.refetch(); dataQuery.refetch(); }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-1">
          <KPI icon={Users} label="Members" value={String(filteredStats.length)} />
          <KPI icon={TrendingUp} label="Leads" value={String(totals.totalLeads)} />
          <KPI icon={CheckCircle2} label="Won" value={String(totals.wonLeads)} accent="emerald" />
          <KPI icon={Briefcase} label="Deals closed" value={String(totals.closedDeals)} />
          <KPI icon={IndianRupee} label="Closed value" value={fmtINR(totals.closedValue)} accent="emerald" />
          <KPI icon={IndianRupee} label="Collected" value={fmtINR(totals.collectedValue)} accent="blue" />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="verticals">By Vertical</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* ── MEMBERS TABLE ── */}
          <TabsContent value="members" className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredStats.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No team members match the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">Member</th>
                      <th className="text-right px-3 py-2">Leads</th>
                      <th className="text-right px-3 py-2">Hot</th>
                      <th className="text-right px-3 py-2">Won</th>
                      <th className="text-right px-3 py-2">Deals</th>
                      <th className="text-right px-3 py-2">Closed ₹</th>
                      <th className="text-right px-3 py-2">Collected ₹</th>
                      <th className="text-right px-3 py-2">Conv.</th>
                      <th className="text-right px-3 py-2">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStats.map((s) => (
                      <tr key={s.member.id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">{s.member.name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            {s.member.designation && <span>{s.member.designation}</span>}
                            {s.member.department && <Badge variant="outline" className="text-[9px] px-1 py-0">{s.member.department}</Badge>}
                            {s.member.role && <Badge variant="secondary" className="text-[9px] px-1 py-0">{s.member.role}</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{s.totalLeads}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-orange-600">{s.hotLeads}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600 font-semibold">{s.wonLeads}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {s.closedDeals}/{s.totalDeals}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtINR(s.closedValue)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-600">{fmtINR(s.collectedValue)}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Progress value={s.conversionRate} className="h-1.5 w-12" />
                            <span className="tabular-nums w-9 text-right">{s.conversionRate}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="tabular-nums w-9 text-right">{s.followUpRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/40 font-semibold">
                    <tr>
                      <td className="px-3 py-2">TOTAL ({filteredStats.length})</td>
                      <td className="px-3 py-2 text-right tabular-nums">{totals.totalLeads}</td>
                      <td className="px-3 py-2 text-right tabular-nums">—</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{totals.wonLeads}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{totals.closedDeals}/{totals.totalDeals}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtINR(totals.closedValue)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-blue-700">{fmtINR(totals.collectedValue)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {totals.totalLeads > 0 ? Math.round((totals.wonLeads / totals.totalLeads) * 100) : 0}%
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {totals.totalLeads > 0 ? Math.round((totals.contactedLeads / totals.totalLeads) * 100) : 0}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── VERTICAL ROLLUP ── */}
          <TabsContent value="verticals" className="mt-4">
            {verticalRollup.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No vertical data in this period.
              </div>
            ) : (
              <div className="space-y-2">
                {verticalRollup.map(([v, b]) => {
                  const pct = totals.pipelineValue > 0 ? (b.value / totals.pipelineValue) * 100 : 0;
                  return (
                    <div key={v} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{v.replace(/_/g, " ")}</span>
                          <span className="text-sm font-semibold">{fmtINR(b.value)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-[11px] text-muted-foreground tabular-nums w-16 text-right">
                            {b.deals} deals
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── LEADERBOARD ── */}
          <TabsContent value="leaderboard" className="mt-4">
            {topPerformers.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">No performers to rank yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                {topPerformers.map((s, idx) => (
                  <div key={s.member.id} className="rounded-xl border p-4 bg-gradient-to-br from-card to-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={idx === 0 ? "default" : "secondary"} className="gap-1">
                        <Trophy className="h-3 w-3" /> #{idx + 1}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{s.member.department || s.member.role || "Team"}</span>
                    </div>
                    <p className="font-semibold truncate">{s.member.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate mb-3">
                      {s.member.designation || s.member.email || "—"}
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <Row label="Closed" value={fmtINR(s.closedValue)} accent="emerald" />
                      <Row label="Collected" value={fmtINR(s.collectedValue)} accent="blue" />
                      <Row label="Won leads" value={String(s.wonLeads)} />
                      <Row label="Conv." value={`${s.conversionRate}%`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const KPI = ({
  icon: Icon, label, value, accent,
}: { icon: any; label: string; value: string; accent?: "emerald" | "blue" }) => {
  const tone =
    accent === "emerald" ? "text-emerald-600" :
    accent === "blue" ? "text-blue-600" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`text-base font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
};

const Row = ({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "blue" }) => {
  const tone =
    accent === "emerald" ? "text-emerald-600" :
    accent === "blue" ? "text-blue-600" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
};

export default LiveTeamPerformance;
