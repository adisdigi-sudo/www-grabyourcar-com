import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import {
  AlertTriangle, Search, PhoneCall, MessageSquare, ArrowUpDown,
  XCircle, Target, ArrowRight, CalendarClock, Clock
} from "lucide-react";
import type { PolicyRecord } from "./InsurancePolicyBook";
import type { Client } from "./InsuranceLeadPipeline";

const OVERDUE_REASONS = [
  { value: "not_interested", label: "Not Interested", icon: "🚫" },
  { value: "sold_car", label: "Sold Car", icon: "🚗" },
  { value: "switched_agent", label: "Switched Agent", icon: "🔄" },
  { value: "no_response", label: "No Response", icon: "📵" },
  { value: "financial_issue", label: "Financial Issue", icon: "💰" },
  { value: "custom", label: "Custom Reason", icon: "✏️" },
];

const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

interface Props {
  policies: PolicyRecord[];
  clients: Client[];
}

export function InsuranceOverdueRenewals({ policies, clients }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"days_desc" | "days_asc" | "name">("days_desc");
  const [filterReason, setFilterReason] = useState<string>("all");

  // Overdue reason dialog
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [targetPolicy, setTargetPolicy] = useState<PolicyRecord | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Move dialog
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState<"retarget" | "pipeline">("retarget");
  const [retargetNextYear, setRetargetNextYear] = useState(true);

  // Get overdue policies (expiry_date < today)
  const overdueItems = useMemo(() => {
    const now = new Date();
    let items = policies
      .filter(p => {
        if (!p.expiry_date || p.status === "renewed") return false;
        return differenceInDays(new Date(p.expiry_date), now) < 0;
      })
      .map(p => {
        const daysOverdue = Math.abs(differenceInDays(new Date(p.expiry_date!), now));
        const client = clients.find(c => c.id === p.client_id);
        return { ...p, daysOverdue, clientData: client };
      });

    // Filter by reason
    if (filterReason !== "all") {
      if (filterReason === "unmarked") {
        items = items.filter(i => !(i.clientData as any)?.overdue_reason);
      } else {
        items = items.filter(i => (i.clientData as any)?.overdue_reason === filterReason);
      }
    }

    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      items = items.filter(i =>
        i.insurance_clients?.customer_name?.toLowerCase().includes(s) ||
        i.insurance_clients?.phone?.includes(s) ||
        i.insurance_clients?.vehicle_number?.toLowerCase().includes(s) ||
        i.policy_number?.toLowerCase().includes(s) ||
        i.insurer?.toLowerCase().includes(s)
      );
    }

    // Sort
    return items.sort((a, b) => {
      if (sort === "name") return (a.insurance_clients?.customer_name || "").localeCompare(b.insurance_clients?.customer_name || "");
      if (sort === "days_asc") return a.daysOverdue - b.daysOverdue;
      return b.daysOverdue - a.daysOverdue;
    });
  }, [policies, clients, search, sort, filterReason]);

  const summary = useMemo(() => {
    const unmarked = overdueItems.filter(i => !i.clientData?.overdue_reason).length;
    const marked = overdueItems.filter(i => (i.clientData as any)?.overdue_reason).length;
    const critical = overdueItems.filter(i => i.daysOverdue > 30).length;
    return { total: overdueItems.length, unmarked, marked, critical };
  }, [overdueItems]);

  const handleMarkReason = async () => {
    if (!targetPolicy || !selectedReason) { toast.error("Select a reason"); return; }
    if (selectedReason === "custom" && !customReason.trim()) { toast.error("Enter custom reason"); return; }
    setSaving(true);
    try {
      await supabase.from("insurance_clients").update({
        overdue_reason: selectedReason,
        overdue_custom_reason: selectedReason === "custom" ? customReason.trim() : null,
        overdue_marked_at: new Date().toISOString(),
      } as any).eq("id", targetPolicy.client_id);

      await supabase.from("insurance_activity_log").insert({
        client_id: targetPolicy.client_id,
        policy_id: targetPolicy.id,
        activity_type: "overdue_reason_marked",
        title: "Overdue Reason Marked",
        description: `Reason: ${selectedReason === "custom" ? customReason.trim() : OVERDUE_REASONS.find(r => r.value === selectedReason)?.label}`,
        metadata: { reason: selectedReason, custom_reason: customReason } as any,
      });

      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
      toast.success("Overdue reason marked");
      setShowReasonDialog(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async () => {
    if (!targetPolicy) return;
    setSaving(true);
    try {
      if (moveTarget === "retarget") {
        await supabase.from("insurance_clients").update({
          pipeline_stage: "lost",
          lead_status: "lost",
          retarget_status: retargetNextYear ? "scheduled" : "none",
          retargeting_enabled: retargetNextYear,
          lost_reason: (targetPolicy as any).clientData?.overdue_reason === "custom"
            ? (targetPolicy as any).clientData?.overdue_custom_reason
            : OVERDUE_REASONS.find(r => r.value === (targetPolicy as any).clientData?.overdue_reason)?.label || "Overdue - not renewed",
        }).eq("id", targetPolicy.client_id);

        await supabase.from("insurance_policies").update({ status: "lapsed" }).eq("id", targetPolicy.id);
        toast.success("Moved to Retarget queue");
      } else {
        // Move back to pipeline as new_lead
        await supabase.from("insurance_clients").update({
          pipeline_stage: "new_lead",
          lead_status: "new",
          overdue_reason: null,
          overdue_custom_reason: null,
          overdue_marked_at: null,
          retarget_status: "none",
          retargeting_enabled: false,
        } as any).eq("id", targetPolicy.client_id);

        toast.success("Moved back to Lead Pipeline");
      }

      await supabase.from("insurance_activity_log").insert({
        client_id: targetPolicy.client_id,
        policy_id: targetPolicy.id,
        activity_type: "stage_change",
        title: moveTarget === "retarget" ? "Overdue → Retarget" : "Overdue → Lead Pipeline",
        description: `Client moved from overdue to ${moveTarget === "retarget" ? "retarget queue" : "lead pipeline"}`,
      });

      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
      setShowMoveDialog(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const getReasonBadge = (client: any) => {
    if (!client?.overdue_reason) return null;
    const reason = OVERDUE_REASONS.find(r => r.value === client.overdue_reason);
    return (
      <Badge variant="outline" className="text-[9px] bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-700">
        {reason?.icon} {client.overdue_reason === "custom" ? (client.overdue_custom_reason || "Custom") : (reason?.label || client.overdue_reason)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Overdue", count: summary.total, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800", icon: AlertTriangle },
          { label: "Unmarked", count: summary.unmarked, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800", icon: Clock },
          { label: "Reason Marked", count: summary.marked, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800", icon: Target },
          { label: "Critical (30d+)", count: summary.critical, color: "text-red-700", bg: "bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-700", icon: XCircle },
        ].map(item => (
          <Card key={item.label} className={cn("border", item.bg)}>
            <CardContent className="p-4 text-center">
              <item.icon className={cn("h-5 w-5 mx-auto mb-1", item.color)} />
              <p className={cn("text-2xl font-bold", item.color)}>{item.count}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.unmarked > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>{summary.unmarked} overdue renewals</strong> need a reason marked — please review and mark each one.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, vehicle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 text-sm" />
        </div>
        <Select value={filterReason} onValueChange={setFilterReason}>
          <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Filter by reason" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Overdue</SelectItem>
            <SelectItem value="unmarked">⚠️ Unmarked</SelectItem>
            {OVERDUE_REASONS.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.icon} {r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v: any) => setSort(v)}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><ArrowUpDown className="h-3 w-3 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="days_desc">Most Overdue</SelectItem>
            <SelectItem value="days_asc">Least Overdue</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs text-red-600 border-red-200">{overdueItems.length} overdue</Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-red-50/50 dark:bg-red-950/10">
                  <TableHead className="text-[10px] font-bold uppercase w-8">#</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Customer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Phone</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Vehicle</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Insurer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Policy No.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Premium</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Expired On</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Overdue</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Reason</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueItems.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No overdue renewals — all caught up! 🎉</p>
                  </TableCell></TableRow>
                ) : overdueItems.map((item, idx) => {
                  const c = item.insurance_clients;
                  const phone = displayPhone(c?.phone || null);
                  const isCritical = item.daysOverdue > 30;
                  const hasReason = !!(item.clientData as any)?.overdue_reason;
                  return (
                    <TableRow key={item.id} className={cn("text-xs transition-colors",
                      !hasReason ? "bg-amber-50/60 dark:bg-amber-950/10" :
                      isCritical ? "bg-red-50/40 dark:bg-red-950/10" :
                      "hover:bg-muted/30"
                    )}>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            isCritical ? "bg-gradient-to-br from-red-600 to-red-700" : "bg-gradient-to-br from-amber-500 to-amber-600"
                          )}><AlertTriangle className="h-3 w-3 text-white" /></div>
                          <div>
                            <p className="font-semibold text-xs">{c?.customer_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{c?.city || ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{phone || "—"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono font-semibold text-xs">{c?.vehicle_number || "—"}</p>
                          <p className="text-[10px] text-muted-foreground">{[c?.vehicle_make, c?.vehicle_model].filter(Boolean).join(" ")}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{item.insurer || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.policy_number || "—"}</TableCell>
                      <TableCell className="font-semibold text-xs">{item.premium_amount ? `₹${item.premium_amount.toLocaleString("en-IN")}` : "—"}</TableCell>
                      <TableCell className="text-xs font-medium">{format(new Date(item.expiry_date!), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="destructive" className={cn("text-[10px] font-bold", isCritical && "animate-pulse")}>
                          {item.daysOverdue}d overdue
                        </Badge>
                      </TableCell>
                      <TableCell>{getReasonBadge(item.clientData)}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-0.5 flex-wrap">
                          {phone && (
                            <>
                              <a href={`tel:${c?.phone}`}><Button variant="ghost" size="icon" className="h-6 w-6"><PhoneCall className="h-3 w-3 text-primary" /></Button></a>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                const clean = (c?.phone || "").replace(/\D/g, "");
                                window.open(`https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}`, "_blank");
                              }}><MessageSquare className="h-3 w-3 text-green-600" /></Button>
                            </>
                          )}
                          {!hasReason ? (
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-1.5 text-amber-600 border-amber-200 animate-pulse"
                              onClick={() => {
                                setTargetPolicy({ ...item } as any);
                                setSelectedReason("");
                                setCustomReason("");
                                setShowReasonDialog(true);
                              }}>
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Mark Reason
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-6 text-[9px] px-1.5 text-violet-600 border-violet-200"
                              onClick={() => {
                                setTargetPolicy({ ...item } as any);
                                setMoveTarget("retarget");
                                setRetargetNextYear(true);
                                setShowMoveDialog(true);
                              }}>
                              <ArrowRight className="h-2.5 w-2.5 mr-0.5" /> Move
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── MARK OVERDUE REASON DIALOG ── */}
      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> Mark Overdue Reason
            </DialogTitle>
          </DialogHeader>
          {targetPolicy && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold">{targetPolicy.insurance_clients?.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {targetPolicy.insurance_clients?.vehicle_number} • {targetPolicy.insurer} • Expired {format(new Date(targetPolicy.expiry_date!), "dd MMM yyyy")}
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">Why is this renewal overdue? *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {OVERDUE_REASONS.map(r => (
                    <Button key={r.value} variant={selectedReason === r.value ? "default" : "outline"}
                      size="sm" className="justify-start gap-2 h-9 text-xs"
                      onClick={() => setSelectedReason(r.value)}>
                      <span>{r.icon}</span> {r.label}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedReason === "custom" && (
                <div className="space-y-1">
                  <Label className="text-xs">Custom Reason *</Label>
                  <Textarea placeholder="Enter the specific reason..." value={customReason} onChange={e => setCustomReason(e.target.value)} className="h-20" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReasonDialog(false)}>Cancel</Button>
            <Button disabled={saving || !selectedReason || (selectedReason === "custom" && !customReason.trim())}
              onClick={handleMarkReason} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
              {saving ? <Clock className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />} Mark Reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MOVE DIALOG (Retarget / Pipeline) ── */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-violet-600" /> Move Overdue Lead
            </DialogTitle>
          </DialogHeader>
          {targetPolicy && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold">{targetPolicy.insurance_clients?.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {getReasonBadge((targetPolicy as any).clientData)}
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-2 block">Where to move?</Label>
                <div className="space-y-2">
                  <Button variant={moveTarget === "retarget" ? "default" : "outline"}
                    className="w-full justify-start gap-2 h-10" onClick={() => setMoveTarget("retarget")}>
                    <Target className="h-4 w-4" />
                    <div className="text-left">
                      <p className="text-xs font-semibold">Retarget Queue</p>
                      <p className="text-[10px] opacity-70">Auto-follow up when next policy is due</p>
                    </div>
                  </Button>
                  <Button variant={moveTarget === "pipeline" ? "default" : "outline"}
                    className="w-full justify-start gap-2 h-10" onClick={() => setMoveTarget("pipeline")}>
                    <ArrowRight className="h-4 w-4" />
                    <div className="text-left">
                      <p className="text-xs font-semibold">Back to Lead Pipeline</p>
                      <p className="text-[10px] opacity-70">Re-engage as a fresh lead</p>
                    </div>
                  </Button>
                </div>
              </div>

              {moveTarget === "retarget" && (
                <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-800">
                  <div>
                    <p className="text-sm font-medium">🔄 Retarget Next Year?</p>
                    <p className="text-[10px] text-muted-foreground">Auto-follow up when policy is due</p>
                  </div>
                  <Switch checked={retargetNextYear} onCheckedChange={setRetargetNextYear} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleMove} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
              {saving ? <Clock className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {moveTarget === "retarget" ? "Move to Retarget" : "Move to Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
