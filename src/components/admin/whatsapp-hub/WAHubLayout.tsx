import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare, LayoutTemplate, Megaphone, Workflow, Users, BarChart3,
  UsersRound, ChevronLeft, ChevronRight, Wifi, WifiOff, Search,
  MessageSquareText, ClipboardList, MousePointer,
  TrendingUp, Sparkles, Zap, Mail, Inbox as InboxIcon, Bot, Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Module imports
import { WAHubInbox } from "./modules/WAHubInbox";
import { WAHubTemplates } from "./modules/WAHubTemplates";
import { WAHubBroadcasts } from "./modules/WAHubBroadcasts";
import { WAHubBulkBroadcaster } from "./modules/WAHubBulkBroadcaster";
import { WAHubFlows } from "./modules/WAHubFlows";
import { WAHubContacts } from "./modules/WAHubContacts";
import { WAHubAnalytics } from "./modules/WAHubAnalytics";
import { WAHubTeam } from "./modules/WAHubTeam";
import { WAHubCrmMessages } from "./modules/WAHubCrmMessages";
import { WAHubSurveys } from "./modules/WAHubSurveys";
import { WAHubInteractive } from "./modules/WAHubInteractive";
import { WAHubCampaignROI } from "./modules/WAHubCampaignROI";
import { WAHubSalesEngines } from "./modules/WAHubSalesEngines";
import { WAHubSmartTriggers } from "./modules/WAHubSmartTriggers";
import { WAHubAutoPilotPreview } from "./modules/WAHubAutoPilotPreview";
import { WAHubCostDashboard } from "./modules/WAHubCostDashboard";
import { WAHubConversationsLog } from "./modules/WAHubConversationsLog";
import { EmailMarketingHub } from "../marketing/email/EmailMarketingHub";

type Module =
  | "inbox" | "templates" | "broadcasts" | "bulk-broadcaster" | "flows" | "contacts" | "analytics"
  | "team" | "crm-messages" | "surveys" | "interactive" | "campaign-roi"
  | "sales-engines" | "smart-triggers" | "auto-pilot-preview" | "email-hub" | "cost-dashboard";

interface NavItem {
  id: Module;
  label: string;
  icon: React.ElementType;
  badge?: string;
  section: string;
  description?: string;
}

// WABB / Wati-style: minimal, clean groupings, soft pastel icons
const NAV_ITEMS: NavItem[] = [
  // Conversations
  { id: "inbox", label: "Inbox", icon: InboxIcon, section: "Conversations", description: "Live chats" },
  { id: "crm-messages", label: "CRM Messages", icon: MessageSquareText, section: "Conversations" },

  // Content
  { id: "templates", label: "Templates", icon: LayoutTemplate, section: "Content" },
  { id: "broadcasts", label: "Broadcasts", icon: Megaphone, section: "Content" },
  { id: "bulk-broadcaster", label: "Bulk Broadcaster Pro", icon: Sparkles, badge: "PRO", section: "Content", description: "All 11 verticals · Live Meta limits" },
  { id: "interactive", label: "Interactive", icon: MousePointer, section: "Content" },
  { id: "surveys", label: "Surveys", icon: ClipboardList, section: "Content" },

  // Automation
  { id: "smart-triggers", label: "Auto-Replies", icon: Zap, badge: "🔥", section: "Automation", description: "Trigger setup" },
  { id: "flows", label: "Flows", icon: Workflow, section: "Automation" },
  { id: "sales-engines", label: "Sales Engines", icon: Sparkles, section: "Automation" },
  { id: "auto-pilot-preview", label: "Auto-Pilot Preview", icon: Bot, badge: "NEW", section: "Automation", description: "Approve AI messages before send" },

  // Email (consolidated)
  { id: "email-hub", label: "Email Hub", icon: Mail, badge: "All-in-One", section: "Email" },

  // Insights
  { id: "cost-dashboard", label: "Cost & Spend", icon: Wallet, badge: "NEW", section: "Insights", description: "UTILITY vs MARKETING spend" },
  { id: "campaign-roi", label: "Campaign ROI", icon: TrendingUp, section: "Insights" },
  { id: "analytics", label: "Analytics", icon: BarChart3, section: "Insights" },

  // People
  { id: "contacts", label: "Contacts", icon: Users, section: "People" },
  { id: "team", label: "Team", icon: UsersRound, section: "People" },
];

