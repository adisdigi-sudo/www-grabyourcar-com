import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Package, Sparkles, Loader2, Search, Share2, Trash2, Car, IndianRupee, Inbox, Users, Megaphone } from "lucide-react";
import { format } from "date-fns";

const STOCK_REQUEST_TEMPLATE = `Hi {rep_name} 👋

*GrabYourCar* — Daily Ready Stock Update Request 📦

Please share your *currently available* car stock with:
• Brand, Model, Variant, Color
• Year & Fuel/Transmission
• On-road price + best discount
• Quantity available
• Any special offers

Reply in this format (multiple cars OK):
\`\`\`
Brand Model Variant
Color | Year | Fuel | ₹On-road
Discount: ₹...
Qty: ...
\`\`\`

We'll match it instantly with our ready buyers 🚗💨

— *GrabYourCar Team*`;

export default function DealerStockHub() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("send");

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]); // empty = all
  const [filterCity, setFilterCity] = useState("");
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  const [stockMessage, setStockMessage] = useState(STOCK_REQUEST_TEMPLATE);
  const [metaTemplate, setMetaTemplate] = useState<string>("");
  const [customTemplate, setCustomTemplate] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ phone: string; ok: boolean; error?: string }[]>([]);

  const { data: reps = [] } = useQuery<any[]>({
    queryKey: ["dealer-reps-stock"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dealer_representatives")
        .select("id, name, brand, city, state, whatsapp_number, dealer_companies(company_name, city)")
        .eq("is_active", true)
        .not("whatsapp_number", "is", null)
        .order("brand");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["wa-templates-stock"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("whatsapp_templates")
        .select("name, content, category, approval_status, is_approved, is_active")
        .or("approval_status.eq.approved,is_approved.eq.true")
        .order("name");
      if (error) {
        console.error("[StockHub] templates load error:", error);
        return [];
      }
      return ((data as any[]) || [])
        .filter((t: any) => t.is_active !== false)
        .filter((t: any) => !/booking|policy|loan|invoice|otp|payment|feedback/i.test([t.name, t.category, t.content].filter(Boolean).join(" ")));
    },
  });

  const filteredReps = useMemo(() => {
    return reps.filter((r: any) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(r.brand)) return false;
      if (filterCity.trim()) {
        const city = (r.city || r.dealer_companies?.city || "").toLowerCase();
        if (!city.includes(filterCity.toLowerCase())) return false;
      }
      return true;
    });
  }, [reps, selectedBrands, filterCity]);

  const brands = useMemo(() => Array.from(new Set(reps.map((r: any) => r.brand).filter(Boolean))).sort(), [reps]);

  const toggleAll = () => {
    if (selectedReps.length === filteredReps.length) setSelectedReps([]);
    else setSelectedReps(filteredReps.map((r: any) => r.id));
  };

  const sendStockRequest = async () => {
    if (selectedReps.length === 0) return toast.error("Select at least one dealer");
    const tmpl = (customTemplate || metaTemplate || "").trim();
    if (!tmpl) return toast.error("Select an approved Meta template (or type a custom template name)");
    setSending(true);
    setSendProgress([]);
    try {
      const chosen = reps.filter((r: any) => selectedReps.includes(r.id));
      const brandLabel = selectedBrands.length > 0 ? selectedBrands.join(", ") : "All";
      const { data, error } = await supabase.functions.invoke("dealer-inquiry-broadcast", {
        body: {
          phones: chosen.map((r: any) => r.whatsapp_number),
          message: stockMessage,
          brand: brandLabel,
          model: null, variant: null, color: null,
          template_name: tmpl,
          template_variables: [],
          send_mode: "template_then_text",
          ai_followup_enabled: false,
          recipients: chosen.map((r: any) => ({
            dealer_rep_id: r.id,
            rep_name: r.name,
            dealer_name: r.dealer_companies?.company_name || "",
            phone: r.whatsapp_number,
          })),
        },
      });
      if (error) throw error;
      const sent = data?.summary?.sent || 0;
      const failed = data?.summary?.failed || 0;
      const results: any[] = data?.results || [];
      setSendProgress(
        results.map((x: any) => ({ phone: x.phone || x.to || "—", ok: !!x.success || x.status === "sent", error: x.error || x.message }))
      );
      if (sent > 0) toast.success(`✅ Sent to ${sent} / ${chosen.length} dealers${failed ? ` • ${failed} failed` : ""}`);
      else toast.error(`❌ All ${chosen.length} sends failed — check template name & dealer numbers`);
      setSelectedReps([]);
      qc.invalidateQueries({ queryKey: ["dealer-stock-replies"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  // 📥 Pull recent INBOUND messages from any phone that matches a dealer rep.
  // (Previously this read from dealer_chat_history which is unused — bug.)
  const { data: replies = [], isLoading: repliesLoading } = useQuery<any[]>({
    queryKey: ["dealer-stock-replies", reps.length],
    enabled: reps.length > 0,
    queryFn: async () => {
      // Build a phone → rep map (last 10 digits is the canonical key)
      const phoneToRep = new Map<string, any>();
      for (const r of reps as any[]) {
        const k = String(r.whatsapp_number || "").replace(/\D/g, "").slice(-10);
        if (k) phoneToRep.set(k, r);
      }
      if (phoneToRep.size === 0) return [];

      // 1) Get all conversations whose phone matches a dealer rep
      const { data: convos } = await (supabase as any)
        .from("wa_conversations")
        .select("id, phone, customer_name")
        .order("last_message_at", { ascending: false })
        .limit(500);
      const dealerConvos = (convos || []).filter((c: any) => phoneToRep.has(String(c.phone || "").slice(-10)));
      if (dealerConvos.length === 0) return [];

      const convoIds = dealerConvos.map((c: any) => c.id);
      const convoById = new Map(dealerConvos.map((c: any) => [c.id, c]));

      // 2) Get latest 80 inbound text messages from those conversations
      const { data: msgs } = await (supabase as any)
        .from("wa_inbox_messages")
        .select("id, conversation_id, content, created_at, message_type")
        .in("conversation_id", convoIds)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(80);

      return ((msgs || []) as any[])
        .filter((m: any) => (m.content || "").trim().length > 0)
        .map((m: any) => {
          const convo = convoById.get(m.conversation_id) as any;
          const rep = phoneToRep.get(String(convo?.phone || "").slice(-10));
          return {
            id: m.id,
            message: m.content,
            sender_name: rep?.name || convo?.customer_name || convo?.phone,
            sender_phone: convo?.phone,
            created_at: m.created_at,
            dealer_rep_id: rep?.id || null,
            dealer_representatives: rep ? { id: rep.id, name: rep.name, brand: rep.brand } : null,
          };
        });
    },
  });

  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [previewCars, setPreviewCars] = useState<any[] | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ rep_id?: string; brand?: string; message: string } | null>(null);

  const extractReply = async (reply: any, autoSave: boolean) => {
    setExtractingId(reply.id);
    try {
      const { data, error } = await supabase.functions.invoke("dealer-stock-extractor", {
        body: {
          message: reply.message,
          dealer_rep_id: reply.dealer_rep_id,
          default_brand: reply.dealer_representatives?.brand,
          auto_save: autoSave,
        },
      });
      if (error) throw error;
      if (autoSave) {
        toast.success(`✅ Saved ${data?.saved || 0} cars to stock`);
        qc.invalidateQueries({ queryKey: ["dealer-inventory-live"] });
      } else {
        setPreviewCars(data?.cars || []);
        setPreviewMeta({
          rep_id: reply.dealer_rep_id,
          brand: reply.dealer_representatives?.brand,
          message: reply.message,
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Extract failed");
    } finally {
      setExtractingId(null);
    }
  };

  const savePreview = async () => {
    if (!previewCars || !previewMeta) return;
    try {
      const rows = previewCars.map((c: any) => ({
        dealer_rep_id: previewMeta.rep_id || null,
        brand: c.brand || previewMeta.brand || "Unknown",
        model: c.model || null,
        car_name: `${c.brand || previewMeta.brand || ""} ${c.model || ""}`.trim() || "Unknown Car",
        variant: c.variant || null,
        color: c.color || null,
        fuel_type: c.fuel_type || null,
        transmission: c.transmission || null,
        manufacturing_year: c.manufacturing_year || null,
        year: c.manufacturing_year || null,
        ex_showroom_price: c.ex_showroom_price || null,
        on_road_price: c.on_road_price || null,
        discount: c.discount || null,
        quantity: c.quantity || 1,
        stock_status: c.stock_status || "available",
        notes: c.notes || null,
        source_message: previewMeta.message,
        source_date: new Date().toISOString(),
        is_active: true,
      }));
      const { error } = await (supabase as any).from("dealer_inventory").insert(rows);
      if (error) throw error;
      toast.success(`✅ Saved ${rows.length} cars`);
      setPreviewCars(null); setPreviewMeta(null);
      qc.invalidateQueries({ queryKey: ["dealer-inventory-live"] });
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  const [stockSearch, setStockSearch] = useState("");
  const [stockBrand, setStockBrand] = useState("all");

  const { data: stock = [], isLoading: stockLoading } = useQuery<any[]>({
    queryKey: ["dealer-inventory-live"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dealer_inventory")
        .select("*, dealer_representatives(name, phone, whatsapp_number, dealer_companies(company_name, city))")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const stockBrands = useMemo(() => Array.from(new Set(stock.map((s: any) => s.brand).filter(Boolean))).sort(), [stock]);
  const filteredStock = useMemo(() => {
    return stock.filter((s: any) => {
      if (stockBrand !== "all" && s.brand !== stockBrand) return false;
      if (stockSearch.trim()) {
        const q = stockSearch.toLowerCase();
        const hay = `${s.brand} ${s.model} ${s.variant} ${s.color} ${s.dealer_representatives?.dealer_companies?.company_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [stock, stockSearch, stockBrand]);

  const deleteStock = async (id: string) => {
    if (!confirm("Delete this stock entry?")) return;
    const { error } = await (supabase as any).from("dealer_inventory").update({ is_active: false }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["dealer-inventory-live"] });
  };

  const shareToCustomer = (s: any) => {
    const dealer = s.dealer_representatives?.dealer_companies?.company_name || "Dealer";
    const city = s.dealer_representatives?.dealer_companies?.city || "";
    const lines = [
      `🚗 *${s.brand} ${s.model || ""}*${s.variant ? ` ${s.variant}` : ""}`,
      s.color && `🎨 Color: ${s.color}`,
      s.manufacturing_year && `📅 Year: ${s.manufacturing_year}`,
      s.fuel_type && `⛽ Fuel: ${s.fuel_type}`,
      s.transmission && `⚙️ Transmission: ${s.transmission}`,
      s.on_road_price && `💰 On-road: ₹${Number(s.on_road_price).toLocaleString("en-IN")}`,
      s.ex_showroom_price && `🏷️ Ex-showroom: ₹${Number(s.ex_showroom_price).toLocaleString("en-IN")}`,
      s.discount && `🎁 Discount: ${s.discount}`,
      s.quantity && `📦 Qty: ${s.quantity}`,
      ``,
      `📍 ${dealer}${city ? `, ${city}` : ""}`,
      ``,
      `— GrabYourCar`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("📋 Copied! Paste in customer chat");
  };

  // ════════════════════════════════════════════════════════════════
  // 📤 BROADCAST STOCK TO CUSTOMERS — pick stock cars + pick leads
  // ════════════════════════════════════════════════════════════════
  const [bcastSearch, setBcastSearch] = useState("");
  const [bcastSelectedStockIds, setBcastSelectedStockIds] = useState<string[]>([]);
  const [bcastLeadSearch, setBcastLeadSearch] = useState("");
  const [bcastSelectedLeadIds, setBcastSelectedLeadIds] = useState<string[]>([]);
  const [bcastTemplate, setBcastTemplate] = useState<string>("");
  const [bcastSending, setBcastSending] = useState(false);
  const [bcastOnlyMatching, setBcastOnlyMatching] = useState(true);

  const bcastFilteredStock = useMemo(() => {
    return stock.filter((s: any) => {
      if (s.stock_status && s.stock_status !== "available" && s.stock_status !== "limited") return false;
      if (!bcastSearch.trim()) return true;
      const q = bcastSearch.toLowerCase();
      const hay = `${s.brand} ${s.model} ${s.variant} ${s.color}`.toLowerCase();
      return hay.includes(q);
    });
  }, [stock, bcastSearch]);

  // Pull leads — if "Only matching" is on, narrow to leads whose car_brand/car_model
  // matches at least one selected stock car.
  const { data: allLeads = [] } = useQuery<any[]>({
    queryKey: ["leads-for-stock-broadcast"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("leads")
        .select("id, customer_name, name, phone, car_brand, car_model, status, created_at")
        .not("phone", "is", null)
        .order("created_at", { ascending: false })
        .limit(1000);
      return (data as any[]) || [];
    },
  });

  const bcastFilteredLeads = useMemo(() => {
    let list = allLeads as any[];
    if (bcastOnlyMatching && bcastSelectedStockIds.length > 0) {
      const selectedCars = stock.filter((s: any) => bcastSelectedStockIds.includes(s.id));
      const targetBrands = new Set(selectedCars.map((s: any) => (s.brand || "").toLowerCase()).filter(Boolean));
      const targetModels = new Set(selectedCars.map((s: any) => (s.model || "").toLowerCase()).filter(Boolean));
      list = list.filter((l: any) => {
        const lb = (l.car_brand || "").toLowerCase();
        const lm = (l.car_model || "").toLowerCase();
        if (lb && targetBrands.has(lb)) return true;
        if (lm && targetModels.size && Array.from(targetModels).some((m) => lm.includes(m as string) || (m as string).includes(lm))) return true;
        return false;
      });
    }
    if (bcastLeadSearch.trim()) {
      const q = bcastLeadSearch.toLowerCase();
      list = list.filter((l: any) =>
        `${l.customer_name || l.name || ""} ${l.phone} ${l.car_brand || ""} ${l.car_model || ""}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allLeads, bcastOnlyMatching, bcastSelectedStockIds, stock, bcastLeadSearch]);

  const buildStockBroadcastBody = () => {
    const cars = stock.filter((s: any) => bcastSelectedStockIds.includes(s.id));
    if (cars.length === 0) return "";
    const cards = cars.map((s: any) => {
      const dealer = s.dealer_representatives?.dealer_companies?.company_name || "Authorised Dealer";
      const city = s.dealer_representatives?.dealer_companies?.city || "";
      return [
        `🚗 *${s.brand} ${s.model || ""}*${s.variant ? ` ${s.variant}` : ""}`,
        s.color && `🎨 ${s.color}`,
        s.manufacturing_year && `📅 ${s.manufacturing_year}`,
        s.fuel_type && `⛽ ${s.fuel_type}${s.transmission ? ` / ${s.transmission}` : ""}`,
        s.on_road_price && `💰 On-road: ₹${Number(s.on_road_price).toLocaleString("en-IN")}`,
        s.discount && `🎁 ${s.discount}`,
        s.quantity && `📦 Qty: ${s.quantity}`,
        `📍 ${dealer}${city ? `, ${city}` : ""}`,
      ].filter(Boolean).join("\n");
    }).join("\n\n———\n\n");
    return `Hi 👋\n\n*Ready Stock Available* 🚘\n\n${cards}\n\nReply *YES* to book a test drive or get the best price.\n\n— *GrabYourCar*`;
  };

  const sendStockToCustomers = async () => {
    if (bcastSelectedStockIds.length === 0) return toast.error("Pick at least one car from stock");
    if (bcastSelectedLeadIds.length === 0) return toast.error("Select customers to send to");
    if (!bcastTemplate) return toast.error("Pick an approved Meta template");
    setBcastSending(true);
    try {
      const chosen = (allLeads as any[]).filter((l: any) => bcastSelectedLeadIds.includes(l.id));
      const body = buildStockBroadcastBody();
      const { data, error } = await supabase.functions.invoke("dealer-inquiry-broadcast", {
        body: {
          phones: chosen.map((l: any) => l.phone),
          message: body,
          brand: "Stock Update",
          model: null, variant: null, color: null,
          template_name: bcastTemplate,
          template_variables: [],
          send_mode: "template_then_text",
          ai_followup_enabled: false,
          recipients: chosen.map((l: any) => ({
            dealer_rep_id: null,
            rep_name: l.customer_name || l.name || "Customer",
            dealer_name: "Customer",
            phone: l.phone,
          })),
        },
      });
      if (error) throw error;
      const sent = data?.summary?.sent || 0;
      toast.success(`✅ Stock sent to ${sent} / ${chosen.length} customers`);
      setBcastSelectedLeadIds([]);
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    } finally {
      setBcastSending(false);
    }
  };

  const toggleAllBcastLeads = () => {
    if (bcastSelectedLeadIds.length === bcastFilteredLeads.length) setBcastSelectedLeadIds([]);
    else setBcastSelectedLeadIds(bcastFilteredLeads.map((l: any) => l.id));
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="send" className="gap-1"><Send className="h-4 w-4" /> Ask Dealers</TabsTrigger>
          <TabsTrigger value="extract" className="gap-1"><Sparkles className="h-4 w-4" /> Auto-Extract Replies</TabsTrigger>
          <TabsTrigger value="live" className="gap-1"><Package className="h-4 w-4" /> Live Stock ({stock.length})</TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1"><Megaphone className="h-4 w-4" /> Send to Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Send className="h-5 w-5" /> Bulk Stock Request to Dealers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Filter by Brand (multi-select)</Label>
                    <div className="flex gap-2 text-[11px]">
                      <button type="button" className="text-primary hover:underline" onClick={() => setSelectedBrands(brands as string[])}>
                        Select all ({brands.length})
                      </button>
                      <button type="button" className="text-muted-foreground hover:underline" onClick={() => setSelectedBrands([])}>
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="border rounded-md p-2 max-h-32 overflow-auto flex flex-wrap gap-1.5 bg-background">
                    {brands.length === 0 && <span className="text-xs text-muted-foreground">No brands</span>}
                    {brands.map((b: any) => {
                      const active = selectedBrands.includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() =>
                            setSelectedBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))
                          }
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 hover:bg-muted border-border"
                          }`}
                        >
                          {b}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {selectedBrands.length === 0 ? `Showing all ${reps.length} reps` : `${selectedBrands.length} brand(s) selected`}
                  </p>
                </div>
                <div>
                  <Label>Filter by City</Label>
                  <Input placeholder="e.g. Mumbai" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Meta Template (approved)</Label>
                  <Select value={metaTemplate} onValueChange={(v) => { setMetaTemplate(v); setCustomTemplate(""); }}>
                    <SelectTrigger><SelectValue placeholder={templates.length ? `Select approved template (${templates.length})` : "Loading templates..."} /></SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">No approved templates found</div>
                      )}
                      {templates.map((t: any) => (
                        <SelectItem key={t.name} value={t.name}>
                          {t.name} {t.category ? <span className="text-muted-foreground text-[10px] ml-1">· {t.category}</span> : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Or Custom Template Name</Label>
                  <Input
                    placeholder="e.g. dealer_stock_request_v2"
                    value={customTemplate}
                    onChange={(e) => { setCustomTemplate(e.target.value); if (e.target.value) setMetaTemplate(""); }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Use this if your template isn't in the dropdown yet (must already be approved on Meta).</p>
                </div>
              </div>

              <div>
                <Label>Stock Request Message</Label>
                <Textarea rows={10} value={stockMessage} onChange={(e) => setStockMessage(e.target.value)} className="font-mono text-xs" />
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={selectedReps.length === filteredReps.length && filteredReps.length > 0} onCheckedChange={toggleAll} />
                  <span className="text-sm"><strong>{selectedReps.length}</strong> / {filteredReps.length} selected</span>
                </div>
                <Button onClick={sendStockRequest} disabled={sending || selectedReps.length === 0} size="lg" className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? "Sending..." : `Send to ${selectedReps.length} Dealers`}
                </Button>
              </div>

              {sendProgress.length > 0 && (
                <div className="border rounded-md bg-muted/30 p-2 max-h-40 overflow-auto">
                  <div className="text-xs font-semibold mb-1">
                    Send Result · ✅ {sendProgress.filter((x) => x.ok).length} sent · ❌ {sendProgress.filter((x) => !x.ok).length} failed
                  </div>
                  <div className="space-y-0.5">
                    {sendProgress.map((p, i) => (
                      <div key={i} className="text-[11px] font-mono flex items-center gap-2">
                        <span className={p.ok ? "text-green-600" : "text-red-600"}>{p.ok ? "✓" : "✗"}</span>
                        <span>{p.phone}</span>
                        {!p.ok && p.error && <span className="text-muted-foreground truncate">— {p.error}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border rounded-md max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Rep</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>WhatsApp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReps.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedReps.includes(r.id)}
                            onCheckedChange={(v) => {
                              if (v) setSelectedReps([...selectedReps, r.id]);
                              else setSelectedReps(selectedReps.filter((x) => x !== r.id));
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell><Badge variant="outline">{r.brand}</Badge></TableCell>
                        <TableCell className="text-xs">{r.dealer_companies?.company_name || "—"}</TableCell>
                        <TableCell className="text-xs">{r.city || r.dealer_companies?.city || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{r.whatsapp_number}</TableCell>
                      </TableRow>
                    ))}
                    {filteredReps.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No dealers match filters</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extract" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5" /> AI Auto-Extract from Dealer Replies</CardTitle>
              <p className="text-xs text-muted-foreground">Click <strong>Save Stock</strong> to instantly parse cars into your inventory.</p>
            </CardHeader>
            <CardContent>
              {repliesLoading ? <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div> : (
                <div className="space-y-3 max-h-[600px] overflow-auto">
                  {replies.map((r: any) => (
                    <div key={r.id} className="border rounded-md p-3 bg-muted/30">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-xs">
                          <strong>{r.dealer_representatives?.name || r.sender_name || r.sender_phone}</strong>
                          {r.dealer_representatives?.brand && <Badge variant="outline" className="ml-2 text-[10px]">{r.dealer_representatives.brand}</Badge>}
                          <span className="text-muted-foreground ml-2">{format(new Date(r.created_at), "dd MMM HH:mm")}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled={extractingId === r.id} onClick={() => extractReply(r, false)}>
                            {extractingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Preview"}
                          </Button>
                          <Button size="sm" disabled={extractingId === r.id} onClick={() => extractReply(r, true)} className="gap-1">
                            <Sparkles className="h-3 w-3" /> Save Stock
                          </Button>
                        </div>
                      </div>
                      <pre className="whitespace-pre-wrap text-xs font-mono bg-background p-2 rounded border max-h-32 overflow-auto">{r.message}</pre>
                    </div>
                  ))}
                  {replies.length === 0 && <div className="text-center py-8 text-muted-foreground"><Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />No replies yet</div>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5" /> Live Dealer Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search brand, model, variant, dealer..." className="pl-8" value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} />
                  </div>
                </div>
                <Select value={stockBrand} onValueChange={setStockBrand}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {stockBrands.map((b: any) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {stockLoading ? <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div> : (
                <div className="border rounded-md overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Car</TableHead>
                        <TableHead>Variant / Color</TableHead>
                        <TableHead>Year / Fuel</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Dealer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStock.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2"><Car className="h-4 w-4 text-muted-foreground" />{s.brand} {s.model}</div>
                          </TableCell>
                          <TableCell className="text-xs">{s.variant || "—"}<br /><span className="text-muted-foreground">{s.color || ""}</span></TableCell>
                          <TableCell className="text-xs">{s.manufacturing_year || s.year || "—"}<br /><span className="text-muted-foreground">{s.fuel_type || ""}</span></TableCell>
                          <TableCell className="text-xs">
                            {s.on_road_price ? <div className="flex items-center"><IndianRupee className="h-3 w-3" />{Number(s.on_road_price).toLocaleString("en-IN")}</div> : "—"}
                          </TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{s.discount || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {s.dealer_representatives?.dealer_companies?.company_name || "—"}
                            <br /><span className="text-muted-foreground">{s.dealer_representatives?.name}</span>
                          </TableCell>
                          <TableCell><Badge variant={s.stock_status === "available" ? "default" : "outline"} className="text-[10px]">{s.stock_status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => shareToCustomer(s)} className="gap-1 h-7"><Share2 className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteStock(s.id)} className="h-7"><Trash2 className="h-3 w-3 text-red-500" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredStock.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No stock yet — extract from dealer replies</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="broadcast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Megaphone className="h-5 w-5" /> Send Available Stock to Customers</CardTitle>
              <p className="text-xs text-muted-foreground">Pick cars from your live stock, pick customers from your leads, one click → WhatsApp.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* LEFT: pick stock cars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">1️⃣ Pick cars to send</Label>
                    <Badge variant="outline">{bcastSelectedStockIds.length} selected</Badge>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search e.g. Audi A6" className="pl-8" value={bcastSearch} onChange={(e) => setBcastSearch(e.target.value)} />
                  </div>
                  <div className="border rounded-md max-h-[320px] overflow-auto">
                    {bcastFilteredStock.length === 0 ? (
                      <p className="text-center text-muted-foreground text-xs py-6">No matching available stock</p>
                    ) : (
                      <div className="divide-y">
                        {bcastFilteredStock.map((s: any) => (
                          <label key={s.id} className="flex items-center gap-2 p-2 text-xs hover:bg-muted/40 cursor-pointer">
                            <Checkbox
                              checked={bcastSelectedStockIds.includes(s.id)}
                              onCheckedChange={(v) => {
                                if (v) setBcastSelectedStockIds([...bcastSelectedStockIds, s.id]);
                                else setBcastSelectedStockIds(bcastSelectedStockIds.filter((x) => x !== s.id));
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{s.brand} {s.model} {s.variant || ""}</div>
                              <div className="text-muted-foreground text-[10px] truncate">
                                {s.color || "—"} • {s.manufacturing_year || "—"} • {s.on_road_price ? `₹${Number(s.on_road_price).toLocaleString("en-IN")}` : "Price NA"} • {s.dealer_representatives?.dealer_companies?.company_name || "Dealer"}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-[9px]">Qty {s.quantity || 1}</Badge>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT: pick customers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">2️⃣ Pick customers</Label>
                    <Badge variant="outline">{bcastSelectedLeadIds.length} / {bcastFilteredLeads.length}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search name / phone / car..." className="pl-8" value={bcastLeadSearch} onChange={(e) => setBcastLeadSearch(e.target.value)} />
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] whitespace-nowrap">
                      <Checkbox checked={bcastOnlyMatching} onCheckedChange={(v) => setBcastOnlyMatching(!!v)} />
                      Only matching car
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Checkbox
                      checked={bcastFilteredLeads.length > 0 && bcastSelectedLeadIds.length === bcastFilteredLeads.length}
                      onCheckedChange={toggleAllBcastLeads}
                    />
                    <span>Select all visible</span>
                  </div>
                  <div className="border rounded-md max-h-[280px] overflow-auto">
                    {bcastFilteredLeads.length === 0 ? (
                      <p className="text-center text-muted-foreground text-xs py-6">
                        {bcastOnlyMatching && bcastSelectedStockIds.length > 0
                          ? "No leads match the selected cars. Uncheck 'Only matching car' to broaden."
                          : "No leads"}
                      </p>
                    ) : (
                      <div className="divide-y">
                        {bcastFilteredLeads.map((l: any) => (
                          <label key={l.id} className="flex items-center gap-2 p-2 text-xs hover:bg-muted/40 cursor-pointer">
                            <Checkbox
                              checked={bcastSelectedLeadIds.includes(l.id)}
                              onCheckedChange={(v) => {
                                if (v) setBcastSelectedLeadIds([...bcastSelectedLeadIds, l.id]);
                                else setBcastSelectedLeadIds(bcastSelectedLeadIds.filter((x) => x !== l.id));
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{l.customer_name || l.name || "Customer"}</div>
                              <div className="text-muted-foreground text-[10px] truncate">
                                {l.phone} {l.car_brand && `• Wants ${l.car_brand} ${l.car_model || ""}`}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview + send */}
              <div className="border-t pt-3 space-y-3">
                <div>
                  <Label className="text-xs">Meta Template (utility/marketing)</Label>
                  <Select value={bcastTemplate} onValueChange={setBcastTemplate}>
                    <SelectTrigger><SelectValue placeholder="Select approved template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t: any) => (
                        <SelectItem key={t.name} value={t.name}>{t.display_name || t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {bcastSelectedStockIds.length > 0 && (
                  <div>
                    <Label className="text-xs">Message Preview</Label>
                    <pre className="whitespace-pre-wrap text-[11px] font-mono bg-muted p-2 rounded border max-h-40 overflow-auto">
                      {buildStockBroadcastBody()}
                    </pre>
                  </div>
                )}
                <Button onClick={sendStockToCustomers} disabled={bcastSending || bcastSelectedStockIds.length === 0 || bcastSelectedLeadIds.length === 0} size="lg" className="w-full gap-2">
                  {bcastSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send {bcastSelectedStockIds.length} car{bcastSelectedStockIds.length !== 1 ? "s" : ""} to {bcastSelectedLeadIds.length} customer{bcastSelectedLeadIds.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewCars} onOpenChange={(o) => !o && setPreviewCars(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>AI Extracted {previewCars?.length || 0} Cars</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(previewCars || []).map((c, i) => (
              <div key={i} className="border rounded p-2 text-xs grid grid-cols-2 md:grid-cols-4 gap-1">
                <div><strong>Brand:</strong> {c.brand}</div>
                <div><strong>Model:</strong> {c.model}</div>
                <div><strong>Variant:</strong> {c.variant || "—"}</div>
                <div><strong>Color:</strong> {c.color || "—"}</div>
                <div><strong>Year:</strong> {c.manufacturing_year || "—"}</div>
                <div><strong>Fuel:</strong> {c.fuel_type || "—"}</div>
                <div><strong>On-road:</strong> {c.on_road_price ? `₹${Number(c.on_road_price).toLocaleString("en-IN")}` : "—"}</div>
                <div><strong>Qty:</strong> {c.quantity || 1}</div>
                {c.discount && <div className="col-span-full text-amber-600"><strong>Discount:</strong> {c.discount}</div>}
              </div>
            ))}
            {previewCars?.length === 0 && <p className="text-center text-muted-foreground py-4">No car details detected.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewCars(null)}>Cancel</Button>
            <Button onClick={savePreview} disabled={!previewCars?.length} className="gap-1"><Sparkles className="h-4 w-4" />Save All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
