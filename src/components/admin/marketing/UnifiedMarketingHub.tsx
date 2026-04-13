import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, FileText, Users, GitBranch, BarChart3, Blocks, Star, MousePointer, ShoppingCart, Vote, Sparkles, Zap, Store, Plug, Inbox } from "lucide-react";
import { EmailInboxDashboard } from "./email/EmailInboxDashboard";
import { EmailBlockBuilder } from "./email/EmailBlockBuilder";
import { SubscriberSegmentation } from "./email/SubscriberSegmentation";
import { DripSequenceBuilder } from "./email/DripSequenceBuilder";
import { EmailAnalyticsDashboard } from "./email/EmailAnalyticsDashboard";
import { ContactScoringPanel } from "./email/ContactScoringPanel";
import { PopupFormBuilder } from "./email/PopupFormBuilder";
import { CartAbandonmentManager } from "./email/CartAbandonmentManager";
import { EmailPollManager } from "./email/EmailPollManager";
import { DynamicContentBuilder } from "./email/DynamicContentBuilder";
import { EmailMarketingManagement } from "../EmailMarketingManagement";
import { OmniCampaignManager } from "./omni/OmniCampaignManager";
import { IntegrationMarketplace } from "./omni/IntegrationMarketplace";

export function UnifiedMarketingHub() {
  const [activeTab, setActiveTab] = useState("omni");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          Unified Marketing Hub
        </h2>
        <p className="text-sm text-muted-foreground">
          Send campaigns via Email, WhatsApp & RCS — manage integrations, automation & analytics from one place
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="email-inbox" className="gap-1.5 text-xs sm:text-sm">
            <Inbox className="h-3.5 w-3.5" />Email Inbox
          </TabsTrigger>
          <TabsTrigger value="omni" className="gap-1.5 text-xs sm:text-sm">
            <Zap className="h-3.5 w-3.5" />Omni Campaigns
          </TabsTrigger>
          <TabsTrigger value="email-campaigns" className="gap-1.5 text-xs sm:text-sm">
            <Send className="h-3.5 w-3.5" />Email Campaigns
          </TabsTrigger>
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
          <TabsTrigger value="dynamic" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" />Dynamic Content
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
          <TabsTrigger value="integrations" className="gap-1.5 text-xs sm:text-sm">
            <Store className="h-3.5 w-3.5" />Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="omni"><OmniCampaignManager /></TabsContent>
        <TabsContent value="email-campaigns"><EmailMarketingManagement /></TabsContent>
        <TabsContent value="builder"><EmailBlockBuilder /></TabsContent>
        <TabsContent value="subscribers"><SubscriberSegmentation /></TabsContent>
        <TabsContent value="scoring"><ContactScoringPanel /></TabsContent>
        <TabsContent value="sequences"><DripSequenceBuilder /></TabsContent>
        <TabsContent value="dynamic"><DynamicContentBuilder /></TabsContent>
        <TabsContent value="popups"><PopupFormBuilder /></TabsContent>
        <TabsContent value="cart"><CartAbandonmentManager /></TabsContent>
        <TabsContent value="polls"><EmailPollManager /></TabsContent>
        <TabsContent value="analytics"><EmailAnalyticsDashboard /></TabsContent>
        <TabsContent value="integrations"><IntegrationMarketplace /></TabsContent>
      </Tabs>
    </div>
  );
}
