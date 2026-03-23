import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ShoppingCart, Phone, Clock, IndianRupee, Search, 
  MessageSquare, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  User, Car, TrendingUp, Rocket, Target, CalendarClock
} from "lucide-react";
import { toast } from "sonner";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";
import { formatDistanceToNow } from "date-fns";

export function HSRPAbandonedCarts() {
  const [statusFilter, setStatusFilter] = useState("abandoned");
  const [searchQuery, setSearchQuery] = useState("");
  const [shootingCampaign, setShootingCampaign] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState({ sent: 0, total: 0, active: false });
  const [showRetargetDialog, setShowRetargetDialog] = useState(false);
  const [retargetCart, setRetargetCart] = useState<any>(null);
  const [retargetRemarks, setRetargetRemarks] = useState("");
  const [retargetNextMonth, setRetargetNextMonth] = useState(true);

  const { data: carts, isLoading, refetch } = useQuery({
    queryKey: ["hsrp-abandoned-carts", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("hsrp_abandoned_carts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter === "retarget") {
        query = query.eq("recovery_status", "retarget");
      } else if (statusFilter !== "all") {
        query = query.eq("recovery_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["hsrp-abandoned-cart-stats"],
    queryFn: async () => {
      const [abandoned, recovered, converted, retarget] = await Promise.all([
        supabase.from("hsrp_abandoned_carts").select("*", { count: "exact", head: true }).eq("recovery_status", "abandoned"),
        supabase.from("hsrp_abandoned_carts").select("*", { count: "exact", head: true }).eq("recovery_status", "recovered"),
        supabase.from("hsrp_abandoned_carts").select("*", { count: "exact", head: true }).eq("recovery_status", "converted"),
        supabase.from("hsrp_abandoned_carts").select("*", { count: "exact", head: true }).eq("recovery_status", "retarget"),
      ]);
      const totalAbandoned = abandoned.count || 0;
      const totalConverted = converted.count || 0;
      const totalRecovered = recovered.count || 0;
      const totalRetarget = retarget.count || 0;
      return {
        abandoned: totalAbandoned,
        recovered: totalRecovered,
        converted: totalConverted,
        retarget: totalRetarget,
        total: totalAbandoned + totalRecovered + totalConverted + totalRetarget,
        recoveryRate: totalAbandoned + totalConverted > 0
          ? Math.round((totalConverted / (totalAbandoned + totalConverted)) * 100)
          : 0,
      };
    },
  });

  const sendRecoveryWhatsApp = async (cart: any) => {
    if (!cart.phone) {
      toast.error("No phone number available");
      return;
    }

    triggerWhatsApp({
      event: "hsrp_abandoned_cart",
      phone: cart.phone,
      name: cart.owner_name || "Customer",
      data: {
        service_type: cart.service_type || "HSRP",
        vehicle: cart.registration_number || "",
        amount: String(cart.estimated_total || 0),
      },
    });

    await supabase
      .from("hsrp_abandoned_carts")
      .update({
        recovery_status: "recovered",
        recovery_attempts: (cart.recovery_attempts || 0) + 1,
        last_recovery_at: new Date().toISOString(),
      })
      .eq("id", cart.id);

    toast.success("Recovery message sent!");
    refetch();
  };

  // ── One-Click Bulk Recovery Campaign ──
  const shootRecoveryCampaign = async () => {
    const abandonedCarts = carts?.filter(c => c.recovery_status === "abandoned" && c.phone) || [];
    if (abandonedCarts.length === 0) {
      toast.error("No abandoned carts with phone numbers to recover");
      return;
    }

    setShootingCampaign(true);
    setCampaignProgress({ sent: 0, total: abandonedCarts.length, active: true });

    let sent = 0;
    for (const cart of abandonedCarts) {
      try {
        triggerWhatsApp({
          event: "hsrp_abandoned_cart",
          phone: cart.phone,
          name: cart.owner_name || "Customer",
          data: {
            service_type: cart.service_type || "HSRP",
            vehicle: cart.registration_number || "",
            amount: String(cart.estimated_total || 0),
          },
        });

        await supabase
          .from("hsrp_abandoned_carts")
          .update({
            recovery_status: "recovered",
            recovery_attempts: (cart.recovery_attempts || 0) + 1,
            last_recovery_at: new Date().toISOString(),
          })
          .eq("id", cart.id);

        sent++;
        setCampaignProgress({ sent, total: abandonedCarts.length, active: true });
      } catch (err) {
        console.error("Recovery error for", cart.phone, err);
      }
    }

    setCampaignProgress({ sent, total: abandonedCarts.length, active: false });
    setShootingCampaign(false);
    toast.success(`🚀 Recovery campaign complete! ${sent}/${abandonedCarts.length} messages sent`);
    refetch();
  };

  // ── Mark as Retarget ──
  const handleRetarget = async () => {
    if (!retargetCart) return;
    const retargetDate = retargetNextMonth
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await supabase.from("hsrp_abandoned_carts").update({
      recovery_status: "retarget",
      retarget_remarks: retargetRemarks || null,
      retarget_date: retargetDate,
      last_recovery_at: new Date().toISOString(),
    }).eq("id", retargetCart.id);

    toast.success("Marked for retargeting");
    setShowRetargetDialog(false);
    setRetargetCart(null);
    setRetargetRemarks("");
    refetch();
  };

  // ── Recycle to Fresh Lead ──
  const recycleToFresh = async (cart: any) => {
    await supabase.from("hsrp_abandoned_carts").update({
      recovery_status: "abandoned",
      recovery_attempts: 0,
      last_recovery_at: null,
      retarget_remarks: null,
      retarget_date: null,
    }).eq("id", cart.id);
    toast.success("Recycled as fresh abandoned cart");
    refetch();
  };

  const filteredCarts = carts?.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.phone?.toLowerCase().includes(q) ||
      c.owner_name?.toLowerCase().includes(q) ||
      c.registration_number?.toLowerCase().includes(q)
    );
  });

  const stepLabels: Record<number, string> = {
    1: "Service Selection",
    2: "Vehicle Info",
    3: "Contact Details",
    4: "Delivery Address",
    5: "Payment",
  };

  const statusConfig: Record<string, { color: string; icon: any }> = {
    abandoned: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
    recovered: { color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200", icon: RefreshCw },
    converted: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200", icon: CheckCircle2 },
    retarget: { color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-200", icon: Target },
  };

  const abandonedWithPhone = carts?.filter(c => c.recovery_status === "abandoned" && c.phone)?.length || 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Abandoned", value: stats?.abandoned || 0, icon: ShoppingCart, color: "text-destructive" },
          { label: "Recovery Sent", value: stats?.recovered || 0, icon: MessageSquare, color: "text-amber-600" },
          { label: "Converted", value: stats?.converted || 0, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Retarget Queue", value: stats?.retarget || 0, icon: Target, color: "text-violet-600" },
          { label: "Recovery Rate", value: `${stats?.recoveryRate || 0}%`, icon: TrendingUp, color: "text-primary" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 🚀 Shoot Recovery Campaign Button */}
      {abandonedWithPhone > 0 && (
        <Card className="border-orange-200 dark:border-orange-900 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950">
                  <Rocket className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Shoot Recovery Campaign</h3>
                  <p className="text-xs text-muted-foreground">
                    Send WhatsApp recovery to all {abandonedWithPhone} abandoned carts in one click
                  </p>
                </div>
              </div>
              <Button
                onClick={shootRecoveryCampaign}
                disabled={shootingCampaign}
                className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Rocket className="h-4 w-4" />
                {shootingCampaign
                  ? `Sending ${campaignProgress.sent}/${campaignProgress.total}...`
                  : `Shoot All (${abandonedWithPhone})`
                }
              </Button>
            </div>
            {campaignProgress.active && (
              <div className="mt-3">
                <div className="w-full bg-orange-200 dark:bg-orange-900 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full transition-all"
                    style={{ width: `${(campaignProgress.sent / campaignProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone, name, or vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
            <SelectItem value="recovered">Recovery Sent</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="retarget">🎯 Retarget Queue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cart List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : !filteredCarts?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No abandoned carts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCarts.map((cart) => {
            const config = statusConfig[cart.recovery_status] || statusConfig.abandoned;
            const StatusIcon = config.icon;
            return (
              <Card key={cart.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {cart.recovery_status === "retarget" ? "Retarget" : cart.recovery_status}
                        </Badge>
                        <Badge variant="outline">
                          Step {cart.last_step}: {stepLabels[cart.last_step] || "Unknown"}
                        </Badge>
                        {cart.service_type && (
                          <Badge variant="secondary">{cart.service_type.toUpperCase()}</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        {cart.owner_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {cart.owner_name}
                          </span>
                        )}
                        {cart.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {cart.phone}
                          </span>
                        )}
                        {cart.registration_number && (
                          <span className="flex items-center gap-1">
                            <Car className="h-3.5 w-3.5 text-muted-foreground" />
                            {cart.registration_number}
                          </span>
                        )}
                        {cart.estimated_total > 0 && (
                          <span className="flex items-center gap-1 font-medium">
                            <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                            {Number(cart.estimated_total).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {cart.retarget_remarks && (
                        <p className="text-[10px] text-violet-600 italic">📌 {cart.retarget_remarks}</p>
                      )}
                      {cart.retarget_date && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" /> Retarget: {new Date(cart.retarget_date).toLocaleDateString("en-IN")}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(cart.created_at), { addSuffix: true })}
                        {cart.recovery_attempts > 0 && (
                          <span>• {cart.recovery_attempts} recovery attempt(s)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 flex-wrap">
                      {/* Recovery WhatsApp */}
                      {(cart.recovery_status === "abandoned" || cart.recovery_status === "retarget") && cart.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendRecoveryWhatsApp(cart)}
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Recover
                        </Button>
                      )}
                      {/* Retarget */}
                      {cart.recovery_status === "abandoned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRetargetCart(cart); setRetargetRemarks(""); setRetargetNextMonth(true); setShowRetargetDialog(true); }}
                          className="text-violet-600 border-violet-200 hover:bg-violet-50"
                        >
                          <Target className="h-4 w-4 mr-1" />
                          Retarget
                        </Button>
                      )}
                      {/* Recycle retarget back to abandoned */}
                      {cart.recovery_status === "retarget" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => recycleToFresh(cart)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Recycle
                        </Button>
                      )}
                      {/* WhatsApp direct */}
                      {cart.phone && (
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                        >
                          <a href={`https://wa.me/91${cart.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Retarget Dialog ── */}
      <Dialog open={showRetargetDialog} onOpenChange={setShowRetargetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-600" /> Mark for Retargeting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p><strong>{retargetCart?.owner_name || "Customer"}</strong></p>
              <p className="text-xs text-muted-foreground">{retargetCart?.phone} • {retargetCart?.registration_number}</p>
            </div>
            <div>
              <Label className="text-xs">Reason / Remarks</Label>
              <Textarea
                value={retargetRemarks}
                onChange={e => setRetargetRemarks(e.target.value)}
                placeholder="e.g., Will do next month, waiting for RC transfer..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-800">
              <div>
                <p className="text-sm font-medium">🔄 Auto-Retarget in 30 days?</p>
                <p className="text-[10px] text-muted-foreground">Schedule follow-up reminder</p>
              </div>
              <Switch checked={retargetNextMonth} onCheckedChange={setRetargetNextMonth} />
            </div>
            <Button onClick={handleRetarget} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
              <Target className="h-4 w-4 mr-2" /> Confirm Retarget
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
