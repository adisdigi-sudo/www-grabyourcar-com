import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Code, Layers, Copy, Sparkles } from "lucide-react";

interface DynamicRule {
  id: string;
  name: string;
  description: string | null;
  conditions: any[];
  content_html: string;
  fallback_html: string;
  is_active: boolean;
  created_at: string;
}

interface Condition {
  field: string;
  operator: string;
  value: string;
}

const FIELDS = [
  { value: "tags", label: "Tags" },
  { value: "source", label: "Source" },
  { value: "company", label: "Company" },
  { value: "engagement_score", label: "Engagement Score" },
  { value: "timezone", label: "Timezone" },
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "has_tag", label: "Has Tag" },
];

export function DynamicContentBuilder() {
  const [rules, setRules] = useState<DynamicRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([{ field: "tags", operator: "has_tag", value: "" }]);
  const [contentHtml, setContentHtml] = useState("");
  const [fallbackHtml, setFallbackHtml] = useState("");

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    setIsLoading(true);
    const { data } = await (supabase as any).from("dynamic_content_rules").select("*").order("created_at", { ascending: false });
    if (data) setRules(data);
    setIsLoading(false);
  };

  const createRule = async () => {
    if (!name.trim() || !contentHtml.trim()) { toast.error("Name and content are required"); return; }
    const { error } = await (supabase as any).from("dynamic_content_rules").insert({
      name: name.trim(),
      description: description || null,
      conditions,
      content_html: contentHtml,
      fallback_html: fallbackHtml,
      is_active: true,
    });
    if (error) { toast.error("Failed to create rule"); return; }
    toast.success("Dynamic content rule created");
    setShowCreate(false);
    setName(""); setDescription(""); setContentHtml(""); setFallbackHtml("");
    setConditions([{ field: "tags", operator: "has_tag", value: "" }]);
    fetchRules();
  };

  const toggleRule = async (id: string, active: boolean) => {
    await (supabase as any).from("dynamic_content_rules").update({ is_active: active }).eq("id", id);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    await (supabase as any).from("dynamic_content_rules").delete().eq("id", id);
    toast.success("Rule deleted");
    fetchRules();
  };

  const copyPlaceholder = (ruleName: string) => {
    navigator.clipboard.writeText(`{{dynamic:${ruleName}}}`);
    toast.success(`Copied {{dynamic:${ruleName}}} — paste this in your email template`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Dynamic Content Rules
              </CardTitle>
              <CardDescription>
                Show different content to different subscribers based on their attributes. Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{dynamic:rule_name}}"}</code> in your templates.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />New Rule</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No dynamic content rules yet. Create one to personalize your emails.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Placeholder</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="font-medium">{rule.name}</div>
                      {rule.description && <div className="text-xs text-muted-foreground">{rule.description}</div>}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="text-xs font-mono gap-1" onClick={() => copyPlaceholder(rule.name)}>
                        <Copy className="h-3 w-3" />{`{{dynamic:${rule.name}}}`}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {(Array.isArray(rule.conditions) ? rule.conditions : []).map((c: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs mr-1">{c.field} {c.operator} {c.value}</Badge>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Switch checked={rule.is_active} onCheckedChange={(v) => toggleRule(rule.id, v)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Dynamic Content Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Rule Name (used as placeholder)</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="vip_offer" /></div>
              <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Special offer for VIP subscribers" /></div>
            </div>

            <div>
              <Label className="mb-2 block">Conditions (ALL must match)</Label>
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Select value={cond.field} onValueChange={(v) => { const c = [...conditions]; c[idx].field = v; setConditions(c); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={cond.operator} onValueChange={(v) => { const c = [...conditions]; c[idx].operator = v; setConditions(c); }}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={cond.value} onChange={(e) => { const c = [...conditions]; c[idx].value = e.target.value; setConditions(c); }} placeholder="Value" className="flex-1" />
                  {conditions.length > 1 && <Button variant="ghost" size="icon" onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setConditions([...conditions, { field: "tags", operator: "has_tag", value: "" }])}><Plus className="h-3 w-3 mr-1" />Add Condition</Button>
            </div>

            <div>
              <Label>Content HTML (shown when conditions match)</Label>
              <Textarea value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} rows={4} placeholder='<div style="background:#f0f0f0;padding:16px;border-radius:8px"><h3>🎉 Exclusive VIP Offer!</h3><p>Get 20% off your next purchase.</p></div>' />
            </div>

            <div>
              <Label>Fallback HTML (shown when conditions don't match)</Label>
              <Textarea value={fallbackHtml} onChange={(e) => setFallbackHtml(e.target.value)} rows={3} placeholder='<div style="padding:16px"><p>Check out our latest deals!</p></div>' />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createRule}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
