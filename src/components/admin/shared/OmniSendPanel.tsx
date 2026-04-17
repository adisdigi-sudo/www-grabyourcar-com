import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  MessageSquare, Mail, Smartphone, Send, Loader2, CheckCircle2,
  XCircle, AlertTriangle, Users, Zap, Clock, BookmarkPlus, FileText,
  Sparkles, RotateCcw, Save
} from "lucide-react";
import {
  type OmniChannel,
  type ChannelProviderStatus,
  getChannelProviders,
  omniSend,
  omniSendBulk,
} from "@/lib/omniSend";
import { supabase } from "@/integrations/supabase/client";
import { invalidateCrmTemplateCache } from "@/lib/crmMessageTemplates";

interface OmniRecipient {
  phone?: string;
  email?: string;
  name?: string;
}

interface OmniSendPanelProps {
  recipients?: OmniRecipient[];
  context?: string;
  defaultChannel?: OmniChannel;
  onSendComplete?: (sent: number, failed: number) => void;
}

interface Tpl {
  id: string;
  slug: string;
  label: string;
  channel: string;
  vertical: string;
  body_text: string;
  subject: string | null;
  variables: string[] | null;
}

const CHANNEL_META: Record<OmniChannel, { label: string; icon: React.ElementType; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "text-green-600" },
  email: { label: "Email", icon: Mail, color: "text-blue-600" },
  rcs: { label: "RCS", icon: Smartphone, color: "text-purple-600" },
};

