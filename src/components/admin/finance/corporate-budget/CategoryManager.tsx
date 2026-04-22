import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Tags, Trash2 } from "lucide-react";

export const CategoryManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📌");

  const { data: cats = [] } = useQuery({
    queryKey: ["corp-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("corporate_expense_categories") as any)
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("corporate_expense_categories") as any).insert({
        name: name.trim(),
        icon: icon.trim() || "📌",
        is_standard: false,
        sort_order: 100,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["corp-categories"] });
      toast.success("Category added");
      setName("");
      setIcon("📌");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("corporate_expense_categories") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["corp-categories"] });
      toast.success("Removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tags className="h-4 w-4" /> Manage Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Expense Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {cats.map((c: any) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{c.icon || "📌"}</span>
                <span className="text-sm font-medium">{c.name}</span>
                {c.is_standard && (
                  <Badge variant="secondary" className="text-[10px]">Standard</Badge>
                )}
              </div>
              {!c.is_standard && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => delMutation.mutate(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-3">
          <Label className="text-sm font-medium">Add Custom Category</Label>
          <div className="grid grid-cols-[60px_1fr_auto] gap-2">
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📌" />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Equipment Lease"
            />
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!name.trim() || addMutation.isPending}
              size="sm"
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
