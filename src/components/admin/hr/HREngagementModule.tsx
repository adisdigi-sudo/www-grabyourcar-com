import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Plus, Edit2, Trash2, PartyPopper, MessageSquare, Trophy } from "lucide-react";

const TYPES = ["announcement", "celebration", "poll", "recognition", "event"];
const typeIcon: Record<string, any> = { announcement: <Megaphone className="h-5 w-5" />, celebration: <PartyPopper className="h-5 w-5" />, poll: <MessageSquare className="h-5 w-5" />, recognition: <Trophy className="h-5 w-5" />, event: <PartyPopper className="h-5 w-5" /> };
const typeColor: Record<string, string> = { announcement: "bg-blue-100 text-blue-800", celebration: "bg-pink-100 text-pink-800", poll: "bg-purple-100 text-purple-800", recognition: "bg-yellow-100 text-yellow-800", event: "bg-green-100 text-green-800" };

export const HREngagementModule = () => {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: items = [] } = useQuery({
    queryKey: ["hr-engagement"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("hr_engagement") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) delete payload.id;
      const { error } = await (supabase.from("hr_engagement") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-engagement"] }); toast.success(editing ? "Updated" : "Posted"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("hr_engagement") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-engagement"] }); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {TYPES.map(t => (
          <Card key={t}><CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeColor[t]}`}>{typeIcon[t]}</div>
            <div><p className="text-xs text-muted-foreground capitalize">{t}s</p><p className="text-xl font-bold">{items.filter((i: any) => i.type === t).length}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Feed</h3>
        <Button onClick={() => { setEditing(null); setForm({ type: "announcement", is_active: true }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Post</Button>
      </div>

      <div className="space-y-4">
        {items.map((item: any) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${typeColor[item.type] || "bg-gray-100"}`}>{typeIcon[item.type] || <Megaphone className="h-5 w-5" />}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={typeColor[item.type] || ""} variant="secondary">{item.type}</Badge>
                      {item.target_department && <Badge variant="outline" className="text-xs">{item.target_department}</Badge>}
                      {!item.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                    </div>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{item.created_by || "Admin"} • {format(new Date(item.created_at), "dd MMM yyyy, hh:mm a")}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(item); setForm({ ...item }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(item.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <Card><CardContent className="p-12 text-center text-muted-foreground">No engagement posts yet. Create your first one!</CardContent></Card>}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Post" : "New Engagement Post"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.type || "announcement"} onValueChange={v => setForm(p => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Target Department</Label><Input value={form.target_department || ""} onChange={e => setForm(p => ({ ...p, target_department: e.target.value }))} placeholder="All departments" /></div>
            </div>
            <div><Label>Title *</Label><Input value={form.title || ""} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Content</Label><Textarea rows={4} value={form.content || ""} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} /></div>
            <div><Label>Posted By</Label><Input value={form.created_by || ""} onChange={e => setForm(p => ({ ...p, created_by: e.target.value }))} placeholder="HR Admin" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.title}>{editing ? "Update" : "Post"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HREngagementModule;
