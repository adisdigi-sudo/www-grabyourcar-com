import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Send, Rocket, Image, FileText, Video, Search,
  CheckCheck, Check, Eye, MessageSquare, Users,
  Clock, AlertCircle, Upload, X, Zap, BarChart3
} from "lucide-react";

// ─── Types ───
interface CampaignForm {
  name: string;
  description: string;
  message_content: string;
  template_id: string;
  media_url: string;
  media_type: string;
  batch_size: number;
  segment_rules: Array<{ field: string; operator: string; value: string }>;
}

// ─── Overview Stats Bar ───
function OverviewStatsBar() {
  const { data: stats } = useQuery({
    queryKey: ["wa-command-stats"],
    queryFn: async () => {
      const { data: campaigns } = await supabase
        .from("wa_campaigns")
        .select("total_sent, total_delivered, total_read, total_replied, total_failed, status");
      const totals = (campaigns || []).reduce(
        (acc, c) => ({
          sent: acc.sent + (c.total_sent || 0),
          delivered: acc.delivered + (c.total_delivered || 0),
          read: acc.read + (c.total_read || 0),
          replied: acc.replied + (c.total_replied || 0),
          failed: acc.failed + (c.total_failed || 0),
          active: acc.active + (["sending", "queued"].includes(c.status) ? 1 : 0),
          total: acc.total + 1,
        }),
        { sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, active: 0, total: 0 }
      );
      return totals;
    },
    refetchInterval: 10000,
  });

  const items = [
    { label: "Campaigns", value: stats?.total || 0, icon: BarChart3, color: "text-primary" },
    { label: "Active", value: stats?.active || 0, icon: Zap, color: "text-amber-500" },
    { label: "Sent", value: stats?.sent || 0, icon: Check, color: "text-muted-foreground" },
    { label: "Delivered", value: stats?.delivered || 0, icon: CheckCheck, color: "text-muted-foreground" },
    { label: "Read", value: stats?.read || 0, icon: Eye, color: "text-blue-500" },
    { label: "Replied", value: stats?.replied || 0, icon: MessageSquare, color: "text-green-500" },
    { label: "Failed", value: stats?.failed || 0, icon: AlertCircle, color: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-7 gap-2">
      {items.map((item) => (
        <Card key={item.label} className="p-3">
          <div className="flex items-center gap-2">
            <item.icon className={`h-4 w-4 ${item.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold">{item.value.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Template Designer + Campaign Builder (Left Panel) ───
function CampaignBuilder({ onCampaignCreated }: { onCampaignCreated: () => void }) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CampaignForm>({
    name: "",
    description: "",
    message_content: "",
    template_id: "",
    media_url: "",
    media_type: "",
    batch_size: 50,
    segment_rules: [],
  });
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [acceptType, setAcceptType] = useState("");

  // Fetch templates
  const { data: templates } = useQuery({
    queryKey: ["wa-templates-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("status", "approved")
        .order("name");
      return data || [];
    },
  });

  // Fetch segments
  const { data: segments } = useQuery({
    queryKey: ["wa-segments-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_contact_segments")
        .select("*")
        .order("name");
      return data || [];
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates?.find((t: any) => t.id === templateId);
    setForm((prev) => ({
      ...prev,
      template_id: templateId,
      message_content: tpl?.content || prev.message_content,
    }));
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video duration
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });
      if (video.duration > 30) {
        toast.error("Video must be 30 seconds or less");
        URL.revokeObjectURL(video.src);
        return;
      }
      URL.revokeObjectURL(video.src);
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `campaign-media/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("broadcast-media").upload(path, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("broadcast-media").getPublicUrl(path);
    const mediaType = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
      ? "video"
      : "document";

    setForm((prev) => ({ ...prev, media_url: urlData.publicUrl, media_type: mediaType }));
    setMediaPreview(urlData.publicUrl);
    setUploading(false);
    toast.success(`${mediaType} uploaded`);
  };

  const removeMedia = () => {
    setForm((prev) => ({ ...prev, media_url: "", media_type: "" }));
    setMediaPreview("");
  };

  const insertVariable = (variable: string) => {
    setForm((prev) => ({
      ...prev,
      message_content: prev.message_content + `{${variable}}`,
    }));
  };

  // Shoot Now mutation
  const shootNow = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.message_content) throw new Error("Name and message required");

      // Create campaign
      const { data: campaign, error: cErr } = await supabase
        .from("wa_campaigns")
        .insert({
          name: form.name,
          description: form.description,
          message_content: form.message_content,
          template_id: form.template_id || null,
          media_url: form.media_url || null,
          media_type: form.media_type || null,
          batch_size: form.batch_size,
          segment_rules: form.segment_rules,
          status: "draft",
          campaign_type: "broadcast",
        })
        .select()
        .single();

      if (cErr) throw cErr;

      // Launch immediately
      const { data: launchData, error: launchErr } = await supabase.functions.invoke(
        "wa-campaign-launcher",
        { body: { campaignId: campaign.id } }
      );

      if (launchErr) throw launchErr;
      return { campaign, launch: launchData };
    },
    onSuccess: (data) => {
      toast.success(`🚀 Campaign launched! ${data.launch?.queued || 0} messages queued`);
      qc.invalidateQueries({ queryKey: ["wa-command-stats"] });
      qc.invalidateQueries({ queryKey: ["wa-campaign-messages"] });
      onCampaignCreated();
      setForm({
        name: "",
        description: "",
        message_content: "",
        template_id: "",
        media_url: "",
        media_type: "",
        batch_size: 50,
        segment_rules: [],
      });
      setMediaPreview("");
    },
    onError: (err) => toast.error("Launch failed: " + (err as Error).message),
  });

  const handleSegmentSelect = (segmentId: string) => {
    const seg = segments?.find((s: any) => s.id === segmentId);
    if (seg?.rules) {
      setForm((prev) => ({ ...prev, segment_rules: seg.rules as any }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Template Designer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            Template & Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select onValueChange={handleTemplateSelect}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Pick a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Type your message... Use {name}, {phone}, {car_model} for personalization"
            value={form.message_content}
            onChange={(e) => setForm((prev) => ({ ...prev, message_content: e.target.value }))}
            rows={4}
            className="text-sm"
          />

          {/* Variable buttons */}
          <div className="flex flex-wrap gap-1">
            {["name", "phone", "city", "car_model", "email"].map((v) => (
              <Button
                key={v}
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => insertVariable(v)}
              >
                {`{${v}}`}
              </Button>
            ))}
          </div>

          {/* WhatsApp Preview Bubble */}
          {form.message_content && (
            <div className="bg-[#dcf8c6] rounded-lg p-3 text-sm max-w-[280px] ml-auto shadow-sm relative">
              {mediaPreview && form.media_type === "image" && (
                <img src={mediaPreview} alt="preview" className="rounded mb-2 max-h-32 object-cover w-full" />
              )}
              {mediaPreview && form.media_type === "video" && (
                <div className="bg-muted rounded mb-2 p-4 flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  <span className="text-xs">Video (30s max)</span>
                </div>
              )}
              {mediaPreview && form.media_type === "document" && (
                <div className="bg-muted rounded mb-2 p-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-red-500" />
                  <span className="text-xs">PDF Document</span>
                </div>
              )}
              <p className="whitespace-pre-wrap text-[13px]">
                {form.message_content.replace(/\{(\w+)\}/g, (_, v) => `[${v}]`)}
              </p>
              <span className="text-[10px] text-gray-500 float-right mt-1">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
              </span>
            </div>
          )}

          {/* Media Attachment */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptType}
              className="hidden"
              onChange={handleMediaUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => {
                setAcceptType("image/*");
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              disabled={uploading}
            >
              <Image className="h-3 w-3" /> Image
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => {
                setAcceptType(".pdf");
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              disabled={uploading}
            >
              <FileText className="h-3 w-3" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => {
                setAcceptType("video/*");
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              disabled={uploading}
            >
              <Video className="h-3 w-3" /> Video 30s
            </Button>
            {mediaPreview && (
              <Button variant="ghost" size="sm" onClick={removeMedia} className="text-xs text-destructive">
                <X className="h-3 w-3" /> Remove
              </Button>
            )}
          </div>
          {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
        </CardContent>
      </Card>

      {/* Campaign Setup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rocket className="h-4 w-4 text-amber-500" />
            Campaign Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Campaign name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="h-9 text-sm"
          />
          <Input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="h-9 text-sm"
          />

          <Select onValueChange={handleSegmentSelect}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select audience segment..." />
            </SelectTrigger>
            <SelectContent>
              {segments?.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <Users className="h-3 w-3" /> {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Batch size:</span>
            <Select
              value={String(form.batch_size)}
              onValueChange={(v) => setForm((prev) => ({ ...prev, batch_size: Number(v) }))}
            >
              <SelectTrigger className="h-9 text-sm w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="whatsapp"
            size="lg"
            className="w-full gap-2 text-base"
            onClick={() => shootNow.mutate()}
            disabled={shootNow.isPending || !form.name || !form.message_content}
          >
            <Rocket className="h-5 w-5" />
            {shootNow.isPending ? "Launching..." : "🚀 Shoot Marketing Now!"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Delivery Status Ticks ───
function StatusTicks({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return <Check className="h-3 w-3 text-gray-400 inline" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-gray-400 inline" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-500 inline" />;
    case "replied":
      return (
        <span className="inline-flex items-center gap-0.5">
          <CheckCheck className="h-3 w-3 text-blue-500" />
          <MessageSquare className="h-2.5 w-2.5 text-green-500" />
        </span>
      );
    case "failed":
      return <AlertCircle className="h-3 w-3 text-destructive inline" />;
    default:
      return <Clock className="h-3 w-3 text-muted-foreground inline" />;
  }
}

// ─── Customer Chat + Status View (Right Panel) ───
function ChatStatusView() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch message logs grouped by phone
  const { data: messageLogs } = useQuery({
    queryKey: ["wa-campaign-messages", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("wa_message_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data } = await query;
      return data || [];
    },
    refetchInterval: 8000,
  });

  // Group messages by phone
  const contactGroups = (messageLogs || []).reduce((acc: Record<string, any[]>, msg: any) => {
    const phone = msg.phone || "unknown";
    if (!acc[phone]) acc[phone] = [];
    acc[phone].push(msg);
    return acc;
  }, {});

  const contacts = Object.keys(contactGroups)
    .filter((p) => !searchQuery || p.includes(searchQuery))
    .map((phone) => {
      const msgs = contactGroups[phone];
      const latest = msgs[0];
      return {
        phone,
        lastMessage: latest.message_content?.slice(0, 50) || latest.template_name || "Template",
        lastTime: latest.sent_at,
        status: latest.status,
        count: msgs.length,
      };
    });

  const selectedMessages = selectedPhone ? (contactGroups[selectedPhone] || []).reverse() : [];

  // Delivery overview
  const deliveryStats = {
    sent: (messageLogs || []).filter((m: any) => m.status === "sent").length,
    delivered: (messageLogs || []).filter((m: any) => m.status === "delivered").length,
    read: (messageLogs || []).filter((m: any) => m.status === "read").length,
    replied: (messageLogs || []).filter((m: any) => m.status === "replied").length,
    failed: (messageLogs || []).filter((m: any) => m.status === "failed").length,
  };
  const totalMsgs = (messageLogs || []).length || 1;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Status Filter */}
      <div className="flex gap-1">
        {["all", "sent", "delivered", "read", "replied", "failed"].map((s) => (
          <Badge
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            className="cursor-pointer text-xs capitalize"
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </Badge>
        ))}
      </div>

      {/* Chat View */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Contact List */}
        <Card className="w-[220px] flex flex-col shrink-0">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {contacts.map((c) => (
              <div
                key={c.phone}
                onClick={() => setSelectedPhone(c.phone)}
                className={`p-2 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedPhone === c.phone ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium truncate">{c.phone}</p>
                  <StatusTicks status={c.status} />
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{c.lastMessage}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {c.lastTime ? new Date(c.lastTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {c.count}
                  </Badge>
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <p className="p-4 text-xs text-muted-foreground text-center">No messages yet</p>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Thread */}
        <Card className="flex-1 flex flex-col">
          {selectedPhone ? (
            <>
              <div className="p-3 border-b bg-green-50 dark:bg-green-950/20">
                <p className="text-sm font-semibold">{selectedPhone}</p>
                <p className="text-xs text-muted-foreground">{selectedMessages.length} messages</p>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {selectedMessages.map((msg: any) => (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-[#dcf8c6] dark:bg-green-900/40 rounded-lg p-2.5 max-w-[85%] shadow-sm">
                        {msg.media_url && (
                          <div className="mb-1.5">
                            {msg.message_type === "image" ? (
                              <img src={msg.media_url} alt="" className="rounded max-h-28 object-cover" />
                            ) : (
                              <div className="flex items-center gap-1 bg-muted rounded p-2 text-xs">
                                <FileText className="h-3 w-3" />
                                {msg.message_type === "video" ? "Video" : "Document"}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-xs whitespace-pre-wrap">
                          {msg.message_content || msg.template_name || "Template message"}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">
                            {msg.sent_at
                              ? new Date(msg.sent_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                          <StatusTicks status={msg.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a contact to view chat</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Delivery Overview */}
      <Card className="p-3">
        <p className="text-xs font-semibold mb-2">Message Delivery Overview</p>
        <div className="space-y-1.5">
          {[
            { label: "Sent", value: deliveryStats.sent, color: "bg-gray-400" },
            { label: "Delivered", value: deliveryStats.delivered, color: "bg-gray-500" },
            { label: "Read", value: deliveryStats.read, color: "bg-blue-500" },
            { label: "Replied", value: deliveryStats.replied, color: "bg-green-500" },
            { label: "Failed", value: deliveryStats.failed, color: "bg-destructive" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-[11px] w-16">{item.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all`}
                  style={{ width: `${(item.value / totalMsgs) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium w-10 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Main Command Center ───
export function WACampaignCommandCenter() {
  return (
    <div className="space-y-4">
      <OverviewStatsBar />

      <div className="flex gap-4" style={{ minHeight: "70vh" }}>
        {/* Left Panel — Builder (40%) */}
        <div className="w-[40%] shrink-0">
          <ScrollArea className="h-[70vh] pr-2">
            <CampaignBuilder onCampaignCreated={() => {}} />
          </ScrollArea>
        </div>

        {/* Right Panel — Chat + Status (60%) */}
        <div className="flex-1 min-w-0">
          <ChatStatusView />
        </div>
      </div>
    </div>
  );
}
