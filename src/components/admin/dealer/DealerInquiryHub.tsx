import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Send, Users, MessageCircle, Plus, Upload, Phone, Zap, Bot, Car, Palette, History, Loader2 } from "lucide-react";
import { format } from "date-fns";

const TEMPLATES: Record<string, { label: string; icon: string; build: (b: string, m: string, v: string, c: string) => string }> = {
  discount_inquiry: {
    label: "💰 Discount Inquiry",
    icon: "💰",
    build: (b, m, v, c) =>
      `Hi, this is *GrabYourCar* 🚗\n\nWe have a customer interested in *${b} ${m}*${v ? ` — ${v}` : ""}${c ? ` (${c})` : ""}.\n\nPlease share:\n• Best discount available\n• On-road price\n• Exchange bonus\n• Finance offers\n\nUrgent requirement! 🙏`,
  },
  stock_check: {
    label: "📦 Stock Availability",
    icon: "📦",
    build: (b, m, v, c) =>
      `Hi, *GrabYourCar* here.\n\nIs *${b} ${m}*${v ? ` — ${v}` : ""}${c ? ` in ${c} color` : ""} currently available in stock?\n\nPlease confirm:\n• Available: Yes/No\n• Delivery timeline\n• Any waiting period?\n\nThank you 🙏`,
  },
  daily_offer: {
    label: "📢 Daily Offer Update",
    icon: "📢",
    build: (b, m) =>
      `📢 *Daily Offer Update Request*\n\nHi, please share today's offers for *${b}*${m ? ` ${m}` : ""}:\n• Any new discounts?\n• Limited stock alerts?\n• Special offers?\n\n— *GrabYourCar Team*`,
  },
  introduction: {
    label: "🤝 GYC Introduction",
    icon: "🤝",
    build: (b) =>
      `Hi! 👋\n\nI'm from *GrabYourCar* — India's trusted car buying platform.\n\nWe bring verified customers for *${b}* and would love to partner with your dealership.\n\n✅ We send quality leads\n✅ Pan India dealer network\n✅ Best price transparency\n\nLet's connect for a win-win partnership! 🤝\n\n— *GrabYourCar Team*`,
  },
  custom: { label: "✏️ Custom Message", icon: "✏️", build: () => "" },
};

const AI_SCRIPTS = [
  { id: "discount_qualify", label: "Discount Qualification", script: "Ask about: 1) Best discount amount (cash + exchange + corporate) 2) Is this discount negotiable? 3) Any additional accessories free? 4) Delivery timeline 5) Valid till when?" },
  { id: "stock_qualify", label: "Stock & Availability", script: "Ask about: 1) Exact variant and color in stock 2) Manufacturing year of available unit 3) Demo car or fresh stock? 4) Can book and hold for 48 hrs? 5) Any similar alternatives?" },
  { id: "full_qualify", label: "Full Qualification", script: "Ask about: 1) Best on-road price after all discounts 2) Exchange bonus for old car 3) Finance options and rates 4) Free accessories or insurance 5) Delivery timeline 6) Test drive availability" },
  { id: "custom", label: "Custom Script", script: "" },
];

