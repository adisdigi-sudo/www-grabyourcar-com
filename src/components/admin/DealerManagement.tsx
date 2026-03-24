import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Car, Send, MessageCircle, BarChart3, Zap } from "lucide-react";
import DealerCompaniesManager from "./dealer/DealerCompaniesManager";
import DealerRepresentativesManager from "./dealer/DealerRepresentativesManager";
import DealerInventoryManager from "./dealer/DealerInventoryManager";
import DealerBroadcastManager from "./dealer/DealerBroadcastManager";
import DealerInquiryHub from "./dealer/DealerInquiryHub";
import DealerAnalytics from "./dealer/DealerAnalytics";
import DealerAutomationCenter from "./dealer/DealerAutomationCenter";

interface Props {
  initialTab?: string;
}

export const DealerManagement = ({ initialTab = "inquiry" }: Props) => {
  const [tab, setTab] = useState(initialTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏢 Dealer Network Management</h1>
        <p className="text-muted-foreground">Manage dealer companies, representatives, inventory, automation & analytics</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="inquiry" className="gap-1.5"><MessageCircle className="h-4 w-4" /> Inquiry</TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5"><Zap className="h-4 w-4" /> Automation</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
          <TabsTrigger value="companies" className="gap-1.5"><Building2 className="h-4 w-4" /> Companies</TabsTrigger>
          <TabsTrigger value="reps" className="gap-1.5"><Users className="h-4 w-4" /> Reps</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5"><Car className="h-4 w-4" /> Inventory</TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5"><Send className="h-4 w-4" /> Broadcast</TabsTrigger>
        </TabsList>

        <TabsContent value="inquiry"><DealerInquiryHub /></TabsContent>
        <TabsContent value="automation"><DealerAutomationCenter /></TabsContent>
        <TabsContent value="analytics"><DealerAnalytics /></TabsContent>
        <TabsContent value="companies"><DealerCompaniesManager /></TabsContent>
        <TabsContent value="reps"><DealerRepresentativesManager /></TabsContent>
        <TabsContent value="inventory"><DealerInventoryManager /></TabsContent>
        <TabsContent value="broadcast"><DealerBroadcastManager /></TabsContent>
      </Tabs>
    </div>
  );
};

export default DealerManagement;
