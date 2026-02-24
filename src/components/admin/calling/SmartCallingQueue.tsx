import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CallDispositionModal } from "./CallDispositionModal";
import * as XLSX from "xlsx";
import {
  Phone, MessageCircle, Search, Flame, Clock, PhoneCall,
  ArrowUpRight, CalendarClock, BarChart3, Users, PhoneOutgoing,
  CheckCircle2, XCircle, Timer, TrendingUp, Filter, Upload,
  FileText, ClipboardPaste, Table2, Download, Loader2, X, Database
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isPast } from "date-fns";

interface CallLog {
  id: string;
  agent_id: string;
  lead_phone: string;
  lead_name: string | null;
  lead_id: string | null;
  lead_type: string;
  call_method: string;
  disposition: string | null;
  duration_seconds: number;
  notes: string | null;
  lead_stage_after: string | null;
  follow_up_at: string | null;
  follow_up_priority: string | null;
  vertical_id: string | null;
  created_at: string;
}

interface QueueLead {
  phone: string;
  name: string;
  leadId?: string;
  leadType: string;
  priority: "hot" | "high" | "normal" | "overdue";
  followUpAt?: string;
  lastDisposition?: string;
  lastNotes?: string;
  lastCalledAt?: string;
  source: "follow_up" | "fresh" | "retry";
}

