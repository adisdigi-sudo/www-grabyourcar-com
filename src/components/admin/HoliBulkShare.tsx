import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, RotateCcw, CheckCircle2, Copy, Upload, X, FileVideo, ImageIcon, FileText, Loader2, Users, Trash2, Zap, MousePointer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE_TEMPLATES = [
  {
    name: "🎨 Holi Greeting",
    message: `🎨 *Wishing you a Colorful & Joyful Holi, {name}!* 🎉\n\nMay your journeys be filled with vibrant colors & happy memories.\n\n*Happy Holi from Team GrabYourCar!* 🚗✨`,
  },
  {
    name: "🚗 New Car Offer",
    message: `🚗 *Hi {name}, Exciting Offer from GrabYourCar!*\n\n🔥 Get the best deals on your dream car this season!\n💰 Lowest on-road prices\n📋 Free insurance quotes\n🎁 Special festive discounts\n\n👉 Visit: https://grabyourcar.lovable.app\n📞 Call us: 9855924442`,
  },
  {
    name: "🛡️ Insurance Offer",
    message: `🛡️ *Hi {name}, Car Insurance Renewal Reminder!*\n\nDon't let your insurance lapse! Renew with GrabYourCar for:\n✅ Best premiums\n✅ Instant policy\n✅ Zero paperwork\n\n👉 https://grabyourcar.lovable.app/car-insurance\n📞 9855924442`,
  },
  {
    name: "📢 General Promo",
    message: `👋 *Hello {name}, from GrabYourCar!*\n\nWe have something special for you! 🎁\n\n👉 https://grabyourcar.lovable.app\n📞 9855924442`,
  },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 45;
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
  "application/pdf",
];

interface Contact {
  name: string;
  phone: string;
}

const parseContactsCsv = (csvText: string): Contact[] => {
  const lines = csvText.split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
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
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",");
    const getName = () => {
      const parts = [
        firstNameIdx >= 0 ? cols[firstNameIdx]?.trim() : "",
        middleNameIdx >= 0 ? cols[middleNameIdx]?.trim() : "",
        lastNameIdx >= 0 ? cols[lastNameIdx]?.trim() : "",
      ].filter(Boolean);
      return parts.join(" ") || "Friend";
    };
    const rawPhones = [mobileIdx, primaryIdx, homeIdx, businessIdx, otherIdx]
      .filter((idx) => idx >= 0)
      .map((idx) => (cols[idx] || "").trim())
      .filter(Boolean);
    for (const raw of rawPhones) {
      const digits = raw.replace(/[^0-9]/g, "");
      let phone = "";
      if (digits.length === 12 && digits.startsWith("91")) phone = digits;
      else if (digits.length === 10) phone = `91${digits}`;
      else if (digits.length > 10) phone = digits.slice(-10).length === 10 ? `91${digits.slice(-10)}` : "";
      if (phone && phone.length === 12 && !seen.has(phone)) {
        seen.add(phone);
        contacts.push({ name: getName(), phone });
        break;
      }
    }
  }
  return contacts;
};

const parseManualNumbers = (raw: string): Contact[] => {
  const lines = raw.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);
  const contacts: Contact[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const digits = line.replace(/[^0-9]/g, "");
    let phone = "";
    if (digits.length === 10) phone = `91${digits}`;
    else if (digits.length === 12 && digits.startsWith("91")) phone = digits;
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
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Cannot read video")); };
    video.src = url;
  });

const getMediaTypeForApi = (mimeType: string): string => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "document";
  return "document";
};

