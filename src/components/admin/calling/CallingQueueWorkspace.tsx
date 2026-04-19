import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Phone, PhoneCall, PhoneOff, Upload, FileSpreadsheet,
  SkipForward, Trash2, UserPlus, ListChecks,
} from "lucide-react";
import ExcelJS from "exceljs";
import { CallingFilterSidebar, type CallingFilter } from "./CallingFilterSidebar";
import { CallingUploadHistory } from "./CallingUploadHistory";
import { MandatoryDispositionDialog } from "./MandatoryDispositionDialog";

/* ─────────────────────────────────────────────────────────────
   Unified Calling Queue Workspace (Sridhar/Knowlarity style)

   - One number at a time → dial → call ends → MANDATORY blocking
     disposition modal (Hot / Interested / Callback / Not Interested
     / No Answer / Busy / Wrong / DND).
   - Hot/Interested/Callback REQUIRE remarks, Hot+Callback require a
     follow-up datetime.
   - After save → 2-second countdown → next pending number auto-loads.
   - Real-time filter sidebar shows live counts per status with
     instant click-to-filter.
   - Permanent upload history (every CSV/Excel saved to Storage with
     re-download + conversion stats).
   ───────────────────────────────────────────────────────────── */

export interface CallingQueueWorkspaceProps {
  verticalSlug: string;
  verticalLabel: string;
  accentClass?: string;
}

const STATUS_CATEGORY_MAP: Record<string, string> = {
  hot: "hot",
  interested: "interested",
  callback: "callback",
  not_interested: "not_interested",
  no_answer: "no_answer",
  busy: "busy",
  wrong_number: "wrong_number",
  dnd: "dnd",
};

const COMPLETED_DISPOSITIONS = new Set([
  "hot", "interested", "not_interested", "wrong_number", "dnd",
]);

function normalizePhone(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

async function parseSpreadsheet(file: File): Promise<{ phone: string; name?: string; email?: string; city?: string }[]> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = new TextDecoder().decode(buf);
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));
    return mapRows(headers, rows);
  }
  await wb.xlsx.load(buf);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, col) => { headers[col - 1] = String(cell.value ?? "").trim().toLowerCase(); });
  const rows: string[][] = [];
  sheet.eachRow((row, rowIdx) => {
    if (rowIdx === 1) return;
    const r: string[] = [];
    row.eachCell((cell, col) => { r[col - 1] = String(cell.value ?? "").trim(); });
    if (r.some(Boolean)) rows.push(r);
  });
  return mapRows(headers, rows);
}

function mapRows(headers: string[], rows: string[][]) {
  const findIdx = (...candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h?.includes(c)));
  const idxPhone = findIdx("phone", "mobile", "contact", "number");
  const idxName  = findIdx("name", "customer");
  const idxEmail = findIdx("email", "mail");
  const idxCity  = findIdx("city", "location", "town");
  const out: { phone: string; name?: string; email?: string; city?: string }[] = [];
  for (const r of rows) {
    const phone = normalizePhone(r[idxPhone] || r[0]);
    if (phone.length < 10) continue;
    out.push({
      phone,
      name:  idxName  >= 0 ? r[idxName]  : undefined,
      email: idxEmail >= 0 ? r[idxEmail] : undefined,
      city:  idxCity  >= 0 ? r[idxCity]  : undefined,
    });
  }
  return out;
}

