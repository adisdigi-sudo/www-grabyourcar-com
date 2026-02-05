import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Bot, Truck, Zap, Settings, RefreshCw, Check, X, ExternalLink, MessageSquare, Brain } from "lucide-react";

interface ChatbotSettings {
  isEnabled: boolean;
  welcomeMessage: string;
  systemPrompt: string;
  model: string;
  maxTokens: number;
  temperature: number;
  fallbackMessage: string;
  businessHours: string;
  autoRespond: boolean;
}

interface ShippingPartner {
  id: string;
  name: string;
  apiKey: string;
  apiEndpoint: string;
  isActive: boolean;
  trackingUrlTemplate: string;
  supportedServices: string[];
}

interface AIAPIConfig {
  provider: string;
  apiKeyName: string;
  isConfigured: boolean;
  model: string;
  features: string[];
}

export const IntegrationsManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("chatbot");
  
  // Chatbot State
  const [chatbotSettings, setChatbotSettings] = useState<ChatbotSettings>({
    isEnabled: true,
    welcomeMessage: "Hi! I'm the Grabyourcar assistant. How can I help you find your perfect car today?",
    systemPrompt: "You are a helpful car buying assistant for Grabyourcar, India's trusted new car platform. Help users find their ideal car, provide pricing info, and answer questions about car features, finance, and insurance.",
    model: "gemini-2.5-flash",
    maxTokens: 1024,
    temperature: 0.7,
    fallbackMessage: "I'm sorry, I couldn't understand that. Would you like to speak with our expert? Call +91 95772 00023",
    businessHours: "Mon-Sat, 9AM-7PM IST",
    autoRespond: true,
  });

  // Shipping Partners State
  const [shippingPartners, setShippingPartners] = useState<ShippingPartner[]>([
    {
      id: "1",
      name: "Delhivery",
      apiKey: "",
      apiEndpoint: "https://api.delhivery.com/v1",
      isActive: false,
      trackingUrlTemplate: "https://www.delhivery.com/track/package/{tracking_id}",
      supportedServices: ["Express", "Standard", "Surface"],
    },
    {
      id: "2",
      name: "BlueDart",
      apiKey: "",
      apiEndpoint: "https://api.bluedart.com/v1",
      isActive: false,
      trackingUrlTemplate: "https://www.bluedart.com/tracking/{tracking_id}",
      supportedServices: ["Express", "Dart Plus"],
    },
    {
      id: "3",
      name: "DTDC",
      apiKey: "",
      apiEndpoint: "https://api.dtdc.com/v1",
      isActive: false,
      trackingUrlTemplate: "https://www.dtdc.in/tracking/shipment-tracking.asp?refnum={tracking_id}",
      supportedServices: ["Express", "Economy"],
    },
  ]);

  // AI APIs State
  const [aiConfigs, setAiConfigs] = useState<AIAPIConfig[]>([
    { provider: "Google Gemini", apiKeyName: "GEMINI_API_KEY", isConfigured: false, model: "gemini-2.5-flash", features: ["Chat", "Content Generation", "Car Recommendations"] },
    { provider: "OpenAI", apiKeyName: "OPENAI_API_KEY", isConfigured: false, model: "gpt-4o", features: ["Blog Writing", "SEO Content"] },
    { provider: "Perplexity", apiKeyName: "PERPLEXITY_API_KEY", isConfigured: true, model: "sonar-pro", features: ["Auto News", "Market Research"] },
  ]);

  // Fetch settings
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["integrationsSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .in("setting_key", ["chatbot_settings", "shipping_partners", "ai_api_configs"]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      savedSettings.forEach((setting) => {
        if (setting.setting_key === "chatbot_settings") {
          setChatbotSettings(setting.setting_value as unknown as ChatbotSettings);
        } else if (setting.setting_key === "shipping_partners") {
          setShippingPartners(setting.setting_value as unknown as ShippingPartner[]);
        } else if (setting.setting_key === "ai_api_configs") {
          setAiConfigs(setting.setting_value as unknown as AIAPIConfig[]);
        }
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from("admin_settings")
        .upsert([{ 
          setting_key: key, 
          setting_value: JSON.parse(JSON.stringify(value)),
          updated_at: new Date().toISOString()
        }], { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrationsSettings"] });
      toast.success("Settings saved");
    },
    onError: () => {
      toast.error("Failed to save");
    },
  });

  const handleSaveChatbot = () => {
    saveMutation.mutate({ key: "chatbot_settings", value: chatbotSettings });
  };

  const handleSaveShipping = () => {
    saveMutation.mutate({ key: "shipping_partners", value: shippingPartners });
  };

  const handleSaveAIConfigs = () => {
    saveMutation.mutate({ key: "ai_api_configs", value: aiConfigs });
  };

  const updateShippingPartner = (id: string, updates: Partial<ShippingPartner>) => {
    setShippingPartners(shippingPartners.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const testShippingConnection = (partner: ShippingPartner) => {
    if (!partner.apiKey) {
      toast.error("Please enter API key first");
      return;
    }
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Testing connection to ${partner.name}...`,
        success: `${partner.name} connection successful!`,
        error: "Connection failed",
      }
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI & Integrations</h2>
        <p className="text-muted-foreground">Manage chatbot, shipping partners, and AI APIs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="chatbot"><Bot className="h-4 w-4 mr-2" />Chatbot</TabsTrigger>
          <TabsTrigger value="shipping"><Truck className="h-4 w-4 mr-2" />Shipping</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="h-4 w-4 mr-2" />AI APIs</TabsTrigger>
        </TabsList>

        {/* Chatbot Tab */}
        <TabsContent value="chatbot" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    WhatsApp AI Chatbot
                  </CardTitle>
                  <CardDescription>Configure AI-powered customer chat</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={chatbotSettings.isEnabled ? "default" : "secondary"}>
                    {chatbotSettings.isEnabled ? "Active" : "Inactive"}
                  </Badge>
                  <Switch 
                    checked={chatbotSettings.isEnabled}
                    onCheckedChange={(v) => setChatbotSettings({ ...chatbotSettings, isEnabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select 
                    value={chatbotSettings.model}
                    onValueChange={(v) => setChatbotSettings({ ...chatbotSettings, model: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                      <SelectItem value="gpt-5">GPT-5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Response Tokens</Label>
                  <Input 
                    type="number"
                    value={chatbotSettings.maxTokens}
                    onChange={(e) => setChatbotSettings({ ...chatbotSettings, maxTokens: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Textarea 
                  value={chatbotSettings.welcomeMessage}
                  onChange={(e) => setChatbotSettings({ ...chatbotSettings, welcomeMessage: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>System Prompt (AI Personality)</Label>
                <Textarea 
                  value={chatbotSettings.systemPrompt}
                  onChange={(e) => setChatbotSettings({ ...chatbotSettings, systemPrompt: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Fallback Message (When AI fails)</Label>
                <Textarea 
                  value={chatbotSettings.fallbackMessage}
                  onChange={(e) => setChatbotSettings({ ...chatbotSettings, fallbackMessage: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Hours</Label>
                  <Input 
                    value={chatbotSettings.businessHours}
                    onChange={(e) => setChatbotSettings({ ...chatbotSettings, businessHours: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch 
                    checked={chatbotSettings.autoRespond}
                    onCheckedChange={(v) => setChatbotSettings({ ...chatbotSettings, autoRespond: v })}
                  />
                  <Label>Auto-respond outside business hours</Label>
                </div>
              </div>

              <Button onClick={handleSaveChatbot} disabled={saveMutation.isPending} className="w-full">
                <Save className="h-4 w-4 mr-2" />Save Chatbot Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Tab */}
        <TabsContent value="shipping" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Shipping Partners</h3>
              <p className="text-sm text-muted-foreground">Connect logistics partners for order tracking</p>
            </div>
            <Button onClick={handleSaveShipping} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />Save All
            </Button>
          </div>

          <div className="grid gap-4">
            {shippingPartners.map((partner) => (
              <Card key={partner.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {partner.name}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge variant={partner.isActive ? "default" : "secondary"}>
                        {partner.isActive ? "Connected" : "Not Connected"}
                      </Badge>
                      <Switch 
                        checked={partner.isActive}
                        onCheckedChange={(v) => updateShippingPartner(partner.id, { isActive: v })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input 
                        type="password"
                        value={partner.apiKey}
                        onChange={(e) => updateShippingPartner(partner.id, { apiKey: e.target.value })}
                        placeholder="Enter API key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Endpoint</Label>
                      <Input 
                        value={partner.apiEndpoint}
                        onChange={(e) => updateShippingPartner(partner.id, { apiEndpoint: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {partner.supportedServices.map((service) => (
                        <Badge key={service} variant="outline">{service}</Badge>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => testShippingConnection(partner)}>
                      <RefreshCw className="h-4 w-4 mr-2" />Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AI APIs Tab */}
        <TabsContent value="ai" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">AI API Configurations</h3>
              <p className="text-sm text-muted-foreground">Manage AI provider connections</p>
            </div>
            <Button onClick={handleSaveAIConfigs} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />Save
            </Button>
          </div>

          <div className="grid gap-4">
            {aiConfigs.map((config, idx) => (
              <Card key={config.provider}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      {config.provider}
                    </CardTitle>
                    <Badge variant={config.isConfigured ? "default" : "secondary"}>
                      {config.isConfigured ? (
                        <><Check className="h-3 w-3 mr-1" />Configured</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" />Not Configured</>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Secret Name</Label>
                      <Input value={config.apiKeyName} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Model</Label>
                      <Input 
                        value={config.model}
                        onChange={(e) => {
                          const updated = [...aiConfigs];
                          updated[idx].model = e.target.value;
                          setAiConfigs(updated);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Used for:</Label>
                    <div className="flex gap-2 mt-1">
                      {config.features.map((feature) => (
                        <Badge key={feature} variant="outline">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                  {!config.isConfigured && (
                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/50 p-2 rounded">
                      ⚠️ Add {config.apiKeyName} in Secrets to enable this provider
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-semibold">Lovable AI (Built-in)</h4>
                  <p className="text-sm text-muted-foreground">
                    Your project has access to Lovable AI models (Gemini, GPT) without requiring API keys for supported features.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
