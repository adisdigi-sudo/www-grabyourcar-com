import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Trash2, Eye, Loader2, MousePointer,
  Clock, Target, PanelTop, Maximize, LayoutList
} from "lucide-react";

interface PopupForm {
  id: string;
  name: string;
  form_type: string;
  trigger_type: string;
  delay_seconds: number;
  html_content: string | null;
  target_url: string | null;
  is_active: boolean;
  impressions: number;
  conversions: number;
  list_id: string | null;
  created_at: string;
}

const FORM_TYPES = [
  { value: "popup", label: "Popup Modal", icon: PanelTop },
  { value: "slide_in", label: "Slide-in", icon: Maximize },
  { value: "bar", label: "Top/Bottom Bar", icon: LayoutList },
  { value: "inline", label: "Inline Form", icon: LayoutList },
];

const TRIGGER_TYPES = [
  { value: "time_delay", label: "After X seconds" },
  { value: "scroll_percent", label: "After scroll %" },
  { value: "exit_intent", label: "Exit intent" },
  { value: "page_load", label: "On page load" },
];

export function PopupFormBuilder() {
  const [forms, setForms] = useState<PopupForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewForm, setPreviewForm] = useState<PopupForm | null>(null);
  const [formData, setFormData] = useState({
    name: "", form_type: "popup", trigger_type: "time_delay",
    delay_seconds: 5, target_url: "", html_content: "",
  });
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [selectedList, setSelectedList] = useState("");

  useEffect(() => {
    fetchForms();
    fetchLists();
  }, []);

  const fetchForms = async () => {
    setIsLoading(true);
    const { data } = await (supabase as any).from("popup_forms").select("*").order("created_at", { ascending: false });
    if (data) setForms(data);
    setIsLoading(false);
  };

  const fetchLists = async () => {
    const { data } = await supabase.from("email_lists").select("id, name");
    if (data) setLists(data);
  };

  const handleCreate = async () => {
    if (!formData.name) { toast.error("Name required"); return; }
    const defaultHtml = `<div style="text-align:center;padding:24px;">
  <h2 style="font-size:24px;font-weight:bold;margin-bottom:8px;">🎉 Get 10% Off!</h2>
  <p style="color:#666;margin-bottom:16px;">Subscribe for exclusive deals on cars & accessories</p>
  <input type="email" placeholder="Enter your email" style="padding:10px 16px;border:1px solid #ddd;border-radius:6px;width:100%;max-width:300px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />
  <button style="background:#2563eb;color:white;padding:10px 24px;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Subscribe Now</button>
</div>`;

    const { error } = await (supabase as any).from("popup_forms").insert({
      ...formData,
      html_content: formData.html_content || defaultHtml,
      list_id: selectedList || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Pop-up form created");
    setIsCreateOpen(false);
    setFormData({ name: "", form_type: "popup", trigger_type: "time_delay", delay_seconds: 5, target_url: "", html_content: "" });
    fetchForms();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await (supabase as any).from("popup_forms").update({ is_active: active }).eq("id", id);
    toast.success(active ? "Form activated" : "Form paused");
    fetchForms();
  };

  const deleteForm = async (id: string) => {
    await (supabase as any).from("popup_forms").delete().eq("id", id);
    toast.success("Form deleted");
    fetchForms();
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><MousePointer className="h-4 w-4" />Pop-up Forms</h3>
          <p className="text-xs text-muted-foreground">Capture leads with targeted pop-ups, slide-ins and bars</p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="h-3 w-3 mr-1" />Create Form</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-2xl font-bold">{forms.length}</p>
          <p className="text-xs text-muted-foreground">Total Forms</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-2xl font-bold">{forms.reduce((s, f) => s + (f.impressions || 0), 0)}</p>
          <p className="text-xs text-muted-foreground">Total Impressions</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-2xl font-bold">{forms.reduce((s, f) => s + (f.conversions || 0), 0)}</p>
          <p className="text-xs text-muted-foreground">Total Conversions</p>
        </CardContent></Card>
      </div>

      {/* Forms Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No forms yet — create your first popup!</TableCell></TableRow>
              ) : forms.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-sm">{f.name}</TableCell>
                  <TableCell><Badge variant="outline">{FORM_TYPES.find(t => t.value === f.form_type)?.label || f.form_type}</Badge></TableCell>
                  <TableCell className="text-xs">{TRIGGER_TYPES.find(t => t.value === f.trigger_type)?.label} {f.trigger_type === "time_delay" ? `(${f.delay_seconds}s)` : ""}</TableCell>
                  <TableCell>
                    <Switch checked={f.is_active} onCheckedChange={v => toggleActive(f.id, v)} />
                  </TableCell>
                  <TableCell className="text-sm">{f.impressions}</TableCell>
                  <TableCell className="text-sm">{f.conversions}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{f.impressions > 0 ? Math.round((f.conversions / f.impressions) * 100) : 0}%</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewForm(f)}><Eye className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteForm(f.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Pop-up Form</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} placeholder="Summer Sale Popup" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Form Type</Label>
                <Select value={formData.form_type} onValueChange={v => setFormData(d => ({ ...d, form_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trigger</Label>
                <Select value={formData.trigger_type} onValueChange={v => setFormData(d => ({ ...d, trigger_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.trigger_type === "time_delay" && (
              <div>
                <Label>Delay (seconds)</Label>
                <Input type="number" value={formData.delay_seconds} onChange={e => setFormData(d => ({ ...d, delay_seconds: parseInt(e.target.value) || 5 }))} />
              </div>
            )}
            <div>
              <Label>Target URL (optional — show only on this page)</Label>
              <Input value={formData.target_url} onChange={e => setFormData(d => ({ ...d, target_url: e.target.value }))} placeholder="/accessories" />
            </div>
            <div>
              <Label>Add to list</Label>
              <Select value={selectedList} onValueChange={setSelectedList}>
                <SelectTrigger><SelectValue placeholder="Select list..." /></SelectTrigger>
                <SelectContent>
                  {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custom HTML (optional)</Label>
              <Textarea value={formData.html_content} onChange={e => setFormData(d => ({ ...d, html_content: e.target.value }))} rows={6} placeholder="Custom HTML..." className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewForm} onOpenChange={() => setPreviewForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Preview: {previewForm?.name}</DialogTitle></DialogHeader>
          {previewForm?.html_content && (
            <div className="border rounded-lg overflow-hidden" dangerouslySetInnerHTML={{ __html: previewForm.html_content }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