export function OmniSendPanel({ recipients = [], context, defaultChannel = "whatsapp", onSendComplete }: OmniSendPanelProps) {
  const [channel, setChannel] = useState<OmniChannel>(defaultChannel);
  const [providers, setProviders] = useState<ChannelProviderStatus[]>([]);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [manualRecipients, setManualRecipients] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [campaignName, setCampaignName] = useState("");

  // Template state
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [selectedTplId, setSelectedTplId] = useState<string>("");
  const [originalBody, setOriginalBody] = useState<string>("");
  const [savingTpl, setSavingTpl] = useState(false);
  const [savingAsNew, setSavingAsNew] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    getChannelProviders().then(setProviders);
  }, []);

  // Load templates filtered by channel + vertical
  useEffect(() => {
    (async () => {
      let q = supabase
        .from("crm_message_templates")
        .select("id,slug,label,channel,vertical,body_text,subject,variables")
        .eq("is_active", true)
        .order("label");
      if (channel) q = q.eq("channel", channel);
      const { data, error } = await q;
      if (error) {
        console.error("Template load failed:", error);
        return;
      }
      const all = (data || []) as Tpl[];
      // Prefer templates matching current vertical/context but show all
      const ctx = (context || "").toLowerCase();
      const sorted = all.sort((a, b) => {
        const aMatch = ctx && a.vertical?.toLowerCase().includes(ctx) ? 0 : 1;
        const bMatch = ctx && b.vertical?.toLowerCase().includes(ctx) ? 0 : 1;
        return aMatch - bMatch;
      });
      setTemplates(sorted);
    })();
  }, [channel, context]);

  const activeProvider = providers.find((p) => p.channel === channel);
  const isActive = activeProvider?.is_active ?? false;
  const selectedTpl = templates.find((t) => t.id === selectedTplId);
  const isDirty = !!selectedTpl && message !== originalBody;

  const allRecipients: OmniRecipient[] = [
    ...recipients,
    ...manualRecipients
      .split(/[\n,;]+/)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => {
        if (r.includes("@")) return { email: r, name: r.split("@")[0] };
        return { phone: r, name: r };
      }),
  ];

  const recipientCount = allRecipients.length;

  const handleTemplateSelect = (id: string) => {
    setSelectedTplId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setMessage(tpl.body_text || "");
      setOriginalBody(tpl.body_text || "");
      if (tpl.subject) setSubject(tpl.subject);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTpl) return;
    if (!message.trim()) {
      toast.error("Message body cannot be empty");
      return;
    }
    setSavingTpl(true);
    const { error } = await supabase
      .from("crm_message_templates")
      .update({
        body_text: message,
        subject: channel === "email" ? subject : selectedTpl.subject,
      })
      .eq("id", selectedTpl.id);
    setSavingTpl(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    invalidateCrmTemplateCache();
    setOriginalBody(message);
    setTemplates((prev) =>
      prev.map((t) => (t.id === selectedTpl.id ? { ...t, body_text: message } : t))
    );
    toast.success(`Template "${selectedTpl.label}" updated`);
  };

  const handleResetTemplate = () => {
    setMessage(originalBody);
    toast.info("Reverted to saved template");
  };

  const handleSaveAsNew = async () => {
    if (!message.trim()) {
      toast.error("Message body cannot be empty");
      return;
    }
    if (!newSlug.trim() || !newLabel.trim()) {
      toast.error("Provide slug and label");
      return;
    }
    setSavingTpl(true);
    const { data, error } = await supabase
      .from("crm_message_templates")
      .insert({
        slug: newSlug.trim().toLowerCase().replace(/\s+/g, "_"),
        label: newLabel.trim(),
        channel,
        vertical: context || "general",
        body_text: message,
        subject: channel === "email" ? subject : null,
        is_active: true,
      })
      .select()
      .single();
    setSavingTpl(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    invalidateCrmTemplateCache();
    toast.success(`New template "${newLabel}" saved`);
    setSavingAsNew(false);
    setNewSlug("");
    setNewLabel("");
    if (data) {
      setTemplates((prev) => [data as Tpl, ...prev]);
      setSelectedTplId((data as Tpl).id);
      setOriginalBody(message);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (recipientCount === 0) {
      toast.error("No recipients added");
      return;
    }

    setSending(true);
    setProgress({ sent: 0, failed: 0, total: recipientCount });

    if (recipientCount === 1) {
      const r = allRecipients[0];
      const result = await omniSend({
        channel,
        phone: r.phone,
        email: r.email,
        message,
        subject,
        name: r.name,
        vertical: context,
      });
      setProgress({ sent: result.success ? 1 : 0, failed: result.success ? 0 : 1, total: 1 });
      onSendComplete?.(result.success ? 1 : 0, result.success ? 0 : 1);
    } else {
      const bulkRecipients = allRecipients.map((r) => ({
        phone: r.phone,
        email: r.email,
        name: r.name,
        message,
        subject,
      }));

      const result = await omniSendBulk(channel, bulkRecipients, {
        onProgress: (sent, failed, total) => setProgress({ sent, failed, total }),
        vertical: context,
      });
      onSendComplete?.(result.sent, result.failed);
    }

    setSending(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Omni-Channel Send
            {context && <Badge variant="outline" className="text-[10px]">{context}</Badge>}
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            <Users className="h-3 w-3 mr-1" />
            {recipientCount} recipients
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channel Tabs */}
        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
          {(["whatsapp", "email", "rcs"] as OmniChannel[]).map((ch) => {
            const meta = CHANNEL_META[ch];
            const Icon = meta.icon;
            const prov = providers.find((p) => p.channel === ch);
            const active = prov?.is_active ?? false;

            return (
              <Button
                key={ch}
                variant={channel === ch ? "default" : "ghost"}
                size="sm"
                className={`flex-1 gap-1.5 text-xs ${!active ? "opacity-50" : ""}`}
                onClick={() => setChannel(ch)}
                disabled={sending}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? meta.color : "text-muted-foreground"}`} />
                {meta.label}
                {!active && <Badge variant="outline" className="text-[8px] px-1 ml-1">Soon</Badge>}
              </Button>
            );
          })}
        </div>

        {/* Provider Status */}
        {!isActive && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {channel === "rcs"
                ? "RCS provider not yet integrated. Coming soon — connect your RCS provider in Settings."
                : `${CHANNEL_META[channel].label} is not active. Configure it in Settings → Channel Providers.`}
            </p>
          </div>
        )}

        {/* Template Picker */}
        <div className="space-y-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Use & Edit Template
              {isDirty && <Badge className="bg-amber-500/10 text-amber-700 border-0 text-[9px]">Unsaved</Badge>}
            </label>
            {selectedTpl && (
              <Badge variant="outline" className="text-[9px] font-mono">{selectedTpl.slug}</Badge>
            )}
          </div>
          <Select value={selectedTplId} onValueChange={handleTemplateSelect} disabled={sending}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder={`Pick a saved ${channel} template...`} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {templates.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground">No templates yet for {channel}</div>
              )}
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{t.label}</span>
                    {t.vertical && <Badge variant="outline" className="text-[8px] px-1">{t.vertical}</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTpl?.variables && selectedTpl.variables.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <span className="text-[9px] text-muted-foreground">Vars:</span>
              {selectedTpl.variables.map((v) => (
                <Badge
                  key={v}
                  variant="outline"
                  className="text-[9px] font-mono cursor-pointer hover:bg-primary/10"
                  onClick={() => setMessage((prev) => prev + ` {{${v}}}`)}
                >
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Name */}
        <Input
          placeholder="Campaign name (optional)"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="text-sm"
          disabled={sending}
        />

        {/* Subject (email only) */}
        {channel === "email" && (
          <Input
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-sm"
            disabled={sending}
          />
        )}

        {/* Message */}
        <Textarea
          placeholder={
            channel === "whatsapp"
              ? "Type your WhatsApp message..."
              : channel === "email"
              ? "Type your email body..."
              : "Type your RCS message..."
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="text-sm"
          disabled={sending}
        />

        {/* Save Template Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedTpl ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={isDirty ? "default" : "outline"}
                      className="h-7 px-2.5 text-xs gap-1.5"
                      onClick={handleSaveTemplate}
                      disabled={!isDirty || savingTpl || sending}
                    >
                      {savingTpl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save to "{selectedTpl.label}"
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Overwrites the template in DB. Next time it loads, this version is used.</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {isDirty && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={handleResetTemplate} disabled={sending}>
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              )}
            </>
          ) : (
            message.trim().length > 10 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => setSavingAsNew(true)}
                disabled={sending}
              >
                <BookmarkPlus className="h-3 w-3" /> Save as new template
              </Button>
            )
          )}
          {selectedTpl && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs gap-1 ml-auto"
              onClick={() => setSavingAsNew(true)}
              disabled={sending}
            >
              <Sparkles className="h-3 w-3" /> Save as new
            </Button>
          )}
        </div>

        {/* Save as new dialog inline */}
        {savingAsNew && (
          <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
            <div className="text-xs font-medium">Save as new template</div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="slug (e.g. renewal_v2)"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="text-xs h-8"
              />
              <Input
                placeholder="Label (e.g. Renewal v2)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleSaveAsNew} disabled={savingTpl}>
                {savingTpl ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSavingAsNew(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Manual Recipients */}
        {recipients.length === 0 && (
          <Textarea
            placeholder={
              channel === "email"
                ? "Paste email addresses (one per line or comma-separated)"
                : "Paste phone numbers (one per line or comma-separated)"
            }
            value={manualRecipients}
            onChange={(e) => setManualRecipients(e.target.value)}
            rows={3}
            className="text-sm"
            disabled={sending}
          />
        )}

        {/* Recipient Summary */}
        {recipients.length > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
            <strong>{recipients.length}</strong> recipients loaded from {context || "selection"}.
            {channel === "whatsapp" && ` ${recipients.filter((r) => r.phone).length} have phone numbers.`}
            {channel === "email" && ` ${recipients.filter((r) => r.email).length} have email addresses.`}
          </div>
        )}

        {/* Progress */}
        {sending && (
          <div className="space-y-2">
            <Progress value={((progress.sent + progress.failed) / Math.max(progress.total, 1)) * 100} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> {progress.sent} sent
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" /> {progress.failed} failed
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {progress.total - progress.sent - progress.failed} remaining
              </span>
            </div>
          </div>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={sending || !message.trim() || recipientCount === 0}
          className="w-full gap-2"
          size="sm"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending {progress.sent + progress.failed}/{progress.total}...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send via {CHANNEL_META[channel].label}
              {recipientCount > 1 && ` to ${recipientCount} recipients`}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