export function SmartCallingQueue() {
  const { user } = useAuth();
  const { activeVertical } = useVerticalAccess();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("queue");
  const [filterDisposition, setFilterDisposition] = useState("all");

  // Disposition modal state
  const [dispositionOpen, setDispositionOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{
    phone: string; name: string; leadId?: string; leadType: string; method: "phone" | "whatsapp";
  } | null>(null);

  // Fetch call logs
  const { data: callLogs = [], isLoading } = useQuery({
    queryKey: ["call-logs", user?.id, activeVertical?.id],
    queryFn: async () => {
      let query = supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (activeVertical?.id) {
        query = query.eq("vertical_id", activeVertical.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CallLog[];
    },
    enabled: !!user?.id,
  });

  // Build smart queue from call logs
  const queue = useMemo<QueueLead[]>(() => {
    const phoneMap = new Map<string, CallLog>();

    // Get latest call per phone
    for (const log of callLogs) {
      const existing = phoneMap.get(log.lead_phone);
      if (!existing || new Date(log.created_at) > new Date(existing.created_at)) {
        phoneMap.set(log.lead_phone, log);
      }
    }

    const items: QueueLead[] = [];
    for (const [phone, log] of phoneMap) {
      if (log.follow_up_at) {
        const isOverdue = isPast(new Date(log.follow_up_at));
        items.push({
          phone,
          name: log.lead_name || "Unknown",
          leadId: log.lead_id || undefined,
          leadType: log.lead_type,
          priority: isOverdue ? "overdue" : (log.follow_up_priority as any) || "normal",
          followUpAt: log.follow_up_at,
          lastDisposition: log.disposition || undefined,
          lastNotes: log.notes || undefined,
          lastCalledAt: log.created_at,
          source: "follow_up",
        });
      } else if (
        log.disposition === "busy" ||
        log.disposition === "no_answer" ||
        log.disposition === "not_connected"
      ) {
        items.push({
          phone,
          name: log.lead_name || "Unknown",
          leadId: log.lead_id || undefined,
          leadType: log.lead_type,
          priority: "normal",
          lastDisposition: log.disposition || undefined,
          lastNotes: log.notes || undefined,
          lastCalledAt: log.created_at,
          source: "retry",
        });
      }
    }

    // Sort: overdue first, then hot, high, normal
    const priorityOrder = { overdue: 0, hot: 1, high: 2, normal: 3 };
    items.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));

    return items;
  }, [callLogs]);

  // Stats
  const stats = useMemo(() => {
    const today = callLogs.filter((l) => isToday(new Date(l.created_at)));
    const connected = today.filter((l) => l.disposition === "connected").length;
    const totalDuration = today.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
    return {
      totalToday: today.length,
      connected,
      connectRate: today.length > 0 ? Math.round((connected / today.length) * 100) : 0,
      avgDuration: today.length > 0 ? Math.round(totalDuration / today.length / 60 * 10) / 10 : 0,
      pendingFollowUps: queue.filter((q) => q.source === "follow_up").length,
      overdueFollowUps: queue.filter((q) => q.priority === "overdue").length,
    };
  }, [callLogs, queue]);

  const handleCall = (phone: string, name: string, method: "phone" | "whatsapp", leadId?: string, leadType?: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

    if (method === "phone") {
      window.open(`tel:+${fullPhone}`, "_self");
    } else {
      window.open(`https://wa.me/${fullPhone}`, "_blank");
    }

    // Open disposition modal after initiating call
    setActiveCall({ phone, name, leadId, leadType: leadType || "general", method });
    setTimeout(() => setDispositionOpen(true), 1500);
  };

  const filteredLogs = useMemo(() => {
    let logs = callLogs;
    if (filterDisposition !== "all") {
      logs = logs.filter((l) => l.disposition === filterDisposition);
    }
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(
        (l) => l.lead_name?.toLowerCase().includes(q) || l.lead_phone.includes(q)
      );
    }
    return logs;
  }, [callLogs, filterDisposition, search]);

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case "overdue": return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">OVERDUE</Badge>;
      case "hot": return <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0">🔥 HOT</Badge>;
      case "high": return <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">⚡ HIGH</Badge>;
      default: return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">NORMAL</Badge>;
    }
  };

  const dispositionBadge = (disp: string | undefined) => {
    if (!disp) return null;
    const map: Record<string, { color: string; label: string }> = {
      connected: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", label: "Connected" },
      not_connected: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", label: "Not Connected" },
      busy: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", label: "Busy" },
      switched_off: { color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300", label: "Switched Off" },
      wrong_number: { color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300", label: "Wrong Number" },
      no_answer: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", label: "No Answer" },
      callback_requested: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", label: "Callback" },
    };
    const info = map[disp];
    if (!info) return <Badge variant="outline">{disp}</Badge>;
    return <Badge className={`${info.color} text-[10px] border-0`}>{info.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Calls Today", value: stats.totalToday, icon: PhoneOutgoing, color: "text-primary" },
          { label: "Connected", value: stats.connected, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Connect Rate", value: `${stats.connectRate}%`, icon: TrendingUp, color: "text-blue-600" },
          { label: "Avg Duration", value: `${stats.avgDuration}m`, icon: Timer, color: "text-purple-600" },
          { label: "Pending F/U", value: stats.pendingFollowUps, icon: CalendarClock, color: "text-amber-600" },
          { label: "Overdue", value: stats.overdueFollowUps, icon: XCircle, color: "text-red-600" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="h-4 w-4" /></div>
              <div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="queue" className="gap-1.5">
              <Flame className="h-3.5 w-3.5" /> Smart Queue
              {queue.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-5">{queue.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Call History
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Quick Dial
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload Data
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or phone..."
              className="pl-9 w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Smart Queue Tab */}
        <TabsContent value="queue" className="mt-4">
          {queue.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PhoneCall className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-lg">Queue is Empty</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  No follow-ups or retries pending. Use Quick Dial to make calls.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-2">
                {queue.map((item, i) => (
                  <Card key={`${item.phone}-${i}`} className={`border-border/50 transition-all hover:shadow-md ${
                    item.priority === "overdue" ? "border-l-4 border-l-red-500" :
                    item.priority === "hot" ? "border-l-4 border-l-orange-500 animate-pulse" :
                    item.priority === "high" ? "border-l-4 border-l-amber-500" : ""
                  }`}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold truncate">{item.name}</span>
                          {priorityBadge(item.priority)}
                          {dispositionBadge(item.lastDisposition)}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.phone}</p>
                        {item.followUpAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            📅 Follow-up: {format(new Date(item.followUpAt), "MMM d, h:mm a")}
                            <span className="ml-1">({formatDistanceToNow(new Date(item.followUpAt), { addSuffix: true })})</span>
                          </p>
                        )}
                        {item.lastNotes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">💬 {item.lastNotes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleCall(item.phone, item.name, "whatsapp", item.leadId, item.leadType)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          className="shadow-sm"
                          onClick={() => handleCall(item.phone, item.name, "phone", item.leadId, item.leadType)}
                        >
                          <Phone className="h-4 w-4 mr-1" /> Call
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Call History Tab */}
        <TabsContent value="history" className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterDisposition} onValueChange={setFilterDisposition}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dispositions</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="not_connected">Not Connected</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="switched_off">Switched Off</SelectItem>
                <SelectItem value="wrong_number">Wrong Number</SelectItem>
                <SelectItem value="no_answer">No Answer</SelectItem>
                <SelectItem value="callback_requested">Callback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-1">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{log.lead_name || "Unknown"}</span>
                      {dispositionBadge(log.disposition || undefined)}
                      {log.lead_stage_after && (
                        <Badge variant="outline" className="text-[10px]">{log.lead_stage_after}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{log.lead_phone}</span>
                      <span>•</span>
                      <span>{format(new Date(log.created_at), "MMM d, h:mm a")}</span>
                      {log.duration_seconds > 0 && (
                        <><span>•</span><span>{Math.round(log.duration_seconds / 60)}m</span></>
                      )}
                    </div>
                    {log.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">💬 {log.notes}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600"
                      onClick={() => handleCall(log.lead_phone, log.lead_name || "", "whatsapp", log.lead_id || undefined, log.lead_type)}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => handleCall(log.lead_phone, log.lead_name || "", "phone", log.lead_id || undefined, log.lead_type)}>
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>No call history yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Quick Dial Tab */}
        <TabsContent value="manual" className="mt-4">
          <QuickDialCard onCall={handleCall} />
        </TabsContent>
        {/* Upload Data Tab */}
        <TabsContent value="upload" className="mt-4">
          <CallingDataUpload verticalId={activeVertical?.id} onUploaded={() => queryClient.invalidateQueries({ queryKey: ["call-logs"] })} />
        </TabsContent>
      </Tabs>

      {/* Disposition Modal */}
      {activeCall && (
        <CallDispositionModal
          open={dispositionOpen}
          onClose={() => { setDispositionOpen(false); setActiveCall(null); }}
          leadPhone={activeCall.phone}
          leadName={activeCall.name}
          leadId={activeCall.leadId}
          leadType={activeCall.leadType}
          verticalId={activeVertical?.id}
          callMethod={activeCall.method}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["call-logs"] })}
        />
      )}
    </div>
  );
}

// Quick Dial sub-component
function QuickDialCard({ onCall }: { onCall: (phone: string, name: string, method: "phone" | "whatsapp") => void }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><PhoneCall className="h-5 w-5" /> Quick Dial</CardTitle>
        <CardDescription>Enter a number to call directly. Disposition will be logged after the call.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Phone Number</label>
            <Input placeholder="e.g. 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Name (optional)</label>
            <Input placeholder="Lead name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => { if (!phone.trim()) { toast.error("Enter a phone number"); return; } onCall(phone, name, "phone"); }}
            disabled={!phone.trim()}
            className="shadow-lg shadow-primary/25"
          >
            <Phone className="h-4 w-4 mr-2" /> Call via Phone
          </Button>
          <Button
            variant="outline"
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            onClick={() => { if (!phone.trim()) { toast.error("Enter a phone number"); return; } onCall(phone, name, "whatsapp"); }}
            disabled={!phone.trim()}
          >
            <MessageCircle className="h-4 w-4 mr-2" /> Call via WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Calling Data Upload Component ──
type CallingContact = { name: string; phone: string; leadType?: string; notes?: string };

function CallingDataUpload({ verticalId, onUploaded }: { verticalId?: string; onUploaded: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("text");
  const [parsed, setParsed] = useState<CallingContact[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setParsed([]); setResult(null); };

  const doUpload = async () => {
    if (!parsed.length || !user?.id) return;
    setUploading(true);
    let success = 0, failed = 0;

    for (const contact of parsed) {
      const cleanPhone = contact.phone.replace(/\D/g, "").slice(-10);
      if (!cleanPhone || cleanPhone.length < 10) { failed++; continue; }

      const { error } = await supabase.from("call_logs").insert({
        agent_id: user.id,
        lead_phone: cleanPhone,
        lead_name: contact.name || "Unknown",
        lead_type: contact.leadType || "general",
        call_method: "upload",
        call_type: "outbound",
        notes: contact.notes || "Uploaded for calling",
        follow_up_at: new Date().toISOString(),
        follow_up_priority: "normal",
        vertical_id: verticalId || null,
        duration_seconds: 0,
      });

      if (error) failed++;
      else success++;
    }

    setResult({ success, failed });
    setUploading(false);
    onUploaded();
    toast.success(`${success} contacts added to calling queue${failed ? `, ${failed} failed` : ""}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let lines: string[];
      const isExcel = file.name.match(/\.(xlsx|xls)$/i);

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvText = XLSX.utils.sheet_to_csv(sheet);
        lines = csvText.split(/\r?\n/).filter(l => l.trim());
      } else {
        const text = await file.text();
        lines = text.split(/\r?\n/).filter(l => l.trim());
      }

      if (lines.length < 2) { toast.error("Need header + at least 1 row"); return; }

      const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
      const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("customer"));
      const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("number") || h.includes("contact"));
      const notesIdx = headers.findIndex(h => h.includes("note") || h.includes("remark"));

      if (phoneIdx === -1 && nameIdx === -1) { toast.error("Could not find Name or Phone column"); return; }

      const contacts: CallingContact[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
        const phone = phoneIdx >= 0 ? (cols[phoneIdx] || "").replace(/[^0-9+]/g, "") : "";
        const name = nameIdx >= 0 ? cols[nameIdx] || "" : "";
        if (!phone && !name) continue;
        contacts.push({ name, phone, notes: notesIdx >= 0 ? cols[notesIdx] : undefined });
      }
      setParsed(contacts);
      toast.success(`Parsed ${contacts.length} contacts`);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse file");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const parseText = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const contacts: CallingContact[] = [];
    for (const line of lines) {
      const parts = line.split(/[\-\|,\t]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) continue;
      const name = parts[0];
      const phone = parts[1]?.replace(/[^0-9+]/g, "") || "";
      const notes = parts[2] || "";
      contacts.push({ name, phone, notes });
    }
    return contacts;
  };

  const parseSpreadsheet = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const firstLine = lines[0].toLowerCase();
    const hasHeaders = firstLine.includes("name") || firstLine.includes("phone");
    const startIdx = hasHeaders ? 1 : 0;
    const sep = lines[startIdx]?.includes("\t") ? "\t" : ",";

    let nameIdx = 0, phoneIdx = 1, notesIdx = -1;
    if (hasHeaders) {
      const h = lines[0].split(sep).map(c => c.trim().toLowerCase().replace(/"/g, ""));
      nameIdx = h.findIndex(c => c.includes("name") || c.includes("customer"));
      phoneIdx = h.findIndex(c => c.includes("phone") || c.includes("mobile"));
      notesIdx = h.findIndex(c => c.includes("note") || c.includes("remark"));
      if (nameIdx === -1) nameIdx = 0;
      if (phoneIdx === -1) phoneIdx = 1;
    }

    const contacts: CallingContact[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim().replace(/"/g, ""));
      const name = cols[nameIdx] || "";
      const phone = cols[phoneIdx]?.replace(/[^0-9+]/g, "") || "";
      if (!name && !phone) continue;
      contacts.push({ name, phone, notes: notesIdx >= 0 ? cols[notesIdx] : undefined });
    }
    return contacts;
  };

  if (result) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Upload Complete!</h3>
            <p className="text-sm text-muted-foreground">
              <span className="text-emerald-600 font-medium">{result.success} contacts</span> added to queue
              {result.failed > 0 && <>, <span className="text-destructive font-medium">{result.failed} failed</span></>}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={reset}>Upload More</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" /> Upload Calling Database
        </CardTitle>
        <CardDescription>Add client data for calling — supports CSV, Excel, text paste, and spreadsheet copy-paste</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={v => { setTab(v); setParsed([]); }}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="text" className="gap-1.5 text-xs">
              <ClipboardPaste className="h-3.5 w-3.5" /> Quick Text
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> CSV / Excel
            </TabsTrigger>
            <TabsTrigger value="sheet" className="gap-1.5 text-xs">
              <Table2 className="h-3.5 w-3.5" /> Spreadsheet Paste
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-4 space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Paste client data — one per line</p>
              <code className="block bg-muted px-2 py-1 rounded">Name - Phone</code>
              <code className="block bg-muted px-2 py-1 rounded">Name - Phone - Notes</code>
              <code className="block bg-muted px-2 py-1 rounded">Name, Phone, Notes</code>
            </div>
            <TextPasteInput onParsed={(text) => setParsed(parseText(text))} />
          </TabsContent>

          <TabsContent value="file" className="mt-4 space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm mb-1">Upload CSV or Excel file</p>
              <p>Required: <Badge variant="secondary" className="text-[10px]">Name</Badge> or <Badge variant="secondary" className="text-[10px]">Phone</Badge> column</p>
            </div>
            <div
              className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:bg-primary/5 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xlsx, .xls</p>
              <Button className="mt-3 gap-1.5" size="sm">Choose File</Button>
              <Input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </div>
          </TabsContent>

          <TabsContent value="sheet" className="mt-4 space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Paste from Excel / Google Sheets</p>
              <p>Copy rows and paste below. Tab-separated & comma-separated both work.</p>
            </div>
            <TextPasteInput onParsed={(text) => setParsed(parseSpreadsheet(text))} placeholder={`Name\tPhone\nRahul Sharma\t9876543210\nPriya Singh\t8765432109`} />
          </TabsContent>

          {parsed.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {parsed.length} contacts ready
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setParsed([])}>
                  <X className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">#</th>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Phone</th>
                      <th className="text-left px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 50).map((c, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium">{c.name || "—"}</td>
                        <td className="px-3 py-1.5">{c.phone || "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{c.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.length > 50 && <p className="text-xs text-muted-foreground">Showing 50 of {parsed.length}</p>}
              <Button onClick={doUpload} disabled={uploading} className="w-full gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : `Add ${parsed.length} Contacts to Queue`}
              </Button>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TextPasteInput({ onParsed, placeholder }: { onParsed: (text: string) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder || `Rahul Sharma - 9876543210\nPriya Singh - 8765432109\nAmit Kumar, 7654321098, Follow up on renewal`}
        className="min-h-[140px] font-mono text-sm"
      />
      <Button onClick={() => onParsed(text)} disabled={!text.trim()} className="w-full">
        Parse {text.split("\n").filter(l => l.trim()).length} Lines
      </Button>
    </div>
  );
}
