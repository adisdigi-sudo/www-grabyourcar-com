import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Users, MessageCircle, Filter, Search, Plus, Upload, Phone, Zap } from "lucide-react";

export default function DealerInquiryHub() {
  const qc = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [templateType, setTemplateType] = useState("stock_inquiry");
  const [sending, setSending] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBrand, setBulkBrand] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", whatsapp_number: "", dealer_name: "", brand: "", city: "", state: "" });

  // Fetch brands from car_brands table
  const { data: brands = [] } = useQuery({
    queryKey: ["car-brands-inquiry"],
    queryFn: async () => {
      const { data, error } = await supabase.from("car_brands").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch dealer reps with company info
  const { data: reps = [], isLoading } = useQuery({
    queryKey: ["dealer-reps-inquiry", selectedBrand, stateFilter, cityFilter],
    queryFn: async () => {
      let q = supabase.from("dealer_representatives")
        .select("*, dealer_companies(company_name, dealer_type, city, state)")
        .eq("is_active", true)
        .order("name");
      if (selectedBrand !== "all") q = q.eq("brand", selectedBrand);
      if (stateFilter !== "all") q = q.eq("state", stateFilter);
      if (cityFilter !== "all") q = q.eq("city", cityFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // Unique states and cities for filters
  const states = useMemo(() => [...new Set(reps.map((r: any) => r.state).filter(Boolean))].sort(), [reps]);
  const cities = useMemo(() => [...new Set(reps.map((r: any) => r.city).filter(Boolean))].sort(), [reps]);

  const whatsappReps = reps.filter((r: any) => r.whatsapp_number);

  // Template generator
  const applyTemplate = (type: string) => {
    setTemplateType(type);
    const brandName = selectedBrand !== "all" ? selectedBrand : "[Brand]";
    switch (type) {
      case "stock_inquiry":
        setMessage(`Hi, this is GrabYourCar.\n\nDo you have any ${brandName} cars available in stock?\nPlease share:\n• Available models & variants\n• On-road price\n• Best offer / discount\n• Delivery timeline\n\nThank you 🙏`);
        break;
      case "best_deal":
        setMessage(`Hi, GrabYourCar here.\n\nWe have a customer looking for the best deal on ${brandName}.\n\nPlease share your best offer with:\n• Lowest on-road price\n• Exchange bonus (if any)\n• Finance offers\n• Free accessories\n\nUrgent requirement. 🚗`);
        break;
      case "daily_offer":
        setMessage(`📢 Daily Offer Update Request\n\nHi, please share today's offers for ${brandName}:\n• Any new discounts?\n• Limited stock alerts?\n• Special weekend offers?\n\n— GrabYourCar Team`);
        break;
      default:
        setMessage("");
    }
  };

  const toggleAll = () => {
    const withWA = reps.filter((r: any) => r.whatsapp_number);
    if (selectedIds.length === withWA.length) setSelectedIds([]);
    else setSelectedIds(withWA.map((r: any) => r.id));
  };

  // Send via WhatsApp API (Shoot All)
  const shootAll = async () => {
    if (selectedIds.length === 0) { toast.error("Select at least one dealer"); return; }
    if (!message.trim()) { toast.error("Write a message first"); return; }
    setSending(true);
    try {
      const selectedReps = reps.filter((r: any) => selectedIds.includes(r.id) && r.whatsapp_number);
      const phones = selectedReps.map((r: any) => r.whatsapp_number);

      const { data, error } = await supabase.functions.invoke("dealer-inquiry-broadcast", {
        body: { phones, message, brand: selectedBrand !== "all" ? selectedBrand : "All" },
      });
      if (error) throw error;

      toast.success(`✅ Sent to ${data?.summary?.sent || 0} / ${phones.length} dealers!`);
      if (data?.summary?.failed > 0) toast.warning(`⚠️ ${data.summary.failed} failed`);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ["dealer-broadcast-logs"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  // Send One-by-One (opens WhatsApp web links)
  const sendOneByOne = () => {
    if (selectedIds.length === 0) { toast.error("Select at least one dealer"); return; }
    if (!message.trim()) { toast.error("Write a message first"); return; }
    const selectedReps = reps.filter((r: any) => selectedIds.includes(r.id) && r.whatsapp_number);
    const encoded = encodeURIComponent(message);
    selectedReps.forEach((r: any, i: number) => {
      const phone = r.whatsapp_number.replace(/\D/g, "");
      const fullPhone = phone.startsWith("91") ? phone : `91${phone}`;
      setTimeout(() => window.open(`https://wa.me/${fullPhone}?text=${encoded}`, "_blank"), i * 1500);
    });
    toast.success(`Opening ${selectedReps.length} WhatsApp chats...`);
  };

  // Bulk import
  const handleBulkImport = async () => {
    if (!bulkBrand) { toast.error("Select brand for bulk import"); return; }
    const lines = bulkText.trim().split("\n").filter(l => l.trim());
    if (lines.length === 0) { toast.error("Paste data first"); return; }

    const rows: any[] = [];
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(s => s.trim());
      if (parts.length < 2) continue;
      const [name, whatsapp_number, dealer_name, city, state] = parts;
      
      let companyId: string | null = null;
      if (dealer_name) {
        const { data: existing } = await supabase.from("dealer_companies")
          .select("id").eq("company_name", dealer_name).limit(1).single();
        if (existing) {
          companyId = existing.id;
        } else {
          const { data: newCo } = await supabase.from("dealer_companies")
            .insert({ company_name: dealer_name, city: city || null, state: state || null })
            .select("id").single();
          companyId = newCo?.id || null;
        }
      }

      rows.push({
        name: name || "Unknown",
        whatsapp_number,
        brand: bulkBrand,
        dealer_company_id: companyId,
        city: city || null,
        state: state || null,
        role: "sales_executive",
      });
    }

    const { error } = await supabase.from("dealer_representatives").insert(rows);
    if (error) { toast.error(error.message); return; }

    toast.success(`✅ Imported ${rows.length} dealers for ${bulkBrand}`);
    setBulkOpen(false);
    setBulkText("");
    qc.invalidateQueries({ queryKey: ["dealer-reps-inquiry"] });
  };

  // Add single dealer
  const handleAddDealer = async () => {
    if (!addForm.name || !addForm.whatsapp_number || !addForm.brand) {
      toast.error("Name, WhatsApp & Brand required"); return;
    }
    let companyId: string | null = null;
    if (addForm.dealer_name) {
      const { data: existing } = await supabase.from("dealer_companies")
        .select("id").eq("company_name", addForm.dealer_name).limit(1).single();
      if (existing) { companyId = existing.id; }
      else {
        const { data: newCo } = await supabase.from("dealer_companies")
          .insert({ company_name: addForm.dealer_name, city: addForm.city || null, state: addForm.state || null })
          .select("id").single();
        companyId = newCo?.id || null;
      }
    }
    const { error } = await supabase.from("dealer_representatives").insert({
      name: addForm.name, whatsapp_number: addForm.whatsapp_number, brand: addForm.brand,
      dealer_company_id: companyId, city: addForm.city || null, state: addForm.state || null,
      role: "sales_executive",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Dealer added!");
    setAddOpen(false);
    setAddForm({ name: "", whatsapp_number: "", dealer_name: "", brand: "", city: "", state: "" });
    qc.invalidateQueries({ queryKey: ["dealer-reps-inquiry"] });
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[180px]">
              <Label className="text-xs mb-1 block">Brand</Label>
              <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v); setSelectedIds([]); applyTemplate(templateType); }}>
                <SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((b: any) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs mb-1 block">State</Label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs mb-1 block">City</Label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Dealer</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Dealer Contact</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Name *</Label><Input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><Label>WhatsApp Number *</Label><Input value={addForm.whatsapp_number} onChange={e => setAddForm(p => ({ ...p, whatsapp_number: e.target.value }))} placeholder="9876543210" /></div>
                    <div><Label>Brand *</Label>
                      <Select value={addForm.brand} onValueChange={v => setAddForm(p => ({ ...p, brand: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger>
                        <SelectContent>{brands.map((b: any) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Dealer Name</Label><Input value={addForm.dealer_name} onChange={e => setAddForm(p => ({ ...p, dealer_name: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>City</Label><Input value={addForm.city} onChange={e => setAddForm(p => ({ ...p, city: e.target.value }))} /></div>
                      <div><Label>State</Label><Input value={addForm.state} onChange={e => setAddForm(p => ({ ...p, state: e.target.value }))} /></div>
                    </div>
                    <Button onClick={handleAddDealer}>Add Dealer</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1"><Upload className="h-4 w-4" /> Bulk Import</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Bulk Import Dealers</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div><Label>Brand *</Label>
                      <Select value={bulkBrand} onValueChange={setBulkBrand}>
                        <SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger>
                        <SelectContent>{brands.map((b: any) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Paste Data (one per line)</Label>
                      <p className="text-xs text-muted-foreground mb-1">Format: Name, WhatsApp, Dealer Name, City, State</p>
                      <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={8}
                        placeholder={"Rajesh Kumar, 9876543210, Arena Delhi, Delhi, Delhi\nSuresh Patil, 9765432100, Nexa Mumbai, Mumbai, Maharashtra"} className="font-mono text-xs" />
                    </div>
                    <Button onClick={handleBulkImport}>Import {bulkText.trim().split("\n").filter(l => l.trim()).length} Dealers</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dealer Table (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Dealers ({reps.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selectedIds.length === whatsappReps.length && whatsappReps.length > 0 ? "Deselect All" : "Select All"}
                </Button>
                <Badge variant="secondary">{selectedIds.length} selected</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">☐</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : reps.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No dealers found. {selectedBrand !== "all" ? `Add dealers for ${selectedBrand}` : "Select a brand and add dealers."}
                    </TableCell></TableRow>
                  ) : reps.map((r: any) => (
                    <TableRow key={r.id} className={`cursor-pointer ${selectedIds.includes(r.id) ? "bg-primary/5" : ""}`}
                      onClick={() => r.whatsapp_number && setSelectedIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])}>
                      <TableCell>
                        {r.whatsapp_number ? (
                          <Checkbox checked={selectedIds.includes(r.id)} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(r.dealer_companies as any)?.company_name || "—"}</TableCell>
                      <TableCell>
                        {r.whatsapp_number ? (
                          <span className="flex items-center gap-1 text-sm"><MessageCircle className="h-3 w-3 text-green-500" />{r.whatsapp_number}</span>
                        ) : <span className="text-xs text-muted-foreground">Not set</span>}
                      </TableCell>
                      <TableCell className="text-sm">{r.city || "—"}</TableCell>
                      <TableCell className="text-sm">{r.state || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Message Composer (1 col) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg"><Send className="h-5 w-5" /> Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Template</Label>
              <Select value={templateType} onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock_inquiry">📦 Stock Inquiry</SelectItem>
                  <SelectItem value="best_deal">🔥 Best Deal Request</SelectItem>
                  <SelectItem value="daily_offer">📢 Daily Offer Update</SelectItem>
                  <SelectItem value="custom">✏️ Custom Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Message</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={10} placeholder="Type your inquiry message..." className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground mt-1">{message.length} chars</p>
            </div>

            <div className="space-y-2">
              <Button className="w-full gap-2" size="lg" onClick={shootAll} disabled={sending || selectedIds.length === 0 || !message.trim()}>
                <Zap className="h-4 w-4" />
                {sending ? "Sending..." : `Shoot All (${selectedIds.length})`}
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={sendOneByOne} disabled={selectedIds.length === 0 || !message.trim()}>
                <Phone className="h-4 w-4" /> Send One-by-One
              </Button>
            </div>

            {selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {selectedIds.length} dealer{selectedIds.length > 1 ? "s" : ""} will receive this message
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