export const HoliBulkShare = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [numbersRaw, setNumbersRaw] = useState("");
  const [message, setMessage] = useState(SAMPLE_TEMPLATES[0].message);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [mediaSize, setMediaSize] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [csvImported, setCsvImported] = useState(false);
  const [sendMode, setSendMode] = useState<"manual" | "api">("api");
  const [apiSending, setApiSending] = useState(false);
  const [apiResult, setApiResult] = useState<{ queued: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const allContacts = useMemo(() => {
    const manual = parseManualNumbers(numbersRaw);
    const seen = new Set(contacts.map((c) => c.phone));
    const merged = [...contacts];
    for (const m of manual) {
      if (!seen.has(m.phone)) { merged.push(m); seen.add(m.phone); }
    }
    return merged;
  }, [contacts, numbersRaw]);

  const progress = allContacts.length > 0 ? Math.round((currentIndex / allContacts.length) * 100) : 0;
  const isDone = started && currentIndex >= allContacts.length;

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseContactsCsv(text);
      if (parsed.length === 0) { toast.error("No valid contacts found in CSV."); return; }
      setContacts(parsed);
      setCsvImported(true);
      reset();
      toast.success(`✅ Imported ${parsed.length} contacts with names!`);
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const clearCsvContacts = () => {
    setContacts([]); setCsvImported(false); reset();
    toast.success("CSV contacts cleared.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { toast.error("File too large. Max 50MB."); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Unsupported file type."); return; }

    let duration: number | null = null;
    if (file.type.startsWith("video/")) {
      try {
        duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_SECONDS) { toast.error("Video too long. Max 45 seconds."); return; }
      } catch { toast.error("Could not read video duration."); return; }
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `broadcast_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("broadcast-media").upload(fileName, file, { cacheControl: "3600", upsert: true });
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
    setMediaUrl(null); setMediaName(""); setMediaType(""); setMediaSize(0); setMediaDuration(null);
  };

  const buildMessageForContact = (contact: Contact) => {
    let text = message.trim().slice(0, 2000);
    text = text.replace(/\{name\}/gi, contact.name);
    return text;
  };

  // ── Manual mode: wa.me links ──
  const sendNextManual = () => {
    if (currentIndex >= allContacts.length) return;
    if (!started) setStarted(true);
    const contact = allContacts[currentIndex];
    let fullMsg = buildMessageForContact(contact);
    if (mediaUrl) fullMsg += `\n\n👉 ${mediaUrl}`;
    const url = `https://wa.me/${contact.phone}?text=${encodeURIComponent(fullMsg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setCurrentIndex((i) => i + 1);
  };

  // ── API mode: queue all messages with media directly attached ──
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

      setApiResult({ queued, failed });

      if (queued > 0) {
        // Trigger the queue processor
        try {
          await supabase.functions.invoke("wa-queue-processor", {
            body: { batchSize: Math.min(queued, 50) },
          });
        } catch (e) {
          console.warn("Queue processor trigger failed, messages will process on next cycle:", e);
        }
        toast.success(`🚀 ${queued} messages queued! Media will be sent directly attached.`);
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

  const reset = () => { setCurrentIndex(0); setStarted(false); setApiResult(null); };

  const copyMessage = () => {
    const sample = allContacts.length > 0 ? buildMessageForContact(allContacts[0]) : message;
    navigator.clipboard.writeText(sample);
    toast.success("Message copied.");
  };

  const applyTemplate = (tpl: typeof SAMPLE_TEMPLATES[0]) => {
    setMessage(tpl.message); reset();
    toast.success(`Loaded: ${tpl.name}`);
  };

  const FileIcon = mediaType ? getFileIcon(mediaType) : ImageIcon;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp Bulk Broadcaster</h2>
          <p className="text-sm text-muted-foreground">Send messages with media directly attached to all contacts.</p>
        </div>
      </div>

      {/* Send Mode Toggle */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">Send Mode:</span>
            <Button
              variant={sendMode === "api" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => { setSendMode("api"); reset(); }}
            >
              <Zap className="h-3.5 w-3.5" />
              API Send (Direct Media)
            </Button>
            <Button
              variant={sendMode === "manual" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => { setSendMode("manual"); reset(); }}
            >
              <MousePointer className="h-3.5 w-3.5" />
              Manual (wa.me links)
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {sendMode === "api"
              ? "✅ API Send: Media (image/video/PDF) will be directly attached in WhatsApp — no links! Sends via your business WhatsApp API."
              : "Manual: Opens wa.me links one-by-one. Media is sent as a URL link in the message."}
          </p>
        </CardContent>
      </Card>

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
        {/* Message & Media */}
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
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Type your message... Use {name} for personalization" className="text-sm" />
            <p className="text-[10px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{name}"}</code> for personalization.</p>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Attach Media {sendMode === "api" ? "(Directly attached in WhatsApp ✅)" : "(Sent as link)"}
              </label>
              {mediaUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  {mediaType.startsWith("image/") ? (
                    <img src={mediaUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover border" loading="lazy" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mediaName}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(mediaSize)}{mediaDuration ? ` • ${Math.round(mediaDuration)}s` : ""}</p>
                    {sendMode === "api" && (
                      <Badge variant="secondary" className="text-[9px] mt-1">Will be attached directly</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={removeMedia}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <button type="button" className="w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2"><Loader2 className="h-8 w-8 text-primary animate-spin" /><p className="text-sm text-muted-foreground">Uploading...</p></div>
                  ) : (
                    <div className="flex flex-col items-center gap-2"><Upload className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Click to upload media</p><p className="text-[10px] text-muted-foreground">JPG, PNG, GIF, MP4, WebM, PDF • Max 45s video • Max 50MB</p></div>
                  )}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,application/pdf" className="hidden" onChange={handleFileUpload} />
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Contacts
              {allContacts.length > 0 && <Badge variant="secondary" className="text-[10px]">{allContacts.length} contacts</Badge>}
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
                  <Button variant="ghost" size="sm" onClick={clearCsvContacts} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
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
                {contacts.length > 50 && <p className="text-[10px] text-center text-muted-foreground pt-1">...and {contacts.length - 50} more</p>}
              </div>
            )}

            <Textarea
              placeholder={"Or paste numbers manually:\n9855924442\n9876543210"}
              value={numbersRaw}
              onChange={(e) => { setNumbersRaw(e.target.value); reset(); }}
              rows={csvImported ? 3 : 8}
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">One per line, comma, or semicolon.</p>
          </CardContent>
        </Card>
      </div>

      {/* Send Controls */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {/* API Mode */}
          {sendMode === "api" && (
            <>
              {apiResult ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">🚀 {apiResult.queued} messages queued for delivery!</p>
                    <p className="text-xs text-muted-foreground">Media is being sent directly attached via WhatsApp API. Messages will be delivered automatically.</p>
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
                      <><Loader2 className="h-4 w-4 animate-spin" /> Queuing {allContacts.length} messages...</>
                    ) : (
                      <><Zap className="h-4 w-4" /> Send to All {allContacts.length} Contacts</>
                    )}
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                <p><strong>✅ API Send:</strong> All messages are queued and sent automatically via your WhatsApp Business API.</p>
                <p>Images, videos, and PDFs are <strong>directly attached</strong> in WhatsApp — not as links!</p>
                <p>Use <code className="bg-muted px-1 rounded">{"{name}"}</code> for personalization.</p>
              </div>
            </>
          )}

          {/* Manual Mode */}
          {sendMode === "manual" && (
            <>
              {started && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Sending to: <strong>{currentIndex > 0 ? allContacts[currentIndex - 1]?.name : "—"}</strong>
                    </span>
                    <span className="font-semibold text-foreground">{currentIndex} / {allContacts.length}</span>
                  </div>
                  <Progress value={progress} className="h-2.5" />
                </div>
              )}

              <div className="flex items-center gap-3">
                {isDone ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    All {allContacts.length} chats opened! 🎉
                  </div>
                ) : (
                  <Button onClick={sendNextManual} disabled={allContacts.length === 0 || !message.trim()} size="lg" className="gap-2">
                    <Send className="h-4 w-4" />
                    {started
                      ? `Send Next → ${allContacts[currentIndex]?.name || ""} (${currentIndex + 1}/${allContacts.length})`
                      : `Start Sending to ${allContacts.length || 0} contacts`}
                  </Button>
                )}
                {started && (
                  <Button variant="outline" onClick={reset} className="gap-1"><RotateCcw className="h-4 w-4" /> Reset</Button>
                )}
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                <p><strong>Manual mode:</strong> Opens wa.me links. Media is sent as a URL link.</p>
                <p>For <strong>direct media attachment</strong>, switch to API Send mode above.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
