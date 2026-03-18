import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Edit2, Trash2, Eye, Copy, Send } from "lucide-react";

const TEMPLATE_TYPES = [
  { value: "offer_letter", label: "Offer Letter" },
  { value: "appointment_letter", label: "Appointment Letter" },
  { value: "warning_letter", label: "Warning Letter" },
  { value: "kpi_document", label: "KPI Document" },
  { value: "salary_revision", label: "Salary Revision" },
  { value: "experience_letter", label: "Experience Letter" },
  { value: "termination_letter", label: "Termination Letter" },
  { value: "custom", label: "Custom Template" },
];

export const HRTemplates = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: templates = [] } = useQuery({
    queryKey: ["hr-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("hr_templates") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (tmpl: any) => {
      const payload = {
        template_name: tmpl.template_name,
        template_type: tmpl.template_type,
        content: tmpl.content,
        variables: tmpl.variables?.split(",").map((v: string) => v.trim()).filter(Boolean) || [],
        is_active: true,
        created_by: user?.id,
      };
      if (editing?.id) {
        const { error } = await (supabase.from("hr_templates") as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("hr_templates") as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-templates"] });
      toast.success(editing ? "Template updated" : "Template created");
      setShowDialog(false);
      setEditing(null);
      setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("hr_templates") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-templates"] });
      toast.success("Template deleted");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">HR Templates</h2>
          <p className="text-sm text-muted-foreground">{templates.length} templates</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({}); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Create Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t: any) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{t.template_name}</CardTitle>
                <Badge variant="outline">{TEMPLATE_TYPES.find(tt => tt.value === t.template_type)?.label || t.template_type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{t.content?.slice(0, 150)}...</p>
              {t.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.variables.map((v: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setPreview(t)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditing(t);
                  setForm({ ...t, variables: t.variables?.join(", ") || "" });
                  setShowDialog(true);
                }}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                  if (confirm("Delete?")) deleteMutation.mutate(t.id);
                }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No templates yet. Create your first template.</p>
          </CardContent></Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Template" : "Create Template"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Template Name *</Label><Input value={form.template_name || ""} onChange={e => setForm(p => ({ ...p, template_name: e.target.value }))} /></div>
            <div>
              <Label>Template Type</Label>
              <Select value={form.template_type || ""} onValueChange={v => setForm(p => ({ ...p, template_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Content (use {`{{variable_name}}`} for dynamic fields)</Label>
              <Textarea rows={12} value={form.content || ""} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Dear {{employee_name}},&#10;&#10;We are pleased to offer you the position of {{designation}} at GrabYourCar..." />
            </div>
            <div>
              <Label>Variables (comma-separated)</Label>
              <Input value={form.variables || ""} onChange={e => setForm(p => ({ ...p, variables: e.target.value }))} placeholder="employee_name, designation, salary, joining_date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.template_name || !form.template_type}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{preview?.template_name}</DialogTitle></DialogHeader>
          <div className="bg-muted/30 p-6 rounded-lg whitespace-pre-wrap text-sm font-mono">{preview?.content}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRTemplates;
