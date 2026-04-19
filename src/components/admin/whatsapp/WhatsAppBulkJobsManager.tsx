import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Send, Users, Upload, Filter, Plus, X, RefreshCw, FileSpreadsheet,
  CheckCircle2, XCircle, Pause, AlertTriangle, Clock,
} from "lucide-react";
import ExcelJS from "exceljs";
import { formatDistanceToNow } from "date-fns";

type AudienceMode = "all" | "vertical" | "stage" | "tag" | "date_range" | "excel" | "manual";

interface FilterState {
  vertical?: string;
  stage?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
  manualPhones?: string;
  excelPhones?: { phone: string; name?: string }[];
}

const VERTICALS = ["sales", "loans", "insurance", "rental", "hsrp", "accessories", "fleet", "dealer"];
const STAGES = ["new", "follow_up", "renewal", "issued", "lost", "hot", "cold", "callback"];

function normalizePhone(p: any) {
  const d = String(p ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10) return `91${d}`;
  return d;
}

export function WhatsAppBulkJobsManager() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState<string>("");
  const [messageType, setMessageType] = useState<"template" | "text" | "image" | "document">("template");
  const [messageText, setMessageText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [rate, setRate] = useState(80);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [filters, setFilters] = useState<FilterState>({});
  const [previewCount, setPreviewCount] = useState(0);

  /* ── load approved templates ── */
  const { data: templates = [] } = useQuery({
    queryKey: ["wa-templates-approved"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_templates")
        .select("name, body, category, status")
        .eq("status", "approved")
        .order("name");
      return data || [];
    },
  });

  /* ── live job list with realtime ── */
  const { data: jobs = [] } = useQuery({
    queryKey: ["wa-bulk-jobs"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_bulk_jobs")
        .select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("wa-bulk-jobs-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_bulk_jobs" },
        () => qc.invalidateQueries({ queryKey: ["wa-bulk-jobs"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  /* ── audience preview (count only) ── */
  async function previewAudience(): Promise<number> {
    if (audienceMode === "manual") {
      const lines = (filters.manualPhones || "").split(/\r?\n/).map((l) => normalizePhone(l)).filter((p) => p.length >= 11);
      return new Set(lines).size;
    }
    if (audienceMode === "excel") return filters.excelPhones?.length || 0;

    let q = supabase.from("leads").select("phone", { count: "exact", head: true });
    if (audienceMode === "vertical" && filters.vertical) q = q.eq("service_category", filters.vertical);
    if (audienceMode === "stage" && filters.stage)       q = q.eq("status", filters.stage);
    if (audienceMode === "tag" && filters.tag)           q = q.contains("tags", [filters.tag]);
    if (audienceMode === "date_range") {
      if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters.dateTo)   q = q.lte("created_at", filters.dateTo);
    }
    const { count } = await q;
    return count || 0;
  }

  useEffect(() => { previewAudience().then(setPreviewCount); /* eslint-disable-next-line */ }, [audienceMode, JSON.stringify(filters)]);

  async function fetchAudiencePhones(): Promise<{ phone: string; name?: string }[]> {
    if (audienceMode === "manual") {
      const set = new Set<string>();
      const out: { phone: string; name?: string }[] = [];
      (filters.manualPhones || "").split(/\r?\n/).forEach((line) => {
        const parts = line.split(/[,\t]/).map((s) => s.trim());
        const p = normalizePhone(parts[0]);
        if (p.length >= 11 && !set.has(p)) {
          set.add(p);
          out.push({ phone: p, name: parts[1] });
        }
      });
      return out;
    }
    if (audienceMode === "excel") return filters.excelPhones || [];

    let q = supabase.from("leads").select("phone, name").limit(10000);
    if (audienceMode === "vertical" && filters.vertical) q = q.eq("service_category", filters.vertical);
    if (audienceMode === "stage" && filters.stage)       q = q.eq("status", filters.stage);
    if (audienceMode === "tag" && filters.tag)           q = q.contains("tags", [filters.tag]);
    if (audienceMode === "date_range") {
      if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters.dateTo)   q = q.lte("created_at", filters.dateTo);
    }
    const { data } = await q;
    const set = new Set<string>();
    const out: { phone: string; name?: string }[] = [];
    (data || []).forEach((r: any) => {
      const p = normalizePhone(r.phone);
      if (p.length >= 11 && !set.has(p)) {
        set.add(p);
        out.push({ phone: p, name: r.name });
      }
    });
    return out;
  }

  async function handleExcelUpload(file: File) {
    const wb = new ExcelJS.Workbook();
    const lower = file.name.toLowerCase();
    let rows: { phone: string; name?: string }[] = [];
    if (lower.endsWith(".csv")) {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const idxPhone = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("number"));
      const idxName = headers.findIndex((h) => h.includes("name"));
      lines.slice(1).forEach((line) => {
        const cols = line.split(",").map((c) => c.trim());
        const phone = normalizePhone(cols[idxPhone] ?? cols[0]);
        if (phone.length >= 11) rows.push({ phone, name: idxName >= 0 ? cols[idxName] : undefined });
      });
    } else {
      await wb.xlsx.load(await file.arrayBuffer());
      const sheet = wb.worksheets[0];
      const headers: string[] = [];
      sheet.getRow(1).eachCell((cell, col) => { headers[col - 1] = String(cell.value ?? "").trim().toLowerCase(); });
      const idxPhone = headers.findIndex((h) => h?.includes("phone") || h?.includes("mobile") || h?.includes("number"));
      const idxName = headers.findIndex((h) => h?.includes("name"));
      sheet.eachRow((row, rIdx) => {
        if (rIdx === 1) return;
        const cells: string[] = [];
        row.eachCell((cell, col) => { cells[col - 1] = String(cell.value ?? "").trim(); });
        const phone = normalizePhone(cells[idxPhone] ?? cells[0]);
        if (phone.length >= 11) rows.push({ phone, name: idxName >= 0 ? cells[idxName] : undefined });
      });
    }
    const seen = new Set<string>();
    rows = rows.filter((r) => seen.has(r.phone) ? false : (seen.add(r.phone), true));
    setFilters((f) => ({ ...f, excelPhones: rows }));
    toast.success(`Loaded ${rows.length} unique numbers from ${file.name}`);
  }

  async function createAndStartJob() {
    if (!name.trim()) return toast.error("Job name required");
    if (messageType === "template" && !templateName) return toast.error("Pick a template");
    if (messageType !== "template" && !messageText.trim()) return toast.error("Message text required");

    const phones = await fetchAudiencePhones();
    if (!phones.length) return toast.error("No recipients in this audience");

    const { data: { user } } = await supabase.auth.getUser();
    const { data: job, error } = await supabase.from("wa_bulk_jobs").insert({
      name: name.trim(),
      template_name: messageType === "template" ? templateName : null,
      template_variables: [],
      message_text: messageType !== "template" ? messageText : null,
      message_type: messageType,
      media_url: mediaUrl || null,
      audience_source: audienceMode,
      audience_filters: filters as any,
      total: phones.length,
      rate_per_minute: rate,
      status: "queued",
      created_by: user?.id ?? null,
      created_by_email: user?.email ?? null,
    }).select().single();
    if (error || !job) { toast.error(error?.message || "Failed to create job"); return; }

    // chunked insert of recipients
    const CHUNK = 500;
    for (let i = 0; i < phones.length; i += CHUNK) {
      const slice = phones.slice(i, i + CHUNK).map((p) => ({
        job_id: job.id, phone: p.phone, name: p.name || null, status: "pending",
      }));
      const r = await supabase.from("wa_bulk_job_recipients").insert(slice);
      if (r.error) { toast.error(r.error.message); return; }
    }

    // kick off the processor
    supabase.functions.invoke("wa-bulk-job-processor", { body: { job_id: job.id } })
      .catch((e) => console.warn("invoke error", e));

    toast.success(`🚀 Bulk job started: ${phones.length} recipients @ ${rate}/min`);
    setShowCreate(false);
    qc.invalidateQueries({ queryKey: ["wa-bulk-jobs"] });
    // reset
    setName(""); setTemplateName(""); setMessageText(""); setMediaUrl(""); setFilters({}); setAudienceMode("all");
  }

  async function cancelJob(id: string) {
    if (!confirm("Cancel this bulk send? Already-sent messages remain delivered.")) return;
    await supabase.from("wa_bulk_jobs").update({ cancel_requested: true }).eq("id", id);
    toast.success("Cancellation requested");
  }
  async function resumeJob(id: string) {
    await supabase.from("wa_bulk_jobs").update({ cancel_requested: false, status: "queued" }).eq("id", id);
    supabase.functions.invoke("wa-bulk-job-processor", { body: { job_id: id } });
    toast.success("Job resumed");
  }

  const totals = useMemo(() => jobs.reduce((acc: any, j: any) => {
    acc.total += j.total || 0; acc.sent += j.sent || 0; acc.failed += j.failed || 0;
    return acc;
  }, { total: 0, sent: 0, failed: 0 }), [jobs]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Bulk WhatsApp Sender</h2>
                <p className="text-xs text-muted-foreground">Meta-safe rate-limited engine — 80 msgs/min default, with live progress + cancel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{totals.total} queued</Badge>
              <Badge className="bg-emerald-500/15 text-emerald-700">{totals.sent} sent</Badge>
              <Badge className="bg-rose-500/15 text-rose-700">{totals.failed} failed</Badge>
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Bulk Send</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>New Bulk WhatsApp Job</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Job name</label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. April loan offers blast" />
                    </div>

                    {/* MESSAGE */}
                    <Tabs value={messageType} onValueChange={(v) => setMessageType(v as any)}>
                      <TabsList className="grid grid-cols-4 w-full">
                        <TabsTrigger value="template">Template</TabsTrigger>
                        <TabsTrigger value="text">Text</TabsTrigger>
                        <TabsTrigger value="image">Image</TabsTrigger>
                        <TabsTrigger value="document">PDF</TabsTrigger>
                      </TabsList>
                      <TabsContent value="template" className="space-y-2 mt-2">
                        <Select value={templateName} onValueChange={setTemplateName}>
                          <SelectTrigger><SelectValue placeholder="Pick approved Meta template" /></SelectTrigger>
                          <SelectContent>
                            {templates.map((t: any) => (
                              <SelectItem key={t.name} value={t.name}>
                                {t.name} <span className="text-muted-foreground text-xs ml-1">({t.category})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {templateName && (
                          <p className="text-[11px] text-muted-foreground italic">
                            {templates.find((t: any) => t.name === templateName)?.body?.slice(0, 200)}…
                          </p>
                        )}
                      </TabsContent>
                      <TabsContent value="text" className="space-y-2 mt-2">
                        <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={4}
                          placeholder="Free-text message — only delivers to phones with an open 24h window." />
                        <div className="flex items-center gap-1 text-[11px] text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Free-text won't reach numbers without an open window. Use template for cold outreach.
                        </div>
                      </TabsContent>
                      <TabsContent value="image" className="space-y-2 mt-2">
                        <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="Image URL (jpg/png, ≤5MB)" />
                        <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={2} placeholder="Optional caption" />
                      </TabsContent>
                      <TabsContent value="document" className="space-y-2 mt-2">
                        <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="PDF URL (≤100MB)" />
                        <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={2} placeholder="Optional caption" />
                      </TabsContent>
                    </Tabs>

                    {/* AUDIENCE */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Filter className="h-3 w-3" /> Audience
                      </label>
                      <Select value={audienceMode} onValueChange={(v) => { setAudienceMode(v as AudienceMode); setFilters({}); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All leads</SelectItem>
                          <SelectItem value="vertical">By vertical</SelectItem>
                          <SelectItem value="stage">By stage</SelectItem>
                          <SelectItem value="tag">By tag</SelectItem>
                          <SelectItem value="date_range">Date range</SelectItem>
                          <SelectItem value="excel">Excel/CSV upload</SelectItem>
                          <SelectItem value="manual">Paste numbers</SelectItem>
                        </SelectContent>
                      </Select>

                      {audienceMode === "vertical" && (
                        <Select value={filters.vertical} onValueChange={(v) => setFilters({ ...filters, vertical: v })}>
                          <SelectTrigger><SelectValue placeholder="Pick vertical" /></SelectTrigger>
                          <SelectContent>{VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {audienceMode === "stage" && (
                        <Select value={filters.stage} onValueChange={(v) => setFilters({ ...filters, stage: v })}>
                          <SelectTrigger><SelectValue placeholder="Pick stage" /></SelectTrigger>
                          <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {audienceMode === "tag" && (
                        <Input value={filters.tag || ""} onChange={(e) => setFilters({ ...filters, tag: e.target.value })} placeholder="Tag (e.g. VIP)" />
                      )}
                      {audienceMode === "date_range" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="date" value={filters.dateFrom || ""} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
                          <Input type="date" value={filters.dateTo || ""} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
                        </div>
                      )}
                      {audienceMode === "excel" && (
                        <div>
                          <Button variant="outline" className="w-full gap-1.5" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-3.5 w-3.5" /> {filters.excelPhones?.length ? `${filters.excelPhones.length} loaded — replace?` : "Upload Excel/CSV"}
                          </Button>
                          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExcelUpload(f); e.target.value = ""; }} />
                        </div>
                      )}
                      {audienceMode === "manual" && (
                        <Textarea rows={4} placeholder={"9876543210, John\n9876501234, Priya"}
                          value={filters.manualPhones || ""} onChange={(e) => setFilters({ ...filters, manualPhones: e.target.value })} />
                      )}

                      <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3 w-3" /> Audience preview
                        </span>
                        <Badge variant="outline">{previewCount} unique numbers</Badge>
                      </div>
                    </div>

                    {/* RATE */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Send rate (msgs/minute)</label>
                      <div className="flex gap-2 items-center">
                        <Input type="number" min={10} max={120} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-24" />
                        <span className="text-xs text-muted-foreground">Meta-safe range: 10-120/min. Default 80 = ~1.3/sec</span>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button onClick={createAndStartJob} disabled={!previewCount} className="gap-1.5">
                      <Send className="h-4 w-4" /> Start sending to {previewCount}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job list */}
      {jobs.length === 0 ? (
        <Card><CardContent className="py-10 text-center">
          <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">No bulk jobs yet</p>
          <p className="text-xs text-muted-foreground">Create one to send templates/media to a segment, list, or pasted numbers.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((j: any) => {
            const pct = j.total ? Math.round(((j.sent + j.failed) / j.total) * 100) : 0;
            const StatusIcon = j.status === "completed" ? CheckCircle2
              : j.status === "cancelled" ? Pause
              : j.status === "running" ? RefreshCw
              : Clock;
            return (
              <Card key={j.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{j.name}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          <StatusIcon className={`h-3 w-3 mr-1 ${j.status === "running" ? "animate-spin" : ""}`} />
                          {j.status}
                        </Badge>
                        {j.template_name && <Badge variant="outline" className="text-[10px]">📩 {j.template_name}</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {j.audience_source} • {j.rate_per_minute}/min • {formatDistanceToNow(new Date(j.created_at), { addSuffix: true })} • {j.created_by_email || "system"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {j.status === "running" && !j.cancel_requested && (
                        <Button size="sm" variant="outline" onClick={() => cancelJob(j.id)} className="gap-1">
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                      {j.status === "cancelled" && (
                        <Button size="sm" variant="outline" onClick={() => resumeJob(j.id)} className="gap-1">
                          <RefreshCw className="h-3.5 w-3.5" /> Resume
                        </Button>
                      )}
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="grid grid-cols-4 gap-2 text-xs text-center">
                    <div><div className="font-bold text-base">{j.total}</div><div className="text-muted-foreground">Total</div></div>
                    <div><div className="font-bold text-base text-emerald-600">{j.sent}</div><div className="text-muted-foreground">Sent</div></div>
                    <div><div className="font-bold text-base text-rose-600">{j.failed}</div><div className="text-muted-foreground">Failed</div></div>
                    <div><div className="font-bold text-base text-amber-600">{Math.max(0, j.total - j.sent - j.failed)}</div><div className="text-muted-foreground">Pending</div></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
