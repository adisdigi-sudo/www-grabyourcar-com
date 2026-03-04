import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  Copy,
  Upload,
  X,
  FileVideo,
  ImageIcon,
  FileText,
  Loader2,
  Users,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE_TEMPLATES = [
  {
    name: "🎨 Holi Greeting",
    message:
      "🎨 *Wishing you a Colorful & Joyful Holi, {name}!* 🎉\n\nMay your journeys be filled with vibrant colors & happy memories.\n\n*Happy Holi from Team GrabYourCar!* 🚗✨",
  },
  {
    name: "🚗 New Car Offer",
    message:
      "🚗 *Hi {name}, Exciting Offer from GrabYourCar!*\n\n🔥 Get the best deals on your dream car this season!\n💰 Lowest on-road prices\n📋 Free insurance quotes\n🎁 Special festive discounts\n\n👉 Visit: https://grabyourcar.lovable.app\n📞 Call us: 9855924442",
  },
  {
    name: "🛡️ Insurance Offer",
    message:
      "🛡️ *Hi {name}, Car Insurance Renewal Reminder!*\n\nDon't let your insurance lapse! Renew with GrabYourCar for:\n✅ Best premiums\n✅ Instant policy\n✅ Zero paperwork\n\n👉 https://grabyourcar.lovable.app/car-insurance\n📞 9855924442",
  },
  {
    name: "📢 General Promo",
    message:
      "👋 *Hello {name}, from GrabYourCar!*\n\nWe have something special for you! 🎁\n\n👉 https://grabyourcar.lovable.app\n📞 9855924442",
  },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 45;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
];

interface Contact {
  name: string;
  phone: string;
}

const parseCsvLine = (line: string): string[] => {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cols.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cols.push(current.trim());
  return cols;
};

const normalizeIndianPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10) {
    const lastTen = digits.slice(-10);
    if (lastTen.length === 10) return `91${lastTen}`;
  }
  return "";
};

const parseContactsCsv = (csvText: string): Contact[] => {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const firstNameIdx = header.indexOf("first name");
  const middleNameIdx = header.indexOf("middle name");
  const lastNameIdx = header.indexOf("last name");
  const mobileIdx = header.indexOf("mobile phone");
  const primaryIdx = header.indexOf("primary phone");
  const homeIdx = header.indexOf("home phone");
  const businessIdx = header.indexOf("business phone");
  const otherIdx = header.indexOf("other phone");

  const contacts: Contact[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);

    const nameParts = [
      firstNameIdx >= 0 ? cols[firstNameIdx] || "" : "",
      middleNameIdx >= 0 ? cols[middleNameIdx] || "" : "",
      lastNameIdx >= 0 ? cols[lastNameIdx] || "" : "",
    ].filter(Boolean);

    const name = nameParts.join(" ") || "Friend";
    const rawPhones = [mobileIdx, primaryIdx, homeIdx, businessIdx, otherIdx]
      .filter((idx) => idx >= 0)
      .map((idx) => cols[idx] || "")
      .filter(Boolean);

    for (const raw of rawPhones) {
      const phone = normalizeIndianPhone(raw);
      if (phone && !seen.has(phone)) {
        seen.add(phone);
        contacts.push({ name, phone });
        break;
      }
    }
  }

  return contacts;
};

const parseManualNumbers = (raw: string): Contact[] => {
  const lines = raw
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);

  const contacts: Contact[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const phone = normalizeIndianPhone(line);
    if (phone && !seen.has(phone)) {
      seen.add(phone);
      contacts.push({ name: "Friend", phone });
    }
  }

  return contacts;
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

const getVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cannot read video"));
    };
    video.src = url;
  });

const getMediaTypeForApi = (mimeType: string): string => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
};

