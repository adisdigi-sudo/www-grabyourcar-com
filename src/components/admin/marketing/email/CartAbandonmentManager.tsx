import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShoppingCart, Send, Loader2, RefreshCw, TrendingUp,
  IndianRupee, Mail, CheckCircle, XCircle, Clock
} from "lucide-react";

interface CartEvent {
  id: string;
  session_id: string;
  email: string | null;
  cart_data: any;
  cart_value: number;
  abandoned_at: string | null;
  recovery_email_sent: boolean;
  recovery_email_sent_at: string | null;
  recovered: boolean;
  recovered_at: string | null;
  created_at: string;
}

export function CartAbandonmentManager() {
  const [events, setEvents] = useState<CartEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("abandoned");

  useEffect(() => { fetchEvents(); }, [filter]);

  const fetchEvents = async () => {
    setIsLoading(true);
    let query = (supabase as any).from("cart_events").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter === "abandoned") query = query.not("abandoned_at", "is", null).eq("recovered", false);
    if (filter === "recovered") query = query.eq("recovered", true);
    if (filter === "email_sent") query = query.eq("recovery_email_sent", true);
    const { data } = await query;
    if (data) setEvents(data);
    setIsLoading(false);
  };

  const sendRecoveryEmail = async (event: CartEvent) => {
    if (!event.email) { toast.error("No email for this cart"); return; }
    // Mark as email sent
    await (supabase as any).from("cart_events").update({
      recovery_email_sent: true,
      recovery_email_sent_at: new Date().toISOString(),
    }).eq("id", event.id);
    toast.success(`Recovery email queued for ${event.email}`);
    fetchEvents();
  };

  const markRecovered = async (id: string) => {
    await (supabase as any).from("cart_events").update({
      recovered: true,
      recovered_at: new Date().toISOString(),
    }).eq("id", id);
    toast.success("Marked as recovered");
    fetchEvents();
  };

  const stats = {
    totalAbandoned: events.filter(e => e.abandoned_at && !e.recovered).length,
    totalRecovered: events.filter(e => e.recovered).length,
    recoveryRate: events.length > 0 ? Math.round((events.filter(e => e.recovered).length / Math.max(events.filter(e => e.abandoned_at).length, 1)) * 100) : 0,
    totalValue: events.filter(e => e.abandoned_at && !e.recovered).reduce((s, e) => s + (e.cart_value || 0), 0),
    recoveredValue: events.filter(e => e.recovered).reduce((s, e) => s + (e.cart_value || 0), 0),
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3">
          <ShoppingCart className="h-4 w-4 text-red-500 mb-1" />
          <p className="text-xl font-bold">{stats.totalAbandoned}</p>
          <p className="text-xs text-muted-foreground">Abandoned</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <CheckCircle className="h-4 w-4 text-green-500 mb-1" />
          <p className="text-xl font-bold">{stats.totalRecovered}</p>
          <p className="text-xs text-muted-foreground">Recovered</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <TrendingUp className="h-4 w-4 text-primary mb-1" />
          <p className="text-xl font-bold">{stats.recoveryRate}%</p>
          <p className="text-xs text-muted-foreground">Recovery Rate</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <IndianRupee className="h-4 w-4 text-orange-500 mb-1" />
          <p className="text-xl font-bold">₹{stats.totalValue.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground">At Risk</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <IndianRupee className="h-4 w-4 text-green-500 mb-1" />
          <p className="text-xl font-bold">₹{stats.recoveredValue.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground">Recovered Value</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
            <SelectItem value="recovered">Recovered</SelectItem>
            <SelectItem value="email_sent">Email Sent</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={fetchEvents}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Cart Abandonment Events</CardTitle>
          <CardDescription className="text-xs">Track and recover abandoned carts with automated emails</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Cart Value</TableHead>
                <TableHead>Abandoned</TableHead>
                <TableHead>Recovery Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No cart events yet</TableCell></TableRow>
              ) : events.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{e.email || <span className="text-muted-foreground italic">Anonymous</span>}</TableCell>
                  <TableCell className="font-medium">₹{(e.cart_value || 0).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.abandoned_at ? new Date(e.abandoned_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </TableCell>
                  <TableCell>
                    {e.recovery_email_sent ? (
                      <Badge className="bg-green-100 text-green-800">Sent</Badge>
                    ) : (
                      <Badge variant="outline">Not sent</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {e.recovered ? (
                      <Badge className="bg-green-100 text-green-800">✅ Recovered</Badge>
                    ) : e.abandoned_at ? (
                      <Badge className="bg-red-100 text-red-800">Abandoned</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!e.recovery_email_sent && e.email && e.abandoned_at && !e.recovered && (
                        <Button variant="outline" size="sm" onClick={() => sendRecoveryEmail(e)}>
                          <Send className="h-3 w-3 mr-1" />Recover
                        </Button>
                      )}
                      {!e.recovered && e.abandoned_at && (
                        <Button variant="ghost" size="sm" onClick={() => markRecovered(e.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" />Mark Recovered
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
