import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Blocks, Users, Star, GitBranch, BarChart3, Sparkles, MousePointer, ShoppingCart, Vote } from "lucide-react";
import { EmailBlockBuilder } from "./EmailBlockBuilder";
import { SubscriberSegmentation } from "./SubscriberSegmentation";
import { DripSequenceBuilder } from "./DripSequenceBuilder";
import { EmailAnalyticsDashboard } from "./EmailAnalyticsDashboard";
import { ContactScoringPanel } from "./ContactScoringPanel";
import { PopupFormBuilder } from "./PopupFormBuilder";
import { CartAbandonmentManager } from "./CartAbandonmentManager";
import { EmailPollManager } from "./EmailPollManager";
import { DynamicContentBuilder } from "./DynamicContentBuilder";
import { EmailMarketingManagement } from "../../EmailMarketingManagement";
import { motion } from "framer-motion";

const TABS = [
  { value: "campaigns", label: "Campaigns", icon: Send, badge: null },
  { value: "builder", label: "Builder", icon: Blocks, badge: null },
  { value: "subscribers", label: "Subscribers", icon: Users, badge: null },
  { value: "scoring", label: "Scoring", icon: Star, badge: null },
  { value: "sequences", label: "Drip", icon: GitBranch, badge: null },
  { value: "dynamic", label: "Dynamic", icon: Sparkles, badge: null },
  { value: "popups", label: "Pop-ups", icon: MousePointer, badge: null },
  { value: "cart", label: "Cart", icon: ShoppingCart, badge: null },
  { value: "polls", label: "Polls", icon: Vote, badge: null },
  { value: "analytics", label: "Analytics", icon: BarChart3, badge: null },
] as const;

export function EmailMarketingHub() {
  const [activeTab, setActiveTab] = useState("campaigns");

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            Email Marketing Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered campaigns, visual builder, segmentation, drip sequences & real-time analytics
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5 hidden sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Live Tracking
        </Badge>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 p-1.5 bg-muted/60 backdrop-blur-sm">
          {TABS.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-sm transition-all"
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <TabsContent value="campaigns" className="mt-4"><EmailMarketingManagement /></TabsContent>
          <TabsContent value="builder" className="mt-4"><EmailBlockBuilder /></TabsContent>
          <TabsContent value="subscribers" className="mt-4"><SubscriberSegmentation /></TabsContent>
          <TabsContent value="scoring" className="mt-4"><ContactScoringPanel /></TabsContent>
          <TabsContent value="sequences" className="mt-4"><DripSequenceBuilder /></TabsContent>
          <TabsContent value="dynamic" className="mt-4"><DynamicContentBuilder /></TabsContent>
          <TabsContent value="popups" className="mt-4"><PopupFormBuilder /></TabsContent>
          <TabsContent value="cart" className="mt-4"><CartAbandonmentManager /></TabsContent>
          <TabsContent value="polls" className="mt-4"><EmailPollManager /></TabsContent>
          <TabsContent value="analytics" className="mt-4"><EmailAnalyticsDashboard /></TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
}
