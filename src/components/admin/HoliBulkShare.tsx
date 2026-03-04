import { useMemo, useRef, useState, useCallback } from "react";
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
  Send,
  ExternalLink,
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
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
  "application/pdf",
];
const TABS_PER_BATCH = 10;

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
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === "," && !inQuotes) { cols.push(current.trim()); current = ""; continue; }
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
      .filter((idx) => idx >= 0).map((idx) => cols[idx] || "").filter(Boolean);
    for (const raw of rawPhones) {
      const phone = normalizeIndianPhone(raw);
      if (phone && !seen.has(phone)) { seen.add(phone); contacts.push({ name, phone }); break; }
    }
  }
  return contacts;
};

const parseManualNumbers = (raw: string): Contact[] => {
  const lines = raw.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);
  const contacts: Contact[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const phone = normalizeIndianPhone(line);
    if (phone && !seen.has(phone)) { seen.add(phone); contacts.push({ name: "Friend", phone }); }
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

  // Bulk wa.me state
  const [sentCount, setSentCount] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [done, setDone] = useState(false);

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

  const totalBatches = Math.ceil(allContacts.length / TABS_PER_BATCH);
  const previewContact = allContacts[0] ?? { name: "Friend", phone: "91XXXXXXXXXX" };

  const buildMessageForContact = (contact: Contact) => {
    let msg = message.trim().slice(0, 2000).replace(/\{name\}/gi, contact.name);
    // Append media URL to message text for wa.me (personal number sends link in text)
    if (mediaUrl) {
      msg += `\n\n📎 ${mediaUrl}`;
    }
    return msg;
  };

  const livePreviewText = buildMessageForContact(previewContact);

  const reset = () => {
    setSentCount(0);
    setCurrentBatch(0);
    setDone(false);
  };

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
    setContacts([]);
    setCsvImported(false);
    reset();
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
    setMediaUrl(null); setMediaName(""); setMediaType(""); setMediaSize(0); setMediaDuration(null);
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

  // Open a batch of wa.me tabs
  const sendNextBatch = useCallback(() => {
    const start = currentBatch * TABS_PER_BATCH;
    const batch = allContacts.slice(start, start + TABS_PER_BATCH);

    if (batch.length === 0) {
      setDone(true);
      toast.success(`🎉 All ${allContacts.length} messages opened!`);
      return;
    }

    for (const contact of batch) {
      const personalizedMsg = buildMessageForContact(contact);
      const encoded = encodeURIComponent(personalizedMsg);
      const url = `https://wa.me/${contact.phone}?text=${encoded}`;
      window.open(url, "_blank");
    }

    const newSent = Math.min(start + batch.length, allContacts.length);
    setSentCount(newSent);
    setCurrentBatch((prev) => prev + 1);

    if (newSent >= allContacts.length) {
      setDone(true);
      toast.success(`🎉 All ${allContacts.length} WhatsApp tabs opened!`);
    } else {
      toast.success(`✅ Opened ${batch.length} tabs (${newSent}/${allContacts.length}). Click "Send Next Batch" to continue.`);
    }
  }, [currentBatch, allContacts, message, mediaUrl]);

  const FileIcon = mediaType ? getFileIcon(mediaType) : ImageIcon;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp Bulk Broadcaster</h2>
          <p className="text-sm text-muted-foreground">
            Opens {TABS_PER_BATCH} wa.me tabs at a time — just hit Send in each WhatsApp chat.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <Card>
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground">
            📱 <strong>Personal Number Mode:</strong> Opens wa.me links in bulk batches of {TABS_PER_BATCH}. 
            Media URL is included in the message text. You just hit "Send" in each tab.
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

      {/* Main grid: Message + Preview | Contacts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: Message editor + Live Preview side by side */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Message Editor</CardTitle>
              <Button variant="ghost" size="sm" onClick={copyMessage} className="h-7 text-xs gap-1">
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Editor */}
              <div className="space-y-2">
                <Textarea
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); reset(); }}
                  rows={10}
                  placeholder="Type your message... Use {name}"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">{"{name}"}</code> for personalization.
                </p>
              </div>

              {/* Live Preview (WhatsApp-style bubble) */}
              <div className="rounded-lg border overflow-hidden flex flex-col">
                <div className="bg-primary text-primary-foreground px-3 py-2 text-xs font-medium flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px]">
                    {previewContact.name.charAt(0)}
                  </div>
                  <span className="truncate">{previewContact.name}</span>
                </div>
                <div className="flex-1 bg-muted/40 p-3 overflow-y-auto min-h-[200px] max-h-[300px]">
                  {/* Media preview in bubble */}
                  {mediaUrl && mediaType.startsWith("image/") && (
                    <div className="mb-1">
                      <img src={mediaUrl} alt="Attached" className="rounded-lg max-h-32 w-full object-cover" />
                    </div>
                  )}
                  {mediaUrl && !mediaType.startsWith("image/") && (
                    <div className="mb-1 p-2 bg-card/90 rounded-lg flex items-center gap-2 text-xs">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{mediaName}</span>
                    </div>
                  )}
                  <div className="bg-accent rounded-lg rounded-tr-none p-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm max-w-[95%] ml-auto">
                    {livePreviewText || "Your message preview..."}
                    <div className="text-right mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Media upload */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Attach Media (URL included in message text)
              </label>
              {mediaUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  {mediaType.startsWith("image/") ? (
                    <img src={mediaUrl} alt="Preview" className="h-14 w-14 rounded-lg object-cover border" loading="lazy" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center border">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mediaName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(mediaSize)}{mediaDuration ? ` • ${Math.round(mediaDuration)}s` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={removeMedia}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      <p className="text-xs text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Click to upload media</p>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG, GIF, MP4, WebM, PDF • Max 50MB</p>
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

        {/* Right: Contacts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Contacts
              {allContacts.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{allContacts.length} contacts</Badge>
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
              <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/20 p-2 space-y-0.5">
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
              onChange={(e) => { setNumbersRaw(e.target.value); reset(); }}
              rows={csvImported ? 4 : 8}
              className="text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground">One per line, comma, or semicolon.</p>
          </CardContent>
        </Card>
      </div>

      {/* Send Action */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {done ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">🎉 All {sentCount} WhatsApp tabs opened!</p>
                <p className="text-xs text-muted-foreground">
                  Hit Send in each tab to deliver the message.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={reset} className="shrink-0 gap-1">
                <RotateCcw className="h-3 w-3" /> New Broadcast
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Progress bar */}
              {sentCount > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress: {sentCount} / {allContacts.length}</span>
                    <span>Batch {currentBatch} / {totalBatches}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(sentCount / allContacts.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button
                  onClick={sendNextBatch}
                  disabled={allContacts.length === 0 || !message.trim()}
                  size="lg"
                  className="gap-2"
                >
                  {sentCount === 0 ? (
                    <>
                      <Send className="h-4 w-4" /> Open First {Math.min(TABS_PER_BATCH, allContacts.length)} Tabs
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4" /> Send Next Batch ({Math.min(TABS_PER_BATCH, allContacts.length - sentCount)} tabs)
                    </>
                  )}
                </Button>
                {sentCount > 0 && (
                  <Button variant="outline" size="sm" onClick={reset} className="gap-1">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p>
              <strong>How it works:</strong> Click the button → {TABS_PER_BATCH} wa.me tabs open in your browser → hit Send in each WhatsApp chat → click again for next batch.
            </p>
            <p>
              Media is included as a <strong>link in the message text</strong> (personal number mode).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
