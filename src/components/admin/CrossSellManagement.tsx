import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, Package, Target, BarChart3,
  Gift, Layers, TrendingUp, Eye, MousePointer, ShoppingCart,
  Calendar, Tag, Zap, Settings
} from "lucide-react";
import { format } from "date-fns";

interface CrossSellRule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_value: string | null;
  display_location: string;
  priority: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  conditions: unknown;
  created_at: string;
}

interface CrossSellItem {
  id: string;
  rule_id: string;
  item_type: string;
  item_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_text: string;
  cta_link: string | null;
  discount_text: string | null;
  original_price: number | null;
  offer_price: number | null;
  sort_order: number;
  is_active: boolean;
}

interface CrossSellBundle {
  id: string;
  name: string;
  description: string | null;
  bundle_type: string;
  total_value: number | null;
  bundle_price: number | null;
  savings_text: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  applicable_brands: string[] | null;
  applicable_segments: string[] | null;
  created_at: string;
}

interface AnalyticsSummary {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
}

const triggerTypes = [
  { value: "car_view", label: "Car Detail View" },
  { value: "lead_submit", label: "Lead Form Submission" },
  { value: "cart_add", label: "Add to Cart" },
  { value: "checkout", label: "Checkout Page" },
  { value: "page_visit", label: "Page Visit" },
];

const displayLocations = [
  { value: "sidebar", label: "Sidebar Widget" },
  { value: "modal", label: "Popup Modal" },
  { value: "inline", label: "Inline Section" },
  { value: "footer", label: "Footer Area" },
  { value: "popup", label: "Exit Intent Popup" },
];

const itemTypes = [
  { value: "accessory", label: "Accessory" },
  { value: "insurance", label: "Insurance" },
  { value: "loan", label: "Car Loan" },
  { value: "hsrp", label: "HSRP Service" },
  { value: "service", label: "Service Package" },
  { value: "car", label: "Related Car" },
  { value: "custom", label: "Custom Offer" },
];

const bundleTypes = [
  { value: "starter", label: "Starter Pack" },
  { value: "premium", label: "Premium Bundle" },
  { value: "complete", label: "Complete Package" },
  { value: "custom", label: "Custom Bundle" },
];

