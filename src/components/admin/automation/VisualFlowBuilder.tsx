import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Play, Save, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = {
  id: string;
  match: string;            // keyword, "*" = any
  ai_prompt?: string;       // if set, forwards to Lovable AI
  reply_template?: string;  // hardcoded reply with {{vars}}
  action?: "none" | "create_lead" | "handover" | "send_template";
  template_name?: string;
};

type Flow = {
  id?: string;
  name: string;
  description?: string;
  trigger_type: "keyword" | "any_inbound" | "new_lead";
  trigger_value?: string;
  vertical?: string;
  is_active: boolean;
  steps: Step[];
};

const HINTS = ["{{name}}", "{{phone}}", "{{vertical}}", "{{policy_number}}", "{{deal_number}}", "{{car_brand}}", "{{car_model}}"];

const newStep = (): Step => ({ id: crypto.randomUUID(), match: "", action: "none" });

export const VisualFlowBuilder = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [active, setActive] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState<string>("");
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("wa_flows").select("*").order("updated_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    const mapped: Flow[] = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      trigger_type: (r.trigger_type as Flow["trigger_type"]) || "keyword",
      trigger_value: r.trigger_config?.value || "",
      vertical: r.vertical || "",
      is_active: !!r.is_active,
      steps: Array.isArray(r.nodes) ? (r.nodes as Step[]) : [],
    }));
    setFlows(mapped);
  };

  useEffect(() => {
    load();
  }, []);

  const create = () =>
    setActive({
      name: "Untitled flow",
      trigger_type: "keyword",
      trigger_value: "",
      is_active: false,
      steps: [newStep()],
    });

  const save = async () => {
    if (!active) return;
    if (!active.name.trim()) return toast.error("Flow needs a name");
    const payload = {
      name: active.name,
      description: active.description || null,
      trigger_type: active.trigger_type,
      trigger_config: { value: active.trigger_value || "" },
      nodes: active.steps,
      edges: [],
      vertical: active.vertical || null,
      is_active: active.is_active,
    };
    const { data, error } = active.id
      ? await supabase.from("wa_flows").update(payload).eq("id", active.id).select().single()
      : await supabase.from("wa_flows").insert(payload).select().single();
    if (error) return toast.error(error.message);
    toast.success("Flow saved");
    setActive({ ...active, id: data.id });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this flow?")) return;
    const { error } = await supabase.from("wa_flows").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    if (active?.id === id) setActive(null);
    load();
  };

  const simulate = async () => {
    if (!active) return;
    setTesting(true);
    setTestOutput("");
    try {
      // Pure client-side simulator: pick first matching step
      const text = testInput.trim().toLowerCase();
      const match = active.steps.find((s) => s.match === "*" || (s.match && text.includes(s.match.toLowerCase())));
      if (!match) {
        setTestOutput("⚠️ No step matched.");
        return;
      }
      if (match.ai_prompt) {
        const { data, error } = await supabase.functions.invoke("ai-generate", {
          body: { prompt: `${match.ai_prompt}\n\nUser said: "${testInput}"`, model: "google/gemini-2.5-flash" },
        });
        if (error) throw error;
        setTestOutput(`🤖 AI: ${data?.text || data?.content || JSON.stringify(data)}`);
      } else {
        setTestOutput(`📝 Reply: ${match.reply_template || "(no reply set)"}\nAction: ${match.action || "none"}`);
      }
    } catch (e: any) {
      setTestOutput(`Error: ${e?.message || "failed"}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[280px_1fr]">
      {/* Sidebar list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Flows</CardTitle>
          <Button size="sm" onClick={create}>
            <Plus className="mr-1 size-4" /> New
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <Loader2 className="mx-auto my-4 size-4 animate-spin" />}
          {!loading && flows.length === 0 && <p className="text-sm text-muted-foreground">No flows yet.</p>}
          {flows.map((f) => (
            <button
              key={f.id}
              onClick={() => setActive(f)}
              className={`w-full rounded-md border p-2 text-left text-sm transition hover:bg-accent ${
                active?.id === f.id ? "border-primary bg-accent" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{f.name}</span>
                <Badge variant={f.is_active ? "default" : "secondary"} className="shrink-0">
                  {f.is_active ? "On" : "Off"}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {f.trigger_type} · {f.steps.length} steps
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Editor */}
      <div className="space-y-4">
        {!active && (
          <Card>
            <CardContent className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
              <Wand2 className="size-10 text-muted-foreground" />
              <p className="text-muted-foreground">Pick a flow on the left or create a new one.</p>
              <Button onClick={create}>
                <Plus className="mr-1 size-4" /> Create flow
              </Button>
            </CardContent>
          </Card>
        )}

        {active && (
          <>
            <Card>
              <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input value={active.name} onChange={(e) => setActive({ ...active, name: e.target.value })} />
                </div>
                <div>
                  <Label>Vertical (optional)</Label>
                  <Input value={active.vertical || ""} onChange={(e) => setActive({ ...active, vertical: e.target.value })} placeholder="insurance / loans / hsrp…" />
                </div>
                <div>
                  <Label>Trigger</Label>
                  <Select value={active.trigger_type} onValueChange={(v: any) => setActive({ ...active, trigger_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Keyword</SelectItem>
                      <SelectItem value="any_inbound">Any inbound message</SelectItem>
                      <SelectItem value="new_lead">New lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Trigger value</Label>
                  <Input value={active.trigger_value || ""} onChange={(e) => setActive({ ...active, trigger_value: e.target.value })} placeholder="e.g. quote, brochure" />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea rows={2} value={active.description || ""} onChange={(e) => setActive({ ...active, description: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={active.is_active} onCheckedChange={(v) => setActive({ ...active, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {active.id && (
                    <Button variant="destructive" size="sm" onClick={() => active.id && remove(active.id)}>
                      <Trash2 className="mr-1 size-4" /> Delete
                    </Button>
                  )}
                  <Button onClick={save}>
                    <Save className="mr-1 size-4" /> Save
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Steps */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Steps</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setActive({ ...active, steps: [...active.steps, newStep()] })}>
                  <Plus className="mr-1 size-4" /> Add step
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {active.steps.map((s, i) => (
                  <div key={s.id} className="rounded-md border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">Step {i + 1}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActive({ ...active, steps: active.steps.filter((x) => x.id !== s.id) })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div>
                        <Label className="text-xs">Match (keyword or *)</Label>
                        <Input
                          value={s.match}
                          onChange={(e) => {
                            const steps = [...active.steps];
                            steps[i] = { ...s, match: e.target.value };
                            setActive({ ...active, steps });
                          }}
                          placeholder="quote / brochure / *"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Action</Label>
                        <Select
                          value={s.action || "none"}
                          onValueChange={(v: Step["action"]) => {
                            const steps = [...active.steps];
                            steps[i] = { ...s, action: v };
                            setActive({ ...active, steps });
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="create_lead">Create lead</SelectItem>
                            <SelectItem value="handover">Handover to agent</SelectItem>
                            <SelectItem value="send_template">Send template</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {s.action === "send_template" && (
                        <div className="md:col-span-2">
                          <Label className="text-xs">Template name</Label>
                          <Input
                            value={s.template_name || ""}
                            onChange={(e) => {
                              const steps = [...active.steps];
                              steps[i] = { ...s, template_name: e.target.value };
                              setActive({ ...active, steps });
                            }}
                          />
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <Label className="text-xs">AI prompt (optional — overrides reply)</Label>
                        <Textarea
                          rows={2}
                          value={s.ai_prompt || ""}
                          onChange={(e) => {
                            const steps = [...active.steps];
                            steps[i] = { ...s, ai_prompt: e.target.value };
                            setActive({ ...active, steps });
                          }}
                          placeholder="You are a helpful insurance agent…"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Reply template</Label>
                        <Textarea
                          rows={2}
                          value={s.reply_template || ""}
                          onChange={(e) => {
                            const steps = [...active.steps];
                            steps[i] = { ...s, reply_template: e.target.value };
                            setActive({ ...active, steps });
                          }}
                          placeholder="Hi {{name}}, here is your quote…"
                        />
                        <div className="mt-1 flex flex-wrap gap-1">
                          {HINTS.map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => {
                                const steps = [...active.steps];
                                steps[i] = { ...s, reply_template: (s.reply_template || "") + " " + h };
                                setActive({ ...active, steps });
                              }}
                              className="rounded border px-1.5 py-0.5 font-mono text-[10px] hover:bg-accent"
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Simulator */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Live Test Simulator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message as the customer would…"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                  />
                  <Button onClick={simulate} disabled={testing}>
                    {testing ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  </Button>
                </div>
                {testOutput && (
                  <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{testOutput}</pre>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default VisualFlowBuilder;
