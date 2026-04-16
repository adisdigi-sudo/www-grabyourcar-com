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
  Upload, FileUp, Quote,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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

  return (
    <div className="space-y-2">
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

      {uploadMode === "upload" ? (
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
    <div className="w-[280px] mx-auto">
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
        <div className="bg-[#e5ddd5] rounded-b-[1.5rem] p-3 min-h-[340px] flex flex-col justify-end">
          <div className="bg-white rounded-lg p-2.5 shadow-sm max-w-[92%] ml-auto">
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

// ─── One-Shot Broadcast Tab (Meta-Style Full Builder) ───
function OneShotBroadcast() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    message: "",
    template_id: "",
    segment: "all",
    batch_size: 50,
    header_type: "none" as string,
    header_content: "",
    footer: "",
    buttons: [] as CampaignButton[],
    media_url: "",
    variable_samples: [] as VariableSample[],
    send_quote: false,
  });

  const { data: templates } = useQuery({
    queryKey: ["broadcast-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_templates").select("id, name, body, status, header_type, header_content, footer, buttons, category").eq("status", "approved").order("name");
      return data || [];
    },
  });

  const { data: segments } = useQuery({
    queryKey: ["broadcast-segments"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_contact_segments").select("id, name, estimated_count").order("name");
      return data || [];
    },
  });

  const shootMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.message) throw new Error("Name and message required");
      const { data: campaign, error } = await supabase.from("wa_campaigns").insert({
        name: form.name,
        message_content: form.message,
        template_id: form.template_id || null,
        batch_size: form.batch_size,
        status: "draft",
        campaign_type: "broadcast",
        channel: "whatsapp",
        segment_rules: form.segment !== "all" ? [{ field: "segment_id", operator: "eq", value: form.segment }] : [],
        metadata: {
          header_type: form.header_type,
          header_content: form.header_content,
          footer: form.footer,
          buttons: form.buttons,
          media_url: form.media_url,
          variable_samples: form.variable_samples,
          send_quote: form.send_quote,
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
      toast.success("🚀 Broadcast launched!");
      qc.invalidateQueries({ queryKey: ["broadcast-pro-stats"] });
      qc.invalidateQueries({ queryKey: ["broadcast-history"] });
      setForm({ name: "", message: "", template_id: "", segment: "all", batch_size: 50, header_type: "none", header_content: "", footer: "", buttons: [], media_url: "", variable_samples: [], send_quote: false });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleTemplateSelect = (id: string) => {
    const t = templates?.find((t: any) => t.id === id);
    if (t) {
      setForm((p) => ({
        ...p,
        template_id: id,
        message: t.body || p.message,
        header_type: t.header_type || "none",
        header_content: t.header_content || "",
        footer: t.footer || "",
        buttons: (t.buttons as unknown as CampaignButton[]) || [],
      }));
    }
  };

  const insertVariable = (key: string) => {
    setForm(p => ({ ...p, message: p.message + `{{${key}}}` }));
  };

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* Builder — 3 cols */}
      <div className="col-span-3 space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-green-600" /> Meta-Style Campaign Builder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Row 1: Name + Template */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Campaign Name *</Label>
                <Input placeholder="e.g., Diwali Offer 2026" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Use Approved Template</Label>
                <Select value={form.template_id} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pick template (optional)" /></SelectTrigger>
                  <SelectContent>
                    {templates?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] h-4">{t.category}</Badge>
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Header Section */}
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
                <Input value={form.header_content} onChange={e => setForm(p => ({ ...p, header_content: e.target.value }))} placeholder="Header text (max 60 chars, 1 variable max)" className="h-8 text-sm" maxLength={60} />
              )}
              {(form.header_type === "image" || form.header_type === "video" || form.header_type === "document") && (
                <MediaUploader
                  headerType={form.header_type}
                  mediaUrl={form.media_url}
                  onUrlChange={(url) => setForm(p => ({ ...p, media_url: url }))}
                  onFileUploaded={(url) => setForm(p => ({ ...p, media_url: url }))}
                />
              )}
            </div>

            {/* Body / Message */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Message Body *</Label>
              <Textarea
                placeholder="Hello {{customer_name}}! 🎉 Your policy for {{vehicle_number}} is expiring on {{expiry_date}}..."
                value={form.message}
                onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                rows={5}
                className="text-sm"
              />
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground mr-1">Variables:</span>
                {BROADCAST_VARS.map((v) => (
                  <Button key={v.key} variant="outline" size="sm" className="h-5 text-[9px] px-1.5 gap-0.5" onClick={() => insertVariable(v.key)}>
                    {`{{${v.label}}}`}
                  </Button>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground">Max 1024 characters. Use *bold*, _italic_, ~strikethrough~ formatting.</p>
            </div>

            {/* Sample Values */}
            <VariableSampleEditor
              body={form.message}
              samples={form.variable_samples}
              onChange={(s) => setForm(p => ({ ...p, variable_samples: s }))}
            />

            {/* Footer */}
            <div className="space-y-1 border rounded-lg p-3 bg-muted/20">
              <Label className="text-xs font-semibold">Footer (optional, max 60 chars)</Label>
              <Input value={form.footer} onChange={e => setForm(p => ({ ...p, footer: e.target.value }))} placeholder="e.g., Reply STOP to unsubscribe | GrabYourCar.com" className="h-8 text-sm" maxLength={60} />
              <p className="text-[9px] text-muted-foreground">Appears in lighter text below the message</p>
            </div>

            {/* Buttons */}
            <CampaignButtonEditor buttons={form.buttons} onChange={(b) => setForm(p => ({ ...p, buttons: b }))} />

            {/* Quote / Document Attachment */}
            <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Quote className="h-4 w-4 text-blue-500" />
                  <Label className="text-xs font-semibold">Attach Quote PDF</Label>
                </div>
                <Switch
                  checked={form.send_quote}
                  onCheckedChange={(v) => setForm(p => ({ ...p, send_quote: v }))}
                />
              </div>
              {form.send_quote && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded p-2">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400">
                    📋 System will auto-generate & attach the latest quote PDF for each contact based on their lead data (car model, on-road price, EMI, etc). Works with Insurance quotes, Car deals, and Loan offers.
                  </p>
                </div>
              )}
            </div>

            {/* Audience + Batch */}
            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Audience Segment</Label>
                <Select value={form.segment} onValueChange={(v) => setForm(p => ({ ...p, segment: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📋 All Contacts</SelectItem>
                    {segments?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.estimated_count || 0})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Batch Size</Label>
                <Select value={String(form.batch_size)} onValueChange={(v) => setForm(p => ({ ...p, batch_size: Number(v) }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{[25, 50, 100, 200, 500].map(n => <SelectItem key={n} value={String(n)}>{n}/batch</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Meta Approval Notice */}
            {!form.template_id && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-2 text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Without an approved template, messages will only deliver inside the 24hr window. Select an approved template for guaranteed delivery.</span>
              </div>
            )}

            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-10" onClick={() => shootMutation.mutate()} disabled={shootMutation.isPending || !form.name || !form.message}>
              <Rocket className="h-4 w-4" /> {shootMutation.isPending ? "Launching..." : "🚀 Launch Campaign"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Side Preview — 2 cols */}
      <div className="col-span-2">
        <Card className="sticky top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-blue-500" /> Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignPhonePreview
              header_type={form.header_type}
              header_content={form.header_content}
              body={form.message}
              footer={form.footer}
              buttons={form.buttons}
              media_url={form.media_url}
              variableSamples={form.variable_samples}
            />
            {/* Quick Stats below preview */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="bg-muted/50 rounded p-2">
                <p className="text-[10px] text-muted-foreground">Body Length</p>
                <p className="text-sm font-bold">{form.message.length}/1024</p>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <p className="text-[10px] text-muted-foreground">Variables</p>
                <p className="text-sm font-bold">{(form.message.match(/\{\{\w+\}\}/g) || []).length}</p>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <p className="text-[10px] text-muted-foreground">Buttons</p>
                <p className="text-sm font-bold">{form.buttons.length}/3</p>
              </div>
              <div className="bg-muted/50 rounded p-2">
                <p className="text-[10px] text-muted-foreground">Header</p>
                <p className="text-sm font-bold capitalize">{form.header_type === "none" ? "—" : form.header_type}</p>
              </div>
              {form.send_quote && (
                <div className="col-span-2 bg-blue-500/10 rounded p-2">
                  <p className="text-[10px] text-blue-600 font-medium">📋 Quote PDF will be attached</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
