import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Send, MessageCircle, Mail, Phone, Bot, Clock, CheckCircle2,
  XCircle, AlertTriangle, Zap, RefreshCw, Users, Building2, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const MESSAGE_TEMPLATES = {
  whatsapp_discount_update: `Hi {{name}},\n\nThis is from GrabYourCar 🚗\nWe'd like to know the latest discounts & offers on {{brand}} models.\n\nCould you please share:\n✅ Cash discount\n✅ Exchange bonus\n✅ Corporate offers\n✅ Any limited-time deals\n\nThank you! 🙏`,
  whatsapp_stock_check: `Hi {{name}},\n\nGrabYourCar here! 🚗\nCould you please share current stock availability for {{brand}}?\n\nWe need:\n📦 Available models & variants\n🎨 Colors in stock\n📅 Delivery timeline\n\nThanks!`,
  email_weekly_update: `Dear {{name}},\n\nWe hope you're doing well. As part of our weekly update cycle, we'd appreciate if you could share the latest:\n\n1. Discount updates on all models\n2. Stock availability\n3. Any upcoming offers or events\n4. Delivery timelines for pending bookings\n\nPlease reply to this email or share on WhatsApp.\n\nBest regards,\nGrabYourCar Team`,
  ai_call_script: `Call {{name}} at {{phone}}. Ask about:\n1. Latest discounts on {{brand}} models\n2. Stock availability for popular variants\n3. Any upcoming price revisions\n4. Exchange/corporate bonus updates`,
};

