import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, XCircle, Clock, Inbox, Loader2, Eye, History, MessageSquare,
  Search, Filter, User, Send, ShieldCheck, ShieldX, Hourglass, FileDown, Printer, AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { SectionCard } from "../shared/SectionCard";
import { fmt, VERTICALS, STATUS_META } from "../../corporate-budget/types";
import { cn } from "@/lib/utils";
import { buildExportFilename } from "../shared/exportNaming";

type Decision = "approve" | "reject";
type StatusFilter = "all" | "pending_approval" | "approved" | "rejected";

const STATUS_TABS: { value: StatusFilter; label: string; icon: any; tone: string }[] = [
  { value: "pending_approval", label: "Pending", icon: Hourglass, tone: "amber" },
  { value: "approved", label: "Approved", icon: ShieldCheck, tone: "emerald" },
  { value: "rejected", label: "Rejected", icon: ShieldX, tone: "red" },
  { value: "all", label: "All", icon: Filter, tone: "slate" },
];

const TIMELINE_ICON: Record<string, { icon: any; bg: string; ring: string; text: string }> = {
  submit: { icon: Send, bg: "bg-blue-100", ring: "ring-blue-200", text: "text-blue-700" },
  approve: { icon: CheckCircle2, bg: "bg-emerald-100", ring: "ring-emerald-200", text: "text-emerald-700" },
  reject: { icon: XCircle, bg: "bg-red-100", ring: "ring-red-200", text: "text-red-700" },
  comment: { icon: MessageSquare, bg: "bg-slate-100", ring: "ring-slate-200", text: "text-slate-700" },
};

