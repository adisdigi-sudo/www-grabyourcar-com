import { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Send, MessageSquare, Mail, Upload, Users, Loader2, CheckCircle2,
  AlertTriangle, FileSpreadsheet, Search, Filter, Megaphone, Zap,
  Clock, BarChart3, RefreshCw, Phone, X, Eye, Download
} from "lucide-react";
import { parseCSV } from "@/lib/spreadsheetUtils";

// ─── Types ───
interface Contact { name: string; phone: string; email?: string; tags?: string[]; }

// ─── Audience sources ───
const AUDIENCE_SOURCES = [
  { id: "insurance_clients", label: "Insurance Clients", icon: "🛡️" },
  { id: "insurance_prospects", label: "Insurance Prospects", icon: "📋" },
  { id: "customers", label: "CRM Customers", icon: "👥" },
  { id: "leads", label: "All Leads", icon: "🎯" },
  { id: "email_contacts", label: "Email Contacts", icon: "📧" },
  { id: "custom_upload", label: "Upload CSV/Excel", icon: "📎" },
];

// ─── WhatsApp Templates (commonly used) ───
const WA_QUICK_TEMPLATES = [
  { id: "custom", name: "✏️ Custom Message", body: "" },
  { id: "promo", name: "🚗 Car Promo", body: "🚗 *Hi {name}!*\n\nExciting offers from GrabYourCar!\n💰 Best prices guaranteed\n📋 Free insurance quotes\n🎁 Special discounts\n\n👉 www.grabyourcar.com\n📞 9855924442\n\n— Team GrabYourCar 💚" },
  { id: "insurance", name: "🛡️ Insurance Renewal", body: "🛡️ *Hi {name}!*\n\nYour vehicle insurance is due for renewal.\n\n✅ Compare 15+ insurers\n✅ Instant policy\n✅ Zero paperwork\n✅ Best premiums\n\n📞 Call: 9577200023\n👉 www.grabyourcar.com/car-insurance\n\n— GrabYourCar Insurance 🛡️" },
  { id: "festive", name: "🎉 Festival Greeting", body: "🎉 *{name}, Wishing you a very Happy Festival!*\n\nMay your journeys be filled with joy & happiness! 🚗✨\n\n— Team GrabYourCar 💚" },
  { id: "review", name: "⭐ Review Request", body: "😊 *Hi {name}!*\n\nThank you for choosing *GrabYourCar*! 🚗\n\nPlease leave a quick review:\n👉 https://share.google/xBBnueLfRt6stD8MO\n\n— Team GrabYourCar 💚" },
];

