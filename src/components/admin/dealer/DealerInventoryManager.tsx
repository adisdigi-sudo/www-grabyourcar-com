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
import { Plus, Car, Search, Edit, Trash2, IndianRupee, Tag, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STOCK_STATUSES = [
  { value: "available", label: "Available", color: "bg-emerald-500/10 text-emerald-600" },
  { value: "limited", label: "Limited Stock", color: "bg-amber-500/10 text-amber-600" },
  { value: "sold_out", label: "Sold Out", color: "bg-red-500/10 text-red-600" },
  { value: "upcoming", label: "Upcoming", color: "bg-blue-500/10 text-blue-600" },
];

const emptyForm = {
  dealer_rep_id: "", car_name: "", brand: "", variant: "", fuel_type: "", transmission: "",
  color: "", year: new Date().getFullYear(), ex_showroom_price: 0, on_road_price: 0,
  discount: "", offer_details: "", stock_status: "available", quantity: 1, image_url: "", notes: "",
};

export default function DealerInventoryManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: reps = [] } = useQuery({
    queryKey: ["dealer-representatives-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealer_representatives").select("id, name, brand, dealer_companies(company_name)").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ["dealer-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealer_inventory").select("*, dealer_representatives(name, brand, dealer_companies(company_name))").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        year: Number(form.year) || null,
        ex_showroom_price: Number(form.ex_showroom_price) || null,
        on_road_price: Number(form.on_road_price) || null,
        quantity: Number(form.quantity) || 1,
        dealer_rep_id: form.dealer_rep_id || null,
      };
      if (editId) {
        const { error } = await supabase.from("dealer_inventory").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dealer_inventory").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-inventory"] });
      toast.success(editId ? "Updated" : "Added");
      setDialogOpen(false); setEditId(null); setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dealer_inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dealer-inventory"] }); toast.success("Deleted"); },
  });

  const filtered = inventory.filter((i: any) =>
    i.car_name.toLowerCase().includes(search.toLowerCase()) ||
    i.brand.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (i: any) => {
    setEditId(i.id);
    setForm({
      dealer_rep_id: i.dealer_rep_id || "", car_name: i.car_name, brand: i.brand,
      variant: i.variant || "", fuel_type: i.fuel_type || "", transmission: i.transmission || "",
      color: i.color || "", year: i.year || new Date().getFullYear(),
      ex_showroom_price: i.ex_showroom_price || 0, on_road_price: i.on_road_price || 0,
      discount: i.discount || "", offer_details: i.offer_details || "",
      stock_status: i.stock_status, quantity: i.quantity || 1, image_url: i.image_url || "", notes: i.notes || "",
    });
    setDialogOpen(true);
  };

  const formatPrice = (p: number | null) => p ? `₹${(p / 100000).toFixed(2)}L` : "—";

  const stats = {
    total: inventory.length,
    available: inventory.filter((i: any) => i.stock_status === "available").length,
    withDiscount: inventory.filter((i: any) => i.discount).length,
    brands: new Set(inventory.map((i: any) => i.brand)).size,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Inventory", value: stats.total, icon: Car, gradient: "from-blue-500 to-indigo-600" },
          { label: "Available", value: stats.available, icon: Package, gradient: "from-emerald-500 to-green-600" },
          { label: "With Offers", value: stats.withDiscount, icon: Tag, gradient: "from-amber-500 to-orange-600" },
          { label: "Brands", value: stats.brands, icon: Car, gradient: "from-purple-500 to-violet-600" },
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
          <Input placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Inventory</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Inventory</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Dealer Representative</Label>
                <Select value={form.dealer_rep_id} onValueChange={v => setForm(f => ({ ...f, dealer_rep_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select rep..." /></SelectTrigger>
                  <SelectContent>{reps.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.brand})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Car Name *</Label><Input value={form.car_name} onChange={e => setForm(f => ({ ...f, car_name: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Brand *</Label><Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2"><Label>Variant</Label><Input value={form.variant} onChange={e => setForm(f => ({ ...f, variant: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Fuel Type</Label><Input value={form.fuel_type} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))} placeholder="Petrol/Diesel/EV" /></div>
                <div className="grid gap-2"><Label>Transmission</Label><Input value={form.transmission} onChange={e => setForm(f => ({ ...f, transmission: e.target.value }))} placeholder="MT/AT/CVT" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2"><Label>Color</Label><Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} /></div>
                <div className="grid gap-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Ex-Showroom Price</Label><Input type="number" value={form.ex_showroom_price} onChange={e => setForm(f => ({ ...f, ex_showroom_price: Number(e.target.value) }))} /></div>
                <div className="grid gap-2"><Label>On-Road Price</Label><Input type="number" value={form.on_road_price} onChange={e => setForm(f => ({ ...f, on_road_price: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Discount</Label><Input value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} placeholder="e.g. ₹50,000 off" /></div>
                <div className="grid gap-2">
                  <Label>Stock Status</Label>
                  <Select value={form.stock_status} onValueChange={v => setForm(f => ({ ...f, stock_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STOCK_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2"><Label>Offer Details</Label><Input value={form.offer_details} onChange={e => setForm(f => ({ ...f, offer_details: e.target.value }))} placeholder="Special offer description" /></div>
              <div className="grid gap-2"><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.car_name || !form.brand || saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add to Inventory"}
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
                <TableHead>Car</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Variant / Fuel</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Dealer</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filtered.map((i: any) => {
                  const statusInfo = STOCK_STATUSES.find(s => s.value === i.stock_status);
                  return (
                    <motion.tr key={i.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b transition-colors hover:bg-muted/50">
                      <TableCell className="font-medium">{i.car_name}</TableCell>
                      <TableCell><Badge variant="outline">{i.brand}</Badge></TableCell>
                      <TableCell className="text-sm">{[i.variant, i.fuel_type, i.transmission].filter(Boolean).join(" · ") || "—"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {i.on_road_price ? <span className="flex items-center gap-0.5 font-medium"><IndianRupee className="h-3 w-3" />{formatPrice(i.on_road_price)}</span> : "—"}
                          {i.ex_showroom_price ? <span className="text-xs text-muted-foreground">Ex: {formatPrice(i.ex_showroom_price)}</span> : null}
                        </div>
                      </TableCell>
                      <TableCell>{i.discount ? <Badge className="bg-red-500/10 text-red-600 border-red-200" variant="outline">{i.discount}</Badge> : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusInfo?.color}>{statusInfo?.label}</Badge></TableCell>
                      <TableCell className="text-xs">{i.dealer_representatives?.name || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(i)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No inventory found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
