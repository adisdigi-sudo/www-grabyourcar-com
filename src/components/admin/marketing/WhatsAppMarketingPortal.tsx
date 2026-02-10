import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Rocket, Send, MessageSquare, Target, Zap, BarChart3, 
  Users, Shield, Settings
} from "lucide-react";
import { WACampaignDashboard } from "./wa/WACampaignDashboard";
import { WAConversationInbox } from "./wa/WAConversationInbox";
import { WAAutomationRules } from "./wa/WAAutomationRules";
import { WAAnalyticsDashboard } from "./wa/WAAnalyticsDashboard";
import { WAContactSegments } from "./wa/WAContactSegments";
import { WATemplateManager } from "./wa/WATemplateManager";
import { WACompliancePanel } from "./wa/WACompliancePanel";

export function WhatsAppMarketingPortal() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          WhatsApp Marketing Portal
        </h1>
        <p className="text-muted-foreground">
          Enterprise-grade WhatsApp campaigns, automation, and customer engagement
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
          <TabsTrigger value="campaigns" className="gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="inbox" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Inbox</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Automation</span>
          </TabsTrigger>
          <TabsTrigger value="segments" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Segments</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns"><WACampaignDashboard /></TabsContent>
        <TabsContent value="inbox"><WAConversationInbox /></TabsContent>
        <TabsContent value="automation"><WAAutomationRules /></TabsContent>
        <TabsContent value="segments"><WAContactSegments /></TabsContent>
        <TabsContent value="templates"><WATemplateManager /></TabsContent>
        <TabsContent value="analytics"><WAAnalyticsDashboard /></TabsContent>
        <TabsContent value="compliance"><WACompliancePanel /></TabsContent>
      </Tabs>
    </div>
  );
}
