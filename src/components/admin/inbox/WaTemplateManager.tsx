import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Edit, Trash2, Copy, Zap, LayoutTemplate, Save, CheckCircle, Clock, XCircle,
  AlertTriangle, IndianRupee, Eye, Send, MessageSquare, Shield, Megaphone,
  FileText, Image, Video, Globe, Search, Filter, RefreshCw, BarChart3,
  GitBranch, TrendingUp, Phone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Types & Constants ---
const META_CATEGORIES = {
  utility: { label: "Utility", icon: <Zap className="h-3.5 w-3.5" />, color: "bg-blue-500/10 text-blue-700 border-blue-200", pricing: "₹0.35/msg", freeInWindow: true },
  authentication: { label: "Auth", icon: <Shield className="h-3.5 w-3.5" />, color: "bg-green-500/10 text-green-700 border-green-200", pricing: "₹0.30/msg", freeInWindow: false },
  marketing: { label: "Marketing", icon: <Megaphone className="h-3.5 w-3.5" />, color: "bg-orange-500/10 text-orange-700 border-orange-200", pricing: "₹0.80/msg", freeInWindow: false },
  service: { label: "Service", icon: <MessageSquare className="h-3.5 w-3.5" />, color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", pricing: "FREE", freeInWindow: true },
} as const;
type MetaCategory = keyof typeof META_CATEGORIES;

interface Template {
  id: string; name: string; display_name: string | null; category: string; language: string;
  body: string; header_type: string | null; header_content: string | null; footer: string | null;
  variables: any; buttons: any; status: string; vertical: string | null;
  meta_template_id: string | null; meta_rejection_reason: string | null; created_at: string;
  sent_count: number; delivered_count: number; read_count: number; failed_count: number;
  replied_count: number; ab_variant_of: string | null; ab_variant_label: string | null;
  conversion_rate: number; last_sent_at: string | null;
}

interface QuickReply {
  id: string; title: string; shortcut: string | null; message: string;
  variables: string[] | null; category: string; vertical: string | null; is_active: boolean;
}

const COMMON_VARS = ["customer_name", "phone", "vehicle_number", "insurer", "premium", "expiry_date", "policy_number", "order_id", "amount", "date"];
const VERTICALS = ["Insurance", "Car Sales", "Self Drive", "HSRP", "Accessories", "Loans", "Marketing"];

// --- Phone Preview Component ---
function PhonePreview({ template }: { template: Partial<Template> }) {
  const sampleVars: Record<string, string> = {
    customer_name: "Rahul Sharma", phone: "9876543210", vehicle_number: "MH02AB1234",
    insurer: "HDFC ERGO", premium: "₹12,500", expiry_date: "15 Apr 2026",
    policy_number: "POL-2024-12345", order_id: "ORD-789", amount: "₹8,500", date: "11 Apr 2026",
  };

  const renderBody = (text: string) => text.replace(/\{\{(\w+)\}\}/g, (_, v) => sampleVars[v] || `[${v}]`);

  return (
    <div className="w-[280px] mx-auto">
      {/* Phone Frame */}
      <div className="bg-gray-900 rounded-[2rem] p-2 shadow-2xl">
        <div className="bg-gray-900 rounded-t-[1.5rem] pt-6 pb-1 px-4">
          <div className="flex items-center gap-2 text-white text-xs">
            <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">G</div>
            <div>
              <p className="font-medium text-sm">GrabYourCar</p>
              <p className="text-[10px] text-gray-400">Business Account</p>
            </div>
          </div>
        </div>
        <div className="bg-[#e5ddd5] rounded-b-[1.5rem] p-3 min-h-[320px] flex flex-col justify-end">
          <div className="bg-white rounded-lg p-2.5 shadow-sm max-w-[90%] ml-auto">
            {template.header_type === "text" && template.header_content && (
              <p className="font-bold text-xs mb-1">{template.header_content}</p>
            )}
            {template.header_type === "image" && (
              <div className="bg-gray-200 rounded h-24 flex items-center justify-center mb-2">
                <Image className="h-6 w-6 text-gray-400" />
              </div>
            )}
            {template.header_type === "video" && (
              <div className="bg-gray-800 rounded h-24 flex items-center justify-center mb-2">
                <Video className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <p className="text-[11px] whitespace-pre-wrap leading-relaxed">
              {renderBody(template.body || "Your message preview will appear here...")}
            </p>
            {template.footer && (
              <p className="text-[9px] text-gray-500 mt-1.5 border-t pt-1">{template.footer}</p>
            )}
            <p className="text-[9px] text-gray-400 text-right mt-1">
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
            </p>
          </div>
          {/* Category & Cost Badge */}
          <div className="flex items-center gap-1.5 mt-2 justify-end">
            {template.category && (
              <Badge variant="outline" className={cn("text-[8px]", META_CATEGORIES[template.category as MetaCategory]?.color)}>
                {META_CATEGORIES[template.category as MetaCategory]?.label}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Performance Stats Component ---
function TemplateStats({ template }: { template: Template }) {
  const total = template.sent_count || 1;
  const deliveryRate = total > 0 ? Math.round((template.delivered_count / total) * 100) : 0;
  const readRate = total > 0 ? Math.round((template.read_count / total) * 100) : 0;
  const replyRate = total > 0 ? Math.round((template.replied_count / total) * 100) : 0;
  const failRate = total > 0 ? Math.round((template.failed_count / total) * 100) : 0;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-5 gap-2 text-center">
        {[
          { label: "Sent", val: template.sent_count, color: "text-blue-600" },
          { label: "Delivered", val: template.delivered_count, color: "text-green-600" },
          { label: "Read", val: template.read_count, color: "text-cyan-600" },
          { label: "Replied", val: template.replied_count, color: "text-purple-600" },
          { label: "Failed", val: template.failed_count, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-muted/50 rounded p-1.5">
            <p className={cn("text-sm font-bold", s.color)}>{s.val}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span>Delivery</span><span className="font-mono">{deliveryRate}%</span>
        </div>
        <Progress value={deliveryRate} className="h-1.5" />
        <div className="flex items-center justify-between text-[10px]">
          <span>Read</span><span className="font-mono">{readRate}%</span>
        </div>
        <Progress value={readRate} className="h-1.5" />
        <div className="flex items-center justify-between text-[10px]">
          <span>Reply</span><span className="font-mono">{replyRate}%</span>
        </div>
        <Progress value={replyRate} className="h-1.5" />
      </div>
    </div>
  );
}

// --- Main Component ---
export function WaTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [mainTab, setMainTab] = useState("templates");
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Template & QuickReply> | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterVertical, setFilterVertical] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsTemplate, setStatsTemplate] = useState<Template | null>(null);
  const [abCompareOpen, setAbCompareOpen] = useState(false);
  const [abCompareTemplates, setAbCompareTemplates] = useState<Template[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [tRes, qRes] = await Promise.all([
      supabase.from("wa_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("wa_quick_replies").select("*").order("sort_order"),
    ]);
    setTemplates((tRes.data || []) as unknown as Template[]);
    setQuickReplies((qRes.data || []) as unknown as QuickReply[]);
  };

  const syncFromMeta = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", { body: { action: "sync_templates" } });
      if (error) throw error;
      toast.success(`Synced ${data?.synced || 0} templates from Meta`);
      await fetchAll();
    } catch (err: any) { toast.error(err.message || "Sync failed"); }
    finally { setIsSyncing(false); }
  };

  const submitToMeta = async (template: Template) => {
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", { body: { action: "submit_template", template_id: template.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Submitted to Meta ✅");
      await fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteFromMeta = async (template: Template) => {
    if (!confirm(`Delete "${template.display_name || template.name}" from Meta?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", { body: { action: "delete_template", template_name: template.name } });
      if (error) throw error;
      toast.success("Deleted from Meta");
      await fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const saveTemplate = async () => {
    if (!editItem?.name || !editItem?.body) { toast.error("Name and body required"); return; }
    const cleanName = editItem.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const payload: any = {
      name: cleanName, display_name: editItem.display_name || editItem.name,
      category: editItem.category || "utility", language: editItem.language || "en",
      body: editItem.body, header_type: editItem.header_type || null,
      header_content: editItem.header_content || null, footer: editItem.footer || null,
      variables: editItem.variables || [], buttons: editItem.buttons || [],
      status: editItem.status || "draft", vertical: editItem.vertical || null,
      ab_variant_of: editItem.ab_variant_of || null,
      ab_variant_label: editItem.ab_variant_label || null,
    };

    let savedId = editItem.id;
    if (editItem.id) {
      await supabase.from("wa_templates").update(payload).eq("id", editItem.id);
      toast.success("Template updated");
    } else {
      const { data: ins } = await supabase.from("wa_templates").insert(payload).select("id").single();
      savedId = ins?.id;
      toast.success("Template created as Draft");
    }
    setIsEditing(false); setEditItem(null); await fetchAll();

    if (savedId && (!editItem.id || editItem.status === "draft")) {
      toast.info("Auto-submitting to Meta…");
      try {
        const { data, error } = await supabase.functions.invoke("meta-templates", { body: { action: "submit_template", template_id: savedId } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Submitted to Meta ✅");
        await fetchAll();
      } catch (err: any) { toast.error("Saved locally, Meta submission failed: " + err.message); }
    }
  };

  const saveQuickReply = async () => {
    if (!editItem?.title || !(editItem as any)?.message) { toast.error("Title and message required"); return; }
    const payload = {
      title: editItem.title, shortcut: (editItem as any).shortcut || null,
      message: (editItem as any).message, variables: (editItem as any).variables || null,
      category: (editItem as any).category || "general", vertical: editItem.vertical || null,
      is_active: (editItem as any).is_active !== false,
    };
    if (editItem.id) {
      await supabase.from("wa_quick_replies").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("wa_quick_replies").insert(payload);
    }
    toast.success("Saved"); setIsEditing(false); setEditItem(null); fetchAll();
  };

  const deleteItem = async (id: string, type: "template" | "quick_reply") => {
    if (!confirm("Delete?")) return;
    await supabase.from(type === "template" ? "wa_templates" : "wa_quick_replies").delete().eq("id", id);
    toast.success("Deleted"); fetchAll();
  };

  const createAbVariant = (parentTemplate: Template) => {
    setEditItem({
      name: parentTemplate.name + "_b",
      display_name: (parentTemplate.display_name || parentTemplate.name) + " (Variant B)",
      category: parentTemplate.category,
      language: parentTemplate.language,
      body: parentTemplate.body,
      header_type: parentTemplate.header_type,
      header_content: parentTemplate.header_content,
      footer: parentTemplate.footer,
      vertical: parentTemplate.vertical,
      ab_variant_of: parentTemplate.id,
      ab_variant_label: "B",
    });
    setIsEditing(true);
  };

  const openAbCompare = (template: Template) => {
    const variants = templates.filter(t => t.ab_variant_of === template.id || t.id === template.id);
    setAbCompareTemplates(variants);
    setAbCompareOpen(true);
  };

  const insertVariable = (varName: string) => {
    if (!editItem) return;
    const key = mainTab === "templates" ? "body" : "message";
    setEditItem({ ...editItem, [key]: ((editItem as any)[key] || "") + `{{${varName}}}` });
  };

  const filteredTemplates = templates.filter(t => {
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterVertical !== "all" && t.vertical !== filterVertical) return false;
    if (searchQuery && !t.name.includes(searchQuery.toLowerCase()) && !(t.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getCatMeta = (cat: string) => META_CATEGORIES[cat as MetaCategory] || META_CATEGORIES.utility;
  const getStatusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
    if (s === "rejected") return <XCircle className="h-3.5 w-3.5 text-red-600" />;
    if (s === "pending") return <Clock className="h-3.5 w-3.5 text-yellow-600" />;
    return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const abParents = templates.filter(t => !t.ab_variant_of && templates.some(v => v.ab_variant_of === t.id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                Template Manager Pro
                <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">Meta Compliant</Badge>
              </h2>
              <p className="text-xs text-muted-foreground">Create, A/B test, and track template performance</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={syncFromMeta} disabled={isSyncing}>
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} /> {isSyncing ? "Syncing…" : "Sync Meta"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", val: templates.length, icon: LayoutTemplate, color: "text-primary" },
          { label: "Approved", val: templates.filter(t => t.status === "approved").length, icon: CheckCircle, color: "text-green-600" },
          { label: "Pending", val: templates.filter(t => t.status === "pending").length, icon: Clock, color: "text-yellow-600" },
          { label: "A/B Tests", val: abParents.length, icon: GitBranch, color: "text-purple-600" },
          { label: "Total Sent", val: templates.reduce((s, t) => s + (t.sent_count || 0), 0), icon: Send, color: "text-blue-600" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <s.icon className={cn("h-7 w-7", s.color)} />
              <div>
                <p className="text-xl font-bold">{s.val}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="templates" className="gap-1.5 text-xs"><LayoutTemplate className="h-3.5 w-3.5" /> Templates</TabsTrigger>
            <TabsTrigger value="quick_replies" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" /> Quick Replies</TabsTrigger>
            <TabsTrigger value="ab_testing" className="gap-1.5 text-xs"><GitBranch className="h-3.5 w-3.5" /> A/B Tests</TabsTrigger>
          </TabsList>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditItem({}); setIsEditing(true); }}>
            <Plus className="h-3.5 w-3.5" /> {mainTab === "quick_replies" ? "New Quick Reply" : "New Template"}
          </Button>
        </div>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-3">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-8 h-8 text-xs" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="authentication">Auth</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterVertical} onValueChange={setFilterVertical}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verticals</SelectItem>
                {VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px]">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-[220px]">Template</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No templates found</TableCell></TableRow>
                    ) : filteredTemplates.map(t => {
                      const catMeta = getCatMeta(t.category);
                      const hasVariants = templates.some(v => v.ab_variant_of === t.id);
                      const total = t.sent_count || 0;
                      const readPct = total > 0 ? Math.round((t.read_count / total) * 100) : 0;
                      return (
                        <TableRow key={t.id} className="group">
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm">{t.display_name || t.name}</p>
                                {t.ab_variant_label && (
                                  <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                                    <GitBranch className="h-2.5 w-2.5 mr-0.5" />{t.ab_variant_label}
                                  </Badge>
                                )}
                                {hasVariants && (
                                  <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                                    A/B
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono">{t.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.body}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]", catMeta.color)}>
                              {catMeta.icon}<span className="ml-1">{catMeta.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                {getStatusIcon(t.status)}
                                <span className="text-xs capitalize">{t.status}</span>
                              </div>
                              {t.status === "rejected" && t.meta_rejection_reason && (
                                <p className="text-[10px] text-destructive line-clamp-1 max-w-[150px]">{t.meta_rejection_reason}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {total > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="text-[10px]">
                                  <span className="font-medium">{total}</span> sent
                                </div>
                                <div className="w-16">
                                  <Progress value={readPct} className="h-1" />
                                </div>
                                <span className="text-[10px] text-muted-foreground">{readPct}% read</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Preview" onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}>
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Stats" onClick={() => { setStatsTemplate(t); setStatsOpen(true); }}>
                                <BarChart3 className="h-3.5 w-3.5" />
                              </Button>
                              {!t.ab_variant_of && t.status === "approved" && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-600" title="Create A/B Variant" onClick={() => createAbVariant(t)}>
                                  <GitBranch className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(t); setIsEditing(true); }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(t.body); toast.success("Copied!"); }}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              {t.status === "draft" || t.status === "rejected" ? (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" title="Submit to Meta" onClick={() => submitToMeta(t)}>
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                              ) : t.status === "approved" ? (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteFromMeta(t)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Replies Tab */}
        <TabsContent value="quick_replies" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickReplies.map(qr => (
              <Card key={qr.id} className="group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{qr.title}</CardTitle>
                    <Badge variant={qr.is_active ? "default" : "secondary"} className="text-[10px]">{qr.is_active ? "Active" : "Off"}</Badge>
                  </div>
                  {qr.shortcut && <Badge variant="outline" className="text-[9px] w-fit font-mono">/{qr.shortcut}</Badge>}
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{qr.message}</p>
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setMainTab("quick_replies"); setEditItem(qr as any); setIsEditing(true); }}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteItem(qr.id, "quick_reply")}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {quickReplies.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-8">No quick replies yet.</p>
            )}
          </div>
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="ab_testing" className="mt-3">
          {abParents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <GitBranch className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <div>
                  <p className="font-medium">No A/B Tests Yet</p>
                  <p className="text-sm text-muted-foreground">Create a variant of any approved template to start A/B testing</p>
                </div>
                <p className="text-xs text-muted-foreground">Go to Templates tab → hover over an approved template → click the <GitBranch className="inline h-3 w-3" /> icon</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {abParents.map(parent => {
                const variants = templates.filter(t => t.ab_variant_of === parent.id);
                const allVersions = [parent, ...variants];
                const bestPerf = allVersions.reduce((best, t) => (t.read_count > (best?.read_count || 0) ? t : best), allVersions[0]);
                return (
                  <Card key={parent.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-purple-600" />
                          {parent.display_name || parent.name}
                          <Badge variant="outline" className="text-[10px]">{allVersions.length} variants</Badge>
                        </CardTitle>
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => createAbVariant(parent)}>
                          <Plus className="h-3 w-3" /> Add Variant
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allVersions.map(t => (
                          <div key={t.id} className={cn(
                            "border rounded-lg p-3 space-y-2",
                            t.id === bestPerf?.id && t.sent_count > 0 && "border-green-300 bg-green-50/50 dark:bg-green-950/10"
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">
                                  {t.ab_variant_label || "A"}
                                </Badge>
                                <span className="text-xs font-medium truncate">{t.display_name || t.name}</span>
                              </div>
                              {t.id === bestPerf?.id && t.sent_count > 0 && (
                                <Badge className="text-[9px] bg-green-600">
                                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> Winner
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{t.body}</p>
                            <TemplateStats template={t} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog with Side-by-Side Phone Preview */}
      <Dialog open={isEditing} onOpenChange={(v) => { if (!v) { setIsEditing(false); setEditItem(null); } }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editItem?.id ? "Edit" : "Create"} {mainTab === "quick_replies" ? "Quick Reply" : "Template"}
              {editItem?.ab_variant_of && <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700"><GitBranch className="h-3 w-3 mr-1" />A/B Variant</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-6">
            {/* Form */}
            <div className="flex-1 space-y-4">
              {mainTab !== "quick_replies" ? (
                <>
                  {editItem?.category === "marketing" && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded-lg p-2 text-xs text-orange-700">
                      <p className="font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Marketing — ₹0.80/msg</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Template Name *</Label>
                      <Input value={editItem?.name || ""} onChange={e => setEditItem({ ...editItem, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="insurance_followup" className="h-8 text-sm font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs">Display Name</Label>
                      <Input value={editItem?.display_name || ""} onChange={e => setEditItem({ ...editItem, display_name: e.target.value })} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Select value={editItem?.category || "utility"} onValueChange={v => setEditItem({ ...editItem, category: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utility">Utility</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="authentication">Auth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Language</Label>
                      <Select value={editItem?.language || "en"} onValueChange={v => setEditItem({ ...editItem, language: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Vertical</Label>
                      <Select value={editItem?.vertical || ""} onValueChange={v => setEditItem({ ...editItem, vertical: v || null })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Global" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global</SelectItem>
                          {VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Header</Label>
                    <div className="flex gap-1.5 mb-1.5">
                      {["none", "text", "image", "video"].map(ht => (
                        <Button key={ht} type="button" size="sm" variant={(editItem?.header_type || "none") === ht ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => setEditItem({ ...editItem, header_type: ht === "none" ? null : ht })}>
                          {ht.charAt(0).toUpperCase() + ht.slice(1)}
                        </Button>
                      ))}
                    </div>
                    {editItem?.header_type && (
                      <Input value={editItem?.header_content || ""} onChange={e => setEditItem({ ...editItem, header_content: e.target.value })} placeholder={editItem.header_type === "text" ? "Header text" : "Media URL"} className="h-8 text-sm" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Body *</Label>
                      <div className="flex gap-1 flex-wrap">
                        {COMMON_VARS.slice(0, 6).map(v => (
                          <button key={v} onClick={() => insertVariable(v)} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-mono">{`{{${v}}}`}</button>
                        ))}
                      </div>
                    </div>
                    <Textarea value={editItem?.body || ""} onChange={e => setEditItem({ ...editItem, body: e.target.value })} rows={5} className="text-sm font-mono" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{(editItem?.body || "").length}/1024</p>
                  </div>
                  <div>
                    <Label className="text-xs">Footer</Label>
                    <Input value={editItem?.footer || ""} onChange={e => setEditItem({ ...editItem, footer: e.target.value })} className="h-8 text-sm" placeholder="Reply STOP to unsubscribe" />
                  </div>
                  {editItem?.ab_variant_of && (
                    <div>
                      <Label className="text-xs">Variant Label</Label>
                      <Input value={editItem?.ab_variant_label || "B"} onChange={e => setEditItem({ ...editItem, ab_variant_label: e.target.value })} className="h-8 text-sm w-20" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs">Title *</Label>
                    <Input value={editItem?.title || ""} onChange={e => setEditItem({ ...editItem, title: e.target.value })} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Shortcut</Label>
                    <Input value={(editItem as any)?.shortcut || ""} onChange={e => setEditItem({ ...editItem, shortcut: e.target.value } as any)} className="h-8 text-sm font-mono" placeholder="/greet" />
                  </div>
                  <div>
                    <Label className="text-xs">Message *</Label>
                    <Textarea value={(editItem as any)?.message || ""} onChange={e => setEditItem({ ...editItem, message: e.target.value } as any)} rows={4} className="text-sm" />
                  </div>
                </>
              )}
            </div>

            {/* Live Phone Preview (Templates only) */}
            {mainTab !== "quick_replies" && (
              <div className="shrink-0">
                <p className="text-xs font-medium text-center mb-2 text-muted-foreground">Live Preview</p>
                <PhonePreview template={editItem || {}} />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setIsEditing(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={mainTab === "quick_replies" ? saveQuickReply : saveTemplate} className="gap-2">
              <Save className="h-4 w-4" /> Save & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Template Preview</DialogTitle></DialogHeader>
          {previewTemplate && <PhonePreview template={previewTemplate} />}
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Template Performance
            </DialogTitle>
          </DialogHeader>
          {statsTemplate && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{statsTemplate.display_name || statsTemplate.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{statsTemplate.name}</p>
              </div>
              <TemplateStats template={statsTemplate} />
              {statsTemplate.last_sent_at && (
                <p className="text-xs text-muted-foreground">Last sent: {new Date(statsTemplate.last_sent_at).toLocaleString("en-IN")}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