export function WAHubLayout() {
  const [activeModule, setActiveModule] = useState<Module>("inbox");
  const [collapsed, setCollapsed] = useState(false);
  const [isConnected] = useState(true);

  const renderModule = () => {
    switch (activeModule) {
      case "inbox": return <WAHubInbox />;
      case "templates": return <WAHubTemplates />;
      case "broadcasts": return <WAHubBroadcasts />;
      case "bulk-broadcaster": return <WAHubBulkBroadcaster />;
      case "flows": return <WAHubFlows />;
      case "contacts": return <WAHubContacts />;
      case "analytics": return <WAHubAnalytics />;
      case "team": return <WAHubTeam />;
      case "crm-messages": return <WAHubCrmMessages />;
      case "surveys": return <WAHubSurveys />;
      case "interactive": return <WAHubInteractive />;
      case "campaign-roi": return <WAHubCampaignROI />;
      case "sales-engines": return <WAHubSalesEngines />;
      case "smart-triggers": return <WAHubSmartTriggers />;
      case "auto-pilot-preview": return <div className="h-full overflow-auto p-4"><WAHubAutoPilotPreview /></div>;
      case "email-hub": return <EmailMarketingHub />;
      case "cost-dashboard": return <WAHubCostDashboard />;
      default: return <WAHubInbox />;
    }
  };

  const activeItem = NAV_ITEMS.find((n) => n.id === activeModule);

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-muted/20">
      {/* Sidebar — WABB-style minimal */}
      <aside
        className={cn(
          "flex flex-col border-r bg-card transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        {/* Brand */}
        <div className="px-4 py-4 border-b flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0 shadow-sm">
            <MessageSquare className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm tracking-tight truncate">Comms Hub</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isConnected ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-muted-foreground font-medium">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-destructive" />
                    <span className="text-[10px] text-destructive font-medium">Offline</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <nav className="flex-1 py-3 px-2 overflow-y-auto">
            {(() => {
              let lastSection = "";
              return NAV_ITEMS.map((item) => {
                const isActive = activeModule === item.id;
                const showSection = item.section && item.section !== lastSection;
                if (item.section) lastSection = item.section;
                return (
                  <div key={item.id}>
                    {showSection && !collapsed && (
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 px-3 pt-4 pb-1.5 first:pt-1">
                        {item.section}
                      </p>
                    )}
                    {showSection && collapsed && lastSection !== "Conversations" && (
                      <div className="my-2 mx-3 border-t border-border/40" />
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setActiveModule(item.id)}
                          className={cn(
                            "group w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all relative",
                            isActive
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            collapsed && "justify-center px-2",
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-emerald-500" />
                          )}
                          <item.icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 transition-colors",
                              isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/70 group-hover:text-foreground",
                            )}
                            strokeWidth={isActive ? 2.25 : 1.75}
                          />
                          {!collapsed && (
                            <>
                              <span className="truncate text-[13px] flex-1 text-left">{item.label}</span>
                              {item.badge && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1.5 text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-0"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </>
                          )}
                        </button>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right" className="font-medium text-xs">
                          {item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                );
              });
            })()}
          </nav>
        </TooltipProvider>

        {/* Collapse Toggle */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center h-8 text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : (
              <span className="flex items-center gap-2 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" /> Collapse
              </span>
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header — clean, ample whitespace */}
        <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {activeItem && (
              <>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <activeItem.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm leading-tight truncate">{activeItem.label}</h3>
                  {activeItem.description && (
                    <p className="text-[11px] text-muted-foreground leading-tight truncate">
                      {activeItem.description}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search…" className="pl-9 h-9 w-56 text-xs bg-muted/50 border-0 focus-visible:ring-1" />
            </div>
            <Badge variant="outline" className="text-[10px] gap-1.5 h-7 px-2.5 font-medium hidden sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              +91 95772 00023
            </Badge>
          </div>
        </header>

        {/* Module Content */}
        <main className="flex-1 overflow-auto bg-muted/10">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}
