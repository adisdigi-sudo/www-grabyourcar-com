import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Users, Phone, Mail, TrendingUp, Target, Award, Edit, Trash2 } from "lucide-react";

export function InsuranceAdvisorsManager() {
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();

  const { data: advisors, isLoading } = useQuery({
    queryKey: ["ins-advisors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_advisors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addAdvisor = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("insurance_advisors").insert({
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        specialization: form.specialization ? form.specialization.split(",").map((s: string) => s.trim()) : null,
        cities: form.cities ? form.cities.split(",").map((s: string) => s.trim()) : null,
        max_daily_leads: form.maxLeads ? parseInt(form.maxLeads) : 20,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-advisors"] });
      toast.success("Advisor added");
      setShowAdd(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("insurance_advisors").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-advisors"] });
      toast.success("Updated");
    },
  });

  const deleteAdvisor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_advisors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-advisors"] });
      toast.success("Advisor removed");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Insurance Advisors</h3>
          <p className="text-xs text-muted-foreground">Manage advisors, assign leads, track performance</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Advisor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Insurance Advisor</DialogTitle></DialogHeader>
            <AddAdvisorForm onSubmit={f => addAdvisor.mutate(f)} loading={addAdvisor.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {advisors?.map((a: any) => (
            <Card key={a.id} className={`hover:shadow-md transition-all ${!a.is_active ? "opacity-60" : ""}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {a.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{a.name}</p>
                      {a.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{a.phone}</p>}
                      {a.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{a.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={a.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ id: a.id, active: v })}
                    />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteAdvisor.mutate(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-sm font-bold">{a.total_leads_assigned || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Leads</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-sm font-bold">{a.total_policies_sold || 0}</p>
                    <p className="text-[9px] text-muted-foreground">Sold</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-sm font-bold">{a.conversion_rate || 0}%</p>
                    <p className="text-[9px] text-muted-foreground">Conv.</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-sm font-bold">₹{((a.total_commission_earned || 0) / 1000).toFixed(0)}K</p>
                    <p className="text-[9px] text-muted-foreground">Earned</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {a.specialization?.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-[9px] capitalize">{s}</Badge>
                  ))}
                  {a.cities?.map((c: string) => (
                    <Badge key={c} variant="secondary" className="text-[9px]">{c}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {(!advisors || !advisors.length) && (
            <p className="text-sm text-muted-foreground text-center py-8 col-span-2">No advisors added yet</p>
          )}
        </div>
      )}
    </div>
  );
}

function AddAdvisorForm({ onSubmit, loading }: { onSubmit: (f: any) => void; loading: boolean }) {
  const [form, setForm] = useState<any>({});
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div><Label className="text-xs">Name *</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
        <div><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
      </div>
      <div><Label className="text-xs">Specialization (comma-separated)</Label><Input value={form.specialization || ""} onChange={e => set("specialization", e.target.value)} placeholder="comprehensive, third_party" /></div>
      <div><Label className="text-xs">Cities (comma-separated)</Label><Input value={form.cities || ""} onChange={e => set("cities", e.target.value)} placeholder="Delhi, Mumbai" /></div>
      <div><Label className="text-xs">Max Daily Leads</Label><Input type="number" value={form.maxLeads || "20"} onChange={e => set("maxLeads", e.target.value)} /></div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.name} className="w-full">
        {loading ? "Adding..." : "Add Advisor"}
      </Button>
    </div>
  );
}
