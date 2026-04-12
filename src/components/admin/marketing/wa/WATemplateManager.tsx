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
import { Target, Plus, Trash2, CheckCircle, Clock, XCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { deleteMetaManagedTemplate, normalizeTemplateName, syncTemplateToMeta } from "@/lib/whatsappTemplateMirror";

interface Template {
  id: string;
  name: string;
  category: string;
  template_type: string;
  content: string;
  variables: string[] | null;
  preview: string | null;
  is_approved: boolean;
  is_active: boolean;
  approval_status: string;
  language: string;
  use_cases: string[] | null;
  created_at: string;
}

const CATEGORIES = ["Marketing", "Utility", "Welcome", "Follow-up", "Offer", "Reminder", "Transactional"];

export function WATemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "Marketing", template_type: "text", content: "", language: "en",
  });
  const { toast } = useToast();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase.from("whatsapp_templates").select("*").order("created_at", { ascending: false });
    if (data) setTemplates(data as any);
  };

  const handleCreate = async () => {
    if (!form.name || !form.content) { toast({ title: "Name and content required", variant: "destructive" }); return; }
    
    // Extract variables from content
    const varMatches = form.content.match(/\{(\w+)\}/g);
    const variables = varMatches ? [...new Set(varMatches.map(v => v.replace(/[{}]/g, "")))] : [];
    const normalizedName = normalizeTemplateName(form.name);

    const { data: inserted, error } = await supabase.from("whatsapp_templates").insert({
      name: normalizedName,
      category: form.category,
      template_type: form.template_type,
      content: form.content,
      variables,
      language: form.language,
      approval_status: "pending",
      is_approved: false,
      is_active: true,
    }).select("id").single();

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      try {
        const syncResult = await syncTemplateToMeta({
          name: normalizedName,
          displayName: form.name,
          body: form.content,
          category: form.category,
          language: form.language,
          variables,
        });

        await supabase
          .from("whatsapp_templates")
          .update({
            approval_status: syncResult.status,
            is_approved: syncResult.status === "approved",
          })
          .eq("id", inserted.id);

        if (syncResult.error) {
          toast({ title: "Template saved locally", description: `Meta submission failed: ${syncResult.error}`, variant: "destructive" });
        } else {
          toast({ title: "Template submitted to Meta" });
        }
      } catch (syncError: any) {
        toast({ title: "Template saved locally", description: `Meta sync failed: ${syncError.message}`, variant: "destructive" });
      }

      setIsCreating(false);
      setForm({ name: "", category: "Marketing", template_type: "text", content: "", language: "en" });
      fetchTemplates();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from("whatsapp_templates").update({ is_active: !isActive }).eq("id", id);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const template = templates.find((item) => item.id === id);
    if (template) {
      await deleteMetaManagedTemplate({ name: template.name });
    }
    await supabase.from("whatsapp_templates").delete().eq("id", id);
    toast({ title: "Template deleted" });
    fetchTemplates();
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === "rejected") return <Badge className="bg-destructive/10 text-destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Message Templates</h2>
          <p className="text-sm text-muted-foreground">Manage reusable WhatsApp message templates</p>
        </div>
        <Button size="sm" onClick={() => setIsCreating(true)}><Plus className="h-4 w-4 mr-1" /> New Template</Button>
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No templates yet. Create your first template.
                    </TableCell>
                  </TableRow>
                ) : templates.map(t => (
                  <TableRow key={t.id} className={!t.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{t.content.slice(0, 60)}...</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(t.variables || []).map(v => (
                          <Badge key={v} variant="secondary" className="text-[10px]">{`{${v}}`}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(t.approval_status || "approved")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(t.content); toast({ title: "Copied!" }); }}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
                <Label>Type</Label>
                <Select value={form.template_type} onValueChange={v => setForm({ ...form, template_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message Content *</Label>
              <Textarea
                placeholder="Hello {name}! 🚗&#10;&#10;Check out the best deals on {car_model}..."
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Use {"{variable}"} for dynamic content. Auto-detected on save.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Target className="h-4 w-4 mr-2" /> Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
