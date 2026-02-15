import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number | null;
  is_active: boolean | null;
}

export function InsuranceFAQsAdmin() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<FAQ | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", sort_order: 0 });

  const { data: faqs, isLoading } = useQuery({
    queryKey: ["admin-insurance-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insurance_faqs").select("*").order("sort_order");
      if (error) throw error;
      return data as FAQ[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (faq: typeof form & { id?: string }) => {
      if (faq.id) {
        const { error } = await supabase.from("insurance_faqs").update(faq).eq("id", faq.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("insurance_faqs").insert(faq);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-insurance-faqs"] });
      toast.success("FAQ saved!");
      setIsOpen(false);
      setForm({ question: "", answer: "", sort_order: 0 });
      setEditItem(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-insurance-faqs"] });
      toast.success("FAQ deleted!");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("insurance_faqs").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-insurance-faqs"] }),
  });

  const openEdit = (faq: FAQ) => {
    setEditItem(faq);
    setForm({ question: faq.question, answer: faq.answer, sort_order: faq.sort_order || 0 });
    setIsOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Insurance FAQs</CardTitle>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) { setEditItem(null); setForm({ question: "", answer: "", sort_order: 0 }); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add FAQ</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? "Edit FAQ" : "Add FAQ"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Question</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
              <div><Label>Answer</Label><Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={4} /></div>
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              <Button onClick={() => saveMutation.mutate(editItem ? { ...form, id: editItem.id } : form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save FAQ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
          <div className="space-y-2">
            {faqs?.map((faq) => (
              <div key={faq.id} className="flex items-start justify-between p-3 border rounded-lg gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{faq.question}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={faq.is_active ?? true} onCheckedChange={(v) => toggleMutation.mutate({ id: faq.id, is_active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(faq)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(faq.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
