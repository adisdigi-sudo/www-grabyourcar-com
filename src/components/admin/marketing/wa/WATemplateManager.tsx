import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Target, Plus, Trash2, CheckCircle, Clock, XCircle, Copy, Pencil, RefreshCw, AlertTriangle, Send, ShieldCheck, Ban, Eye } from "lucide-react";
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

/**
 * META POLICY ENFORCEMENT:
 * - APPROVED: Cannot edit. Can only send or delete+recreate.
 * - PENDING: Cannot edit. Wait for Meta decision.
 * - REJECTED: Can edit body/footer and resubmit (Meta requires delete old + create new).
 * - DRAFT: Can edit and submit.
 * - DISABLED/PAUSED: Cannot edit. Meta controls this.
 * 
 * Variables are strictly positional {{1}}, {{2}} — auto-converted from named vars.
 * Only APPROVED templates can be used for sending.
 */

export function WATemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);
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
      toast({ title: `✅ Synced ${data?.synced || 0} templates from Meta (live status updated)` });
      fetchTemplates();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.content) { toast({ title: "Name and content required", variant: "destructive" }); return; }
    
    // Meta name rules: lowercase, underscores only, max 512 chars
    const normalizedName = normalizeTemplateName(form.name);
    if (normalizedName.length > 512) { toast({ title: "Name too long (max 512 chars)", variant: "destructive" }); return; }
    
    // Meta body limit: 1024 chars
    if (form.content.length > 1024) { toast({ title: "Body too long (max 1024 chars per Meta policy)", variant: "destructive" }); return; }

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

  /**
   * META POLICY: Rejected templates must be DELETED from Meta and re-created.
   * You cannot "update" a rejected template — Meta requires delete + new submission.
   */
  const handleEditAndResubmit = async () => {
    if (!editingTemplate) return;
    const t = editingTemplate;
    if (!form.content) { toast({ title: "Content required", variant: "destructive" }); return; }
    if (form.content.length > 1024) { toast({ title: "Body too long (max 1024 chars per Meta policy)", variant: "destructive" }); return; }

    // Step 1: Delete old rejected template from Meta
    if (t.meta_template_id || t.name) {
      try {
        await supabase.functions.invoke("meta-templates", {
          body: { action: "delete_template", template_name: t.name },
        });
      } catch { /* Meta may have already removed it */ }
    }

    // Step 2: Update local record, reset meta fields
    const { error } = await supabase.from("wa_templates").update({
      body: form.content,
      category: form.category.toLowerCase(),
      footer: form.footer || null,
      status: "draft",
      meta_rejection_reason: null,
      meta_template_id: null,
    }).eq("id", t.id);

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    // Step 3: Re-submit to Meta as new template
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
        toast({ title: "✅ Submitted to Meta — awaiting approval" });
      }
      fetchTemplates();
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmittingId(null);
    }
  };

  const canEdit = (status: string) => status === "rejected" || status === "draft";
  const canSend = (status: string) => status === "approved";
  const canSubmitToMeta = (status: string) => status === "draft";

  const openEdit = (t: Template) => {
    if (!canEdit(t.approval_status)) {
      toast({ title: "🔒 Cannot edit", description: getEditBlockReason(t.approval_status), variant: "destructive" });
      return;
    }
    setEditingTemplate(t);
    setForm({
      name: t.display_name || t.name,
      category: t.category.charAt(0).toUpperCase() + t.category.slice(1),
      content: t.content,
      language: t.language,
      footer: t.footer || "",
    });
  };

  const getEditBlockReason = (status: string) => {
    switch (status) {
      case "approved": return "Approved templates cannot be edited (Meta policy). Delete and recreate if changes needed.";
      case "pending": return "Template is under Meta review. Wait for approval/rejection.";
      case "paused": return "Template paused by Meta. Contact Meta support.";
      case "disabled": return "Template disabled by Meta due to quality issues.";
      default: return "Cannot edit in current state.";
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template? This will also delete from Meta.")) return;
    const template = templates.find((item) => item.id === id);
    if (template?.name) {
      try {
        await supabase.functions.invoke("meta-templates", {
          body: { action: "delete_template", template_name: template.name },
        });
      } catch {}
    }
    await supabase.from("wa_templates").delete().eq("id", id);
    toast({ title: "Template deleted from Meta & local" });
    fetchTemplates();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-500/10 text-green-600 border-green-200"><ShieldCheck className="w-3 h-3 mr-1" />Approved ✅</Badge>;
      case "rejected": return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" />Under Review</Badge>;
      case "draft": return <Badge variant="outline"><Pencil className="w-3 h-3 mr-1" />Draft</Badge>;
      case "paused": return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200"><Ban className="w-3 h-3 mr-1" />Paused</Badge>;
      case "disabled": return <Badge className="bg-muted text-muted-foreground"><Ban className="w-3 h-3 mr-1" />Disabled</Badge>;
      default: return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
    }
  };

  const getVariablePreview = (body: string) => {
    const matches = body.match(/\{\{([^}]+)\}\}/g) || [];
    return matches.map(m => m.replace(/[{}]/g, "").trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Meta Templates</h2>
          <p className="text-sm text-muted-foreground">Strictly Meta-approved templates only. Real-time sync.</p>
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

      {/* Meta Policy Info */}
      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm space-y-1">
        <p className="font-medium text-primary">🔒 Meta Policy Rules (Enforced)</p>
        <ul className="text-xs text-muted-foreground space-y-0.5 ml-4 list-disc">
          <li><strong>Approved</strong> — Ready to send. Cannot edit (Meta policy). Delete & recreate for changes.</li>
          <li><strong>Pending</strong> — Under Meta review (24-48hrs). Cannot edit or send.</li>
          <li><strong>Rejected</strong> — Can edit body & resubmit. Old version auto-deleted from Meta.</li>
          <li><strong>Only APPROVED templates can be used for sending messages.</strong></li>
        </ul>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead>Meta Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No templates. Click "Sync from Meta" to import or create new.
                    </TableCell>
                  </TableRow>
                ) : templates.map(t => (
                  <TableRow key={t.id} className={!t.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <p className="font-medium text-sm">{t.display_name || t.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{t.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.content.slice(0, 100)}</p>
                        {t.rejection_reason && (
                          <div className="flex items-start gap-1 mt-1.5 p-2 rounded bg-destructive/5 border border-destructive/20">
                            <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-medium text-destructive">Rejection Reason:</p>
                              <p className="text-[11px] text-destructive/80 leading-tight">{t.rejection_reason}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.category}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getVariablePreview(t.content).map((v, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-mono">{`{{${v}}}`}</Badge>
                        ))}
                        {getVariablePreview(t.content).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(t.approval_status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {/* View — always available */}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewingTemplate(t)} title="View template">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {/* Edit — ONLY for rejected/draft (Meta policy) */}
                        {canEdit(t.approval_status) && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => openEdit(t)} title="Edit & Resubmit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Submit — ONLY for draft */}
                        {canSubmitToMeta(t.approval_status) && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => submitToMeta(t.id)} disabled={submittingId === t.id} title="Submit to Meta">
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {/* Approved indicator */}
                        {canSend(t.approval_status) && (
                          <Badge className="bg-green-500/10 text-green-600 text-[10px] h-8 flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />Ready
                          </Badge>
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

      {/* View Dialog (read-only for approved/pending) */}
      <Dialog open={!!viewingTemplate} onOpenChange={(open) => { if (!open) setViewingTemplate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Details</DialogTitle>
            <DialogDescription>
              {viewingTemplate && getStatusBadge(viewingTemplate.approval_status)}
            </DialogDescription>
          </DialogHeader>
          {viewingTemplate && (
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs text-muted-foreground">Name (Meta ID)</Label>
                <p className="font-mono text-sm">{viewingTemplate.name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <p className="text-sm">{viewingTemplate.category}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Language</Label>
                <p className="text-sm">{viewingTemplate.language}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Body</Label>
                <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap font-mono">{viewingTemplate.content}</div>
              </div>
              {viewingTemplate.footer && (
                <div>
                  <Label className="text-xs text-muted-foreground">Footer</Label>
                  <p className="text-sm text-muted-foreground">{viewingTemplate.footer}</p>
                </div>
              )}
              {viewingTemplate.rejection_reason && (
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">❌ Rejection Reason:</p>
                  <p className="text-sm text-destructive/80 mt-1">{viewingTemplate.rejection_reason}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Variables</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {getVariablePreview(viewingTemplate.content).map((v, i) => (
                    <Badge key={i} variant="secondary" className="font-mono">{`{{${v}}}`} → position {i + 1}</Badge>
                  ))}
                </div>
              </div>
              {!canEdit(viewingTemplate.approval_status) && viewingTemplate.approval_status !== "draft" && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700">
                  🔒 {getEditBlockReason(viewingTemplate.approval_status)}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Template & Submit to Meta</DialogTitle>
            <DialogDescription>Template will be auto-submitted for Meta approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input placeholder="e.g., renewal_reminder_v2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">Lowercase + underscores only. Auto-normalized.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category *</Label>
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
              <Label>Message Body * <span className="text-muted-foreground text-[11px]">({form.content.length}/1024)</span></Label>
              <Textarea
                placeholder={"Hello {{customer_name}}! 🚗\n\nYour policy for {{vehicle}} expires on {{expiry_date}}."}
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={5}
                className={form.content.length > 1024 ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">Use {"{{variable_name}}"} — auto-converted to {"{{1}}, {{2}}"} for Meta. Max 1024 chars.</p>
            </div>
            <div className="space-y-2">
              <Label>Footer (optional)</Label>
              <Input placeholder="Reply STOP to opt out" value={form.footer} onChange={e => setForm({ ...form, footer: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={form.content.length > 1024}><Send className="h-4 w-4 mr-2" /> Create & Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit & Resubmit Dialog — ONLY for rejected/draft templates */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.approval_status === "rejected" ? "Fix Rejected Template & Resubmit" : "Edit Draft & Submit"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate?.approval_status === "rejected" 
                ? "Old rejected version will be deleted from Meta. A new version will be submitted."
                : "Submit this draft to Meta for approval."}
            </DialogDescription>
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
              <Input value={editingTemplate?.name || ""} disabled className="opacity-60 font-mono" />
              <p className="text-[11px] text-muted-foreground">Name cannot change — Meta links by name.</p>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message Body * <span className="text-muted-foreground text-[11px]">({form.content.length}/1024)</span></Label>
              <Textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={6}
                className={form.content.length > 1024 ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">Fix the issue mentioned in rejection reason above. Max 1024 chars.</p>
            </div>
            <div className="space-y-2">
              <Label>Footer</Label>
              <Input value={form.footer} onChange={e => setForm({ ...form, footer: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button onClick={handleEditAndResubmit} disabled={form.content.length > 1024}>
              <RefreshCw className="h-4 w-4 mr-2" /> 
              {editingTemplate?.approval_status === "rejected" ? "Delete Old & Resubmit" : "Submit to Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
