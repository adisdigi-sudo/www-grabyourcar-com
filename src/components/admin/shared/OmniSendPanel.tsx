import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  MessageSquare, Mail, Smartphone, Send, Loader2, CheckCircle2,
  XCircle, AlertTriangle, Users, Zap, Clock
} from "lucide-react";
import {
  type OmniChannel,
  type ChannelProviderStatus,
  getChannelProviders,
  omniSend,
  omniSendBulk,
} from "@/lib/omniSend";

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

  useEffect(() => {
    getChannelProviders().then(setProviders);
  }, []);

  const activeProvider = providers.find((p) => p.channel === channel);
  const isActive = activeProvider?.is_active ?? false;

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
                className={`flex-1 gap-1.5 text-xs ${channel === ch ? "" : ""} ${!active ? "opacity-50" : ""}`}
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
          rows={4}
          className="text-sm"
          disabled={sending}
        />

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