export const UnifiedBulkBroadcaster = () => {
  const [channel, setChannel] = useState<"whatsapp" | "email" | "both">("whatsapp");
  const [audienceSource, setAudienceSource] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingAudience, setIsLoadingAudience] = useState(false);

  // WhatsApp
  const [waTemplate, setWaTemplate] = useState("custom");
  const [waMessage, setWaMessage] = useState("");
  const [useMetaTemplate, setUseMetaTemplate] = useState(false);
  const [metaTemplateName, setMetaTemplateName] = useState("");

  // Email
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailFrom, setEmailFrom] = useState("sales@notify.grabyourcar.com");

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [showResult, setShowResult] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Meta templates ───
  const { data: metaTemplates } = useQuery({
    queryKey: ["wa-templates-broadcast"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("wa_templates").select("name, status, category").eq("status", "APPROVED");
      return (data || []) as { name: string; status: string; category: string }[];
    },
  });

  // ─── Load audience from DB ───
  const loadAudience = async (source: string) => {
    if (source === "custom_upload") return;
    setIsLoadingAudience(true);
    setAudienceSource(source);

    try {
      let query: any;
      switch (source) {
        case "insurance_clients":
          query = supabase.from("insurance_clients").select("customer_name, phone, email").not("phone", "is", null).limit(5000);
          break;
        case "insurance_prospects":
          query = supabase.from("insurance_prospects").select("customer_name, phone, email").not("phone", "is", null).limit(5000);
          break;
        case "customers":
          query = (supabase as any).from("customers").select("name, phone, email").not("phone", "is", null).limit(5000);
          break;
        case "leads":
          query = (supabase as any).from("leads").select("name, phone, email").not("phone", "is", null).limit(5000);
          break;
        case "email_contacts":
          query = (supabase as any).from("email_marketing_contacts").select("name, email, phone").not("email", "is", null).limit(5000);
          break;
        default:
          return;
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: Contact[] = (data || []).map((r: any) => ({
        name: r.customer_name || r.name || "Unknown",
        phone: String(r.phone || "").replace(/\D/g, ""),
        email: r.email || "",
      })).filter((c: Contact) => (channel === "email" ? c.email : c.phone.length >= 10));

      setContacts(mapped);
      setSelectedContacts(new Set(mapped.map((_, i) => i)));
      toast.success(`Loaded ${mapped.length} contacts`);
    } catch (err: any) {
      toast.error(err.message || "Failed to load audience");
    } finally {
      setIsLoadingAudience(false);
    }
  };

  // ─── CSV upload ───
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let rows: string[][] = [];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const ws = wb.worksheets[0];
        if (!ws) throw new Error("No worksheet found");
        ws.eachRow((row) => {
          rows.push((row.values as any[]).slice(1).map(v => String(v ?? "")));
        });
      } else {
        rows = parseCSV(await file.text());
      }

      if (rows.length < 2) { toast.error("Need header + data"); return; }

      const hdrs = rows[0].map(h => h.toLowerCase().trim());
      const nameIdx = hdrs.findIndex(h => h.includes("name"));
      const phoneIdx = hdrs.findIndex(h => h.includes("phone") || h.includes("mobile"));
      const emailIdx = hdrs.findIndex(h => h.includes("email") || h.includes("mail"));

      const mapped: Contact[] = rows.slice(1).filter(r => r.some(c => c.trim())).map(r => ({
        name: nameIdx >= 0 ? r[nameIdx] || "Unknown" : "Unknown",
        phone: phoneIdx >= 0 ? (r[phoneIdx] || "").replace(/\D/g, "") : "",
        email: emailIdx >= 0 ? r[emailIdx] || "" : "",
      })).filter(c => (channel === "email" ? c.email : c.phone.length >= 10));

      setContacts(mapped);
      setSelectedContacts(new Set(mapped.map((_, i) => i)));
      setAudienceSource("custom_upload");
      toast.success(`Loaded ${mapped.length} contacts from file`);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse file");
    }
  };

  // ─── Filter ───
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    const term = searchTerm.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.email || "").toLowerCase().includes(term)
    );
  }, [contacts, searchTerm]);

  const selectedList = contacts.filter((_, i) => selectedContacts.has(i));

  // ─── Send WhatsApp ───
  const sendWhatsApp = async () => {
    const targets = selectedList.filter(c => c.phone.length >= 10);
    if (targets.length === 0) { toast.error("No valid phone numbers"); return; }

    setIsSending(true);
    setSendProgress(0);
    let sent = 0, failed = 0;

    for (let i = 0; i < targets.length; i++) {
      const contact = targets[i];
      const phone = contact.phone.startsWith("91") ? contact.phone : `91${contact.phone}`;
      const personalizedMsg = waMessage.replace(/\{name\}/gi, contact.name);

      try {
        if (useMetaTemplate && metaTemplateName) {
          // Send via Meta template
          await supabase.functions.invoke("whatsapp-send", {
            body: {
              to: phone,
              type: "template",
              template_name: metaTemplateName,
              template_params: [contact.name],
            },
          });
        } else {
          // Send free-text
          await supabase.functions.invoke("whatsapp-send", {
            body: { to: phone, type: "text", message: personalizedMsg },
          });
        }
        sent++;
      } catch {
        failed++;
      }

      setSendProgress(Math.round(((i + 1) / targets.length) * 100));
      // Rate limit: 500ms between messages
      if (i < targets.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    setSendResult({ sent, failed });
    setShowResult(true);
    setIsSending(false);
    toast.success(`WhatsApp: ${sent} sent, ${failed} failed`);
  };

  // ─── Send Email ───
  const sendEmail = async () => {
    const targets = selectedList.filter(c => c.email);
    if (targets.length === 0) { toast.error("No valid emails"); return; }

    setIsSending(true);
    setSendProgress(0);
    let sent = 0, failed = 0;

    // Batch send via edge function
    const batchSize = 50;
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      try {
        const { error } = await supabase.functions.invoke("send-bulk-email", {
          body: {
            recipients: batch.map(c => ({
              email: c.email,
              name: c.name,
            })),
            subject: emailSubject,
            html_body: emailBody.replace(/\n/g, "<br/>"),
            from_email: emailFrom,
          },
        });
        if (error) throw error;
        sent += batch.length;
      } catch {
        failed += batch.length;
      }

      setSendProgress(Math.round(((i + batchSize) / targets.length) * 100));
    }

    setSendResult({ sent, failed });
    setShowResult(true);
    setIsSending(false);
    toast.success(`Email: ${sent} sent, ${failed} failed`);
  };

  // ─── Send Both ───
  const sendBoth = async () => {
    await sendWhatsApp();
    await sendEmail();
  };

  const handleSend = () => {
    if (channel === "whatsapp") sendWhatsApp();
    else if (channel === "email") sendEmail();
    else sendBoth();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Bulk Broadcaster
        </h1>
        <p className="text-sm text-muted-foreground">Send WhatsApp + Email campaigns to your audience in one go</p>
      </div>

      {/* Channel selector */}
      <div className="flex gap-2">
        {([
          { id: "whatsapp" as const, label: "WhatsApp Only", icon: MessageSquare, color: "text-green-500" },
          { id: "email" as const, label: "Email Only", icon: Mail, color: "text-blue-500" },
          { id: "both" as const, label: "Both Channels", icon: Zap, color: "text-purple-500" },
        ]).map(ch => (
          <Button
            key={ch.id}
            variant={channel === ch.id ? "default" : "outline"}
            onClick={() => setChannel(ch.id)}
            className="flex-1"
          >
            <ch.icon className={`h-4 w-4 mr-2 ${channel === ch.id ? "" : ch.color}`} />
            {ch.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Audience */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audience
              {contacts.length > 0 && <Badge>{selectedContacts.size}/{contacts.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source buttons */}
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_SOURCES.map(src => (
                <Button
                  key={src.id}
                  variant={audienceSource === src.id ? "default" : "outline"}
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => {
                    if (src.id === "custom_upload") {
                      fileRef.current?.click();
                    } else {
                      loadAudience(src.id);
                    }
                  }}
                  disabled={isLoadingAudience}
                >
                  <span className="mr-1">{src.icon}</span>
                  {src.label}
                  {isLoadingAudience && audienceSource === src.id && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                </Button>
              ))}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCSVUpload} />

            {/* Search & select all */}
            {contacts.length > 0 && (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                    <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedContacts.size === contacts.length) setSelectedContacts(new Set());
                      else setSelectedContacts(new Set(contacts.map((_, i) => i)));
                    }}
                  >
                    {selectedContacts.size === contacts.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <ScrollArea className="h-[300px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                        {(channel === "email" || channel === "both") && <TableHead className="text-xs">Email</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((c, i) => {
                        const realIdx = contacts.indexOf(c);
                        return (
                          <TableRow key={i}>
                            <TableCell>
                              <Checkbox
                                checked={selectedContacts.has(realIdx)}
                                onCheckedChange={checked => {
                                  const next = new Set(selectedContacts);
                                  checked ? next.add(realIdx) : next.delete(realIdx);
                                  setSelectedContacts(next);
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-xs">{c.name}</TableCell>
                            <TableCell className="text-xs font-mono">{c.phone}</TableCell>
                            {(channel === "email" || channel === "both") && (
                              <TableCell className="text-xs">{c.email || "—"}</TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Message */}
        <div className="space-y-4">
          {/* WhatsApp message */}
          {(channel === "whatsapp" || channel === "both") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  WhatsApp Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={useMetaTemplate} onCheckedChange={setUseMetaTemplate} />
                  <Label className="text-xs">Use approved Meta template</Label>
                </div>

                {useMetaTemplate ? (
                  <Select value={metaTemplateName} onValueChange={setMetaTemplateName}>
                    <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {(metaTemplates || []).map(t => (
                        <SelectItem key={t.name} value={t.name}>
                          {t.name} <Badge variant="outline" className="ml-2 text-[10px]">{t.category}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <div className="flex gap-1 flex-wrap">
                      {WA_QUICK_TEMPLATES.map(t => (
                        <Button
                          key={t.id}
                          variant={waTemplate === t.id ? "default" : "outline"}
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => { setWaTemplate(t.id); setWaMessage(t.body); }}
                        >
                          {t.name}
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      value={waMessage}
                      onChange={e => setWaMessage(e.target.value)}
                      placeholder="Type your message... Use {name} for personalization"
                      rows={6}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {waMessage.length} chars • Use <code className="bg-muted px-1 rounded">{"{name}"}</code> for personalization
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Email message */}
          {(channel === "email" || channel === "both") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  Email Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">From</Label>
                  <Select value={emailFrom} onValueChange={setEmailFrom}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales@notify.grabyourcar.com">sales@notify.grabyourcar.com</SelectItem>
                      <SelectItem value="founder@notify.grabyourcar.com">founder@notify.grabyourcar.com</SelectItem>
                      <SelectItem value="insurance@notify.grabyourcar.com">insurance@notify.grabyourcar.com</SelectItem>
                      <SelectItem value="marketing@notify.grabyourcar.com">marketing@notify.grabyourcar.com</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject line" className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Body</Label>
                  <Textarea
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    placeholder="Email body... Use {name} for personalization"
                    rows={6}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Send button */}
          <Card>
            <CardContent className="py-4">
              {isSending ? (
                <div className="space-y-2 text-center">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                  <Progress value={sendProgress} />
                  <p className="text-sm text-muted-foreground">Sending... {sendProgress}%</p>
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSend}
                  disabled={
                    selectedContacts.size === 0 ||
                    (channel !== "email" && !waMessage && !useMetaTemplate) ||
                    (channel !== "whatsapp" && (!emailSubject || !emailBody))
                  }
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to {selectedContacts.size} contacts via {channel === "both" ? "WhatsApp + Email" : channel === "whatsapp" ? "WhatsApp" : "Email"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Result dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Broadcast Complete
            </DialogTitle>
          </DialogHeader>
          {sendResult && (
            <div className="flex gap-8 justify-center py-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">{sendResult.sent}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-red-500">{sendResult.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedBulkBroadcaster;
