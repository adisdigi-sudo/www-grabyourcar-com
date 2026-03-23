import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Truck, CreditCard, Bell } from "lucide-react";

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

  const update = (key: string, val: any) => setSettings((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Site Settings</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> General</CardTitle>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Delivery Fee (₹)</Label>
              <Input type="number" value={settings.deliveryFee} onChange={(e) => update("deliveryFee", +e.target.value)} />
            </div>
            <div>
              <Label>Free Delivery Above (₹)</Label>
              <Input type="number" value={settings.freeDeliveryAbove} onChange={(e) => update("freeDeliveryAbove", +e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Cash on Delivery</Label>
            <Switch checked={settings.codEnabled} onCheckedChange={(v) => update("codEnabled", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Online Payments</Label>
            <Switch checked={settings.onlinePaymentEnabled} onCheckedChange={(v) => update("onlinePaymentEnabled", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle>
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
              <Input type="number" value={settings.lowStockThreshold} onChange={(e) => update("lowStockThreshold", +e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={() => toast.success("Settings saved")} className="w-full">Save Settings</Button>
    </div>
  );
}
