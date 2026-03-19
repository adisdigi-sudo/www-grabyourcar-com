import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, BarChart3, Eye, EyeOff, RefreshCw, Info } from "lucide-react";

const SETTING_KEY = "ad_tracking_config";

interface TrackingConfig {
  google_ads_id: string;
  google_lead_label: string;
  google_whatsapp_label: string;
  google_call_label: string;
  meta_pixel_id: string;
}

const DEFAULT_CONFIG: TrackingConfig = {
  google_ads_id: "",
  google_lead_label: "",
  google_whatsapp_label: "",
  google_call_label: "",
  meta_pixel_id: "",
};

export const AdTrackingSettings = () => {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<TrackingConfig>(DEFAULT_CONFIG);
  const [showIds, setShowIds] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ad-tracking-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data?.setting_value) {
      const val = data.setting_value as unknown as TrackingConfig;
      setConfig({ ...DEFAULT_CONFIG, ...val });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig: TrackingConfig) => {
      const payload = {
        setting_key: SETTING_KEY,
        setting_value: newConfig as any,
        description: "Google Ads & Meta Pixel tracking IDs",
        updated_at: new Date().toISOString(),
      };

      if (data?.id) {
        const { error } = await supabase
          .from("admin_settings")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("admin_settings")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-tracking-config"] });
      toast.success("Tracking settings saved successfully!");
    },
    onError: (err: any) => {
      toast.error("Failed to save: " + err.message);
    },
  });

  const handleSave = () => saveMutation.mutate(config);
  const mask = (val: string) => (showIds || !val ? val : val.slice(0, 4) + "••••••••");

  const update = (field: keyof TrackingConfig, value: string) =>
    setConfig((prev) => ({ ...prev, [field]: value.trim() }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ad Tracking Settings</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage Google Ads &amp; Meta Pixel IDs. Changes apply immediately to new visitors.
          </p>
        </div>
        <Button onClick={() => setShowIds(!showIds)} variant="outline" size="sm">
          {showIds ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          {showIds ? "Hide IDs" : "Show IDs"}
        </Button>
      </div>

      {/* Google Ads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Google Ads
          </CardTitle>
          <CardDescription>
            Your Google Ads conversion tracking identifiers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Google Ads Conversion ID</Label>
            <Input
              placeholder="AW-123456789"
              value={showIds ? config.google_ads_id : mask(config.google_ads_id)}
              onChange={(e) => update("google_ads_id", e.target.value)}
              readOnly={!showIds}
              onFocus={() => !showIds && setShowIds(true)}
            />
            <p className="text-xs text-muted-foreground">
              Found in Google Ads → Tools → Conversions → Tag setup
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Lead Conversion Label</Label>
              <Input
                placeholder="AW-123456789/AbCdEfGhIjKl"
                value={showIds ? config.google_lead_label : mask(config.google_lead_label)}
                onChange={(e) => update("google_lead_label", e.target.value)}
                readOnly={!showIds}
                onFocus={() => !showIds && setShowIds(true)}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Click Label</Label>
              <Input
                placeholder="AW-123456789/WxYzAbCd"
                value={showIds ? config.google_whatsapp_label : mask(config.google_whatsapp_label)}
                onChange={(e) => update("google_whatsapp_label", e.target.value)}
                readOnly={!showIds}
                onFocus={() => !showIds && setShowIds(true)}
              />
            </div>
            <div className="space-y-2">
              <Label>Call Click Label</Label>
              <Input
                placeholder="AW-123456789/EfGhIjKl"
                value={showIds ? config.google_call_label : mask(config.google_call_label)}
                onChange={(e) => update("google_call_label", e.target.value)}
                readOnly={!showIds}
                onFocus={() => !showIds && setShowIds(true)}
              />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Conversion labels are unique per conversion action. Create separate conversion actions in Google Ads for Lead, WhatsApp, and Call events.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Meta Pixel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary fill-current">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            Meta Pixel
          </CardTitle>
          <CardDescription>
            Your Meta (Facebook) Pixel identifier for conversion tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Meta Pixel ID</Label>
            <Input
              placeholder="123456789012345"
              value={showIds ? config.meta_pixel_id : mask(config.meta_pixel_id)}
              onChange={(e) => update("meta_pixel_id", e.target.value)}
              readOnly={!showIds}
              onFocus={() => !showIds && setShowIds(true)}
            />
            <p className="text-xs text-muted-foreground">
              Found in Meta Events Manager → Data Sources → Your Pixel → Settings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {config.google_ads_id ? (
                <Badge variant="default" className="bg-green-600">Google Ads Active</Badge>
              ) : (
                <Badge variant="secondary">Google Ads Not Set</Badge>
              )}
              {config.meta_pixel_id ? (
                <Badge variant="default" className="bg-blue-600">Meta Pixel Active</Badge>
              ) : (
                <Badge variant="secondary">Meta Pixel Not Set</Badge>
              )}
            </div>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