export default function DealerAutomationCenter() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("outreach");
  const [selectedTemplate, setSelectedTemplate] = useState("whatsapp_discount_update");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedDealers, setSelectedDealers] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("whatsapp");

  // Fetch dealers with reps
  const { data: dealers = [] } = useQuery({
    queryKey: ["dealer-companies-auto"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_companies")
        .select("*, dealer_representatives(id, name, phone, whatsapp_number, email, brand)")
        .eq("is_active", true)
        .order("priority_level", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch automation logs
  const { data: logs = [] } = useQuery({
    queryKey: ["dealer-automation-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_automation_logs")
        .select("*, dealer_companies(company_name), dealer_representatives(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch live discounts
  const { data: discounts = [] } = useQuery({
    queryKey: ["dealer-live-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_live_discounts")
        .select("*, dealer_companies(company_name), dealer_representatives(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Toggle automation for a dealer
  const toggleAutomation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("dealer_companies")
        .update({ automation_enabled: enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-companies-auto"] });
      toast.success("Automation setting updated");
    },
  });

  // Send broadcast
  const sendBroadcast = useMutation({
    mutationFn: async () => {
      const targetDealers = selectedDealers.length > 0
        ? dealers.filter((d: any) => selectedDealers.includes(d.id))
        : dealers;

      const template = customMessage || MESSAGE_TEMPLATES[selectedTemplate as keyof typeof MESSAGE_TEMPLATES];
      const logEntries: any[] = [];

      for (const dealer of targetDealers) {
        const reps = dealer.dealer_representatives || [];
        for (const rep of reps) {
          const message = template
            .replace(/\{\{name\}\}/g, rep.name || "Sir/Madam")
            .replace(/\{\{brand\}\}/g, rep.brand || dealer.brand_name || "your brand")
            .replace(/\{\{phone\}\}/g, rep.phone || "");

          if (selectedChannel === "whatsapp" && rep.whatsapp_number) {
            const waUrl = `https://wa.me/${rep.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, "_blank");
          }

          logEntries.push({
            dealer_company_id: dealer.id,
            dealer_rep_id: rep.id,
            channel: selectedChannel,
            action_type: "outreach",
            message_template: message.substring(0, 500),
            status: selectedChannel === "whatsapp" ? "sent" : "pending",
            sent_at: new Date().toISOString(),
          });
        }
      }

      if (logEntries.length > 0) {
        await supabase.from("dealer_automation_logs").insert(logEntries);
      }

      // Update last_contacted_at
      const dealerIds = targetDealers.map((d: any) => d.id);
      for (const id of dealerIds) {
        await supabase.from("dealer_companies").update({ last_contacted_at: new Date().toISOString() }).eq("id", id);
      }

      return logEntries.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["dealer-automation-logs"] });
      qc.invalidateQueries({ queryKey: ["dealer-companies-auto"] });
      toast.success(`Sent to ${count} dealer reps`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add live discount
  const [discountForm, setDiscountForm] = useState({
    dealer_company_id: "", brand: "", model: "", variant: "",
    discount_type: "cash", discount_amount: 0, offer_details: "", valid_till: "",
  });

  const addDiscount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("dealer_live_discounts").insert({
        ...discountForm,
        discount_amount: Number(discountForm.discount_amount),
        dealer_company_id: discountForm.dealer_company_id || null,
        valid_till: discountForm.valid_till || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-live-discounts"] });
      toast.success("Discount added");
      setDiscountForm({ dealer_company_id: "", brand: "", model: "", variant: "", discount_type: "cash", discount_amount: 0, offer_details: "", valid_till: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = {
    totalDealers: dealers.length,
    automationEnabled: dealers.filter((d: any) => d.automation_enabled !== false).length,
    totalOutreach: logs.length,
    liveDiscounts: discounts.length,
    lastContact: logs[0]?.created_at ? format(new Date(logs[0].created_at), "dd MMM, hh:mm a") : "—",
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Dealers", value: stats.totalDealers, icon: Building2, color: "text-blue-600 bg-blue-100 dark:bg-blue-950" },
          { label: "Auto-Enabled", value: stats.automationEnabled, icon: Zap, color: "text-amber-600 bg-amber-100 dark:bg-amber-950" },
          { label: "Outreach Sent", value: stats.totalOutreach, icon: Send, color: "text-green-600 bg-green-100 dark:bg-green-950" },
          { label: "Live Discounts", value: stats.liveDiscounts, icon: TrendingUp, color: "text-purple-600 bg-purple-100 dark:bg-purple-950" },
          { label: "Last Contact", value: stats.lastContact, icon: Clock, color: "text-muted-foreground bg-muted" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="pt-3 pb-2.5 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-lg font-bold leading-tight">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="outreach" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Outreach</TabsTrigger>
          <TabsTrigger value="discounts" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Live Discounts</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Auto Settings</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Logs</TabsTrigger>
        </TabsList>

        {/* ── OUTREACH TAB ── */}
        <TabsContent value="outreach" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Template Selection */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">📨 Message Template</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="ai_call">🤖 AI Call</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTemplate} onValueChange={(v) => {
                  setSelectedTemplate(v);
                  setCustomMessage(MESSAGE_TEMPLATES[v as keyof typeof MESSAGE_TEMPLATES] || "");
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp_discount_update">Discount Update Request</SelectItem>
                    <SelectItem value="whatsapp_stock_check">Stock Availability Check</SelectItem>
                    <SelectItem value="email_weekly_update">Weekly Email Update</SelectItem>
                    <SelectItem value="ai_call_script">AI Call Script</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={customMessage || MESSAGE_TEMPLATES[selectedTemplate as keyof typeof MESSAGE_TEMPLATES]}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={8}
                  className="text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Variables: {"{{name}}, {{brand}}, {{phone}}"}</p>
              </CardContent>
            </Card>

            {/* Dealer Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  🏢 Target Dealers
                  <Badge variant="outline" className="text-[10px]">
                    {selectedDealers.length > 0 ? `${selectedDealers.length} selected` : `All ${dealers.length}`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                <Button variant="ghost" size="sm" className="text-xs w-full justify-start" onClick={() => setSelectedDealers([])}>
                  Select All ({dealers.length})
                </Button>
                {dealers.map((d: any) => (
                  <label key={d.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDealers.length === 0 || selectedDealers.includes(d.id)}
                      onChange={(e) => {
                        if (selectedDealers.length === 0) {
                          setSelectedDealers(dealers.filter((x: any) => x.id !== d.id).map((x: any) => x.id));
                        } else {
                          setSelectedDealers(prev =>
                            e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id)
                          );
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <span className="font-medium">{d.company_name}</span>
                      {d.brand_name && <Badge variant="outline" className="ml-2 text-[10px]">{d.brand_name}</Badge>}
                      <span className="text-xs text-muted-foreground block">
                        {d.city || "—"} · {(d.dealer_representatives || []).length} reps
                      </span>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>

          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => sendBroadcast.mutate()}
            disabled={sendBroadcast.isPending}
          >
            <Send className="h-4 w-4" />
            {sendBroadcast.isPending ? "Sending..." : `Send ${selectedChannel === "whatsapp" ? "WhatsApp" : selectedChannel === "email" ? "Email" : "AI Call"} to Dealers`}
          </Button>
        </TabsContent>

        {/* ── LIVE DISCOUNTS TAB ── */}
        <TabsContent value="discounts" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">➕ Add Live Discount</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <Select value={discountForm.dealer_company_id} onValueChange={v => setDiscountForm(f => ({ ...f, dealer_company_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Dealer..." /></SelectTrigger>
                  <SelectContent>
                    {dealers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Brand" value={discountForm.brand} onChange={e => setDiscountForm(f => ({ ...f, brand: e.target.value }))} className="h-9" />
                <Input placeholder="Model" value={discountForm.model} onChange={e => setDiscountForm(f => ({ ...f, model: e.target.value }))} className="h-9" />
                <Input placeholder="Variant" value={discountForm.variant} onChange={e => setDiscountForm(f => ({ ...f, variant: e.target.value }))} className="h-9" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <Select value={discountForm.discount_type} onValueChange={v => setDiscountForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Discount</SelectItem>
                    <SelectItem value="exchange">Exchange Bonus</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="loyalty">Loyalty</SelectItem>
                    <SelectItem value="festive">Festive Offer</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="₹ Amount" value={discountForm.discount_amount || ""} onChange={e => setDiscountForm(f => ({ ...f, discount_amount: Number(e.target.value) }))} className="h-9" />
                <Input placeholder="Offer details" value={discountForm.offer_details} onChange={e => setDiscountForm(f => ({ ...f, offer_details: e.target.value }))} className="h-9" />
                <Input type="date" value={discountForm.valid_till} onChange={e => setDiscountForm(f => ({ ...f, valid_till: e.target.value }))} className="h-9" />
              </div>
              <Button size="sm" onClick={() => addDiscount.mutate()} disabled={!discountForm.brand || !discountForm.model || addDiscount.isPending}>
                {addDiscount.isPending ? "Adding..." : "Add Discount"}
              </Button>
            </CardContent>
          </Card>

          {/* Live Discounts Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Brand / Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Valid Till</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No live discounts yet</TableCell></TableRow>
                  ) : discounts.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">{d.dealer_companies?.company_name || "—"}</TableCell>
                      <TableCell className="font-medium">{d.brand} {d.model} {d.variant && <span className="text-muted-foreground">({d.variant})</span>}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-[10px]">{d.discount_type}</Badge></TableCell>
                      <TableCell className="font-mono font-semibold">₹{Number(d.discount_amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{d.offer_details || "—"}</TableCell>
                      <TableCell className="text-xs">{d.valid_till ? format(new Date(d.valid_till), "dd MMM yyyy") : "Open"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SETTINGS TAB ── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">⚡ Dealer Automation Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {dealers.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{d.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.brand_name || "—"} · {d.city || "—"} · {(d.dealer_representatives || []).length} reps
                    </p>
                    {d.last_contacted_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Last contacted: {format(new Date(d.last_contacted_at), "dd MMM, hh:mm a")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground">Auto</Label>
                    <Switch
                      checked={d.automation_enabled !== false}
                      onCheckedChange={(checked) => toggleAutomation.mutate({ id: d.id, enabled: checked })}
                    />
                  </div>
                </div>
              ))}
              {dealers.length === 0 && <p className="text-center text-muted-foreground py-4">No dealers added yet</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LOGS TAB ── */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Rep</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No outreach logs yet</TableCell></TableRow>
                  ) : logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.created_at), "dd MMM, hh:mm a")}</TableCell>
                      <TableCell className="text-sm">{log.dealer_companies?.company_name || "—"}</TableCell>
                      <TableCell className="text-sm">{log.dealer_representatives?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          {log.channel === "whatsapp" && <MessageCircle className="h-3 w-3 text-green-600" />}
                          {log.channel === "email" && <Mail className="h-3 w-3 text-blue-600" />}
                          {log.channel === "ai_call" && <Bot className="h-3 w-3 text-purple-600" />}
                          {log.channel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                          {log.status === "sent" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {log.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                          {log.status}
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
    </div>
  );
}
