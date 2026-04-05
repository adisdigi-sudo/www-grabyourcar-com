import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, Send } from "lucide-react";
import { LoanWorkspace } from "../loans/LoanWorkspace";
import { OmniMessagingWorkspace } from "../shared/OmniMessagingWorkspace";

export function LoansVerticalWorkspace() {
  const [tab, setTab] = useState("pipeline");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="pipeline" className="gap-1.5">
          <Banknote className="h-3.5 w-3.5" /> Loan CRM
        </TabsTrigger>
        <TabsTrigger value="messaging" className="gap-1.5">
          <Send className="h-3.5 w-3.5" /> Messaging
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pipeline">
        <LoanWorkspace initialView="pipeline" />
      </TabsContent>
      <TabsContent value="messaging">
        <OmniMessagingWorkspace context="Car Loans" showSettings />
      </TabsContent>
    </Tabs>
  );
}
