import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, PhoneCall } from "lucide-react";
import { LoanWorkspace } from "../loans/LoanWorkspace";
import { VerticalReplyAgentsCard } from "../automation/VerticalReplyAgentsCard";
import { CallingQueueWorkspace } from "../calling/CallingQueueWorkspace";

export function LoansVerticalWorkspace() {
  const [tab, setTab] = useState("workspace");
  return (
    <div className="space-y-4">
      <VerticalReplyAgentsCard verticalSlug="loans" verticalLabel="Car Loans / Finance" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="workspace" className="gap-1.5"><Banknote className="h-4 w-4" /> Loan Workspace</TabsTrigger>
          <TabsTrigger value="calling" className="gap-1.5"><PhoneCall className="h-4 w-4" /> Calling Queue</TabsTrigger>
        </TabsList>
        <TabsContent value="workspace" className="mt-4">
          <LoanWorkspace initialView="pipeline" />
        </TabsContent>
        <TabsContent value="calling" className="mt-4">
          <CallingQueueWorkspace verticalSlug="loans" verticalLabel="Car Loans" accentClass="border-emerald-200 dark:border-emerald-900" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
