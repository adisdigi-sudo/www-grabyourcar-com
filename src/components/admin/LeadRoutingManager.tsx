import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Route, Globe, MessageSquare, ArrowUpRight, User,
  Plus, Trash2, Settings2, Zap, ArrowRight, RefreshCw
} from "lucide-react";

const SOURCE_TYPES = [
  { value: "website", label: "Website Forms", icon: Globe },
  { value: "whatsapp", label: "WhatsApp Inbound", icon: MessageSquare },
  { value: "google_ads", label: "Google Ads", icon: ArrowUpRight },
  { value: "meta_ads", label: "Meta/Facebook Ads", icon: ArrowUpRight },
  { value: "walk_in", label: "Walk-in / At Desk", icon: User },
  { value: "referral", label: "Referral", icon: User },
];

const VERTICALS = [
  { slug: "sales", label: "Car Sales" },
  { slug: "insurance", label: "Insurance" },
  { slug: "loans", label: "Car Loans" },
  { slug: "rental", label: "Self-Drive Rental" },
  { slug: "hsrp", label: "HSRP" },
  { slug: "accessories", label: "Accessories" },
];

const SERVICE_CATEGORIES = [
  "car_inquiry", "insurance", "finance", "car_loan", "rental", "self_drive",
  "hsrp", "fastag", "accessories", "corporate", "general", "test_drive",
];

export function LeadRoutingManager() {
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["lead-routing-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_routing_rules")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const toggleRule = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("lead_routing_rules")
      .update({ is_active: !isActive })
      .eq("id", id);
    if (error) { toast.error("Failed to toggle rule"); return; }
    toast.success(`Rule ${!isActive ? "activated" : "deactivated"}`);
    queryClient.invalidateQueries({ queryKey: ["lead-routing-rules"] });
  };

  const deleteRule = async (id: string) => {
    const { error } = await supabase.from("lead_routing_rules").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Rule deleted");
    queryClient.invalidateQueries({ queryKey: ["lead-routing-rules"] });
  };

  const groupedRules = SOURCE_TYPES.map(st => ({
    ...st,
    rules: rules.filter(r => r.source_type === st.value),
  }));

  const activeCount = rules.filter(r => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-primary/5 to-background" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg">
              <Route className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lead Routing Engine</h1>
              <p className="text-muted-foreground text-sm">Auto-route incoming leads to the right vertical workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
              <Zap className="h-3 w-3 mr-1" /> {activeCount} Active Rules
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* How It Works */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-6 text-sm overflow-x-auto">
            {[
              { step: "1", label: "Lead Arrives", desc: "Website, WhatsApp, Ads, Walk-in" },
              { step: "→", label: "Auto-Route", desc: "Match source + category" },
              { step: "2", label: "Assign Vertical", desc: "Sales, Insurance, Loans..." },
              { step: "→", label: "Notify Team", desc: "Appears in Smart Calling" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                {s.step === "→" ? (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{s.step}</div>
                    <div>
                      <p className="font-medium">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rules by Source */}
      {groupedRules.map((group) => {
        const GroupIcon = group.icon;
        return (
          <Card key={group.value}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <GroupIcon className="h-4 w-4" /> {group.label}
                  <Badge variant="secondary" className="text-xs">{group.rules.length} rules</Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {group.rules.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3">No routing rules for this source yet.</p>
              ) : (
                <div className="space-y-2">
                  {group.rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-all">
                      <div className="flex items-center gap-3 flex-1">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                        />
                        <div>
                          <p className="text-sm font-medium">{rule.rule_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {rule.service_category && (
                              <Badge variant="outline" className="text-[10px]">{rule.service_category}</Badge>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                              {VERTICALS.find(v => v.slug === rule.target_vertical_slug)?.label || rule.target_vertical_slug}
                            </Badge>
                            {rule.priority_override && (
                              <Badge variant="secondary" className="text-[10px]">Priority: {rule.priority_override}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
