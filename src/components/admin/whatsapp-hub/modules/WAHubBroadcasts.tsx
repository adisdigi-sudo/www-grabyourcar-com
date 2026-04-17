import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Megaphone, Rocket, Plus, Trash2, Play, Pause, Eye,
  CheckCheck, Check, Clock, AlertCircle, Zap, BarChart3,
  Users, MessageSquare, Send, ArrowRight, Timer, Target,
  TrendingUp, Calendar, Layers, GripVertical, RefreshCw,
  Globe, PhoneCall, Reply, Video, Image, FileText, X,
  Upload, FileUp, Quote, Sparkles, History as HistoryIcon, ChevronRight,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// ─── Types ───
interface CampaignButton {
  type: "URL" | "QUICK_REPLY" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

interface VariableSample {
  key: string;
  value: string;
}

const BROADCAST_VARS = [
  { key: "customer_name", label: "Name", sample: "Rahul Sharma" },
  { key: "phone", label: "Phone", sample: "9876543210" },
  { key: "city", label: "City", sample: "Mumbai" },
  { key: "car_model", label: "Car Model", sample: "Hyundai Creta" },
  { key: "vehicle_number", label: "Vehicle No.", sample: "MH02AB1234" },
  { key: "insurer", label: "Insurer", sample: "HDFC ERGO" },
  { key: "premium", label: "Premium", sample: "₹12,500" },
  { key: "expiry_date", label: "Expiry", sample: "15 Apr 2026" },
  { key: "policy_number", label: "Policy No.", sample: "POL-2024-12345" },
  { key: "order_id", label: "Order ID", sample: "ORD-789" },
  { key: "amount", label: "Amount", sample: "₹8,500" },
  { key: "date", label: "Date", sample: "16 Apr 2026" },
  { key: "booking_id", label: "Booking ID", sample: "BK-001" },
  { key: "otp", label: "OTP", sample: "123456" },
];

// ─── Stats Overview ───
function BroadcastStats() {
  const { data } = useQuery({
    queryKey: ["broadcast-pro-stats"],
    queryFn: async () => {
      const [{ data: campaigns }, { data: drips }, { data: logs }] = await Promise.all([
        supabase.from("wa_campaigns").select("status, total_sent, total_delivered, total_read, total_failed").eq("channel", "whatsapp"),
        supabase.from("wa_drip_sequences").select("id, is_active"),
        supabase.from("wa_message_logs").select("status").or("channel.is.null,channel.eq.whatsapp").limit(1000),
      ]);
      const c = campaigns || [];
      const totalSent = c.reduce((s, x: any) => s + (x.total_sent || 0), 0);
      const totalDel = c.reduce((s, x: any) => s + (x.total_delivered || 0), 0);
      const totalRead = c.reduce((s, x: any) => s + (x.total_read || 0), 0);
      const totalFailed = c.reduce((s, x: any) => s + (x.total_failed || 0), 0);
      return {
        campaigns: c.length,
        activeCampaigns: c.filter((x: any) => ["sending", "queued"].includes(x.status)).length,
        activeDrips: (drips || []).filter((d: any) => d.is_active).length,
        totalSent, totalDel, totalRead, totalFailed,
        deliveryRate: totalSent > 0 ? Math.round((totalDel / totalSent) * 100) : 0,
        readRate: totalDel > 0 ? Math.round((totalRead / totalDel) * 100) : 0,
      };
    },
    refetchInterval: 15000,
  });

  const items = [
    { label: "Campaigns", value: data?.campaigns || 0, icon: Megaphone, color: "text-primary" },
    { label: "Active", value: data?.activeCampaigns || 0, icon: Zap, color: "text-amber-500" },
    { label: "Drips Active", value: data?.activeDrips || 0, icon: Timer, color: "text-violet-500" },
    { label: "Sent", value: data?.totalSent || 0, icon: Send, color: "text-muted-foreground" },
    { label: "Delivered", value: `${data?.deliveryRate || 0}%`, icon: CheckCheck, color: "text-green-500" },
    { label: "Read Rate", value: `${data?.readRate || 0}%`, icon: Eye, color: "text-blue-500" },
  ];

  return (
    <div className="grid grid-cols-6 gap-2">
      {items.map((i) => (
        <Card key={i.label} className="p-3">
          <div className="flex items-center gap-2">
            <i.icon className={`h-4 w-4 ${i.color}`} />
            <div>
              <p className="text-[11px] text-muted-foreground">{i.label}</p>
              <p className="text-lg font-bold">{typeof i.value === "number" ? i.value.toLocaleString() : i.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Media Upload Component ───
function MediaUploader({ headerType, mediaUrl, onUrlChange, onFileUploaded }: {
  headerType: string;
  mediaUrl: string;
  onUrlChange: (url: string) => void;
  onFileUploaded: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("upload");

  const acceptMap: Record<string, string> = {
    image: "image/jpeg,image/png,image/webp",
    video: "video/mp4",
    document: "application/pdf",
  };

  const maxSizeMap: Record<string, number> = {
    image: 5 * 1024 * 1024,
    video: 16 * 1024 * 1024,
    document: 100 * 1024 * 1024,
  };

  const handleUpload = async (file: File) => {
    const maxSize = maxSizeMap[headerType] || 16 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${Math.round(maxSize / (1024 * 1024))}MB allowed`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `broadcast-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage.from("wa-media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadErr) {
        // Bucket may not exist, try creating
        if (uploadErr.message?.includes("not found") || uploadErr.message?.includes("Bucket")) {
          toast.error("Storage bucket 'wa-media' not found. Please set it up first.");
        } else {
          throw uploadErr;
        }
        return;
      }

      const { data: urlData } = supabase.storage.from("wa-media").getPublicUrl(path);
      onFileUploaded(urlData.publicUrl);
      toast.success("✅ File uploaded!");
    } catch (err) {
      toast.error("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Force direct upload only for video (Meta requires hosted media; URL mode hides for video)
  const effectiveMode = headerType === "video" ? "upload" : uploadMode;

  return (
    <div className="space-y-2">
      {headerType !== "video" && (
        <div className="flex items-center gap-2">
          <Button
            type="button" size="sm" variant={uploadMode === "upload" ? "default" : "outline"}
            className="h-6 text-[10px] gap-1"
            onClick={() => setUploadMode("upload")}
          >
            <Upload className="h-3 w-3" /> Upload File
          </Button>
          <Button
            type="button" size="sm" variant={uploadMode === "url" ? "default" : "outline"}
            className="h-6 text-[10px] gap-1"
            onClick={() => setUploadMode("url")}
          >
            <Globe className="h-3 w-3" /> Paste URL
          </Button>
        </div>
      )}
      {headerType === "video" && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Upload className="h-3 w-3" /> Video must be uploaded directly (URL not allowed by Meta)
        </p>
      )}

      {effectiveMode === "upload" ? (
        <div className="space-y-1.5">
          <input
            ref={fileRef}
            type="file"
            accept={acceptMap[headerType] || "*"}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <Button
            type="button" variant="outline" className="w-full h-20 border-dashed gap-2 text-sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <FileUp className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Click to upload {headerType}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {headerType === "video" && "MP4, max 16MB, up to 60 sec"}
                    {headerType === "image" && "JPG/PNG, max 5MB"}
                    {headerType === "document" && "PDF, max 100MB"}
                  </p>
                </div>
              </>
            )}
          </Button>
          {mediaUrl && (
            <div className="flex items-center gap-2 bg-green-500/10 rounded-lg p-2">
              <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <span className="text-[10px] text-green-700 dark:text-green-400 truncate flex-1">{mediaUrl.split("/").pop()}</span>
              <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => onUrlChange("")}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Input
            value={mediaUrl}
            onChange={e => onUrlChange(e.target.value)}
            placeholder={
              headerType === "video" ? "https://example.com/video.mp4" :
              headerType === "image" ? "https://example.com/image.jpg" :
              "https://example.com/document.pdf"
            }
            className="h-8 text-xs font-mono"
          />
          <p className="text-[9px] text-muted-foreground">
            {headerType === "video" && "Supported: MP4, max 16MB, up to 60 seconds"}
            {headerType === "image" && "Supported: JPG, PNG, max 5MB"}
            {headerType === "document" && "Supported: PDF, max 100MB"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Campaign Phone Preview ───
function CampaignPhonePreview({ header_type, header_content, body, footer, buttons, media_url, variableSamples }: {
  header_type: string; header_content: string; body: string; footer: string; buttons: CampaignButton[]; media_url?: string; variableSamples?: VariableSample[];
}) {
  const renderVars = (text: string) => {
    return text.replace(/\{\{(\w+)\}\}/g, (_, v) => {
      const custom = variableSamples?.find(vs => vs.key === v);
      if (custom?.value) return custom.value;
      const found = BROADCAST_VARS.find(bv => bv.key === v);
      return found ? found.sample : `[${v}]`;
    });
  };

  return (
    <div className="w-[300px] mx-auto">
      <div className="bg-gray-900 rounded-[2rem] p-2 shadow-2xl">
        <div className="bg-gray-900 rounded-t-[1.5rem] pt-5 pb-1 px-4">
          <div className="flex items-center gap-2 text-white text-xs">
            <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">G</div>
            <div>
              <p className="font-medium text-sm">GrabYourCar</p>
              <p className="text-[10px] text-gray-400">Business Account</p>
            </div>
          </div>
        </div>
        <div className="bg-[#e5ddd5] rounded-b-[1.5rem] p-3 pb-4 min-h-[360px] flex flex-col justify-end">
          <div className="bg-white rounded-lg p-2.5 shadow-sm w-full">
            {/* Header */}
            {header_type === "text" && header_content && (
              <p className="font-bold text-xs mb-1">{renderVars(header_content)}</p>
            )}
            {header_type === "image" && (
              <div className="bg-gray-200 rounded h-28 flex items-center justify-center mb-2 overflow-hidden">
                {media_url ? (
                  <img src={media_url} alt="Header" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <><Image className="h-6 w-6 text-gray-400" /><span className="text-[10px] text-gray-400 ml-1">Image</span></>
                )}
              </div>
            )}
            {header_type === "video" && (
              <div className="bg-gray-800 rounded h-28 flex items-center justify-center mb-2 relative overflow-hidden">
                {media_url ? (
                  <video src={media_url} className="w-full h-full object-cover" muted />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/80 rounded-full p-2">
                    <Play className="h-4 w-4 text-gray-800 fill-gray-800" />
                  </div>
                </div>
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded">0:60</div>
              </div>
            )}
            {header_type === "document" && (
              <div className="bg-gray-100 rounded p-2 flex items-center gap-2 mb-2 border">
                <FileText className="h-5 w-5 text-red-500" />
                <span className="text-[10px] text-gray-600 truncate">{media_url ? media_url.split("/").pop() : "Document.pdf"}</span>
              </div>
            )}
            {/* Body */}
            <p className="text-[11px] whitespace-pre-wrap leading-relaxed">
              {body ? renderVars(body) : "Your message preview will appear here..."}
            </p>
            {/* Footer */}
            {footer && (
              <p className="text-[9px] text-gray-500 mt-1.5 border-t pt-1">{footer}</p>
            )}
            <p className="text-[9px] text-gray-400 text-right mt-1">
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
            </p>
          </div>
          {/* Buttons */}
          {buttons.length > 0 && (
            <div className="mt-2 w-full space-y-1.5 pb-1">
              {buttons.map((btn, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg px-4 py-2.5 text-center text-[13px] leading-tight text-blue-600 font-medium shadow-sm flex items-center justify-center gap-2 min-h-[36px] w-full"
                  title={btn.text || "Button"}
                >
                  {btn.type === "URL" && <Globe className="h-3.5 w-3.5 shrink-0" />}
                  {btn.type === "PHONE_NUMBER" && <PhoneCall className="h-3.5 w-3.5 shrink-0" />}
                  {btn.type === "QUICK_REPLY" && <Reply className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate max-w-[200px]">{btn.text || "Button"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Button Editor ───
function CampaignButtonEditor({ buttons, onChange }: { buttons: CampaignButton[]; onChange: (b: CampaignButton[]) => void }) {
  const addButton = (type: CampaignButton["type"]) => {
    if (buttons.length >= 3) { toast.error("Max 3 buttons allowed by Meta"); return; }
    const quickReplyCount = buttons.filter(b => b.type === "QUICK_REPLY").length;
    const ctaCount = buttons.filter(b => b.type !== "QUICK_REPLY").length;
    if (type === "QUICK_REPLY" && ctaCount > 0) { toast.error("Can't mix Quick Reply with CTA buttons"); return; }
    if (type !== "QUICK_REPLY" && quickReplyCount > 0) { toast.error("Can't mix CTA with Quick Reply buttons"); return; }
    onChange([...buttons, {
      type,
      text: "",
      url: type === "URL" ? "https://" : undefined,
      phone_number: type === "PHONE_NUMBER" ? "+91" : undefined,
    }]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Buttons (max 3)</Label>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => addButton("URL")} disabled={buttons.length >= 3}>
            <Globe className="h-3 w-3" /> CTA URL
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => addButton("PHONE_NUMBER")} disabled={buttons.length >= 3}>
            <PhoneCall className="h-3 w-3" /> CTA Call
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => addButton("QUICK_REPLY")} disabled={buttons.length >= 3}>
            <Reply className="h-3 w-3" /> Quick Reply
          </Button>
        </div>
      </div>
      {buttons.map((btn, idx) => (
        <div key={idx} className="border rounded-lg p-2.5 space-y-1.5 bg-muted/30">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[9px]">
              {btn.type === "URL" ? "🔗 CTA URL" : btn.type === "PHONE_NUMBER" ? "📞 CTA Call" : "↩️ Quick Reply"}
            </Badge>
            <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => onChange(buttons.filter((_, i) => i !== idx))}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Input
            value={btn.text}
            onChange={e => onChange(buttons.map((b, i) => i === idx ? { ...b, text: e.target.value } : b))}
            placeholder="Button text (max 25 chars)"
            className="h-7 text-xs"
            maxLength={25}
          />
          {btn.type === "URL" && (
            <div>
              <Input
                value={btn.url || ""}
                onChange={e => onChange(buttons.map((b, i) => i === idx ? { ...b, url: e.target.value } : b))}
                placeholder="https://example.com/{{1}}"
                className="h-7 text-xs font-mono"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">Use {"{{1}}"} for dynamic URL suffix</p>
            </div>
          )}
          {btn.type === "PHONE_NUMBER" && (
            <Input
              value={btn.phone_number || ""}
              onChange={e => onChange(buttons.map((b, i) => i === idx ? { ...b, phone_number: e.target.value } : b))}
              placeholder="+919577200023"
              className="h-7 text-xs font-mono"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Variable Sample Editor ───
function VariableSampleEditor({ body, samples, onChange }: { body: string; samples: VariableSample[]; onChange: (s: VariableSample[]) => void }) {
  const usedVars = (body.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, ""));
  const uniqueVars = [...new Set(usedVars)];

  if (uniqueVars.length === 0) return null;

  return (
    <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
      <Label className="text-xs font-semibold">📋 Sample Values (for preview & Meta approval)</Label>
      <div className="grid grid-cols-2 gap-2">
        {uniqueVars.map((v) => {
          const defaultSample = BROADCAST_VARS.find(bv => bv.key === v)?.sample || "";
          const current = samples.find(s => s.key === v)?.value || "";
          return (
            <div key={v} className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] shrink-0 font-mono">{`{{${v}}}`}</Badge>
              <Input
                value={current || defaultSample}
                onChange={e => {
                  const existing = samples.filter(s => s.key !== v);
                  onChange([...existing, { key: v, value: e.target.value }]);
                }}
                className="h-6 text-[10px]"
                placeholder={defaultSample}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Excel Recipient Uploader ───
async function parseRecipientExcel(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("No sheet found in Excel");
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, col) => { headers[col - 1] = String(cell.value || "").trim(); });
  const rows: Record<string, string>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const obj: Record<string, string> = {};
    row.eachCell((cell, col) => {
      const key = headers[col - 1];
      if (key) obj[key] = String(cell.value ?? "").trim();
    });
    if (obj.phone || obj.Phone || obj.PHONE) rows.push(obj);
  });
  return { headers: headers.filter(Boolean), rows };
}

function RecipientExcelUploader({ requiredVars, onParsed }: {
  requiredVars: string[];
  onParsed: (data: { rows: Record<string, string>[]; missing: string[] } | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<{ rows: Record<string, string>[]; missing: string[]; headers: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      const { headers, rows } = await parseRecipientExcel(file);
      const lowerHeaders = headers.map(h => h.toLowerCase());
      const missing = requiredVars.filter(v => !lowerHeaders.includes(v.toLowerCase()));
      if (!lowerHeaders.includes("phone")) missing.unshift("phone");
      const res = { rows, missing, headers };
      setResult(res);
      onParsed({ rows, missing });
      if (missing.length > 0) toast.error(`Missing required columns: ${missing.join(", ")}`);
      else toast.success(`✅ ${rows.length} recipients loaded with all variables.`);
    } catch (e) {
      toast.error("Excel parse failed: " + (e as Error).message);
      onParsed(null);
    } finally { setParsing(false); }
  };

  const downloadTemplate = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Recipients");
    const cols = ["phone", ...requiredVars.filter(v => v !== "phone")];
    ws.addRow(cols);
    ws.addRow(["9876543210", ...cols.slice(1).map(c => BROADCAST_VARS.find(v => v.key === c)?.sample || "Sample")]);
    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "broadcast-recipients-template.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">📊 Upload Recipients Excel *</Label>
        <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={downloadTemplate}>
          <FileText className="h-3 w-3" /> Download Template
        </Button>
      </div>
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 text-[10px] text-blue-700 dark:text-blue-400">
        <p className="font-semibold mb-1">Required columns (must exist in Excel):</p>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[9px] font-mono">phone</Badge>
          {requiredVars.filter(v => v !== "phone").map(v => (
            <Badge key={v} variant="outline" className="text-[9px] font-mono">{v}</Badge>
          ))}
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <Button type="button" variant="outline" className="w-full h-16 border-dashed gap-2" onClick={() => fileRef.current?.click()} disabled={parsing}>
        {parsing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Parsing...</> : <><FileUp className="h-4 w-4" /> Click to upload .xlsx</>}
      </Button>
      {result && (
        <div className={`rounded-lg p-2 text-[11px] ${result.missing.length === 0 ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
          {result.missing.length === 0 ? (
            <><Check className="h-3 w-3 inline mr-1" /> {result.rows.length} recipients ready • Columns: {result.headers.join(", ")}</>
          ) : (
            <><AlertCircle className="h-3 w-3 inline mr-1" /> Missing: <span className="font-mono font-bold">{result.missing.join(", ")}</span> — Excel me ye columns add karein, tabhi details client tak jayengi</>
          )}
        </div>
      )}
    </div>
  );
}

// ─── One-Shot Broadcast: 4-Step Wizard ───
type WizardStep = 1 | 2 | 3 | 4;

function OneShotBroadcast() {
  const qc = useQueryClient();
  const [step, setStep] = useState<WizardStep>(1);
  // mode: 'approved' = pick existing approved template & skip to Step 3 ; 'build' = build & submit new
  const [mode, setMode] = useState<"approved" | "build">("approved");
  const [form, setForm] = useState({
    name: "", message: "", template_id: "", template_name: "", template_status: "",
    batch_size: 50, header_type: "none" as string, header_content: "", footer: "",
    buttons: [] as CampaignButton[], media_url: "", variable_samples: [] as VariableSample[], send_quote: false,
  });
  const [recipients, setRecipients] = useState<Record<string, string>[] | null>(null);
  const [excelMissing, setExcelMissing] = useState<string[]>([]);
  const [testPhone, setTestPhone] = useState("");
  const [testSent, setTestSent] = useState(false);

  const requiredVars = [...new Set((form.message.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/\{\{|\}\}/g, "")))];

  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ["broadcast-templates-all"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_templates").select("id, name, display_name, body, status, header_type, header_content, footer, buttons, category, language, created_at").order("created_at", { ascending: false });
      return data || [];
    },
    refetchInterval: step === 2 ? 10000 : false,
  });

  const approvedTemplates = (templates || []).filter((t: any) => t.status === "approved");

  // Pick an approved template → autofill form & jump to Step 3
  const pickApprovedTemplate = (tplId: string) => {
    const t: any = (templates || []).find((x: any) => x.id === tplId);
    if (!t) return;
    setForm({
      name: t.display_name || t.name,
      message: t.body || "",
      template_id: t.id,
      template_name: t.name,
      template_status: t.status,
      batch_size: 50,
      header_type: t.header_type || "none",
      header_content: t.header_type === "text" ? (t.header_content || "") : "",
      footer: t.footer || "",
      buttons: Array.isArray(t.buttons) ? t.buttons : [],
      media_url: t.header_type && t.header_type !== "text" && t.header_type !== "none" ? (t.header_content || "") : "",
      variable_samples: [],
      send_quote: false,
    });
    setRecipients(null); setExcelMissing([]); setTestPhone(""); setTestSent(false);
    setStep(3);
    toast.success(`✅ Template "${t.display_name || t.name}" selected. Ab recipients upload karo.`);
  };

  // Past recipient lists from previous campaigns (for re-use)
  const { data: pastLists } = useQuery({
    queryKey: ["broadcast-past-recipient-lists"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_campaigns")
        .select("id, name, created_at, metadata, total_sent")
        .eq("channel", "whatsapp")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data || []).filter((c: any) => Array.isArray(c?.metadata?.excel_recipients) && c.metadata.excel_recipients.length > 0);
    },
  });

  const submitTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.message) throw new Error("Campaign name and message required");
      const tplName = form.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 60);
      const { data: tpl, error: insertErr } = await supabase.from("wa_templates").insert({
        name: tplName, display_name: form.name, category: "marketing", language: "en",
        body: form.message,
        header_type: form.header_type === "none" ? null : form.header_type,
        header_content: form.header_content || form.media_url || null,
        footer: form.footer || null, buttons: form.buttons as any,
        variables: requiredVars as any, status: "draft",
      } as any).select().single();
      if (insertErr) throw insertErr;
      const { error: subErr } = await supabase.functions.invoke("meta-templates", {
        body: { action: "submit_template", template_id: tpl.id },
      });
      if (subErr) throw subErr;
      return tpl;
    },
    onSuccess: (tpl) => {
      setForm(p => ({ ...p, template_id: tpl.id, template_name: tpl.name, template_status: "pending" }));
      setStep(2);
      toast.success("📤 Template submitted to Meta. Approval usually takes 1–10 minutes.");
      refetchTemplates();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const currentTemplate = templates?.find((t: any) => t.id === form.template_id);
  if (currentTemplate && currentTemplate.status !== form.template_status) {
    setTimeout(() => setForm(p => ({ ...p, template_status: currentTemplate.status })), 0);
  }
  const isApproved = currentTemplate?.status === "approved";

  const testSendMutation = useMutation({
    mutationFn: async () => {
      const clean = testPhone.replace(/\D/g, "").replace(/^91/, "");
      if (!/^[6-9]\d{9}$/.test(clean)) throw new Error("Invalid Indian mobile (10 digits)");
      const sampleRow: Record<string, string> = {};
      requiredVars.forEach(v => {
        const sample = form.variable_samples.find(s => s.key === v);
        sampleRow[v] = sample?.value || BROADCAST_VARS.find(b => b.key === v)?.sample || "Test";
      });
      let content = form.message;
      Object.entries(sampleRow).forEach(([k, v]) => { content = content.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v); });
      const { data, error } = await supabase.functions.invoke("wa-send-inbox", {
        body: {
          phone: `91${clean}`,
          message_type: form.header_type === "none" || form.header_type === "text" ? "text" : form.header_type,
          content, template_name: form.template_name,
          media_url: form.media_url || undefined, test_send: true,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Test send failed");
      return data;
    },
    onSuccess: () => {
      setTestSent(true);
      toast.success(`✅ Test message sent to ${testPhone}. Check WhatsApp.`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const bulkShootMutation = useMutation({
    mutationFn: async () => {
      if (!recipients || recipients.length === 0) throw new Error("Upload Excel first");
      if (excelMissing.length > 0) throw new Error("Excel has missing columns");
      const phones = recipients.map(r => {
        const phone = r.phone || r.Phone || r.PHONE || "";
        return phone.replace(/\D/g, "").replace(/^91/, "");
      }).filter(p => /^[6-9]\d{9}$/.test(p));

      const { data: campaign, error } = await supabase.from("wa_campaigns").insert({
        name: form.name, message_content: form.message, template_id: form.template_id,
        batch_size: form.batch_size, status: "draft", campaign_type: "broadcast",
        channel: "whatsapp", meta_category: "marketing",
        segment_rules: [{ field: "phone", operator: "in", value: phones }],
        metadata: {
          header_type: form.header_type, header_content: form.header_content,
          footer: form.footer, buttons: form.buttons, media_url: form.media_url,
          variable_samples: form.variable_samples, send_quote: form.send_quote,
          excel_recipients: recipients, required_vars: requiredVars,
        },
      } as any).select().single();
      if (error) throw error;
      const { error: launchErr } = await supabase.functions.invoke("wa-campaign-launcher", {
        body: { campaignId: campaign.id },
      });
      if (launchErr) throw launchErr;
      return campaign;
    },
    onSuccess: () => {
      toast.success("🚀 Broadcast launched to all recipients!");
      qc.invalidateQueries({ queryKey: ["broadcast-pro-stats"] });
      qc.invalidateQueries({ queryKey: ["broadcast-history"] });
      setForm({ name: "", message: "", template_id: "", template_name: "", template_status: "", batch_size: 50, header_type: "none", header_content: "", footer: "", buttons: [], media_url: "", variable_samples: [], send_quote: false });
      setRecipients(null); setExcelMissing([]); setTestPhone(""); setTestSent(false); setStep(1);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const insertVariable = (key: string) => setForm(p => ({ ...p, message: p.message + `{{${key}}}` }));

  const STEPS = [
    { n: 1, label: "Build Template", icon: Megaphone },
    { n: 2, label: "Meta Approval", icon: CheckCheck },
    { n: 3, label: "Upload & Test", icon: FileUp },
    { n: 4, label: "Bulk Shoot", icon: Rocket },
  ];

  return (
    <div className="space-y-3">
      {/* Stepper */}
      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => {
            const active = step === s.n;
            const done = step > s.n;
            const Icon = s.icon;
            return (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] uppercase font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>Step {s.n}</p>
                  <p className={`text-xs font-medium truncate ${active || done ? "" : "text-muted-foreground"}`}>{s.label}</p>
                </div>
                {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 space-y-3">
          {step === 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Megaphone className="h-4 w-4 text-green-600" /> Step 1: Choose or Build Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMode("approved")}
                    className={`text-xs font-semibold py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${mode === "approved" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Use Approved Template
                    <Badge variant="secondary" className="text-[9px] ml-1">{approvedTemplates.length}</Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("build")}
                    className={`text-xs font-semibold py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${mode === "build" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Build New Template
                  </button>
                </div>

                {mode === "approved" && (
                  <div className="space-y-2">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 text-xs text-green-700 dark:text-green-400 flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Approved template select karo → seedha <b>recipients upload</b> aur <b>send</b>. Meta approval skip — already approved hai.</span>
                    </div>
                    {approvedTemplates.length === 0 ? (
                      <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground">
                        Koi approved template nahi mila. <button className="underline text-primary" onClick={() => setMode("build")}>Build New Template</button> use karo.
                      </div>
                    ) : (
                      <ScrollArea className="h-[420px] pr-2">
                        <div className="space-y-1.5">
                          {approvedTemplates.map((t: any) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => pickApprovedTemplate(t.id)}
                              className="w-full text-left border rounded-lg p-2.5 hover:bg-muted/50 hover:border-primary transition-all group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-sm font-semibold truncate">{t.display_name || t.name}</p>
                                    <Badge className="bg-green-500 text-white text-[9px]">approved</Badge>
                                    {t.header_type && t.header_type !== "none" && (
                                      <Badge variant="outline" className="text-[9px] capitalize">
                                        {t.header_type === "video" ? "🎬" : t.header_type === "image" ? "🖼️" : t.header_type === "document" ? "📄" : "📝"} {t.header_type}
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-[9px] uppercase">{t.language || "en"}</Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{t.name}</p>
                                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{t.body}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}

                {mode === "build" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Campaign / Template Name *</Label>
                      <Input placeholder="e.g., Diwali Loan Offer 2026" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
                      <p className="text-[9px] text-muted-foreground">Template name: <span className="font-mono">{form.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 60) || "template_name"}</span></p>
                    </div>

                    <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
                      <Label className="text-xs font-semibold">Header (optional)</Label>
                      <Select value={form.header_type} onValueChange={(v) => setForm(p => ({ ...p, header_type: v, header_content: "", media_url: "" }))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="text">📝 Text</SelectItem>
                          <SelectItem value="image">🖼️ Image</SelectItem>
                          <SelectItem value="video">🎬 Video (up to 1 min)</SelectItem>
                          <SelectItem value="document">📄 Document (PDF)</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.header_type === "text" && (
                        <Input value={form.header_content} onChange={e => setForm(p => ({ ...p, header_content: e.target.value }))} placeholder="Header text (max 60 chars)" className="h-8 text-sm" maxLength={60} />
                      )}
                      {(form.header_type === "image" || form.header_type === "video" || form.header_type === "document") && (
                        <MediaUploader headerType={form.header_type} mediaUrl={form.media_url} onUrlChange={(url) => setForm(p => ({ ...p, media_url: url }))} onFileUploaded={(url) => setForm(p => ({ ...p, media_url: url }))} />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Message Body *</Label>
                      <Textarea placeholder="Hello {{customer_name}}! Your {{car_model}} loan is approved..." value={form.message} onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))} rows={5} className="text-sm" />
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground mr-1">Insert variable:</span>
                        {BROADCAST_VARS.map((v) => (
                          <Button key={v.key} variant="outline" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => insertVariable(v.key)}>{`{{${v.label}}}`}</Button>
                        ))}
                      </div>
                    </div>

                    <VariableSampleEditor body={form.message} samples={form.variable_samples} onChange={(s) => setForm(p => ({ ...p, variable_samples: s }))} />

                    <div className="space-y-1 border rounded-lg p-3 bg-muted/20">
                      <Label className="text-xs font-semibold">Footer (optional, max 60 chars)</Label>
                      <Input value={form.footer} onChange={e => setForm(p => ({ ...p, footer: e.target.value }))} placeholder="e.g., GrabYourCar.com | Reply STOP to opt-out" className="h-8 text-sm" maxLength={60} />
                    </div>

                    <CampaignButtonEditor buttons={form.buttons} onChange={(b) => setForm(p => ({ ...p, buttons: b }))} />

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-2 text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Submit kar ke <b>Meta approval</b> ka wait karein. Bulk send <b>only after approval</b> unlock hoga.</span>
                    </div>

                    <Button className="w-full gap-2 bg-primary text-primary-foreground h-10" onClick={() => submitTemplateMutation.mutate()} disabled={submitTemplateMutation.isPending || !form.name || !form.message}>
                      <Send className="h-4 w-4" /> {submitTemplateMutation.isPending ? "Submitting..." : "Submit to Meta for Approval"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}


          {step === 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><CheckCheck className="h-4 w-4 text-amber-500" /> Step 2: Waiting for Meta Approval</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`rounded-lg p-4 text-center ${isApproved ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                  <div className={`inline-flex h-14 w-14 rounded-full items-center justify-center mb-2 ${isApproved ? "bg-green-500" : "bg-amber-500"}`}>
                    {isApproved ? <Check className="h-7 w-7 text-white" /> : <RefreshCw className="h-7 w-7 text-white animate-spin" />}
                  </div>
                  <p className="font-semibold text-sm">Template: <span className="font-mono">{form.template_name}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: <Badge variant={isApproved ? "default" : "secondary"} className={isApproved ? "bg-green-500" : ""}>{form.template_status || "pending"}</Badge>
                  </p>
                  {!isApproved && <p className="text-[11px] text-muted-foreground mt-2">Auto-checking every 10 sec... Usually 1–10 minutes.</p>}
                  {isApproved && <p className="text-[11px] text-green-700 dark:text-green-400 mt-2 font-medium">✅ Approved! Ab recipients upload aur send kar sakte ho.</p>}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back to Edit</Button>
                  <Button variant="outline" className="flex-1 gap-1" onClick={() => refetchTemplates()}>
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </Button>
                  <Button className="flex-1 gap-1" disabled={!isApproved} onClick={() => setStep(3)}>
                    Next <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileUp className="h-4 w-4 text-blue-500" /> Step 3: Upload Recipients & Test Send</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <RecipientExcelUploader
                  requiredVars={requiredVars}
                  onParsed={(d) => {
                    if (d) { setRecipients(d.rows); setExcelMissing(d.missing); }
                    else { setRecipients(null); setExcelMissing([]); }
                  }}
                />

                <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
                  <Label className="text-xs font-semibold flex items-center gap-1"><PhoneCall className="h-3 w-3" /> Test Send to Your Number First *</Label>
                  <div className="flex gap-2">
                    <Input value={testPhone} onChange={e => { setTestPhone(e.target.value); setTestSent(false); }} placeholder="9876543210 (10 digits)" className="h-8 text-sm font-mono flex-1" maxLength={10} />
                    <Button type="button" onClick={() => testSendMutation.mutate()} disabled={testSendMutation.isPending || !testPhone || testPhone.length !== 10} className="h-8 gap-1">
                      <Send className="h-3 w-3" /> {testSendMutation.isPending ? "Sending..." : "Send Test"}
                    </Button>
                  </div>
                  {testSent && (
                    <div className="bg-green-500/10 rounded p-2 text-[11px] text-green-700 dark:text-green-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Test sent to {testPhone}. WhatsApp check karein, agar message theek hai toh bulk shoot karein.
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Quote className="h-4 w-4 text-blue-500" />
                      <Label className="text-xs font-semibold">Attach Quote PDF (auto-generate per lead)</Label>
                    </div>
                    <Switch checked={form.send_quote} onCheckedChange={(v) => setForm(p => ({ ...p, send_quote: v }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Batch Size</Label>
                    <Select value={String(form.batch_size)} onValueChange={(v) => setForm(p => ({ ...p, batch_size: Number(v) }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{[25, 50, 100, 200, 500].map(n => <SelectItem key={n} value={String(n)}>{n}/batch</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Recipients Loaded</Label>
                    <div className="h-8 px-3 rounded-md border bg-background flex items-center text-sm font-bold">{recipients?.length || 0}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Back</Button>
                  <Button className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white" disabled={!testSent || !recipients || excelMissing.length > 0} onClick={() => setStep(4)}>
                    Next: Review & Shoot <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
                {!testSent && <p className="text-[10px] text-amber-600 text-center">⚠ Test send karna mandatory hai bulk shoot se pehle.</p>}
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Rocket className="h-4 w-4 text-green-600" /> Step 4: Review & Bulk Shoot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-[10px] text-muted-foreground">Recipients</p>
                    <p className="text-2xl font-bold">{recipients?.length || 0}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-[10px] text-muted-foreground">Template</p>
                    <p className="text-sm font-semibold truncate">{form.template_name}</p>
                    <Badge className="bg-green-500 text-white text-[9px] mt-1">approved</Badge>
                  </div>
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-[10px] text-muted-foreground">Variables</p>
                    <p className="text-sm font-mono truncate">{requiredVars.join(", ") || "—"}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-[10px] text-muted-foreground">Batch Size</p>
                    <p className="text-2xl font-bold">{form.batch_size}/min</p>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-2 text-xs text-amber-700 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Click karte hi <b>{recipients?.length || 0}</b> recipients ko personalized variables ke saath messages dispatch hone start ho jayenge.</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1">← Back</Button>
                  <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white h-11" onClick={() => bulkShootMutation.mutate()} disabled={bulkShootMutation.isPending}>
                    <Rocket className="h-4 w-4" /> {bulkShootMutation.isPending ? "Launching..." : `🚀 Shoot to ${recipients?.length || 0}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="col-span-2">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-blue-500" /> Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignPhonePreview header_type={form.header_type} header_content={form.header_content} body={form.message} footer={form.footer} buttons={form.buttons} media_url={form.media_url} variableSamples={form.variable_samples} />
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground">Body Length</p>
                  <p className="text-sm font-bold">{form.message.length}/1024</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground">Variables</p>
                  <p className="text-sm font-bold">{requiredVars.length}</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground">Buttons</p>
                  <p className="text-sm font-bold">{form.buttons.length}/3</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-[10px] text-muted-foreground">Header</p>
                  <p className="text-sm font-bold capitalize">{form.header_type === "none" ? "—" : form.header_type}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Drip Campaigns Tab ───
function DripCampaigns() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newDrip, setNewDrip] = useState({ name: "", vertical: "all", steps: [{ day: 0, message: "", template_name: "", delay_hours: 0 }] });

  const { data: sequences } = useQuery({
    queryKey: ["drip-sequences-pro"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_drip_sequences").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ["drip-enrollment-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_drip_enrollments").select("sequence_id, status");
      const counts: Record<string, { active: number; completed: number; total: number }> = {};
      (data || []).forEach((e: any) => {
        if (!counts[e.sequence_id]) counts[e.sequence_id] = { active: 0, completed: 0, total: 0 };
        counts[e.sequence_id].total++;
        if (e.status === "active") counts[e.sequence_id].active++;
        if (e.status === "completed") counts[e.sequence_id].completed++;
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newDrip.name || newDrip.steps.length === 0) throw new Error("Name and at least one step required");
      const { error } = await supabase.from("wa_drip_sequences").insert({
        name: newDrip.name,
        vertical: newDrip.vertical,
        steps: newDrip.steps,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Drip sequence created!");
      qc.invalidateQueries({ queryKey: ["drip-sequences-pro"] });
      setShowCreate(false);
      setNewDrip({ name: "", vertical: "all", steps: [{ day: 0, message: "", template_name: "", delay_hours: 0 }] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await supabase.from("wa_drip_sequences").update({ is_active: isActive }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drip-sequences-pro"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("wa_drip_sequences").delete().eq("id", id);
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["drip-sequences-pro"] }); },
  });

  const addStep = () => {
    const lastDay = newDrip.steps[newDrip.steps.length - 1]?.day || 0;
    setNewDrip((p) => ({ ...p, steps: [...p.steps, { day: lastDay + 1, message: "", template_name: "", delay_hours: 24 }] }));
  };

  const updateStep = (idx: number, field: string, value: any) => {
    setNewDrip((p) => ({ ...p, steps: p.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));
  };

  const removeStep = (idx: number) => {
    if (newDrip.steps.length <= 1) return;
    setNewDrip((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Timer className="h-4 w-4 text-violet-500" /> Drip Sequences</h3>
          <p className="text-xs text-muted-foreground">Multi-step automated follow-up campaigns</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Drip</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(sequences || []).map((seq: any) => {
          const counts = enrollmentCounts?.[seq.id] || { active: 0, completed: 0, total: 0 };
          const steps = (seq.steps || []) as any[];
          return (
            <Card key={seq.id} className={!seq.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{seq.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{seq.vertical || "All"}</Badge>
                      <Badge variant={seq.is_active ? "default" : "secondary"} className="text-[10px]">
                        {seq.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={seq.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: seq.id, isActive: v })} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this drip?")) deleteMutation.mutate(seq.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Step Flow Visualization */}
                <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                  {steps.map((step: any, i: number) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {i + 1}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-0.5">Day {step.day}</span>
                      </div>
                      {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </div>

                {/* Enrollment Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-xs font-bold">{counts.active}</p>
                    <p className="text-[10px] text-muted-foreground">Active</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-xs font-bold">{counts.completed}</p>
                    <p className="text-[10px] text-muted-foreground">Done</p>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5">
                    <p className="text-xs font-bold">{counts.total}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(sequences || []).length === 0 && (
          <Card className="col-span-2 p-8 text-center text-muted-foreground">
            <Timer className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No drip sequences yet. Create your first one.</p>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Drip Sequence</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sequence Name *</Label>
                <Input placeholder="e.g., New Lead Follow-up" value={newDrip.name} onChange={(e) => setNewDrip((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vertical</Label>
                <Select value={newDrip.vertical} onValueChange={(v) => setNewDrip((p) => ({ ...p, vertical: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="cars">Cars</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Steps</Label>
                <Button size="sm" variant="outline" onClick={addStep}><Plus className="h-3 w-3 mr-1" /> Add Step</Button>
              </div>
              {newDrip.steps.map((step, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{idx + 1}</div>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs shrink-0">Day:</Label>
                        <Input type="number" min={0} value={step.day} onChange={(e) => updateStep(idx, "day", Number(e.target.value))} className="h-7 text-xs w-16" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Label className="text-xs shrink-0">Delay (hrs):</Label>
                        <Input type="number" min={0} value={step.delay_hours} onChange={(e) => updateStep(idx, "delay_hours", Number(e.target.value))} className="h-7 text-xs w-16" />
                      </div>
                    </div>
                    {newDrip.steps.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeStep(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Input placeholder="Template name (optional)" value={step.template_name} onChange={(e) => updateStep(idx, "template_name", e.target.value)} className="h-7 text-xs mb-2" />
                  <Textarea placeholder={`Step ${idx + 1} message... Use {name}, {phone}`} value={step.message} onChange={(e) => updateStep(idx, "message", e.target.value)} rows={2} className="text-xs" />
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Layers className="h-4 w-4 mr-1" /> Create Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Event Triggers Tab ───
function EventTriggers() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", trigger_event: "new_lead", message: "", template_name: "", is_active: true, vertical: "all" });

  const TRIGGER_EVENTS = [
    { value: "new_lead", label: "New Lead Created", icon: "🆕" },
    { value: "lead_won", label: "Lead Won / Converted", icon: "🏆" },
    { value: "lead_lost", label: "Lead Lost", icon: "❌" },
    { value: "follow_up_due", label: "Follow-up Due", icon: "📅" },
    { value: "no_response_24h", label: "No Response 24hrs", icon: "⏰" },
    { value: "quote_sent", label: "Quote Sent", icon: "📋" },
    { value: "payment_received", label: "Payment Received", icon: "💰" },
    { value: "policy_issued", label: "Policy Issued", icon: "📄" },
    { value: "renewal_reminder", label: "Renewal Reminder", icon: "🔄" },
    { value: "birthday", label: "Birthday Wish", icon: "🎂" },
  ];

  const { data: rules } = useQuery({
    queryKey: ["wa-trigger-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_chatbot_rules").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.message) throw new Error("Name and message required");
      const { error } = await supabase.from("wa_chatbot_rules").insert({
        name: form.name,
        intent_keywords: [`event:${form.trigger_event}`],
        response_content: form.message,
        response_type: "text",
        template_name: form.template_name || null,
        is_active: form.is_active,
        priority: 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trigger created!");
      qc.invalidateQueries({ queryKey: ["wa-trigger-rules"] });
      setShowCreate(false);
      setForm({ name: "", trigger_event: "new_lead", message: "", template_name: "", is_active: true, vertical: "all" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleRule = async (id: string, isActive: boolean) => {
    await supabase.from("wa_chatbot_rules").update({ is_active: !isActive }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["wa-trigger-rules"] });
  };

  const triggerRules = (rules || []).filter((r: any) => (r.intent_keywords || []).some((k: string) => k.startsWith("event:")));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Event Triggers</h3>
          <p className="text-xs text-muted-foreground">Auto-send messages when events occur</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Trigger</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {triggerRules.map((rule: any) => {
          const eventKey = ((rule.intent_keywords || []) as string[]).find((k: string) => k.startsWith("event:"))?.replace("event:", "") || "";
          const event = TRIGGER_EVENTS.find((e) => e.value === eventKey);
          return (
            <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{event?.icon || "⚡"}</span>
                    <div>
                      <p className="font-medium text-sm">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">{event?.label || eventKey}</p>
                    </div>
                  </div>
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule.id, rule.is_active)} />
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 bg-muted/50 rounded p-2">{rule.response_content}</p>
              </CardContent>
            </Card>
          );
        })}
        {triggerRules.length === 0 && (
          <Card className="col-span-2 p-8 text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No event triggers set up yet.</p>
          </Card>
        )}
      </div>

      {/* Create Trigger Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Event Trigger</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Trigger Name *</Label>
              <Input placeholder="e.g., Welcome New Lead" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>When this happens:</Label>
              <Select value={form.trigger_event} onValueChange={(v) => setForm((p) => ({ ...p, trigger_event: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.icon} {e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template (optional)</Label>
              <Input placeholder="Meta-approved template name" value={form.template_name} onChange={(e) => setForm((p) => ({ ...p, template_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Message Content *</Label>
              <Textarea placeholder="Hello {name}! ..." value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              <Zap className="h-4 w-4 mr-1" /> Create Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Campaign History Tab ───
function CampaignHistory() {
  const { data: campaigns } = useQuery({
    queryKey: ["broadcast-history"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_campaigns").select("*").eq("channel", "whatsapp").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { class: string; icon: any }> = {
      completed: { class: "bg-green-500/10 text-green-600", icon: CheckCheck },
      sending: { class: "bg-amber-500/10 text-amber-600", icon: RefreshCw },
      queued: { class: "bg-blue-500/10 text-blue-600", icon: Clock },
      failed: { class: "bg-destructive/10 text-destructive", icon: AlertCircle },
      draft: { class: "bg-muted text-muted-foreground", icon: Clock },
    };
    const cfg = map[status] || map.draft;
    const Icon = cfg.icon;
    return <Badge className={cfg.class}><Icon className="h-3 w-3 mr-1" />{status}</Badge>;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Read</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(campaigns || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No campaigns yet</TableCell>
                </TableRow>
              ) : (campaigns || []).map((c: any) => {
                const total = (c.total_sent || 0) + (c.total_failed || 0) || 1;
                const delRate = Math.round(((c.total_delivered || 0) / total) * 100);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{c.message_content?.slice(0, 50)}</p>
                    </TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{(c.total_sent || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm">{(c.total_delivered || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({delRate}%)</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{(c.total_read || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive">{(c.total_failed || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─── Main Broadcasts Pro ───
export function WAHubBroadcasts() {
  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <BroadcastStats />

      <Tabs defaultValue="broadcast" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="broadcast" className="gap-1.5 text-xs">
            <Megaphone className="h-3.5 w-3.5" /> One-Shot
          </TabsTrigger>
          <TabsTrigger value="drips" className="gap-1.5 text-xs">
            <Timer className="h-3.5 w-3.5" /> Drip Campaigns
          </TabsTrigger>
          <TabsTrigger value="triggers" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" /> Event Triggers
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast"><OneShotBroadcast /></TabsContent>
        <TabsContent value="drips"><DripCampaigns /></TabsContent>
        <TabsContent value="triggers"><EventTriggers /></TabsContent>
        <TabsContent value="history"><CampaignHistory /></TabsContent>
      </Tabs>
    </div>
  );
}
