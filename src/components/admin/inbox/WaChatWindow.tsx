import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Send, Paperclip, Clock, Check, CheckCheck, X,
  AlertTriangle, Info, Zap, LayoutTemplate, MessageSquare,
  UserPlus, Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNowStrict, differenceInSeconds } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WaConversation, WaMessage } from "../WhatsAppBusinessInbox";

interface Props {
  conversation: WaConversation | null;
  messages: WaMessage[];
  onSend: (content: string, messageType?: string, extras?: Record<string, unknown>) => Promise<boolean>;
  isWindowOpen: boolean;
  onToggleInfo: () => void;
}

function LiveCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [urgency, setUrgency] = useState<"safe" | "warning" | "critical">("safe");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const exp = new Date(expiresAt);
      const diffSec = differenceInSeconds(exp, now);

      if (diffSec <= 0) {
        setTimeLeft("Expired");
        setUrgency("critical");
        return;
      }

      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;

      setTimeLeft(`${h}h ${m}m ${s}s`);
      setUrgency(diffSec < 1800 ? "critical" : diffSec < 7200 ? "warning" : "safe");
    };

    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  const colors = {
    safe: "bg-green-100 text-green-700 border-green-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    critical: "bg-red-100 text-red-700 border-red-200 animate-pulse",
  };

  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1 font-mono border", colors[urgency])}>
      <Timer className="h-3 w-3" /> {timeLeft}
    </Badge>
  );
}

type TemplateOption = {
  id: string;
  name: string;
  display_name: string | null;
  body: string;
  variables?: string[] | null;
};

function extractTemplateVariables(template: TemplateOption): string[] {
  const explicitVariables = Array.isArray(template.variables)
    ? template.variables.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  if (explicitVariables.length > 0) return explicitVariables;

  const body = template.body || "";
  const namedMatches = [...body.matchAll(/\{\{([a-zA-Z_]\w*)\}\}/g)].map((match) => match[1]);
  if (namedMatches.length > 0) return [...new Set(namedMatches)];

  const positionalMatches = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => `var_${match[1]}`);
  return [...new Set(positionalMatches)];
}

function renderTemplatePreview(body: string, values: Record<string, string>) {
  return Object.entries(values).reduce((content, [key, value]) => {
    const safeValue = value || "";
    const positionalMatch = key.match(/^var_(\d+)$/);

    if (positionalMatch) {
      return content.replace(new RegExp(`\\{\\{${positionalMatch[1]}\\}\\}`, "g"), safeValue);
    }

    return content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), safeValue);
  }, body);
}

