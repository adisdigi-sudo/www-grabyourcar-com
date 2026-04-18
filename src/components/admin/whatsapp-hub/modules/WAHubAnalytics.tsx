import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, AlertOctagon, Sparkles } from "lucide-react";
import { WAFunnelOverview } from "./analytics/WAFunnelOverview";
import { WABroadcastPerformance } from "./analytics/WABroadcastPerformance";
import { WAFailureBreakdown } from "./analytics/WAFailureBreakdown";
import { MetaAdsRoiPanel } from "./analytics/MetaAdsRoiPanel";

export function WAHubAnalytics() {
  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="funnel" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Funnel
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Broadcasts
          </TabsTrigger>
          <TabsTrigger value="failures" className="gap-1.5 text-xs">
            <AlertOctagon className="h-3.5 w-3.5" /> Failures
          </TabsTrigger>
          <TabsTrigger value="roi" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Meta Ads & ROI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4">
          <WAFunnelOverview />
        </TabsContent>
        <TabsContent value="broadcasts" className="space-y-4">
          <WABroadcastPerformance />
        </TabsContent>
        <TabsContent value="failures" className="space-y-4">
          <WAFailureBreakdown />
        </TabsContent>
        <TabsContent value="roi" className="space-y-4">
          <MetaAdsRoiPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
