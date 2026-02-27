import { useState } from "react";
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
import { toast } from "sonner";
import { Send, Users, MessageCircle, Filter, CheckCircle2, Clock, Search, Zap, Building2 } from "lucide-react";
import { motion } from "framer-motion";

export default function DealerBroadcastManager() {
  const qc = useQueryClient();
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("inventory_update");
  const [search, setSearch] = useState("");

  // Fetch reps with company info
  const { data: reps = [] } = useQuery({
    queryKey: ["dealer-reps-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealer_representatives")
        .select("*, dealer_companies(company_name, dealer_type, city)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch broadcast history
  const { data: history = [] } = useQuery({
    queryKey: ["dealer-broadcast-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealer_broadcast_logs")
        .select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Fetch inventory for auto-message
  const { data: inventory = [] } = useQuery({
    queryKey: ["dealer-inventory-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dealer_inventory")
        .select("car_name, brand, variant, on_road_price, discount, stock_status, offer_details")
        .eq("is_active", true).eq("stock_status", "available")
        .order("brand");
      if (error) throw error;
      return data;
    },
  });

  const brands = [...new Set(reps.map((r: any) => r.brand))].sort();
  const companyTypes = [...new Set(reps.map((r: any) => r.dealer_companies?.dealer_type).filter(Boolean))];

  const filteredReps = reps.filter((r: any) => {
    if (brandFilter !== "all" && r.brand !== brandFilter) return false;
    if (typeFilter !== "all" && r.dealer_companies?.dealer_type !== typeFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !(r.whatsapp_number || "").includes(search)) return false;
    return true;
  });

  const toggleAll = () => {
    if (selectedReps.length === filteredReps.length) {
      setSelectedReps([]);
    } else {
      setSelectedReps(filteredReps.map((r: any) => r.id));
    }
  };

  const generateAutoMessage = () => {
    if (inventory.length === 0) { toast.error("No available inventory"); return; }
    const lines = inventory.slice(0, 10).map((i: any) => {
      const price = i.on_road_price ? `₹${(i.on_road_price / 100000).toFixed(1)}L` : "";
      const disc = i.discount ? ` | 🔥 ${i.discount}` : "";
      return `🚗 ${i.brand} ${i.car_name}${i.variant ? ` (${i.variant})` : ""} — ${price}${disc}`;
    });
    const msg = `📢 *Today's Stock Update*\n\n${lines.join("\n")}\n\n${inventory.length > 10 ? `+${inventory.length - 10} more cars available\n\n` : ""}📞 Contact us for best deals!\n🌐 www.grabyourcar.com`;
    setMessage(msg);
    toast.success("Auto-generated message ready!");
  };

  const sendBroadcast = useMutation({
    mutationFn: async () => {
      if (selectedReps.length === 0) throw new Error("Select at least one recipient");
      if (!message.trim()) throw new Error("Message is empty");

      // Log broadcast
      const { error } = await supabase.from("dealer_broadcast_logs").insert({
        broadcast_type: broadcastType,
        message_template: message,
        recipient_count: selectedReps.length,
        sent_by: "admin",
        status: "sent",
        details: { recipient_ids: selectedReps, brand_filter: brandFilter, type_filter: typeFilter },
      });
      if (error) throw error;

      // Here you would integrate with WhatsApp API to actually send
      // For now we log it
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-broadcast-logs"] });
      toast.success(`📤 Broadcast sent to ${selectedReps.length} recipients!`);
      setSelectedReps([]);
      setMessage("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Partners", value: reps.length, icon: Users, gradient: "from-blue-500 to-indigo-600" },
          { label: "With WhatsApp", value: reps.filter((r: any) => r.whatsapp_number).length, icon: MessageCircle, gradient: "from-green-500 to-emerald-600" },
          { label: "Brands Covered", value: brands.length, icon: Building2, gradient: "from-purple-500 to-violet-600" },
          { label: "Broadcasts Sent", value: history.length, icon: Send, gradient: "from-amber-500 to-orange-600" },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recipient Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Select Recipients</CardTitle>
            <CardDescription>Filter and select dealers to broadcast</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-[140px]"><Filter className="h-4 w-4 mr-1" /><SelectValue placeholder="Brand" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {companyTypes.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedReps.length === filteredReps.length ? "Deselect All" : "Select All"} ({filteredReps.length})
              </Button>
              <Badge variant="secondary">{selectedReps.length} selected</Badge>
            </div>

            {/* Rep List */}
            <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-lg p-2">
              {filteredReps.map((r: any) => (
                <div key={r.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedReps.includes(r.id) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"}`}
                  onClick={() => setSelectedReps(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])}>
                  <Checkbox checked={selectedReps.includes(r.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.brand} · {r.dealer_companies?.company_name || "Independent"}</p>
                  </div>
                  {r.whatsapp_number && <MessageCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Message Composer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Compose Broadcast</CardTitle>
            <CardDescription>Create and send updates to selected partners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Broadcast Type</Label>
              <Select value={broadcastType} onValueChange={setBroadcastType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory_update">📦 Inventory Update</SelectItem>
                  <SelectItem value="daily_offers">🔥 Daily Offers</SelectItem>
                  <SelectItem value="price_change">💰 Price Change</SelectItem>
                  <SelectItem value="new_launch">🚗 New Launch</SelectItem>
                  <SelectItem value="custom">✏️ Custom Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={generateAutoMessage}>
              <Zap className="h-4 w-4" /> Auto-Generate from Inventory
            </Button>

            <div className="grid gap-2">
              <Label>Message</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={12} placeholder="Type your broadcast message..." className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">{message.length} / 1024 characters</p>
            </div>

            <Button className="w-full gap-2" size="lg" onClick={() => sendBroadcast.mutate()}
              disabled={selectedReps.length === 0 || !message.trim() || sendBroadcast.isPending}>
              <Send className="h-4 w-4" />
              {sendBroadcast.isPending ? "Sending..." : `Send to ${selectedReps.length} Recipients`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Broadcast History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Broadcast History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="capitalize">{h.broadcast_type?.replace("_", " ")}</TableCell>
                  <TableCell><Badge variant="outline">{h.recipient_count}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={h.status === "sent" ? "default" : "secondary"} className="gap-1">
                      {h.status === "sent" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {h.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(h.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No broadcasts yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
