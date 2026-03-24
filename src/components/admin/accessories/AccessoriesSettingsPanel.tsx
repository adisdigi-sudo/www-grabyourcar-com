import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, Truck, CreditCard, Bell, Rocket, Copy, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AccessoriesSettingsPanel() {
  const [settings, setSettings] = useState({
    storeName: "GrabYourCar Accessories",
    deliveryFee: 99,
    freeDeliveryAbove: 999,
    codEnabled: true,
    onlinePaymentEnabled: true,
    orderNotifications: true,
    lowStockAlert: true,
    lowStockThreshold: 5,
    taxRate: 18,
  });

  const [shopRocketId, setShopRocketId] = useState("");
  const [shopRocketSaved, setShopRocketSaved] = useState(false);
  const [shopRocketLoading, setShopRocketLoading] = useState(true);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shoprocket-webhook`;

  // Load ShopRocket store ID from admin_settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "shoprocket_store_id")
        .maybeSingle();
      if (data?.setting_value) {
        const val = typeof data.setting_value === "string"
          ? data.setting_value
          : (data.setting_value as any)?.value ?? "";
        setShopRocketId(val);
        if (val) setShopRocketSaved(true);
      }
      setShopRocketLoading(false);
    })();
  }, []);

  const saveShopRocketId = async () => {
    const { error } = await supabase
      .from("admin_settings")
      .upsert(
        {
          setting_key: "shoprocket_store_id",
          setting_value: { value: shopRocketId } as any,
          description: "ShopRocket Store ID for e-commerce embed",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      );
    if (error) {
      toast.error("Failed to save ShopRocket ID");
    } else {
      setShopRocketSaved(true);
      toast.success("ShopRocket Store ID saved!");
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied!");
  };

  const update = (key: string, val: any) => setSettings((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Site Settings</h1>

      {/* ShopRocket Integration Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            ShopRocket Integration
            {shopRocketSaved && shopRocketId && (
              <Badge variant="secondary" className="ml-auto gap-1 text-xs">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> Connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Connect your ShopRocket store to automatically sync products, manage orders, and
            accept payments directly on your website.
          </p>

          <div>
            <Label>Store ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. abc123-def456-ghi789"
                value={shopRocketId}
                onChange={(e) => {
                  setShopRocketId(e.target.value);
                  setShopRocketSaved(false);
                }}
              />
              <Button size="sm" onClick={saveShopRocketId} disabled={!shopRocketId}>
                Save
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Find this in your ShopRocket Dashboard → Settings → Store ID
            </p>
          </div>

          <div>
            <Label>Webhook URL (for order sync)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="text-xs font-mono bg-muted" />
              <Button size="sm" variant="outline" onClick={copyWebhookUrl}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Paste this URL in ShopRocket Dashboard → Settings → Webhooks → Add Webhook
            </p>
          </div>

          <div className="rounded-md bg-muted/60 p-3 space-y-2">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Setup Steps
            </p>
            <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
              <li>
                Sign up at{" "}
                <a
                  href="https://shoprocket.io"
                  target="_blank"
                  rel="noopener"
                  className="text-primary underline inline-flex items-center gap-0.5"
                >
                  shoprocket.io <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </li>
              <li>Add your products in ShopRocket dashboard</li>
              <li>Copy your Store ID and paste it above</li>
              <li>Copy the Webhook URL above and add it in ShopRocket webhooks</li>
              <li>Orders will sync automatically to your Orders panel</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* General */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Store Name</Label>
            <Input value={settings.storeName} onChange={(e) => update("storeName", e.target.value)} />
          </div>
          <div>
            <Label>Tax Rate (%)</Label>
            <Input type="number" value={settings.taxRate} onChange={(e) => update("taxRate", +e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" /> Shipping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Delivery Fee (₹)</Label>
              <Input type="number" value={settings.deliveryFee} onChange={(e) => update("deliveryFee", +e.target.value)} />
            </div>
            <div>
              <Label>Free Delivery Above (₹)</Label>
              <Input
                type="number"
                value={settings.freeDeliveryAbove}
                onChange={(e) => update("freeDeliveryAbove", +e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Cash on Delivery</Label>
            <Switch checked={settings.codEnabled} onCheckedChange={(v) => update("codEnabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Online Payments</Label>
            <Switch
              checked={settings.onlinePaymentEnabled}
              onCheckedChange={(v) => update("onlinePaymentEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Order Notifications</Label>
            <Switch checked={settings.orderNotifications} onCheckedChange={(v) => update("orderNotifications", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Low Stock Alerts</Label>
            <Switch checked={settings.lowStockAlert} onCheckedChange={(v) => update("lowStockAlert", v)} />
          </div>
          {settings.lowStockAlert && (
            <div>
              <Label>Low Stock Threshold</Label>
              <Input
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) => update("lowStockThreshold", +e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={() => toast.success("Settings saved")} className="w-full">
        Save Settings
      </Button>
    </div>
  );
}
