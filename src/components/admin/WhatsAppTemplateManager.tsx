import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare, Plus, Edit, Trash2, Eye, Send, Copy, CheckCircle, 
  XCircle, Clock, Sparkles, Filter, Search, Download, Upload, FileText,
  Loader2, ClipboardCopy, Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { deleteMetaManagedTemplate, normalizeTemplateName, syncTemplateToMeta } from "@/lib/whatsappTemplateMirror";

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  template_type: string;
  content: string;
  variables: string[] | null;
  preview: string | null;
  is_approved: boolean | null;
  is_active: boolean | null;
  approval_status: string | null;
  wbiztool_template_id: string | null;
  language: string | null;
  use_cases: string[] | null;
  example_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "welcome", label: "Welcome", color: "bg-green-500" },
  { value: "recommendation", label: "Car Recommendation", color: "bg-blue-500" },
  { value: "quote", label: "Price Quote", color: "bg-purple-500" },
  { value: "finance", label: "Finance/EMI", color: "bg-yellow-500" },
  { value: "test_drive", label: "Test Drive", color: "bg-orange-500" },
  { value: "offer", label: "Offers", color: "bg-red-500" },
  { value: "reminder", label: "Reminders", color: "bg-pink-500" },
  { value: "feedback", label: "Feedback", color: "bg-cyan-500" },
  { value: "trade_in", label: "Trade-In", color: "bg-indigo-500" },
  { value: "accessory", label: "Accessories", color: "bg-emerald-500" },
  { value: "insurance", label: "Insurance", color: "bg-teal-500" },
  { value: "service", label: "Service", color: "bg-amber-500" },
  { value: "referral", label: "Referral", color: "bg-violet-500" },
  { value: "re_engagement", label: "Re-engagement", color: "bg-rose-500" },
];

