import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Check, CheckCheck, Eye, Clock, AlertCircle, RefreshCw,
  Search, MessageSquare, Send, ArrowUpDown
} from "lucide-react";

type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

interface MessageLog {
  id: string;
  phone: string;
  customer_name: string | null;
  message_type: string | null;
  message_content: string | null;
  trigger_event: string | null;
  status: string | null;
  provider: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  replied_at: string | null;
  created_at: string;
}

function StatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case "read":
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    case "delivered":
      return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
    case "sent":
      return <Check className="h-4 w-4 text-muted-foreground" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground/50" />;
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const variants: Record<string, string> = {
    read: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    delivered: "bg-green-500/10 text-green-600 border-green-500/20",
    sent: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    queued: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={variants[status || "queued"] || variants.queued}>
      <StatusIcon status={status} />
      <span className="ml-1 capitalize">{status || "queued"}</span>
    </Badge>
  );
}

function formatPhone(phone: string) {
  if (phone.startsWith("91") && phone.length === 12) {
    return `+91 ${phone.slice(2, 7)} ${phone.slice(7)}`;
  }
  return phone;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "-";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function WAMessageStatusTracker() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["wa-message-logs", search, statusFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("wa_message_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.or(`phone.ilike.%${search}%,customer_name.ilike.%${search}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: logs, error, count } = await query;
      if (error) throw error;
      return { logs: logs as MessageLog[], total: count || 0 };
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;

  // Summary stats
  const { data: stats } = useQuery({
    queryKey: ["wa-message-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: totalToday } = await supabase
        .from("wa_message_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      const { count: delivered } = await supabase
        .from("wa_message_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "delivered");

      const { count: read } = await supabase
        .from("wa_message_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "read");

      const { count: failed } = await supabase
        .from("wa_message_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "failed");

      return { totalToday: totalToday || 0, delivered: delivered || 0, read: read || 0, failed: failed || 0 };
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Send className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats?.totalToday || 0}</p>
            <p className="text-xs text-muted-foreground">Sent Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCheck className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{stats?.delivered || 0}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{stats?.read || 0}</p>
            <p className="text-xs text-muted-foreground">Read</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-5 w-5 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold">{stats?.failed || 0}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message Delivery Logs
              <Badge variant="secondary" className="text-xs">{total}</Badge>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone or name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No messages found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="shrink-0">
                    <StatusIcon status={log.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {log.customer_name || formatPhone(log.phone)}
                      </span>
                      {log.customer_name && (
                        <span className="text-xs text-muted-foreground">{formatPhone(log.phone)}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5">
                      {log.message_content?.slice(0, 80) || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={log.status} />
                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                      <p>{timeAgo(log.sent_at || log.created_at)}</p>
                      {log.trigger_event && (
                        <p className="text-[10px] font-mono">{log.trigger_event}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
