import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, User, Search, Phone, MessageCircle, Edit, Trash2, Building2, IndianRupee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "sales_head", label: "Sales Head" },
  { value: "sales_executive", label: "Sales Executive" },
  { value: "agent", label: "Agent" },
];

const COMMISSION_TYPES = [
  { value: "fixed", label: "Fixed" },
  { value: "percentage", label: "Percentage" },
  { value: "slab", label: "Slab" },
];

const emptyForm = {
  dealer_company_id: "", name: "", role: "sales_executive", brand: "",
  phone: "", whatsapp_number: "", email: "", commission_type: "fixed", commission_value: 0,
};

export default function DealerRepresentativesManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: companies = [] } = useQuery({
    queryKey: ["dealer-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealer_companies").select("id, company_name").eq("is_active", true).order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: reps = [], isLoading } = useQuery({
    queryKey: ["dealer-representatives"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealer_representatives").select("*, dealer_companies(company_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        commission_value: Number(form.commission_value) || 0,
        dealer_company_id: form.dealer_company_id || null,
      };
      if (editId) {
        const { error } = await supabase.from("dealer_representatives").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dealer_representatives").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-representatives"] });
      toast.success(editId ? "Rep updated" : "Rep added");
      setDialogOpen(false); setEditId(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dealer_representatives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dealer-representatives"] }); toast.success("Deleted"); },
  });

  const filtered = reps.filter((r: any) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.brand.toLowerCase().includes(search.toLowerCase()) ||
    (r.whatsapp_number || "").includes(search)
  );

  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      dealer_company_id: r.dealer_company_id || "", name: r.name, role: r.role, brand: r.brand,
      phone: r.phone || "", whatsapp_number: r.whatsapp_number || "", email: r.email || "",
      commission_type: r.commission_type || "fixed", commission_value: r.commission_value || 0,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Reps", value: reps.length, icon: User, gradient: "from-blue-500 to-indigo-600" },
          { label: "Active", value: reps.filter((r: any) => r.is_active).length, icon: User, gradient: "from-emerald-500 to-green-600" },
          { label: "With WhatsApp", value: reps.filter((r: any) => r.whatsapp_number).length, icon: MessageCircle, gradient: "from-green-500 to-emerald-600" },
          { label: "Brands", value: new Set(reps.map((r: any) => r.brand)).size, icon: Building2, gradient: "from-purple-500 to-violet-600" },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${s.gradient}`} />
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${s.gradient} text-white`}><s.icon className="h-4 w-4" /></div>
                  <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search reps..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Representative</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Representative</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Company</Label>
                <Select value={form.dealer_company_id} onValueChange={v => setForm(f => ({ ...f, dealer_company_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select company..." /></SelectTrigger>
                  <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Brand *</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Hyundai" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>WhatsApp</Label><Input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Commission Type</Label>
                  <Select value={form.commission_type} onValueChange={v => setForm(f => ({ ...f, commission_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COMMISSION_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Commission Value</Label><Input type="number" value={form.commission_value} onChange={e => setForm(f => ({ ...f, commission_value: Number(e.target.value) }))} /></div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.name || !form.brand || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add Rep"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filtered.map((r: any) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="border-b transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><span className="text-sm">{r.dealer_companies?.company_name || "—"}</span></TableCell>
                    <TableCell><Badge variant="outline">{r.brand}</Badge></TableCell>
                    <TableCell className="capitalize text-sm">{r.role?.replace("_", " ")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                        {r.whatsapp_number && <span className="flex items-center gap-1 text-green-600"><MessageCircle className="h-3 w-3" />{r.whatsapp_number}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm"><IndianRupee className="h-3 w-3" />{r.commission_value} ({r.commission_type})</span>
                    </TableCell>
                    <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No representatives found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
