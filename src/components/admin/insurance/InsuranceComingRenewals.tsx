import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CalendarClock, Search, PhoneCall, MessageSquare, CheckCircle2, XCircle,
  Send, ArrowUpDown, RefreshCw
} from "lucide-react";
import type { PolicyRecord } from "./InsurancePolicyBook";

const LOST_REASONS = ["Too expensive", "Existing agent", "No response", "Not renewing", "Competitor offer", "Other"];
const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

interface InsuranceComingRenewalsProps {
  policies: PolicyRecord[];
}

export function InsuranceComingRenewals({ policies }: InsuranceComingRenewalsProps) {
  const queryClient = useQueryClient();
  const [window_, setWindow] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"days_asc" | "days_desc" | "name">("days_asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Won dialog
  const [showWonDialog, setShowWonDialog] = useState(false);
  const [targetPolicy, setTargetPolicy] = useState<PolicyRecord | null>(null);
  const [wonPolicyNumber, setWonPolicyNumber] = useState("");
  const [wonInsurer, setWonInsurer] = useState("");
  const [wonPremium, setWonPremium] = useState("");
  const [wonExpiryDate, setWonExpiryDate] = useState<string>("");
  const [wonSaving, setWonSaving] = useState(false);

  // Lost dialog
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostRemarks, setLostRemarks] = useState("");
  const [retargetNextYear, setRetargetNextYear] = useState(true);

  const summary = useMemo(() => {
    const now = new Date();
    // Exclude 'renewed' status to avoid duplicate entries; include recently expired (within -15 days) for actionability
    const all = policies.filter(p => p.expiry_date && p.status !== "renewed" && p.status !== "cancelled");
    const upcoming = all.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= -15 && d <= 90; });
    return {
      within7: upcoming.filter(p => differenceInDays(new Date(p.expiry_date!), now) <= 7 && differenceInDays(new Date(p.expiry_date!), now) >= -15).length,
      within15: upcoming.filter(p => differenceInDays(new Date(p.expiry_date!), now) <= 15 && differenceInDays(new Date(p.expiry_date!), now) >= -15).length,
      within30: upcoming.filter(p => differenceInDays(new Date(p.expiry_date!), now) <= 30 && differenceInDays(new Date(p.expiry_date!), now) >= -15).length,
      within45: upcoming.filter(p => differenceInDays(new Date(p.expiry_date!), now) <= 45 && differenceInDays(new Date(p.expiry_date!), now) >= -15).length,
      within60: upcoming.filter(p => differenceInDays(new Date(p.expiry_date!), now) <= 60 && differenceInDays(new Date(p.expiry_date!), now) >= -15).length,
      total: upcoming.length,
    };
  }, [policies]);

  const filtered = useMemo(() => {
    const now = new Date();
    let all = policies.filter(p => {
      if (!p.expiry_date || p.status === "renewed" || p.status === "cancelled") return false;
      const d = differenceInDays(new Date(p.expiry_date), now);
      return d >= -15 && d <= 90; // Include recently expired (within 15 days) for follow-up
    });

    if (window_ !== "all") {
      const days = parseInt(window_);
      all = all.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= days; });
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      all = all.filter(p =>
        p.insurance_clients?.customer_name?.toLowerCase().includes(s) ||
        p.insurance_clients?.phone?.includes(s) ||
        p.insurance_clients?.vehicle_number?.toLowerCase().includes(s) ||
        p.policy_number?.toLowerCase().includes(s) ||
        p.insurer?.toLowerCase().includes(s)
      );
    }

    return all.sort((a, b) => {
      if (sort === "name") return (a.insurance_clients?.customer_name || "").localeCompare(b.insurance_clients?.customer_name || "");
      if (sort === "days_desc") return new Date(b.expiry_date!).getTime() - new Date(a.expiry_date!).getTime();
      return new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime();
    });
  }, [policies, window_, search, sort]);

  const handleWon = async () => {
    if (!targetPolicy || !wonExpiryDate || !wonPolicyNumber.trim() || !wonInsurer.trim()) {
      toast.error("Fill all required fields");
      return;
    }
    setWonSaving(true);
    try {
      await supabase.from("insurance_policies").update({ status: "renewed", renewal_status: "renewed" }).eq("id", targetPolicy.id);

      const newStart = targetPolicy.expiry_date ? new Date(targetPolicy.expiry_date) : new Date();
      await supabase.from("insurance_policies").insert({
        client_id: targetPolicy.client_id,
        policy_number: wonPolicyNumber.trim().toUpperCase(),
        policy_type: targetPolicy.policy_type,
        insurer: wonInsurer.trim(),
        premium_amount: wonPremium ? parseFloat(wonPremium) : targetPolicy.premium_amount,
        start_date: format(newStart, "yyyy-MM-dd"),
        expiry_date: wonExpiryDate,
        status: "active",
        is_renewal: true,
        previous_policy_id: targetPolicy.id,
        issued_date: format(new Date(), "yyyy-MM-dd"),
        source_label: "Won (Renewal)",
        renewal_count: (targetPolicy.renewal_count || 0) + 1,
        plan_name: targetPolicy.plan_name,
        idv: targetPolicy.idv,
      } as any);

      await supabase.from("insurance_clients").update({
        pipeline_stage: "policy_issued",
        lead_status: "won",
        current_policy_number: wonPolicyNumber.trim().toUpperCase(),
        current_insurer: wonInsurer.trim(),
        current_premium: wonPremium ? parseFloat(wonPremium) : targetPolicy.premium_amount,
        policy_expiry_date: wonExpiryDate,
        policy_start_date: format(newStart, "yyyy-MM-dd"),
        renewal_reminder_set: true,
        renewal_reminder_date: wonExpiryDate,
        retarget_status: "none",
        retargeting_enabled: false,
      }).eq("id", targetPolicy.client_id);

      await supabase.from("insurance_activity_log").insert({
        client_id: targetPolicy.client_id,
        policy_id: targetPolicy.id,
        activity_type: "stage_change",
        title: "Pipeline → Won (Renewal)",
        description: `Renewal won. New policy ${wonPolicyNumber} by ${wonInsurer}`,
        metadata: { new_stage: "policy_issued", policy_number: wonPolicyNumber, insurer: wonInsurer, previous_policy_id: targetPolicy.id } as any,
      });

      queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      toast.success("🎉 Renewal won! New policy created");
      setShowWonDialog(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setWonSaving(false);
    }
  };

  const handleLost = async () => {
    if (!targetPolicy || !lostRemarks) return;
    try {
      await supabase.from("insurance_policies").update({ status: "lapsed" }).eq("id", targetPolicy.id);
      await supabase.from("insurance_clients").update({
        pipeline_stage: "lost",
        lead_status: "lost",
        lost_reason: lostRemarks,
        retarget_status: retargetNextYear ? "scheduled" : "none",
        retargeting_enabled: retargetNextYear,
      }).eq("id", targetPolicy.client_id);

      queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      toast.success("Renewal marked as lost");
      setShowLostDialog(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "7 Days", count: summary.within7, value: "7", urgent: true },
          { label: "15 Days", count: summary.within15, value: "15", urgent: false },
          { label: "30 Days", count: summary.within30, value: "30", urgent: false },
          { label: "45 Days", count: summary.within45, value: "45", urgent: false },
          { label: "60 Days", count: summary.within60, value: "60", urgent: false },
          { label: "All (90d)", count: summary.total, value: "all", urgent: false },
        ].map(item => (
          <button key={item.value} onClick={() => setWindow(item.value)}
            className={cn("rounded-xl p-3 text-center border transition-all",
              window_ === item.value ? "bg-primary text-primary-foreground border-primary shadow-md" :
              item.urgent && item.count > 0 ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" :
              "bg-muted/30 border-border hover:bg-muted/50"
            )}>
            <p className="text-2xl font-bold">{item.count}</p>
            <p className="text-[10px] font-medium">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, vehicle, policy no..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9 text-sm" />
        </div>
        <Select value={sort} onValueChange={(v: any) => setSort(v)}>
          <SelectTrigger className="w-[180px] h-9 text-xs"><ArrowUpDown className="h-3 w-3 mr-1.5" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="days_asc">Soonest First</SelectItem>
            <SelectItem value="days_desc">Latest First</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.size > 0 && (
          <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={async () => {
            const sel = filtered.filter(p => selectedIds.has(p.id));
            const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
            let sent = 0;
            for (const p of sel) {
              const ph = p.insurance_clients?.phone;
              if (ph && !ph.startsWith("IB_")) {
                const days = differenceInDays(new Date(p.expiry_date!), new Date());
                await sendWhatsApp({ phone: ph, message: `Hi ${p.insurance_clients?.customer_name || ""}, your ${p.insurer} policy expires in ${days} days. Contact us for the best renewal quote!`, name: p.insurance_clients?.customer_name || "", logEvent: "renewal_alert", silent: true });
                sent++;
              }
            }
            toast.success(`✅ Sent renewal alert to ${sent} clients via API`);
          }}><Send className="h-3.5 w-3.5" /> Renewal Alert ({selectedIds.size})</Button>
        )}
        <Badge variant="outline" className="text-xs">{filtered.length} upcoming</Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-8"><input type="checkbox" className="rounded" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={() => setSelectedIds(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)))} /></TableHead>
                  <TableHead className="text-[10px] font-bold uppercase w-8">#</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Customer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Phone</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Vehicle</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Insurer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Policy No.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Premium</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Expiry</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Days</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase w-32">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No upcoming renewals</p>
                  </TableCell></TableRow>
                ) : filtered.map((policy, idx) => {
                  const days = differenceInDays(new Date(policy.expiry_date!), new Date());
                  const isUrgent = days <= 7;
                  const isWarning = days > 7 && days <= 15;
                  const isExpired = days < 0;
                  const c = policy.insurance_clients;
                  const phone = displayPhone(c?.phone || null);
                  return (
                    <TableRow key={policy.id} className={cn("text-xs transition-colors",
                      isExpired ? "bg-red-50/80 dark:bg-red-950/20" :
                      isUrgent ? "bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50" :
                      isWarning ? "bg-orange-50/30 hover:bg-orange-50/50" : "hover:bg-muted/30"
                    )}>
                      <TableCell onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded" checked={selectedIds.has(policy.id)} onChange={() => { const n = new Set(selectedIds); n.has(policy.id) ? n.delete(policy.id) : n.add(policy.id); setSelectedIds(n); }} /></TableCell>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            isExpired ? "bg-gradient-to-br from-red-600 to-red-700" :
                            isUrgent ? "bg-gradient-to-br from-red-500 to-red-600" :
                            isWarning ? "bg-gradient-to-br from-amber-500 to-amber-600" :
                            "bg-gradient-to-br from-blue-500 to-blue-600"
                          )}><CalendarClock className="h-3 w-3 text-white" /></div>
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
                      <TableCell className="text-xs">{policy.insurer || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{policy.policy_number || "—"}</TableCell>
                      <TableCell className="font-semibold text-xs">{policy.premium_amount ? `₹${policy.premium_amount.toLocaleString("en-IN")}` : "—"}</TableCell>
                      <TableCell className="text-xs font-medium">{format(new Date(policy.expiry_date!), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] font-bold",
                          isExpired ? "bg-red-100 text-red-700 border-red-200" :
                          isUrgent ? "bg-red-100 text-red-700 border-red-200" :
                          isWarning ? "bg-orange-100 text-orange-700 border-orange-200" :
                          days <= 30 ? "bg-amber-100 text-amber-700 border-amber-200" :
                          "bg-blue-100 text-blue-700 border-blue-200"
                        )}>{isExpired ? `Expired ${Math.abs(days)}d` : `${days}d`}</Badge>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-0.5 flex-wrap">
                          {phone && (
                            <>
                              <a href={`tel:${c?.phone}`}><Button variant="ghost" size="icon" className="h-6 w-6"><PhoneCall className="h-3 w-3 text-primary" /></Button></a>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                import("@/lib/openWhatsAppChat").then(({ openWhatsAppChat }) => {
                                  openWhatsAppChat(c?.phone || "", `Hi ${c?.customer_name || ""}, your insurance policy is expiring soon. Contact us for renewal!`);
                                });
                              }}><MessageSquare className="h-3 w-3 text-green-600" /></Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-1.5 text-emerald-600 border-emerald-200"
                            onClick={() => {
                              setTargetPolicy(policy);
                              setWonPolicyNumber("");
                              setWonInsurer(policy.insurer || "");
                              setWonPremium(policy.premium_amount?.toString() || "");
                              setWonExpiryDate("");
                              setShowWonDialog(true);
                            }}>
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Won
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-1.5 text-red-600 border-red-200"
                            onClick={() => { setTargetPolicy(policy); setLostRemarks(""); setRetargetNextYear(true); setShowLostDialog(true); }}>
                            <XCircle className="h-2.5 w-2.5 mr-0.5" /> Lost
                          </Button>
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

      {/* ── RENEWAL WON DIALOG (Enhanced) ── */}
      <Dialog open={showWonDialog} onOpenChange={setShowWonDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Renewal Won — New Policy</DialogTitle></DialogHeader>
          {targetPolicy && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{targetPolicy.insurance_clients?.customer_name}</strong> • {targetPolicy.insurance_clients?.vehicle_number || ""}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">New Policy Number *</Label>
                  <Input value={wonPolicyNumber} onChange={e => setWonPolicyNumber(e.target.value.toUpperCase())} placeholder="e.g. OG-24-5678" className="h-9 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Insurer *</Label>
                  <Input value={wonInsurer} onChange={e => setWonInsurer(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Premium (₹)</Label>
                <Input type="number" value={wonPremium} onChange={e => setWonPremium(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New Expiry Date *</Label>
                <Input
                  type="date"
                  value={wonExpiryDate}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setWonExpiryDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWonDialog(false)}>Cancel</Button>
            <Button disabled={wonSaving || !wonExpiryDate || !wonPolicyNumber.trim() || !wonInsurer.trim()} onClick={handleWon} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {wonSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm Won
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RENEWAL LOST DIALOG with Retarget ── */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-600" /> Renewal Lost</DialogTitle></DialogHeader>
          {targetPolicy && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground"><strong>{targetPolicy.insurance_clients?.customer_name}</strong></p>
              <div className="flex flex-wrap gap-2">
                {LOST_REASONS.map(r => (
                  <Button key={r} variant={lostRemarks === r ? "default" : "outline"} size="sm" onClick={() => setLostRemarks(r)}>{r}</Button>
                ))}
              </div>
              <Textarea placeholder="Additional remarks..." value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} className="h-20" />
              <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-800">
                <div>
                  <p className="text-sm font-medium">🔄 Retarget Next Year?</p>
                  <p className="text-[10px] text-muted-foreground">Auto-follow up when policy is due</p>
                </div>
                <Switch checked={retargetNextYear} onCheckedChange={setRetargetNextYear} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLostDialog(false)}>Cancel</Button>
            <Button disabled={!lostRemarks} onClick={handleLost} className="bg-red-600 hover:bg-red-700 text-white">Mark as Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
