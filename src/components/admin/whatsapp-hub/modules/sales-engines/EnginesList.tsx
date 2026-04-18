import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Plus, Edit, Power, MessageSquare, Sparkles, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VERTICALS, type SalesEngine } from "./types";

interface Props {
  onEdit: (engineId: string) => void;
}

export function EnginesList({ onEdit }: Props) {
  const [engines, setEngines] = useState<SalesEngine[]>([]);
  const [stats, setStats] = useState<Record<string, { steps: number; active: number; qualified: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVertical, setNewVertical] = useState("loans");
  const [launchEngine, setLaunchEngine] = useState<SalesEngine | null>(null);
  const [launchPhones, setLaunchPhones] = useState("");
  const [launching, setLaunching] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("sales_engines" as any)
      .select("*")
      .order("created_at", { ascending: false });
    const list = ((data || []) as unknown as SalesEngine[]);
    setEngines(list);

    // load counts
    const newStats: typeof stats = {};
    for (const eng of list) {
      const [{ count: stepCount }, { count: activeCount }, { count: qualifiedCount }] = await Promise.all([
        supabase.from("sales_engine_steps" as any).select("*", { count: "exact", head: true }).eq("engine_id", eng.id),
        supabase.from("sales_engine_sessions" as any).select("*", { count: "exact", head: true }).eq("engine_id", eng.id).in("status", ["active", "pending_reply"]),
        supabase.from("sales_engine_sessions" as any).select("*", { count: "exact", head: true }).eq("engine_id", eng.id).eq("status", "qualified"),
      ]);
      newStats[eng.id] = {
        steps: stepCount || 0,
        active: activeCount || 0,
        qualified: qualifiedCount || 0,
      };
    }
    setStats(newStats);
    setLoading(false);
  }

  async function toggleActive(eng: SalesEngine) {
    await supabase.from("sales_engines" as any).update({ is_active: !eng.is_active }).eq("id", eng.id);
    toast({ title: eng.is_active ? "Engine paused" : "Engine activated ✓" });
    load();
  }

  async function createEngine() {
    if (!newName.trim()) return;
    const { data, error } = await supabase
      .from("sales_engines" as any)
      .insert({ name: newName.trim(), vertical: newVertical, language: "hinglish", is_active: false })
      .select()
      .single();
    if (error) {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
      return;
    }
    setShowCreate(false);
    setNewName("");
    toast({ title: "Engine created ✓ — add steps next" });
    if (data) onEdit((data as any).id);
  }

  async function launchBulk() {
    if (!launchEngine) return;
    const phones = launchPhones
      .split(/[\s,;\n]+/)
      .map((p) => p.trim())
      .filter((p) => /^\d{10,13}$/.test(p.replace(/\D/g, "")) && p.replace(/\D/g, "").length >= 10);

    if (phones.length === 0) {
      toast({ title: "No valid phones", description: "Paste 10-digit numbers (one per line or comma-separated)", variant: "destructive" });
      return;
    }
    if (!launchEngine.is_active) {
      toast({ title: "Engine paused", description: "Activate the engine first.", variant: "destructive" });
      return;
    }
    setLaunching(true);
    const { data, error } = await supabase.functions.invoke("sales-engine-launcher", {
      body: { engine_id: launchEngine.id, phones },
    });
    setLaunching(false);
    if (error || !data?.success) {
      toast({ title: "Launch failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }
    toast({
      title: `Launched ✓ — ${data.sent} sent`,
      description: `${data.failed} failed, ${data.skipped} skipped (already active)`,
    });
    setLaunchEngine(null);
    setLaunchPhones("");
    load();
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <Card className="border-green-200 dark:border-green-900 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-600">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2">
                  Sales Engines
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </h2>
                <p className="text-xs text-muted-foreground">
                  Manual conversation flows — bulk video bhejo, customer reply pe engine auto-qualify kare
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreate(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-1" /> New Engine
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Engines grid */}
      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading engines…</div>
      ) : engines.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          No engines yet. Create one above.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {engines.map((eng) => {
            const v = VERTICALS.find((x) => x.value === eng.vertical) || VERTICALS[VERTICALS.length - 1];
            const st = stats[eng.id] || { steps: 0, active: 0, qualified: 0 };
            return (
              <Card key={eng.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-9 w-9 rounded-lg ${v.color} flex items-center justify-center`}>
                        <MessageSquare className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">{eng.name}</h3>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{v.label}</Badge>
                      </div>
                    </div>
                    <Badge variant={eng.is_active ? "default" : "secondary"} className={eng.is_active ? "bg-green-600" : ""}>
                      {eng.is_active ? "Live" : "Paused"}
                    </Badge>
                  </div>

                  {eng.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{eng.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                      <div className="text-lg font-bold text-blue-600">{st.steps}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">Steps</div>
                    </div>
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded">
                      <div className="text-lg font-bold text-amber-600">{st.active}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">Live Chats</div>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
                      <div className="text-lg font-bold text-green-600">{st.qualified}</div>
                      <div className="text-[9px] text-muted-foreground uppercase">Qualified</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => onEdit(eng.id)} className="flex-1 h-8">
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit Flow
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(eng)} className="h-8">
                      <Power className={`h-3.5 w-3.5 ${eng.is_active ? "text-green-600" : "text-muted-foreground"}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Sales Engine</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Engine name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. EV Loan Qualifier" />
            </div>
            <div>
              <Label className="text-xs">Vertical (where qualified leads land)</Label>
              <Select value={newVertical} onValueChange={setNewVertical}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERTICALS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createEngine} className="bg-green-600 hover:bg-green-700">Create & Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