export default function DealerInquiryHub() {
  const qc = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedVariant, setSelectedVariant] = useState("all");
  const [selectedColor, setSelectedColor] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [templateType, setTemplateType] = useState("discount_inquiry");
  const [sending, setSending] = useState(false);
  const [aiFollowup, setAiFollowup] = useState(true);
  const [aiScript, setAiScript] = useState("discount_qualify");
  const [customScript, setCustomScript] = useState("");
  const [followupDelay, setFollowupDelay] = useState(3);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBrand, setBulkBrand] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [sendMode, setSendMode] = useState<"template_then_text" | "template_only" | "text_only">("text_only");
  const [metaTemplate, setMetaTemplate] = useState("grabyourcarintroduction");
  const [addForm, setAddForm] = useState({ name: "", whatsapp_number: "", dealer_name: "", brand: "", city: "", state: "" });

  // Data queries
  const { data: brands = [] } = useQuery({
    queryKey: ["car-brands-inquiry"],
    queryFn: async () => {
      const { data } = await supabase.from("car_brands").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: models = [] } = useQuery({
    queryKey: ["car-models-inquiry", selectedBrand],
    queryFn: async () => {
      if (selectedBrand === "all") return [];
      const { data } = await supabase.from("cars").select("id, name").eq("brand", selectedBrand).order("name");
      return data || [];
    },
    enabled: selectedBrand !== "all",
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["car-variants-inquiry", selectedModel],
    queryFn: async () => {
      if (selectedModel === "all") return [];
      const car = models.find((m: any) => m.name === selectedModel);
      if (!car) return [];
      const { data } = await supabase.from("car_variants").select("id, name, fuel_type, transmission").eq("car_id", car.id).order("name");
      return data || [];
    },
    enabled: selectedModel !== "all" && models.length > 0,
  });

  const { data: colors = [] } = useQuery({
    queryKey: ["car-colors-inquiry", selectedModel],
    queryFn: async () => {
      if (selectedModel === "all") return [];
      const car = models.find((m: any) => m.name === selectedModel);
      if (!car) return [];
      const { data } = await supabase.from("car_colors").select("id, name, hex_code").eq("car_id", car.id).order("sort_order");
      return data || [];
    },
    enabled: selectedModel !== "all" && models.length > 0,
  });

  const { data: reps = [], isLoading } = useQuery({
    queryKey: ["dealer-reps-inquiry", selectedBrand, stateFilter, cityFilter],
    queryFn: async () => {
      let q = supabase.from("dealer_representatives")
        .select("*, dealer_companies(company_name, dealer_type, city, state)")
        .eq("is_active", true).order("name");
      if (selectedBrand !== "all") q = q.eq("brand", selectedBrand);
      if (stateFilter !== "all") q = q.eq("state", stateFilter);
      if (cityFilter !== "all") q = q.eq("city", cityFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["dealer-inquiry-campaigns"],
    queryFn: async () => {
      const { data } = await (supabase.from("dealer_inquiry_campaigns") as any)
        .select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("dealer-inquiry-live-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dealer_inquiry_campaigns" },
        () => qc.invalidateQueries({ queryKey: ["dealer-inquiry-campaigns"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dealer_inquiry_recipients" },
        () => qc.invalidateQueries({ queryKey: ["dealer-inquiry-campaigns"] })
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const states = useMemo(() => [...new Set(reps.map((r: any) => r.state).filter(Boolean))].sort(), [reps]);
  const cities = useMemo(() => [...new Set(reps.map((r: any) => r.city).filter(Boolean))].sort(), [reps]);
  const whatsappReps = reps.filter((r: any) => r.whatsapp_number);

  const brandLabel = selectedBrand !== "all" ? selectedBrand : "[Brand]";
  const modelLabel = selectedModel !== "all" ? selectedModel : "";
  const variantLabel = selectedVariant !== "all" ? selectedVariant : "";
  const colorLabel = selectedColor !== "all" ? selectedColor : "";

  const applyTemplate = (type: string) => {
    setTemplateType(type);
    const tpl = TEMPLATES[type];
    if (tpl) setMessage(tpl.build(brandLabel, modelLabel, variantLabel, colorLabel));
  };

  // Re-apply template when car selection changes
  const updateCarAndTemplate = (setter: (v: string) => void, value: string) => {
    setter(value);
    setTimeout(() => {
      const tpl = TEMPLATES[templateType];
      if (tpl && templateType !== "custom") {
        const b = selectedBrand !== "all" ? selectedBrand : "[Brand]";
        const m = setter === setSelectedModel ? (value !== "all" ? value : "") : modelLabel;
        const v = setter === setSelectedVariant ? (value !== "all" ? value : "") : variantLabel;
        const c = setter === setSelectedColor ? (value !== "all" ? value : "") : colorLabel;
        setMessage(tpl.build(b, m, v, c));
      }
    }, 0);
  };

  const toggleAll = () => {
    if (selectedIds.length === whatsappReps.length) setSelectedIds([]);
    else setSelectedIds(whatsappReps.map((r: any) => r.id));
  };

  // SHOOT ALL — bulk send + schedule AI follow-up
  const shootAll = async () => {
    if (selectedIds.length === 0) { toast.error("Select at least one dealer"); return; }
    if (sendMode !== "template_only" && !message.trim()) { toast.error("Write a message first"); return; }
    if (!metaTemplate && sendMode !== "text_only") { toast.error("Select a Meta template"); return; }
    setSending(true);
    try {
      const selectedReps = reps.filter((r: any) => selectedIds.includes(r.id) && r.whatsapp_number);
      const phones = selectedReps.map((r: any) => r.whatsapp_number);

      const { data, error } = await supabase.functions.invoke("dealer-inquiry-broadcast", {
        body: {
          phones,
          message: sendMode !== "template_only" ? message : "",
          brand: selectedBrand !== "all" ? selectedBrand : "All",
          model: selectedModel !== "all" ? selectedModel : null,
          variant: selectedVariant !== "all" ? selectedVariant : null,
          color: selectedColor !== "all" ? selectedColor : null,
          ai_followup_enabled: aiFollowup,
          ai_followup_script: aiScript === "custom" ? customScript : AI_SCRIPTS.find(s => s.id === aiScript)?.script || "",
          ai_followup_delay_minutes: followupDelay,
          template_name: sendMode !== "text_only" ? metaTemplate : null,
          template_variables: [],
          send_mode: sendMode,
          recipients: selectedReps.map((r: any) => ({
            dealer_rep_id: r.id,
            rep_name: r.name,
            dealer_name: (r.dealer_companies as any)?.company_name || "",
            phone: r.whatsapp_number,
          })),
        },
      });
      if (error) throw error;

      const sentCount = data?.summary?.sent || 0;
      const failedCount = data?.summary?.failed || 0;
      const modeLabel = sendMode === "template_only"
        ? "Template"
        : sendMode === "text_only"
          ? "Auto Send"
          : "Template + Text";

      if (sentCount > 0) {
        toast.success(`✅ Submitted to Meta for ${sentCount} / ${phones.length} dealers via ${modeLabel}`);
        if (data?.followup_scheduled) {
          toast.info(`🤖 AI follow-up will wait for delivery confirmation`);
        }
        setSelectedIds([]);
      } else {
        toast.error("Message not sent to any dealer");
      }

      if (failedCount > 0) toast.warning(`⚠️ ${failedCount} failed`);
      qc.invalidateQueries({ queryKey: ["dealer-inquiry-campaigns"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const sendOneByOne = async () => {
    if (selectedIds.length === 0) { toast.error("Select at least one dealer"); return; }
    if (!message.trim()) { toast.error("Write a message first"); return; }
    const selectedReps = reps.filter((r: any) => selectedIds.includes(r.id) && r.whatsapp_number);
    const { sendWhatsAppBulk } = await import("@/lib/sendWhatsApp");
    await sendWhatsAppBulk(selectedReps.map((r: any) => ({ phone: r.whatsapp_number, message, name: r.name })));
  };

  // Bulk import
  const handleBulkImport = async () => {
    if (!bulkBrand) { toast.error("Select brand"); return; }
    const lines = bulkText.trim().split("\n").filter(l => l.trim());
    if (lines.length === 0) { toast.error("Paste data first"); return; }
    const rows: any[] = [];
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(s => s.trim());
      if (parts.length < 2) continue;
      const [name, whatsapp_number, dealer_name, city, state] = parts;
      let companyId: string | null = null;
      if (dealer_name) {
        const { data: existing } = await supabase.from("dealer_companies").select("id").eq("company_name", dealer_name).limit(1).single();
        if (existing) companyId = existing.id;
        else {
          const { data: newCo } = await supabase.from("dealer_companies").insert({ company_name: dealer_name, city: city || null, state: state || null }).select("id").single();
          companyId = newCo?.id || null;
        }
      }
      rows.push({ name: name || "Unknown", whatsapp_number, brand: bulkBrand, dealer_company_id: companyId, city: city || null, state: state || null, role: "sales_executive" });
    }
    const { error } = await supabase.from("dealer_representatives").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`✅ Imported ${rows.length} dealers for ${bulkBrand}`);
    setBulkOpen(false); setBulkText("");
    qc.invalidateQueries({ queryKey: ["dealer-reps-inquiry"] });
  };

  const handleAddDealer = async () => {
    if (!addForm.name || !addForm.whatsapp_number || !addForm.brand) { toast.error("Name, WhatsApp & Brand required"); return; }
    let companyId: string | null = null;
    if (addForm.dealer_name) {
      const { data: existing } = await supabase.from("dealer_companies").select("id").eq("company_name", addForm.dealer_name).limit(1).single();
      if (existing) companyId = existing.id;
      else {
        const { data: newCo } = await supabase.from("dealer_companies").insert({ company_name: addForm.dealer_name, city: addForm.city || null, state: addForm.state || null }).select("id").single();
        companyId = newCo?.id || null;
      }
    }
    const { error } = await supabase.from("dealer_representatives").insert({
      name: addForm.name, whatsapp_number: addForm.whatsapp_number, brand: addForm.brand,
      dealer_company_id: companyId, city: addForm.city || null, state: addForm.state || null, role: "sales_executive",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("✅ Dealer added!");
    setAddOpen(false); setAddForm({ name: "", whatsapp_number: "", dealer_name: "", brand: "", city: "", state: "" });
    qc.invalidateQueries({ queryKey: ["dealer-reps-inquiry"] });
  };

  return (
    <Tabs defaultValue="inquiry" className="space-y-4">
      <TabsList>
        <TabsTrigger value="inquiry" className="gap-1"><Car className="h-4 w-4" /> Smart Inquiry</TabsTrigger>
        <TabsTrigger value="history" className="gap-1"><History className="h-4 w-4" /> Campaign History</TabsTrigger>
      </TabsList>

      <TabsContent value="inquiry" className="space-y-4">
        {/* Car Selection Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[160px]">
                <Label className="text-xs mb-1 block">Brand *</Label>
                <Select value={selectedBrand} onValueChange={v => { setSelectedBrand(v); setSelectedModel("all"); setSelectedVariant("all"); setSelectedColor("all"); setSelectedIds([]); applyTemplate(templateType); }}>
                  <SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map((b: any) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <Label className="text-xs mb-1 block flex items-center gap-1"><Car className="h-3 w-3" /> Model</Label>
                <Select value={selectedModel} onValueChange={v => { updateCarAndTemplate(setSelectedModel, v); setSelectedVariant("all"); setSelectedColor("all"); }} disabled={selectedBrand === "all"}>
                  <SelectTrigger><SelectValue placeholder="Select Model" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {models.map((m: any) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[180px]">
                <Label className="text-xs mb-1 block">Variant</Label>
                <Select value={selectedVariant} onValueChange={v => updateCarAndTemplate(setSelectedVariant, v)} disabled={selectedModel === "all"}>
                  <SelectTrigger><SelectValue placeholder="Select Variant" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Variants</SelectItem>
                    {variants.map((v: any) => <SelectItem key={v.id} value={v.name}>{v.name} ({v.fuel_type}/{v.transmission})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px]">
                <Label className="text-xs mb-1 block flex items-center gap-1"><Palette className="h-3 w-3" /> Color</Label>
                <Select value={selectedColor} onValueChange={v => updateCarAndTemplate(setSelectedColor, v)} disabled={selectedModel === "all"}>
                  <SelectTrigger><SelectValue placeholder="Color" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Color</SelectItem>
                    {colors.map((c: any) => (
                      <SelectItem key={c.id} value={c.name}>
                        <div className="flex items-center gap-2">
                          {c.hex_code && <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.hex_code }} />}
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location filters */}
            <div className="flex flex-wrap gap-3 items-end mt-3">
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
                  <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Dealer</Button></DialogTrigger>
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
                  <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Upload className="h-4 w-4" /> Bulk Import</Button></DialogTrigger>
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
                        <p className="text-xs text-muted-foreground mb-1">Format: Name, WhatsApp, Dealer, City, State</p>
                        <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={8}
                          placeholder={"Rajesh, 9876543210, Arena Delhi, Delhi, Delhi\nSuresh, 9765432100, Nexa Mumbai, Mumbai, MH"} className="font-mono text-xs" />
                      </div>
                      <Button onClick={handleBulkImport}>Import {bulkText.trim().split("\n").filter(l => l.trim()).length} Dealers</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Dealer Table */}
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : reps.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No dealers found. {selectedBrand !== "all" ? `Add dealers for ${selectedBrand}` : "Select a brand first."}
                      </TableCell></TableRow>
                    ) : reps.map((r: any) => (
                      <TableRow key={r.id} className={`cursor-pointer ${selectedIds.includes(r.id) ? "bg-primary/5" : ""}`}
                        onClick={() => r.whatsapp_number && setSelectedIds(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])}>
                        <TableCell>
                          {r.whatsapp_number ? <Checkbox checked={selectedIds.includes(r.id)} /> : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{r.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{(r.dealer_companies as any)?.company_name || "—"}</TableCell>
                        <TableCell>
                          {r.whatsapp_number ? (
                            <span className="flex items-center gap-1 text-sm"><MessageCircle className="h-3 w-3 text-green-500" />{r.whatsapp_number}</span>
                          ) : <span className="text-xs text-muted-foreground">N/A</span>}
                        </TableCell>
                        <TableCell className="text-sm">{r.city || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Message Composer + AI Follow-up */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg"><Send className="h-5 w-5" /> Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Send Mode */}
                <div>
                  <Label className="text-xs font-semibold">Send Mode</Label>
                  <Select value={sendMode} onValueChange={(v: any) => setSendMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="text_only">⚡ Auto Send (template if needed)</SelectItem>
                      <SelectItem value="template_then_text">📋 Template + Text</SelectItem>
                      <SelectItem value="template_only">📋 Template Only</SelectItem>
                    </SelectContent>
                  </Select>
                  {sendMode === "text_only" && (
                    <p className="text-xs text-green-600 mt-1">✅ Sends direct text inside active chat, otherwise auto-opens with an approved template first</p>
                  )}
                  {sendMode === "template_then_text" && (
                    <p className="text-xs text-muted-foreground mt-1">⚠️ Template requires exact Meta format match (video header etc.)</p>
                  )}
                </div>

                {/* Meta Template */}
                {sendMode !== "text_only" && (
                  <div>
                    <Label className="text-xs">Meta Approved Template *</Label>
                    <Select value={metaTemplate} onValueChange={setMetaTemplate}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grabyourcarintroduction">🤝 GrabYourCar Introduction</SelectItem>
                        <SelectItem value="insurancefollowup">🛡️ Insurance Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Smart Template */}
                {sendMode !== "template_only" && (
                  <div>
                    <Label className="text-xs">Smart Template</Label>
                    <Select value={templateType} onValueChange={applyTemplate}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TEMPLATES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Message */}
                {sendMode !== "template_only" && (
                  <div>
                    <Label className="text-xs">Detailed Message</Label>
                    <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} placeholder="Select template or write custom..." className="font-mono text-xs" />
                    <p className="text-xs text-muted-foreground mt-1">{message.length} chars</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Button className="w-full gap-2" size="lg" onClick={shootAll} disabled={sending || selectedIds.length === 0 || (sendMode !== "template_only" && !message.trim())}>
                    <Zap className="h-4 w-4" />
                    {sending ? "Sending..." : `🚀 Shoot All (${selectedIds.length})`}
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={sendOneByOne} disabled={selectedIds.length === 0 || !message.trim()}>
                    <Phone className="h-4 w-4" /> Send One-by-One
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Follow-up Card */}
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm"><Bot className="h-4 w-4 text-blue-600" /> AI Auto Follow-up</CardTitle>
                  <Switch checked={aiFollowup} onCheckedChange={setAiFollowup} />
                </div>
              </CardHeader>
              {aiFollowup && (
                <CardContent className="space-y-3 pt-0">
                  <div>
                    <Label className="text-xs">Follow-up Delay</Label>
                    <Select value={String(followupDelay)} onValueChange={v => setFollowupDelay(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 minutes</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">AI Script</Label>
                    <Select value={aiScript} onValueChange={setAiScript}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AI_SCRIPTS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {aiScript === "custom" ? (
                    <Textarea value={customScript} onChange={e => setCustomScript(e.target.value)} rows={4}
                      placeholder="Write your AI follow-up questions..." className="text-xs" />
                  ) : (
                    <p className="text-xs text-muted-foreground bg-white p-2 rounded border">
                      {AI_SCRIPTS.find(s => s.id === aiScript)?.script}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* Campaign History Tab */}
      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Replied</TableHead>
                  <TableHead>AI Follow-up</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No campaigns yet. Send your first inquiry above!</TableCell></TableRow>
                ) : campaigns.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{format(new Date(c.created_at), "dd MMM, hh:mm a")}</TableCell>
                    <TableCell className="font-medium text-sm">{c.campaign_name}</TableCell>
                    <TableCell className="text-sm">
                      {[c.brand, c.model, c.variant].filter(Boolean).join(" › ") || "All"}
                      {c.color && <span className="text-muted-foreground"> ({c.color})</span>}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{c.sent_count}/{c.total_dealers}</Badge></TableCell>
                    <TableCell><Badge variant={c.replied_count > 0 ? "default" : "outline"}>{c.replied_count}</Badge></TableCell>
                    <TableCell>
                      {c.ai_followup_enabled ? (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">🤖 Active</Badge>
                      ) : <span className="text-xs text-muted-foreground">Off</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "completed" ? "default" : c.status === "sending" ? "secondary" : "outline"} className="text-xs capitalize">
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
