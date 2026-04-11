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
import { Switch } from "@/components/ui/switch";
import {
  Plus, Edit, Trash2, Copy, Zap, LayoutTemplate, Save, CheckCircle, Clock, XCircle,
  AlertTriangle, IndianRupee, Eye, Send, MessageSquare, Shield, Megaphone,
  FileText, Image, Video, Phone, Globe, Search, Filter, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Meta WhatsApp Business API category definitions
const META_CATEGORIES = {
  utility: {
    label: "Utility",
    icon: <Zap className="h-3.5 w-3.5" />,
    color: "bg-blue-500/10 text-blue-700 border-blue-200",
    description: "Account updates, order confirmations, alerts",
    pricing: "Free within 24h window, ₹0.35/msg outside",
    freeInWindow: true,
  },
  authentication: {
    label: "Authentication",
    icon: <Shield className="h-3.5 w-3.5" />,
    color: "bg-green-500/10 text-green-700 border-green-200",
    description: "OTP, login verification, 2FA",
    pricing: "₹0.30/msg (always charged)",
    freeInWindow: false,
  },
  marketing: {
    label: "Marketing",
    icon: <Megaphone className="h-3.5 w-3.5" />,
    color: "bg-orange-500/10 text-orange-700 border-orange-200",
    description: "Promotions, offers, product announcements",
    pricing: "₹0.80/msg (always charged)",
    freeInWindow: false,
  },
  service: {
    label: "Service (Free-form)",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    description: "Reply within 24h customer service window",
    pricing: "FREE (within 24h window only)",
    freeInWindow: true,
  },
} as const;

type MetaCategory = keyof typeof META_CATEGORIES;

interface Template {
  id: string;
  name: string;
  display_name: string | null;
  category: string;
  language: string;
  body: string;
  header_type: string | null;
  header_content: string | null;
  footer: string | null;
  variables: any;
  buttons: any;
  status: string;
  vertical: string | null;
  created_at: string;
}

interface QuickReply {
  id: string;
  title: string;
  shortcut: string | null;
  message: string;
  variables: string[] | null;
  category: string;
  vertical: string | null;
  is_active: boolean;
}

const COMMON_VARS = ["customer_name", "phone", "vehicle_number", "insurer", "premium", "expiry_date", "policy_number", "order_id", "amount", "date"];

const VERTICALS = ["Insurance", "Car Sales", "Self Drive", "HSRP", "Accessories", "Loans", "Marketing"];

export function WaTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [mainTab, setMainTab] = useState("templates");
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<Template & QuickReply> | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterVertical, setFilterVertical] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [tRes, qRes] = await Promise.all([
      supabase.from("wa_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("wa_quick_replies").select("*").order("sort_order"),
    ]);
    setTemplates((tRes.data || []) as unknown as Template[]);
    setQuickReplies((qRes.data || []) as unknown as QuickReply[]);
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const syncFromMeta = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", {
        body: { action: "sync_templates" },
      });
      if (error) throw error;
      toast.success(`Synced ${data?.synced || 0} templates from Meta`);
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync from Meta");
    } finally {
      setIsSyncing(false);
    }
  };

  const submitToMeta = async (template: Template) => {
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", {
        body: {
          action: "submit_template",
          template_id: template.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Template submitted to Meta for approval ✅ Status will update automatically.");
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit to Meta");
    }
  };

  const deleteFromMeta = async (template: Template) => {
    if (!confirm(`Delete "${template.display_name || template.name}" from Meta? This cannot be undone.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", {
        body: { action: "delete_template", template_name: template.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Template deleted from Meta");
      await fetchAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete from Meta");
    }
  };

  const saveTemplate = async () => {
    if (!editItem?.name || !editItem?.body) {
      toast.error("Name and body are required");
      return;
    }
    // Validate name: Meta requires lowercase, underscores only
    const cleanName = editItem.name.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    const payload = {
      name: cleanName,
      display_name: editItem.display_name || editItem.name,
      category: editItem.category || "utility",
      language: editItem.language || "en",
      body: editItem.body,
      header_type: editItem.header_type || null,
      header_content: editItem.header_content || null,
      footer: editItem.footer || null,
      variables: editItem.variables || [],
      buttons: editItem.buttons || [],
      status: editItem.status || "draft",
      vertical: editItem.vertical || null,
    };

    let savedId = editItem.id;
    if (editItem.id) {
      await supabase.from("wa_templates").update(payload).eq("id", editItem.id);
      toast.success("Template updated");
    } else {
      const { data: inserted } = await supabase.from("wa_templates").insert(payload).select("id").single();
      savedId = inserted?.id;
      toast.success("Template created as Draft — submit to Meta for approval");
    }
    setIsEditing(false);
    setEditItem(null);
    await fetchAll();

    // Auto-submit new drafts to Meta
    if (savedId && (!editItem.id || editItem.status === "draft")) {
      toast.info("Auto-submitting to Meta for approval…");
      try {
        const { data, error } = await supabase.functions.invoke("meta-templates", {
          body: { action: "submit_template", template_id: savedId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success("Submitted to Meta ✅ Awaiting approval");
        await fetchAll();
      } catch (err: any) {
        toast.error("Saved locally but Meta submission failed: " + (err.message || ""));
      }
    }
  };

  const saveQuickReply = async () => {
    if (!editItem?.title || !(editItem as any)?.message) {
      toast.error("Title and message are required");
      return;
    }
    const payload = {
      title: editItem.title,
      shortcut: (editItem as any).shortcut || null,
      message: (editItem as any).message,
      variables: (editItem as any).variables || null,
      category: (editItem as any).category || "general",
      vertical: editItem.vertical || null,
      is_active: (editItem as any).is_active !== false,
    };

    if (editItem.id) {
      await supabase.from("wa_quick_replies").update(payload).eq("id", editItem.id);
      toast.success("Quick reply updated");
    } else {
      await supabase.from("wa_quick_replies").insert(payload);
      toast.success("Quick reply created");
    }
    setIsEditing(false);
    setEditItem(null);
    fetchAll();
  };

  const deleteItem = async (id: string, type: "template" | "quick_reply") => {
    if (!confirm("Delete this item?")) return;
    if (type === "template") {
      await supabase.from("wa_templates").delete().eq("id", id);
    } else {
      await supabase.from("wa_quick_replies").delete().eq("id", id);
    }
    toast.success("Deleted");
    fetchAll();
  };

  const insertVariable = (varName: string) => {
    if (!editItem) return;
    const key = mainTab === "templates" ? "body" : "message";
    const current = (editItem as any)[key] || "";
    setEditItem({ ...editItem, [key]: current + `{{${varName}}}` });
  };

  // Filtering
  const filteredTemplates = templates.filter(t => {
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterVertical !== "all" && t.vertical !== filterVertical) return false;
    if (searchQuery && !t.name.includes(searchQuery.toLowerCase()) && !(t.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getCategoryMeta = (cat: string) => META_CATEGORIES[cat as MetaCategory] || META_CATEGORIES.utility;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
      case "rejected": return <XCircle className="h-3.5 w-3.5 text-red-600" />;
      case "pending": return <Clock className="h-3.5 w-3.5 text-yellow-600" />;
      default: return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const categoryStats = {
    utility: templates.filter(t => t.category === "utility").length,
    marketing: templates.filter(t => t.category === "marketing").length,
    authentication: templates.filter(t => t.category === "authentication").length,
    total: templates.length,
  };

  return (
    <div className="space-y-4">
      {/* Header with Meta Compliance Banner */}
      <div className="rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                Meta WhatsApp Template Manager
                <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">Meta Compliant</Badge>
              </h2>
              <p className="text-xs text-muted-foreground">Create, manage & sync templates following Meta Business API guidelines</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setPricingOpen(true)}>
              <IndianRupee className="h-3.5 w-3.5" /> Pricing Guide
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={syncFromMeta} disabled={isSyncing}>
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} /> {isSyncing ? "Syncing…" : "Sync from Meta"}
            </Button>
          </div>
        </div>
      </div>

      {/* Category Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(META_CATEGORIES) as [MetaCategory, typeof META_CATEGORIES[MetaCategory]][])
          .filter(([key]) => key !== "service")
          .map(([key, meta]) => (
          <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterCategory(filterCategory === key ? "all" : key)}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                  {meta.icon} <span className="ml-1">{meta.label}</span>
                </Badge>
                <span className="text-lg font-bold">{key === "utility" ? categoryStats.utility : key === "marketing" ? categoryStats.marketing : key === "authentication" ? categoryStats.authentication : 0}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{meta.pricing}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterCategory("all")}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <Badge variant="outline" className="text-[10px] bg-gray-500/10 text-gray-700 border-gray-200">
                <Globe className="h-3 w-3 mr-1" /> All
              </Badge>
              <span className="text-lg font-bold">{categoryStats.total}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Total templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="templates" className="gap-1.5 text-xs">
              <LayoutTemplate className="h-3.5 w-3.5" /> Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="quick_replies" className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" /> Quick Replies ({quickReplies.length})
            </TabsTrigger>
            <TabsTrigger value="free_messages" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Free Messages
            </TabsTrigger>
          </TabsList>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditItem({}); setIsEditing(true); }}>
            <Plus className="h-3.5 w-3.5" /> {mainTab === "templates" ? "New Template" : mainTab === "quick_replies" ? "New Quick Reply" : "New Template"}
          </Button>
        </div>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-3">
          {/* Filters */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-36 h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="utility">Utility</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterVertical} onValueChange={setFilterVertical}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verticals</SelectItem>
                {VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Templates Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px]">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-[250px]">Template</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vertical</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                          No templates found. Create your first Meta-compliant template.
                        </TableCell>
                      </TableRow>
                    ) : filteredTemplates.map(t => {
                      const catMeta = getCategoryMeta(t.category);
                      return (
                        <TableRow key={t.id} className="group">
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{t.display_name || t.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{t.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.body}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${catMeta.color}`}>
                              {catMeta.icon} <span className="ml-1">{catMeta.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {t.vertical ? (
                              <Badge variant="secondary" className="text-[10px]">{t.vertical}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Global</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {catMeta.freeInWindow ? (
                                <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">FREE*</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  <IndianRupee className="h-2.5 w-2.5" />
                                  {t.category === "marketing" ? "0.80" : t.category === "authentication" ? "0.30" : "0.35"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getStatusIcon(t.status)}
                              <span className="text-xs capitalize">{t.status}</span>
                              {t.status === "approved" && (
                                <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200 ml-1">Send ✓</Badge>
                              )}
                              {(t.status === "draft" || t.status === "rejected" || t.status === "pending") && (
                                <Badge variant="secondary" className="text-[9px] ml-1">Disabled</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
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
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete from Meta" onClick={() => deleteFromMeta(t)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-[9px] text-yellow-600">⏳</Badge>
                              )}
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
                    <Badge variant={qr.is_active ? "default" : "secondary"} className="text-[10px]">
                      {qr.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {qr.shortcut && <Badge variant="outline" className="text-[9px] w-fit font-mono">/{qr.shortcut}</Badge>}
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{qr.message}</p>
                  <Badge className="text-[10px] mt-2 bg-emerald-100 text-emerald-800 border-emerald-200">FREE (Service Window)</Badge>
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

        {/* Free Messages Info Tab */}
        <TabsContent value="free_messages" className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  Customer Service Window (FREE)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <p className="text-muted-foreground">When a customer messages you first, a <strong>24-hour service window</strong> opens. During this window:</p>
                <ul className="space-y-1.5 ml-4 text-muted-foreground list-disc">
                  <li><strong>Free-form text messages</strong> — no template needed</li>
                  <li><strong>Images, documents, videos</strong> — all free</li>
                  <li><strong>Quick replies</strong> — use pre-saved responses</li>
                  <li><strong>No per-message charge</strong></li>
                </ul>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded p-2 mt-2 border border-yellow-200">
                  <p className="flex items-center gap-1 text-yellow-700 font-medium"><AlertTriangle className="h-3 w-3" /> After 24 hours</p>
                  <p className="text-yellow-600 text-[11px] mt-1">Window closes. You MUST use an approved template to re-initiate conversation. Template messages are charged per Meta pricing.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  Meta Pricing (India)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(Object.entries(META_CATEGORIES) as [MetaCategory, typeof META_CATEGORIES[MetaCategory]][]).map(([key, meta]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded border text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${meta.color}`}>
                          {meta.icon} <span className="ml-1">{meta.label}</span>
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{meta.pricing}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p>• Utility templates are free within the 24h service window</p>
                  <p>• Marketing templates are ALWAYS charged, even in service window</p>
                  <p>• Authentication templates are ALWAYS charged</p>
                  <p>• 1,000 free service conversations/month (Meta included)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={(v) => { if (!v) { setIsEditing(false); setEditItem(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editItem?.id ? "Edit" : "Create"} {mainTab === "quick_replies" ? "Quick Reply" : "Template"}
              {mainTab === "templates" && <Badge variant="outline" className="text-[10px]">Meta API Format</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mainTab !== "quick_replies" ? (
              <>
                {/* Meta Category Warning */}
                {editItem?.category === "marketing" && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
                    <p className="font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Marketing Template</p>
                    <p className="mt-1">This template will be charged at ₹0.80/message. It must be approved by Meta before use. Avoid promotional language in utility templates.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Template Name (Meta ID) *</Label>
                    <Input
                      value={editItem?.name || ""}
                      onChange={e => setEditItem({ ...editItem, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                      placeholder="insurance_followup"
                      className="h-8 text-sm font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Lowercase, underscores only (Meta requirement)</p>
                  </div>
                  <div>
                    <Label className="text-xs">Display Name</Label>
                    <Input
                      value={editItem?.display_name || ""}
                      onChange={e => setEditItem({ ...editItem, display_name: e.target.value })}
                      placeholder="Insurance Follow-up"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Category *</Label>
                    <Select value={editItem?.category || "utility"} onValueChange={v => setEditItem({ ...editItem, category: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utility">
                          <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" /> Utility — Free in window</span>
                        </SelectItem>
                        <SelectItem value="marketing">
                          <span className="flex items-center gap-1.5"><Megaphone className="h-3 w-3" /> Marketing — ₹0.80/msg</span>
                        </SelectItem>
                        <SelectItem value="authentication">
                          <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> Authentication — ₹0.30/msg</span>
                        </SelectItem>
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
                        <SelectItem value="en_US">English (US)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Vertical</Label>
                    <Select value={editItem?.vertical || ""} onValueChange={v => setEditItem({ ...editItem, vertical: v || null })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Global" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global (All)</SelectItem>
                        {VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Header (optional)</Label>
                  <div className="grid grid-cols-4 gap-2 mb-1.5">
                    {["none", "text", "image", "document", "video"].map(ht => (
                      <Button
                        key={ht}
                        type="button"
                        size="sm"
                        variant={(editItem?.header_type || "none") === ht ? "default" : "outline"}
                        className="h-7 text-[10px] gap-1"
                        onClick={() => setEditItem({ ...editItem, header_type: ht === "none" ? null : ht })}
                      >
                        {ht === "text" && <FileText className="h-3 w-3" />}
                        {ht === "image" && <Image className="h-3 w-3" />}
                        {ht === "video" && <Video className="h-3 w-3" />}
                        {ht === "document" && <FileText className="h-3 w-3" />}
                        {ht.charAt(0).toUpperCase() + ht.slice(1)}
                      </Button>
                    ))}
                  </div>
                  {editItem?.header_type && editItem.header_type !== "none" && (
                    <Input
                      value={editItem?.header_content || ""}
                      onChange={e => setEditItem({ ...editItem, header_content: e.target.value })}
                      placeholder={editItem.header_type === "text" ? "Header text..." : "Media URL..."}
                      className="h-8 text-sm"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Body *</Label>
                    <div className="flex gap-1 flex-wrap">
                      {COMMON_VARS.map(v => (
                        <button key={v} onClick={() => insertVariable(v)} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-mono">
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    value={editItem?.body || ""}
                    onChange={e => setEditItem({ ...editItem, body: e.target.value })}
                    placeholder="Hello {{customer_name}}, your insurance policy for {{vehicle_number}} is due for renewal..."
                    rows={5}
                    className="text-sm font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">{(editItem?.body || "").length}/1024 characters (Meta limit)</p>
                </div>

                <div>
                  <Label className="text-xs">Footer (optional)</Label>
                  <Input
                    value={editItem?.footer || ""}
                    onChange={e => setEditItem({ ...editItem, footer: e.target.value })}
                    placeholder="Team Grabyourcar | Reply STOP to unsubscribe"
                    className="h-8 text-sm"
                  />
                </div>

                {/* Status is auto-managed by Meta — not editable */}
                {editItem?.status && editItem.status !== "draft" && (
                  <div className="bg-muted/50 rounded-lg p-2 text-xs flex items-center gap-2">
                    {getStatusIcon(editItem.status)}
                    <span>Status: <strong className="capitalize">{editItem.status}</strong> (managed by Meta)</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Title *</Label>
                  <Input value={editItem?.title || ""} onChange={e => setEditItem({ ...editItem, title: e.target.value })} placeholder="Greeting" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Shortcut (type /{"{shortcut}"} to use)</Label>
                  <Input value={(editItem as any)?.shortcut || ""} onChange={e => setEditItem({ ...editItem, shortcut: e.target.value } as any)} placeholder="greet" className="h-8 text-sm font-mono" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Message *</Label>
                    <div className="flex gap-1 flex-wrap">
                      {COMMON_VARS.slice(0, 5).map(v => (
                        <button key={v} onClick={() => insertVariable(v)} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-mono">
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea value={(editItem as any)?.message || ""} onChange={e => setEditItem({ ...editItem, message: e.target.value } as any)} placeholder="Hello! How can I help you?" rows={4} className="text-sm" />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded p-2 text-xs text-emerald-700 border border-emerald-200">
                  Quick replies are <strong>FREE</strong> — they're sent as free-form messages within the 24h customer service window.
                </div>
              </>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setIsEditing(false); setEditItem(null); }}>Cancel</Button>
            <Button onClick={mainTab === "quick_replies" ? saveQuickReply : saveTemplate} className="gap-2">
              <Save className="h-4 w-4" /> Save {mainTab === "quick_replies" ? "Quick Reply" : "Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="bg-[#e5ddd5] rounded-xl p-4 min-h-[300px] relative">
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%] ml-auto">
                {previewTemplate.header_type === "text" && previewTemplate.header_content && (
                  <p className="font-bold text-sm mb-1">{previewTemplate.header_content}</p>
                )}
                {previewTemplate.header_type === "image" && (
                  <div className="bg-gray-200 rounded h-32 flex items-center justify-center mb-2">
                    <Image className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{previewTemplate.body.replace(/\{\{(\w+)\}\}/g, "[{$1}]")}</p>
                {previewTemplate.footer && (
                  <p className="text-[11px] text-gray-500 mt-2">{previewTemplate.footer}</p>
                )}
                <p className="text-[10px] text-gray-400 text-right mt-1">
                  {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <Badge variant="outline" className={`text-[10px] ${getCategoryMeta(previewTemplate.category).color}`}>
                  {getCategoryMeta(previewTemplate.category).label}
                </Badge>
                <span className="text-[10px] text-gray-600">{getCategoryMeta(previewTemplate.category).pricing}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pricing Guide Dialog */}
      <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" /> Meta WhatsApp Pricing Guide (India)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Per Message</TableHead>
                  <TableHead className="text-xs">Free in Window?</TableHead>
                  <TableHead className="text-xs">Needs Approval?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs font-medium">Service (Free-form)</TableCell>
                  <TableCell className="text-xs text-emerald-600 font-bold">FREE</TableCell>
                  <TableCell className="text-xs">✅ Yes (24h)</TableCell>
                  <TableCell className="text-xs">No</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs font-medium">Utility</TableCell>
                  <TableCell className="text-xs">₹0.35</TableCell>
                  <TableCell className="text-xs">✅ Yes (24h)</TableCell>
                  <TableCell className="text-xs">Yes</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs font-medium">Authentication</TableCell>
                  <TableCell className="text-xs">₹0.30</TableCell>
                  <TableCell className="text-xs">❌ No</TableCell>
                  <TableCell className="text-xs">Yes</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs font-medium">Marketing</TableCell>
                  <TableCell className="text-xs text-orange-600 font-bold">₹0.80</TableCell>
                  <TableCell className="text-xs">❌ No</TableCell>
                  <TableCell className="text-xs">Yes</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-3 text-xs border border-blue-200 space-y-1.5">
              <p className="font-medium text-blue-800">Meta Free Tier (Included)</p>
              <p className="text-blue-700">• 1,000 free service conversations per month</p>
              <p className="text-blue-700">• Service window: 24h from last customer message</p>
              <p className="text-blue-700">• Templates outside window are always charged</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
