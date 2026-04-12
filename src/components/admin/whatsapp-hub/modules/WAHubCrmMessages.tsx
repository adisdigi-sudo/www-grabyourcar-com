import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, X, Search, Filter, Plus, Trash2, MessageSquareText, Copy } from "lucide-react";

interface CrmTemplate {
  id: string;
  slug: string;
  vertical: string;
  category: string;
  label: string;
  body_text: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

const VERTICALS = ["general", "insurance", "sales", "loans", "hsrp", "rental", "cross_sell"];
const CATEGORIES = ["greeting", "follow_up", "quote_share", "status_update", "document_request", "renewal", "offer", "share", "journey"];

const VERTICAL_COLORS: Record<string, string> = {
  insurance: "bg-blue-100 text-blue-700",
  sales: "bg-green-100 text-green-700",
  loans: "bg-amber-100 text-amber-700",
  hsrp: "bg-purple-100 text-purple-700",
  rental: "bg-cyan-100 text-cyan-700",
  cross_sell: "bg-rose-100 text-rose-700",
  general: "bg-gray-100 text-gray-700",
};

function useCrmMessageTemplates() {
  return useQuery({
    queryKey: ["crm-message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_message_templates")
        .select("*")
        .order("vertical")
        .order("category")
        .order("label");
      if (error) throw error;
      return data as CrmTemplate[];
    },
  });
}

export function WAHubCrmMessages() {
  const { data: templates, isLoading } = useCrmMessageTemplates();
  const [search, setSearch] = useState("");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, body_text, label }: { id: string; body_text: string; label: string }) => {
      const { error } = await supabase
        .from("crm_message_templates")
        .update({ body_text, label })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-message-templates"] });
      setEditingId(null);
      toast({ title: "Template updated ✓" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("crm_message_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-message-templates"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-message-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const filtered = (templates || []).filter((t) => {
    if (verticalFilter !== "all" && t.vertical !== verticalFilter) return false;
    if (search && !t.label.toLowerCase().includes(search.toLowerCase()) && !t.slug.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, CrmTemplate[]>>((acc, t) => {
    const key = t.vertical;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-green-600" />
            CRM Message Templates
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Edit WhatsApp messages used across Follow-ups, Quote Shares, Status Updates etc.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search templates..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={verticalFilter} onValueChange={setVerticalFilter}>
          <SelectTrigger className="w-40 h-9">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Verticals</SelectItem>
            {VERTICALS.map((v) => (
              <SelectItem key={v} value={v}>{v.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">Total: {templates?.length || 0}</Badge>
        <Badge variant="outline" className="text-xs text-green-600">Active: {templates?.filter(t => t.is_active).length || 0}</Badge>
        <Badge variant="outline" className="text-xs text-muted-foreground">Inactive: {templates?.filter(t => !t.is_active).length || 0}</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No templates found</div>
      ) : (
        Object.entries(grouped).map(([vertical, items]) => (
          <div key={vertical} className="space-y-2">
            <h3 className="text-sm font-semibold capitalize flex items-center gap-2">
              <Badge className={VERTICAL_COLORS[vertical] || "bg-gray-100 text-gray-700"}>
                {vertical.replace("_", " ")}
              </Badge>
              <span className="text-muted-foreground text-xs">({items.length})</span>
            </h3>
            <div className="grid gap-2">
              {items.map((tpl) => (
                <Card key={tpl.id} className={`transition-all ${!tpl.is_active ? "opacity-50" : ""}`}>
                  <CardContent className="p-3">
                    {editingId === tpl.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          placeholder="Label"
                          className="h-8 text-sm font-medium"
                        />
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={6}
                          className="text-sm font-mono"
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Variables:</span>
                          {tpl.variables?.map((v) => (
                            <Badge key={v} variant="outline" className="text-[10px] cursor-pointer" onClick={() => setEditText(prev => prev + `{{${v}}}`)}>
                              {"{{" + v + "}}"}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5 mr-1" /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: tpl.id, body_text: editText, label: editLabel })}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-3.5 w-3.5 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{tpl.label}</span>
                            <Badge variant="outline" className="text-[10px]">{tpl.category.replace("_", " ")}</Badge>
                            <code className="text-[10px] text-muted-foreground">{tpl.slug}</code>
                          </div>
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed line-clamp-3">
                            {tpl.body_text}
                          </pre>
                          {tpl.variables?.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {tpl.variables.map((v) => (
                                <Badge key={v} variant="secondary" className="text-[9px] h-4">
                                  {v}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Switch
                            checked={tpl.is_active}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: tpl.id, is_active: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingId(tpl.id);
                              setEditText(tpl.body_text);
                              setEditLabel(tpl.label);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => {
                              if (confirm("Delete this template?")) deleteMutation.mutate(tpl.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add Dialog */}
      <AddTemplateDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}

function AddTemplateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [vertical, setVertical] = useState("general");
  const [category, setCategory] = useState("greeting");
  const [bodyText, setBodyText] = useState("");
  const [variables, setVariables] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const vars = variables.split(",").map((v) => v.trim()).filter(Boolean);
      const { error } = await supabase.from("crm_message_templates").insert({
        slug,
        label,
        vertical,
        category,
        body_text: bodyText,
        variables: vars,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-message-templates"] });
      toast({ title: "Template created ✓" });
      onClose();
      setSlug(""); setLabel(""); setBodyText(""); setVariables("");
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add CRM Message Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Slug (unique key)</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. insurance_welcome" className="h-8" />
            </div>
            <div>
              <label className="text-xs font-medium">Label</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Insurance Welcome" className="h-8" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Vertical</label>
              <Select value={vertical} onValueChange={setVertical}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Message Body (use {"{{variable}}"} for dynamic content)</label>
            <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={6} className="font-mono text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium">Variables (comma-separated)</label>
            <Input value={variables} onChange={(e) => setVariables(e.target.value)} placeholder="customer_name, vehicle_number" className="h-8" />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!slug || !label || !bodyText || createMutation.isPending} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Create Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
