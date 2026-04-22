import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const ALERT_TYPES = [
  { value: "spend_spike", label: "Ad Spend Spike", help: "Trigger when daily spend > threshold ₹" },
  { value: "low_roi", label: "Low ROI", help: "Trigger when ROI % falls below threshold" },
  { value: "target_miss", label: "Target Miss Risk", help: "Trigger when achievement < target % at month-end" },
  { value: "kpi_threshold", label: "Custom KPI Threshold", help: "Custom metric comparator" },
];

const ROLES = [
  "super_admin",
  "admin",
  "marketing",
  "sales",
  "finance",
  "operations",
];

const SEVERITY = ["low", "medium", "high", "critical"];

export function AlertRulesManager() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["kpi-alert-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_alerts")
        .select("*")
        .in("alert_type", ["spend_spike", "low_roi", "target_miss", "kpi_threshold"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("marketing_alerts")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kpi-alert-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule removed");
      queryClient.invalidateQueries({ queryKey: ["kpi-alert-rules"] });
    },
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Alert Rules
            <Badge variant="outline" className="text-[10px]">{rules.length}</Badge>
          </CardTitle>
          <NewRuleDialog open={open} onOpenChange={setOpen} onSaved={() => queryClient.invalidateQueries({ queryKey: ["kpi-alert-rules"] })} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : rules.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/20">
            <AlertTriangle className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No alert rules configured</p>
            <p className="text-xs text-muted-foreground mb-2">
              Add a rule to auto-detect spend spikes, low ROI, and target misses.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((r: any) => (
              <div
                key={r.id}
                className="border rounded-lg p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <Badge variant="outline" className="text-[9px] py-0">
                      {r.alert_type.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] py-0">
                      {r.severity || "medium"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Threshold: <strong>{r.conditions?.threshold ?? "—"}</strong>
                    {r.conditions?.comparator ? ` (${r.conditions.comparator})` : ""}
                    {r.conditions?.window ? ` · ${r.conditions.window}` : ""}
                  </p>
                  {Array.isArray(r.notify_roles) && r.notify_roles.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">Notifies:</span>
                      {r.notify_roles.map((role: string) => (
                        <Badge key={role} variant="secondary" className="text-[9px] py-0 px-1.5">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: r.id, is_active: v })}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (confirm("Delete this alert rule?")) deleteMutation.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface NewRuleDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

function NewRuleDialog({ open, onOpenChange, onSaved }: NewRuleDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("spend_spike");
  const [severity, setSeverity] = useState("high");
  const [threshold, setThreshold] = useState("");
  const [comparator, setComparator] = useState(">");
  const [window, setWindow] = useState("daily");
  const [vertical, setVertical] = useState<string>("all");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["super_admin", "marketing"]);
  const [channels, setChannels] = useState<string[]>(["dashboard"]);

  const toggleRole = (r: string) =>
    setSelectedRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  const toggleChannel = (c: string) =>
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      if (!threshold) throw new Error("Threshold is required");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("marketing_alerts").insert({
        name,
        alert_type: type,
        severity,
        conditions: {
          threshold: Number(threshold),
          comparator,
          window,
          vertical: vertical === "all" ? null : vertical,
        },
        notification_channels: channels,
        notify_roles: selectedRoles,
        is_active: true,
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert rule created");
      setName("");
      setThreshold("");
      onSaved();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> New Alert Rule
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              placeholder="e.g. Daily Meta Ads spend > 10k"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Alert Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Comparator</Label>
              <Select value={comparator} onValueChange={setComparator}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">{">"}</SelectItem>
                  <SelectItem value="<">{"<"}</SelectItem>
                  <SelectItem value=">=">{">="}</SelectItem>
                  <SelectItem value="<=">{"<="}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Threshold</Label>
              <Input
                type="number"
                placeholder="10000"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Window</Label>
              <Select value={window} onValueChange={setWindow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Notify roles</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ROLES.map((r) => (
                <Badge
                  key={r}
                  variant={selectedRoles.includes(r) ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => toggleRole(r)}
                >
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Notification channels</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {["dashboard", "whatsapp", "email"].map((c) => (
                <Badge
                  key={c}
                  variant={channels.includes(c) ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => toggleChannel(c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name || !threshold}
          >
            {saveMutation.isPending ? "Saving..." : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AlertRulesManager;