export default function CrossSellManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("rules");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CrossSellRule | null>(null);
  const [editingBundle, setEditingBundle] = useState<CrossSellBundle | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  // Form states
  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    trigger_type: "car_view",
    trigger_value: "",
    display_location: "sidebar",
    priority: 0,
    is_active: true,
  });

  const [itemForm, setItemForm] = useState({
    item_type: "accessory",
    title: "",
    description: "",
    image_url: "",
    cta_text: "Learn More",
    cta_link: "",
    discount_text: "",
    original_price: "",
    offer_price: "",
  });

  const [bundleForm, setBundleForm] = useState({
    name: "",
    description: "",
    bundle_type: "starter",
    total_value: "",
    bundle_price: "",
    savings_text: "",
    image_url: "",
    is_featured: false,
    applicable_brands: "",
    applicable_segments: "",
  });

  // Fetch rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["cross-sell-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cross_sell_rules")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as CrossSellRule[];
    },
  });

  // Fetch items for selected rule
  const { data: items = [] } = useQuery({
    queryKey: ["cross-sell-items", selectedRuleId],
    queryFn: async () => {
      if (!selectedRuleId) return [];
      const { data, error } = await supabase
        .from("cross_sell_items")
        .select("*")
        .eq("rule_id", selectedRuleId)
        .order("sort_order");
      if (error) throw error;
      return data as CrossSellItem[];
    },
    enabled: !!selectedRuleId,
  });

  // Fetch bundles
  const { data: bundles = [], isLoading: bundlesLoading } = useQuery({
    queryKey: ["cross-sell-bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cross_sell_bundles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrossSellBundle[];
    },
  });

  // Fetch analytics summary
  const { data: analytics } = useQuery({
    queryKey: ["cross-sell-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cross_sell_analytics")
        .select("event_type")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      const impressions = data.filter(e => e.event_type === "impression").length;
      const clicks = data.filter(e => e.event_type === "click").length;
      const conversions = data.filter(e => e.event_type === "conversion").length;
      
      return {
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      } as AnalyticsSummary;
    },
  });

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof ruleForm) => {
      const { error } = await supabase.from("cross_sell_rules").insert({
        name: data.name,
        description: data.description || null,
        trigger_type: data.trigger_type,
        trigger_value: data.trigger_value || null,
        display_location: data.display_location,
        priority: data.priority,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cross-sell-rules"] });
      setRuleDialogOpen(false);
      resetRuleForm();
      toast.success("Cross-sell rule created");
    },
    onError: () => toast.error("Failed to create rule"),
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string | null; trigger_type?: string; trigger_value?: string | null; display_location?: string; priority?: number; is_active?: boolean } }) => {
      const { error } = await supabase.from("cross_sell_rules").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cross-sell-rules"] });
      setRuleDialogOpen(false);
      setEditingRule(null);
      resetRuleForm();
      toast.success("Rule updated");
    },
    onError: () => toast.error("Failed to update rule"),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cross_sell_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cross-sell-rules"] });
      toast.success("Rule deleted");
    },
    onError: () => toast.error("Failed to delete rule"),
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: typeof itemForm & { rule_id: string }) => {
      const { error } = await supabase.from("cross_sell_items").insert({
        rule_id: data.rule_id,
        item_type: data.item_type,
        title: data.title,
        description: data.description || null,
        image_url: data.image_url || null,
        cta_text: data.cta_text,
        cta_link: data.cta_link || null,
        discount_text: data.discount_text || null,
        original_price: data.original_price ? parseFloat(data.original_price) : null,
        offer_price: data.offer_price ? parseFloat(data.offer_price) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cross-sell-items"] });
      setItemDialogOpen(false);
      resetItemForm();
      toast.success("Item added to rule");
    },
    onError: () => toast.error("Failed to add item"),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cross_sell_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cross-sell-items"] });
      toast.success("Item removed");
    },
    onError: () => toast.error("Failed to remove item"),
  });

  const createBundleMutation = useMutation({
    mutationFn: async (data: typeof bundleForm) => {
      const { error } = await supabase.from("cross_sell_bundles").insert({
        name: data.name,
        description: data.description || null,
        bundle_type: data.bundle_type,
        total_value: data.total_value ? parseFloat(data.total_value) : null,
        bundle_price: data.bundle_price ? parseFloat(data.bundle_price) : null,
        savings_text: data.savings_text || null,
        image_url: data.image_url || null,
        is_featured: data.is_featured,
        applicable_brands: data.applicable_brands ? data.applicable_brands.split(",").map(s => s.trim()) : null,
        applicable_segments: data.applicable_segments ? data.applicable_segments.split(",").map(s => s.trim()) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cross-sell-bundles"] });
      setBundleDialogOpen(false);
      resetBundleForm();
      toast.success("Bundle created");
    },
    onError: () => toast.error("Failed to create bundle"),
  });

  const updateBundleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CrossSellBundle> }) => {
      const { error } = await supabase.from("cross_sell_bundles").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cross-sell-bundles"] });
      setBundleDialogOpen(false);
      setEditingBundle(null);
      resetBundleForm();
      toast.success("Bundle updated");
    },
    onError: () => toast.error("Failed to update bundle"),
  });

  const deleteBundleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cross_sell_bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cross-sell-bundles"] });
      toast.success("Bundle deleted");
    },
    onError: () => toast.error("Failed to delete bundle"),
  });

  // Helper functions
  const resetRuleForm = () => {
    setRuleForm({
      name: "",
      description: "",
      trigger_type: "car_view",
      trigger_value: "",
      display_location: "sidebar",
      priority: 0,
      is_active: true,
    });
  };

  const resetItemForm = () => {
    setItemForm({
      item_type: "accessory",
      title: "",
      description: "",
      image_url: "",
      cta_text: "Learn More",
      cta_link: "",
      discount_text: "",
      original_price: "",
      offer_price: "",
    });
  };

  const resetBundleForm = () => {
    setBundleForm({
      name: "",
      description: "",
      bundle_type: "starter",
      total_value: "",
      bundle_price: "",
      savings_text: "",
      image_url: "",
      is_featured: false,
      applicable_brands: "",
      applicable_segments: "",
    });
  };

  const openEditRule = (rule: CrossSellRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description || "",
      trigger_type: rule.trigger_type,
      trigger_value: rule.trigger_value || "",
      display_location: rule.display_location,
      priority: rule.priority,
      is_active: rule.is_active,
    });
    setRuleDialogOpen(true);
  };

  const openEditBundle = (bundle: CrossSellBundle) => {
    setEditingBundle(bundle);
    setBundleForm({
      name: bundle.name,
      description: bundle.description || "",
      bundle_type: bundle.bundle_type,
      total_value: bundle.total_value?.toString() || "",
      bundle_price: bundle.bundle_price?.toString() || "",
      savings_text: bundle.savings_text || "",
      image_url: bundle.image_url || "",
      is_featured: bundle.is_featured,
      applicable_brands: bundle.applicable_brands?.join(", ") || "",
      applicable_segments: bundle.applicable_segments?.join(", ") || "",
    });
    setBundleDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (editingRule) {
      updateRuleMutation.mutate({
        id: editingRule.id,
        data: {
          name: ruleForm.name,
          description: ruleForm.description || null,
          trigger_type: ruleForm.trigger_type,
          trigger_value: ruleForm.trigger_value || null,
          display_location: ruleForm.display_location,
          priority: ruleForm.priority,
          is_active: ruleForm.is_active,
        },
      });
    } else {
      createRuleMutation.mutate(ruleForm);
    }
  };

  const handleSaveBundle = () => {
    if (editingBundle) {
      updateBundleMutation.mutate({
        id: editingBundle.id,
        data: {
          name: bundleForm.name,
          description: bundleForm.description || null,
          bundle_type: bundleForm.bundle_type,
          total_value: bundleForm.total_value ? parseFloat(bundleForm.total_value) : null,
          bundle_price: bundleForm.bundle_price ? parseFloat(bundleForm.bundle_price) : null,
          savings_text: bundleForm.savings_text || null,
          image_url: bundleForm.image_url || null,
          is_featured: bundleForm.is_featured,
          applicable_brands: bundleForm.applicable_brands ? bundleForm.applicable_brands.split(",").map(s => s.trim()) : null,
          applicable_segments: bundleForm.applicable_segments ? bundleForm.applicable_segments.split(",").map(s => s.trim()) : null,
        },
      });
    } else {
      createBundleMutation.mutate(bundleForm);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Cross-Sell Management
          </h2>
          <p className="text-muted-foreground">
            Configure product recommendations, bundles, and upsell strategies
          </p>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Impressions</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.impressions || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Clicks</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.clicks || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Conversions</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.conversions || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">CTR</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.ctr.toFixed(1) || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Conv. Rate</span>
            </div>
            <p className="text-2xl font-bold">{analytics?.conversionRate.toFixed(1) || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Rules & Triggers
          </TabsTrigger>
          <TabsTrigger value="bundles" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Bundles
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Cross-Sell Rules</h3>
            <Dialog open={ruleDialogOpen} onOpenChange={(open) => {
              setRuleDialogOpen(open);
              if (!open) {
                setEditingRule(null);
                resetRuleForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRule ? "Edit Rule" : "Create Cross-Sell Rule"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Rule Name</Label>
                    <Input
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                      placeholder="e.g., Car Detail Page Accessories"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={ruleForm.description}
                      onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                      placeholder="Brief description of this rule..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Trigger Type</Label>
                      <Select
                        value={ruleForm.trigger_type}
                        onValueChange={(v) => setRuleForm({ ...ruleForm, trigger_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {triggerTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Display Location</Label>
                      <Select
                        value={ruleForm.display_location}
                        onValueChange={(v) => setRuleForm({ ...ruleForm, display_location: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {displayLocations.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Trigger Value (optional)</Label>
                    <Input
                      value={ruleForm.trigger_value}
                      onChange={(e) => setRuleForm({ ...ruleForm, trigger_value: e.target.value })}
                      placeholder="e.g., maruti-swift, /car-loans"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Specific car slug or page path to trigger this rule
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Priority</Label>
                      <Input
                        type="number"
                        value={ruleForm.priority}
                        onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        checked={ruleForm.is_active}
                        onCheckedChange={(v) => setRuleForm({ ...ruleForm, is_active: v })}
                      />
                      <Label>Active</Label>
                    </div>
                  </div>
                  <Button onClick={handleSaveRule} className="w-full" disabled={!ruleForm.name}>
                    {editingRule ? "Update Rule" : "Create Rule"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {rulesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Rules Created</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first cross-sell rule to start recommending products
                </p>
                <Button onClick={() => setRuleDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary">
                            Trigger: {triggerTypes.find(t => t.value === rule.trigger_type)?.label}
                          </Badge>
                          <Badge variant="secondary">
                            Display: {displayLocations.find(l => l.value === rule.display_location)?.label}
                          </Badge>
                          {rule.trigger_value && (
                            <Badge variant="outline">Value: {rule.trigger_value}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRuleId(rule.id);
                            setItemDialogOpen(true);
                          }}
                        >
                          <Gift className="h-4 w-4 mr-1" />
                          Items ({items.filter(i => i.rule_id === rule.id).length})
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditRule(rule)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Items Dialog */}
          <Dialog open={itemDialogOpen} onOpenChange={(open) => {
            setItemDialogOpen(open);
            if (!open) {
              setSelectedRuleId(null);
              resetItemForm();
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Cross-Sell Items</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Existing items */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    <Label>Current Items</Label>
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <div className="flex gap-2 text-xs">
                            <Badge variant="outline">{itemTypes.find(t => t.value === item.item_type)?.label}</Badge>
                            {item.discount_text && <Badge variant="secondary">{item.discount_text}</Badge>}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new item form */}
                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Add New Item</Label>
                  <div className="grid gap-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Item Type</Label>
                        <Select
                          value={itemForm.item_type}
                          onValueChange={(v) => setItemForm({ ...itemForm, item_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {itemTypes.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={itemForm.title}
                          onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                          placeholder="Item title"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={itemForm.description}
                        onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                        placeholder="Brief description..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CTA Text</Label>
                        <Input
                          value={itemForm.cta_text}
                          onChange={(e) => setItemForm({ ...itemForm, cta_text: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>CTA Link</Label>
                        <Input
                          value={itemForm.cta_link}
                          onChange={(e) => setItemForm({ ...itemForm, cta_link: e.target.value })}
                          placeholder="/accessories"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Original Price (₹)</Label>
                        <Input
                          type="number"
                          value={itemForm.original_price}
                          onChange={(e) => setItemForm({ ...itemForm, original_price: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Offer Price (₹)</Label>
                        <Input
                          type="number"
                          value={itemForm.offer_price}
                          onChange={(e) => setItemForm({ ...itemForm, offer_price: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Discount Text</Label>
                        <Input
                          value={itemForm.discount_text}
                          onChange={(e) => setItemForm({ ...itemForm, discount_text: e.target.value })}
                          placeholder="20% OFF"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Image URL</Label>
                      <Input
                        value={itemForm.image_url}
                        onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (selectedRuleId && itemForm.title) {
                          createItemMutation.mutate({ ...itemForm, rule_id: selectedRuleId });
                        }
                      }}
                      disabled={!itemForm.title}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Bundles Tab */}
        <TabsContent value="bundles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Product Bundles</h3>
            <Dialog open={bundleDialogOpen} onOpenChange={(open) => {
              setBundleDialogOpen(open);
              if (!open) {
                setEditingBundle(null);
                resetBundleForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bundle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingBundle ? "Edit Bundle" : "Create Product Bundle"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Bundle Name</Label>
                    <Input
                      value={bundleForm.name}
                      onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })}
                      placeholder="e.g., New Car Essentials Pack"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={bundleForm.description}
                      onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bundle Type</Label>
                      <Select
                        value={bundleForm.bundle_type}
                        onValueChange={(v) => setBundleForm({ ...bundleForm, bundle_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {bundleTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        checked={bundleForm.is_featured}
                        onCheckedChange={(v) => setBundleForm({ ...bundleForm, is_featured: v })}
                      />
                      <Label>Featured Bundle</Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Total Value (₹)</Label>
                      <Input
                        type="number"
                        value={bundleForm.total_value}
                        onChange={(e) => setBundleForm({ ...bundleForm, total_value: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Bundle Price (₹)</Label>
                      <Input
                        type="number"
                        value={bundleForm.bundle_price}
                        onChange={(e) => setBundleForm({ ...bundleForm, bundle_price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Savings Text</Label>
                      <Input
                        value={bundleForm.savings_text}
                        onChange={(e) => setBundleForm({ ...bundleForm, savings_text: e.target.value })}
                        placeholder="Save ₹5,000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Image URL</Label>
                    <Input
                      value={bundleForm.image_url}
                      onChange={(e) => setBundleForm({ ...bundleForm, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Applicable Brands (comma-separated)</Label>
                    <Input
                      value={bundleForm.applicable_brands}
                      onChange={(e) => setBundleForm({ ...bundleForm, applicable_brands: e.target.value })}
                      placeholder="Maruti, Hyundai, Tata"
                    />
                  </div>
                  <div>
                    <Label>Applicable Segments (comma-separated)</Label>
                    <Input
                      value={bundleForm.applicable_segments}
                      onChange={(e) => setBundleForm({ ...bundleForm, applicable_segments: e.target.value })}
                      placeholder="SUV, Sedan, Hatchback"
                    />
                  </div>
                  <Button onClick={handleSaveBundle} className="w-full" disabled={!bundleForm.name}>
                    {editingBundle ? "Update Bundle" : "Create Bundle"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {bundlesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bundles...</div>
          ) : bundles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">No Bundles Created</h3>
                <p className="text-muted-foreground mb-4">
                  Create product bundles to offer packaged deals
                </p>
                <Button onClick={() => setBundleDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bundle
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {bundles.map((bundle) => (
                <Card key={bundle.id} className={!bundle.is_active ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{bundle.name}</h4>
                          {bundle.is_featured && <Badge>Featured</Badge>}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {bundleTypes.find(t => t.value === bundle.bundle_type)?.label}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditBundle(bundle)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteBundleMutation.mutate(bundle.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {bundle.description && (
                      <p className="text-sm text-muted-foreground mb-3">{bundle.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      {bundle.total_value && (
                        <span className="line-through text-muted-foreground">
                          ₹{bundle.total_value.toLocaleString()}
                        </span>
                      )}
                      {bundle.bundle_price && (
                        <span className="font-bold text-primary">
                          ₹{bundle.bundle_price.toLocaleString()}
                        </span>
                      )}
                      {bundle.savings_text && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {bundle.savings_text}
                        </Badge>
                      )}
                    </div>
                    {(bundle.applicable_brands?.length || bundle.applicable_segments?.length) && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {bundle.applicable_brands?.map((brand) => (
                          <Badge key={brand} variant="outline" className="text-xs">{brand}</Badge>
                        ))}
                        {bundle.applicable_segments?.map((seg) => (
                          <Badge key={seg} variant="outline" className="text-xs">{seg}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cross-Sell Performance (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-primary/10 rounded-lg">
                  <Eye className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-3xl font-bold">{analytics?.impressions || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Impressions</p>
                </div>
                <div className="text-center p-6 bg-accent/20 rounded-lg">
                  <MousePointer className="h-8 w-8 mx-auto mb-2 text-accent-foreground" />
                  <p className="text-3xl font-bold">{analytics?.clicks || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CTR: {analytics?.ctr.toFixed(2)}%
                  </p>
                </div>
                <div className="text-center p-6 bg-secondary rounded-lg">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-secondary-foreground" />
                  <p className="text-3xl font-bold">{analytics?.conversions || 0}</p>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rate: {analytics?.conversionRate.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips to Improve Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Use specific triggers (car_view with specific slugs) for higher relevance</span>
                </li>
                <li className="flex items-start gap-2">
                  <Tag className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Add compelling discount text like "20% OFF" or "Free Installation"</span>
                </li>
                <li className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Set limited-time offers with end dates to create urgency</span>
                </li>
                <li className="flex items-start gap-2">
                  <Package className="h-4 w-4 mt-0.5 text-primary" />
                  <span>Bundle complementary products (HSRP + Insurance + Accessories) for higher value</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
