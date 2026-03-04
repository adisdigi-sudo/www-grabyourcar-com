import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, RotateCcw, CheckCircle2, Copy, Upload, X, FileVideo, ImageIcon, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE_TEMPLATES = [
  {
    name: "🎨 Holi Greeting",
    message: `🎨 *Wishing you a Colorful & Joyful Holi!* 🎉\n\nMay your journeys be filled with vibrant colors & happy memories.\n\n*Happy Holi from Team GrabYourCar!* 🚗✨`,
  },
  {
    name: "🚗 New Car Offer",
    message: `🚗 *Exciting Offer from GrabYourCar!*\n\n🔥 Get the best deals on your dream car this season!\n💰 Lowest on-road prices\n📋 Free insurance quotes\n🎁 Special festive discounts\n\n👉 Visit: https://grabyourcar.lovable.app\n📞 Call us: 9855924442`,
  },
  {
    name: "🛡️ Insurance Offer",
    message: `🛡️ *Car Insurance Renewal Reminder!*\n\nDon't let your insurance lapse! Renew with GrabYourCar for:\n✅ Best premiums\n✅ Instant policy\n✅ Zero paperwork\n\n👉 https://grabyourcar.lovable.app/car-insurance\n📞 9855924442`,
  },
  {
    name: "📢 General Promo",
    message: `👋 *Hello from GrabYourCar!*\n\nWe have something special for you! 🎁\n\n👉 https://grabyourcar.lovable.app\n📞 9855924442`,
  },
];

const parseNumbers = (raw: string): string[] => {
  return raw
    .split(/[\n,;]+/)
    .map((n) => n.trim().replace(/[^0-9]/g, ""))
    .filter((n) => n.length >= 10)
    .map((n) => (n.length === 10 ? `91${n}` : n));
};

const getFileIcon = (type: string) => {
  if (type.startsWith("video/")) return FileVideo;
  if (type.startsWith("image/")) return ImageIcon;
  return FileText;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const HoliBulkShare = () => {
  const [numbersRaw, setNumbersRaw] = useState("");
  const [message, setMessage] = useState(SAMPLE_TEMPLATES[0].message);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [mediaSize, setMediaSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const numbers = useMemo(() => parseNumbers(numbersRaw), [numbersRaw]);
  const progress = numbers.length > 0 ? Math.round((currentIndex / numbers.length) * 100) : 0;
  const isDone = started && currentIndex >= numbers.length;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (50MB max)
    if (file.size > 52428800) {
      toast.error("File too large. Max 50MB allowed.");
      return;
    }

    // Validate type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file type. Use JPG, PNG, GIF, MP4, WebM, or PDF.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `broadcast_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("broadcast-media")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("broadcast-media")
        .getPublicUrl(fileName);

      setMediaUrl(urlData.publicUrl);
      setMediaName(file.name);
      setMediaType(file.type);
      setMediaSize(file.size);
      toast.success("Media uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = () => {
    setMediaUrl(null);
    setMediaName("");
    setMediaType("");
    setMediaSize(0);
  };

  const buildFullMessage = () => {
    if (mediaUrl) {
      return `${message}\n\n👉 ${mediaUrl}`;
    }
    return message;
  };

  const sendNext = () => {
    if (currentIndex >= numbers.length) return;
    if (!started) setStarted(true);
    const phone = numbers[currentIndex];
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildFullMessage())}`;
    window.open(url, "_blank");
    setCurrentIndex((i) => i + 1);
  };

  const reset = () => {
    setCurrentIndex(0);
    setStarted(false);
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(buildFullMessage());
    toast.success("Message copied!");
  };

  const applyTemplate = (tpl: typeof SAMPLE_TEMPLATES[0]) => {
    setMessage(tpl.message);
    reset();
    toast.success(`"${tpl.name}" template loaded`);
  };

  const FileIcon = mediaType ? getFileIcon(mediaType) : ImageIcon;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">WhatsApp Bulk Broadcaster</h2>
          <p className="text-sm text-muted-foreground">Send offers, posts & media from your personal WhatsApp — no API needed</p>
        </div>
        <Badge variant="secondary" className="ml-auto hidden sm:block">Personal Number</Badge>
      </div>

      {/* Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_TEMPLATES.map((tpl) => (
              <Button key={tpl.name} variant="outline" size="sm" className="text-xs" onClick={() => applyTemplate(tpl)}>
                {tpl.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Message + Media */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Message & Media</CardTitle>
              <Button variant="ghost" size="sm" onClick={copyMessage} className="h-7 text-xs gap-1">
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Type your broadcast message here..."
              className="text-sm"
            />

            {/* Media Upload */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Attach Media (Image / Video / PDF)</label>

              {mediaUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  {mediaType.startsWith("image/") ? (
                    <img src={mediaUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover border" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mediaName}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(mediaSize)}</p>
                    <p className="text-[10px] text-primary truncate mt-0.5">{mediaUrl}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={removeMedia}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload</p>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG, GIF, MP4, WebM, PDF — Max 50MB</p>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </CardContent>
        </Card>

        {/* Phone Numbers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Phone Numbers
              {numbers.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px]">{numbers.length} contacts</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder={"Paste numbers here:\n9855924442\n9876543210\n8765432109"}
              value={numbersRaw}
              onChange={(e) => { setNumbersRaw(e.target.value); reset(); }}
              rows={8}
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">
              One per line, comma, or semicolon separated. 10-digit or with country code.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Send Controls */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {started && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sending progress</span>
                <span className="font-semibold">{currentIndex} / {numbers.length}</span>
              </div>
              <Progress value={progress} className="h-2.5" />
            </div>
          )}

          <div className="flex items-center gap-3">
            {isDone ? (
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                All {numbers.length} messages opened! 🎉
              </div>
            ) : (
              <Button
                onClick={sendNext}
                disabled={numbers.length === 0 || !message.trim()}
                size="lg"
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {started ? `Send Next (${currentIndex + 1} of ${numbers.length})` : `Start Sending to ${numbers.length || 0} contacts`}
              </Button>
            )}
            {started && (
              <Button variant="outline" onClick={reset} className="gap-1">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p><strong>How it works:</strong> Each click opens WhatsApp with your message + media link pre-filled for one contact.</p>
            <p>Hit send in WhatsApp → come back → click "Send Next" for the next contact.</p>
            {mediaUrl && <p className="text-primary">📎 Your uploaded media link will be included in every message.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
