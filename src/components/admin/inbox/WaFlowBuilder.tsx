import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Plus, Play, Pause, Trash2, Edit, GitBranch, MessageSquare, Clock, Zap,
  ArrowRight, Save, Copy, Settings, ChevronDown, Timer, Bot, Send,
  Filter as FilterIcon, MousePointer, Workflow, BarChart3, GripVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FlowNode {
  id: string;
  type: "trigger" | "message" | "delay" | "condition" | "action" | "ai_response";
  label: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface Flow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  nodes: FlowNode[];
  edges: FlowEdge[];
  is_active: boolean;
  vertical: string | null;
  total_runs: number;
  total_completions: number;
  total_failures: number;
  last_run_at: string | null;
  created_at: string;
}

const NODE_TYPES = [
  { type: "trigger", label: "Trigger", icon: <Zap className="h-4 w-4" />, color: "bg-yellow-500", desc: "Start the flow" },
  { type: "message", label: "Send Message", icon: <MessageSquare className="h-4 w-4" />, color: "bg-green-500", desc: "Send WhatsApp message" },
  { type: "delay", label: "Wait / Delay", icon: <Timer className="h-4 w-4" />, color: "bg-blue-500", desc: "Wait for specified time" },
  { type: "condition", label: "Condition", icon: <GitBranch className="h-4 w-4" />, color: "bg-purple-500", desc: "Branch based on condition" },
  { type: "ai_response", label: "AI Response", icon: <Bot className="h-4 w-4" />, color: "bg-pink-500", desc: "Generate AI reply" },
  { type: "action", label: "Action", icon: <Settings className="h-4 w-4" />, color: "bg-orange-500", desc: "CRM action (tag, assign, etc.)" },
];

const TRIGGER_TYPES = [
  { value: "keyword", label: "Keyword Match", desc: "Trigger when customer sends specific keywords" },
  { value: "event", label: "CRM Event", desc: "Trigger on lead created, status change, etc." },
  { value: "schedule", label: "Scheduled", desc: "Run at specific time or interval" },
  { value: "manual", label: "Manual", desc: "Manually triggered from CRM" },
  { value: "new_chat", label: "New Conversation", desc: "When a new customer messages first time" },
];

const getDefaultTriggerConfig = (triggerType: string): Record<string, any> => {
  switch (triggerType) {
    case "keyword":
      return { type: "keyword", keywords: [] };
    case "event":
      return { type: "event", event_name: "" };
    case "schedule":
      return { type: "schedule", schedule: "" };
    case "new_chat":
      return { type: "new_chat" };
    case "manual":
      return { type: "manual" };
    default:
      return { type: triggerType };
  }
};

const buildTriggerConfig = (flow: Flow): Record<string, any> => {
  const triggerNode = (flow.nodes || []).find((node) => node.type === "trigger");
  const nodeConfig = triggerNode?.config || {};

  switch (flow.trigger_type) {
    case "keyword":
      return {
        type: "keyword",
        keywords: Array.isArray(nodeConfig.keywords) ? nodeConfig.keywords.filter(Boolean) : [],
      };
    case "event":
      return {
        type: "event",
        event_name: nodeConfig.event_name || "",
      };
    case "schedule":
      return {
        type: "schedule",
        schedule: nodeConfig.schedule || "",
      };
    case "new_chat":
      return { type: "new_chat" };
    case "manual":
      return { type: "manual" };
    default:
      return { type: flow.trigger_type };
  }
};

