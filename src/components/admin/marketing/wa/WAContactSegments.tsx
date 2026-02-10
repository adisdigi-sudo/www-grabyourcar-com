import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Trash2, Filter, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  rules: Array<{ field: string; operator: string; value: string }>;
  estimated_count: number;
  is_dynamic: boolean;
  created_at: string;
}

const FIELDS = [
  { value: "priority", label: "Lead Priority" },
  { value: "status", label: "Lead Status" },
  { value: "service_category", label: "Service Category" },
  { value: "city", label: "City" },
  { value: "source", label: "Lead Source" },
  { value: "car_model", label: "Car Model" },
  { value: "lead_type", label: "Lead Type" },
];

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
];

export function WAContactSegments() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [rules, setRules] = useState<Array<{ field: string; operator: string; value: string }>>([
    { field: "priority", operator: "equals", value: "" },
  ]);
  const { toast } = useToast();

  useEffect(() => { fetchSegments(); }, []);

  const fetchSegments = async () => {
    const { data } = await supabase.from("wa_contact_segments").select("*").order("name");
    if (data) setSegments(data as any);
  };

  const estimateCount = async () => {
    // Build a query to estimate matching leads
    const activeRules = rules.filter(r => r.value);
    // Use RPC or simple count with filters applied manually
    const { data, error } = await supabase.from("leads").select("id");
    if (error || !data) return 0;
    
    return data.filter(lead => {
      return activeRules.every(rule => {
        const val = (lead as any)[rule.field];
        if (!val) return false;
        if (rule.operator === "equals") return val === rule.value;
        if (rule.operator === "not_equals") return val !== rule.value;
        if (rule.operator === "contains") return String(val).toLowerCase().includes(rule.value.toLowerCase());
        return true;
      });
    }).length;
  };

  const handleCreate = async () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    const count = await estimateCount();
    const { error } = await supabase.from("wa_contact_segments").insert({
      name: form.name,
      description: form.description || null,
      rules: rules.filter(r => r.value),
      estimated_count: count,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Segment created with ~${count} contacts` }); setIsCreating(false); fetchSegments(); }
  };

  const handleRefreshCount = async (segment: Segment) => {
    const { data } = await supabase.from("leads").select("id");
    if (!data) return;
    
    const count = data.filter(lead => {
      return segment.rules.every(rule => {
        if (!rule.value) return true;
        const val = (lead as any)[rule.field];
        if (!val) return false;
        if (rule.operator === "equals") return val === rule.value;
        if (rule.operator === "not_equals") return val !== rule.value;
        if (rule.operator === "contains") return String(val).toLowerCase().includes(rule.value.toLowerCase());
        return true;
      });
    }).length;
    
    await supabase.from("wa_contact_segments").update({ estimated_count: count }).eq("id", segment.id);
    toast({ title: `Updated: ${count} contacts` });
    fetchSegments();
  };

  const deleteSegment = async (id: string) => {
    if (!confirm("Delete this segment?")) return;
    await supabase.from("wa_contact_segments").delete().eq("id", id);
    toast({ title: "Segment deleted" });
    fetchSegments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Contact Segments</h2>
          <p className="text-sm text-muted-foreground">Create reusable audience segments for campaigns</p>
        </div>
        <Button size="sm" onClick={() => setIsCreating(true)}><Plus className="h-4 w-4 mr-1" /> New Segment</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments.length === 0 ? (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">
            <Filter className="h-10 w-10 mx-auto mb-3 opacity-30" />
            No segments yet. Create your first audience segment.
          </CardContent></Card>
        ) : segments.map(seg => (
          <Card key={seg.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{seg.name}</p>
                  {seg.description && <p className="text-xs text-muted-foreground mt-1">{seg.description}</p>}
                </div>
                <Badge variant="secondary" className="text-lg font-bold">{seg.estimated_count}</Badge>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {seg.rules.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {FIELDS.find(f => f.value === r.field)?.label || r.field} {r.operator} "{r.value}"
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" onClick={() => handleRefreshCount(seg)}><RefreshCw className="h-3 w-3 mr-1" /> Refresh</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteSegment(seg.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Segment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Segment Name *</Label>
              <Input placeholder="e.g., Hot Leads in Delhi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-3">
              <Label>Filter Rules</Label>
              {rules.map((rule, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select value={rule.field} onValueChange={v => { const r = [...rules]; r[idx].field = v; setRules(r); }}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={rule.operator} onValueChange={v => { const r = [...rules]; r[idx].operator = v; setRules(r); }}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Value" value={rule.value} onChange={e => { const r = [...rules]; r[idx].value = e.target.value; setRules(r); }} />
                  {rules.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => setRules(rules.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setRules([...rules, { field: "priority", operator: "equals", value: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Rule
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Users className="h-4 w-4 mr-2" /> Create Segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