function getVariableLabel(key: string) {
  const positionalMatch = key.match(/^var_(\d+)$/);
  if (positionalMatch) return `Variable ${positionalMatch[1]}`;
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function WaChatWindow({ conversation, messages, onSend, isWindowOpen, onToggleInfo }: Props) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<Array<{ id: string; title: string; message: string }>>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    supabase.from("wa_quick_replies").select("id, title, message").eq("is_active", true).order("sort_order").then(({ data }) => {
      setQuickReplies((data || []) as any);
    });
    supabase.from("wa_templates").select("id, name, display_name, body, variables, status").eq("status", "approved").order("created_at", { ascending: false }).then(({ data }) => {
      setTemplates((data || []) as any);
    });
    supabase.from("crm_users").select("id, full_name, email").limit(50).then(({ data }) => {
      setAgents((data || []) as any);
    });
  }, []);

  const buildInitialTemplateValues = (template: TemplateOption) => {
    const defaults: Record<string, string> = {};
    const variables = extractTemplateVariables(template);
    const body = (template.body || "").toLowerCase();

    // Build a context map from conversation data
    const customerName = conversation?.customer_name || "";
    const phone = conversation?.phone || "";

    // For named variables, map by key name
    // For positional variables (var_1, var_2...), try to infer from template body context
    const positionalHints: string[] = [];
    const bodyLower = body;
    // Extract surrounding text for each {{N}} to guess what it represents
    const positionalMatches = [...(template.body || "").matchAll(/\{\{(\d+)\}\}/g)];
    for (const match of positionalMatches) {
      const idx = match.index || 0;
      const before = (template.body || "").substring(Math.max(0, idx - 30), idx).toLowerCase();
      if (before.includes("hi") || before.includes("hello") || before.includes("dear") || before.includes("hey") || idx < 10) {
        positionalHints.push("name");
      } else if (before.includes("insurance") || before.includes("policy") || before.includes("vehicle") || before.includes("car")) {
        positionalHints.push("vehicle");
      } else if (before.includes("expir") || before.includes("date") || before.includes("renew")) {
        positionalHints.push("date");
      } else if (before.includes("price") || before.includes("amount") || before.includes("premium") || before.includes("save")) {
        positionalHints.push("amount");
      } else {
        positionalHints.push("");
      }
    }

    variables.forEach((key, idx) => {
      const normalized = key.toLowerCase();

      // Named variable matching
      if (["customer_name", "full_name", "name"].includes(normalized)) {
        defaults[key] = customerName;
      } else if (normalized === "phone") {
        defaults[key] = phone;
      } else if (key.match(/^var_\d+$/)) {
        // Positional variable — use hints from template body context
        const hint = positionalHints[idx] || "";
        if (hint === "name") {
          defaults[key] = customerName;
        } else {
          defaults[key] = ""; // Can't auto-fill, user must enter
        }
      } else {
        defaults[key] = "";
      }
    });

    return defaults;
  };

  const handleSend = async () => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    const ok = await onSend(text.trim());
    if (ok) setText("");
    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleQuickReply = async (msg: string) => {
    setShowQuickReplies(false);
    setIsSending(true);
    const ok = await onSend(msg);
    if (!ok) setText(msg); // Keep in input if send failed so user can retry
    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleTemplateSend = async (tpl: TemplateOption) => {
    setShowTemplates(false);
    const requiredVariables = extractTemplateVariables(tpl);

    if (requiredVariables.length === 0) {
      setIsSending(true);
      await onSend(tpl.body, "template", { template_name: tpl.name });
      setIsSending(false);
      return;
    }

    setSelectedTemplate(tpl);
    const initialValues = buildInitialTemplateValues(tpl);
    setTemplateValues(initialValues);

    // If all variables are auto-filled, send immediately without dialog
    const allFilled = requiredVariables.every((key) => initialValues[key]?.trim());
    if (allFilled) {
      setIsSending(true);
      const finalVars = requiredVariables.reduce<Record<string, string>>((acc, key) => {
        acc[key] = initialValues[key].trim();
        return acc;
      }, {});
      const ok = await onSend(
        renderTemplatePreview(tpl.body, finalVars),
        "template",
        { template_name: tpl.name, template_variables: finalVars },
      );
      setIsSending(false);
      if (ok) { setSelectedTemplate(null); setTemplateValues({}); }
      return;
    }
  };

  const selectedTemplateVariables = selectedTemplate ? extractTemplateVariables(selectedTemplate) : [];

  const handleTemplateConfirm = async () => {
    if (!selectedTemplate) return;

    const requiredVariables = selectedTemplateVariables;
    const missingVariable = requiredVariables.find((key) => !templateValues[key]?.trim());

    if (missingVariable) {
      return;
    }

    const finalVariables = requiredVariables.reduce<Record<string, string>>((acc, key) => {
      acc[key] = templateValues[key].trim();
      return acc;
    }, {});

    setIsSending(true);
    const ok = await onSend(
      renderTemplatePreview(selectedTemplate.body, finalVariables),
      "template",
      {
        template_name: selectedTemplate.name,
        template_variables: finalVariables,
      },
    );
    setIsSending(false);

    if (ok) {
      setSelectedTemplate(null);
      setTemplateValues({});
    }
  };

  const handleAssign = async (agentId: string) => {
    if (!conversation) return;
    await supabase.from("wa_conversations").update({ assigned_user_id: agentId }).eq("id", conversation.id);
    setShowAssign(false);
  };

  const getStatusIcon = (msg: WaMessage) => {
    if (msg.direction === "inbound") return null;
    switch (msg.status) {
      case "pending": return <Clock className="h-3 w-3 text-muted-foreground" />;
      case "sent": return <Check className="h-3 w-3 text-muted-foreground" />;
      case "delivered": return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "read": return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case "failed": return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <MessageSquare className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground text-sm">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  const selectedTemplateVariables = selectedTemplate ? extractTemplateVariables(selectedTemplate) : [];

  return (
    <>
      <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-background/95">
      {/* Chat Header */}
      <div className="h-14 bg-card border-b flex items-center px-4 gap-3 shrink-0">
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold",
          isWindowOpen ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
        )}>
          {(conversation.customer_name || conversation.phone)?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{conversation.customer_name || conversation.phone}</p>
          <p className="text-xs text-muted-foreground">{conversation.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Live Countdown */}
          {conversation.window_expires_at && isWindowOpen ? (
            <LiveCountdown expiresAt={conversation.window_expires_at} />
          ) : (
            <Badge variant="secondary" className="text-[10px] gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" /> Window closed
            </Badge>
          )}

          {/* Agent Assignment */}
          <Popover open={showAssign} onOpenChange={setShowAssign}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Assign agent">
                <UserPlus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <p className="text-xs font-semibold mb-2">Assign to Agent</p>
              <div className="space-y-1 max-h-48 overflow-auto">
                {agents.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleAssign(a.id)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors flex items-center gap-2",
                      conversation.assigned_user_id === a.id && "bg-green-50 dark:bg-green-900/20"
                    )}
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                      {(a.full_name || a.email)?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.full_name || a.email?.split("@")[0]}</p>
                    </div>
                    {conversation.assigned_user_id === a.id && (
                      <Check className="h-3 w-3 text-green-600 ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleInfo}>
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-2">
        <div className="max-w-2xl mx-auto space-y-1">
          {messages.map((msg, i) => {
            const isOut = msg.direction === "outbound";
            const showDate = i === 0 || format(new Date(msg.created_at), "yyyy-MM-dd") !== format(new Date(messages[i - 1].created_at), "yyyy-MM-dd");

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-3">
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {format(new Date(msg.created_at), "MMMM d, yyyy")}
                    </Badge>
                  </div>
                )}
                <div className={cn("flex", isOut ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-lg px-3 py-1.5 shadow-sm relative group",
                    isOut
                      ? "bg-[#dcf8c6] dark:bg-green-900/30 text-foreground"
                      : "bg-card text-foreground"
                  )}>
                    {isOut && msg.sent_by_name && (
                      <p className="text-[10px] font-medium text-green-700 dark:text-green-400 mb-0.5">
                        {msg.sent_by_name}
                      </p>
                    )}
                    {msg.message_type === "image" && msg.media_url && (
                      <div className="mb-1">
                        <Badge variant="outline" className="text-[9px]">📷 Image</Badge>
                      </div>
                    )}
                    {msg.message_type === "document" && (
                      <div className="mb-1">
                        <Badge variant="outline" className="text-[9px]">📄 {msg.media_filename || "Document"}</Badge>
                      </div>
                    )}
                    {msg.template_name && (
                      <div className="mb-1">
                        <Badge variant="outline" className="text-[9px] bg-blue-50">📋 {msg.template_name}</Badge>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.created_at), "HH:mm")}
                      </span>
                      {getStatusIcon(msg)}
                    </div>
                    {msg.status === "failed" && msg.error_message && (
                      <p className="text-[10px] text-red-500 mt-0.5">⚠ {msg.error_message}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="bg-card border-t p-2 shrink-0">
        {!isWindowOpen && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs px-3 py-2 rounded-lg mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>24hr window closed. Send a <strong>template message</strong> to re-open conversation.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
              onClick={() => setShowTemplates(true)}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Send Template
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Quick Replies */}
          <Popover open={showQuickReplies} onOpenChange={setShowQuickReplies}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Quick Replies">
                <Zap className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <p className="text-xs font-semibold mb-2">⚡ Quick Replies</p>
              <div className="space-y-1 max-h-48 overflow-auto">
                {quickReplies.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No quick replies configured</p>
                ) : quickReplies.map(qr => (
                  <button
                    key={qr.id}
                    onClick={() => handleQuickReply(qr.message)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{qr.title}</span>
                    <p className="text-muted-foreground truncate">{qr.message}</p>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Templates */}
          <Popover open={showTemplates} onOpenChange={setShowTemplates}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Templates">
                <LayoutTemplate className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="start">
              <p className="text-xs font-semibold mb-2">📋 Templates {!isWindowOpen && <span className="text-amber-600">(required)</span>}</p>
              <div className="space-y-1 max-h-56 overflow-auto">
                {templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No approved templates</p>
                ) : templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleTemplateSend(tpl)}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{tpl.display_name || tpl.name}</span>
                    <p className="text-muted-foreground truncate">{tpl.body}</p>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Input
            ref={inputRef}
            placeholder={isWindowOpen ? "Type a message..." : "Use template (window closed)"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={!isWindowOpen || isSending}
            className="flex-1 h-9 text-sm"
          />

          <Button
            onClick={handleSend}
            disabled={!text.trim() || isSending || !isWindowOpen}
            size="icon"
            className="h-9 w-9 bg-green-600 hover:bg-green-700 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </div>

      <Dialog open={!!selectedTemplate} onOpenChange={(open) => { if (!open) { setSelectedTemplate(null); setTemplateValues({}); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fill template details</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{selectedTemplate?.display_name || selectedTemplate?.name}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedTemplate?.body}</p>
            </div>

            <div className="space-y-3">
              {selectedTemplateVariables.map((key) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`template-${key}`}>{getVariableLabel(key)}</Label>
                  <Input
                    id={`template-${key}`}
                    value={templateValues[key] || ""}
                    onChange={(event) => setTemplateValues((current) => ({ ...current, [key]: event.target.value }))}
                    placeholder={`Enter ${getVariableLabel(key).toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedTemplate(null); setTemplateValues({}); }} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleTemplateConfirm} disabled={isSending || selectedTemplateVariables.some((key) => !templateValues[key]?.trim())}>
              Send template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