export function WaFlowBuilder() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [editingNode, setEditingNode] = useState<FlowNode | null>(null);
  const [flowListOpen, setFlowListOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newFlow, setNewFlow] = useState({ name: "", description: "", trigger_type: "keyword", vertical: "" });
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchFlows(); }, []);

  const fetchFlows = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("wa_flows").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setFlows((data || []) as unknown as Flow[]);
    setIsLoading(false);
  };

  const createFlow = async () => {
    if (!newFlow.name) { toast.error("Name required"); return; }
    const triggerConfig = getDefaultTriggerConfig(newFlow.trigger_type);
    const triggerNode: FlowNode = {
      id: "trigger-1",
      type: "trigger",
      label: TRIGGER_TYPES.find(t => t.value === newFlow.trigger_type)?.label || "Trigger",
      config: triggerConfig,
      position: { x: 300, y: 80 },
    };

    const { data, error } = await supabase.from("wa_flows").insert({
      name: newFlow.name,
      description: newFlow.description || null,
      trigger_type: newFlow.trigger_type,
      trigger_config: triggerConfig as any,
      nodes: [triggerNode] as any,
      edges: [] as any,
      vertical: newFlow.vertical || null,
    }).select().single();

    if (error) toast.error(error.message);
    else {
      toast.success("Flow created");
      setCreateOpen(false);
      setNewFlow({ name: "", description: "", trigger_type: "keyword", vertical: "" });
      fetchFlows();
      if (data) setSelectedFlow(data as unknown as Flow);
    }
  };

  const addNode = (type: string) => {
    if (!selectedFlow) return;
    const nodeType = NODE_TYPES.find(n => n.type === type);
    if (!nodeType) return;

    const newNode: FlowNode = {
      id: `${type}-${Date.now()}`,
      type: type as FlowNode["type"],
      label: nodeType.label,
      config: getDefaultConfig(type),
      position: { x: 300, y: (selectedFlow.nodes.length) * 140 + 80 },
    };

    // Auto-connect to last node
    const lastNode = selectedFlow.nodes[selectedFlow.nodes.length - 1];
    const newEdge: FlowEdge = lastNode ? {
      id: `edge-${Date.now()}`,
      source: lastNode.id,
      target: newNode.id,
    } : { id: "", source: "", target: "" };

    const updatedNodes = [...selectedFlow.nodes, newNode];
    const updatedEdges = lastNode ? [...selectedFlow.edges, newEdge] : selectedFlow.edges;

    setSelectedFlow({ ...selectedFlow, nodes: updatedNodes, edges: updatedEdges });
  };

  const getDefaultConfig = (type: string): Record<string, any> => {
    switch (type) {
      case "message": return { message_type: "text", content: "", template_name: "" };
      case "delay": return { duration: 1, unit: "hours" };
      case "condition": return { field: "last_message", operator: "contains", value: "" };
      case "ai_response": return { prompt: "Respond helpfully to the customer", model: "auto" };
      case "action": return { action_type: "add_tag", tag: "", assign_to: "" };
      default: return {};
    }
  };

  const removeNode = (nodeId: string) => {
    if (!selectedFlow) return;
    setSelectedFlow({
      ...selectedFlow,
      nodes: selectedFlow.nodes.filter(n => n.id !== nodeId),
      edges: selectedFlow.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    });
  };

  const updateNodeConfig = (nodeId: string, config: Record<string, any>) => {
    if (!selectedFlow) return;
    setSelectedFlow({
      ...selectedFlow,
      nodes: selectedFlow.nodes.map(n => n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n),
    });
  };

  const saveFlow = async () => {
    if (!selectedFlow) return;
    const triggerConfig = buildTriggerConfig(selectedFlow);
    const { error } = await supabase.from("wa_flows").update({
      nodes: selectedFlow.nodes as any,
      edges: selectedFlow.edges as any,
      trigger_config: triggerConfig as any,
    }).eq("id", selectedFlow.id);
    if (error) toast.error(error.message);
    else toast.success("Flow saved");
    fetchFlows();
  };

  const toggleActive = async (flow: Flow) => {
    const { error } = await supabase.from("wa_flows").update({ is_active: !flow.is_active }).eq("id", flow.id);
    if (error) toast.error(error.message);
    else { toast.success(flow.is_active ? "Flow paused" : "Flow activated"); fetchFlows(); }
    if (selectedFlow?.id === flow.id) setSelectedFlow({ ...selectedFlow, is_active: !flow.is_active });
  };

  const deleteFlow = async (id: string) => {
    if (!confirm("Delete this flow?")) return;
    await supabase.from("wa_flows").delete().eq("id", id);
    toast.success("Deleted");
    if (selectedFlow?.id === id) setSelectedFlow(null);
    fetchFlows();
  };

  const getNodeColor = (type: string) => NODE_TYPES.find(n => n.type === type)?.color || "bg-gray-500";
  const getNodeIcon = (type: string) => NODE_TYPES.find(n => n.type === type)?.icon || <Settings className="h-4 w-4" />;

  // Flow list view
  if (!selectedFlow) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Workflow className="h-5 w-5 text-primary" /> Flow Builder</h2>
            <p className="text-xs text-muted-foreground">Create visual WhatsApp automation sequences</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Flow
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {flows.map(flow => (
            <Card key={flow.id} className="group cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedFlow(flow)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">{flow.name}</CardTitle>
                  <Badge variant={flow.is_active ? "default" : "secondary"} className="text-[10px]">
                    {flow.is_active ? "Active" : "Draft"}
                  </Badge>
                </div>
                {flow.description && <p className="text-xs text-muted-foreground">{flow.description}</p>}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{flow.trigger_type}</Badge>
                  <span>{(flow.nodes as unknown as FlowNode[])?.length || 0} nodes</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>▶ {flow.total_runs} runs</span>
                  <span>✓ {flow.total_completions}</span>
                  <span>✗ {flow.total_failures}</span>
                </div>
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleActive(flow)}>
                    {flow.is_active ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                    {flow.is_active ? "Pause" : "Activate"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteFlow(flow.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {flows.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Workflow className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No flows yet. Create your first automation!</p>
            </div>
          )}
        </div>

        {/* Create Flow Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create New Flow</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Flow Name *</Label><Input value={newFlow.name} onChange={e => setNewFlow({ ...newFlow, name: e.target.value })} placeholder="Welcome Sequence" className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Description</Label><Input value={newFlow.description} onChange={e => setNewFlow({ ...newFlow, description: e.target.value })} placeholder="Onboarding flow for new leads" className="h-8 text-sm" /></div>
              <div>
                <Label className="text-xs">Trigger Type *</Label>
                <Select value={newFlow.trigger_type} onValueChange={v => setNewFlow({ ...newFlow, trigger_type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label} — {t.desc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={createFlow} className="gap-1.5"><Plus className="h-4 w-4" /> Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Flow Editor view
  const nodes = (selectedFlow.nodes || []) as FlowNode[];

  return (
    <div className="space-y-3">
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedFlow(null)} className="gap-1">← Back</Button>
          <div>
            <h3 className="font-semibold text-sm">{selectedFlow.name}</h3>
            <p className="text-xs text-muted-foreground">{selectedFlow.description || "No description"}</p>
          </div>
          <Badge variant={selectedFlow.is_active ? "default" : "secondary"} className="text-[10px]">
            {selectedFlow.is_active ? "Active" : "Draft"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toggleActive(selectedFlow)}>
            {selectedFlow.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {selectedFlow.is_active ? "Pause" : "Activate"}
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={saveFlow}>
            <Save className="h-3.5 w-3.5" /> Save Flow
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Node Palette */}
        <div className="w-48 space-y-2 shrink-0">
          <p className="text-xs font-medium text-muted-foreground">Drag to add</p>
          {NODE_TYPES.filter(n => n.type !== "trigger").map(nt => (
            <button
              key={nt.type}
              onClick={() => addNode(nt.type)}
              className="w-full flex items-center gap-2 p-2 rounded-lg border hover:bg-accent/50 transition-colors text-left"
            >
              <div className={`${nt.color} text-white p-1.5 rounded`}>{nt.icon}</div>
              <div>
                <p className="text-xs font-medium">{nt.label}</p>
                <p className="text-[10px] text-muted-foreground">{nt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Flow Canvas */}
        <div ref={canvasRef} className="flex-1 bg-muted/30 rounded-xl border-2 border-dashed min-h-[500px] p-4 overflow-auto">
          <div className="space-y-1">
            {nodes.map((node, idx) => (
              <div key={node.id}>
                {/* Node Card */}
                <Card className="max-w-md mx-auto border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`${getNodeColor(node.type)} text-white p-1.5 rounded`}>
                          {getNodeIcon(node.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{node.label}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{node.type}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingNode(node)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        {node.type !== "trigger" && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeNode(node.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Node Config Preview */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {node.type === "trigger" && (
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-[10px]">{selectedFlow.trigger_type}</Badge>
                          {selectedFlow.trigger_type === "keyword" && (
                            <p className="line-clamp-2">{(node.config.keywords || []).length ? `Keywords: ${(node.config.keywords || []).join(", ")}` : "No trigger keywords set"}</p>
                          )}
                          {selectedFlow.trigger_type === "event" && node.config.event_name && (
                            <p>Event: {node.config.event_name}</p>
                          )}
                          {selectedFlow.trigger_type === "schedule" && node.config.schedule && (
                            <p>Schedule: {node.config.schedule}</p>
                          )}
                        </div>
                      )}
                      {node.type === "message" && (
                        <p className="line-clamp-2">{node.config.content || "No message set"}</p>
                      )}
                      {node.type === "delay" && (
                        <p>Wait {node.config.duration} {node.config.unit}</p>
                      )}
                      {node.type === "condition" && (
                        <p>{node.config.field} {node.config.operator} "{node.config.value}"</p>
                      )}
                      {node.type === "ai_response" && (
                        <p className="line-clamp-1">AI: {node.config.prompt || "Auto-respond"}</p>
                      )}
                      {node.type === "action" && (
                        <p>{node.config.action_type}: {node.config.tag || node.config.assign_to || "—"}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Connector Arrow */}
                {idx < nodes.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-4 bg-border" />
                      <ArrowRight className="h-3 w-3 text-muted-foreground rotate-90" />
                      <div className="w-0.5 h-4 bg-border" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Node Button */}
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs border-dashed" onClick={() => addNode("message")}>
                <Plus className="h-3.5 w-3.5" /> Add Step
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Node Edit Dialog */}
      <Dialog open={!!editingNode} onOpenChange={v => { if (!v) setEditingNode(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingNode && getNodeIcon(editingNode.type)}
              Configure {editingNode?.label}
            </DialogTitle>
          </DialogHeader>
          {editingNode && (
            <div className="space-y-3">
              {editingNode.type === "trigger" && (
                <>
                  {selectedFlow.trigger_type === "keyword" && (
                    <div>
                      <Label className="text-xs">Trigger Keywords</Label>
                      <Textarea
                        value={Array.isArray(editingNode.config.keywords) ? editingNode.config.keywords.join(", ") : ""}
                        onChange={e => {
                          const keywords = e.target.value
                            .split(/[,\n]/)
                            .map((value) => value.trim())
                            .filter(Boolean);
                          updateNodeConfig(editingNode.id, { keywords });
                          setEditingNode({ ...editingNode, config: { ...editingNode.config, keywords } });
                        }}
                        placeholder="hi, hello, insurance, quote"
                        rows={4}
                        className="text-sm"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">Comma ya new line me keywords daalo.</p>
                    </div>
                  )}

                  {selectedFlow.trigger_type === "event" && (
                    <div>
                      <Label className="text-xs">Event Name</Label>
                      <Input
                        value={editingNode.config.event_name || ""}
                        onChange={e => {
                          updateNodeConfig(editingNode.id, { event_name: e.target.value });
                          setEditingNode({ ...editingNode, config: { ...editingNode.config, event_name: e.target.value } });
                        }}
                        placeholder="lead_created"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  {selectedFlow.trigger_type === "schedule" && (
                    <div>
                      <Label className="text-xs">Schedule</Label>
                      <Input
                        value={editingNode.config.schedule || ""}
                        onChange={e => {
                          updateNodeConfig(editingNode.id, { schedule: e.target.value });
                          setEditingNode({ ...editingNode, config: { ...editingNode.config, schedule: e.target.value } });
                        }}
                        placeholder="Every day at 10:00 AM"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                  {selectedFlow.trigger_type === "new_chat" && (
                    <p className="text-sm text-muted-foreground">Yeh flow customer ke first inbound WhatsApp message par trigger hoga.</p>
                  )}

                  {selectedFlow.trigger_type === "manual" && (
                    <p className="text-sm text-muted-foreground">Yeh flow sirf manual run hone ke liye configured hai.</p>
                  )}
                </>
              )}

              {editingNode.type === "message" && (
                <>
                  <div>
                    <Label className="text-xs">Message Type</Label>
                    <Select value={editingNode.config.message_type} onValueChange={v => { updateNodeConfig(editingNode.id, { message_type: v }); setEditingNode({ ...editingNode, config: { ...editingNode.config, message_type: v } }); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Free Text</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingNode.config.message_type === "template" ? (
                    <div><Label className="text-xs">Template Name</Label><Input value={editingNode.config.template_name || ""} onChange={e => { updateNodeConfig(editingNode.id, { template_name: e.target.value }); setEditingNode({ ...editingNode, config: { ...editingNode.config, template_name: e.target.value } }); }} placeholder="insurance_followup" className="h-8 text-sm font-mono" /></div>
                  ) : (
                    <div><Label className="text-xs">Message Content</Label><Textarea value={editingNode.config.content || ""} onChange={e => { updateNodeConfig(editingNode.id, { content: e.target.value }); setEditingNode({ ...editingNode, config: { ...editingNode.config, content: e.target.value } }); }} placeholder="Hello {{customer_name}}!" rows={4} className="text-sm" /></div>
                  )}
                </>
              )}
              {editingNode.type === "delay" && (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Duration</Label><Input type="number" value={editingNode.config.duration} onChange={e => { const v = parseInt(e.target.value) || 1; updateNodeConfig(editingNode.id, { duration: v }); setEditingNode({ ...editingNode, config: { ...editingNode.config, duration: v } }); }} className="h-8 text-sm" /></div>
                  <div>
                    <Label className="text-xs">Unit</Label>
                    <Select value={editingNode.config.unit} onValueChange={v => { updateNodeConfig(editingNode.id, { unit: v }); setEditingNode({ ...editingNode, config: { ...editingNode.config, unit: v } }); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {editingNode.type === "condition" && (
                <>
                  <div><Label className="text-xs">Field</Label><Input value={editingNode.config.field || ""} onChange={e => { updateNodeConfig(editingNode.id, { field: e.target.value }); setEditingNode({ ...editingNode, config: { ...editingNode.config, field: e.target.value } }); }} placeholder="last_message" className="h-8 text-sm" /></div>
                  <div>
                    <Label className="text-xs">Operator</Label>
                    <Select value={editingNode.config.operator || "contains"} onValueChange={v => { updateNodeConfig(editingNode.id, { operator: v }); setEditingNode({ ...editingNode, config: { ...editingNode.config, operator: v } }); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_contains">Not Contains</SelectItem>
                        <SelectItem value="starts_with">Starts With</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Value</Label><Input value={editingNode.config.value || ""} onChange={e => { updateNodeConfig(editingNode.id, { value: e.target.value }); setEditingNode({ ...editingNode, config: { ...editingNode.config, value: e.target.value } }); }} placeholder="interested" className="h-8 text-sm" /></div>
                </>
              )}
              {editingNode.type === "ai_response" && (
                <div><Label className="text-xs">AI Prompt</Label><Textarea value={editingNode.config.prompt || ""} onChange={e => { updateNodeConfig(editingNode.id, { prompt: e.target.value }); setEditingNode({ ...editingNode, config: { ...editingNode.config, prompt: e.target.value } }); }} placeholder="Respond helpfully about car insurance..." rows={4} className="text-sm" /></div>
              )}
              {editingNode.type === "action" && (
                <>
                  <div>
                    <Label className="text-xs">Action</Label>
                    <Select value={editingNode.config.action_type || "add_tag"} onValueChange={v => { updateNodeConfig(editingNode.id, { action_type: v }); setEditingNode({ ...editingNode, config: { ...editingNode.config, action_type: v } }); }}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add_tag">Add Tag</SelectItem>
                        <SelectItem value="assign_vertical">Assign Vertical</SelectItem>
                        <SelectItem value="create_lead">Create Lead</SelectItem>
                        <SelectItem value="update_segment">Update Segment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Value</Label><Input value={editingNode.config.tag || editingNode.config.assign_to || ""} onChange={e => { const key = editingNode.config.action_type === "add_tag" ? "tag" : "assign_to"; updateNodeConfig(editingNode.id, { [key]: e.target.value }); setEditingNode({ ...editingNode, config: { ...editingNode.config, [key]: e.target.value } }); }} placeholder="hot_lead" className="h-8 text-sm" /></div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditingNode(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
