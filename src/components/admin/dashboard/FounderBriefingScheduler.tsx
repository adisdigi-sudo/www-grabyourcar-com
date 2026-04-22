import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, X, Send, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Config = {
  enabled: boolean;
  daily_enabled: boolean;
  weekly_enabled: boolean;
  phones: string[];
};

const DEFAULT: Config = {
  enabled: true,
  daily_enabled: true,
  weekly_enabled: true,
  phones: [],
};

export function FounderBriefingScheduler() {
  const [config, setConfig] = useState<Config>(DEFAULT);
  const [newPhone, setNewPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<"daily" | "weekly" | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "founder_briefing_config")
        .maybeSingle();
      if (data?.setting_value) {
        setConfig({ ...DEFAULT, ...(data.setting_value as any) });
      }
    } catch (e) {
      console.error("[BriefingScheduler] load", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_settings")
        .upsert(
          {
            setting_key: "founder_briefing_config",
            setting_value: config as any,
            description: "Founder daily/weekly WhatsApp briefing config",
          },
          { onConflict: "setting_key" },
        );
      if (error) throw error;
      toast.success("Briefing settings saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addPhone = () => {
    const clean = newPhone.replace(/\D/g, "");
    if (clean.length < 10) {
      toast.error("Enter a valid 10-digit number");
      return;
    }
    if (config.phones.includes(clean)) {
      toast.info("Already added");
      return;
    }
    setConfig({ ...config, phones: [...config.phones, clean] });
    setNewPhone("");
  };

  const removePhone = (p: string) =>
    setConfig({ ...config, phones: config.phones.filter((x) => x !== p) });

  const sendTest = async (mode: "daily" | "weekly") => {
    if (config.phones.length === 0) {
      toast.error("Add a phone first");
      return;
    }
    setTesting(mode);
    try {
      const { data, error } = await supabase.functions.invoke("founder-briefing", {
        body: { mode, testPhone: config.phones[0] },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Test ${mode} briefing sent to ${config.phones[0]}`);
      } else {
        toast.error(data?.error || "Send failed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Send failed");
    } finally {
      setTesting(null);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
            <Bell className="h-4 w-4" />
          </div>
          Auto Briefings
          <Badge variant="outline" className="text-[10px]">
            WhatsApp
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Master enable</Label>
                  <p className="text-xs text-muted-foreground">Master switch for all briefings</p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Daily briefing</Label>
                  <p className="text-xs text-muted-foreground">Yesterday's wins, risks, MTD targets</p>
                </div>
                <Switch
                  checked={config.daily_enabled}
                  onCheckedChange={(v) => setConfig({ ...config, daily_enabled: v })}
                  disabled={!config.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Weekly briefing</Label>
                  <p className="text-xs text-muted-foreground">Last 7 days roll-up</p>
                </div>
                <Switch
                  checked={config.weekly_enabled}
                  onCheckedChange={(v) => setConfig({ ...config, weekly_enabled: v })}
                  disabled={!config.enabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Recipient WhatsApp numbers</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="10-digit phone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPhone()}
                />
                <Button onClick={addPhone} variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {config.phones.length === 0 ? (
                <p className="text-xs text-muted-foreground">Koi recipient nahi.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {config.phones.map((p) => (
                    <Badge key={p} variant="secondary" className="gap-1 pl-2 pr-1">
                      {p}
                      <button
                        onClick={() => removePhone(p)}
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button onClick={save} disabled={saving} size="sm">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                onClick={() => sendTest("daily")}
                disabled={testing !== null || config.phones.length === 0}
                variant="outline"
                size="sm"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {testing === "daily" ? "Sending…" : "Test Daily"}
              </Button>
              <Button
                onClick={() => sendTest("weekly")}
                disabled={testing !== null || config.phones.length === 0}
                variant="outline"
                size="sm"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {testing === "weekly" ? "Sending…" : "Test Weekly"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default FounderBriefingScheduler;
