import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, BarChart3, Target, Award, TrendingUp } from "lucide-react";
import { PlanBudgetTab } from "./PlanBudgetTab";
import { DailyTrackerTab } from "./DailyTrackerTab";
import { TargetsTab } from "./TargetsTab";
import { IncentivesTab } from "./IncentivesTab";
import { ProfitabilityTab } from "./ProfitabilityTab";

export const BudgetEngine = () => {
  const [tab, setTab] = useState("plan");
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Budget Engine</h2>
          <p className="text-xs text-muted-foreground">
            Plan budget → allocate channels → track daily → set targets → calculate incentives → measure ROI
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="plan" className="gap-1.5"><Wallet className="h-3.5 w-3.5" /> Plan</TabsTrigger>
          <TabsTrigger value="daily" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Daily</TabsTrigger>
          <TabsTrigger value="targets" className="gap-1.5"><Target className="h-3.5 w-3.5" /> Targets</TabsTrigger>
          <TabsTrigger value="incentives" className="gap-1.5"><Award className="h-3.5 w-3.5" /> Incentives</TabsTrigger>
          <TabsTrigger value="profit" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Profit</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4"><PlanBudgetTab /></TabsContent>
        <TabsContent value="daily" className="mt-4"><DailyTrackerTab /></TabsContent>
        <TabsContent value="targets" className="mt-4"><TargetsTab /></TabsContent>
        <TabsContent value="incentives" className="mt-4"><IncentivesTab /></TabsContent>
        <TabsContent value="profit" className="mt-4"><ProfitabilityTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default BudgetEngine;
