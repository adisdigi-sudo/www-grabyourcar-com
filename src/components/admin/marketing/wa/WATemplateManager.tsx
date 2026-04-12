import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, Plus, Trash2, CheckCircle, Clock, XCircle, Copy, Pencil, RefreshCw, AlertTriangle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeTemplateName } from "@/lib/whatsappTemplateMirror";

interface Template {
  id: string;
  name: string;
  display_name: string | null;
  category: string;
  content: string;
  variables: string[] | null;
  is_approved: boolean;
  is_active: boolean;
  approval_status: string;
  language: string;
  rejection_reason: string | null;
  meta_template_id: string | null;
  header_type: string | null;
  header_content: string | null;
  footer: string | null;
  created_at: string;
}

const CATEGORIES = ["Marketing", "Utility", "Authentication"];

export function WATemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", category: "Utility", content: "", language: "en", footer: "",
  });
  const { toast } = useToast();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase.from("wa_templates").select("*").order("created_at", { ascending: false });
    if (data) setTemplates(data.map((t: any) => ({
      id: t.id, name: t.name, display_name: t.display_name, category: t.category,
      content: t.body, variables: t.variables,
      is_approved: t.status === "approved", is_active: t.status !== "disabled",
      approval_status: t.status, language: t.language,
      rejection_reason: t.meta_rejection_reason || null,
      meta_template_id: t.meta_template_id || null,
      header_type: t.header_type, header_content: t.header_content,
      footer: t.footer, created_at: t.created_at,
    })));
  };

  const syncFromMeta = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", {
        body: { action: "sync_templates" },
      });
      if (error) throw error;
      toast({ title: `✅ Synced ${data?.synced || 0} templates from Meta` });
      fetchTemplates();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.content) { toast({ title: "Name and content required", variant: "destructive" }); return; }
    const normalizedName = normalizeTemplateName(form.name);

    const { data: inserted, error } = await supabase.from("wa_templates").insert({
      name: normalizedName,
      display_name: form.name,
      category: form.category.toLowerCase(),
      body: form.content,
      language: form.language,
      footer: form.footer || null,
      status: "draft",
    }).select("id").single();

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    await submitToMeta(inserted.id);
    setIsCreating(false);
    setForm({ name: "", category: "Utility", content: "", language: "en", footer: "" });
    fetchTemplates();
  };

  const handleEditSave = async () => {
    if (!editingTemplate) return;
    const t = editingTemplate;
    if (!form.content) { toast({ title: "Content required", variant: "destructive" }); return; }

    // For rejected templates: Meta requires DELETE old + CREATE new with same name
    // For draft templates: just update locally and submit
    const needsMetaDelete = t.meta_template_id && t.approval_status === "rejected";

    if (needsMetaDelete) {
      // Delete old rejected template from Meta first
      try {
        await supabase.functions.invoke("meta-templates", {
          body: { action: "delete_template", template_name: t.name },
        });
      } catch { /* ignore delete failures */ }
    }

    // Update locally
    const { error } = await supabase.from("wa_templates").update({
      body: form.content,
      category: form.category.toLowerCase(),
      footer: form.footer || null,
      status: "draft",
      meta_rejection_reason: null,
      meta_template_id: null,
    }).eq("id", t.id);

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    // Re-submit to Meta
    await submitToMeta(t.id);
    setEditingTemplate(null);
    setForm({ name: "", category: "Utility", content: "", language: "en", footer: "" });
    fetchTemplates();
  };

  const submitToMeta = async (templateId: string) => {
    setSubmittingId(templateId);
    try {
      const { data, error } = await supabase.functions.invoke("meta-templates", {
        body: { action: "submit_template", template_id: templateId },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "❌ Meta Rejected", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "✅ Submitted to Meta for approval" });
      }
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingId(null);
    }
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setForm({
      name: t.display_name || t.name,
      category: t.category.charAt(0).toUpperCase() + t.category.slice(1),
      content: t.content,
      language: t.language,
      footer: t.footer || "",
    });
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const template = templates.find((item) => item.id === id);
    if (template?.name) {
      try {
        await supabase.functions.invoke("meta-templates", {
          body: { action: "delete_template", template_name: template.name },
        });
      } catch {}
    }
    await supabase.from("wa_templates").delete().eq("id", id);
    toast({ title: "Template deleted" });
    fetchTemplates();
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === "rejected") return <Badge className="bg-destructive/10 text-destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    if (status === "draft") return <Badge variant="outline"><Pencil className="w-3 h-3 mr-1" />Draft</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Message Templates</h2>
          <p className="text-sm text-muted-foreground">Meta-approved WhatsApp templates only</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={syncFromMeta} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sync from Meta
          </Button>
          <Button size="sm" onClick={() => { setEditingTemplate(null); setForm({ name: "", category: "Utility", content: "", language: "en", footer: "" }); setIsCreating(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No templates yet. Create your first or sync from Meta.
                    </TableCell>
                  </TableRow>
                ) : templates.map(t => (
                  <TableRow key={t.id} className={!t.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.display_name || t.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.content.slice(0, 80)}...</p>
                        {t.rejection_reason && (
                          <div className="flex items-start gap-1 mt-1 p-1.5 rounded bg-destructive/5 border border-destructive/20">
                            <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                            <p className="text-[11px] text-destructive leading-tight">{t.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                    <TableCell>{getStatusBadge(t.approval_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {(t.approval_status === "rejected" || t.approval_status === "draft") && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => openEdit(t)} title="Edit & Resubmit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {t.approval_status === "draft" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => submitToMeta(t.id)} disabled={submittingId === t.id} title="Submit to Meta">
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(t.content); toast({ title: "Copied!" }); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTemplate(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input placeholder="e.g., welcome_new_lead" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">Lowercase, underscores only. Auto-normalized.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message Body *</Label>
              <Textarea
                placeholder={"Hello {{customer_name}}! 🚗\n\nYour policy for {{vehicle}} expires on {{expiry_date}}."}
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Use {"{{variable}}"} syntax. Auto-converted to positional format for Meta.</p>
            </div>
            <div className="space-y-2">
              <Label>Footer (optional)</Label>
              <Input placeholder="Reply STOP to opt out" value={form.footer} onChange={e => setForm({ ...form, footer: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Send className="h-4 w-4 mr-2" /> Create & Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit & Resubmit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit & Resubmit Template</DialogTitle>
          </DialogHeader>
          {editingTemplate?.rejection_reason && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Meta Rejection Reason:</p>
                <p className="text-sm text-destructive/80 mt-0.5">{editingTemplate.rejection_reason}</p>
              </div>
            </div>
          )}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={editingTemplate?.name || ""} disabled className="opacity-60" />
              <p className="text-[11px] text-muted-foreground">Name cannot be changed after creation.</p>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message Body *</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Footer</Label>
              <Input value={form.footer} onChange={e => setForm({ ...form, footer: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-primary">
              <RefreshCw className="h-4 w-4 mr-2" /> Fix & Resubmit to Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
