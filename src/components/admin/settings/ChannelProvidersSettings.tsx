import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  MessageSquare, Mail, Smartphone, Settings, CheckCircle2, XCircle,
  RefreshCw, Loader2, Zap, Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type ChannelProviderStatus, getChannelProviders } from "@/lib/omniSend";

const CHANNEL_CONFIG = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageSquare,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
    description: "Meta Cloud API — Send messages, templates, and media via WhatsApp Business API",
    setupHint: "Connected via Meta Business. Phone Number ID and Access Token configured.",
  },
  email: {
    label: "Email",
    icon: Mail,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    description: "Resend API — Professional email delivery for quotes, invoices, and marketing",
    setupHint: "Requires Resend API key and verified domain (grabyourcar.com).",
  },
  rcs: {
    label: "RCS",
    icon: Smartphone,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-950",
    borderColor: "border-purple-200 dark:border-purple-800",
    description: "Rich Communication Services — Next-gen messaging with rich cards and carousels",
    setupHint: "Choose provider (Google RBM, Gupshup, Sinch) and configure API credentials.",
  },
};

export function ChannelProvidersSettings() {
  const [providers, setProviders] = useState<ChannelProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    setLoading(true);
    const data = await getChannelProviders();
    setProviders(data);
    setLoading(false);
  }

  async function toggleProvider(channel: string, newState: boolean) {
    setToggling(channel);
    try {
      const { error } = await supabase
        .from("channel_providers")
        .update({ is_active: newState })
        .eq("channel", channel);

      if (error) throw error;
      toast.success(`${CHANNEL_CONFIG[channel as keyof typeof CHANNEL_CONFIG]?.label} ${newState ? "activated" : "deactivated"}`);
      await loadProviders();
    } catch (err) {
      toast.error("Failed to update provider");
    }
    setToggling(null);
  }

  async function healthCheck() {
    setHealthChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("omni-channel-send", {
        body: { action: "health_check", channel: "whatsapp" },
      });
      if (error) throw error;
      toast.success("All channels checked successfully");
      console.log("Health check result:", data);
    } catch (err) {
      toast.error("Health check failed");
    }
    setHealthChecking(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Channel Providers
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure messaging channels. Once active, a channel is available across all CRM verticals.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={healthCheck} disabled={healthChecking}>
          {healthChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Health Check
        </Button>
      </div>

      <div className="grid gap-4">
        {(["whatsapp", "email", "rcs"] as const).map((channel) => {
          const config = CHANNEL_CONFIG[channel];
          const provider = providers.find((p) => p.channel === channel);
          const isActive = provider?.is_active ?? false;
          const Icon = config.icon;

          return (
            <Card key={channel} className={`${config.borderColor} ${isActive ? "" : "opacity-75"}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${config.bgColor}`}>
                    <Icon className={`h-6 w-6 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
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
                      {provider && (
                        <Badge variant="outline" className="text-[10px]">
                          {provider.provider_name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{config.description}</p>
                    <p className="text-[10px] text-muted-foreground/70">{config.setupHint}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isActive}
                      onCheckedChange={(v) => toggleProvider(channel, v)}
                      disabled={toggling === channel}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
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
                <li>Once a channel is activated here, it becomes available in <strong>every</strong> CRM vertical</li>
                <li>All messages are logged centrally with delivery status tracking</li>
                <li>WhatsApp falls back to wa.me links if API is unavailable</li>
                <li>Email requires Resend domain verification for live delivery</li>
                <li>RCS will be available once a provider is integrated</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
