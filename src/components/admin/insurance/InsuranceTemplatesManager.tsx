import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, Trash2, Copy, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InsurancePdfBrandingManager } from "./InsurancePdfBrandingManager";
import { deleteMetaManagedTemplate, normalizeTemplateName, syncTemplateToMeta } from "@/lib/whatsappTemplateMirror";

const CATEGORIES = [
  "renewal_reminder", "welcome", "policy_issued", "payment", "claim",
  "addon_upsell", "ncb_alert", "lapsed_recovery", "general",
];

const VARIABLES = [
  { key: "{{name}}", desc: "Customer name" },
  { key: "{{phone}}", desc: "Phone number" },
  { key: "{{car_model}}", desc: "Car model" },
  { key: "{{vehicle_number}}", desc: "Vehicle reg number" },
  { key: "{{insurer}}", desc: "Insurer name" },
  { key: "{{premium}}", desc: "Premium amount" },
  { key: "{{expiry_date}}", desc: "Policy expiry" },
  { key: "{{policy_number}}", desc: "Policy number" },
  { key: "{{ncb}}", desc: "NCB percentage" },
  { key: "{{idv}}", desc: "IDV amount" },
];

interface Template {
  id: string;
  template_name: string;
  template_id: string | null;
  category: string;
  language: string;
  description: string | null;
  variables: any;
  sample_body: string | null;
  trigger_event: string | null;
  is_active: boolean;
  provider: string;
  created_at: string;
}

export function InsuranceTemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState({
    template_name: "",
    category: "renewal_reminder",
    description: "",
    sample_body: "",
    language: "en_US",
  });
  const { toast } = useToast();

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("wa_template_catalog")
      .select("*")
      .order("created_at", { ascending: false });
    // Filter insurance-related templates
    const insTemplates = (data || []).filter((t: any) =>
      ["renewal_reminder", "welcome", "policy_issued", "payment", "claim", "addon_upsell", "ncb_alert", "lapsed_recovery"].includes(t.category) ||
      t.template_name?.includes("insurance")
    );
    setTemplates(insTemplates as Template[]);
  };

  const handleCreate = async () => {
    if (!form.template_name || !form.sample_body) {
      toast({ title: "Name and body required", variant: "destructive" });
      return;
    }
    // Extract variables from sample_body
    const vars = (form.sample_body.match(/\{\{(\w+)\}\}/g) || []).map(v => v.replace(/[{}]/g, ""));
    const normalizedName = normalizeTemplateName(form.template_name);
    
    const { data: inserted, error } = await supabase.from("wa_template_catalog").insert({
      template_name: normalizedName,
      category: form.category,
      description: form.description || null,
      sample_body: form.sample_body,
      language: form.language,
      variables: vars,
      provider: "meta",
      is_active: true,
    }).select("id").single();
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      try {
        const syncResult = await syncTemplateToMeta({
          name: normalizedName,
          displayName: form.template_name,
          body: form.sample_body,
          category: form.category,
          language: form.language,
          vertical: "Insurance",
          variables: vars,
        });

        await supabase.from("wa_template_catalog").update({
          template_id: syncResult.templateId,
        }).eq("id", inserted.id);

        if (syncResult.error) {
          toast({ title: "Template created locally", description: `Meta submission failed: ${syncResult.error}`, variant: "destructive" });
        } else {
          toast({ title: "Template submitted to Meta" });
        }
      } catch (syncError: any) {
        toast({ title: "Template created locally", description: `Meta sync failed: ${syncError.message}`, variant: "destructive" });
      }

      setIsCreating(false);
      fetchTemplates();
    }
  };

  const toggleTemplate = async (id: string, isActive: boolean) => {
    await supabase.from("wa_template_catalog").update({ is_active: !isActive }).eq("id", id);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const template = templates.find((item) => item.id === id);
    if (template?.template_id || template?.template_name) {
      await deleteMetaManagedTemplate({ templateId: template.template_id, name: template.template_name });
    }
    await supabase.from("wa_template_catalog").delete().eq("id", id);
    toast({ title: "Template deleted" });
    fetchTemplates();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Insurance WhatsApp Templates
          </h2>
          <p className="text-sm text-muted-foreground">Manage templates for insurance automation flows</p>
        </div>
        <Button size="sm" onClick={() => setIsCreating(true)}><Plus className="h-4 w-4 mr-1" /> New Template</Button>
      </div>

      <InsurancePdfBrandingManager />

      {/* Variable Reference */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Available Variables</p>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map(v => (
              <Badge key={v.key} variant="outline" className="text-xs cursor-pointer" title={v.desc}
                onClick={() => navigator.clipboard.writeText(v.key)}>
                {v.key}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <div className="grid gap-3">
        {templates.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No insurance templates yet. Create your first one.
          </CardContent></Card>
        ) : templates.map(tmpl => (
          <Card key={tmpl.id} className={!tmpl.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Switch checked={tmpl.is_active} onCheckedChange={() => toggleTemplate(tmpl.id, tmpl.is_active)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium font-mono text-sm">{tmpl.template_name}</p>
                      <Badge variant="secondary" className="text-xs">{tmpl.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tmpl.sample_body}</p>
                    {tmpl.variables && Array.isArray(tmpl.variables) && tmpl.variables.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {(tmpl.variables as string[]).map((v: string) => (
                          <Badge key={v} variant="outline" className="text-xs">{`{{${v}}}`}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewTemplate(tmpl)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => deleteTemplate(tmpl.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Insurance Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input placeholder="e.g., insurance_renewal_30d" value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="What this template is for" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Message Body *</Label>
              <Textarea
                placeholder="Hi {{name}}! Your car insurance for {{car_model}} ({{vehicle_number}}) expires on {{expiry_date}}..."
                value={form.sample_body}
                onChange={e => setForm({ ...form, sample_body: e.target.value })}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Click variables above to copy them</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate}><MessageSquare className="h-4 w-4 mr-2" /> Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Template Preview</DialogTitle></DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <p className="text-sm whitespace-pre-wrap">
                  {(previewTemplate.sample_body || "")
                    .replace(/\{\{name\}\}/g, "Rahul Sharma")
                    .replace(/\{\{car_model\}\}/g, "Hyundai Creta")
                    .replace(/\{\{vehicle_number\}\}/g, "DL 01 AB 1234")
                    .replace(/\{\{expiry_date\}\}/g, "15 Mar 2026")
                    .replace(/\{\{premium\}\}/g, "₹12,500")
                    .replace(/\{\{insurer\}\}/g, "HDFC ERGO")
                    .replace(/\{\{policy_number\}\}/g, "POL-2025-001")
                    .replace(/\{\{ncb\}\}/g, "50%")
                    .replace(/\{\{idv\}\}/g, "₹8,50,000")
                    .replace(/\{\{phone\}\}/g, "9876543210")}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Template: <span className="font-mono">{previewTemplate.template_name}</span></p>
                <p>Category: {previewTemplate.category}</p>
                <p>Provider: {previewTemplate.provider}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