export function CallingQueueWorkspace({ verticalSlug, verticalLabel, accentClass }: CallingQueueWorkspaceProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showImportFor, setShowImportFor] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [showDispoModal, setShowDispoModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [filter, setFilter] = useState<CallingFilter>("all");

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  /* ── load campaigns ── */
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["calling-queue-campaigns", verticalSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_dialer_campaigns")
        .select("*")
        .eq("vertical_slug", verticalSlug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  /* ── live realtime: refetch on any contact change in this vertical ── */
  useEffect(() => {
    const ch = supabase
      .channel(`calling-workspace-${verticalSlug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auto_dialer_contacts" },
        () => qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "auto_dialer_campaigns" },
        () => qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [verticalSlug, qc]);

  /* ── create campaign ── */
  const createCampaign = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error("Campaign name required");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("auto_dialer_campaigns")
        .insert({
          name: newName.trim(),
          description: newDescription.trim() || null,
          vertical: verticalSlug,
          vertical_slug: verticalSlug,
          status: "draft",
          created_by: user?.id ?? null,
          assigned_user_id: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
      setShowCreate(false);
      setNewName(""); setNewDescription("");
      toast.success("Campaign created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("auto_dialer_contacts").delete().eq("campaign_id", id);
      const { error } = await supabase.from("auto_dialer_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
      toast.success("Campaign deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── import: file → upload to Storage → save upload row → insert contacts ── */
  async function importContactsFromFile(campaignId: string, file: File) {
    try {
      const rows = await parseSpreadsheet(file);
      if (!rows.length) {
        toast.error("No valid phone numbers found");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();

      // 1. upload original file
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${verticalSlug}/${campaignId}/${Date.now()}_${safeName}`;
      const up = await supabase.storage.from("calling-uploads").upload(path, file, {
        upsert: false, contentType: file.type || "application/octet-stream",
      });
      let storagePath: string | null = null;
      let storageUrl: string | null = null;
      if (!up.error) {
        storagePath = path;
        storageUrl = supabase.storage.from("calling-uploads").getPublicUrl(path).data.publicUrl;
      }

      await importRows(campaignId, rows, file.name, file.size, storagePath, storageUrl, user?.email || null, user?.id || null);
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    }
  }

  async function importContactsFromPaste(campaignId: string) {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows = lines.map((line) => {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      const phone = normalizePhone(parts[0]);
      return { phone, name: parts[1] || undefined, email: parts[2] || undefined, city: parts[3] || undefined };
    }).filter((r) => r.phone.length >= 10);
    if (!rows.length) { toast.error("No valid numbers in paste"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await importRows(campaignId, rows, "Pasted list", null, null, null, user?.email || null, user?.id || null);
  }

  async function importRows(
    campaignId: string,
    rows: { phone: string; name?: string; email?: string; city?: string }[],
    sourceLabel: string,
    fileSize: number | null,
    storagePath: string | null,
    storageUrl: string | null,
    userEmail: string | null,
    userId: string | null,
  ) {
    // dedupe within campaign
    const { data: existing } = await supabase
      .from("auto_dialer_contacts").select("phone").eq("campaign_id", campaignId);
    const seen = new Set((existing || []).map((r: any) => normalizePhone(r.phone)));
    const fresh: typeof rows = [];
    let dupes = 0;
    for (const r of rows) {
      if (seen.has(r.phone)) { dupes++; continue; }
      seen.add(r.phone);
      fresh.push(r);
    }

    // 1. create upload row first
    const { data: uploadRow, error: uErr } = await supabase
      .from("auto_dialer_uploads")
      .insert({
        campaign_id: campaignId,
        vertical_slug: verticalSlug,
        filename: sourceLabel,
        file_size_bytes: fileSize,
        storage_path: storagePath,
        storage_url: storageUrl,
        total_rows: rows.length,
        imported_rows: fresh.length,
        duplicate_rows: dupes,
        invalid_rows: 0,
        uploaded_by: userId,
        uploaded_by_email: userEmail,
      })
      .select().single();
    if (uErr) console.warn("upload row err", uErr);

    if (fresh.length) {
      const payload = fresh.map((r) => ({
        campaign_id: campaignId,
        phone: r.phone,
        name: r.name || null,
        email: r.email || null,
        city: r.city || null,
        call_status: "pending",
        status_category: "pending",
        dial_attempts: 0,
        upload_id: uploadRow?.id || null,
      }));
      const { error } = await supabase.from("auto_dialer_contacts").insert(payload);
      if (error) { toast.error(error.message); return; }
    }

    // recount + activate campaign
    await refreshCampaignStats(campaignId);
    await supabase.from("auto_dialer_campaigns").update({
      status: "active",
      last_import_filename: sourceLabel,
      import_count: (campaigns.find((c: any) => c.id === campaignId)?.import_count || 0) + 1,
    }).eq("id", campaignId);

    qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });
    qc.invalidateQueries({ queryKey: ["calling-uploads", verticalSlug] });

    if (fresh.length) {
      toast.success(`Imported ${fresh.length}${dupes ? ` (skipped ${dupes} dupes)` : ""}`);
    } else {
      toast.info("All numbers already in this campaign");
    }
    setShowImportFor(null);
    setPasteText("");
  }

  /* ── pull next pending contact respecting filter ── */
  async function pullNextContact(campaignId: string, filterKey: CallingFilter = "pending") {
    let q = supabase
      .from("auto_dialer_contacts")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (filterKey === "pending" || filterKey === "all") {
      q = q.in("call_status", ["pending", "retry"]);
    } else if (filterKey === "callback") {
      q = q.eq("status_category", "callback");
    } else {
      q = q.eq("status_category", filterKey);
    }

    const { data, error } = await q.maybeSingle();
    if (error) { toast.error(error.message); return null; }
    if (!data) {
      setActiveContact(null);
      toast.success("🎉 Queue complete — no more numbers in this filter");
      return null;
    }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("auto_dialer_contacts").update({
      call_status: "calling",
      called_at: new Date().toISOString(),
      last_dialed_at: new Date().toISOString(),
      dial_attempts: (data.dial_attempts || 0) + 1,
      dialed_by: user?.id ?? null,
    }).eq("id", data.id);
    setActiveContact({ ...data, dial_attempts: (data.dial_attempts || 0) + 1 });
    return data;
  }

  function startCalling(campaignId: string) {
    setActiveCampaignId(campaignId);
    pullNextContact(campaignId, "pending");
  }

  /** Called when agent confirms call has ended (button) — opens blocking modal. */
  function endCallOpenModal() {
    if (!activeContact) return;
    setShowDispoModal(true);
  }

  /* ── save disposition (BLOCKING) → 2s countdown → auto-load next ── */
  async function handleSaveDisposition(payload: { disposition: string; remarks: string; followUpAt: string | null }) {
    if (!activeContact || !activeCampaignId) return;
    const cat = STATUS_CATEGORY_MAP[payload.disposition] || payload.disposition;
    const callStatus =
      payload.disposition === "callback" ? "callback" :
      payload.disposition === "busy" ? "retry" :
      payload.disposition === "no_answer" ? "no_answer" :
      COMPLETED_DISPOSITIONS.has(payload.disposition) ? "completed" : "completed";

    const { data: { user } } = await supabase.auth.getUser();

    // 1. update contact
    await supabase.from("auto_dialer_contacts").update({
      call_status: callStatus,
      status_category: cat,
      disposition: payload.disposition,
      disposition_remarks: payload.remarks || null,
      notes: payload.remarks || null,
      follow_up_date: payload.followUpAt,
      updated_at: new Date().toISOString(),
    }).eq("id", activeContact.id);

    // 2. immutable audit row
    await supabase.from("auto_dialer_dispositions").insert({
      contact_id: activeContact.id,
      campaign_id: activeCampaignId,
      vertical_slug: verticalSlug,
      phone: activeContact.phone,
      customer_name: activeContact.name || null,
      disposition: payload.disposition,
      remarks: payload.remarks || null,
      follow_up_at: payload.followUpAt,
      attempt_number: activeContact.dial_attempts || 1,
      dialed_by: user?.id ?? null,
      dialed_by_email: user?.email ?? null,
    });

    // 3. if HOT/INTERESTED → auto-create vertical lead now
    if (payload.disposition === "hot" || payload.disposition === "interested") {
      try {
        const { data } = await supabase.functions.invoke("submit-lead", {
          body: {
            name: activeContact.name || "Calling Lead",
            phone: activeContact.phone,
            email: activeContact.email || undefined,
            city: activeContact.city || undefined,
            source: "calling_queue",
            serviceCategory: verticalSlug,
            vertical: verticalSlug,
            message: `${payload.disposition === "hot" ? "🔥 HOT — " : ""}${payload.remarks}`,
          },
        });
        const leadId = (data as any)?.lead_id || (data as any)?.id || null;
        if (leadId) {
          await supabase.from("auto_dialer_contacts").update({ lead_id: leadId }).eq("id", activeContact.id);
        }
      } catch (e) { console.warn("auto-lead failed", e); }
    }

    await refreshCampaignStats(activeCampaignId);
    qc.invalidateQueries({ queryKey: ["calling-queue-campaigns", verticalSlug] });

    setShowDispoModal(false);
    toast.success("Saved — next number in 2s");

    // 2-second countdown then auto-load next
    setCountdown(2);
    let n = 2;
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(t);
        setCountdown(null);
        pullNextContact(activeCampaignId!, "pending");
      } else {
        setCountdown(n);
      }
    }, 1000);
  }

  async function refreshCampaignStats(campaignId: string) {
    const { data: rows } = await supabase
      .from("auto_dialer_contacts")
      .select("call_status, status_category")
      .eq("campaign_id", campaignId);
    const counts = {
      total: rows?.length || 0,
      pending: 0, completed: 0, hot: 0, interested: 0, not_interested: 0,
      no_answer: 0, callback: 0, busy: 0, dnd: 0, wrong_number: 0,
    };
    (rows || []).forEach((r: any) => {
      if (r.call_status === "pending") counts.pending++;
      if (r.call_status === "completed") counts.completed++;
      const c = r.status_category;
      if (c === "hot") counts.hot++;
      if (c === "interested") counts.interested++;
      if (c === "not_interested") counts.not_interested++;
      if (c === "no_answer") counts.no_answer++;
      if (c === "callback") counts.callback++;
      if (c === "busy") counts.busy++;
      if (c === "dnd") counts.dnd++;
      if (c === "wrong_number") counts.wrong_number++;
    });
    await supabase.from("auto_dialer_campaigns").update({
      total_contacts: counts.total,
      pending_contacts: counts.pending,
      completed_contacts: counts.completed,
      hot_contacts: counts.hot,
      interested_contacts: counts.interested,
      not_interested_contacts: counts.not_interested,
      no_answer_contacts: counts.no_answer,
      callback_contacts: counts.callback,
      busy_contacts: counts.busy,
      dnd_contacts: counts.dnd,
      wrong_number_contacts: counts.wrong_number,
    }).eq("id", campaignId);
  }

  function endSession() {
    if (showDispoModal) {
      toast.error("Save the current disposition first");
      return;
    }
    setActiveContact(null);
    setActiveCampaignId(null);
    setCountdown(null);
  }

  const totals = useMemo(() => campaigns.reduce(
    (acc: any, c: any) => {
      acc.total      += c.total_contacts || 0;
      acc.pending    += c.pending_contacts || 0;
      acc.completed  += c.completed_contacts || 0;
      acc.hot        += c.hot_contacts || 0;
      acc.interested += c.interested_contacts || 0;
      return acc;
    }, { total: 0, pending: 0, completed: 0, hot: 0, interested: 0 }
  ), [campaigns]);

  return (
    <div className="space-y-4">
      {/* HERO */}
      <Card className={accentClass || "border-blue-200 dark:border-blue-900"}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Calling Queue — {verticalLabel}</h2>
                <p className="text-xs text-muted-foreground">
                  Sridhar/Knowlarity-style: dial → hang up → mandatory disposition → auto next number
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{totals.total} total</Badge>
              <Badge className="bg-amber-500/15 text-amber-700">{totals.pending} pending</Badge>
              <Badge className="bg-red-500/15 text-red-700">🔥 {totals.hot}</Badge>
              <Badge className="bg-emerald-500/15 text-emerald-700">{totals.interested} int.</Badge>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Campaign</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Calling Campaign — {verticalLabel}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Campaign name (e.g. April renewals batch)" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    <Textarea placeholder="Description (optional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={2} />
                  </div>
                  <DialogFooter>
                    <Button onClick={() => createCampaign.mutate()} disabled={!newName.trim() || createCampaign.isPending} className="w-full">
                      Create Campaign
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LIVE FILTER SIDEBAR (always visible) */}
      <CallingFilterSidebar
        campaignId={activeCampaignId}
        verticalSlug={verticalSlug}
        active={filter}
        onChange={setFilter}
      />

      {/* ACTIVE DIALER */}
      {activeContact && (
        <Card className="border-2 border-blue-500 bg-blue-50/40 dark:bg-blue-950/30">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-blue-600 animate-pulse" />
                <span className="font-semibold">Now Calling</span>
                <Badge variant="outline" className="text-[10px]">Attempt #{activeContact.dial_attempts}</Badge>
                {countdown !== null && (
                  <Badge className="bg-emerald-500 text-white">Next in {countdown}s…</Badge>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={endSession} disabled={showDispoModal}>
                <PhoneOff className="h-4 w-4 mr-1" /> End Session
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <p className="text-2xl font-bold">{activeContact.name || "—"}</p>
                <a href={`tel:+91${activeContact.phone}`} className="inline-flex items-center gap-2 text-3xl font-mono font-bold text-blue-700 hover:underline">
                  📞 +91 {activeContact.phone}
                </a>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {activeContact.city && <p>📍 {activeContact.city}</p>}
                  {activeContact.email && <p>✉️ {activeContact.email}</p>}
                </div>
                <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <a href={`tel:+91${activeContact.phone}`}><Phone className="h-4 w-4" /> Dial Now</a>
                </Button>
              </div>

              <div className="space-y-2 flex flex-col justify-center">
                <p className="text-sm text-muted-foreground">
                  After hanging up, click <strong>Mark Disposition</strong>. You cannot skip — the modal blocks the UI until you save.
                </p>
                <Button size="lg" className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={endCallOpenModal}>
                  <SkipForward className="h-4 w-4 mr-1.5" /> Call ended → Mark Disposition
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MANDATORY MODAL */}
      <MandatoryDispositionDialog
        open={showDispoModal}
        contact={activeContact}
        onSave={handleSaveDisposition}
      />

      {/* CAMPAIGN LIST */}
      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ListChecks className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">No calling campaigns yet</p>
            <p className="text-sm text-muted-foreground mb-3">Create one and import an Excel/CSV of numbers to start dialing.</p>
            <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-3">
            {campaigns.map((c: any) => {
              const total = c.total_contacts || 0;
              const completed = c.completed_contacts || 0;
              const pct = total ? Math.round((completed / total) * 100) : 0;
              return (
                <Card key={c.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{c.name}</h3>
                          <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge>
                          {c.last_import_filename && (
                            <Badge variant="outline" className="text-[10px]">📄 {c.last_import_filename}</Badge>
                          )}
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowImportFor(c.id)} className="gap-1">
                          <Upload className="h-3.5 w-3.5" /> Import
                        </Button>
                        <Button size="sm" onClick={() => startCalling(c.id)} disabled={!c.pending_contacts} className="gap-1">
                          <PhoneCall className="h-3.5 w-3.5" /> Start Calling
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (confirm(`Delete campaign "${c.name}" and all its contacts?`)) deleteCampaign.mutate(c.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <Progress value={pct} className="h-2" />

                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 text-center text-xs">
                      <Stat label="Total"     value={total} />
                      <Stat label="Pending"   value={c.pending_contacts || 0}        tone="text-amber-600" />
                      <Stat label="Called"    value={completed}                      tone="text-blue-600" />
                      <Stat label="🔥 Hot"    value={c.hot_contacts || 0}            tone="text-red-600" />
                      <Stat label="Int."      value={c.interested_contacts || 0}     tone="text-emerald-600" />
                      <Stat label="Callback"  value={c.callback_contacts || 0}       tone="text-blue-600" />
                      <Stat label="Not Int."  value={c.not_interested_contacts || 0} tone="text-rose-600" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* RIGHT: upload history + quick stats */}
          <div className="space-y-3">
            <CallingUploadHistory verticalSlug={verticalSlug} campaignId={activeCampaignId} />
          </div>
        </div>
      )}

      {/* IMPORT DIALOG */}
      <Dialog open={!!showImportFor} onOpenChange={(o) => !o && setShowImportFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Import Numbers
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Button variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Choose Excel / CSV File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && showImportFor) importContactsFromFile(showImportFor, f);
                  e.target.value = "";
                }}
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Expected columns (any order): <code>phone</code>, optional <code>name</code>, <code>email</code>, <code>city</code>.
                File will be saved permanently and downloadable later.
              </p>
            </div>

            <div className="text-center text-xs text-muted-foreground">— or paste below —</div>

            <Textarea
              ref={pasteInputRef}
              placeholder={"9876543210, John, john@x.com, Delhi\n9876501234, Priya, , Mumbai"}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
            />
            <Button
              className="w-full"
              disabled={!pasteText.trim()}
              onClick={() => showImportFor && importContactsFromPaste(showImportFor)}
            >
              Import {pasteText.trim().split(/\r?\n/).filter(Boolean).length || 0} pasted line{pasteText.trim().split(/\r?\n/).filter(Boolean).length === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div className={`font-bold text-lg ${tone || ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export { type CallingFilter };
