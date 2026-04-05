import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CheckCircle2, Calculator, LayoutDashboard, Layers3, Send } from "lucide-react";
import {
  CorporatePricingTiers,
  FleetRequirementBuilder,
  LeaseVsBuyCalculator,
} from "@/components/corporate";
import { OmniMessagingWorkspace } from "../shared/OmniMessagingWorkspace";

export function FleetVerticalWorkspace() {
  const [tab, setTab] = useState("planner");

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Corporate Fleet Workspace</h2>
                <p className="text-xs text-muted-foreground">Fleet planning, pricing tiers, and lease vs buy evaluation</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="planner" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" /> Fleet Planner
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-1.5">
            <Calculator className="h-4 w-4" /> TCO Calculator
          </TabsTrigger>
          <TabsTrigger value="tiers" className="gap-1.5">
            <Layers3 className="h-4 w-4" /> Pricing Tiers
          </TabsTrigger>
          <TabsTrigger value="messaging" className="gap-1.5">
            <Send className="h-4 w-4" /> Messaging
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner">
          <FleetRequirementBuilder />
        </TabsContent>

        <TabsContent value="calculator">
          <LeaseVsBuyCalculator />
        </TabsContent>

        <TabsContent value="tiers">
          <div className="rounded-xl border border-border bg-card">
            <CorporatePricingTiers />
          </div>
        </TabsContent>

        <TabsContent value="messaging">
          <OmniMessagingWorkspace context="Fleet Business" showSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}