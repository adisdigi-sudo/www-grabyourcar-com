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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Send, MessageCircle, Mail, Phone, Bot, Clock, CheckCircle2,
  XCircle, Zap, Users, Building2, TrendingUp, Bell, Calendar,
  History, Plus, AlertTriangle, ArrowUpDown, Globe
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

const MESSAGE_TEMPLATES = {
  whatsapp_discount_update: `Hi {{name}},\n\nThis is from GrabYourCar 🚗\nWe'd like to know the latest discounts & offers on {{brand}} models.\n\nCould you please share:\n✅ Cash discount\n✅ Exchange bonus\n✅ Corporate offers\n✅ Any limited-time deals\n\nThank you! 🙏`,
  whatsapp_stock_check: `Hi {{name}},\n\nGrabYourCar here! 🚗\nCould you please share current stock availability for {{brand}}?\n\nWe need:\n📦 Available models & variants\n🎨 Colors in stock\n📅 Delivery timeline\n\nThanks!`,
  email_weekly_update: `Dear {{name}},\n\nWe hope you're doing well. As part of our weekly update cycle, we'd appreciate if you could share the latest:\n\n1. Discount updates on all models\n2. Stock availability\n3. Any upcoming offers or events\n4. Delivery timelines for pending bookings\n\nPlease reply to this email or share on WhatsApp.\n\nBest regards,\nGrabYourCar Team`,
  ai_call_script: `Call {{name}} at {{phone}}. Ask about:\n1. Latest discounts on {{brand}} models\n2. Stock availability for popular variants\n3. Any upcoming price revisions\n4. Exchange/corporate bonus updates`,
  whatsapp_new_launch: `Hi {{name}},\n\nGrabYourCar here! 🚗\nAny updates on new model launches or facelifts for {{brand}}?\n\nWe'd love to know:\n🆕 New model launch dates\n💰 Expected pricing\n📋 Booking status\n\nThanks! 🙏`,
  email_partnership: `Dear {{name}},\n\nGreetings from GrabYourCar!\n\nWe are one of the leading automotive platforms in India with 500+ deliveries.\n\nWe'd love to explore partnership opportunities with {{brand}} dealership.\n\nOur services include:\n- Customer referrals & lead generation\n- Insurance & finance integration\n- Digital marketing support\n\nLooking forward to connecting!\n\nBest,\nGrabYourCar Team`,
};

const REGIONS = ["All India", "North", "South", "East", "West", "Central", "North-East"];

