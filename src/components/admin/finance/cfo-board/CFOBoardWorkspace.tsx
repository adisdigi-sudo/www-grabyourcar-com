import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Trophy, BarChart3 } from "lucide-react";
import { SpendPlannerTab } from "./SpendPlannerTab";
import { AchievementsTab } from "./AchievementsTab";
import { UnifiedPLTab } from "./UnifiedPLTab";

const CFOBoardWorkspace = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CFO Board</h1>
        <p className="text-sm text-muted-foreground">
          Plan budgets, track real-time achievements, and view per-vertical profit & loss in CFO style.
        </p>
      </div>

      <Tabs defaultValue="planner" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="planner" className="gap-2">
            <Wallet className="h-4 w-4" /> Spend Planner
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-2">
            <Trophy className="h-4 w-4" /> Achievements
          </TabsTrigger>
          <TabsTrigger value="pl" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Unified P&L
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="mt-6">
          <SpendPlannerTab />
        </TabsContent>
        <TabsContent value="achievements" className="mt-6">
          <AchievementsTab />
        </TabsContent>
        <TabsContent value="pl" className="mt-6">
          <UnifiedPLTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CFOBoardWorkspace;