export const HoliBulkShare = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [numbersRaw, setNumbersRaw] = useState("");
  const [message, setMessage] = useState(SAMPLE_TEMPLATES[0].message);
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [mediaSize, setMediaSize] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [csvImported, setCsvImported] = useState(false);
  const [apiSending, setApiSending] = useState(false);
  const [apiResult, setApiResult] = useState<{ queued: number; failed: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const allContacts = useMemo(() => {
    const manual = parseManualNumbers(numbersRaw);
    const seen = new Set(contacts.map((c) => c.phone));
    const merged = [...contacts];
    for (const m of manual) {
      if (!seen.has(m.phone)) {
        merged.push(m);
        seen.add(m.phone);
      }
    }
    return merged;
  }, [contacts, numbersRaw]);

  const previewContact = allContacts[0] ?? { name: "Friend", phone: "91XXXXXXXXXX" };

  const buildMessageForContact = (contact: Contact) => {
    return message.trim().slice(0, 2000).replace(/\{name\}/gi, contact.name);
  };

  const livePreviewText = buildMessageForContact(previewContact);

  const reset = () => {
    setApiResult(null);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseContactsCsv(text);
      if (parsed.length === 0) {
        toast.error("No valid contacts found in CSV.");
        return;
      }
      setContacts(parsed);
      setCsvImported(true);
      reset();
      toast.success(`✅ Imported ${parsed.length} contacts with names!`);
    };

    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const clearCsvContacts = () => {
    setContacts([]);
    setCsvImported(false);
    reset();
    toast.success("CSV contacts cleared.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Max 50MB.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Unsupported file type.");
      return;
    }

    let duration: number | null = null;
    if (file.type.startsWith("video/")) {
      try {
        duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_SECONDS) {
          toast.error("Video too long. Max 45 seconds.");
          return;
        }
      } catch {
        toast.error("Could not read video duration.");
        return;
      }
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `broadcast_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("broadcast-media")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("broadcast-media").getPublicUrl(fileName);
      setMediaUrl(urlData.publicUrl);
      setMediaName(file.name);
      setMediaType(file.type);
      setMediaSize(file.size);
      setMediaDuration(duration);
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
    setMediaDuration(null);
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(livePreviewText);
    toast.success("Message copied.");
  };

  const applyTemplate = (tpl: (typeof SAMPLE_TEMPLATES)[0]) => {
    setMessage(tpl.message);
    reset();
    toast.success(`Loaded: ${tpl.name}`);
  };

  const sendViaApi = async () => {
    if (allContacts.length === 0 || !message.trim()) return;

    setApiSending(true);
    setApiResult(null);

    try {
      const BATCH_SIZE = 100;
      let queued = 0;
      let failed = 0;

      for (let i = 0; i < allContacts.length; i += BATCH_SIZE) {
        const batch = allContacts.slice(i, i + BATCH_SIZE);
        const rows = batch.map((contact) => ({
          phone: contact.phone,
          message_content: buildMessageForContact(contact),
          media_url: mediaUrl || null,
          media_type: mediaUrl ? getMediaTypeForApi(mediaType) : null,
          status: "queued",
          priority: 5,
        }));

        const { error } = await supabase.from("wa_message_queue").insert(rows);
        if (error) {
          console.error("Queue insert error:", error);
          failed += batch.length;
        } else {
          queued += batch.length;
        }
      }

      if (queued > 0) {
        await supabase.functions.invoke("wa-queue-processor", {
          body: { batchSize: Math.min(queued, 200) },
        });
      }

      setApiResult({ queued, failed });

      if (queued > 0) {
        toast.success(`🚀 ${queued} messages sent to backend queue in auto mode.`);
      }
      if (failed > 0) {
        toast.error(`${failed} messages failed to queue.`);
      }
    } catch (err: any) {
      toast.error("Failed to queue messages: " + (err.message || "Unknown error"));
    } finally {
      setApiSending(false);
    }
  };

  const FileIcon = mediaType ? getFileIcon(mediaType) : ImageIcon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp Bulk Broadcaster</h2>
          <p className="text-sm text-muted-foreground">
            Auto mode only: messages send directly from backend with media attachment.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground">
            ✅ <strong>Auto Mode Enabled:</strong> no chat click needed; messages are queued and sent directly via backend API.
          </p>
        </CardContent>
      </Card>

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
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Message & Live Template Preview</CardTitle>
              <Button variant="ghost" size="sm" onClick={copyMessage} className="h-7 text-xs gap-1">
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    reset();
                  }}
                  rows={9}
                  placeholder="Type your message... Use {name}"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{"{name}"}</code> for personalization.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground">Live preview for: <strong>{previewContact.name}</strong></p>
                <div className="rounded-md bg-background border p-3 whitespace-pre-wrap text-sm leading-relaxed min-h-36">
                  {livePreviewText || "Your template preview will appear here..."}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Attach Media (Directly attached in WhatsApp ✅)
              </label>
              {mediaUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  {mediaType.startsWith("image/") ? (
                    <img src={mediaUrl} alt="Attachment preview" className="h-16 w-16 rounded-lg object-cover border" loading="lazy" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mediaName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(mediaSize)}{mediaDuration ? ` • ${Math.round(mediaDuration)}s` : ""}
                    </p>
                    <Badge variant="secondary" className="text-[9px] mt-1">
                      Will be attached directly
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={removeMedia}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
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
                      <p className="text-sm text-muted-foreground">Click to upload media</p>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG, GIF, MP4, WebM, PDF • Max 45s video • Max 50MB</p>
                    </div>
                  )}
                </button>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Contacts
              {allContacts.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {allContacts.length} contacts
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {csvImported ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{contacts.length} contacts imported</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCsvContacts}
                    className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => csvInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Import Contacts from CSV
                </Button>
              )}
              <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
            </div>

            {csvImported && contacts.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/20 p-2 space-y-0.5">
                {contacts.slice(0, 50).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-muted/40">
                    <span className="font-medium truncate max-w-[60%]">{c.name}</span>
                    <span className="text-muted-foreground font-mono">{c.phone.slice(2)}</span>
                  </div>
                ))}
                {contacts.length > 50 && (
                  <p className="text-[10px] text-center text-muted-foreground pt-1">...and {contacts.length - 50} more</p>
                )}
              </div>
            )}

            <Textarea
              placeholder={"Or paste numbers manually:\n9855924442\n9876543210"}
              value={numbersRaw}
              onChange={(e) => {
                setNumbersRaw(e.target.value);
                reset();
              }}
              rows={csvImported ? 3 : 8}
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">One per line, comma, or semicolon.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4 space-y-3">
          {apiResult ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">🚀 {apiResult.queued} messages queued for auto delivery!</p>
                <p className="text-xs text-muted-foreground">
                  Sent from backend directly; no WhatsApp click needed, and media is attached in chat.
                </p>
                {apiResult.failed > 0 && <p className="text-xs text-destructive">{apiResult.failed} failed to queue.</p>}
              </div>
              <Button variant="outline" size="sm" onClick={reset} className="shrink-0 gap-1">
                <RotateCcw className="h-3 w-3" /> New Broadcast
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                onClick={sendViaApi}
                disabled={allContacts.length === 0 || !message.trim() || apiSending}
                size="lg"
                className="gap-2"
              >
                {apiSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Queuing {allContacts.length} messages...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" /> Send Auto to All {allContacts.length} Contacts
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p>
              <strong>Auto backend mode:</strong> No manual chat click, no wa.me step.
            </p>
            <p>
              Media is <strong>directly attached</strong> in WhatsApp if provider accepts the uploaded file.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
