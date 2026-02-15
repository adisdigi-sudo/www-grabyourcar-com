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
import { Plus, Pencil, Trash2, Star, GripVertical } from "lucide-react";

interface InsurancePlan {
  id: string;
  insurer_name: string;
  plan_type: string;
  premium_display: string;
  premium_value: number;
  idv: string | null;
  claim_settlement_ratio: string | null;
  features: string[];
  cashless_garages: string | null;
  rating: number | null;
  is_popular: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
}

export function InsurancePlansAdmin() {
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState<InsurancePlan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    insurer_name: "",
    plan_type: "Comprehensive",
    premium_display: "",
    premium_value: 0,
    idv: "",
    claim_settlement_ratio: "",
    features: "",
    cashless_garages: "",
    rating: 4.0,
    is_popular: false,
    sort_order: 0,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-insurance-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as InsurancePlan[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (plan: typeof form & { id?: string }) => {
      const payload = {
        ...plan,
        features: plan.features.split(",").map((f: string) => f.trim()).filter(Boolean),
      };
      if (plan.id) {
        const { error } = await supabase.from("insurance_plans").update(payload).eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("insurance_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-insurance-plans"] });
      toast.success("Plan saved!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-insurance-plans"] });
      toast.success("Plan deleted!");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("insurance_plans").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-insurance-plans"] }),
  });

  const resetForm = () => {
    setForm({ insurer_name: "", plan_type: "Comprehensive", premium_display: "", premium_value: 0, idv: "", claim_settlement_ratio: "", features: "", cashless_garages: "", rating: 4.0, is_popular: false, sort_order: 0 });
    setEditPlan(null);
  };

  const openEdit = (plan: InsurancePlan) => {
    setEditPlan(plan);
    setForm({
      insurer_name: plan.insurer_name,
      plan_type: plan.plan_type,
      premium_display: plan.premium_display,
      premium_value: plan.premium_value,
      idv: plan.idv || "",
      claim_settlement_ratio: plan.claim_settlement_ratio || "",
      features: (plan.features || []).join(", "),
      cashless_garages: plan.cashless_garages || "",
      rating: plan.rating || 4.0,
      is_popular: plan.is_popular || false,
      sort_order: plan.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Insurance Plans</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editPlan ? "Edit Plan" : "Add New Plan"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Insurer Name</Label><Input value={form.insurer_name} onChange={(e) => setForm({ ...form, insurer_name: e.target.value })} /></div>
                <div><Label>Plan Type</Label><Input value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Premium Display</Label><Input value={form.premium_display} onChange={(e) => setForm({ ...form, premium_display: e.target.value })} placeholder="₹4,999" /></div>
                <div><Label>Premium Value</Label><Input type="number" value={form.premium_value} onChange={(e) => setForm({ ...form, premium_value: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>IDV</Label><Input value={form.idv} onChange={(e) => setForm({ ...form, idv: e.target.value })} /></div>
                <div><Label>Claim Ratio</Label><Input value={form.claim_settlement_ratio} onChange={(e) => setForm({ ...form, claim_settlement_ratio: e.target.value })} /></div>
              </div>
              <div><Label>Features (comma-separated)</Label><Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Zero Dep, RSA, NCB Protection" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Garages</Label><Input value={form.cashless_garages} onChange={(e) => setForm({ ...form, cashless_garages: e.target.value })} /></div>
                <div><Label>Rating</Label><Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} />
                <Label>Mark as Popular / Best Value</Label>
              </div>
              <Button onClick={() => saveMutation.mutate(editPlan ? { ...form, id: editPlan.id } : form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Plan"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : (
          <div className="space-y-3">
            {plans?.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{plan.insurer_name}</span>
                      <Badge variant="outline" className="text-[10px]">{plan.plan_type}</Badge>
                      {plan.is_popular && <Badge className="text-[10px]">Popular</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="font-medium text-primary">{plan.premium_display}</span>
                      <span>IDV: {plan.idv}</span>
                      <span>Claim: {plan.claim_settlement_ratio}</span>
                      {plan.rating && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-chart-4 text-chart-4" />{plan.rating}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={plan.is_active ?? true} onCheckedChange={(v) => toggleMutation.mutate({ id: plan.id, is_active: v })} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Delete this plan?")) deleteMutation.mutate(plan.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
            {!plans?.length && <p className="text-sm text-muted-foreground text-center py-8">No plans added yet</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
