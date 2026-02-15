import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Addon {
  id: string;
  title: string;
  description: string | null;
  icon_name: string | null;
  tag: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

export function InsuranceAddonsAdmin() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<Addon | null>(null);
  const [form, setForm] = useState({ title: "", description: "", icon_name: "Shield", tag: "", sort_order: 0 });

  const { data: addons, isLoading } = useQuery({
    queryKey: ["admin-insurance-addons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insurance_addons").select("*").order("sort_order");
      if (error) throw error;
      return data as Addon[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (addon: typeof form & { id?: string }) => {
      const payload = { ...addon, tag: addon.tag || null };
      if (addon.id) {
        const { error } = await supabase.from("insurance_addons").update(payload).eq("id", addon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("insurance_addons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-insurance-addons"] });
      toast.success("Add-on saved!");
      setIsOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_addons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-insurance-addons"] });
      toast.success("Deleted!");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("insurance_addons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-insurance-addons"] }),
  });

  const resetForm = () => {
    setForm({ title: "", description: "", icon_name: "Shield", tag: "", sort_order: 0 });
    setEditItem(null);
  };

  const openEdit = (addon: Addon) => {
    setEditItem(addon);
    setForm({
      title: addon.title,
      description: addon.description || "",
      icon_name: addon.icon_name || "Shield",
      tag: addon.tag || "",
      sort_order: addon.sort_order || 0,
    });
    setIsOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Insurance Add-ons</CardTitle>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Add-on</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem ? "Edit Add-on" : "Add Add-on"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Icon</Label><Input value={form.icon_name} onChange={(e) => setForm({ ...form, icon_name: e.target.value })} placeholder="Shield, Car, Cog..." /></div>
                <div><Label>Tag</Label><Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Popular, Recommended..." /></div>
                <div><Label>Sort</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              </div>
              <Button onClick={() => saveMutation.mutate(editItem ? { ...form, id: editItem.id } : form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
          <div className="space-y-2">
            {addons?.map((addon) => (
              <div key={addon.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{addon.title}</span>
                    {addon.tag && <Badge variant="outline" className="text-[10px]">{addon.tag}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{addon.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={addon.is_active ?? true} onCheckedChange={(v) => toggleMutation.mutate({ id: addon.id, is_active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(addon)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(addon.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
