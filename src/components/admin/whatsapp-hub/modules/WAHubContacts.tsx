import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users, Tag, CheckCircle, MessageSquare, TrendingUp,
  Plus, Trash2, Layers, MapPin,
} from "lucide-react";
import { WaContactManager } from "../../inbox/WaContactManager";

function ContactStats() {
  const { data } = useQuery({
    queryKey: ["contact-pro-stats"],
    queryFn: async () => {
      const { data: contacts, count } = await supabase
        .from("wa_contacts")
        .select("opted_in, segment, total_messages, tags, city, last_message_at", { count: "exact" })
        .limit(1000);
      const c = contacts || [];
      const totalMessages = c.reduce((s: number, x: any) => s + (x.total_messages || 0), 0);
      const optedIn = c.filter((x: any) => x.opted_in).length;
      const activeLast7d = c.filter((x: any) => {
        if (!x.last_message_at) return false;
        return new Date(x.last_message_at) > new Date(Date.now() - 7 * 86400000);
      }).length;
      const allTags = new Set(c.flatMap((x: any) => x.tags || []));
      const cities = new Set(c.map((x: any) => x.city).filter(Boolean));
      return { total: count || c.length, optedIn, optRate: c.length > 0 ? Math.round((optedIn / c.length) * 100) : 0, activeLast7d, totalMessages, uniqueTags: allTags.size, uniqueCities: cities.size };
    },
    refetchInterval: 20000,
  });

  const items = [
    { label: "Total Contacts", value: data?.total || 0, icon: Users, color: "text-primary" },
    { label: "Opted In", value: `${data?.optedIn || 0} (${data?.optRate || 0}%)`, icon: CheckCircle, color: "text-green-500" },
    { label: "Active (7d)", value: data?.activeLast7d || 0, icon: TrendingUp, color: "text-blue-500" },
    { label: "Messages", value: data?.totalMessages || 0, icon: MessageSquare, color: "text-violet-500" },
    { label: "Tags", value: data?.uniqueTags || 0, icon: Tag, color: "text-amber-500" },
    { label: "Cities", value: data?.uniqueCities || 0, icon: MapPin, color: "text-rose-500" },
  ];

  return (
    <div className="grid grid-cols-6 gap-2">
      {items.map((i) => (
        <Card key={i.label} className="p-3">
          <div className="flex items-center gap-2">
            <i.icon className={`h-4 w-4 ${i.color}`} />
            <div>
              <p className="text-[11px] text-muted-foreground">{i.label}</p>
              <p className="text-lg font-bold">{typeof i.value === "number" ? i.value.toLocaleString() : i.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SegmentManager() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", is_dynamic: false, rules: "" });

  const { data: segments } = useQuery({
    queryKey: ["wa-segments-manager"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_contact_segments").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: contactStats } = useQuery({
    queryKey: ["wa-segment-contact-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_contacts").select("segment").limit(1000);
      const counts: Record<string, number> = {};
      (data || []).forEach((c: any) => { counts[c.segment || "general"] = (counts[c.segment || "general"] || 0) + 1; });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("Name required");
      let parsedRules = null;
      if (form.rules.trim()) {
        try { parsedRules = JSON.parse(form.rules); } catch { parsedRules = [{ field: "segment", operator: "eq", value: form.name.toLowerCase().replace(/\s+/g, "_") }]; }
      }
      const { error } = await supabase.from("wa_contact_segments").insert({ name: form.name, description: form.description || null, is_dynamic: form.is_dynamic, rules: parsedRules, estimated_count: 0 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Segment created!"); qc.invalidateQueries({ queryKey: ["wa-segments-manager"] }); setShowCreate(false); setForm({ name: "", description: "", is_dynamic: false, rules: "" }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("wa_contact_segments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["wa-segments-manager"] }); },
  });

  const BUILT_IN = ["general", "hot_lead", "customer", "vip", "cold", "churned", "new"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-violet-500" /> Audience Segments</h3>
          <p className="text-xs text-muted-foreground">Organize contacts into targeted groups</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Segment</Button>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Built-in Segments</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {BUILT_IN.map((seg) => (
            <Card key={seg} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/20" />
                  <span className="text-sm font-medium capitalize">{seg.replace("_", " ")}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{contactStats?.[seg] || 0}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Custom Segments</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {(segments || []).map((seg: any) => (
            <Card key={seg.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{seg.name}</h4>
                    {seg.description && <p className="text-xs text-muted-foreground mt-0.5">{seg.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={seg.is_dynamic ? "default" : "outline"} className="text-[10px]">{seg.is_dynamic ? "Dynamic" : "Static"}</Badge>
                      <span className="text-xs text-muted-foreground">~{seg.estimated_count || 0} contacts</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(seg.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(segments || []).length === 0 && (
            <Card className="col-span-2 p-8 text-center text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No custom segments yet.</p>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Segment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2"><Label>Name *</Label><Input placeholder="Mumbai Hot Leads" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Input placeholder="High-intent Mumbai leads" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_dynamic} onCheckedChange={(v) => setForm((p) => ({ ...p, is_dynamic: v }))} /><Label className="text-xs">Dynamic</Label></div>
            <div className="space-y-2">
              <Label>Filter Rules (JSON)</Label>
              <Textarea placeholder='[{"field":"city","operator":"eq","value":"Mumbai"}]' value={form.rules} onChange={(e) => setForm((p) => ({ ...p, rules: e.target.value }))} rows={3} className="text-xs font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}><Layers className="h-4 w-4 mr-1" /> Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TagAnalytics() {
  const { data: tagData } = useQuery({
    queryKey: ["wa-tag-analytics"],
    queryFn: async () => {
      const { data } = await supabase.from("wa_contacts").select("tags, opted_in, total_messages").limit(1000);
      const tagMap: Record<string, { count: number; optedIn: number; messages: number }> = {};
      (data || []).forEach((c: any) => {
        (c.tags || []).forEach((t: string) => {
          if (!tagMap[t]) tagMap[t] = { count: 0, optedIn: 0, messages: 0 };
          tagMap[t].count++;
          if (c.opted_in) tagMap[t].optedIn++;
          tagMap[t].messages += c.total_messages || 0;
        });
      });
      return Object.entries(tagMap).map(([tag, stats]) => ({ tag, ...stats })).sort((a, b) => b.count - a.count);
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Tag className="h-4 w-4 text-amber-500" /> Tag Distribution</CardTitle></CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
                <TableHead className="text-right">Opted In</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead>Distribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tagData || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No tags found</TableCell></TableRow>
              ) : (tagData || []).map((t) => {
                const maxCount = (tagData || [])[0]?.count || 1;
                return (
                  <TableRow key={t.tag}>
                    <TableCell><Badge variant="secondary" className="text-xs">{t.tag}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">{t.count}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-600">{t.optedIn}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{t.messages.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function WAHubContacts() {
  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <ContactStats />
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="contacts" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> All Contacts</TabsTrigger>
          <TabsTrigger value="segments" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" /> Segments</TabsTrigger>
          <TabsTrigger value="tags" className="gap-1.5 text-xs"><Tag className="h-3.5 w-3.5" /> Tag Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="contacts"><WaContactManager /></TabsContent>
        <TabsContent value="segments"><SegmentManager /></TabsContent>
        <TabsContent value="tags"><TagAnalytics /></TabsContent>
      </Tabs>
    </div>
  );
}
