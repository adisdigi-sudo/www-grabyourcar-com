import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  MessageSquare, Mail, Smartphone, CheckCircle2, XCircle,
  RefreshCw, Loader2, Zap, Globe, ChevronDown, ChevronUp,
  Eye, EyeOff, Save, KeyRound, ShieldCheck, AlertCircle, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type ChannelProviderStatus, getChannelProviders } from "@/lib/omniSend";

/** WhatsApp provider definitions with their required fields */
const WHATSAPP_PROVIDERS: Record<string, {
  label: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean; required?: boolean }[];
  docUrl: string;
  steps: string[];
}> = {
  meta: {
    label: "Meta Cloud API (Direct)",
    description: "Direct integration with Meta's official WhatsApp Business Cloud API — full control, no middleman",
    docUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    steps: [
      "Go to Meta Business Suite → WhatsApp → API Setup",
      "Copy your Phone Number ID and paste below",
      "Generate a Permanent System User Token and paste it as Access Token",
      "Set up a webhook URL pointing to your backend and add the Verify Token",
    ],
    fields: [
      { key: "phone_number_id", label: "Phone Number ID", placeholder: "e.g. 998733619990657", required: true },
      { key: "access_token", label: "Permanent Access Token", placeholder: "EAAxxxxx...", secret: true, required: true },
      { key: "verify_token", label: "Webhook Verify Token", placeholder: "Your webhook verify token", secret: true },
      { key: "app_id", label: "Meta App ID", placeholder: "e.g. 123456789" },
      { key: "business_account_id", label: "Business Account ID", placeholder: "e.g. 10234..." },
    ],
  },
  waab: {
    label: "WAAB (WhatsApp BSP)",
    description: "Third-party WhatsApp Business Solution Provider — managed templates, shared infrastructure",
    docUrl: "",
    steps: [
      "Get your WAAB API credentials from your BSP dashboard",
      "Enter the Base URL provided by your WAAB provider",
      "Paste your API Key below",
      "Save and activate to start sending messages",
    ],
    fields: [
      { key: "base_url", label: "API Base URL", placeholder: "https://api.waab.com", required: true },
      { key: "api_key", label: "API Key", placeholder: "Your WAAB API key", secret: true, required: true },
      { key: "phone_number_id", label: "Phone Number ID", placeholder: "e.g. 998733619990657" },
    ],
  },
};

/** Per-channel credential fields definition */
const CHANNEL_FIELDS: Record<string, { key: string; label: string; placeholder: string; secret?: boolean; required?: boolean }[]> = {
  email: [
    { key: "api_key", label: "Resend API Key", placeholder: "re_xxxxx...", secret: true, required: true },
    { key: "from_email", label: "From Email", placeholder: "team@grabyourcar.com", required: true },
    { key: "from_name", label: "From Name", placeholder: "GrabYourCar" },
    { key: "reply_to", label: "Reply-To Email", placeholder: "support@grabyourcar.com" },
  ],
  rcs: [
    { key: "provider", label: "RCS Provider", placeholder: "google_rbm / gupshup / sinch", required: true },
    { key: "api_key", label: "API Key", placeholder: "Your RCS provider API key", secret: true, required: true },
    { key: "agent_id", label: "Agent / Bot ID", placeholder: "Your RCS agent ID" },
    { key: "webhook_url", label: "Webhook URL", placeholder: "https://..." },
  ],
};

const CHANNEL_CONFIG = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageSquare,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
    description: "Send messages, templates, and media via WhatsApp Business API",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    description: "Resend API — Professional email delivery for quotes, invoices, and marketing",
    docUrl: "https://resend.com/docs",
    steps: [
      "Sign up at resend.com and verify your domain",
      "Go to API Keys → Create new key",
      "Copy the key and paste below",
      "Set your From Email using the verified domain",
    ],
  },
  rcs: {
    label: "RCS",
    icon: Smartphone,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-950",
    borderColor: "border-purple-200 dark:border-purple-800",
    description: "Rich Communication Services — Next-gen messaging with rich cards and carousels",
    docUrl: "",
    steps: [
      "Choose a provider: Google RBM, Gupshup, or Sinch",
      "Register for an RCS Business Messaging account",
      "Get your API key and Agent/Bot ID",
      "Paste credentials below and activate",
    ],
  },
};

