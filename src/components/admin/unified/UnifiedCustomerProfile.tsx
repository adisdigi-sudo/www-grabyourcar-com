import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Users, Search, Plus, Phone, Mail, MapPin, Car, Shield, CreditCard,
  CalendarDays, Package, Globe, Sparkles, History, ArrowRight
} from "lucide-react";

const verticalBadges = [
  { key: "has_car_inquiry", label: "Car Sales", icon: Car, color: "bg-blue-100 text-blue-800" },
  { key: "has_insurance", label: "Insurance", icon: Shield, color: "bg-green-100 text-green-800" },
  { key: "has_loan_inquiry", label: "Loans", icon: CreditCard, color: "bg-purple-100 text-purple-800" },
  { key: "has_booking", label: "Rental/Booking", icon: CalendarDays, color: "bg-amber-100 text-amber-800" },
  { key: "has_accessory_order", label: "Accessories", icon: Package, color: "bg-pink-100 text-pink-800" },
];

export const UnifiedCustomerProfile = () => {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ customer_name: "", phone: "", email: "", city: "" });
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["unified-customers", search],
    queryFn: async () => {
      let query = supabase.from("unified_customers").select("*").order("updated_at", { ascending: false }).limit(50);
      if (search.trim()) {
        query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: verticalRecords } = useQuery({
    queryKey: ["customer-vertical-records", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from("customer_vertical_records")
        .select("*")
        .eq("customer_id", selectedCustomer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer,
  });

  const { data: crossSellOps } = useQuery({
    queryKey: ["cross-sell-ops", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from("cross_sell_opportunities")
        .select("*")
        .eq("customer_id", selectedCustomer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer,
  });

  const addCustomerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("unified_customers").insert({
        customer_name: newCustomer.customer_name,
        phone: newCustomer.phone,
        email: newCustomer.email || null,
        city: newCustomer.city || null,
        first_source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer added");
      queryClient.invalidateQueries({ queryKey: ["unified-customers"] });
      setShowAddDialog(false);
      setNewCustomer({ customer_name: "", phone: "", email: "", city: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Unified Customer Profiles
          </h1>
          <p className="text-muted-foreground mt-1">One customer, all verticals — 360° view</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Unified Customer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={newCustomer.customer_name} onChange={e => setNewCustomer(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div><Label>Phone *</Label><Input value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>City</Label><Input value={newCustomer.city} onChange={e => setNewCustomer(p => ({ ...p, city: e.target.value }))} /></div>
              <Button onClick={() => addCustomerMutation.mutate()} disabled={!newCustomer.customer_name || !newCustomer.phone} className="w-full">
                Create Customer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, phone, email..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground p-4">Loading...</p>
              ) : customers?.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">No customers found</p>
              ) : customers?.map((c: any) => (
                <Card
                  key={c.id}
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedCustomer?.id === c.id ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => setSelectedCustomer(c)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.customer_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</p>
                        {c.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}</p>}
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                        {verticalBadges.filter(v => c[v.key]).map(v => (
                          <Badge key={v.key} variant="secondary" className={`text-[9px] px-1 py-0 ${v.color}`}>{v.label}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Customer Detail */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="verticals">Verticals ({verticalRecords?.length || 0})</TabsTrigger>
                <TabsTrigger value="crosssell">Cross-Sell ({crossSellOps?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Customer Profile</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm"><span className="text-muted-foreground">Name:</span> <strong>{selectedCustomer.customer_name || "—"}</strong></p>
                          <p className="text-sm flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{selectedCustomer.phone}</p>
                          {selectedCustomer.email && <p className="text-sm flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{selectedCustomer.email}</p>}
                          {selectedCustomer.city && <p className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{selectedCustomer.city}{selectedCustomer.state ? `, ${selectedCustomer.state}` : ""}</p>}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm"><span className="text-muted-foreground">Lifetime Value:</span> <strong>₹{Number(selectedCustomer.lifetime_value || 0).toLocaleString("en-IN")}</strong></p>
                          <p className="text-sm"><span className="text-muted-foreground">Interactions:</span> <strong>{selectedCustomer.total_interactions || 0}</strong></p>
                          <p className="text-sm"><span className="text-muted-foreground">Engagement:</span> <strong>{selectedCustomer.engagement_score || 0}/100</strong></p>
                          <p className="text-sm"><span className="text-muted-foreground">Since:</span> <strong>{new Date(selectedCustomer.created_at).toLocaleDateString("en-IN")}</strong></p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-lg">Active Verticals</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {verticalBadges.map(v => {
                          const active = selectedCustomer[v.key];
                          return (
                            <Badge key={v.key} variant={active ? "default" : "outline"} className={`px-3 py-1.5 ${active ? v.color : "opacity-40"}`}>
                              <v.icon className="h-3.5 w-3.5 mr-1.5" />
                              {v.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="verticals">
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><History className="h-5 w-5" /> Service History</CardTitle></CardHeader>
                  <CardContent>
                    {verticalRecords?.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No service records yet</p>
                    ) : (
                      <div className="space-y-3">
                        {verticalRecords?.map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-sm capitalize">{r.vertical_slug} — {r.record_type}</p>
                              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{r.status}</Badge>
                              {r.value > 0 && <span className="text-sm font-medium">₹{Number(r.value).toLocaleString("en-IN")}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="crosssell">
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5" /> Cross-Sell Opportunities</CardTitle></CardHeader>
                  <CardContent>
                    {crossSellOps?.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">No cross-sell opportunities detected</p>
                    ) : (
                      <div className="space-y-3">
                        {crossSellOps?.map((op: any) => (
                          <div key={op.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="capitalize">{op.source_vertical}</Badge>
                                <ArrowRight className="h-3 w-3" />
                                <Badge className="capitalize">{op.target_vertical}</Badge>
                              </div>
                              <Badge variant={op.priority === "high" ? "destructive" : "outline"}>{op.priority}</Badge>
                            </div>
                            <p className="text-sm">{op.suggested_action || op.opportunity_type}</p>
                            {op.estimated_value && <p className="text-xs text-muted-foreground mt-1">Est. value: ₹{Number(op.estimated_value).toLocaleString("en-IN")}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center">
                <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg">Select a Customer</h3>
                <p className="text-sm text-muted-foreground mt-1">Click a customer from the list to view their 360° profile</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
