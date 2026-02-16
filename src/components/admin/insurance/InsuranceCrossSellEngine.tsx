import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Zap, Shield, Wrench, Car, Star, Package, Phone, ArrowRight, TrendingUp, Sparkles
} from "lucide-react";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";

interface CrossSellOpp {
  clientId: string;
  clientName: string;
  phone: string;
  vehicleModel: string;
  currentProducts: string[];
  recommendations: { type: string; label: string; reason: string; icon: any; priority: string }[];
}

const PRODUCT_CATALOG = [
  { type: "zero_dep", label: "Zero Depreciation", icon: Shield, reason: "Covers full claim without depreciation deduction" },
  { type: "engine_protect", label: "Engine Protection", icon: Wrench, reason: "Critical for waterlogging & engine damage" },
  { type: "rsa", label: "Roadside Assistance", icon: Car, reason: "24/7 towing & on-road support" },
  { type: "extended_warranty", label: "Extended Warranty", icon: Star, reason: "Saves repair costs after manufacturer warranty" },
  { type: "accessories_cover", label: "Accessories Cover", icon: Package, reason: "Protects aftermarket accessories" },
  { type: "ncb_protect", label: "NCB Protection", icon: TrendingUp, reason: "Preserves no-claim bonus even after a claim" },
  { type: "consumables", label: "Consumables Cover", icon: Wrench, reason: "Covers oil, coolant, nuts & bolts during claim" },
  { type: "key_replace", label: "Key Replacement", icon: Shield, reason: "Covers cost of lost/damaged car keys" },
];

export function InsuranceCrossSellEngine() {
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ["ins-cross-sell"],
    queryFn: async () => {
      const { data: clients, error } = await (supabase
        .from("insurance_clients")
        .select("*, insurance_policies(policy_type, premium_amount, status)") as any)
        .in("status", ["converted", "renewal_due", "active"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const opps: CrossSellOpp[] = [];

      for (const client of clients || []) {
        const activePolicy = (client as any).insurance_policies?.find((p: any) => p.status === "active");
        const currentAddOns: string[] = [];
        const currentAddOnLower = currentAddOns.map((a: string) => a.toLowerCase());

        const recommendations = PRODUCT_CATALOG.filter(p => {
          const hasIt = currentAddOnLower.some(a =>
            a.includes(p.type.replace("_", " ")) ||
            a.includes(p.label.toLowerCase())
          );
          return !hasIt;
        }).map(p => ({
          ...p,
          priority: ["zero_dep", "engine_protect", "rsa"].includes(p.type) ? "high" : "medium",
        }));

        if (recommendations.length > 0) {
          opps.push({
            clientId: client.id,
            clientName: client.customer_name || client.phone,
            phone: client.phone,
            vehicleModel: `${client.vehicle_make || ""} ${client.vehicle_model || ""}`.trim() || "—",
            currentProducts: currentAddOns as string[],
            recommendations: recommendations.slice(0, 4),
          });
        }
      }

      return opps;
    },
  });

  const handleNudge = (opp: CrossSellOpp, product: string) => {
    triggerWhatsApp({
      event: "insurance_cross_sell",
      phone: opp.phone,
      name: opp.clientName,
      data: {
        product,
        vehicle: opp.vehicleModel,
      },
    });
    toast.success(`Cross-sell nudge sent for ${product}`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Cross-Sell Intelligence
          </CardTitle>
          <CardDescription>
            {opportunities?.length || 0} clients with upsell opportunities detected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Analyzing client portfolios...</p>
          ) : opportunities && opportunities.length > 0 ? (
            <div className="space-y-3">
              {opportunities.map(opp => (
                <div key={opp.clientId} className="border rounded-xl p-4 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm">{opp.clientName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3" /> {opp.phone} • {opp.vehicleModel}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {opp.recommendations.length} opportunities
                    </Badge>
                  </div>

                  {opp.currentProducts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-[10px] text-muted-foreground mr-1">Has:</span>
                      {opp.currentProducts.map((p, i) => (
                        <Badge key={i} className="bg-green-100 text-green-700 border-0 text-[9px]">{p}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {opp.recommendations.map(rec => {
                      const Icon = rec.icon;
                      return (
                        <div
                          key={rec.type}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            rec.priority === "high" ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                            <div>
                              <p className="text-xs font-medium">{rec.label}</p>
                              <p className="text-[10px] text-muted-foreground">{rec.reason}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] gap-1"
                            onClick={() => handleNudge(opp, rec.label)}
                          >
                            Nudge <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No cross-sell opportunities detected</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