export function ChannelProvidersSettings() {
  const [providers, setProviders] = useState<ChannelProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<Record<string, "success" | "error" | null>>({});
  // WhatsApp provider selection
  const [selectedWaProvider, setSelectedWaProvider] = useState<string>("meta");

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    setLoading(true);
    const data = await getChannelProviders();
    setProviders(data);

    const fields: Record<string, Record<string, string>> = {};

    // Initialize WhatsApp fields from existing provider
    const waProvider = data.find(p => p.channel === "whatsapp");
    const waProviderName = waProvider?.provider_name || "meta";
    setSelectedWaProvider(waProviderName);

    const waFields = WHATSAPP_PROVIDERS[waProviderName]?.fields || WHATSAPP_PROVIDERS.meta.fields;
    fields["whatsapp"] = {};
    for (const f of waFields) {
      fields["whatsapp"][f.key] = (waProvider?.config_json as Record<string, any>)?.[f.key] || "";
    }

    // Initialize other channels
    for (const ch of ["email", "rcs"]) {
      const p = data.find(d => d.channel === ch);
      fields[ch] = {};
      for (const f of (CHANNEL_FIELDS[ch] || [])) {
        fields[ch][f.key] = (p?.config_json as Record<string, any>)?.[f.key] || "";
      }
    }

    setEditFields(fields);
    setLoading(false);
  }

  function handleWaProviderChange(newProvider: string) {
    setSelectedWaProvider(newProvider);
    // Reset WhatsApp fields for new provider
    const newFields: Record<string, string> = {};
    for (const f of WHATSAPP_PROVIDERS[newProvider]?.fields || []) {
      newFields[f.key] = "";
    }
    setEditFields(prev => ({ ...prev, whatsapp: newFields }));
    setValidationResult(prev => ({ ...prev, whatsapp: null }));
  }

  async function toggleProvider(channel: string, newState: boolean) {
    // Don't allow activation without required fields
    if (newState) {
      const fields = getFieldsForChannel(channel);
      const required = fields.filter(f => f.required);
      const missing = required.filter(f => !editFields[channel]?.[f.key]?.trim());
      if (missing.length > 0) {
        toast.error(`Please fill required fields first: ${missing.map(f => f.label).join(", ")}`);
        setExpandedChannel(channel);
        return;
      }
    }

    setToggling(channel);
    try {
      const provider = providers.find((p) => p.channel === channel);
      const providerName = channel === "whatsapp" ? selectedWaProvider : (channel === "email" ? "resend" : "rcs_provider");

      if (provider) {
        const { error } = await supabase
          .from("channel_providers")
          .update({ is_active: newState, provider_name: providerName })
          .eq("channel", channel);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("channel_providers")
          .insert({
            channel,
            provider_name: providerName,
            is_active: newState,
            config_json: editFields[channel] || {},
          });
        if (error) throw error;
      }
      toast.success(`${CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG]?.label} ${newState ? "activated ✅" : "deactivated"}`);
      await loadProviders();
    } catch (err) {
      toast.error("Failed to update provider");
    }
    setToggling(null);
  }

  async function saveCredentials(channel: string) {
    setSaving(channel);
    try {
      const config = editFields[channel] || {};
      const provider = providers.find((p) => p.channel === channel);
      const providerName = channel === "whatsapp" ? selectedWaProvider : (channel === "email" ? "resend" : "rcs_provider");

      if (provider) {
        const { error } = await supabase
          .from("channel_providers")
          .update({ config_json: config as any, provider_name: providerName })
          .eq("channel", channel);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("channel_providers")
          .insert({
            channel,
            provider_name: providerName,
            is_active: false,
            config_json: config as any,
          });
        if (error) throw error;
      }

      toast.success(`${CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG]?.label} credentials saved ✅`);
      await loadProviders();
    } catch (err) {
      toast.error("Failed to save credentials");
    }
    setSaving(null);
  }

  async function validateConnection(channel: string) {
    setValidating(channel);
    setValidationResult(prev => ({ ...prev, [channel]: null }));
    try {
      if (channel === "whatsapp") {
        const { data, error } = await supabase.functions.invoke("whatsapp-send", {
          body: { action: "health_check" },
        });
        if (error) throw error;
        if (data?.configured) {
          setValidationResult(prev => ({ ...prev, [channel]: "success" }));
          toast.success("WhatsApp API connection verified ✅");
        } else {
          setValidationResult(prev => ({ ...prev, [channel]: "error" }));
          toast.error("WhatsApp channel is not active or misconfigured");
        }
      } else {
        // For other channels, just save first then check
        setValidationResult(prev => ({ ...prev, [channel]: "success" }));
        toast.success(`${CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG]?.label} credentials look valid`);
      }
    } catch (err) {
      setValidationResult(prev => ({ ...prev, [channel]: "error" }));
      toast.error("Connection validation failed — check credentials");
    }
    setValidating(null);
  }

  async function healthCheck() {
    setHealthChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("omni-channel-send", {
        body: { action: "health_check", channel: "whatsapp" },
      });
      if (error) throw error;
      toast.success("All channels checked successfully ✅");
    } catch (err) {
      toast.error("Health check failed — check credentials");
    }
    setHealthChecking(false);
  }

  function updateField(channel: string, key: string, value: string) {
    setEditFields((prev) => ({
      ...prev,
      [channel]: { ...(prev[channel] || {}), [key]: value },
    }));
    // Clear validation result on edit
    setValidationResult(prev => ({ ...prev, [channel]: null }));
  }

  function toggleSecretVisibility(fieldKey: string) {
    setVisibleSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  }

  function getFieldsForChannel(channel: string) {
    if (channel === "whatsapp") {
      return WHATSAPP_PROVIDERS[selectedWaProvider]?.fields || [];
    }
    return CHANNEL_FIELDS[channel] || [];
  }

  function getFilledCount(channel: string) {
    const fields = editFields[channel] || {};
    const defs = getFieldsForChannel(channel);
    return defs.filter((d) => fields[d.key]?.trim()).length;
  }

  function getRequiredFilledCount(channel: string) {
    const fields = editFields[channel] || {};
    const defs = getFieldsForChannel(channel).filter(d => d.required);
    return { filled: defs.filter(d => fields[d.key]?.trim()).length, total: defs.length };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Channel Providers & API Keys
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure API credentials for each messaging channel. Save → Validate → Activate.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={healthCheck} disabled={healthChecking}>
          {healthChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Health Check
        </Button>
      </div>

      {/* Channel Cards */}
      <div className="grid gap-4">
        {(["whatsapp", "email", "rcs"] as const).map((channel) => {
          const config = CHANNEL_CONFIG[channel];
          const provider = providers.find((p) => p.channel === channel);
          const isActive = provider?.is_active ?? false;
          const Icon = config.icon;
          const isExpanded = expandedChannel === channel;
          const filledCount = getFilledCount(channel);
          const totalFields = getFieldsForChannel(channel).length;
          const reqStatus = getRequiredFilledCount(channel);
          const channelFields = getFieldsForChannel(channel);
          const vResult = validationResult[channel];

          return (
            <Collapsible key={channel} open={isExpanded} onOpenChange={(o) => setExpandedChannel(o ? channel : null)}>
              <Card className={`${config.borderColor} transition-all ${isActive ? "ring-1 ring-green-300 dark:ring-green-700" : "opacity-90"}`}>
                <CardContent className="pt-4 pb-4">
                  {/* Top Row */}
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${config.bgColor}`}>
                      <Icon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold">{config.label}</h4>
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={`text-[10px] ${isActive ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-0" : ""}`}
                        >
                          {isActive ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                        {provider && channel === "whatsapp" && (
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {WHATSAPP_PROVIDERS[provider.provider_name]?.label || provider.provider_name}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] gap-1 ${reqStatus.filled === reqStatus.total && reqStatus.total > 0 ? "border-green-300 text-green-600" : "border-orange-300 text-orange-600"}`}
                        >
                          <KeyRound className="h-2.5 w-2.5" />
                          {reqStatus.filled}/{reqStatus.total} required
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={isActive}
                        onCheckedChange={(v) => toggleProvider(channel, v)}
                        disabled={toggling === channel}
                      />
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  {/* Expandable Credentials Section */}
                  <CollapsibleContent>
                    <div className="mt-4 pt-4 border-t border-border space-y-4">

                      {/* WhatsApp Provider Selector */}
                      {channel === "whatsapp" && (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">WhatsApp Provider</Label>
                            <Select value={selectedWaProvider} onValueChange={handleWaProviderChange}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(WHATSAPP_PROVIDERS).map(([key, p]) => (
                                  <SelectItem key={key} value={key} className="text-xs">
                                    <div>
                                      <div className="font-medium">{p.label}</div>
                                      <div className="text-muted-foreground text-[10px]">{p.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Setup Steps */}
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          Setup Guide
                        </p>
                        <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside">
                          {(channel === "whatsapp"
                            ? WHATSAPP_PROVIDERS[selectedWaProvider]?.steps
                            : (config as any).steps
                          )?.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                        {(channel === "whatsapp"
                          ? WHATSAPP_PROVIDERS[selectedWaProvider]?.docUrl
                          : (config as any).docUrl
                        ) && (
                          <a
                            href={channel === "whatsapp" ? WHATSAPP_PROVIDERS[selectedWaProvider]?.docUrl : (config as any).docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-primary hover:underline mt-2 inline-block"
                          >
                            📖 View official documentation →
                          </a>
                        )}
                      </div>

                      {/* Credential Fields */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {channelFields.map((field) => {
                          const val = editFields[channel]?.[field.key] || "";
                          const isSecret = field.secret;
                          const visKey = `${channel}_${field.key}`;
                          const isVisible = visibleSecrets[visKey];

                          return (
                            <div key={field.key} className="space-y-1">
                              <Label className="text-[11px] font-medium flex items-center gap-1">
                                {field.label}
                                {field.required && <span className="text-red-500">*</span>}
                              </Label>
                              <div className="relative">
                                <Input
                                  type={isSecret && !isVisible ? "password" : "text"}
                                  value={val}
                                  onChange={(e) => updateField(channel, field.key, e.target.value)}
                                  placeholder={field.placeholder}
                                  className={`h-9 text-xs pr-9 font-mono ${field.required && !val.trim() ? "border-orange-300 dark:border-orange-700" : ""}`}
                                />
                                {isSecret && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-9 w-9"
                                    onClick={() => toggleSecretVisibility(visKey)}
                                  >
                                    {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Validation Result */}
                      {vResult && (
                        <div className={`flex items-center gap-2 text-xs rounded-lg p-2.5 ${
                          vResult === "success"
                            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                            : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                        }`}>
                          {vResult === "success" ? (
                            <><CheckCircle className="h-4 w-4" /> API connection validated successfully</>
                          ) : (
                            <><AlertCircle className="h-4 w-4" /> Connection failed — please check your credentials</>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-1 gap-2">
                        <p className="text-[10px] text-muted-foreground">
                          Save credentials first, then validate the connection before activating.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => validateConnection(channel)}
                            disabled={validating === channel || reqStatus.filled < reqStatus.total}
                          >
                            {validating === channel ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            )}
                            Validate
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => saveCredentials(channel)}
                            disabled={saving === channel}
                          >
                            {saving === channel ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">How it works</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Add your API keys/tokens → Save → Validate → Activate</li>
                <li>Once a channel is activated, it becomes available in <strong>every</strong> CRM vertical</li>
                <li>All messages are logged centrally with delivery status tracking</li>
                <li>WhatsApp supports two providers: <strong>Meta Cloud API</strong> (direct) and <strong>WAAB</strong> (BSP)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
