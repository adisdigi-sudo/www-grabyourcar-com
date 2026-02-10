import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Trash2, UserMinus, AlertTriangle, CheckCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function WACompliancePanel() {
  const [optOuts, setOptOuts] = useState<any[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [stats, setStats] = useState({ totalOptOuts: 0, totalSent: 0, failRate: 0 });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [optRes, campaignRes] = await Promise.all([
      supabase.from("wa_opt_outs").select("*").order("opted_out_at", { ascending: false }),
      supabase.from("wa_campaigns").select("total_sent, total_failed"),
    ]);

    if (optRes.data) setOptOuts(optRes.data);

    const campaigns = campaignRes.data || [];
    const totalSent = campaigns.reduce((s, c) => s + (c.total_sent || 0), 0);
    const totalFailed = campaigns.reduce((s, c) => s + (c.total_failed || 0), 0);

    setStats({
      totalOptOuts: optRes.data?.length || 0,
      totalSent,
      failRate: totalSent > 0 ? Math.round((totalFailed / totalSent) * 100) : 0,
    });
  };

  const addOptOut = async () => {
    if (!newPhone) return;
    const clean = newPhone.replace(/\D/g, "").replace(/^91/, "");
    if (!/^[6-9]\d{9}$/.test(clean)) {
      toast({ title: "Invalid phone number", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("wa_opt_outs").insert({ phone: clean, source: "admin" });
    if (error) {
      if (error.code === "23505") toast({ title: "Already opted out" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Number added to opt-out list" });
      setNewPhone("");
      fetchData();
    }
  };

  const removeOptOut = async (id: string) => {
    if (!confirm("Remove from opt-out list? This will allow messaging this number again.")) return;
    await supabase.from("wa_opt_outs").delete().eq("id", id);
    toast({ title: "Opt-out removed" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Compliance & Safety</h2>

      {/* Health Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><UserMinus className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.totalOptOuts}</p>
              <p className="text-xs text-muted-foreground">Opt-Outs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.totalSent}</p>
              <p className="text-xs text-muted-foreground">Total Messages Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.failRate > 10 ? "bg-destructive/10" : "bg-green-500/10"}`}>
              <AlertTriangle className={`h-5 w-5 ${stats.failRate > 10 ? "text-destructive" : "text-green-500"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.failRate}%</p>
              <p className="text-xs text-muted-foreground">Failure Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Opt-Out */}
      <Card>
        <CardHeader><CardTitle className="text-base">Manage Opt-Outs</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input placeholder="Enter phone number to opt-out" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="max-w-xs" />
            <Button onClick={addOptOut} variant="outline"><UserMinus className="h-4 w-4 mr-1" /> Add Opt-Out</Button>
          </div>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optOuts.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No opt-outs recorded</TableCell></TableRow>
                ) : optOuts.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="flex items-center gap-2"><Phone className="h-3 w-3" /> {o.phone}</TableCell>
                    <TableCell><Badge variant="outline">{o.source}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(o.opted_out_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeOptOut(o.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Compliance Checklist */}
      <Card>
        <CardHeader><CardTitle className="text-base">Compliance Checklist</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { check: "Opt-out registry active", done: true },
              { check: "Opt-out numbers filtered from all campaigns", done: true },
              { check: "Rate limiting enabled (200ms between messages)", done: true },
              { check: "Retry logic with exponential backoff", done: true },
              { check: "Dead letter queue for failed messages", done: true },
              { check: "Message queue architecture (no synchronous bulk)", done: true },
              { check: "Admin-only access to campaigns (RLS enforced)", done: true },
              { check: "Frequency caps per lead (configurable)", done: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">{item.check}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
