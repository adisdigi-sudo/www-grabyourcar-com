import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload, Download, FileSpreadsheet, Send, Sparkles, ChevronRight,
  CheckCheck, AlertCircle, FileText, Quote, Loader2,
} from "lucide-react";
// ExcelJS lazy-loaded inside handleFile to keep bundle small

// ── Vertical config (extend as needed) ──
const VERTICALS = [
  { value: "insurance", label: "🛡️ Insurance Quotes", color: "text-emerald-600" },
  { value: "loans", label: "💰 Loan Offers", color: "text-blue-600" },
  { value: "sales", label: "🚗 Car Sales Offers", color: "text-amber-600" },
  { value: "hsrp", label: "🪪 HSRP / FASTag", color: "text-violet-600" },
  { value: "rental", label: "🚙 Self-Drive Rental", color: "text-pink-600" },
];

interface ParsedRow {
  phone: string;
  name?: string;
  pdf_url?: string;
  pdf_filename?: string;
  [key: string]: string | undefined;
}

export function WAHubBulkQuotes() {
  const [vertical, setVertical] = useState("insurance");
  const [templateId, setTemplateId] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState(50);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [running, setRunning] = useState(false);

  // Approved templates only
  const { data: templates } = useQuery({
    queryKey: ["wa-templates-approved"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_templates")
        .select("id, name, display_name, body, header_type, header_content, footer, buttons, status, language")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const selectedTemplate = useMemo(
    () => (templates || []).find((t: any) => t.id === templateId),
    [templates, templateId],
  );

  // Required positional vars discovered from template body
  const requiredVars = useMemo(() => {
    const body: string = selectedTemplate?.body || "";
    return [...new Set((body.match(/\{\{(\w+)\}\}/g) || []).map((v) => v.replace(/[{}]/g, "")))];
  }, [selectedTemplate]);

  const wantsHeaderMedia = selectedTemplate?.header_type
    && ["image", "video", "document"].includes(String(selectedTemplate.header_type).toLowerCase());

  // ── Excel template download (auto-detect from selected template) ──
  const downloadTemplate = () => {
    if (!selectedTemplate) {
      toast.error("Select a template first");
      return;
    }
    const headers = ["phone", "name", ...requiredVars];
    if (wantsHeaderMedia) headers.push("pdf_url", "pdf_filename");
    const sample: Record<string, string> = {
      phone: "9876543210",
      name: "Rahul Sharma",
    };
    requiredVars.forEach((v, i) => (sample[v] = `Sample ${v} ${i + 1}`));
    if (wantsHeaderMedia) {
      sample.pdf_url = "https://yourdomain.com/quotes/sample.pdf";
      sample.pdf_filename = "Quote.pdf";
    }
    const csvLine = (cells: string[]) =>
      cells.map((c) => {
        const safe = String(c ?? "").replace(/"/g, '""');
        return /[",\n]/.test(safe) ? `"${safe}"` : safe;
      }).join(",");
    const csv = [csvLine(headers), csvLine(headers.map((h) => sample[h] || ""))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTemplate.name}_bulk_quotes.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("📥 Template CSV downloaded");
  };

  // ── Parse uploaded Excel/CSV ──
  const handleFile = async (file: File) => {
    if (!selectedTemplate) {
      toast.error("Select a template first");
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      if (json.length === 0) {
        toast.error("No rows found in the file");
        return;
      }
      // Normalise header keys to lowercase
      const normalized: ParsedRow[] = json.map((row) => {
        const out: ParsedRow = { phone: "" };
        for (const [k, v] of Object.entries(row)) {
          out[k.trim().toLowerCase()] = String(v ?? "").trim();
        }
        out.phone = String(out.phone || "").replace(/\D/g, "").replace(/^91/, "");
        return out;
      }).filter((r) => /^[6-9]\d{9}$/.test(r.phone));

      const lowerHeaders = Object.keys(json[0] || {}).map((h) => h.toLowerCase());
      const miss = requiredVars.filter((v) => !lowerHeaders.includes(v.toLowerCase()));
      if (!lowerHeaders.includes("phone")) miss.unshift("phone");
      setMissing(miss);
      setRows(normalized);
      if (miss.length > 0) {
        toast.warning(`Loaded ${normalized.length} rows but missing columns: ${miss.join(", ")}`);
      } else {
        toast.success(`✅ Loaded ${normalized.length} valid recipients`);
      }
    } catch (err) {
      toast.error("Failed to parse file: " + (err as Error).message);
    }
  };

  // ── Bulk send (per-row personalised template + optional pdf attach) ──
  const sendBulk = useMutation({
    mutationFn: async () => {
      if (!rows || rows.length === 0) throw new Error("No recipients loaded");
      if (!selectedTemplate) throw new Error("Select a template");
      if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(", ")}`);

      setRunning(true);
      setProgress({ sent: 0, failed: 0, total: rows.length });

      let sent = 0;
      let failed = 0;

      // Process in batches (1 sec gap between rows, 5 sec between batches)
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        for (const row of batch) {
          try {
            const fullPhone = `91${row.phone}`;

            // Build template_variables map
            const templateVars: Record<string, string> = {};
            requiredVars.forEach((v, idx) => {
              const value = row[v.toLowerCase()] || row.name || "Customer";
              templateVars[v] = value;
              templateVars[`var_${idx + 1}`] = value;
            });
            templateVars.phone = fullPhone;
            if (row.name) {
              templateVars.customer_name = templateVars.customer_name || row.name;
              templateVars.full_name = templateVars.full_name || row.name;
              templateVars.owner_name = templateVars.owner_name || row.name;
            }

            const body: Record<string, unknown> = {
              phone: fullPhone,
              message_type: "template",
              template_name: selectedTemplate.name,
              template_variables: templateVars,
              vertical,
            };
            if (wantsHeaderMedia && row.pdf_url) {
              body.media_url = row.pdf_url;
              if (row.pdf_filename) body.media_filename = row.pdf_filename;
            }

            const { data, error } = await supabase.functions.invoke("wa-send-inbox", { body });
            if (error || !data?.success) {
              failed++;
            } else {
              sent++;
            }
          } catch {
            failed++;
          }
          setProgress({ sent, failed, total: rows.length });
          await new Promise((r) => setTimeout(r, 800));
        }
        if (i + batchSize < rows.length) {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }

      setRunning(false);
      return { sent, failed };
    },
    onSuccess: (res) => {
      toast.success(`🚀 Bulk send complete — ${res.sent} sent, ${res.failed} failed`);
    },
    onError: (e) => {
      setRunning(false);
      toast.error((e as Error).message);
    },
  });

  return (
    <div className="h-full overflow-auto p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Universal Bulk Quote Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Har client ko alag PDF + alag personalised offer — Excel se 5000 contacts ek click me.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <CheckCheck className="h-3 w-3" /> 100% Meta API
        </Badge>
      </div>

      {/* Step 1 — Vertical + Template */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" /> Step 1 — Choose vertical & approved template
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Vertical</Label>
            <Select value={vertical} onValueChange={setVertical}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VERTICALS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Approved template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={`${(templates || []).length} approved templates available`} />
              </SelectTrigger>
              <SelectContent>
                {(templates || []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.display_name || t.name} {t.header_type && t.header_type !== "text" ? `· ${t.header_type}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Template preview */}
      {selectedTemplate && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-600">approved</Badge>
                {selectedTemplate.header_type && (
                  <Badge variant="outline" className="capitalize">
                    {selectedTemplate.header_type === "video" ? "🎬" :
                      selectedTemplate.header_type === "image" ? "🖼️" :
                        selectedTemplate.header_type === "document" ? "📄" : "📝"} {selectedTemplate.header_type} header
                  </Badge>
                )}
                <Badge variant="outline">{requiredVars.length} variables</Badge>
              </div>
              <pre className="text-xs whitespace-pre-wrap bg-card border rounded p-3 leading-relaxed">{selectedTemplate.body}</pre>
              {selectedTemplate.footer && <p className="text-[11px] text-muted-foreground italic">— {selectedTemplate.footer}</p>}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Required Excel columns</p>
              <ScrollArea className="h-32 border rounded p-2 bg-card">
                <ul className="space-y-1 text-xs font-mono">
                  <li>phone <span className="text-muted-foreground">(10-digit)</span></li>
                  <li>name <span className="text-muted-foreground">(optional)</span></li>
                  {requiredVars.map((v) => <li key={v}>{v}</li>)}
                  {wantsHeaderMedia && (
                    <>
                      <li className="text-emerald-600">pdf_url <span className="text-muted-foreground">(per-row)</span></li>
                      <li className="text-emerald-600">pdf_filename</li>
                    </>
                  )}
                </ul>
              </ScrollArea>
              <Button size="sm" variant="outline" className="w-full gap-1" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Download CSV template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Upload */}
      {selectedTemplate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-primary" /> Step 2 — Upload recipients
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary transition-colors block">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop CSV / XLSX here or click to upload</p>
              <p className="text-xs text-muted-foreground">Each row = one personalised message</p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>

            {rows && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge variant="secondary">{rows.length} valid recipients</Badge>
                  {missing.length === 0 ? (
                    <Badge className="bg-emerald-600"><CheckCheck className="h-3 w-3 mr-1" /> All columns matched</Badge>
                  ) : (
                    <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Missing: {missing.join(", ")}</Badge>
                  )}
                </div>
                <ScrollArea className="h-48 border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {Object.keys(rows[0] || {}).slice(0, 6).map((h) => (
                          <th key={h} className="text-left p-2 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 25).map((r, i) => (
                        <tr key={i} className="border-t">
                          {Object.keys(rows[0] || {}).slice(0, 6).map((h) => (
                            <td key={h} className="p-2 truncate max-w-[160px]">{r[h] || ""}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
                {rows.length > 25 && <p className="text-[10px] text-muted-foreground">Showing 25 of {rows.length} rows</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Send */}
      {rows && rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-primary" /> Step 3 — Launch personalised broadcast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Batch size (per cycle)</Label>
                <Select value={String(batchSize)} onValueChange={(v) => setBatchSize(Number(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[25, 50, 100, 200, 500].map((n) => <SelectItem key={n} value={String(n)}>{n} per batch</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 self-end">
                <p>⏱ ~0.8 sec gap per message, 5 sec between batches</p>
                <p>📊 Total ETA: ~{Math.ceil((rows.length * 0.8 + Math.floor(rows.length / batchSize) * 5) / 60)} min</p>
              </div>
            </div>

            {running && (
              <div className="space-y-1.5">
                <Progress value={(progress.sent + progress.failed) / progress.total * 100} />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sent: <span className="text-emerald-600 font-semibold">{progress.sent}</span> ·
                  Failed: <span className="text-destructive font-semibold">{progress.failed}</span> ·
                  Total: {progress.total}
                </p>
              </div>
            )}

            <Button
              className="w-full h-11 gap-2"
              onClick={() => sendBulk.mutate()}
              disabled={running || sendBulk.isPending || missing.length > 0}
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {running ? `Sending ${progress.sent}/${progress.total}…` : `Launch to ${rows.length} recipients`}
            </Button>

            {wantsHeaderMedia && (
              <div className="text-[11px] text-muted-foreground bg-muted/40 border rounded p-2 flex items-start gap-1.5">
                <Quote className="h-3 w-3 mt-0.5 shrink-0" />
                Each row's <code className="font-mono">pdf_url</code> attaches as the template's media header — har client ko apni PDF/quote milegi.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default WAHubBulkQuotes;
