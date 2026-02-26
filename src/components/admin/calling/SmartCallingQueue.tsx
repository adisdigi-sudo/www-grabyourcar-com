import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CallDispositionModal } from "./CallDispositionModal";
import {
  Phone, MessageCircle, Search, Flame, Clock, PhoneCall,
  ArrowUpRight, CalendarClock, BarChart3, Users, PhoneOutgoing,
  CheckCircle2, XCircle, Timer, TrendingUp, Filter
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
