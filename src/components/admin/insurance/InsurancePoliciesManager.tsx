import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, FileText, Calendar, DollarSign, Shield, CheckCircle2, AlertTriangle } from "lucide-react";

const POLICY_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  lapsed: "bg-orange-100 text-orange-800",
  renewed: "bg-blue-100 text-blue-800",
};

export function InsurancePoliciesManager() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["ins-policies", search, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("insurance_policies")
        .select("*, insurance_clients(customer_name, phone, vehicle_number)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (search) q = q.or(`policy_number.ilike.%${search}%,insurer.ilike.%${search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["ins-clients-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const addPolicy = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("insurance_policies").insert({
        client_id: form.client_id,
        policy_number: form.policy_number || null,
        policy_type: form.policy_type,
        insurer: form.insurer,
        plan_name: form.plan_name || null,
        premium_amount: form.premium ? parseFloat(form.premium) : null,
        idv: form.idv ? parseFloat(form.idv) : null,
        start_date: form.start_date,
        expiry_date: form.expiry_date,
        addons: form.addons ? form.addons.split(",").map((s: string) => s.trim()) : null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-policies"] });
      toast.success("Policy added");
      setShowAdd(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by policy #, insurer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="lapsed">Lapsed</SelectItem>
            <SelectItem value="renewed">Renewed</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Policy</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Policy</DialogTitle></DialogHeader>
            <AddPolicyForm clients={clients || []} onSubmit={f => addPolicy.mutate(f)} loading={addPolicy.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Loading...</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium">Client</th>
                    <th className="text-left py-3 px-4 font-medium">Policy</th>
                    <th className="text-left py-3 px-4 font-medium">Insurer</th>
                    <th className="text-left py-3 px-4 font-medium">Premium</th>
                    <th className="text-left py-3 px-4 font-medium">Period</th>
                    <th className="text-left py-3 px-4 font-medium">Add-ons</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {policies?.map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <p className="font-medium text-xs">{p.insurance_clients?.customer_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{p.insurance_clients?.phone}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-mono">{p.policy_number || "—"}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground capitalize">{p.policy_type}</p>
                      </td>
                      <td className="py-3 px-4 text-xs">{p.insurer}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold flex items-center gap-0.5">
                          <DollarSign className="h-3 w-3" />₹{p.premium_amount?.toLocaleString("en-IN") || 0}
                        </span>
                        {p.idv && <p className="text-[10px] text-muted-foreground">IDV: ₹{p.idv?.toLocaleString("en-IN")}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{p.start_date}</span>
                        <span className={`flex items-center gap-1 mt-0.5 ${new Date(p.expiry_date) < new Date() ? "text-destructive" : ""}`}>
                          → {p.expiry_date}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-0.5">
                          {p.addons?.slice(0, 3).map((a: string) => (
                            <Badge key={a} variant="outline" className="text-[9px] py-0">{a}</Badge>
                          ))}
                          {p.addons?.length > 3 && <Badge variant="outline" className="text-[9px] py-0">+{p.addons.length - 3}</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={`${POLICY_STATUS_COLORS[p.status] || ""} text-[10px] border-0`}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!policies || !policies.length) && <p className="text-sm text-muted-foreground text-center py-8">No policies</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddPolicyForm({ clients, onSubmit, loading }: { clients: any[]; onSubmit: (f: any) => void; loading: boolean }) {
  const [form, setForm] = useState<any>({});
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Client *</Label>
        <Select value={form.client_id || ""} onValueChange={v => set("client_id", v)}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.customer_name || c.phone}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Policy # </Label><Input value={form.policy_number || ""} onChange={e => set("policy_number", e.target.value)} /></div>
        <div>
          <Label className="text-xs">Policy Type *</Label>
          <Select value={form.policy_type || ""} onValueChange={v => set("policy_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="comprehensive">Comprehensive</SelectItem>
              <SelectItem value="third_party">Third Party</SelectItem>
              <SelectItem value="standalone_od">Standalone OD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Insurer *</Label><Input value={form.insurer || ""} onChange={e => set("insurer", e.target.value)} /></div>
        <div><Label className="text-xs">Plan Name</Label><Input value={form.plan_name || ""} onChange={e => set("plan_name", e.target.value)} /></div>
        <div><Label className="text-xs">Premium (₹)</Label><Input type="number" value={form.premium || ""} onChange={e => set("premium", e.target.value)} /></div>
        <div><Label className="text-xs">IDV (₹)</Label><Input type="number" value={form.idv || ""} onChange={e => set("idv", e.target.value)} /></div>
        <div><Label className="text-xs">Start Date *</Label><Input type="date" value={form.start_date || ""} onChange={e => set("start_date", e.target.value)} /></div>
        <div><Label className="text-xs">Expiry Date *</Label><Input type="date" value={form.expiry_date || ""} onChange={e => set("expiry_date", e.target.value)} /></div>
      </div>
      <div><Label className="text-xs">Add-ons (comma separated)</Label><Input value={form.addons || ""} onChange={e => set("addons", e.target.value)} placeholder="zero_dep, engine_protect, rsa" /></div>
      <Button onClick={() => onSubmit(form)} disabled={loading || !form.client_id || !form.policy_type || !form.insurer || !form.start_date || !form.expiry_date} className="w-full">
        {loading ? "Adding..." : "Add Policy"}
      </Button>
    </div>
  );
}