export default function DealerAutomationCenter() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("outreach");
  const [selectedTemplate, setSelectedTemplate] = useState("whatsapp_discount_update");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedDealers, setSelectedDealers] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("whatsapp");
  const [regionFilter, setRegionFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("");
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [alertDialog, setAlertDialog] = useState(false);

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
        .limit(200);
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

  // Fetch discount history
  const { data: discountHistory = [] } = useQuery({
    queryKey: ["dealer-discount-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_discount_history")
        .select("*, dealer_companies(company_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ["dealer-auto-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_automation_schedules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch follow-up alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["dealer-follow-up-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_follow_up_alerts")
        .select("*, dealer_companies(company_name), dealer_representatives(name)")
        .eq("status", "pending")
        .order("due_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Toggle automation
  const toggleAutomation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("dealer_companies").update({ automation_enabled: enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dealer-companies-auto"] }); toast.success("Updated"); },
  });

  // Send broadcast
  const sendBroadcast = useMutation({
    mutationFn: async () => {
      const filteredDealers = dealers.filter((d: any) => {
        if (selectedDealers.length > 0 && !selectedDealers.includes(d.id)) return false;
        if (regionFilter !== "all" && d.region !== regionFilter) return false;
        if (brandFilter && !(d.brand_name || "").toLowerCase().includes(brandFilter.toLowerCase())) return false;
        return true;
      });

      const template = customMessage || MESSAGE_TEMPLATES[selectedTemplate as keyof typeof MESSAGE_TEMPLATES];
      const logEntries: any[] = [];

      for (const dealer of filteredDealers) {
        const reps = dealer.dealer_representatives || [];
        if (reps.length === 0) {
          // Log for dealer without reps
          logEntries.push({
            dealer_company_id: dealer.id,
            channel: selectedChannel,
            action_type: "outreach",
            message_template: template.replace(/\{\{name\}\}/g, "Sir/Madam").replace(/\{\{brand\}\}/g, dealer.brand_name || "").substring(0, 500),
            status: "no_rep",
          });
          continue;
        }
        for (const rep of reps) {
          const message = template
            .replace(/\{\{name\}\}/g, rep.name || "Sir/Madam")
            .replace(/\{\{brand\}\}/g, rep.brand || dealer.brand_name || "your brand")
            .replace(/\{\{phone\}\}/g, rep.phone || "");

          if (selectedChannel === "whatsapp" && (rep.whatsapp_number || rep.phone)) {
            const num = (rep.whatsapp_number || rep.phone || "").replace(/\D/g, "");
            window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, "_blank");
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

      const dealerIds = filteredDealers.map((d: any) => d.id);
      for (const id of dealerIds) {
        await supabase.from("dealer_companies").update({ last_contacted_at: new Date().toISOString() }).eq("id", id);
      }

      return logEntries.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["dealer-automation-logs"] });
      qc.invalidateQueries({ queryKey: ["dealer-companies-auto"] });
      toast.success(`Outreach sent to ${count} contacts`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add discount
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
      // Also log initial entry
      await supabase.from("dealer_discount_history").insert({
        dealer_company_id: discountForm.dealer_company_id || null,
        brand: discountForm.brand,
        model: discountForm.model,
        variant: discountForm.variant || null,
        old_amount: 0,
        new_amount: Number(discountForm.discount_amount),
        change_type: "new",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-live-discounts"] });
      qc.invalidateQueries({ queryKey: ["dealer-discount-history"] });
      toast.success("Discount added");
      setDiscountForm({ dealer_company_id: "", brand: "", model: "", variant: "", discount_type: "cash", discount_amount: 0, offer_details: "", valid_till: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add schedule
  const [schedForm, setSchedForm] = useState({
    schedule_name: "", channel: "whatsapp", template_key: "whatsapp_discount_update",
    frequency: "daily", schedule_time: "09:00", custom_message: "",
  });

  const addSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("dealer_automation_schedules").insert({
        ...schedForm,
        days_of_week: schedForm.frequency === "weekdays" ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-auto-schedules"] });
      toast.success("Schedule created");
      setScheduleDialog(false);
      setSchedForm({ schedule_name: "", channel: "whatsapp", template_key: "whatsapp_discount_update", frequency: "daily", schedule_time: "09:00", custom_message: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSchedule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("dealer_automation_schedules").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dealer-auto-schedules"] }); toast.success("Updated"); },
  });

  // Add follow-up alert
  const [alertForm, setAlertForm] = useState({
    dealer_company_id: "", dealer_rep_id: "", alert_type: "follow_up",
    priority: "medium", message: "", due_at: "",
  });

  const addAlert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("dealer_follow_up_alerts").insert({
        ...alertForm,
        dealer_company_id: alertForm.dealer_company_id || null,
        dealer_rep_id: alertForm.dealer_rep_id || null,
        due_at: alertForm.due_at || new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealer-follow-up-alerts"] });
      toast.success("Alert created");
      setAlertDialog(false);
      setAlertForm({ dealer_company_id: "", dealer_rep_id: "", alert_type: "follow_up", priority: "medium", message: "", due_at: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completeAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dealer_follow_up_alerts").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dealer-follow-up-alerts"] }); toast.success("Alert completed"); },
  });

  // Filtered dealers
  const filteredDealers = dealers.filter((d: any) => {
    if (regionFilter !== "all" && d.region !== regionFilter) return false;
    if (brandFilter && !(d.brand_name || "").toLowerCase().includes(brandFilter.toLowerCase())) return false;
    return true;
  });

  const uniqueBrands = [...new Set(dealers.map((d: any) => d.brand_name).filter(Boolean))];

  const stats = {
    totalDealers: dealers.length,
    automationEnabled: dealers.filter((d: any) => d.automation_enabled !== false).length,
    totalOutreach: logs.length,
    liveDiscounts: discounts.length,
    pendingAlerts: alerts.length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Dealers", value: stats.totalDealers, icon: Building2, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/40" },
          { label: "Auto-Enabled", value: stats.automationEnabled, icon: Zap, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/40" },
          { label: "Outreach Sent", value: stats.totalOutreach, icon: Send, color: "text-green-600 bg-green-100 dark:bg-green-900/40" },
          { label: "Live Discounts", value: stats.liveDiscounts, icon: TrendingUp, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/40" },
          { label: "Pending Alerts", value: stats.pendingAlerts, icon: Bell, color: stats.pendingAlerts > 0 ? "text-red-600 bg-red-100 dark:bg-red-900/40" : "text-muted-foreground bg-muted" },
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
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="outreach" className="gap-1"><Send className="h-3.5 w-3.5" /> Outreach</TabsTrigger>
          <TabsTrigger value="discounts" className="gap-1"><TrendingUp className="h-3.5 w-3.5" /> Discounts</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><History className="h-3.5 w-3.5" /> History</TabsTrigger>
          <TabsTrigger value="schedules" className="gap-1"><Calendar className="h-3.5 w-3.5" /> Schedules</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1 relative">
            <Bell className="h-3.5 w-3.5" /> Alerts
            {stats.pendingAlerts > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{stats.pendingAlerts}</span>}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1"><Zap className="h-3.5 w-3.5" /> Settings</TabsTrigger>
        </TabsList>

        {/* ── OUTREACH TAB ── */}
        <TabsContent value="outreach" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-40 h-9"><Globe className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Region" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All India</SelectItem>
                {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Brand filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Brands</SelectItem>
                {uniqueBrands.map((b: any) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="h-9 px-3 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {filteredDealers.length} dealers matched
            </Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Template */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">📨 Message Template</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="ai_call">🤖 AI Call</SelectItem>
                    <SelectItem value="manual">📋 Manual Follow-up</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTemplate} onValueChange={(v) => { setSelectedTemplate(v); setCustomMessage(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp_discount_update">Discount Update Request</SelectItem>
                    <SelectItem value="whatsapp_stock_check">Stock Availability Check</SelectItem>
                    <SelectItem value="whatsapp_new_launch">New Launch Inquiry</SelectItem>
                    <SelectItem value="email_weekly_update">Weekly Email Update</SelectItem>
                    <SelectItem value="email_partnership">Partnership Outreach</SelectItem>
                    <SelectItem value="ai_call_script">AI Call Script</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={customMessage || MESSAGE_TEMPLATES[selectedTemplate as keyof typeof MESSAGE_TEMPLATES]}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={7}
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
                    {selectedDealers.length > 0 ? `${selectedDealers.length} selected` : `All ${filteredDealers.length}`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                <Button variant="ghost" size="sm" className="text-xs w-full justify-start" onClick={() => setSelectedDealers([])}>
                  ✅ Select All ({filteredDealers.length})
                </Button>
                {filteredDealers.map((d: any) => (
                  <label key={d.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDealers.length === 0 || selectedDealers.includes(d.id)}
                      onChange={(e) => {
                        if (selectedDealers.length === 0) {
                          setSelectedDealers(filteredDealers.filter((x: any) => x.id !== d.id).map((x: any) => x.id));
                        } else {
                          setSelectedDealers(prev => e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id));
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{d.company_name}</span>
                      <div className="flex gap-1 flex-wrap mt-0.5">
                        {d.brand_name && <Badge variant="outline" className="text-[9px] h-4">{d.brand_name}</Badge>}
                        {d.region && <Badge variant="secondary" className="text-[9px] h-4">{d.region}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground block">
                        {d.city || "—"} · {(d.dealer_representatives || []).length} reps
                        {d.last_contacted_at && ` · Last: ${format(new Date(d.last_contacted_at), "dd MMM")}`}
                      </span>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>

          <Button size="lg" className="w-full gap-2" onClick={() => sendBroadcast.mutate()} disabled={sendBroadcast.isPending}>
            <Send className="h-4 w-4" />
            {sendBroadcast.isPending ? "Sending..." : `Send ${selectedChannel === "whatsapp" ? "WhatsApp" : selectedChannel === "email" ? "Email" : selectedChannel === "ai_call" ? "AI Call" : "Manual Alert"} to ${filteredDealers.length} Dealers`}
          </Button>

          {/* Recent Logs */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">📋 Recent Outreach Log</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Dealer</TableHead><TableHead>Rep</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.slice(0, 20).map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.created_at), "dd MMM, hh:mm a")}</TableCell>
                      <TableCell className="text-sm">{log.dealer_companies?.company_name || "—"}</TableCell>
                      <TableCell className="text-sm">{log.dealer_representatives?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          {log.channel === "whatsapp" && <MessageCircle className="h-3 w-3 text-green-600" />}
                          {log.channel === "email" && <Mail className="h-3 w-3 text-blue-600" />}
                          {log.channel === "ai_call" && <Bot className="h-3 w-3 text-purple-600" />}
                          {log.channel === "manual" && <Phone className="h-3 w-3 text-orange-600" />}
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
                  {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No logs yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LIVE DISCOUNTS TAB ── */}
        <TabsContent value="discounts" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">➕ Add Live Discount</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <Select value={discountForm.dealer_company_id} onValueChange={v => setDiscountForm(f => ({ ...f, dealer_company_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Dealer..." /></SelectTrigger>
                  <SelectContent>{dealers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.company_name}</SelectItem>)}</SelectContent>
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
                    <SelectItem value="accessories">Free Accessories</SelectItem>
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

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead><TableHead>Brand / Model</TableHead><TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead><TableHead>Details</TableHead><TableHead>Valid Till</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No live discounts</TableCell></TableRow>
                  ) : discounts.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">{d.dealer_companies?.company_name || "—"}</TableCell>
                      <TableCell className="font-medium">{d.brand} {d.model} {d.variant && <span className="text-muted-foreground">({d.variant})</span>}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-[10px]">{d.discount_type}</Badge></TableCell>
                      <TableCell className="font-mono font-semibold text-green-600">₹{Number(d.discount_amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{d.offer_details || "—"}</TableCell>
                      <TableCell className="text-xs">{d.valid_till ? format(new Date(d.valid_till), "dd MMM yyyy") : "Open"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DISCOUNT HISTORY TAB ── */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Discount Change History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Dealer</TableHead><TableHead>Brand / Model</TableHead>
                    <TableHead>Change</TableHead><TableHead>Old → New</TableHead><TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discountHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No discount changes recorded yet</TableCell></TableRow>
                  ) : discountHistory.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{format(new Date(h.created_at), "dd MMM yyyy, hh:mm a")}</TableCell>
                      <TableCell className="text-sm">{h.dealer_companies?.company_name || "—"}</TableCell>
                      <TableCell className="font-medium">{h.brand} {h.model} {h.variant && `(${h.variant})`}</TableCell>
                      <TableCell>
                        <Badge variant={h.change_type === "new" ? "default" : "outline"} className="text-[10px] capitalize">
                          {h.change_type === "new" ? "🆕 New" : "🔄 Updated"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-muted-foreground line-through">₹{Number(h.old_amount).toLocaleString("en-IN")}</span>
                          <ArrowUpDown className="h-3 w-3" />
                          <span className="font-semibold text-green-600">₹{Number(h.new_amount).toLocaleString("en-IN")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {h.new_amount > h.old_amount ? (
                          <Badge className="bg-green-100 text-green-700 text-[10px]">↑ Increased</Badge>
                        ) : h.new_amount < h.old_amount ? (
                          <Badge className="bg-red-100 text-red-700 text-[10px]">↓ Decreased</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">New Entry</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SCHEDULES TAB ── */}
        <TabsContent value="schedules" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">📅 Daily Automation Schedules</h3>
            <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> New Schedule</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Automation Schedule</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2"><Label>Schedule Name</Label><Input value={schedForm.schedule_name} onChange={e => setSchedForm(f => ({ ...f, schedule_name: e.target.value }))} placeholder="e.g. Daily Discount Check" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Channel</Label>
                      <Select value={schedForm.channel} onValueChange={v => setSchedForm(f => ({ ...f, channel: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="ai_call">AI Call</SelectItem>
                          <SelectItem value="manual">Manual Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Frequency</Label>
                      <Select value={schedForm.frequency} onValueChange={v => setSchedForm(f => ({ ...f, frequency: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekdays">Weekdays Only</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Time</Label><Input type="time" value={schedForm.schedule_time} onChange={e => setSchedForm(f => ({ ...f, schedule_time: e.target.value }))} /></div>
                    <div className="grid gap-2">
                      <Label>Template</Label>
                      <Select value={schedForm.template_key} onValueChange={v => setSchedForm(f => ({ ...f, template_key: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp_discount_update">Discount Update</SelectItem>
                          <SelectItem value="whatsapp_stock_check">Stock Check</SelectItem>
                          <SelectItem value="whatsapp_new_launch">New Launch</SelectItem>
                          <SelectItem value="email_weekly_update">Weekly Email</SelectItem>
                          <SelectItem value="email_partnership">Partnership</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={() => addSchedule.mutate()} disabled={!schedForm.schedule_name || addSchedule.isPending}>
                    {addSchedule.isPending ? "Creating..." : "Create Schedule"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {schedules.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No schedules yet. Create your first automation schedule.</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {schedules.map((s: any) => (
                <Card key={s.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-lg ${s.channel === "whatsapp" ? "bg-green-100 dark:bg-green-900/40 text-green-600" : s.channel === "email" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" : s.channel === "ai_call" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600" : "bg-orange-100 dark:bg-orange-900/40 text-orange-600"}`}>
                        {s.channel === "whatsapp" ? <MessageCircle className="h-5 w-5" /> : s.channel === "email" ? <Mail className="h-5 w-5" /> : s.channel === "ai_call" ? <Bot className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{s.schedule_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.frequency} at {s.schedule_time} · Template: {s.template_key?.replace(/_/g, " ")}
                        </p>
                        {s.last_run_at && <p className="text-[10px] text-muted-foreground">Last run: {format(new Date(s.last_run_at), "dd MMM, hh:mm a")}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={s.is_active ? "default" : "secondary"} className="text-[10px]">{s.is_active ? "Active" : "Paused"}</Badge>
                      <Switch checked={s.is_active} onCheckedChange={(checked) => toggleSchedule.mutate({ id: s.id, active: checked })} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ALERTS TAB ── */}
        <TabsContent value="alerts" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">🔔 Follow-up Alerts</h3>
            <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> New Alert</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Follow-up Alert</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Dealer</Label>
                    <Select value={alertForm.dealer_company_id} onValueChange={v => setAlertForm(f => ({ ...f, dealer_company_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select dealer..." /></SelectTrigger>
                      <SelectContent>{dealers.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.company_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <Select value={alertForm.alert_type} onValueChange={v => setAlertForm(f => ({ ...f, alert_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="discount_check">Discount Check</SelectItem>
                          <SelectItem value="stock_update">Stock Update</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="escalation">Escalation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Priority</Label>
                      <Select value={alertForm.priority} onValueChange={v => setAlertForm(f => ({ ...f, priority: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2"><Label>Due Date</Label><Input type="datetime-local" value={alertForm.due_at} onChange={e => setAlertForm(f => ({ ...f, due_at: e.target.value }))} /></div>
                  <div className="grid gap-2"><Label>Message</Label><Textarea value={alertForm.message} onChange={e => setAlertForm(f => ({ ...f, message: e.target.value }))} placeholder="What needs to be done..." rows={3} /></div>
                  <Button onClick={() => addAlert.mutate()} disabled={!alertForm.dealer_company_id || addAlert.isPending}>
                    {addAlert.isPending ? "Creating..." : "Create Alert"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {alerts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">✅ No pending alerts. All clear!</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {alerts.map((a: any) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className={`border-l-4 ${a.priority === "urgent" ? "border-l-red-500" : a.priority === "high" ? "border-l-orange-500" : a.priority === "medium" ? "border-l-yellow-500" : "border-l-blue-500"}`}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${a.priority === "urgent" ? "bg-red-100 dark:bg-red-900/40 text-red-600" : a.priority === "high" ? "bg-orange-100 dark:bg-orange-900/40 text-orange-600" : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600"}`}>
                          {a.priority === "urgent" ? <AlertTriangle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{a.dealer_companies?.company_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{a.message || a.alert_type}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] capitalize">{a.alert_type}</Badge>
                            <Badge variant={a.priority === "urgent" ? "destructive" : "outline"} className="text-[9px] capitalize">{a.priority}</Badge>
                            <span className="text-[10px] text-muted-foreground">Due: {format(new Date(a.due_at), "dd MMM, hh:mm a")}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => completeAlert.mutate(a.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Done
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── SETTINGS TAB ── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">⚡ Dealer Automation Toggle</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {dealers.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{d.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.brand_name || "—"} · {d.city || "—"} · {d.region || "—"} · {(d.dealer_representatives || []).length} reps
                    </p>
                    {d.last_contacted_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Last: {format(new Date(d.last_contacted_at), "dd MMM, hh:mm a")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground">Auto</Label>
                    <Switch checked={d.automation_enabled !== false} onCheckedChange={(checked) => toggleAutomation.mutate({ id: d.id, enabled: checked })} />
                  </div>
                </div>
              ))}
              {dealers.length === 0 && <p className="text-center text-muted-foreground py-4">No dealers added yet</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
