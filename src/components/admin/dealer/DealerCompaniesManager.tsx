import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Building2, MapPin, Star, Edit, Trash2, Search, Phone, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DealerCompany {
  id: string;
  company_name: string;
  dealer_type: string;
  city: string | null;
  state: string | null;
  priority_level: number;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

const DEALER_TYPES = [
  { value: "authorized", label: "Authorized Dealer", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  { value: "broker", label: "Broker", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  { value: "reseller", label: "Reseller", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { value: "direct_agent", label: "Direct Agent", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
];

const emptyForm = {
  company_name: "", dealer_type: "authorized", city: "", state: "",
  priority_level: 1, contact_email: "", contact_phone: "", address: "", notes: "",
  brand_name: "", designation: "", pincode: "", region: "North",
  website_url: "", gst_number: "", established_year: "", showroom_count: 1,
};

export default function DealerCompaniesManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["dealer-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealer_companies").select("*").order("priority_level", { ascending: false });
      if (error) throw error;
      return data as DealerCompany[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, priority_level: Number(form.priority_level) || 1 };
      if (editId) {
        const { error } = await supabase.from("dealer_companies").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dealer_companies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-companies"] });
      toast.success(editId ? "Company updated" : "Company added");
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dealer_companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-companies"] });
      toast.success("Company deleted");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("dealer_companies").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-companies"] });
      toast.success("Status updated");
    },
  });

  const filtered = companies.filter(c =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.city || "").toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      company_name: c.company_name, dealer_type: c.dealer_type, city: c.city || "",
      state: c.state || "", priority_level: c.priority_level || 1,
      contact_email: c.contact_email || "", contact_phone: c.contact_phone || "",
      address: c.address || "", notes: c.notes || "",
      brand_name: c.brand_name || "", designation: c.designation || "", pincode: c.pincode || "",
    });
    setDialogOpen(true);
  };

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.is_active).length,
    authorized: companies.filter(c => c.dealer_type === "authorized").length,
    cities: new Set(companies.map(c => c.city).filter(Boolean)).size,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Companies", value: stats.total, icon: Building2, gradient: "from-blue-500 to-indigo-600" },
          { label: "Active", value: stats.active, icon: Star, gradient: "from-emerald-500 to-green-600" },
          { label: "Authorized", value: stats.authorized, icon: Building2, gradient: "from-purple-500 to-violet-600" },
          { label: "Cities", value: stats.cities, icon: MapPin, gradient: "from-amber-500 to-orange-600" },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${s.gradient}`} />
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${s.gradient} text-white`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
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
          <Input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Company</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Dealer Company</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Company / Showroom Name *</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="e.g. Kiran Hyundai" /></div>
                <div className="grid gap-2"><Label>Dealership Brand</Label><Input value={form.brand_name} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} placeholder="e.g. Hyundai, Maruti" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={form.dealer_type} onValueChange={v => setForm(f => ({ ...f, dealer_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DEALER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Designation</Label><Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Sales Manager" /></div>
                <div className="grid gap-2"><Label>Priority (1-5)</Label><Input type="number" min={1} max={5} value={form.priority_level} onChange={e => setForm(f => ({ ...f, priority_level: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2"><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>State</Label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Pincode</Label><Input value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Email</Label><Input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Phone</Label><Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
              </div>
              <div className="grid gap-2"><Label>Full Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full showroom address..." /></div>
              <div className="grid gap-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.company_name || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add Company"}
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
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filtered.map(c => {
                  const typeInfo = DEALER_TYPES.find(t => t.value === c.dealer_type);
                  return (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b transition-colors hover:bg-muted/50">
                      <TableCell className="font-medium">{c.company_name}</TableCell>
                      <TableCell><Badge variant="outline" className={typeInfo?.color}>{typeInfo?.label}</Badge></TableCell>
                      <TableCell>
                        {c.city || c.state ? (
                          <span className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3" />{[c.city, c.state].filter(Boolean).join(", ")}</span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-xs">
                          {c.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.contact_phone}</span>}
                          {c.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.contact_email}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < c.priority_level ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                        ))}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.is_active ? "default" : "secondary"} className="cursor-pointer"
                          onClick={() => toggleMutation.mutate({ id: c.id, active: !c.is_active })}>
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No companies found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