export default function WhatsAppTemplateManager() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<WhatsAppTemplate> | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [isProviderCopyOpen, setIsProviderCopyOpen] = useState(false);
  const [providerCopyText, setProviderCopyText] = useState("");
  const { toast } = useToast();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      setTemplates((data || []).map(item => ({ ...item, example_data: item.example_data as Record<string, unknown> | null })));
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate?.name || !editingTemplate?.content) {
      toast({ title: "Validation Error", description: "Name and content are required", variant: "destructive" });
      return;
    }
    try {
      const variableRegex = /\{[a-z_]+\}/g;
      const extractedVariables = editingTemplate.content.match(variableRegex) || [];
      const normalizedName = normalizeTemplateName(editingTemplate.name);
      const templateData = {
        name: normalizedName,
        category: editingTemplate.category || "welcome",
        template_type: editingTemplate.template_type || "text",
        content: editingTemplate.content,
        variables: Array.from(new Set(extractedVariables)),
        preview: editingTemplate.content.substring(0, 100) + "...",
        is_active: editingTemplate.is_active ?? true,
        is_approved: false,
        approval_status: "pending",
        language: editingTemplate.language || "en",
        use_cases: editingTemplate.use_cases || [],
        example_data: (editingTemplate.example_data || {}) as Record<string, string>,
      };
      let savedId = editingTemplate.id;
      if (editingTemplate.id) {
        const { data, error } = await supabase.from("whatsapp_templates").update(templateData).eq("id", editingTemplate.id).select("id").single();
        if (error) throw error;
        savedId = data.id;
      } else {
        const { data, error } = await supabase.from("whatsapp_templates").insert([templateData]).select("id").single();
        if (error) throw error;
        savedId = data.id;
      }

      const syncResult = await syncTemplateToMeta({
        name: normalizedName,
        displayName: editingTemplate.name,
        body: editingTemplate.content,
        category: editingTemplate.category || "welcome",
        language: editingTemplate.language || "en",
        variables: Array.from(new Set(extractedVariables.map((value) => value.replace(/[{}]/g, "")))),
      });

      if (savedId) {
        await supabase.from("whatsapp_templates").update({
          approval_status: syncResult.status,
          is_approved: syncResult.status === "approved",
        }).eq("id", savedId);
      }

      if (syncResult.error) {
        toast({ title: "Template saved locally", description: `Meta submission failed: ${syncResult.error}`, variant: "destructive" });
      } else {
        toast({ title: editingTemplate.id ? "Template updated & submitted to Meta" : "Template created & submitted to Meta" });
      }
      setIsEditing(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      const template = templates.find((item) => item.id === id);
      if (template) {
        await deleteMetaManagedTemplate({ name: template.name });
      }
      await supabase.from("whatsapp_templates").delete().eq("id", id);
      toast({ title: "Template deleted" });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await supabase.from("whatsapp_templates").update({ is_active: !isActive }).eq("id", id);
    fetchTemplates();
  };

  const sendTestMessage = async () => {
    if (!previewTemplate || !testPhone) {
      toast({ title: "Enter phone number", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      let message = previewTemplate.content;
      const exampleData = (previewTemplate.example_data || {}) as Record<string, string>;
      previewTemplate.variables?.forEach((variable) => {
        const key = variable.replace(/[{}]/g, "");
        const value = exampleData[key] || `[${key}]`;
        message = message.replace(variable, String(value));
      });
      const { error } = await supabase.functions.invoke("whatsapp-send", {
        body: { phone: testPhone.replace(/\D/g, ""), message },
      });
      if (error) throw error;
      toast({ title: "Test message sent!", description: `Sent to ${testPhone}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // ─── AI GENERATE TEMPLATES ────────────────────────
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast({ title: "Enter a prompt", description: "Describe the template you want", variant: "destructive" });
      return;
    }
    setIsAIGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          prompt: `You are a WhatsApp marketing template expert for GrabYourCar (an Indian car buying platform). Generate a WhatsApp message template based on this request: "${aiPrompt}"

Requirements:
- Use {customer_name} for personalization
- Use relevant variables like {car_model}, {price}, {offer_amount}, {emi_amount}, {dealer_name}, {city} etc.
- Include emojis for engagement
- Keep under 1024 characters (WhatsApp limit)
- Make it professional yet friendly
- Include a clear call-to-action
- Format for WhatsApp (no HTML)

Return ONLY the template text, nothing else.`,
        },
      });

      if (error) throw error;

      const generatedContent = data?.content || "";
      setEditingTemplate(prev => ({
        ...prev,
        content: generatedContent,
        name: prev?.name || aiPrompt.substring(0, 40),
      }));
      setIsAIDialogOpen(false);
      if (!isEditing) {
        setEditingTemplate({ content: generatedContent, name: aiPrompt.substring(0, 40) });
        setIsEditing(true);
      }
      toast({ title: "✨ AI template generated!" });
    } catch (error: any) {
      toast({ title: "AI Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAIGenerating(false);
    }
  };

  // ─── EXPORT TEMPLATES ────────────────────────
  const handleExport = () => {
    const exportData = templates.map(t => ({
      name: t.name,
      category: t.category,
      template_type: t.template_type,
      content: t.content,
      variables: t.variables,
      language: t.language,
      approval_status: t.approval_status,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-templates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Templates exported!", description: `${templates.length} templates exported` });
  };

  // ─── IMPORT TEMPLATES ────────────────────────
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) throw new Error("Invalid format");

      const toInsert = imported.map((t: any) => ({
        name: t.name || "Imported Template",
        category: t.category || "welcome",
        template_type: t.template_type || "text",
        content: t.content || "",
        variables: t.variables || [],
        preview: (t.content || "").substring(0, 100) + "...",
        language: t.language || "en",
        is_active: true,
        is_approved: false,
        approval_status: "pending",
      }));

      const { error } = await supabase.from("whatsapp_templates").insert(toInsert);
      if (error) throw error;

      toast({ title: "Imported!", description: `${toInsert.length} templates imported` });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    }
    event.target.value = '';
  };

  // ─── COPY FOR PROVIDER SETUP ────────────────────────
  const generateProviderCopyText = (template?: WhatsAppTemplate) => {
    const templatesToExport = template ? [template] : templates;
    const lines = templatesToExport.map((t, i) => {
      const vars = (t.variables || []).map((v, idx) => `  {{${idx + 1}}} = ${v}`).join('\n');
      return `━━━ Template ${i + 1} ━━━
📝 Name: ${t.name}
📂 Category: ${t.category}
🌐 Language: ${t.language || 'en'}
📋 Type: ${t.template_type || 'text'}

📨 Message Body:
${t.content}

🔄 Variables:
${vars || '  (No variables)'}
`;
    }).join('\n\n');

    const header = `=== GRABYOURCAR WHATSAPP TEMPLATES ===
Date: ${new Date().toLocaleDateString('en-IN')}
Total Templates: ${templatesToExport.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please set up the following templates on our WhatsApp Business Account:

`;
    return header + lines;
  };

  const openProviderCopy = (template?: WhatsAppTemplate) => {
    setProviderCopyText(generateProviderCopyText(template));
    setIsProviderCopyOpen(true);
  };

  const copyProviderText = () => {
    navigator.clipboard.writeText(providerCopyText);
    toast({ title: "📋 Copied!", description: "Share this text with your provider to set up templates" });
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (category: string) => CATEGORIES.find((c) => c.value === category)?.color || "bg-gray-500";
  const getCategoryLabel = (category: string) => CATEGORIES.find((c) => c.value === category)?.label || category;

  const getStatusBadge = (template: WhatsAppTemplate) => {
    if (template.is_approved && template.approval_status === "approved") return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
    if (template.approval_status === "rejected") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
  };

  const stats = {
    total: templates.length,
    approved: templates.filter(t => t.is_approved).length,
    active: templates.filter(t => t.is_active).length,
    pending: templates.filter(t => t.approval_status === "pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-green-500" />
            WhatsApp Marketing Templates
          </h2>
          <p className="text-muted-foreground">Create, manage & export templates for your WhatsApp provider</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setIsAIDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> AI Generate
          </Button>
          <Button variant="outline" size="sm" onClick={() => openProviderCopy()}>
            <Share2 className="h-4 w-4 mr-1" /> Copy All for Provider
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-1" /> Import
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </Button>
          <Button onClick={() => { setEditingTemplate({}); setIsEditing(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Create
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-3xl font-bold">{stats.total}</div><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-3xl font-bold text-green-500">{stats.approved}</div><p className="text-sm text-muted-foreground">Approved</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-3xl font-bold text-blue-500">{stats.active}</div><p className="text-sm text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-3xl font-bold text-yellow-500">{stats.pending}</div><p className="text-sm text-muted-foreground">Pending</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className={`relative ${!template.is_active ? "opacity-60" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className={`${getCategoryColor(template.category)} text-white mb-2`}>{getCategoryLabel(template.category)}</Badge>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    {getStatusBadge(template)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{template.content.substring(0, 150)}...</p>
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.variables.slice(0, 4).map((v, i) => <Badge key={i} variant="outline" className="text-xs">{v}</Badge>)}
                      {template.variables.length > 4 && <Badge variant="outline" className="text-xs">+{template.variables.length - 4} more</Badge>}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Switch checked={template.is_active ?? false} onCheckedChange={() => handleToggleActive(template.id, template.is_active ?? false)} />
                      <span className="text-xs text-muted-foreground">{template.is_active ? "Active" : "Off"}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setPreviewTemplate(template)}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openProviderCopy(template)} title="Copy for Provider"><Share2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingTemplate(template); setIsEditing(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(template.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{template.content.substring(0, 50)}...</div>
                      </TableCell>
                      <TableCell><Badge className={`${getCategoryColor(template.category)} text-white`}>{getCategoryLabel(template.category)}</Badge></TableCell>
                      <TableCell>{getStatusBadge(template)}</TableCell>
                      <TableCell>{template.variables?.length || 0}</TableCell>
                      <TableCell><Switch checked={template.is_active ?? false} onCheckedChange={() => handleToggleActive(template.id, template.is_active ?? false)} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setPreviewTemplate(template)}><Eye className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => openProviderCopy(template)}><Share2 className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingTemplate(template); setIsEditing(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(template.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredTemplates.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
            <p className="text-muted-foreground mb-4">Create templates manually or generate with AI</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setEditingTemplate({}); setIsEditing(true); }}><Plus className="h-4 w-4 mr-2" />Create</Button>
              <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}><Sparkles className="h-4 w-4 mr-2" />AI Generate</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── AI GENERATE DIALOG ──────────────────── */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" /> AI Template Generator</DialogTitle>
            <DialogDescription>Describe the template you need and AI will create it for you</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What kind of template do you need?</Label>
              <Textarea
                placeholder="e.g., Welcome message for new car inquiry leads with best offer and test drive booking CTA"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["Welcome new lead", "Festival offer promotion", "Test drive reminder", "Price quote follow-up", "EMI offer for hot lead", "Re-engage cold lead"].map((suggestion) => (
                <Button key={suggestion} variant="outline" size="sm" className="text-xs justify-start" onClick={() => setAiPrompt(suggestion)}>
                  <Sparkles className="h-3 w-3 mr-1 shrink-0" />{suggestion}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAIGenerate} disabled={isAIGenerating}>
              {isAIGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate Template</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PROVIDER COPY DIALOG ──────────────────── */}
      <Dialog open={isProviderCopyOpen} onOpenChange={setIsProviderCopyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Share2 className="h-5 w-5 text-green-500" /> Copy for Provider Setup</DialogTitle>
            <DialogDescription>Copy this formatted text and share with your WhatsApp provider to set up templates</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                📋 Copy the text below → Share it with your WhatsApp provider via WhatsApp/Email → They will set up these templates on your WhatsApp Business Account
              </AlertDescription>
            </Alert>
            <Textarea
              value={providerCopyText}
              onChange={(e) => setProviderCopyText(e.target.value)}
              rows={16}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProviderCopyOpen(false)}>Close</Button>
            <Button onClick={copyProviderText}>
              <ClipboardCopy className="h-4 w-4 mr-2" /> Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT/CREATE DIALOG ──────────────────── */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate?.id ? "Edit Template" : "Create New Template"}</DialogTitle>
            <DialogDescription>Use {"{variable_name}"} for dynamic content</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={editingTemplate?.name || ""} onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })} placeholder="e.g., Welcome Message" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editingTemplate?.category || "welcome"} onValueChange={(value) => setEditingTemplate({ ...editingTemplate, category: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message Content</Label>
                <Button variant="ghost" size="sm" onClick={() => { setIsAIDialogOpen(true); }}>
                  <Sparkles className="h-3 w-3 mr-1" /> AI Generate
                </Button>
              </div>
              <Textarea
                value={editingTemplate?.content || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                placeholder="Hi {customer_name}! Welcome to GrabYourCar..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={editingTemplate?.language || "en"} onValueChange={(value) => setEditingTemplate({ ...editingTemplate, language: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="bn">Bengali</SelectItem>
                    <SelectItem value="ta">Tamil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Approval Status</Label>
                <Select value={editingTemplate?.approval_status || "pending"} onValueChange={(value) => setEditingTemplate({ ...editingTemplate, approval_status: value, is_approved: value === "approved" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editingTemplate?.is_active ?? true} onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_active: checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingTemplate?.id ? "Update" : "Create"} Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── PREVIEW DIALOG ──────────────────── */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-500" />{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={`${getCategoryColor(previewTemplate.category)} text-white`}>{getCategoryLabel(previewTemplate.category)}</Badge>
                {getStatusBadge(previewTemplate)}
              </div>
              <div className="bg-[#e5ddd5] p-4 rounded-lg">
                <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%] ml-auto">
                  <p className="text-sm whitespace-pre-wrap">{previewTemplate.content}</p>
                  <p className="text-xs text-gray-400 text-right mt-1">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Variables:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">{previewTemplate.variables.map((v, i) => <Badge key={i} variant="outline">{v}</Badge>)}</div>
                </div>
              )}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Send Test Message</Label>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Phone (e.g., 9855924442)" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
                  <Button onClick={sendTestMessage} disabled={isSending}><Send className="h-4 w-4 mr-2" />{isSending ? "..." : "Send"}</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(previewTemplate.content); toast({ title: "Copied!" }); }}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Text
                </Button>
                <Button variant="outline" onClick={() => openProviderCopy(previewTemplate)}>
                  <Share2 className="h-4 w-4 mr-2" /> Copy for Provider
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
