import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare, Upload, Send, FileSpreadsheet, Filter,
  CheckCircle2, AlertCircle, Trash2, Users, Sparkles,
} from "lucide-react";
import ExcelJS from "exceljs";

/* ─────────────────────────────────────────────────────────────
   Points 8-10: WhatsApp Template Filters + Excel + Bulk Send

   - Pick a vertical + category to filter the template list
   - Upload an Excel/CSV with phone numbers (and optional vars)
   - OR paste phones in a textarea
   - Preview → Send via Meta API (whatsapp-send edge function)
   - Throttled, progress-tracked, deduped
   ───────────────────────────────────────────────────────────── */

const VERTICAL_OPTIONS = [
  { value: "all", label: "All Verticals" },
  { value: "sales", label: "Car Sales" },
  { value: "insurance", label: "Insurance" },
  { value: "loans", label: "Car Loans" },
  { value: "hsrp", label: "HSRP & FASTag" },
  { value: "rentals", label: "Self-Drive Rentals" },
  { value: "dealer", label: "Dealer Network" },
  { value: "accessories", label: "Accessories" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utility" },
  { value: "AUTHENTICATION", label: "Authentication" },
];

interface Recipient {
  phone: string;
  name?: string;
  vars?: Record<string, string>;
}

function normalizePhone(p: string): string | null {
  if (!p) return null;
  const digits = String(p).replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  return null;
}

export function WhatsAppBulkSender() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  /* Filters (Point 8) */
  const [filterVertical, setFilterVertical] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  /* Recipients (Point 9) */
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [importStats, setImportStats] = useState<{ total: number; valid: number; dupes: number; invalid: number } | null>(null);

  /* Send (Point 10) */
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });

  /* ── Templates ── */
  const { data: templates = [], isLoading: loadingTpl } = useQuery({
    queryKey: ["wa-bulk-templates", filterVertical, filterCategory],
    queryFn: async () => {
      let q = supabase
        .from("wa_templates")
        .select("id, name, display_name, body, category, vertical, status, language, variables")
        .eq("status", "approved")
        .order("name");
      if (filterVertical !== "all") q = q.eq("vertical", filterVertical);
      if (filterCategory !== "all") q = q.eq("category", filterCategory);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredTemplates = useMemo(() => {
    if (!filterSearch.trim()) return templates;
    const s = filterSearch.trim().toLowerCase();
    return templates.filter((t: any) =>
      (t.name || "").toLowerCase().includes(s) ||
      (t.display_name || "").toLowerCase().includes(s) ||
      (t.body || "").toLowerCase().includes(s)
    );
  }, [templates, filterSearch]);

  const selectedTemplate = templates.find((t: any) => t.id === selectedTemplateId);

  /* ── Recipient ingestion ── */
  function ingestRows(rows: Recipient[]) {
    const seen = new Set<string>();
    let valid = 0, dupes = 0, invalid = 0;
    const fresh: Recipient[] = [];
    for (const r of rows) {
      const norm = normalizePhone(r.phone);
      if (!norm) { invalid++; continue; }
      if (seen.has(norm)) { dupes++; continue; }
      seen.add(norm);
      fresh.push({ ...r, phone: norm });
      valid++;
    }
    setRecipients(fresh);
    setImportStats({ total: rows.length, valid, dupes, invalid });
    if (valid) toast.success(`${valid} recipients ready (${dupes} duplicates, ${invalid} invalid removed)`);
    else toast.error("No valid phone numbers found");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];
      if (!ws) { toast.error("No sheet found in file"); return; }

      // detect headers from row 1
      const headerRow = ws.getRow(1);
      const headers: Record<number, string> = {};
      headerRow.eachCell((cell, col) => {
        headers[col] = String(cell.value || "").trim().toLowerCase();
      });
      const phoneCol = Object.entries(headers).find(([, v]) =>
        v === "phone" || v === "mobile" || v === "number" || v === "whatsapp" || v.includes("phone")
      )?.[0];
      const nameCol = Object.entries(headers).find(([, v]) => v === "name")?.[0];
      const cityCol = Object.entries(headers).find(([, v]) => v === "city")?.[0];

      if (!phoneCol) {
        toast.error("Excel must have a 'phone' / 'mobile' column");
        return;
      }

      const rows: Recipient[] = [];
      ws.eachRow((row, idx) => {
        if (idx === 1) return;
        const phone = String(row.getCell(Number(phoneCol)).value || "").trim();
        if (!phone) return;
        const name = nameCol ? String(row.getCell(Number(nameCol)).value || "").trim() : undefined;
        const city = cityCol ? String(row.getCell(Number(cityCol)).value || "").trim() : undefined;
        rows.push({ phone, name, vars: city ? { city } : undefined });
      });
      ingestRows(rows);
    } catch (err: any) {
      toast.error("Failed to parse Excel: " + err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handlePaste() {
    const lines = pasteText.split(/[\n,;]+/).map((l) => l.trim()).filter(Boolean);
    const rows: Recipient[] = lines.map((l) => ({ phone: l }));
    ingestRows(rows);
    setPasteText("");
  }

  function clearRecipients() {
    setRecipients([]);
    setImportStats(null);
  }

  function removeRecipient(phone: string) {
    setRecipients((r) => r.filter((x) => x.phone !== phone));
  }

  /* ── Send via whatsapp-send edge function ── */
  async function sendBulk() {
    if (!selectedTemplate) { toast.error("Pick a template first"); return; }
    if (recipients.length === 0) { toast.error("No recipients loaded"); return; }
    const confirmMsg = `Send "${selectedTemplate.name}" to ${recipients.length} recipients via Meta WhatsApp API?`;
    if (!confirm(confirmMsg)) return;

    setSending(true);
    setProgress({ sent: 0, failed: 0, total: recipients.length });

    let sent = 0, failed = 0;
    const { data: { user } } = await supabase.auth.getUser();

    /* Log a broadcast row for permanent history */
    const { data: broadcast } = await supabase
      .from("whatsapp_broadcasts")
      .insert({
        name: `${selectedTemplate.name} — ${recipients.length} recipients`,
        template_id: selectedTemplate.id,
        status: "sending",
        total_recipients: recipients.length,
        message_content: selectedTemplate.body,
        target_segment: { source: "bulk_sender_excel", vertical: filterVertical, category: filterCategory },
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      try {
        const { error } = await supabase.functions.invoke("whatsapp-send", {
          body: {
            to: r.phone,
            type: "template",
            template_name: selectedTemplate.name,
            language: selectedTemplate.language || "en",
            variables: r.vars || {},
            recipient_name: r.name,
            broadcast_id: broadcast?.id,
          },
        });
        if (error) throw error;
        sent++;
      } catch (err) {
        console.error(`Failed for ${r.phone}:`, err);
        failed++;
      }
      setProgress({ sent, failed, total: recipients.length });
      // Throttle 350ms to stay below Meta rate limits
      await new Promise((res) => setTimeout(res, 350));
    }

    if (broadcast?.id) {
      await supabase
        .from("whatsapp_broadcasts")
        .update({
          status: "completed",
          sent_count: sent,
          failed_count: failed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", broadcast.id);
    }

    setSending(false);
    qc.invalidateQueries({ queryKey: ["wa-broadcasts"] });
    toast.success(`✅ Bulk send complete — ${sent} sent, ${failed} failed`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg">WhatsApp Bulk Sender</h2>
              <p className="text-xs text-muted-foreground">
                Filter approved templates → Import Excel/CSV → Send via Meta API (rate-limited)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* LEFT — Template picker */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" /> 1. Pick Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Vertical</Label>
                <Select value={filterVertical} onValueChange={setFilterVertical}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VERTICAL_OPTIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Input
              placeholder="Search template by name or body…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="h-8 text-xs"
            />

            <ScrollArea className="h-64 border rounded-md p-2">
              {loadingTpl ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading templates…</p>
              ) : filteredTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No approved templates match these filters.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {filteredTemplates.map((t: any) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`w-full text-left p-2 rounded border text-xs transition-colors ${
                        selectedTemplateId === t.id
                          ? "border-emerald-500 bg-emerald-500/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium truncate">{t.display_name || t.name}</span>
                        {t.category && <Badge variant="outline" className="text-[9px]">{t.category}</Badge>}
                        {t.vertical && <Badge variant="secondary" className="text-[9px]">{t.vertical}</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{t.body}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedTemplate && (
              <div className="p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-[10px] font-semibold text-emerald-700 mb-1">Preview:</p>
                <p className="text-xs whitespace-pre-wrap line-clamp-4">{selectedTemplate.body}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT — Recipients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> 2. Add Recipients
              {recipients.length > 0 && (
                <Badge className="ml-auto bg-emerald-600 text-white">
                  {recipients.length} ready
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Excel upload */}
            <div className="border-2 border-dashed rounded-md p-3 text-center">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Upload Excel / CSV
              </Button>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Required column: <code>phone</code> · Optional: <code>name</code>, <code>city</code>
              </p>
            </div>

            <Separator className="my-1" />

            {/* Paste */}
            <div className="space-y-1.5">
              <Label className="text-xs">Or paste numbers (one per line)</Label>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={3}
                placeholder="9876543210&#10;9123456789"
                className="text-xs font-mono"
              />
              <Button size="sm" onClick={handlePaste} disabled={!pasteText.trim()} className="w-full gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Add Pasted Numbers
              </Button>
            </div>

            {importStats && (
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <div className="p-1.5 rounded bg-emerald-500/10 text-center">
                  <p className="font-bold text-emerald-700">{importStats.valid}</p>
                  <p className="text-muted-foreground">Valid</p>
                </div>
                <div className="p-1.5 rounded bg-amber-500/10 text-center">
                  <p className="font-bold text-amber-700">{importStats.dupes}</p>
                  <p className="text-muted-foreground">Dupes</p>
                </div>
                <div className="p-1.5 rounded bg-rose-500/10 text-center">
                  <p className="font-bold text-rose-700">{importStats.invalid}</p>
                  <p className="text-muted-foreground">Invalid</p>
                </div>
              </div>
            )}

            {recipients.length > 0 && (
              <ScrollArea className="h-32 border rounded-md">
                <div className="p-1.5 space-y-1">
                  {recipients.slice(0, 100).map((r) => (
                    <div key={r.phone} className="flex items-center justify-between text-[11px] px-2 py-1 rounded hover:bg-muted/50">
                      <span className="font-mono">+91 {r.phone}</span>
                      <span className="text-muted-foreground truncate max-w-[110px]">{r.name || ""}</span>
                      <button onClick={() => removeRecipient(r.phone)} className="text-rose-500 hover:text-rose-700">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {recipients.length > 100 && (
                    <p className="text-[10px] text-muted-foreground text-center py-1">
                      +{recipients.length - 100} more…
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}

            {recipients.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearRecipients} className="w-full gap-1.5 text-xs">
                <Trash2 className="h-3 w-3" /> Clear all recipients
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SEND */}
      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardContent className="pt-4 pb-4 space-y-3">
          {sending && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  Sending… {progress.sent + progress.failed} / {progress.total}
                </span>
                <span className="text-muted-foreground">
                  ✅ {progress.sent} · ❌ {progress.failed}
                </span>
              </div>
              <Progress value={((progress.sent + progress.failed) / Math.max(progress.total, 1)) * 100} />
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {selectedTemplate ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Template ready: <strong>{selectedTemplate.name}</strong>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Select a template above
                </span>
              )}
            </div>
            <Button
              size="lg"
              onClick={sendBulk}
              disabled={sending || !selectedTemplate || recipients.length === 0}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : `Send to ${recipients.length} Recipients`}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            🔒 Throttled at 350ms/message (~3/sec) to respect Meta API limits. Logged in WhatsApp Broadcasts history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
