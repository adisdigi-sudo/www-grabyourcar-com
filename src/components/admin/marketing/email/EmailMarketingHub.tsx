import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, FileText, Users, GitBranch, BarChart3, Blocks, Star, MousePointer, ShoppingCart, Vote } from "lucide-react";
import { EmailBlockBuilder } from "./EmailBlockBuilder";
import { SubscriberSegmentation } from "./SubscriberSegmentation";
import { DripSequenceBuilder } from "./DripSequenceBuilder";
import { EmailAnalyticsDashboard } from "./EmailAnalyticsDashboard";
import { ContactScoringPanel } from "./ContactScoringPanel";
import { PopupFormBuilder } from "./PopupFormBuilder";
import { CartAbandonmentManager } from "./CartAbandonmentManager";
import { EmailPollManager } from "./EmailPollManager";
import { EmailMarketingManagement } from "../../EmailMarketingManagement";

export function EmailMarketingHub() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          Email Marketing Hub
        </h2>
        <p className="text-sm text-muted-foreground">
          Your complete Mailchimp replacement — AI-powered campaigns, visual builder, segmentation, drip sequences & analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm">
            <Send className="h-3.5 w-3.5" />Campaigns
          </TabsTrigger>
          <TabsTrigger value="builder" className="gap-1.5 text-xs sm:text-sm">
            <Blocks className="h-3.5 w-3.5" />Template Builder
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" />Subscribers
          </TabsTrigger>
          <TabsTrigger value="scoring" className="gap-1.5 text-xs sm:text-sm">
            <Star className="h-3.5 w-3.5" />Scoring
          </TabsTrigger>
          <TabsTrigger value="sequences" className="gap-1.5 text-xs sm:text-sm">
            <GitBranch className="h-3.5 w-3.5" />Drip Sequences
          </TabsTrigger>
          <TabsTrigger value="popups" className="gap-1.5 text-xs sm:text-sm">
            <MousePointer className="h-3.5 w-3.5" />Pop-ups
          </TabsTrigger>
          <TabsTrigger value="cart" className="gap-1.5 text-xs sm:text-sm">
            <ShoppingCart className="h-3.5 w-3.5" />Cart Recovery
          </TabsTrigger>
          <TabsTrigger value="polls" className="gap-1.5 text-xs sm:text-sm">
            <Vote className="h-3.5 w-3.5" />Polls
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns"><EmailMarketingManagement /></TabsContent>
        <TabsContent value="builder"><EmailBlockBuilder /></TabsContent>
        <TabsContent value="subscribers"><SubscriberSegmentation /></TabsContent>
        <TabsContent value="scoring"><ContactScoringPanel /></TabsContent>
        <TabsContent value="sequences"><DripSequenceBuilder /></TabsContent>
        <TabsContent value="popups"><PopupFormBuilder /></TabsContent>
        <TabsContent value="cart"><CartAbandonmentManager /></TabsContent>
        <TabsContent value="polls"><EmailPollManager /></TabsContent>
        <TabsContent value="analytics"><EmailAnalyticsDashboard /></TabsContent>
      </Tabs>
    </div>
  );
}
