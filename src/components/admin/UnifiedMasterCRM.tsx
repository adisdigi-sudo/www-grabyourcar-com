import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";
import {
  Users, Search, Phone, Mail, MapPin, Car, Shield, Banknote, ShoppingBag,
  Zap, Loader2, RefreshCw, Eye, MessageSquare, TrendingUp, Clock,
  CheckCircle2, Tag, Activity, ArrowRight, Sparkles, Calendar
} from "lucide-react";

interface UnifiedCustomer {
  id: string;
  phone: string;
  customer_name: string | null;
  email: string | null;
  city: string | null;
  engagement_score: number;
  lifetime_value: number;
  total_interactions: number;
  has_car_inquiry: boolean;
  has_loan_inquiry: boolean;
  has_insurance: boolean;
  has_accessory_order: boolean;
  has_booking: boolean;
  last_activity_type: string | null;
  last_activity_at: string | null;
  tags: string[];
  first_source: string | null;
  latest_source: string | null;
  assigned_advisor: string | null;
  created_at: string;
}

export function UnifiedMasterCRM() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<UnifiedCustomer | null>(null);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["unified-customers", search],
    queryFn: async () => {
      let q = (supabase
        .from("unified_customers")
        .select("*") as any)
        .order("last_activity_at", { ascending: false })
        .limit(200);

      if (search) {
        q = q.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as UnifiedCustomer[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["unified-crm-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("unified_customers").select("*", { count: "exact", head: true });
      const { count: withCar } = await (supabase.from("unified_customers").select("*", { count: "exact", head: true }) as any).eq("has_car_inquiry", true);
      const { count: withInsurance } = await (supabase.from("unified_customers").select("*", { count: "exact", head: true }) as any).eq("has_insurance", true);
      const { count: withLoan } = await (supabase.from("unified_customers").select("*", { count: "exact", head: true }) as any).eq("has_loan_inquiry", true);

      return {
        total: total || 0,
        withCar: withCar || 0,
        withInsurance: withInsurance || 0,
        withLoan: withLoan || 0,
        multiVertical: 0,
      };
    },
  });

  const runSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-journey-engine", {
        body: { action: "all" },
      });
      if (error) throw error;
      toast.success(`Sync complete: ${data.synced} new customers, ${data.triggers_created} triggers created`);
      queryClient.invalidateQueries({ queryKey: ["unified-customers"] });
      queryClient.invalidateQueries({ queryKey: ["unified-crm-stats"] });
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const getVerticalBadges = (c: UnifiedCustomer) => {
    const badges = [];
    if (c.has_car_inquiry) badges.push({ label: "Cars", icon: Car, color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" });
    if (c.has_insurance) badges.push({ label: "Insurance", icon: Shield, color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" });
    if (c.has_loan_inquiry) badges.push({ label: "Loans", icon: Banknote, color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" });
    if (c.has_accessory_order) badges.push({ label: "Accessories", icon: ShoppingBag, color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" });
    if (c.has_booking) badges.push({ label: "Bookings", icon: Calendar, color: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300" });
    return badges;
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Customers", value: stats?.total || 0, icon: Users, color: "text-primary" },
          { label: "Car Inquiries", value: stats?.withCar || 0, icon: Car, color: "text-blue-600" },
          { label: "Insurance", value: stats?.withInsurance || 0, icon: Shield, color: "text-green-600" },
          { label: "Loan Leads", value: stats?.withLoan || 0, icon: Banknote, color: "text-purple-600" },
          { label: "Multi-Vertical", value: stats?.multiVertical || 0, icon: Sparkles, color: "text-orange-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Sync */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={runSync} disabled={syncing} variant="outline" className="gap-1.5">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync All Verticals
        </Button>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Unified Customer Database
          </CardTitle>
          <CardDescription>{customers?.length || 0} customers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-2">
              {customers?.map(c => {
                const badges = getVerticalBadges(c);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {(c.customer_name || c.phone)?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.customer_name || c.phone}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Phone className="h-3 w-3" /> {c.phone}
                          {c.city && <><MapPin className="h-3 w-3 ml-1" /> {c.city}</>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {badges.map(b => (
                            <Badge key={b.label} className={`${b.color} border-0 text-[9px] gap-0.5 px-1.5 py-0`}>
                              <b.icon className="h-2.5 w-2.5" /> {b.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-[10px] text-muted-foreground">
                        {c.last_activity_type?.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString("en-IN") : "—"}
                      </p>
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <Badge variant="outline" className="text-[9px]">
                          <Activity className="h-2.5 w-2.5 mr-0.5" /> {c.total_interactions}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!customers || customers.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No customers found. Click "Sync All Verticals" to populate.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      {selectedCustomer && (
        <CustomerDetailDialog
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}

function CustomerDetailDialog({ customer, onClose }: { customer: UnifiedCustomer; onClose: () => void }) {
  const { data: timeline } = useQuery({
    queryKey: ["unified-timeline", customer.id],
    queryFn: async () => {
      const { data } = await (supabase
        .from("unified_activity_timeline")
        .select("*") as any)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: journeyTriggers } = useQuery({
    queryKey: ["journey-triggers", customer.id],
    queryFn: async () => {
      const { data } = await (supabase
        .from("customer_journey_triggers")
        .select("*") as any)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const sendWhatsApp = () => {
    triggerWhatsApp({
      event: "unified_crm_outreach",
      phone: customer.phone,
      name: customer.customer_name || "Customer",
    });
    toast.success("WhatsApp message triggered");
  };

  const VERTICAL_COLORS: Record<string, string> = {
    car_sales: "bg-blue-100 text-blue-700",
    insurance: "bg-green-100 text-green-700",
    loans: "bg-purple-100 text-purple-700",
    accessories: "bg-orange-100 text-orange-700",
    booking: "bg-pink-100 text-pink-700",
    general: "bg-muted text-muted-foreground",
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="font-bold text-primary">
                {(customer.customer_name || customer.phone)?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p>{customer.customer_name || "Unknown"}</p>
              <p className="text-xs font-normal text-muted-foreground flex items-center gap-2">
                <Phone className="h-3 w-3" /> {customer.phone}
                {customer.email && <><Mail className="h-3 w-3 ml-1" /> {customer.email}</>}
                {customer.city && <><MapPin className="h-3 w-3 ml-1" /> {customer.city}</>}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid grid-cols-3 h-9">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
            <TabsTrigger value="intelligence" className="text-xs">Intelligence</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-4 p-1">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <Card><CardContent className="pt-3 pb-3 text-center">
                    <p className="text-lg font-bold text-primary">{customer.total_interactions}</p>
                    <p className="text-[10px] text-muted-foreground">Interactions</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-3 pb-3 text-center">
                    <p className="text-lg font-bold text-primary">₹{(customer.lifetime_value || 0).toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-muted-foreground">Lifetime Value</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-3 pb-3 text-center">
                    <p className="text-lg font-bold text-primary">{customer.engagement_score}</p>
                    <p className="text-[10px] text-muted-foreground">Engagement</p>
                  </CardContent></Card>
                </div>

                {/* Verticals */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Services Used</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { active: customer.has_car_inquiry, label: "Car Sales", icon: Car },
                      { active: customer.has_insurance, label: "Insurance", icon: Shield },
                      { active: customer.has_loan_inquiry, label: "Car Loans", icon: Banknote },
                      { active: customer.has_accessory_order, label: "Accessories", icon: ShoppingBag },
                      { active: customer.has_booking, label: "Bookings", icon: Calendar },
                    ].map(v => (
                      <div key={v.label} className={`flex items-center gap-2 p-2 rounded-lg ${v.active ? "bg-primary/5" : "bg-muted/30 opacity-50"}`}>
                        <v.icon className={`h-4 w-4 ${v.active ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-sm">{v.label}</span>
                        {v.active ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground ml-auto">Not yet</span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Tags */}
                {customer.tags && customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" /> {t}</Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={sendWhatsApp} className="flex-1 gap-1.5" size="sm">
                    <MessageSquare className="h-4 w-4" /> WhatsApp
                  </Button>
                  <Button variant="outline" className="flex-1 gap-1.5" size="sm" onClick={() => {
                    window.open(`tel:${customer.phone}`, "_self");
                  }}>
                    <Phone className="h-4 w-4" /> Call
                  </Button>
                </div>

                <div className="text-[10px] text-muted-foreground space-y-1">
                  <p>First source: {customer.first_source || "—"}</p>
                  <p>Latest source: {customer.latest_source || "—"}</p>
                  <p>Advisor: {customer.assigned_advisor || "Unassigned"}</p>
                  <p>Created: {new Date(customer.created_at).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="timeline">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 p-1">
                {timeline && timeline.length > 0 ? timeline.map((t: any) => (
                  <div key={t.id} className="flex gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={`${VERTICAL_COLORS[t.vertical] || VERTICAL_COLORS.general} border-0 text-[9px]`}>
                          {t.vertical}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(t.created_at).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-0.5">{t.title}</p>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No timeline events yet. Run sync to populate.</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="intelligence">
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2 p-1">
                <p className="text-xs text-muted-foreground mb-2">AI-detected cross-sell opportunities</p>
                {journeyTriggers && journeyTriggers.length > 0 ? journeyTriggers.map((t: any) => (
                  <div key={t.id} className={`p-3 rounded-lg border ${t.status === "converted" ? "bg-green-50 dark:bg-green-950/20 border-green-200" : "bg-muted/30"}`}>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">{t.trigger_type?.replace(/_/g, " → ")}</Badge>
                      <Badge className={`text-[9px] border-0 ${
                        t.status === "converted" ? "bg-green-100 text-green-700" :
                        t.status === "sent" ? "bg-blue-100 text-blue-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{t.status}</Badge>
                    </div>
                    <p className="text-sm mt-1">{t.recommendation}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(t.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No journey triggers yet. Run analysis to detect opportunities.</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
