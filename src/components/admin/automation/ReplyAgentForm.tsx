import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  agentId: string | null;
  onClose: () => void;
}

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (fast, default)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (balanced)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (best reasoning)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5 (premium)" },
];

export function ReplyAgentForm({ agentId, onClose }: Props) {
  const isEdit = !!agentId;
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testInput, setTestInput] = useState("Hi, I want to know about your car loan rates");
  const [testReply, setTestReply] = useState<string>("");

  const [form, setForm] = useState<any>({
    name: "",
    description: "",
    vertical_id: null,
    channel: "whatsapp",
    trigger_type: "inbound_message",
    trigger_keywords: [] as string[],
    system_prompt:
      "You are a friendly customer support agent for GrabYourCar. Reply concisely and professionally in the same language the customer uses. Always ask for their name and city if not provided.",
    knowledge_base: "",
    ai_model: "google/gemini-3-flash-preview",
    temperature: 0.7,
    auto_send: false,
    business_hours_only: false,
    business_start_hour: 9,
    business_end_hour: 21,
    max_replies_per_lead: 5,
    is_active: true,
  });
  const [keywordInput, setKeywordInput] = useState("");

  const { data: verticals = [] } = useQuery({
    queryKey: ["business-verticals-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_verticals")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      const { data, error } = await supabase
        .from("reply_agents")
        .select("*")
        .eq("id", agentId)
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      setForm({ ...data, trigger_keywords: data.trigger_keywords || [] });
    })();
  }, [agentId]);

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.system_prompt?.trim()) {
      toast.error("System prompt is required");
      return;
    }
    setSaving(true);
    try {
      const { id, business_verticals, total_runs, total_replies_sent, total_approvals_pending, last_run_at, last_error, created_at, updated_at, ...rest } = form;
      const payload = {
        ...rest,
        vertical_slug: verticals.find((v: any) => v.id === form.vertical_id)?.slug || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("reply_agents").update(payload).eq("id", agentId!);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("reply_agents").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
      toast.success(isEdit ? "Agent updated" : "Agent created");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!agentId) {
      toast.error("Save the agent first, then test");
      return;
    }
    setTesting(true);
    setTestReply("");
    try {
      const { data, error } = await supabase.functions.invoke("reply-agent-runner", {
        body: {
          agent_id: agentId,
          inbound_message: testInput,
          test_mode: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTestReply(data?.reply || "(empty)");
      toast.success(`Reply generated in ${data?.duration_ms}ms`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  const addKeyword = () => {
    const k = keywordInput.trim();
    if (!k) return;
    setForm((p: any) => ({ ...p, trigger_keywords: [...(p.trigger_keywords || []), k] }));
    setKeywordInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEdit ? "Update Agent" : "Create Agent"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">1. Identity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Agent Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Car Loan Inquiry Bot"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description || ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this agent do?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vertical</Label>
              <Select
                value={form.vertical_id || "all"}
                onValueChange={(v) => setForm({ ...form, vertical_id: v === "all" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="All verticals" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All verticals</SelectItem>
                  {verticals.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Trigger</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>When should this agent run?</Label>
            <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound_message">Any inbound message</SelectItem>
                <SelectItem value="keyword">Specific keywords</SelectItem>
                <SelectItem value="new_lead">New lead created</SelectItem>
                <SelectItem value="any">Any event (catch-all)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.trigger_type === "keyword" && (
            <div>
              <Label>Trigger Keywords</Label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                  placeholder="Type keyword & press Enter"
                />
                <Button type="button" variant="outline" onClick={addKeyword}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.trigger_keywords?.map((k: string, i: number) => (
                  <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                    {k}
                    <button
                      onClick={() => setForm({ ...form, trigger_keywords: form.trigger_keywords.filter((_: any, idx: number) => idx !== i) })}
                      className="text-muted-foreground hover:text-destructive"
                    >×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">3. AI Brain</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>System Prompt *</Label>
            <Textarea
              rows={5}
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              placeholder="Define the agent's personality, role, and rules..."
            />
          </div>
          <div>
            <Label>Knowledge Base (optional)</Label>
            <Textarea
              rows={6}
              value={form.knowledge_base || ""}
              onChange={(e) => setForm({ ...form, knowledge_base: e.target.value })}
              placeholder="Paste FAQs, pricing, policies, product info that the AI should reference..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>AI Model</Label>
              <Select value={form.ai_model} onValueChange={(v) => setForm({ ...form, ai_model: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Temperature ({form.temperature})</Label>
              <Input
                type="number" step="0.1" min="0" max="2"
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">4. Behavior</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-send replies</Label>
              <p className="text-xs text-muted-foreground">If off, replies wait for manual approval.</p>
            </div>
            <Switch checked={form.auto_send} onCheckedChange={(v) => setForm({ ...form, auto_send: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Business hours only</Label>
              <p className="text-xs text-muted-foreground">Only run between start & end hours.</p>
            </div>
            <Switch checked={form.business_hours_only} onCheckedChange={(v) => setForm({ ...form, business_hours_only: v })} />
          </div>
          {form.business_hours_only && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start hour</Label>
                <Input type="number" min="0" max="23" value={form.business_start_hour}
                  onChange={(e) => setForm({ ...form, business_start_hour: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>End hour</Label>
                <Input type="number" min="0" max="23" value={form.business_end_hour}
                  onChange={(e) => setForm({ ...form, business_end_hour: parseInt(e.target.value) })} />
              </div>
            </div>
          )}
          <div>
            <Label>Max replies per lead</Label>
            <Input type="number" min="1" value={form.max_replies_per_lead}
              onChange={(e) => setForm({ ...form, max_replies_per_lead: parseInt(e.target.value) })} />
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <Label>Active</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> 5. Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isEdit && (
            <p className="text-sm text-muted-foreground">Save the agent first, then test it here.</p>
          )}
          <div>
            <Label>Sample customer message</Label>
            <Textarea rows={2} value={testInput} onChange={(e) => setTestInput(e.target.value)} />
          </div>
          <Button onClick={handleTest} disabled={testing || !isEdit} className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run Test
          </Button>
          {testReply && (
            <div className="bg-muted/40 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground mb-1">AI Reply:</p>
              <p className="text-sm whitespace-pre-wrap">{testReply}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}