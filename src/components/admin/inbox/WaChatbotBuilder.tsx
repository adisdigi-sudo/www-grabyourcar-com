import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, Edit, Bot, MessageSquare, Zap, Brain, Send,
  Tag, ArrowUpDown, Save, TestTube, Shield, Settings, Eye,
  Sparkles, Search, Power, BarChart3, Hash, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatbotRule {
  id: string;
  name: string;
  intent_keywords: string[];
  response_type: string;
  response_content: string | null;
  template_name: string | null;
  ai_prompt: string | null;
  is_active: boolean;
  priority: number;
  vertical: string | null;
  match_count: number;
  last_matched_at: string | null;
  conditions: Record<string, any>;
  created_at: string;
}

const RESPONSE_TYPES = [
  { value: "text", label: "Fixed Text", icon: <MessageSquare className="h-3.5 w-3.5" />, desc: "Send a pre-written message" },
  { value: "template", label: "Template", icon: <Tag className="h-3.5 w-3.5" />, desc: "Send an approved Meta template" },
  { value: "ai_generated", label: "AI Generated", icon: <Sparkles className="h-3.5 w-3.5" />, desc: "Generate response using AI" },
];

export function WaChatbotBuilder() {
  const [rules, setRules] = useState<ChatbotRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editRule, setEditRule] = useState<Partial<ChatbotRule> | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<{ matched: boolean; rule?: ChatbotRule; response?: string } | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [botEnabled, setBotEnabled] = useState(true);

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("wa_chatbot_rules").select("*").order("priority", { ascending: true });
    if (error) toast.error(error.message);
    else setRules((data || []) as unknown as ChatbotRule[]);
    setIsLoading(false);
  };

  const saveRule = async () => {
    if (!editRule?.name || (editRule.intent_keywords || []).length === 0) {
      toast.error("Name and at least one keyword required");
      return;
    }
    const payload = {
      name: editRule.name,
      intent_keywords: editRule.intent_keywords || [],
      response_type: editRule.response_type || "text",
      response_content: editRule.response_content || null,
      template_name: editRule.template_name || null,
      ai_prompt: editRule.ai_prompt || null,
      is_active: editRule.is_active !== false,
      priority: editRule.priority || 10,
      vertical: editRule.vertical || null,
      conditions: editRule.conditions || {},
    };

    if (editRule.id) {
      const { error } = await supabase.from("wa_chatbot_rules").update(payload).eq("id", editRule.id);
      if (error) toast.error(error.message);
      else toast.success("Rule updated");
    } else {
      const { error } = await supabase.from("wa_chatbot_rules").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Rule created");
    }
    setEditOpen(false);
    setEditRule(null);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    await supabase.from("wa_chatbot_rules").delete().eq("id", id);
    toast.success("Deleted");
    fetchRules();
  };

  const toggleRule = async (rule: ChatbotRule) => {
    await supabase.from("wa_chatbot_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
    fetchRules();
  };

  const addKeyword = () => {
    if (!keywordInput.trim() || !editRule) return;
    const keywords = [...(editRule.intent_keywords || []), keywordInput.trim().toLowerCase()];
    setEditRule({ ...editRule, intent_keywords: [...new Set(keywords)] });
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    if (!editRule) return;
    setEditRule({ ...editRule, intent_keywords: (editRule.intent_keywords || []).filter(k => k !== kw) });
  };

  const testBot = () => {
    if (!testMessage.trim()) return;
    const msg = testMessage.toLowerCase();
    const activeRules = rules.filter(r => r.is_active).sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      const allKeywords = rule.intent_keywords.flatMap(kw => kw.split(",").map(k => k.trim().toLowerCase()).filter(Boolean));
      const matched = allKeywords.some(kw => msg.includes(kw));
      if (matched) {
        setTestResult({
          matched: true,
          rule,
          response: rule.response_type === "text" ? rule.response_content || "" : rule.response_type === "ai_generated" ? `[AI would generate response using prompt: "${rule.ai_prompt}"]` : `[Template: ${rule.template_name}]`,
        });
        return;
      }
    }
    setTestResult({ matched: false });
  };

  const activeCount = rules.filter(r => r.is_active).length;
  const totalMatches = rules.reduce((s, r) => s + r.match_count, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                AI Chatbot Builder
                <Badge variant="outline" className="text-[10px]">No-Code</Badge>
              </h2>
              <p className="text-xs text-muted-foreground">Create intent-based auto-replies with keyword detection & AI responses</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={botEnabled} onCheckedChange={setBotEnabled} />
              <Label className="text-xs font-medium">{botEnabled ? "Bot Active" : "Bot Paused"}</Label>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setTestOpen(true); setTestResult(null); setTestMessage(""); }}>
              <TestTube className="h-3.5 w-3.5" /> Test Bot
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => { setEditRule({}); setEditOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> New Rule
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{rules.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Rules</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground">Active Rules</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalMatches}</p>
          <p className="text-[10px] text-muted-foreground">Total Matches</p>
        </CardContent></Card>
      </div>

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Matches</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rules.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Bot className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No chatbot rules yet. Create your first auto-reply rule!</p>
                  </TableCell></TableRow>
                ) : rules.map((rule, idx) => (
                  <TableRow key={rule.id} className="group text-xs">
                    <TableCell className="font-mono text-muted-foreground">{rule.priority}</TableCell>
                    <TableCell>
                      <p className="font-medium">{rule.name}</p>
                      {rule.vertical && <Badge variant="outline" className="text-[9px] mt-0.5">{rule.vertical}</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5 flex-wrap max-w-[150px]">
                        {rule.intent_keywords.slice(0, 4).map(kw => (
                          <Badge key={kw} variant="secondary" className="text-[9px] font-mono">{kw}</Badge>
                        ))}
                        {rule.intent_keywords.length > 4 && <Badge variant="secondary" className="text-[9px]">+{rule.intent_keywords.length - 4}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {RESPONSE_TYPES.find(r => r.value === rule.response_type)?.icon}
                        {RESPONSE_TYPES.find(r => r.value === rule.response_type)?.label || rule.response_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{rule.match_count}</TableCell>
                    <TableCell>
                      <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditRule(rule); setEditOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteRule(rule.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><Brain className="h-4 w-4 text-purple-600" /> How the Chatbot Works</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p className="font-medium text-foreground">1. Customer Sends Message</p>
              <p>When a customer sends a WhatsApp message, the bot scans for matching keywords.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">2. Intent Detection</p>
              <p>Rules are checked in priority order (lowest first). First match wins.</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">3. Auto-Reply</p>
              <p>Bot sends the configured response: fixed text, Meta template, or AI-generated reply.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Rule Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { if (!v) { setEditOpen(false); setEditRule(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editRule?.id ? "Edit" : "Create"} Chatbot Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Rule Name *</Label>
              <Input value={editRule?.name || ""} onChange={e => setEditRule({ ...editRule, name: e.target.value })} placeholder="Greeting Handler" className="h-8 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Priority (lower = higher priority)</Label>
                <Input type="number" value={editRule?.priority || 10} onChange={e => setEditRule({ ...editRule, priority: parseInt(e.target.value) || 10 })} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Vertical (optional)</Label>
                <Input value={editRule?.vertical || ""} onChange={e => setEditRule({ ...editRule, vertical: e.target.value || null })} placeholder="Insurance" className="h-8 text-sm" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Intent Keywords * (customer must say one of these)</Label>
              <div className="flex gap-1 flex-wrap mb-1.5">
                {(editRule?.intent_keywords || []).map(kw => (
                  <Badge key={kw} variant="secondary" className="text-[10px] gap-1 font-mono">
                    {kw} <button onClick={() => removeKeyword(kw)} className="text-destructive hover:text-destructive/80">×</button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <Input value={keywordInput} onChange={e => setKeywordInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }} placeholder="e.g., hello, hi, hey" className="h-7 text-xs flex-1" />
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addKeyword}>Add</Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Bot matches if customer message contains any of these words</p>
            </div>

            <Separator />

            <div>
              <Label className="text-xs">Response Type *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {RESPONSE_TYPES.map(rt => (
                  <button
                    key={rt.value}
                    onClick={() => setEditRule({ ...editRule, response_type: rt.value })}
                    className={`p-2 rounded-lg border text-center transition-colors ${(editRule?.response_type || "text") === rt.value ? "border-primary bg-primary/5" : "hover:bg-accent/50"}`}
                  >
                    <div className="flex justify-center mb-1">{rt.icon}</div>
                    <p className="text-xs font-medium">{rt.label}</p>
                    <p className="text-[9px] text-muted-foreground">{rt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {(editRule?.response_type || "text") === "text" && (
              <div>
                <Label className="text-xs">Response Message</Label>
                <Textarea value={editRule?.response_content || ""} onChange={e => setEditRule({ ...editRule, response_content: e.target.value })} placeholder="Hello! Welcome to GrabYourCar 🚗 How can we help you today?" rows={4} className="text-sm" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Use {"{{customer_name}}"} for personalization</p>
              </div>
            )}

            {(editRule?.response_type || "text") === "template" && (
              <div>
                <Label className="text-xs">Template Name</Label>
                <Input value={editRule?.template_name || ""} onChange={e => setEditRule({ ...editRule, template_name: e.target.value })} placeholder="welcome_message" className="h-8 text-sm font-mono" />
                <p className="text-[10px] text-muted-foreground mt-0.5">Must be an approved Meta template</p>
              </div>
            )}

            {(editRule?.response_type || "text") === "ai_generated" && (
              <div>
                <Label className="text-xs">AI Prompt (instruction for the AI)</Label>
                <Textarea value={editRule?.ai_prompt || ""} onChange={e => setEditRule({ ...editRule, ai_prompt: e.target.value })} placeholder="You are a helpful car insurance advisor. Answer the customer's question about insurance policies, pricing, and coverage. Be friendly and professional." rows={4} className="text-sm" />
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded p-2 text-xs text-purple-700 border border-purple-200 mt-2">
                  <p className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI will use this prompt + customer's message to generate a contextual response</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={editRule?.is_active !== false} onCheckedChange={v => setEditRule({ ...editRule, is_active: v })} />
              <Label className="text-xs">Rule Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditRule(null); }}>Cancel</Button>
            <Button onClick={saveRule} className="gap-1.5"><Save className="h-4 w-4" /> Save Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Bot Dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><TestTube className="h-5 w-5" /> Test Chatbot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Simulate a customer message</Label>
              <div className="flex gap-2">
                <Input value={testMessage} onChange={e => setTestMessage(e.target.value)} onKeyDown={e => { if (e.key === "Enter") testBot(); }} placeholder="Type a message like 'hi, I need insurance'" className="text-sm" />
                <Button onClick={testBot} className="gap-1"><Send className="h-4 w-4" /> Test</Button>
              </div>
            </div>

            {testResult && (
              <div className={`rounded-lg p-3 border ${testResult.matched ? "bg-green-50 border-green-200 dark:bg-green-950/20" : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20"}`}>
                {testResult.matched ? (
                  <>
                    <p className="text-sm font-medium text-green-800 flex items-center gap-1"><Zap className="h-4 w-4" /> Matched: {testResult.rule?.name}</p>
                    <p className="text-xs text-green-700 mt-1">Priority: {testResult.rule?.priority}</p>
                    <p className="text-xs text-green-700">Keywords: {testResult.rule?.intent_keywords.join(", ")}</p>
                    <Separator className="my-2" />
                    <p className="text-xs font-medium">Response:</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{testResult.response}</p>
                  </>
                ) : (
                  <p className="text-sm text-yellow-800 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> No rule matched. Message would go to live inbox.
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
