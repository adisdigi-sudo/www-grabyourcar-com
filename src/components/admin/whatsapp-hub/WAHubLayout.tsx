import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare, LayoutTemplate, Megaphone, Bot, Users, BarChart3,
  UsersRound, ChevronLeft, ChevronRight, Wifi, WifiOff, Search,
  Settings, Workflow
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Module imports
import { WAHubInbox } from "./modules/WAHubInbox";
import { WAHubTemplates } from "./modules/WAHubTemplates";
import { WAHubBroadcasts } from "./modules/WAHubBroadcasts";
import { WAHubFlows } from "./modules/WAHubFlows";
import { WAHubContacts } from "./modules/WAHubContacts";
import { WAHubAnalytics } from "./modules/WAHubAnalytics";
import { WAHubTeam } from "./modules/WAHubTeam";
import { WAHubCrmMessages } from "./modules/WAHubCrmMessages";

type Module = "inbox" | "templates" | "broadcasts" | "flows" | "contacts" | "analytics" | "team" | "crm-messages";

interface NavItem {
  id: Module;
  label: string;
  icon: React.ElementType;
  badge?: number;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "inbox", label: "Inbox", icon: MessageSquare, color: "text-green-500" },
  { id: "templates", label: "Templates", icon: LayoutTemplate, color: "text-blue-500" },
  { id: "broadcasts", label: "Broadcasts", icon: Megaphone, color: "text-orange-500" },
  { id: "flows", label: "Flows", icon: Workflow, color: "text-purple-500" },
  { id: "contacts", label: "Contacts", icon: Users, color: "text-cyan-500" },
  { id: "analytics", label: "Analytics", icon: BarChart3, color: "text-amber-500" },
  { id: "team", label: "Team", icon: UsersRound, color: "text-rose-500" },
];

export function WAHubLayout() {
  const [activeModule, setActiveModule] = useState<Module>("inbox");
  const [collapsed, setCollapsed] = useState(false);
  const [isConnected] = useState(true); // Meta connection status

  const renderModule = () => {
    switch (activeModule) {
      case "inbox": return <WAHubInbox />;
      case "templates": return <WAHubTemplates />;
      case "broadcasts": return <WAHubBroadcasts />;
      case "flows": return <WAHubFlows />;
      case "contacts": return <WAHubContacts />;
      case "analytics": return <WAHubAnalytics />;
      case "team": return <WAHubTeam />;
      default: return <WAHubInbox />;
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background">
      {/* Sidebar */}
      <div className={cn(
        "flex flex-col border-r bg-card transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-56"
      )}>
        {/* Logo / Header */}
        <div className="p-3 border-b flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-bold text-sm truncate">WhatsApp Hub</h2>
              <div className="flex items-center gap-1">
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="text-[10px] text-green-600 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-destructive" />
                    <span className="text-[10px] text-destructive font-medium">Disconnected</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <nav className="flex-1 py-2 px-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveModule(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-green-600/10 text-green-700 dark:text-green-400 border border-green-600/20"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive ? item.color : "")} />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {!collapsed && item.badge && item.badge > 0 && (
                        <Badge className="ml-auto h-5 px-1.5 text-[10px] bg-green-600 hover:bg-green-600">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>

        {/* Collapse Toggle */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <div className="h-12 border-b bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm">
              {NAV_ITEMS.find(n => n.id === activeModule)?.label}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-8 w-48 text-xs" />
            </div>
            <Badge variant="outline" className="text-[10px] gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
              +91 95772 00023
            </Badge>
          </div>
        </div>

        {/* Module Content */}
        <div className="flex-1 overflow-hidden">
          {renderModule()}
        </div>
      </div>
    </div>
  );
}
