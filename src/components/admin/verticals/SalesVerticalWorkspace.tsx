import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, CheckCircle2, LayoutDashboard, Target, Handshake, BarChart3, Send } from "lucide-react";
import { SalesWorkspace } from "../sales/SalesWorkspace";
import { SalesDealTracker } from "../sales/SalesDealTracker";
import { SalesRealTimeDashboard } from "../sales/SalesRealTimeDashboard";
import { OmniMessagingWorkspace } from "../shared/OmniMessagingWorkspace";

export function SalesVerticalWorkspace() {
  const [activeTab, setActiveTab] = useState("pipeline");

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
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="pipeline" className="gap-1.5">
            <Target className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="deals" className="gap-1.5">
            <Handshake className="h-3.5 w-3.5" /> Deals
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Dashboard
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

        <TabsContent value="messaging" className="mt-4">
          <OmniMessagingWorkspace context="Car Sales" showSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}