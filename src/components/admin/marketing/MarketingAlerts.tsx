import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, Plus, Edit, Trash2, CheckCircle, AlertCircle, 
  Flame, Target, TrendingUp, Zap, Settings, Volume2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MarketingAlert {
  id: string;
  name: string;
  alert_type: string;
  conditions: any;
  notification_channels: string[];
  is_active: boolean;
  created_at: string;
}

const ALERT_TYPES = [
  { value: "hot_lead", label: "Hot Lead Detected", icon: Flame, color: "text-red-500", description: "When a lead reaches hot status" },
  { value: "high_intent", label: "High Intent Action", icon: Target, color: "text-orange-500", description: "When lead shows buying signals" },
  { value: "conversion", label: "Conversion", icon: CheckCircle, color: "text-green-500", description: "When a lead converts" },
  { value: "campaign_goal", label: "Campaign Goal Met", icon: TrendingUp, color: "text-purple-500", description: "When campaign reaches target" },
  { value: "custom", label: "Custom Trigger", icon: Zap, color: "text-blue-500", description: "Custom condition triggers" },
];

const NOTIFICATION_CHANNELS = [
  { value: "dashboard", label: "Dashboard", icon: Bell },
  { value: "email", label: "Email", icon: Bell },
  { value: "whatsapp", label: "WhatsApp", icon: Bell },
  { value: "sms", label: "SMS", icon: Bell },
];

export function MarketingAlerts() {
  const [alerts, setAlerts] = useState<MarketingAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingAlert, setEditingAlert] = useState<MarketingAlert | null>(null);
  const [newAlert, setNewAlert] = useState({
    name: "",
    alert_type: "hot_lead",
    conditions: {},
    notification_channels: ["dashboard"],
  });
  const { toast } = useToast();

  // Simulated recent alert triggers
  const [recentTriggers, setRecentTriggers] = useState([
    { id: 1, type: "hot_lead", message: "Lead Rahul Sharma reached Hot status", time: "2 min ago" },
    { id: 2, type: "high_intent", message: "3 leads viewed pricing page today", time: "15 min ago" },
    { id: 3, type: "conversion", message: "Priya Patel converted - Maruti Swift VXi", time: "1 hour ago" },
  ]);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("marketing_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts((data || []).map(a => ({
        ...a,
        notification_channels: a.notification_channels as string[]
      })));
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!newAlert.name) {
      toast({ title: "Error", description: "Alert name is required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("marketing_alerts")
        .insert([{
          name: newAlert.name,
          alert_type: newAlert.alert_type,
          conditions: newAlert.conditions,
          notification_channels: newAlert.notification_channels,
          is_active: true,
        }]);

      if (error) throw error;

      toast({ title: "Alert created", description: "You'll be notified when conditions are met" });
      setIsCreating(false);
      setNewAlert({ name: "", alert_type: "hot_lead", conditions: {}, notification_channels: ["dashboard"] });
      fetchAlerts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (alert: MarketingAlert) => {
    try {
      const { error } = await supabase
        .from("marketing_alerts")
        .update({ is_active: !alert.is_active })
        .eq("id", alert.id);

      if (error) throw error;
      fetchAlerts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!confirm("Delete this alert?")) return;

    try {
      const { error } = await supabase
        .from("marketing_alerts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Alert deleted" });
      fetchAlerts();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getAlertTypeInfo = (type: string) => {
    return ALERT_TYPES.find(t => t.value === type) || ALERT_TYPES[4];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            Real-Time Alerts
          </h2>
          <p className="text-sm text-muted-foreground">
            Get notified when leads take high-intent actions
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Alert
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Triggers */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary" />
              Recent Triggers
            </CardTitle>
            <CardDescription>Latest alert activations</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {recentTriggers.map((trigger, index) => {
                  const typeInfo = getAlertTypeInfo(trigger.type);
                  const TypeIcon = typeInfo.icon;
                  return (
                    <motion.div
                      key={trigger.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg bg-background", typeInfo.color)}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{trigger.message}</p>
                          <p className="text-xs text-muted-foreground">{trigger.time}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Configured Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Configured Alerts</CardTitle>
            <CardDescription>{alerts.length} alerts set up</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        No alerts configured. Create your first alert.
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => {
                      const typeInfo = getAlertTypeInfo(alert.alert_type);
                      const TypeIcon = typeInfo.icon;
                      return (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className={cn("h-4 w-4", typeInfo.color)} />
                              <span className="font-medium">{alert.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{typeInfo.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {alert.notification_channels.slice(0, 2).map((ch) => (
                                <Badge key={ch} variant="secondary" className="text-xs">
                                  {ch}
                                </Badge>
                              ))}
                              {alert.notification_channels.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{alert.notification_channels.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={alert.is_active}
                              onCheckedChange={() => handleToggleActive(alert)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDeleteAlert(alert.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Alert Types Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alert Types</CardTitle>
          <CardDescription>Different triggers you can set up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            {ALERT_TYPES.map((type) => (
              <div 
                key={type.value}
                className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <type.icon className={cn("h-6 w-6 mb-2", type.color)} />
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Alert Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Alert</DialogTitle>
            <DialogDescription>Get notified when specific conditions are met</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Alert Name</Label>
              <Input
                placeholder="e.g., High-Value Lead Alert"
                value={newAlert.name}
                onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Alert Type</Label>
              <Select 
                value={newAlert.alert_type}
                onValueChange={(v) => setNewAlert({ ...newAlert, alert_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <type.icon className={cn("h-4 w-4", type.color)} />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notification Channels</Label>
              <div className="flex flex-wrap gap-2">
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <Button
                    key={channel.value}
                    variant={newAlert.notification_channels.includes(channel.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const channels = newAlert.notification_channels.includes(channel.value)
                        ? newAlert.notification_channels.filter(c => c !== channel.value)
                        : [...newAlert.notification_channels, channel.value];
                      setNewAlert({ ...newAlert, notification_channels: channels });
                    }}
                  >
                    {channel.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateAlert}>
              <Bell className="h-4 w-4 mr-2" />
              Create Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
