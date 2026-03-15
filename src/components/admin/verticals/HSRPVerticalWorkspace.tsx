import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle2, ShoppingCart, LayoutDashboard } from "lucide-react";
import { HSRPManagement } from "../HSRPManagement";
import { HSRPAbandonedCarts } from "../hsrp/HSRPAbandonedCarts";

export function HSRPVerticalWorkspace() {
  const [tab, setTab] = useState("pipeline");

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
        <TabsList>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <LayoutDashboard className="h-4 w-4" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="abandoned" className="gap-1.5">
            <ShoppingCart className="h-4 w-4" /> Abandoned Carts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline">
          <HSRPManagement />
        </TabsContent>
        <TabsContent value="abandoned">
          <HSRPAbandonedCarts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