export const FounderApprovalQueue = () => {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);

  // ---- filters ----
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_approval");
  const [verticalFilter, setVerticalFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["founder-approval-queue", statusFilter],
    refetchInterval: 30000,
    queryFn: async () => {
      let q = (supabase.from("corporate_budgets") as any).select("*");
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q.order("submitted_at", { ascending: false });
      return data || [];
    },
  });

  // counts for status tabs
  const { data: statusCounts = { pending_approval: 0, approved: 0, rejected: 0, all: 0 } } = useQuery({
    queryKey: ["founder-approval-counts"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await (supabase.from("corporate_budgets") as any)
        .select("status");
      const rows = data || [];
      const counts: Record<string, number> = { pending_approval: 0, approved: 0, rejected: 0, all: rows.length };
      for (const r of rows) {
        if (r.status in counts) counts[r.status]++;
      }
      return counts;
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return queue.filter((b: any) => {
      if (verticalFilter !== "All") {
        // budgets don't directly carry vertical — check title/description
        const hay = `${b.title || ""} ${b.description || ""}`.toLowerCase();
        if (!hay.includes(verticalFilter.toLowerCase())) return false;
      }
      if (!s) return true;
      const hay = [b.title, b.description, b.submitted_by_name, b.approved_by_name, b.period_type]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [queue, verticalFilter, search]);

  const { data: lines = [] } = useQuery({
    queryKey: ["approval-budget-lines", openId],
    enabled: !!openId,
    queryFn: async () => {
      const { data } = await (supabase.from("corporate_budget_lines") as any)
        .select("*").eq("budget_id", openId).order("planned_amount", { ascending: false });
      return data || [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["approval-history", openId],
    enabled: !!openId,
    queryFn: async () => {
      const { data } = await (supabase.from("corporate_budget_approvals") as any)
        .select("*").eq("budget_id", openId).order("created_at", { ascending: true });
      return data || [];
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, decision, note }: { id: string; decision: Decision; note: string }) => {
      const trimmed = note.trim();
      if (decision === "reject" && !trimmed) {
        throw new Error("Rejection reason is required — please add a comment so the team can act on it.");
      }
      if (decision === "reject" && trimmed.length < 5) {
        throw new Error("Rejection reason is too short — add a clear, actionable note (≥ 5 characters).");
      }
      const { data: u } = await supabase.auth.getUser();
      const userName = u?.user?.user_metadata?.full_name || u?.user?.email || "Founder";
      const newStatus = decision === "approve" ? "approved" : "rejected";

      const updates: any = {
        status: newStatus,
        approved_by: u?.user?.id || null,
        approved_by_name: userName,
        approved_at: new Date().toISOString(),
      };
      if (decision === "reject") updates.rejection_reason = trimmed;

      const { error: e1 } = await (supabase.from("corporate_budgets") as any).update(updates).eq("id", id);
      if (e1) throw e1;

      const { error: e2 } = await (supabase.from("corporate_budget_approvals") as any).insert({
        budget_id: id,
        action: decision,
        actor_id: u?.user?.id || null,
        actor_name: userName,
        previous_status: "pending_approval",
        new_status: newStatus,
        comment: trimmed || null,
      });
      if (e2) throw e2;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.decision === "approve" ? "Budget approved" : "Budget rejected");
      qc.invalidateQueries({ queryKey: ["founder-approval-queue"] });
      qc.invalidateQueries({ queryKey: ["founder-approval-counts"] });
      qc.invalidateQueries({ queryKey: ["founder-final-approvals"] });
      qc.invalidateQueries({ queryKey: ["cfo-budgets-overview"] });
      qc.invalidateQueries({ queryKey: ["cfo-approvals-queue"] });
      qc.invalidateQueries({ queryKey: ["approval-history", openId] });
      setComment("");
      setPendingDecision(null);
      setOpenId(null);
    },
    onError: (e: any) => toast.error(e?.message || "Decision failed"),
  });

  const open = queue.find((b: any) => b.id === openId);

  // ---- Build full audit timeline (synthetic submission event + recorded approvals) ----
  const timeline = useMemo(() => {
    if (!open) return [] as any[];
    const events: any[] = [];
    if (open.submitted_at) {
      events.push({
        id: "submitted",
        action: "submit",
        actor_name: open.submitted_by_name || "—",
        previous_status: "draft",
        new_status: "pending_approval",
        comment: open.description ? null : null,
        created_at: open.submitted_at,
      });
    }
    for (const h of history) events.push(h);
    // sort ascending
    events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return events;
  }, [open, history]);

  const cardTone = (status: string) => {
    if (status === "approved") return "border-emerald-200 bg-emerald-50/30";
    if (status === "rejected") return "border-red-200 bg-red-50/30";
    return "border-amber-200 bg-amber-50/30";
  };

  // ---- Audit timeline exports ----
  const exportTimelineCSV = () => {
    if (!open) return;
    const rows: string[] = [];
    rows.push(`"Approval Audit Trail","${(open.title || "").replace(/"/g, '""')}"`);
    rows.push(`"Period","${open.period_start} → ${open.period_end}"`);
    rows.push(`"Status","${open.status}"`);
    rows.push(`"Total Planned","${open.total_planned}"`);
    rows.push("");
    rows.push('"#","Timestamp","Action","Actor","Previous Status","New Status","Comment"');
    timeline.forEach((ev: any, i: number) => {
      rows.push([
        i + 1,
        `"${format(new Date(ev.created_at), "yyyy-MM-dd HH:mm:ss")}"`,
        `"${ev.action}"`,
        `"${(ev.actor_name || "—").replace(/"/g, '""')}"`,
        `"${ev.previous_status || ""}"`,
        `"${ev.new_status || ""}"`,
        `"${(ev.comment || "").replace(/"/g, '""')}"`,
      ].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildExportFilename({
      module: "founder-approval",
      scope: `audit-${(open.title || "plan").slice(0, 24)}`,
      ext: "csv",
    });
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit trail exported");
  };

  const exportTimelinePDF = () => {
    if (!open) return;
    const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inr = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

    // ---- Allocation breakup ----
    const totalPlanned = lines.reduce((s: number, l: any) => s + Number(l.planned_amount || 0), 0);
    const linesByVertical: Record<string, { count: number; total: number }> = {};
    const linesByCategory: Record<string, { count: number; total: number }> = {};
    for (const l of lines) {
      const v = l.vertical || "All";
      const c = l.category_name || "Uncategorised";
      linesByVertical[v] = linesByVertical[v] || { count: 0, total: 0 };
      linesByVertical[v].count++;
      linesByVertical[v].total += Number(l.planned_amount || 0);
      linesByCategory[c] = linesByCategory[c] || { count: 0, total: 0 };
      linesByCategory[c].count++;
      linesByCategory[c].total += Number(l.planned_amount || 0);
    }

    const allocationRows = lines.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:14px">No allocation lines recorded.</td></tr>`
      : lines.map((l: any, i: number) => {
          const pct = totalPlanned > 0 ? (Number(l.planned_amount || 0) / totalPlanned) * 100 : 0;
          return `<tr>
            <td>${i + 1}</td>
            <td><strong>${esc(l.category_name || "—")}</strong></td>
            <td>${esc(l.vertical || "All")}</td>
            <td>${esc(l.department || "All")}</td>
            <td style="text-align:right" class="num">${inr(l.planned_amount)}<div class="pct">${pct.toFixed(1)}%</div></td>
            <td class="notes">${esc(l.notes || "—")}</td>
          </tr>`;
        }).join("");

    const verticalSummaryRows = Object.entries(linesByVertical)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([v, info]) => `<tr>
        <td>${esc(v)}</td>
        <td style="text-align:center">${info.count}</td>
        <td style="text-align:right" class="num">${inr(info.total)}</td>
        <td style="text-align:right" class="num">${totalPlanned > 0 ? ((info.total / totalPlanned) * 100).toFixed(1) : "0"}%</td>
      </tr>`).join("");

    const categorySummaryRows = Object.entries(linesByCategory)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([c, info]) => `<tr>
        <td>${esc(c)}</td>
        <td style="text-align:center">${info.count}</td>
        <td style="text-align:right" class="num">${inr(info.total)}</td>
        <td style="text-align:right" class="num">${totalPlanned > 0 ? ((info.total / totalPlanned) * 100).toFixed(1) : "0"}%</td>
      </tr>`).join("");

    // ---- Audit timeline rows ----
    const actionLabel = (a: string) =>
      a === "submit" ? "Submitted" : a === "approve" ? "Approved" : a === "reject" ? "Rejected" : a;
    const actionColor = (a: string) =>
      a === "approve" ? "#059669" : a === "reject" ? "#dc2626" : a === "submit" ? "#2563eb" : "#475569";

    const timelineRows = timeline.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:14px">No audit events recorded.</td></tr>`
      : timeline.map((ev: any, i: number) => `<tr>
          <td>${i + 1}</td>
          <td class="num">${format(new Date(ev.created_at), "dd MMM yyyy")}<div class="muted-sm">${format(new Date(ev.created_at), "HH:mm:ss")}</div></td>
          <td><strong style="color:${actionColor(ev.action)}">${actionLabel(ev.action)}</strong></td>
          <td>${esc(ev.actor_name || "—")}</td>
          <td><span class="pill">${esc((ev.previous_status || "").replace(/_/g, " "))}</span> → <span class="pill pill-strong">${esc((ev.new_status || "").replace(/_/g, " "))}</span></td>
          <td class="notes">${ev.comment ? `<em>"${esc(ev.comment)}"</em>` : "—"}</td>
        </tr>`).join("");

    // ---- Status / decision strip ----
    const submittedBlock = open.submitted_at
      ? `${format(new Date(open.submitted_at), "dd MMM yyyy, HH:mm")} by ${esc(open.submitted_by_name || "—")}`
      : "—";
    const approvedBlock = open.approved_at
      ? `${format(new Date(open.approved_at), "dd MMM yyyy, HH:mm")} by ${esc(open.approved_by_name || "—")}`
      : "—";

    const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Approval Audit · ${esc(open.title || "")}</title>
<style>
@page { size: A4; margin: 18mm 14mm; }
* { box-sizing: border-box; }
body { font-family: Georgia, 'Times New Roman', serif; color:#0f172a; margin:0; padding:0; font-size:12px; line-height:1.45; }
.wrap { max-width: 900px; margin: 0 auto; padding: 8px 4px 24px; }
header { border-bottom: 3px double #0f172a; padding-bottom:10px; margin-bottom:14px; }
header .brand { font-size:10px; letter-spacing:2px; color:#64748b; text-transform:uppercase; }
header h1 { font-size:22px; margin:4px 0 2px; letter-spacing:.3px; }
header .sub { font-size:11px; color:#475569; }
.meta-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin:14px 0; }
.meta-card { border:1px solid #e2e8f0; border-radius:6px; padding:9px 10px; background:#f8fafc; }
.meta-card .label { font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#64748b; font-family: Arial, sans-serif; }
.meta-card .val { font-size:14px; font-weight:600; margin-top:3px; font-family: Arial, sans-serif; word-break:break-word; }
.meta-card .val.cap { text-transform:capitalize; }
.section { margin-top:18px; page-break-inside:auto; }
.section-title { font-size:13px; font-weight:700; border-left:4px solid #0f172a; padding:2px 8px; margin-bottom:8px; background:#f1f5f9; }
.section-sub { font-size:10px; color:#64748b; margin: -4px 0 8px 12px; }
table { width:100%; border-collapse:collapse; font-family: Arial, sans-serif; font-size:10.5px; }
th, td { padding: 6px 8px; border-bottom:1px solid #e2e8f0; text-align:left; vertical-align:top; }
th { background:#0f172a; color:#fff; font-size:9.5px; letter-spacing:1px; text-transform:uppercase; font-weight:600; }
tr:nth-child(even) td { background:#fafbfc; }
tfoot td { background:#0f172a !important; color:#fff; font-weight:700; }
.num { font-variant-numeric: tabular-nums; }
.notes { color:#475569; font-style: italic; max-width:240px; }
.muted-sm { font-size:9px; color:#94a3b8; font-weight:normal; }
.pct { font-size:9px; color:#94a3b8; font-weight:normal; }
.pill { display:inline-block; padding:1px 7px; border-radius:10px; background:#e2e8f0; color:#334155; font-size:9.5px; text-transform:capitalize; font-family: Arial; }
.pill-strong { background:#0f172a; color:#fff; }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.kv { font-size:11px; }
.kv .k { color:#64748b; font-family: Arial; font-size:9.5px; text-transform:uppercase; letter-spacing:1px; }
.kv .v { font-weight:600; margin-top:2px; }
.callout { border:1px solid #e2e8f0; border-left:4px solid #64748b; padding:10px 12px; border-radius:4px; background:#f8fafc; margin-top:8px; font-size:11px; }
.callout.approved { border-left-color:#059669; background:#ecfdf5; }
.callout.rejected { border-left-color:#dc2626; background:#fef2f2; }
.callout .head { font-family: Arial; font-size:9.5px; text-transform:uppercase; letter-spacing:1.2px; color:#475569; margin-bottom:3px; }
footer { margin-top:24px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:9.5px; color:#64748b; display:flex; justify-content:space-between; }
.sig { margin-top:36px; display:grid; grid-template-columns:1fr 1fr; gap:40px; font-size:11px; }
.sig .line { border-top:1px solid #0f172a; padding-top:4px; text-align:center; color:#475569; }
@media print { .section { page-break-inside: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } thead { display: table-header-group; } }
</style></head><body><div class="wrap">

<header>
  <div class="brand">Grab Your Car · Finance Office · Founder Approval Audit</div>
  <h1>Budget Plan Audit Report</h1>
  <div class="sub"><strong>${esc(open.title || "Untitled Plan")}</strong> · Generated ${format(new Date(), "dd MMM yyyy, HH:mm")}</div>
</header>

<div class="meta-grid">
  <div class="meta-card"><div class="label">Period</div><div class="val">${esc(open.period_start)} → ${esc(open.period_end)}</div></div>
  <div class="meta-card"><div class="label">Period Type</div><div class="val cap">${esc(open.period_type || "—")}</div></div>
  <div class="meta-card"><div class="label">Status</div><div class="val cap" style="color:${actionColor(open.status === "approved" ? "approve" : open.status === "rejected" ? "reject" : "submit")}">${esc((open.status || "").replace(/_/g, " "))}</div></div>
  <div class="meta-card"><div class="label">Total Planned</div><div class="val">${inr(open.total_planned)}</div></div>
</div>

<div class="section">
  <div class="section-title">1 · Plan Summary</div>
  <div class="two-col">
    <div class="kv"><div class="k">Submitted</div><div class="v">${submittedBlock}</div></div>
    <div class="kv"><div class="k">${open.status === "rejected" ? "Rejected" : "Approved"}</div><div class="v">${approvedBlock}</div></div>
  </div>
  ${open.description ? `<div class="callout"><div class="head">Description / Justification</div>${esc(open.description)}</div>` : ""}
  ${open.status === "approved" ? `<div class="callout approved"><div class="head">Founder Sign-off</div>Plan approved by <strong>${esc(open.approved_by_name || "—")}</strong>${open.approved_at ? " on " + format(new Date(open.approved_at), "dd MMM yyyy, HH:mm") : ""}.</div>` : ""}
  ${open.status === "rejected" && open.rejection_reason ? `<div class="callout rejected"><div class="head">Rejection Reason</div>${esc(open.rejection_reason)}</div>` : ""}
</div>

<div class="section">
  <div class="section-title">2 · Allocation Breakup</div>
  <div class="section-sub">${lines.length} allocation line${lines.length === 1 ? "" : "s"} · totalling ${inr(totalPlanned)}</div>
  <table>
    <thead><tr><th style="width:24px">#</th><th>Category</th><th>Vertical</th><th>Department</th><th style="text-align:right;width:110px">Planned</th><th>Notes</th></tr></thead>
    <tbody>${allocationRows}</tbody>
    ${lines.length > 0 ? `<tfoot><tr><td colspan="4" style="text-align:right">Grand Total</td><td style="text-align:right" class="num">${inr(totalPlanned)}</td><td></td></tr></tfoot>` : ""}
  </table>
</div>

${verticalSummaryRows ? `<div class="section">
  <div class="section-title">3 · Spend by Vertical</div>
  <table>
    <thead><tr><th>Vertical</th><th style="text-align:center;width:60px">Lines</th><th style="text-align:right;width:120px">Planned</th><th style="text-align:right;width:80px">Share</th></tr></thead>
    <tbody>${verticalSummaryRows}</tbody>
  </table>
</div>` : ""}

${categorySummaryRows ? `<div class="section">
  <div class="section-title">4 · Spend by Category</div>
  <table>
    <thead><tr><th>Category</th><th style="text-align:center;width:60px">Lines</th><th style="text-align:right;width:120px">Planned</th><th style="text-align:right;width:80px">Share</th></tr></thead>
    <tbody>${categorySummaryRows}</tbody>
  </table>
</div>` : ""}

<div class="section">
  <div class="section-title">5 · Full Audit Trail &amp; Decision History</div>
  <div class="section-sub">${timeline.length} event${timeline.length === 1 ? "" : "s"} · all timestamps recorded server-side, fully traceable</div>
  <table>
    <thead><tr><th style="width:24px">#</th><th style="width:110px">Timestamp</th><th style="width:90px">Action</th><th style="width:130px">Actor</th><th>Transition</th><th>Remarks / Comment</th></tr></thead>
    <tbody>${timelineRows}</tbody>
  </table>
</div>

<div class="sig">
  <div class="line">Prepared by — Finance Office</div>
  <div class="line">Approved by — ${esc(open.approved_by_name || "Founder")}</div>
</div>

<footer>
  <div>Confidential · Grab Your Car Finance Office</div>
  <div>Plan ID: ${esc((open.id || "").slice(0, 8))} · Generated ${format(new Date(), "dd MMM yyyy HH:mm:ss")}</div>
</footer>

</div></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  const rejectionInvalid = pendingDecision === "reject" && comment.trim().length < 5;

  return (
    <SectionCard
      title="Founder Approval Queue"
      description="Audit-traceable approvals · filter by status, vertical & title"
      icon={Inbox}
      className="lg:col-span-3"
      action={
        statusCounts.pending_approval > 0 ? (
          <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
            <Clock className="h-3 w-3" /> {statusCounts.pending_approval} pending
          </Badge>
        ) : (
          <Badge className="bg-emerald-100 text-emerald-700 border-0">All clear</Badge>
        )
      }
    >
      {/* ---- Filters ---- */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit overflow-x-auto">
          {STATUS_TABS.map((t) => {
            const Icon = t.icon;
            const count = statusCounts[t.value] ?? 0;
            const active = statusFilter === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setStatusFilter(t.value)}
                className={cn(
                  "px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1.5",
                  active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Icon className="h-3 w-3" /> {t.label}
                <span className={cn(
                  "ml-0.5 px-1.5 rounded-full text-[10px] tabular-nums",
                  active ? "bg-slate-100 text-slate-700" : "bg-slate-200/70 text-slate-600"
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2 relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, description or submitter…"
              className="h-8 text-xs pl-8"
            />
          </div>
          <Select value={verticalFilter} onValueChange={setVerticalFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filter by vertical" />
            </SelectTrigger>
            <SelectContent>
              {VERTICALS.map((v) => (
                <SelectItem key={v} value={v}>{v === "All" ? "All Verticals" : v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">Loading queue…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">
            {search || verticalFilter !== "All" ? "No matches" : "Inbox Zero"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {search || verticalFilter !== "All"
              ? "Adjust filters or search to see more plans."
              : "No budget plans in this status."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b: any) => {
            const meta = STATUS_META[b.status];
            return (
              <div key={b.id} className={cn("rounded-lg border p-3", cardTone(b.status))}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-slate-900 truncate">{b.title}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{b.period_type}</Badge>
                      {meta && (
                        <Badge className={cn("text-[10px] border-0", meta.bg, meta.color)}>
                          {meta.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {b.period_start} → {b.period_end} · submitted by {b.submitted_by_name || "—"}
                      {b.submitted_at && ` · ${format(new Date(b.submitted_at), "dd MMM, p")}`}
                    </p>
                    {b.status === "approved" && b.approved_by_name && (
                      <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Approved by {b.approved_by_name}
                        {b.approved_at && ` · ${format(new Date(b.approved_at), "dd MMM, p")}`}
                      </p>
                    )}
                    {b.status === "rejected" && b.rejection_reason && (
                      <p className="text-[11px] text-red-700 mt-1 truncate">
                        Reason: {b.rejection_reason}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{fmt(b.total_planned)}</p>
                    <p className="text-[10px] text-slate-500">total planned</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => { setOpenId(b.id); setPendingDecision(null); setComment(""); }}>
                    <Eye className="h-3 w-3" /> Review
                  </Button>
                  {b.status === "pending_approval" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => { setOpenId(b.id); setPendingDecision("reject"); setComment(""); }}>
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                      <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => { setOpenId(b.id); setPendingDecision("approve"); setComment(""); }}>
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setPendingDecision(null); setComment(""); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{open?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {open && (
                <>
                  {open.period_start} → {open.period_end} · submitted by {open.submitted_by_name || "—"}
                  {open.submitted_at && ` · ${format(new Date(open.submitted_at), "dd MMM, p")}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {open && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-slate-50/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Planned</p>
                  <p className="text-base font-serif font-semibold mt-1 tabular-nums">{fmt(open.total_planned)}</p>
                </div>
                <div className="rounded-lg border bg-slate-50/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Period Type</p>
                  <p className="text-base font-serif font-semibold mt-1 capitalize">{open.period_type}</p>
                </div>
                <div className="rounded-lg border bg-slate-50/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Allocations</p>
                  <p className="text-base font-serif font-semibold mt-1 tabular-nums">{lines.length}</p>
                </div>
              </div>

              {open.description && (
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700">{open.description}</p>
                </div>
              )}

              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  <div className="col-span-4">Category</div>
                  <div className="col-span-3">Vertical / Dept</div>
                  <div className="col-span-2 text-right">Planned</div>
                  <div className="col-span-3">Notes</div>
                </div>
                <div className="divide-y max-h-64 overflow-y-auto">
                  {lines.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-500">No allocation lines.</div>
                  ) : lines.map((l: any) => (
                    <div key={l.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs bg-white">
                      <div className="col-span-4 font-medium">{l.category_name}</div>
                      <div className="col-span-3 text-slate-600">{l.vertical || "All"} · {l.department || "All"}</div>
                      <div className="col-span-2 text-right tabular-nums font-semibold">{fmt(l.planned_amount)}</div>
                      <div className="col-span-3 text-slate-500 truncate">{l.notes || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- AUDIT TIMELINE ---- */}
              <div className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <History className="h-3.5 w-3.5" /> Audit Trail
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {timeline.length} {timeline.length === 1 ? "event" : "events"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
                      onClick={exportTimelineCSV} disabled={timeline.length === 0}>
                      <FileDown className="h-3 w-3" /> CSV
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
                      onClick={exportTimelinePDF} disabled={timeline.length === 0}>
                      <Printer className="h-3 w-3" /> PDF
                    </Button>
                  </div>
                </div>
                {timeline.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No audit events recorded yet.</p>
                ) : (
                  <div className="relative pl-6">
                    {/* vertical line */}
                    <div className="absolute left-[11px] top-1 bottom-1 w-px bg-slate-200" />
                    <div className="space-y-3">
                      {timeline.map((ev: any) => {
                        const meta = TIMELINE_ICON[ev.action] || TIMELINE_ICON.comment;
                        const Icon = meta.icon;
                        return (
                          <div key={ev.id} className="relative">
                            <div className={cn(
                              "absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white",
                              meta.bg
                            )}>
                              <Icon className={cn("h-3 w-3", meta.text)} />
                            </div>
                            <div className="text-xs">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className={cn("font-semibold capitalize", meta.text)}>
                                  {ev.action === "submit" ? "Submitted" : ev.action === "approve" ? "Approved" : ev.action === "reject" ? "Rejected" : ev.action}
                                </span>
                                <span className="text-slate-700 flex items-center gap-1">
                                  <User className="h-2.5 w-2.5" /> {ev.actor_name || "—"}
                                </span>
                                {ev.previous_status && ev.new_status && (
                                  <span className="text-[10px] text-slate-500">
                                    {ev.previous_status.replace("_", " ")} → {ev.new_status.replace("_", " ")}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                                {format(new Date(ev.created_at), "dd MMM yyyy · HH:mm:ss")} ·{" "}
                                <span className="italic">{formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}</span>
                              </div>
                              {ev.comment && (
                                <div className="mt-1.5 rounded-md bg-slate-50 border border-slate-100 px-2.5 py-1.5 text-[11px] text-slate-700 italic">
                                  "{ev.comment}"
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Decision panel — only shown when pending */}
              {open.status === "pending_approval" && (
                <div className={cn("rounded-lg border p-3",
                  pendingDecision === "approve" ? "border-emerald-300 bg-emerald-50/40" :
                  pendingDecision === "reject" ? "border-red-300 bg-red-50/40" :
                  "border-slate-200 bg-slate-50/30")}>
                  <div className="flex items-center justify-between gap-1.5 text-xs font-medium text-slate-700 mb-2">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" />
                      {pendingDecision === "reject" ? (
                        <>Rejection reason <span className="text-red-600">(required, min 5 chars)</span></>
                      ) : pendingDecision === "approve" ? "Approval note (optional)"
                       : "Add comment (optional)"}
                    </span>
                    {pendingDecision === "reject" && (
                      <span className={cn("text-[10px] tabular-nums",
                        rejectionInvalid ? "text-red-600" : "text-emerald-700")}>
                        {comment.trim().length}/5+
                      </span>
                    )}
                  </div>
                  <Textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className={cn(pendingDecision === "reject" && rejectionInvalid && "border-red-400 focus-visible:ring-red-300")}
                    placeholder={pendingDecision === "reject"
                      ? "Explain why this plan needs revision (required for audit trail)..."
                      : "Sign-off note for the team..."}
                  />
                  {pendingDecision === "reject" && rejectionInvalid && (
                    <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      A clear rejection reason is required so the team can act on the feedback.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setOpenId(null); setPendingDecision(null); setComment(""); }}
              disabled={decideMutation.isPending}>
              Close
            </Button>
            {open?.status === "pending_approval" && (
              <>
                <Button variant="outline" className="gap-1 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setPendingDecision("reject");
                    if (rejectionInvalid) {
                      toast.error("Add a rejection reason (min 5 characters) before rejecting.");
                      return;
                    }
                    openId && decideMutation.mutate({ id: openId, decision: "reject", note: comment });
                  }}
                  disabled={decideMutation.isPending || (pendingDecision === "reject" && rejectionInvalid)}>
                  {decideMutation.isPending && pendingDecision === "reject" && <Loader2 className="h-3 w-3 animate-spin" />}
                  <XCircle className="h-3 w-3" /> Reject
                </Button>
                <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => openId && decideMutation.mutate({ id: openId, decision: "approve", note: comment })}
                  disabled={decideMutation.isPending}>
                  {decideMutation.isPending && pendingDecision !== "reject" && <Loader2 className="h-3 w-3 animate-spin" />}
                  <CheckCircle2 className="h-3 w-3" /> Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
};

export default FounderApprovalQueue;
