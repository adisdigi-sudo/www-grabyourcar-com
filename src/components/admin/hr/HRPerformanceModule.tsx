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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Star, Plus, Search, Edit2, Trash2 } from "lucide-react";

const REVIEW_STATUSES = ["draft", "submitted", "approved", "acknowledged"];

export const HRPerformanceModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: reviews = [] } = useQuery({
    queryKey: ["hr-performance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("performance_reviews").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) delete payload.id;
      const { error } = await (supabase.from("performance_reviews") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-performance"] }); toast.success(editing ? "Updated" : "Review created"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("performance_reviews").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-performance"] }); toast.success("Deleted"); },
  });

  const avgRating = reviews.length ? (reviews.reduce((s: number, r: any) => s + Number(r.overall_rating || 0), 0) / reviews.length).toFixed(1) : "0";
  const filtered = reviews.filter((r: any) => !search || r.employee_name?.toLowerCase().includes(search.toLowerCase()));

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />)}</div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Reviews</p><p className="text-2xl font-bold">{reviews.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Rating</p><div className="flex items-center gap-2"><p className="text-2xl font-bold">{avgRating}</p><Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Approval</p><p className="text-2xl font-bold text-yellow-600">{reviews.filter((r: any) => r.status === "submitted").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Increments Given</p><p className="text-2xl font-bold text-green-600">{reviews.filter((r: any) => Number(r.increment_percentage) > 0).length}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ status: "draft", overall_rating: 3 }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Review</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead>Rating</TableHead><TableHead>Increment</TableHead><TableHead>Status</TableHead><TableHead>Reviewer</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">{r.employee_name}</TableCell>
                <TableCell className="text-sm">{r.review_period || "—"}</TableCell>
                <TableCell>{renderStars(Number(r.overall_rating || 0))}</TableCell>
                <TableCell className="text-sm">{r.increment_percentage ? `${r.increment_percentage}%` : "—"}</TableCell>
                <TableCell><Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell className="text-sm">{r.reviewer_name || "—"}</TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setForm({ ...r }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No reviews found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Review" : "New Performance Review"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} /></div>
              <div><Label>Review Period</Label><Input value={form.review_period || ""} onChange={e => setForm(p => ({ ...p, review_period: e.target.value }))} placeholder="e.g. Q1 2026" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Reviewer Name</Label><Input value={form.reviewer_name || ""} onChange={e => setForm(p => ({ ...p, reviewer_name: e.target.value }))} /></div>
              <div><Label>Overall Rating (1-5)</Label><Input type="number" min="1" max="5" value={form.overall_rating || ""} onChange={e => setForm(p => ({ ...p, overall_rating: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Strengths</Label><Textarea value={form.strengths || ""} onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))} /></div>
            <div><Label>Areas of Improvement</Label><Textarea value={form.areas_of_improvement || ""} onChange={e => setForm(p => ({ ...p, areas_of_improvement: e.target.value }))} /></div>
            <div><Label>Goals for Next Period</Label><Textarea value={form.goals_next_period || ""} onChange={e => setForm(p => ({ ...p, goals_next_period: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Increment %</Label><Input type="number" value={form.increment_percentage || ""} onChange={e => setForm(p => ({ ...p, increment_percentage: Number(e.target.value) }))} /></div>
              <div><Label>Increment Amount</Label><Input type="number" value={form.increment_amount || ""} onChange={e => setForm(p => ({ ...p, increment_amount: Number(e.target.value) }))} /></div>
              <div><Label>Status</Label><Select value={form.status || "draft"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REVIEW_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.employee_name}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRPerformanceModule;
