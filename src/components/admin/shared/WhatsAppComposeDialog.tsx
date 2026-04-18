import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, MessageSquare, LayoutTemplate, Loader2, Pencil, RotateCcw, Sparkles, Wand2, Languages, Smile } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendWhatsApp } from "@/lib/sendWhatsApp";
import { WaTemplateManager } from "@/components/admin/inbox/WaTemplateManager";

type TemplateRow = {
  id: string;
  name: string;
  display_name: string | null;
  body: string;
  variables?: string[] | null;
};

interface WhatsAppComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Recipient phone (with or without country code) */
  phone: string;
  /** Recipient name for {{customer_name}} substitution + logging */
  customerName?: string;
  /** Default message to pre-fill the composer */
  defaultMessage: string;
  /** Optional context object available for variable substitution (vehicle_number, current_insurer, etc.) */
  context?: Record<string, string | number | null | undefined>;
  /** Log event tag */
  logEvent?: string;
  /** Optional lead id for backend logging */
  leadId?: string;
  /** Called after a successful send */
  onSent?: () => void;
}

function applyVars(
  body: string,
  vars: Record<string, string>,
  positionalVars: string[] = []
) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    // Named variable match (customer_name, vehicle_number, etc.)
    if (vars[key] !== undefined && vars[key] !== "") return vars[key];
    // Numeric placeholder like {{1}}, {{2}} → map to template.variables[index] then resolve from vars
    if (/^\d+$/.test(key)) {
      const idx = parseInt(key, 10) - 1;
      const varName = positionalVars[idx];
      if (varName && vars[varName] !== undefined) return vars[varName];
      // Fallback: if first numeric placeholder, use customer_name
      if (idx === 0 && vars.customer_name) return vars.customer_name;
    }
    return vars[key] ?? "";
  });
}

export function WhatsAppComposeDialog({
  open,
  onOpenChange,
  phone,
  customerName,
  defaultMessage,
  context,
  logEvent,
  leadId,
  onSent,
}: WhatsAppComposeDialogProps) {
  const [message, setMessage] = useState(defaultMessage);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedTplId, setSelectedTplId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [previousMessage, setPreviousMessage] = useState<string | null>(null);

  type AIMode = "polish" | "professional" | "friendly" | "shorten" | "hindi" | "english" | "hinglish" | "emoji";
  const runAIAction = async (mode: AIMode) => {
    if (!message.trim()) {
      toast.error("Type a message first");
      return;
    }
    const instructions: Record<AIMode, string> = {
      polish: "Fix grammar, spelling, and punctuation. Keep the same meaning, tone, language and length. Keep WhatsApp formatting (*bold*, _italic_), emojis and line breaks intact.",
      professional: "Rewrite in a polite, professional business tone suitable for a customer-facing WhatsApp message. Keep facts, numbers, names, links and formatting intact.",
      friendly: "Rewrite in a warm, friendly conversational tone. Keep facts, numbers, names, links and formatting intact.",
      shorten: "Make it crisp and shorter (under 60 words if possible) without losing key information. Keep formatting and emojis where useful.",
      hindi: "Translate to natural Hindi (Devanagari script). Keep names, numbers, links and WhatsApp formatting intact.",
      english: "Translate to natural professional English. Keep names, numbers, links and WhatsApp formatting intact.",
      hinglish: "Rewrite in natural Hinglish (Hindi written in Roman/English letters) — the way Indian customers chat on WhatsApp. Keep names, numbers, links and formatting intact.",
      emoji: "Add 2-4 relevant emojis at natural places to make it lively, but do not overdo it. Keep all original text and formatting.",
    };
    setIsPolishing(true);
    setPreviousMessage(message);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          systemPrompt: `You are a WhatsApp message editor for a car dealership/insurance/loans CRM in India. ${instructions[mode]} Return ONLY the final message text — no quotes, no explanations, no markdown code fences.`,
          prompt: message,
          temperature: 0.4,
          max_tokens: 800,
        },
      });
      if (error) throw error;
      const cleaned = String(data?.content || "").trim().replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").replace(/^["']|["']$/g, "");
      if (!cleaned) throw new Error("AI returned empty response");
      setMessage(cleaned);
      toast.success("AI updated ✨ — click Undo to revert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI failed");
      setPreviousMessage(null);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleUndoAI = () => {
    if (previousMessage !== null) {
      setMessage(previousMessage);
      setPreviousMessage(null);
      toast.success("Reverted to previous version");
    }
  };

  // Reset message when dialog reopens or defaultMessage changes
  useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
      setSelectedTplId("");
    }
  }, [open, defaultMessage]);

  // Load approved templates
  useEffect(() => {
    if (!open) return;
    supabase
      .from("wa_templates")
      .select("id, name, display_name, body, variables, status")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTemplates((data || []) as TemplateRow[]));
  }, [open, showTemplateManager]);

  const variableMap = useMemo(() => {
    const map: Record<string, string> = {
      customer_name: customerName || "Customer",
      name: customerName || "Customer",
      phone: phone || "",
    };
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        if (v !== undefined && v !== null) map[k] = String(v);
      }
    }
    return map;
  }, [customerName, phone, context]);

  const handleApplyTemplate = (tplId: string) => {
    setSelectedTplId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    setMessage(applyVars(tpl.body, variableMap, tpl.variables || []));
  };

  const handleResetDefault = () => {
    setMessage(defaultMessage);
    setSelectedTplId("");
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Message is empty");
      return;
    }
    if (!phone) {
      toast.error("No phone number");
      return;
    }
    setIsSending(true);
    try {
      const result = await sendWhatsApp({
        phone,
        message: message.trim(),
        name: customerName || undefined,
        logEvent: logEvent || "compose_dialog_send",
      });
      if (result.success) {
        toast.success("Message sent on WhatsApp ✓");
        onSent?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Send failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              Send WhatsApp Message
              {customerName && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  {customerName}
                </Badge>
              )}
              {phone && (
                <Badge variant="outline" className="font-mono text-[11px]">
                  {phone}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Template picker */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <LayoutTemplate className="h-3.5 w-3.5" /> Use approved template (optional)
                </Label>
                <Select value={selectedTplId} onValueChange={handleApplyTemplate}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={templates.length ? "Pick a template…" : "No approved templates"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="font-medium">{t.display_name || t.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setShowTemplateManager(true)}
                title="Manage / Edit Templates"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Templates
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5"
                onClick={handleResetDefault}
                title="Reset to default message"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>

            {/* Editable message */}
            <div className="space-y-1.5">
              <Label className="text-xs">Message (you can fully customize before sending)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={12}
                className="text-sm font-mono resize-y"
                placeholder="Type your WhatsApp message…"
              />
              <p className="text-[11px] text-muted-foreground">
                {message.length} chars · Use *bold*, _italic_, ~strike~ — WhatsApp formatting supported.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !message.trim() || !phone}
              className="gap-1.5 bg-green-600 hover:bg-green-700"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nested template manager dialog */}
      <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Manage WhatsApp Templates
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <WaTemplateManager />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
