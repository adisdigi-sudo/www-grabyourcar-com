import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCheck, Eye, AlertTriangle, Clock, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function WaInboxAnalytics() {
  const [stats, setStats] = useState({
    total: 0, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0,
    inbound: 0, outbound: 0, conversations: 0, activeWindows: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [msgsRes, convosRes] = await Promise.all([
      supabase.from("wa_inbox_messages").select("direction, status", { count: "exact" }),
      supabase.from("wa_conversations").select("id, window_expires_at", { count: "exact" }),
    ]);

    const msgs = msgsRes.data || [];
    const convos = convosRes.data || [];
    const now = new Date();

    setStats({
      total: msgs.length,
      sent: msgs.filter(m => m.status === "sent").length,
      delivered: msgs.filter(m => m.status === "delivered").length,
      read: msgs.filter(m => m.status === "read").length,
      failed: msgs.filter(m => m.status === "failed").length,
      pending: msgs.filter(m => m.status === "pending").length,
      inbound: msgs.filter(m => m.direction === "inbound").length,
      outbound: msgs.filter(m => m.direction === "outbound").length,
      conversations: convos.length,
      activeWindows: convos.filter(c => c.window_expires_at && new Date(c.window_expires_at) > now).length,
    });
  };

  const cards = [
    { label: "Total Messages", value: stats.total, icon: MessageSquare, color: "text-blue-600" },
    { label: "Conversations", value: stats.conversations, icon: Users, color: "text-purple-600" },
    { label: "Active Windows", value: stats.activeWindows, icon: Clock, color: "text-green-600" },
    { label: "Sent", value: stats.sent, icon: Send, color: "text-sky-600" },
    { label: "Delivered", value: stats.delivered, icon: CheckCheck, color: "text-emerald-600" },
    { label: "Read", value: stats.read, icon: Eye, color: "text-blue-500" },
    { label: "Failed", value: stats.failed, icon: AlertTriangle, color: "text-red-600" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600" },
    { label: "Inbound", value: stats.inbound, icon: MessageSquare, color: "text-green-500" },
    { label: "Outbound", value: stats.outbound, icon: Send, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Message Analytics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <c.icon className={`h-5 w-5 mx-auto ${c.color}`} />
              <p className="text-2xl font-bold mt-1">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
