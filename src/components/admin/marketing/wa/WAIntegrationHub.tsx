import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, Zap, Send, MessageSquare,
  Bot, Bell, Users, ShieldCheck, Megaphone, Phone, Settings2, ArrowRight
} from "lucide-react";

interface IntegrationPoint {
  id: string;
  name: string;
  description: string;
  edgeFunction: string;
  icon: React.ReactNode;
  category: "messaging" | "automation" | "broadcast" | "webhook";
}

const INTEGRATION_POINTS: IntegrationPoint[] = [
  { id: "whatsapp-send", name: "Direct Message Sender", description: "Send text, template, image & document messages via Meta API", edgeFunction: "whatsapp-send", icon: <Send className="h-4 w-4" />, category: "messaging" },
  { id: "broadcast-send", name: "Broadcast Campaigns", description: "Bulk campaign broadcasts to lead segments", edgeFunction: "broadcast-send", icon: <Megaphone className="h-4 w-4" />, category: "broadcast" },
  { id: "wa-automation-trigger", name: "Automation Triggers", description: "Event-driven template/rule-based messaging", edgeFunction: "wa-automation-trigger", icon: <Zap className="h-4 w-4" />, category: "automation" },
  { id: "wa-queue-processor", name: "Message Queue Processor", description: "Processes queued messages with rate limiting", edgeFunction: "wa-queue-processor", icon: <RefreshCw className="h-4 w-4" />, category: "automation" },
  { id: "wa-campaign-launcher", name: "Campaign Launcher", description: "Launches scheduled WhatsApp campaigns", edgeFunction: "wa-campaign-launcher", icon: <Megaphone className="h-4 w-4" />, category: "broadcast" },
  { id: "messaging-service", name: "Messaging Service", description: "Unified provider abstraction layer for all WA sends", edgeFunction: "messaging-service", icon: <MessageSquare className="h-4 w-4" />, category: "messaging" },
  { id: "whatsapp-webhook", name: "Incoming Webhook", description: "Receives delivery receipts & incoming messages from Meta", edgeFunction: "whatsapp-webhook", icon: <Bell className="h-4 w-4" />, category: "webhook" },
  { id: "whatsapp-otp", name: "WhatsApp OTP", description: "Sends OTP verification codes via WhatsApp", edgeFunction: "whatsapp-otp", icon: <ShieldCheck className="h-4 w-4" />, category: "messaging" },
  { id: "hsrp-status-notifier", name: "HSRP Status Notifier", description: "Sends HSRP booking status updates to customers", edgeFunction: "hsrp-status-notifier", icon: <Bell className="h-4 w-4" />, category: "automation" },
  { id: "journey-executor", name: "Customer Journey Engine", description: "Executes multi-step customer journey WhatsApp flows", edgeFunction: "journey-executor", icon: <ArrowRight className="h-4 w-4" />, category: "automation" },
  { id: "dealer-inquiry-broadcast", name: "Dealer Inquiry Broadcast", description: "Sends dealer stock inquiry alerts via WhatsApp", edgeFunction: "dealer-inquiry-broadcast", icon: <Users className="h-4 w-4" />, category: "broadcast" },
  { id: "lead-intake-engine", name: "Lead Intake Alerts", description: "Sends executive alerts for new leads via WhatsApp", edgeFunction: "lead-intake-engine", icon: <Phone className="h-4 w-4" />, category: "automation" },
  { id: "bulk-review-request", name: "Bulk Review Requests", description: "Sends review request messages to verified customers", edgeFunction: "bulk-review-request", icon: <Users className="h-4 w-4" />, category: "broadcast" },
  { id: "insurance-renewal-engine", name: "Insurance Renewal Alerts", description: "Sends policy renewal reminder notifications", edgeFunction: "insurance-renewal-engine", icon: <Bell className="h-4 w-4" />, category: "automation" },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  messaging: { label: "Direct Messaging", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  automation: { label: "Automation & Triggers", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  broadcast: { label: "Broadcasts & Campaigns", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  webhook: { label: "Webhooks & Inbound", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
};

export function WAIntegrationHub() {
  const { toast } = useToast();
  const [apiStatus, setApiStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");
  const [apiDetails, setApiDetails] = useState<{ phone_id?: string; display_name?: string } | null>(null);
  const [testingFn, setTestingFn] = useState<string | null>(null);
  const [fnResults, setFnResults] = useState<Record<string, "ok" | "error">>({});

  const checkApiConnection = async () => {
    setApiStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { action: "health_check" },
      });
      if (error) throw error;
      setApiStatus("connected");
      setApiDetails(data?.details || {});
      toast({ title: "✅ WhatsApp API Connected", description: "Meta Cloud API is active and responding." });
    } catch {
      setApiStatus("error");
      setApiDetails(null);
      toast({ title: "❌ Connection Failed", description: "Check your WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID secrets.", variant: "destructive" });
    }
  };

  const testFunction = async (fnName: string) => {
    setTestingFn(fnName);
    try {
      const { error } = await supabase.functions.invoke(fnName, {
        body: { action: "health_check" },
      });
      setFnResults(prev => ({ ...prev, [fnName]: error ? "error" : "ok" }));
    } catch {
      setFnResults(prev => ({ ...prev, [fnName]: "error" }));
    } finally {
      setTestingFn(null);
    }
  };

  const grouped = INTEGRATION_POINTS.reduce((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {} as Record<string, IntegrationPoint[]>);

  return (
    <div className="space-y-6">
      {/* API Connection Status */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-green-600" />
            WhatsApp Meta API Connection
          </CardTitle>
          <CardDescription>
            Your WhatsApp integration uses the direct Meta Cloud API (v21.0). All backend functions below share the same API credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              {apiStatus === "idle" && <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />}
              {apiStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
              {apiStatus === "connected" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {apiStatus === "error" && <XCircle className="h-5 w-5 text-destructive" />}
              <div>
                <p className="font-medium">
                  {apiStatus === "idle" && "Not checked yet"}
                  {apiStatus === "checking" && "Checking connection..."}
                  {apiStatus === "connected" && "Connected & Active"}
                  {apiStatus === "error" && "Connection Failed"}
                </p>
                {apiDetails?.display_name && (
                  <p className="text-sm text-muted-foreground">Business: {apiDetails.display_name}</p>
                )}
              </div>
            </div>
            <Button onClick={checkApiConnection} disabled={apiStatus === "checking"} variant={apiStatus === "connected" ? "outline" : "default"} className="gap-2">
              {apiStatus === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {apiStatus === "connected" ? "Re-check" : "Check Connection"}
            </Button>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
            <p className="font-medium">Required Secrets (already configured):</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="outline" className="font-mono text-xs">WHATSAPP_ACCESS_TOKEN</Badge>
              <Badge variant="outline" className="font-mono text-xs">WHATSAPP_PHONE_NUMBER_ID</Badge>
              <Badge variant="outline" className="font-mono text-xs">WHATSAPP_VERIFY_TOKEN</Badge>
            </div>
            <p className="text-muted-foreground mt-2">
              These secrets are shared across all {INTEGRATION_POINTS.length} backend functions listed below. 
              Update them once and every integration point updates automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Points by Category */}
      {Object.entries(grouped).map(([category, points]) => {
        const cat = CATEGORY_LABELS[category];
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cat.color}>{cat.label}</Badge>
              <span className="text-sm text-muted-foreground">{points.length} functions</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {points.map((point) => (
                <Card key={point.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">{point.icon}</div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{point.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{point.description}</p>
                          <p className="text-xs font-mono text-muted-foreground/70 mt-1">{point.edgeFunction}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {fnResults[point.edgeFunction] === "ok" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {fnResults[point.edgeFunction] === "error" && <XCircle className="h-4 w-4 text-amber-500" />}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          disabled={testingFn === point.edgeFunction}
                          onClick={() => testFunction(point.edgeFunction)}
                        >
                          {testingFn === point.edgeFunction ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ping"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-foreground mb-1">🔑 Single API Key Setup</p>
              <p>Your WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are stored as backend secrets. All {INTEGRATION_POINTS.length} functions use them automatically.</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-foreground mb-1">📤 Direct Messaging</p>
              <p>Send text, templates, images & documents from CRM, Insurance, HSRP, or any workspace using the unified messaging-service function.</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-foreground mb-1">⚡ Automations</p>
              <p>Event triggers fire WhatsApp messages automatically — new lead alerts, HSRP status updates, insurance renewals, journey flows.</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-foreground mb-1">📢 Broadcasts</p>
              <p>Campaign broadcasts, dealer inquiries, and review requests all route through the same Meta API with message logging.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
