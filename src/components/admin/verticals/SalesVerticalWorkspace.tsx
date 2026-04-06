import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, CheckCircle2, Target, Handshake, BarChart3, Send, TrendingUp, Calendar } from "lucide-react";
import { SalesWorkspace } from "../sales/SalesWorkspace";
import { SalesDealTracker } from "../sales/SalesDealTracker";
import { SalesRealTimeDashboard } from "../sales/SalesRealTimeDashboard";
import { SalesPerformanceDashboard } from "../sales/SalesPerformanceDashboard";
import { OmniMessagingWorkspace } from "../shared/OmniMessagingWorkspace";
import { startOfDay, subDays, startOfMonth } from "date-fns";

const STAGE_MAP: Record<string, string> = {
  new_lead: "new_lead", new: "new_lead",
  contacted: "contacted", smart_calling: "contacted",
  requirement_understood: "requirement_understood", interested: "requirement_understood", qualified: "requirement_understood",
  quote_shared: "quote_shared", running_offer: "quote_shared", quoted: "quote_shared", offer_shared: "quote_shared",
  follow_up: "follow_up",
  negotiation: "negotiation", booking: "negotiation", booked: "negotiation",
  won: "won", delivery: "won", delivered: "won", after_sales: "won", converted: "won",
  lost: "lost",
  status: "follow_up",
};
const normalizeStage = (s: string | null, outcome?: string | null): string => {
  if (outcome === "won") return "won";
  if (outcome === "lost") return "lost";
  return STAGE_MAP[s || "new_lead"] || "new_lead";
};

const DATE_FILTERS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7days", label: "7D" },
  { value: "30days", label: "30D" },
  { value: "this_month", label: "This Month" },
];

export function SalesVerticalWorkspace() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: allLeads = [] } = useQuery({
    queryKey: ["sales-pipeline-perf"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_pipeline" as any)
        .select("*")
        .eq("is_legacy", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((l: any) => ({
        ...l,
        pipeline_stage: normalizeStage(l.pipeline_stage, l.status_outcome),
      }));
    },
  });

  const filteredLeads = useMemo(() => {
    if (dateFilter === "all") return allLeads;
    const now = new Date();
    let cutoff: Date;
    switch (dateFilter) {
      case "today": cutoff = startOfDay(now); break;
      case "7days": cutoff = subDays(now, 7); break;
      case "30days": cutoff = subDays(now, 30); break;
      case "this_month": cutoff = startOfMonth(now); break;
      default: return allLeads;
    }
    return allLeads.filter((l: any) => new Date(l.created_at) >= cutoff);
  }, [allLeads, dateFilter]);

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 dark:border-blue-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Automotive Sales CRM</h2>
                <p className="text-xs text-muted-foreground">
                  Lead Pipeline • Smart Calling • Quotes • Negotiation • Delivery • After Sales
                </p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Target className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="deals" className="gap-1.5">
            <Handshake className="h-3.5 w-3.5" /> Deals
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Performance
          </TabsTrigger>
          <TabsTrigger value="messaging" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Messaging
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <SalesWorkspace />
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <SalesDealTracker />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <SalesRealTimeDashboard />
        </TabsContent>

        <TabsContent value="performance" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {DATE_FILTERS.map(f => (
                <Button key={f.value} size="sm" variant={dateFilter === f.value ? "default" : "outline"}
                  className="h-7 text-xs px-2.5" onClick={() => setDateFilter(f.value)}>
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
          <SalesPerformanceDashboard leads={filteredLeads} dateFilter={dateFilter} />
        </TabsContent>

        <TabsContent value="messaging" className="mt-4">
          <OmniMessagingWorkspace context="Car Sales" showSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

        <TabsContent value="messaging" className="mt-4">
          <OmniMessagingWorkspace context="Car Sales" showSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}