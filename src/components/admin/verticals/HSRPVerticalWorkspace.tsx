import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle2, ShoppingCart, LayoutDashboard, Search, ClipboardCheck, TrendingUp, MessageSquare } from "lucide-react";
import { HSRPWorkspace } from "../hsrp/HSRPWorkspace";
import { HSRPAbandonedCarts } from "../hsrp/HSRPAbandonedCarts";
import { HSRPOrderTracker } from "@/components/hsrp/HSRPOrderTracker";
import { HSRPComplianceChecker } from "@/components/hsrp/HSRPComplianceChecker";
import { HSRPPerformanceDashboard } from "../hsrp/HSRPPerformanceDashboard";
import { VerticalMessagingTab } from "../shared/VerticalMessagingTab";

import { DateFilterBar, type DateFilterValue } from "../shared/DateFilterBar";
import { startOfDay, subDays, startOfMonth, isWithinInterval } from "date-fns";
import type { DateRange } from "react-day-picker";

const ORDER_MAP: Record<string, string> = {
  pending: "new_booking", new_booking: "new_booking",
  verification: "verification", verifying: "verification", contacted: "verification",
  payment: "payment", payment_pending: "payment",
  scheduled: "scheduled", confirmed: "scheduled",
  installation: "installation", in_progress: "installation", fitting: "installation",
  completed: "completed", delivered: "completed", done: "completed",
};
const normalizeStage = (s: string | null) => ORDER_MAP[s || "pending"] || "new_booking";

export function HSRPVerticalWorkspace() {
  const [tab, setTab] = useState("pipeline");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const { data: allBookings = [] } = useQuery({
    queryKey: ["hsrp-pipeline-perf"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hsrp_bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        pipeline_stage: b.pipeline_stage || normalizeStage(b.order_status),
      }));
    },
  });

  const filteredBookings = useMemo(() => {
    if (dateFilter === "all") return allBookings;
    if (dateFilter === "custom" && customRange?.from && customRange?.to) {
      return allBookings.filter((b: any) =>
        isWithinInterval(new Date(b.created_at), { start: customRange.from!, end: new Date(customRange.to!.getTime() + 86400000 - 1) })
      );
    }
    const now = new Date();
    let cutoff: Date;
    switch (dateFilter) {
      case "today": cutoff = startOfDay(now); break;
      case "7days": cutoff = subDays(now, 7); break;
      case "30days": cutoff = subDays(now, 30); break;
      case "this_month": cutoff = startOfMonth(now); break;
      default: return allBookings;
    }
    return allBookings.filter((b: any) => new Date(b.created_at) >= cutoff);
  }, [allBookings, dateFilter, customRange]);

  return (
    <div className="space-y-4">
      <Card className="border-teal-200 dark:border-teal-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950">
                <Shield className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">HSRP & FASTag</h2>
                <p className="text-xs text-muted-foreground">HSRP Plate Registrations, FASTag Issuance & Order Tracking</p>
              </div>
            </div>
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="pipeline" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="abandoned" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" /> Abandoned
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <TrendingUp className="h-4 w-4" /> Performance
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" /> Tools
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> Conversations
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline">
          <HSRPWorkspace />
        </TabsContent>
        <TabsContent value="abandoned">
          <HSRPAbandonedCarts />
        </TabsContent>
        <TabsContent value="performance" className="mt-4 space-y-3">
          <DateFilterBar
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
          <HSRPPerformanceDashboard bookings={filteredBookings} dateFilter={dateFilter} />
        </TabsContent>
        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Public HSRP tools</h3>
                  <p className="text-sm text-muted-foreground">Use the same tracking and compliance widgets customers see on the site.</p>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <HSRPOrderTracker />
                <HSRPComplianceChecker />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="conversations" className="mt-4">
          <VerticalMessagingTab scope="hsrp" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
