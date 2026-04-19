import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Users, GitBranch, BarChart3, Blocks, Star, MousePointer, ShoppingCart, Vote, Sparkles, Zap, Store, Inbox, Archive, TrendingUp, MessageSquare } from "lucide-react";
import { MetaAdsRoiPanel } from "../whatsapp-hub/modules/analytics/MetaAdsRoiPanel";
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
import { LegacyLeadsManager } from "../shared/LegacyLeadsManager";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Strict channel isolation:
 *  - Cross-channel  → Omni campaigns + Integrations
 *  - Email          → Inbox / Campaigns / Builder / Drip / Dynamic / Pop-ups / Cart / Polls / Analytics
 *  - WhatsApp       → handled in dedicated WhatsApp Hub (link below — not duplicated here)
 *  - Audience       → Subscribers / Scoring / Legacy Leads
 *  - Ads & ROI      → Meta Ads ROI panel
 *
 *  WhatsApp tools are intentionally NOT duplicated inside Email Marketing Hub —
 *  they live exclusively in the WhatsApp Hub (Point 29: strict isolation).
 */
export function UnifiedMarketingHub() {
  const [section, setSection] = useState<"cross" | "email" | "audience" | "ads">("cross");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Unified Marketing Hub
          </h2>
          <p className="text-sm text-muted-foreground">
            Channel-isolated workspace — Email, Cross-channel, Audience, Ads. WhatsApp lives in its own hub.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          WhatsApp tools → WhatsApp Hub
        </Badge>
      </div>

      {/* Channel Section Switcher */}
      <Card className="p-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { id: "cross", label: "Cross-Channel", icon: Zap, desc: "Omni + Integrations" },
          { id: "email", label: "Email", icon: Mail, desc: "Campaigns, Drip, Inbox" },
          { id: "audience", label: "Audience", icon: Users, desc: "Subscribers + Scoring" },
          { id: "ads", label: "Ads & ROI", icon: TrendingUp, desc: "Meta + attribution" },
        ].map((s) => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id as typeof section)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                active ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:bg-muted/50"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <div className="font-semibold text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </button>
          );
        })}
      </Card>

      {section === "cross" && (
        <Tabs defaultValue="omni">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="omni" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Omni Campaigns</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5"><Store className="h-3.5 w-3.5" />Integrations</TabsTrigger>
          </TabsList>
          <TabsContent value="omni"><OmniCampaignManager /></TabsContent>
          <TabsContent value="integrations"><IntegrationMarketplace /></TabsContent>
        </Tabs>
      )}

      {section === "email" && (
        <Tabs defaultValue="inbox">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="inbox" className="gap-1.5"><Inbox className="h-3.5 w-3.5" />Inbox</TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5"><Send className="h-3.5 w-3.5" />Campaigns</TabsTrigger>
            <TabsTrigger value="builder" className="gap-1.5"><Blocks className="h-3.5 w-3.5" />Template Builder</TabsTrigger>
            <TabsTrigger value="sequences" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" />Drip Sequences</TabsTrigger>
            <TabsTrigger value="dynamic" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />Dynamic Content</TabsTrigger>
            <TabsTrigger value="popups" className="gap-1.5"><MousePointer className="h-3.5 w-3.5" />Pop-ups</TabsTrigger>
            <TabsTrigger value="cart" className="gap-1.5"><ShoppingCart className="h-3.5 w-3.5" />Cart Recovery</TabsTrigger>
            <TabsTrigger value="polls" className="gap-1.5"><Vote className="h-3.5 w-3.5" />Polls</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="inbox"><EmailInboxDashboard /></TabsContent>
          <TabsContent value="campaigns"><EmailMarketingManagement /></TabsContent>
          <TabsContent value="builder"><EmailBlockBuilder /></TabsContent>
          <TabsContent value="sequences"><DripSequenceBuilder /></TabsContent>
          <TabsContent value="dynamic"><DynamicContentBuilder /></TabsContent>
          <TabsContent value="popups"><PopupFormBuilder /></TabsContent>
          <TabsContent value="cart"><CartAbandonmentManager /></TabsContent>
          <TabsContent value="polls"><EmailPollManager /></TabsContent>
          <TabsContent value="analytics"><EmailAnalyticsDashboard /></TabsContent>
        </Tabs>
      )}

      {section === "audience" && (
        <Tabs defaultValue="subscribers">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="subscribers" className="gap-1.5"><Users className="h-3.5 w-3.5" />Subscribers</TabsTrigger>
            <TabsTrigger value="scoring" className="gap-1.5"><Star className="h-3.5 w-3.5" />Lead Scoring</TabsTrigger>
            <TabsTrigger value="legacy" className="gap-1.5"><Archive className="h-3.5 w-3.5" />Legacy Leads</TabsTrigger>
          </TabsList>
          <TabsContent value="subscribers"><SubscriberSegmentation /></TabsContent>
          <TabsContent value="scoring"><ContactScoringPanel /></TabsContent>
          <TabsContent value="legacy"><LegacyLeadsManager /></TabsContent>
        </Tabs>
      )}

      {section === "ads" && (
        <Tabs defaultValue="meta-roi">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="meta-roi" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Meta Ads & ROI</TabsTrigger>
          </TabsList>
          <TabsContent value="meta-roi"><MetaAdsRoiPanel /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
