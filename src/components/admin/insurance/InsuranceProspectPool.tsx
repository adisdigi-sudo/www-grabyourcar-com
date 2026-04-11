import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRCLookup } from "@/hooks/useRCLookup";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Users, Phone, Search, ArrowRightCircle, AlertTriangle,
  PhoneCall, MessageSquare, Mail, Clock, Plus, Filter,
  Database, UserCheck, UserX, PhoneOff, CalendarClock, RotateCcw,
  Trophy, XCircle, StickyNote, Eye, Trash2, Upload,
  TrendingUp, Target, Flame, ChevronLeft, ChevronRight, Loader2, Car, Check, Send
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { INSURANCE_COMPANIES } from "@/lib/insuranceCompanies";
import { BulkProspectImportButton } from "./BulkProspectImport";
import { sendWhatsApp } from "@/lib/sendWhatsApp";

const STATUSES = [
  { value: "new", label: "New", icon: Database, color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", icon: PhoneCall, color: "bg-sky-500" },
  { value: "interested", label: "Interested", icon: UserCheck, color: "bg-emerald-500" },
  { value: "callback", label: "Call Back", icon: CalendarClock, color: "bg-amber-500" },
  { value: "follow_up", label: "Follow Up", icon: Clock, color: "bg-purple-500" },
  { value: "not_reachable", label: "Not Reachable", icon: PhoneOff, color: "bg-orange-500" },
  { value: "not_interested", label: "Not Interested", icon: UserX, color: "bg-red-500" },
  { value: "won", label: "Won ✅", icon: Trophy, color: "bg-green-600" },
  { value: "lost", label: "Lost ❌", icon: XCircle, color: "bg-red-600" },
  { value: "converted", label: "Converted", icon: ArrowRightCircle, color: "bg-green-600" },
] as const;

const DATA_SOURCES = [
  { value: "rollover_data", label: "Rollover Data" },
  { value: "purchased_database", label: "Purchased Database" },
  { value: "corporate_data", label: "Corporate Data" },
  { value: "marketing_campaign", label: "Marketing Campaign" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "website_lead", label: "Website Lead" },
  { value: "other", label: "Other" },
];

type Prospect = {
  id: string;
  phone: string;
  customer_name: string | null;
  email: string | null;
  vehicle_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  policy_type: string | null;
  expiry_date: string | null;
  insurer: string | null;
  premium_amount: number | null;
  city: string | null;
  prospect_status: string;
  data_source: string;
  is_grabyourcar_customer: boolean | null;
  duplicate_of_client_id: string | null;
  last_contacted_at: string | null;
  next_callback_at: string | null;
  call_count: number | null;
  notes: string | null;
  converted_to_lead_id: string | null;
  converted_at: string | null;
  created_at: string;
};

export function InsuranceProspectPool() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"active" | "lost">("active");
  const [addOpen, setAddOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState<Prospect | null>(null);
  const [detailOpen, setDetailOpen] = useState<Prospect | null>(null);
  const [remarkOpen, setRemarkOpen] = useState<Prospect | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [wonOpen, setWonOpen] = useState<Prospect | null>(null);
  const [wonPolicyNumber, setWonPolicyNumber] = useState("");
  const [wonInsurer, setWonInsurer] = useState("");
  const [wonPremium, setWonPremium] = useState("");
  const [wonExpiryDate, setWonExpiryDate] = useState("");
  const [wonDocFile, setWonDocFile] = useState<File | null>(null);
  const wonDocRef = useRef<HTMLInputElement>(null);
  const [lostOpen, setLostOpen] = useState<Prospect | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [duplicateAlert, setDuplicateAlert] = useState<{ prospect: any; existingClient: any } | null>(null);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const pageSize = 20;
  const rcLookup = useRCLookup({ showToast: false });
  const [form, setForm] = useState({
    phone: "", customer_name: "", email: "", vehicle_number: "",
    vehicle_make: "", vehicle_model: "", policy_type: "comprehensive",
    expiry_date: "", insurer: "", premium_amount: "",
    data_source: "website_lead", notes: "", city: "",
  });

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["insurance-prospects"],
    queryFn: async () => {
      const { count } = await supabase.from("insurance_prospects").select("*", { count: "exact", head: true });
      const total = count || 0;
      const allData: Prospect[] = [];
      const batchSize = 1000;
      for (let i = 0; i < total; i += batchSize) {
        const { data, error } = await supabase
          .from("insurance_prospects")
          .select("*")
          .order("created_at", { ascending: false })
          .range(i, i + batchSize - 1);
        if (error) throw error;
        allData.push(...(data as Prospect[]));
      }
      return allData;
    },
  });

  // Split active vs lost
  const activeProspects = useMemo(() => prospects.filter(p => p.prospect_status !== "lost" && p.prospect_status !== "won" && p.prospect_status !== "converted"), [prospects]);
  const lostProspects = useMemo(() => prospects.filter(p => p.prospect_status === "lost"), [prospects]);
  const wonProspects = useMemo(() => prospects.filter(p => p.prospect_status === "won" || p.prospect_status === "converted"), [prospects]);

  const currentList = activeTab === "active" ? activeProspects : lostProspects;

  const filtered = useMemo(() => {
    return currentList.filter((p) => {
      const matchSearch = !search ||
        p.phone?.includes(search) ||
        p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.vehicle_number?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.prospect_status === statusFilter;
      const matchSource = sourceFilter === "all" || p.data_source === sourceFilter;
      const matchCity = cityFilter === "all" || (p.city?.toLowerCase() === cityFilter.toLowerCase());
      return matchSearch && matchStatus && matchSource && matchCity;
    });
  }, [currentList, search, statusFilter, sourceFilter, cityFilter]);

  const uniqueCities = useMemo(() => {
    const cities = [...new Set(prospects.map(p => p.city).filter(Boolean))] as string[];
    return cities.sort();
  }, [prospects]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const stats = useMemo(() => ({
    total: prospects.length,
    new: prospects.filter(p => p.prospect_status === "new").length,
    contacted: prospects.filter(p => p.prospect_status === "contacted").length,
    interested: prospects.filter(p => p.prospect_status === "interested").length,
    won: wonProspects.length,
    lost: lostProspects.length,
    followUp: prospects.filter(p => p.prospect_status === "callback" || p.prospect_status === "follow_up").length,
  }), [prospects, wonProspects, lostProspects]);

  const checkDuplicate = async (phone: string) => {
    const cleaned = phone.replace(/\D/g, "").slice(-10);
    if (cleaned.length < 10) return null;
    const { data } = await supabase.from("insurance_clients").select("id, customer_name, phone").eq("phone", cleaned).limit(1);
    return data?.length ? data[0] : null;
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const cleaned = form.phone.replace(/\D/g, "").slice(-10);
      if (cleaned.length < 10) throw new Error("Invalid phone number");
      const existing = await checkDuplicate(cleaned);
      if (existing) { setDuplicateAlert({ prospect: form, existingClient: existing }); throw new Error("DUPLICATE"); }
      const { error } = await supabase.from("insurance_prospects").insert({
        phone: cleaned, customer_name: form.customer_name || null, email: form.email || null,
        vehicle_number: form.vehicle_number || null, vehicle_make: form.vehicle_make || null,
        vehicle_model: form.vehicle_model || null, policy_type: form.policy_type || null,
        expiry_date: form.expiry_date || null, insurer: form.insurer || null,
        premium_amount: form.premium_amount ? Number(form.premium_amount) : null,
        data_source: form.data_source as any, notes: form.notes || null, city: form.city || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prospect added"); qc.invalidateQueries({ queryKey: ["insurance-prospects"] }); setAddOpen(false);
      setForm({ phone: "", customer_name: "", email: "", vehicle_number: "", vehicle_make: "", vehicle_model: "", policy_type: "comprehensive", expiry_date: "", insurer: "", premium_amount: "", data_source: "website_lead", notes: "", city: "" });
    },
    onError: (e: any) => { if (e.message !== "DUPLICATE") toast.error(e.message); },
  });

  // Update status
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const prospect = prospects.find(p => p.id === id);
      const updates: any = { prospect_status: status, last_contacted_at: new Date().toISOString(), call_count: (prospect?.call_count || 0) + 1 };
      if (notes) updates.notes = notes;
      const { error } = await supabase.from("insurance_prospects").update(updates).eq("id", id);
      if (error) throw error;
      await supabase.from("insurance_prospect_activity").insert({ prospect_id: id, activity_type: "status_change", title: `Status → ${status}`, description: notes || `Marked as ${status}` });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insurance-prospects"] }),
  });

  // Save remark
  const saveRemark = async () => {
    if (!remarkOpen) return;
    const currentNotes = remarkOpen.notes || "";
    const timestamp = format(new Date(), "dd MMM yyyy HH:mm");
    const updatedNotes = `[${timestamp}] ${remarkText}\n${currentNotes}`;
    await supabase.from("insurance_prospects").update({ notes: updatedNotes, last_contacted_at: new Date().toISOString() }).eq("id", remarkOpen.id);
    await supabase.from("insurance_prospect_activity").insert({ prospect_id: remarkOpen.id, activity_type: "remark", title: "Remark Added", description: remarkText });
    qc.invalidateQueries({ queryKey: ["insurance-prospects"] });
    toast.success("Remark saved");
    setRemarkOpen(null); setRemarkText("");
  };

  const handleWon = async () => {
    if (!wonOpen) return;
    if (!wonPolicyNumber.trim() || !wonInsurer.trim() || !wonExpiryDate) {
      toast.error("Fill policy number, insurer, and expiry date");
      return;
    }
    if (!wonDocFile) {
      toast.error("Please attach the policy document (PDF/Image)");
      return;
    }
    try {
      // Upload document
      const fileExt = wonDocFile.name.split(".").pop() || "pdf";

      // Insert into insurance_clients
      const premium = wonPremium ? parseFloat(wonPremium) : null;
      const { data: newClient, error } = await supabase.from("insurance_clients").insert({
        phone: wonOpen.phone, customer_name: wonOpen.customer_name || null, email: wonOpen.email || null,
        vehicle_number: wonOpen.vehicle_number || null, vehicle_make: wonOpen.vehicle_make || null,
        vehicle_model: wonOpen.vehicle_model || null, current_policy_type: wonOpen.policy_type || null,
        lead_source: wonOpen.data_source, notes: wonOpen.notes || null, lead_status: "won",
        pipeline_stage: "policy_issued",
        current_policy_number: wonPolicyNumber.trim().toUpperCase(),
        current_insurer: wonInsurer.trim(),
        current_premium: premium,
        policy_expiry_date: wonExpiryDate,
      }).select("id").single();
      if (error) throw error;

      // Upload doc to storage
      const storagePath = `${newClient.id}/${wonPolicyNumber.trim()}_policy.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from("policy-documents").upload(storagePath, wonDocFile, { upsert: true });
      if (uploadErr) throw new Error("Document upload failed: " + uploadErr.message);
      const { data: pubUrl } = supabase.storage.from("policy-documents").getPublicUrl(storagePath);
      const policyDocumentUrl = pubUrl.publicUrl;

      // Create policy record
      const startDate = format(new Date(), "yyyy-MM-dd");
      await supabase.from("insurance_policies").insert({
        client_id: newClient.id,
        policy_number: wonPolicyNumber.trim().toUpperCase(),
        insurer: wonInsurer.trim(),
        premium_amount: premium,
        start_date: startDate,
        expiry_date: wonExpiryDate,
        status: "active",
        issued_date: startDate,
        booking_date: startDate,
        source_label: "Won (Prospect)",
        policy_document_url: policyDocumentUrl,
        policy_type: wonOpen.policy_type || "comprehensive",
      } as any);

      // Update prospect as won
      await supabase.from("insurance_prospects").update({
        prospect_status: "won", converted_to_lead_id: newClient.id, converted_at: new Date().toISOString(),
      }).eq("id", wonOpen.id);

      await supabase.from("insurance_prospect_activity").insert({ prospect_id: wonOpen.id, activity_type: "won", title: "🏆 Lead Won!", description: "Converted to active client with policy" });
      await supabase.from("insurance_activity_log").insert({ client_id: newClient.id, activity_type: "lead_created", title: "Won from Prospect Pool", description: `Policy ${wonPolicyNumber} by ${wonInsurer}`, metadata: { prospect_id: wonOpen.id } });

      // Auto WhatsApp send with document
      const customerName = wonOpen.customer_name || "Customer";
      const phone = wonOpen.phone;
      if (phone && !phone.startsWith("IB_")) {
        try {
          const premiumLabel = premium ? `₹${Number(premium).toLocaleString("en-IN")}` : "";
          const expiryLabel = format(new Date(wonExpiryDate), "dd MMM yyyy");
          const vehicleNum = wonOpen.vehicle_number || "";
          const policyMsg = `Hello ${customerName} 🙏\n\nHere is your motor insurance policy document from Grabyourcar Insurance.\n\n📋 Policy No: *${wonPolicyNumber.trim().toUpperCase()}*\n🏢 Insurer: *${wonInsurer.trim()}*\n${vehicleNum ? `🚗 Vehicle: *${vehicleNum}*\n` : ""}${premiumLabel ? `💰 Premium: *${premiumLabel}*\n` : ""}📅 Valid till: *${expiryLabel}*\n\nWe are just a click away — ask and command us anything, anytime! 💚\n\n📞 +91 98559 24442\n🔗 https://www.grabyourcar.com/insurance\n\n— *Team Grabyourcar* 🚗`;

          const waResult = await sendWhatsApp({
            phone,
            message: policyMsg,
            messageType: "document",
            mediaUrl: policyDocumentUrl,
            mediaFileName: `${wonPolicyNumber.trim()}_policy.${fileExt}`,
            name: customerName,
            logEvent: "prospect_won_auto_send",
            silent: true,
          });
          if (waResult.success) {
            toast.success("🏆 Lead Won! Policy document sent on WhatsApp");
          } else {
            toast.success("🏆 Lead Won! (WhatsApp send failed — share manually)");
          }
        } catch {
          toast.success("🏆 Lead Won! (WhatsApp send failed — share manually)");
        }
      } else {
        toast.success("🏆 Lead Won! Client created successfully");
      }

      qc.invalidateQueries({ queryKey: ["insurance-prospects"] });
      qc.invalidateQueries({ queryKey: ["ins-clients"] });
      setWonOpen(null);
      setWonDocFile(null);
      setWonPolicyNumber("");
      setWonInsurer("");
      setWonPremium("");
      setWonExpiryDate("");
    } catch (e: any) { toast.error(e.message); }
  };

  // Lost
  const handleLost = async () => {
    if (!lostOpen) return;
    const timestamp = format(new Date(), "dd MMM yyyy HH:mm");
    const updatedNotes = `[${timestamp}] ❌ LOST: ${lostReason}\n${lostOpen.notes || ""}`;
    await supabase.from("insurance_prospects").update({ prospect_status: "lost", notes: updatedNotes, last_contacted_at: new Date().toISOString() }).eq("id", lostOpen.id);
    await supabase.from("insurance_prospect_activity").insert({ prospect_id: lostOpen.id, activity_type: "lost", title: "Lead Lost", description: lostReason });
    qc.invalidateQueries({ queryKey: ["insurance-prospects"] });
    toast.info("Lead marked as lost");
    setLostOpen(null); setLostReason("");
  };

  // Delete prospect
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("insurance_prospect_activity").delete().eq("prospect_id", id);
      const { error } = await supabase.from("insurance_prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["insurance-prospects"] }); toast.success("Prospect deleted"); },
  });

  // Convert to Lead (existing flow)
  const convertMutation = useMutation({
    mutationFn: async (prospect: Prospect) => {
      const { data: newClient, error } = await supabase.from("insurance_clients").insert({
        phone: prospect.phone, customer_name: prospect.customer_name || null, email: prospect.email || null,
        vehicle_number: prospect.vehicle_number || null, vehicle_make: prospect.vehicle_make || null,
        vehicle_model: prospect.vehicle_model || null, current_policy_type: prospect.policy_type || null,
        lead_source: prospect.data_source, notes: prospect.notes || null,
      }).select("id").single();
      if (error) throw error;
      await supabase.from("insurance_prospects").update({ prospect_status: "converted", converted_to_lead_id: newClient.id, converted_at: new Date().toISOString() }).eq("id", prospect.id);
      await supabase.from("insurance_prospect_activity").insert({ prospect_id: prospect.id, activity_type: "converted", title: "Converted to Lead", description: "Prospect converted to qualified lead", metadata: { lead_id: newClient.id } });
    },
    onSuccess: () => { toast.success("Converted to lead!"); qc.invalidateQueries({ queryKey: ["insurance-prospects"] }); qc.invalidateQueries({ queryKey: ["ins-clients"] }); setConvertOpen(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(x => x.value === status);
    if (!s) return <Badge variant="outline">{status}</Badge>;
    return <Badge className={`${s.color} text-white text-[10px] px-2`}>{s.label}</Badge>;
  };

  const getSourceLabel = (src: string) => DATA_SOURCES.find(d => d.value === src)?.label || src;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {[
          { label: "Total", value: stats.total, color: "text-primary", icon: Database },
          { label: "New", value: stats.new, color: "text-blue-500", icon: Plus },
          { label: "Contacted", value: stats.contacted, color: "text-sky-500", icon: PhoneCall },
          { label: "Interested", value: stats.interested, color: "text-emerald-500", icon: Target },
          { label: "Follow Up", value: stats.followUp, color: "text-purple-500", icon: Clock },
          { label: "Won 🏆", value: stats.won, color: "text-green-600", icon: Trophy },
          { label: "Lost", value: stats.lost, color: "text-red-500", icon: XCircle },
        ].map(s => (
          <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="pt-2 pb-2 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-0.5 ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Switch: Active / Lost */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-1">
          <Button size="sm" variant={activeTab === "active" ? "default" : "outline"} className="h-8 text-xs gap-1.5"
            onClick={() => { setActiveTab("active"); setPage(0); setStatusFilter("all"); }}>
            <Flame className="h-3.5 w-3.5" /> Active Prospects
            <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">{activeProspects.length}</Badge>
          </Button>
          <Button size="sm" variant={activeTab === "lost" ? "destructive" : "outline"} className="h-8 text-xs gap-1.5"
            onClick={() => { setActiveTab("lost"); setPage(0); setStatusFilter("all"); }}>
            <XCircle className="h-3.5 w-3.5" /> Lost Leads
            <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">{lostProspects.length}</Badge>
          </Button>
        </div>

        <div className="flex gap-2">
          <BulkProspectImportButton />
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Prospect
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search phone, name, vehicle..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9" />
        </div>
        {activeTab === "active" && (
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] h-9"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.filter(s => s.value !== "won" && s.value !== "lost" && s.value !== "converted").map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-9"><Database className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {DATA_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {uniqueCities.length > 0 && (
          <Select value={cityFilter} onValueChange={v => { setCityFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All Cities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Prospect Data Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {activeTab === "active" ? (
              <><Database className="h-4 w-4 text-primary" /> Prospect Data — Cold Calling CRM</>
            ) : (
              <><XCircle className="h-4 w-4 text-destructive" /> Lost Leads Archive</>
            )}
          </CardTitle>
          <CardDescription>
            {activeTab === "active" ? "Call, follow up, add remarks, and convert prospects." : "Leads that didn't convert. Review for re-engagement."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <p className="text-sm text-muted-foreground py-12 text-center">Loading prospects...</p> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card z-10 border-b">
                    <tr className="bg-muted/30">
                      <th className="text-left py-2.5 px-3 font-medium text-xs w-8">#</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Phone</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Name</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Status</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Source</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs hidden md:table-cell">Vehicle / Model</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs hidden md:table-cell">City</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs hidden lg:table-cell">Calls</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs hidden lg:table-cell">Last Remark</th>
                      <th className="text-left py-2.5 px-3 font-medium text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((p, i) => (
                      <tr key={p.id} className={`border-b hover:bg-muted/20 transition-colors ${p.prospect_status === "interested" ? "bg-emerald-500/5" : ""} ${p.is_grabyourcar_customer ? "bg-amber-500/5" : ""}`}>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{page * pageSize + i + 1}</td>
                        <td className="py-2 px-3 font-mono text-xs">
                          <div className="flex items-center gap-1">
                            {p.is_grabyourcar_customer && <Badge className="bg-green-600 text-white text-[8px] px-1">GYC</Badge>}
                            <a href={`tel:${p.phone}`} className="text-primary hover:underline">{p.phone}</a>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <button onClick={() => setDetailOpen(p)} className="text-primary hover:underline text-left font-medium text-sm">
                            {p.customer_name || "—"}
                          </button>
                        </td>
                        <td className="py-2 px-3">{getStatusBadge(p.prospect_status)}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{getSourceLabel(p.data_source)}</td>
                        <td className="py-2 px-3 hidden md:table-cell text-xs font-mono">{p.vehicle_number || p.vehicle_model || "—"}</td>
                        <td className="py-2 px-3 hidden md:table-cell text-xs text-muted-foreground">{p.city || "—"}</td>
                        <td className="py-2 px-3 hidden lg:table-cell">
                          <Badge variant="secondary" className="text-xs">{p.call_count || 0}</Badge>
                        </td>
                        <td className="py-2 px-3 hidden lg:table-cell text-xs text-muted-foreground max-w-[150px] truncate" title={p.notes || ""}>
                          {p.notes ? p.notes.split("\n")[0].slice(0, 40) : "—"}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {/* Call & WhatsApp */}
                            <a href={`tel:${p.phone}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Call">
                                <PhoneCall className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                            </a>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="WhatsApp" onClick={() => {
                              void sendWhatsApp({
                                phone: p.phone,
                                message: `🙏 Namaste ${p.customer_name || "Sir/Madam"},\n\nThis is *Grabyourcar Insurance* team.\n\nWe wanted to follow up regarding your motor insurance${p.vehicle_number ? ` for vehicle *${p.vehicle_number}*` : ""}.\n\n✅ We can help you with the best rates!\n\n👉 *Reply here* or call us at +91 98559 24442\n🔗 https://www.grabyourcar.com/insurance\n\n— *Team Grabyourcar* 🚗💚`,
                                name: p.customer_name || undefined,
                                logEvent: "prospect_pool_whatsapp",
                              });
                            }}>
                              <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                            </Button>

                            {/* Add Remark */}
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Add Remark"
                              onClick={() => { setRemarkOpen(p); setRemarkText(""); }}>
                              <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                            </Button>

                            {/* View */}
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details" onClick={() => setDetailOpen(p)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {activeTab === "active" && p.prospect_status !== "converted" && p.prospect_status !== "won" && (
                              <>
                                {/* Status Dropdown */}
                                <Select onValueChange={v => statusMutation.mutate({ id: p.id, status: v })}>
                                  <SelectTrigger className="h-7 w-7 p-0 border-0 [&>svg]:hidden">
                                    <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUSES.filter(s => s.value !== "won" && s.value !== "lost" && s.value !== "converted").map(s => (
                                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {/* Won Button */}
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark Won" onClick={() => setWonOpen(p)}>
                                  <Trophy className="h-3.5 w-3.5 text-green-600" />
                                </Button>

                                {/* Lost Button */}
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark Lost" onClick={() => { setLostOpen(p); setLostReason(""); }}>
                                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                                </Button>

                                {/* Convert (for interested/contacted) */}
                                {(p.prospect_status === "interested" || p.prospect_status === "contacted") && (
                                  <Button variant="default" size="sm" className="h-7 text-[10px] px-2 bg-green-600 hover:bg-green-700" onClick={() => setConvertOpen(p)}>
                                    <ArrowRightCircle className="h-3 w-3 mr-1" /> Convert
                                  </Button>
                                )}
                              </>
                            )}

                            {/* Delete */}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete"
                              onClick={() => { if (confirm("Delete this prospect?")) deleteMutation.mutate(p.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && <p className="text-sm text-muted-foreground text-center py-12">No prospects found</p>}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <span>{filtered.length === 0 ? "No entries" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Add Remark Dialog ── */}
      <Dialog open={!!remarkOpen} onOpenChange={() => setRemarkOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5 text-amber-500" /> Add Remark</DialogTitle>
            <DialogDescription>{remarkOpen?.customer_name || remarkOpen?.phone}</DialogDescription>
          </DialogHeader>
          {remarkOpen?.notes && (
            <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto text-xs whitespace-pre-wrap border">
              <p className="text-[10px] text-muted-foreground mb-1 font-medium">Previous Remarks:</p>
              {remarkOpen.notes}
            </div>
          )}
          <Textarea value={remarkText} onChange={e => setRemarkText(e.target.value)} placeholder="Enter your remark / call notes..." rows={3} />
          <div className="flex gap-2">
            <Select onValueChange={v => statusMutation.mutate({ id: remarkOpen!.id, status: v, notes: remarkText })}>
              <SelectTrigger className="flex-1 h-9 text-xs"><SelectValue placeholder="Update status (optional)" /></SelectTrigger>
              <SelectContent>
                {STATUSES.filter(s => s.value !== "won" && s.value !== "lost" && s.value !== "converted").map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarkOpen(null)}>Cancel</Button>
            <Button onClick={saveRemark} disabled={!remarkText.trim()}>Save Remark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Won Dialog ── */}
      <Dialog open={!!wonOpen} onOpenChange={() => { setWonOpen(null); setWonDocFile(null); setWonPolicyNumber(""); setWonInsurer(""); setWonPremium(""); setWonExpiryDate(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-green-600" /> Mark as Won 🏆</DialogTitle>
            <DialogDescription>Create client with policy and auto-send document on WhatsApp.</DialogDescription>
          </DialogHeader>
          {wonOpen && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Name:</strong> {wonOpen.customer_name || "—"}</p>
                <p><strong>Phone:</strong> {wonOpen.phone}</p>
                <p><strong>Vehicle:</strong> {wonOpen.vehicle_number || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Policy Number *</Label>
                  <Input value={wonPolicyNumber} onChange={e => setWonPolicyNumber(e.target.value.toUpperCase())} placeholder="e.g. OG-24-5678" className="h-9 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Insurer *</Label>
                  <Input value={wonInsurer} onChange={e => setWonInsurer(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Premium (₹)</Label>
                  <Input type="number" value={wonPremium} onChange={e => setWonPremium(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expiry Date *</Label>
                  <Input type="date" value={wonExpiryDate} min={format(new Date(), "yyyy-MM-dd")} onChange={e => setWonExpiryDate(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Policy Document (PDF/Image) *</Label>
                <input ref={wonDocRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setWonDocFile(e.target.files?.[0] || null)} className="block w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
                {wonDocFile && <p className="text-[10px] text-emerald-600">📎 {wonDocFile.name}</p>}
              </div>
              <p className="text-[10px] text-muted-foreground">📲 Policy document will be auto-sent to customer on WhatsApp</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWonOpen(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleWon} disabled={!wonPolicyNumber.trim() || !wonInsurer.trim() || !wonExpiryDate || !wonDocFile}>🏆 Confirm Won</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lost Dialog ── */}
      <Dialog open={!!lostOpen} onOpenChange={() => setLostOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /> Mark as Lost</DialogTitle>
            <DialogDescription>This will move the prospect to the Lost Leads section.</DialogDescription>
          </DialogHeader>
          {lostOpen && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p><strong>{lostOpen.customer_name || "—"}</strong> — {lostOpen.phone}</p>
              </div>
              <div>
                <Label className="text-xs">Lost Reason *</Label>
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bought from competitor">Bought from competitor</SelectItem>
                    <SelectItem value="Too expensive">Too expensive</SelectItem>
                    <SelectItem value="Not interested anymore">Not interested anymore</SelectItem>
                    <SelectItem value="No response after multiple calls">No response</SelectItem>
                    <SelectItem value="Wrong / Invalid contact">Wrong contact</SelectItem>
                    <SelectItem value="Already insured elsewhere">Already insured</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOpen(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleLost} disabled={!lostReason}>Mark as Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Convert Dialog ── */}
      <Dialog open={!!convertOpen} onOpenChange={() => setConvertOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightCircle className="h-5 w-5 text-green-600" /> Convert to Qualified Lead</DialogTitle>
            <DialogDescription>Creates a lead in Insurance CRM and preserves history.</DialogDescription>
          </DialogHeader>
          {convertOpen && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Name:</strong> {convertOpen.customer_name || "—"}</p>
                <p><strong>Phone:</strong> {convertOpen.phone}</p>
                <p><strong>Vehicle:</strong> {convertOpen.vehicle_number || "—"}</p>
                <p><strong>Calls:</strong> {convertOpen.call_count || 0}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => convertOpen && convertMutation.mutate(convertOpen)} disabled={convertMutation.isPending}>
              {convertMutation.isPending ? "Converting..." : "Convert to Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Prospect Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Prospect</DialogTitle>
            <DialogDescription>Add to prospect pool for cold calling.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="10-digit mobile" /></div>
              <div><Label className="text-xs">Name</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vehicle Number</Label>
                <div className="flex gap-1">
                  <Input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value.toUpperCase() }))} placeholder="DL01AB1234" />
                  <Button
                    type="button" variant="outline" size="sm"
                    disabled={rcLookup.loading || !form.vehicle_number.trim()}
                    className="shrink-0 h-9 px-2"
                    onClick={() => {
                      rcLookup.lookup(form.vehicle_number).then((result) => {
                        if (result) {
                          setForm(f => ({
                            ...f,
                            customer_name: (result.owner_name && result.owner_name !== "N/A") ? result.owner_name : f.customer_name,
                            vehicle_make: result.maker_model?.split(" ")[0] || f.vehicle_make,
                            vehicle_model: result.maker_model?.split(" ").slice(1).join(" ") || f.vehicle_model,
                            insurer: result.insurance_company || f.insurer,
                            expiry_date: result.insurance_expiry || f.expiry_date,
                          }));
                          toast.success("Vehicle details auto-filled!");
                        }
                      });
                    }}
                  >
                    {rcLookup.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Car className="h-3 w-3" />}
                  </Button>
                </div>
                {rcLookup.error && <p className="text-[10px] text-destructive mt-0.5">{rcLookup.error}</p>}
              </div>
              <div>
                <Label className="text-xs">Insurer</Label>
                {form.insurer && !INSURANCE_COMPANIES.includes(form.insurer) ? (
                  <div className="flex gap-1 items-center">
                    <Input value={form.insurer} onChange={e => setForm(f => ({ ...f, insurer: e.target.value }))} className="h-9 text-sm flex-1" placeholder="Type custom insurer name" data-custom-insurer />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setForm(f => ({ ...f, insurer: "" }))} title="Clear">
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Select value={form.insurer || ""} onValueChange={v => {
                    if (v === "__add_custom__") {
                      setForm(f => ({ ...f, insurer: " " }));
                    } else {
                      setForm(f => ({ ...f, insurer: v }));
                    }
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select insurer" /></SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {INSURANCE_COMPANIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      <SelectItem value="__add_custom__">+ Add Custom Company</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Premium ₹</Label><Input type="number" value={form.premium_amount} onChange={e => setForm(f => ({ ...f, premium_amount: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="text-xs">Data Source *</Label>
              <Select value={form.data_source} onValueChange={v => setForm(f => ({ ...f, data_source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DATA_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Checking..." : "Add Prospect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Duplicate Alert ── */}
      <Dialog open={!!duplicateAlert} onOpenChange={() => setDuplicateAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Existing Customer Found!</DialogTitle>
          </DialogHeader>
          {duplicateAlert && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Existing: {duplicateAlert.existingClient.customer_name}</p>
              <p className="text-sm font-mono">{duplicateAlert.existingClient.phone}</p>
              <p className="text-xs text-muted-foreground">Do NOT cold-call existing customers.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateAlert(null)}>Close</Button>
            <Button variant="secondary" onClick={() => {
              const cleaned = duplicateAlert!.prospect.phone.replace(/\D/g, "").slice(-10);
              supabase.from("insurance_prospects").insert({ ...duplicateAlert!.prospect, phone: cleaned, is_grabyourcar_customer: true, duplicate_of_client_id: duplicateAlert!.existingClient.id, prospect_status: "duplicate" }).then(() => { qc.invalidateQueries({ queryKey: ["insurance-prospects"] }); toast.info("Added with duplicate flag"); });
              setDuplicateAlert(null); setAddOpen(false);
            }}>Add with Duplicate Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Prospect Details
            </DialogTitle>
          </DialogHeader>
          {detailOpen && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{detailOpen.customer_name || "Unknown"}</h3>
                {getStatusBadge(detailOpen.prospect_status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground text-xs">Phone</span><p className="font-medium">{detailOpen.phone}</p></div>
                <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium">{detailOpen.email || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">City</span><p className="font-medium">{detailOpen.city || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Source</span><p className="font-medium">{getSourceLabel(detailOpen.data_source)}</p></div>
                <div><span className="text-muted-foreground text-xs">Vehicle</span><p className="font-mono font-medium">{detailOpen.vehicle_number || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Insurer</span><p className="font-medium">{detailOpen.insurer || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Premium</span><p className="font-medium">{detailOpen.premium_amount ? `₹${detailOpen.premium_amount.toLocaleString()}` : "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Total Calls</span><p className="font-medium">{detailOpen.call_count || 0}</p></div>
                <div><span className="text-muted-foreground text-xs">Expiry</span><p className="font-medium">{detailOpen.expiry_date || "—"}</p></div>
                <div><span className="text-muted-foreground text-xs">Last Contact</span><p className="font-medium">{detailOpen.last_contacted_at ? format(new Date(detailOpen.last_contacted_at), "dd MMM yyyy") : "—"}</p></div>
              </div>

              {/* Remarks / Notes */}
              {detailOpen.notes && (
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">📝 Remarks & Notes</p>
                  <pre className="text-xs whitespace-pre-wrap">{detailOpen.notes}</pre>
                </div>
              )}

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 py-2 border-y">
                <a href={`tel:${detailOpen.phone}`}><Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"><PhoneCall className="h-3.5 w-3.5" /> Call</Button></a>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                  void sendWhatsApp({
                    phone: detailOpen.phone,
                    message: `🙏 Namaste ${detailOpen.customer_name || "Sir/Madam"},\n\nThis is *Grabyourcar Insurance* team.\n\nWe wanted to follow up regarding your motor insurance${detailOpen.vehicle_number ? ` for vehicle *${detailOpen.vehicle_number}*` : ""}.\n\n✅ We can help you with the best rates!\n\n👉 *Reply here* or call us at +91 98559 24442\n🔗 https://www.grabyourcar.com/insurance\n\n— *Team Grabyourcar* 🚗💚`,
                    name: detailOpen.customer_name || undefined,
                    logEvent: "prospect_pool_detail_whatsapp",
                  });
                }}><MessageSquare className="h-3.5 w-3.5 text-green-600" /> WhatsApp</Button>
                {detailOpen.email && <a href={`mailto:${detailOpen.email}`}><Button size="sm" variant="outline" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Button></a>}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setDetailOpen(null); setRemarkOpen(detailOpen); setRemarkText(""); }}>
                  <StickyNote className="h-3.5 w-3.5 text-amber-500" /> Add Remark
                </Button>
              </div>

              {detailOpen.prospect_status !== "converted" && detailOpen.prospect_status !== "won" && detailOpen.prospect_status !== "lost" && (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => { setDetailOpen(null); setWonOpen(detailOpen); }}>
                    <Trophy className="h-4 w-4 mr-2" /> Won
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => { setDetailOpen(null); setLostOpen(detailOpen); setLostReason(""); }}>
                    <XCircle className="h-4 w-4 mr-2" /> Lost
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setDetailOpen(null); setConvertOpen(detailOpen); }}>
                    <ArrowRightCircle className="h-4 w-4 mr-2" /> Convert
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
