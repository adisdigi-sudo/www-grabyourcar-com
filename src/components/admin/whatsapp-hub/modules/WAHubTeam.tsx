import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, UserPlus, Shield, Clock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TeamAgent {
  id: string;
  name: string;
  email: string;
  role: string;
  activeChats: number;
  avgResponseTime: string;
}

export function WAHubTeam() {
  const [agents, setAgents] = useState<TeamAgent[]>([]);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const { data } = await supabase.from("crm_users").select("*").limit(20);
    if (data) {
      setAgents(data.map((u: any) => ({
        id: u.id,
        name: u.full_name || u.email?.split("@")[0] || "Agent",
        email: u.email || "",
        role: u.role || "agent",
        activeChats: 0,
        avgResponseTime: "~2min",
      })));
    }
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-rose-500" /> Team Inbox
          </h2>
          <p className="text-sm text-muted-foreground">Manage agents and assignment rules</p>
        </div>
        <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Add Agent</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Agents", value: agents.length, icon: Users, color: "text-blue-500" },
          { label: "Online Now", value: agents.length, icon: Shield, color: "text-green-500" },
          { label: "Avg Response", value: "~2m", icon: Clock, color: "text-amber-500" },
          { label: "Active Chats", value: 0, icon: MessageSquare, color: "text-purple-500" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Agents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {agents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No agents found</div>
            ) : agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0 hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-green-100 text-green-700 text-xs font-bold">
                      {agent.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px]">{agent.role}</Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    <MessageSquare className="h-3 w-3 mr-1" />{agent.activeChats} chats
                  </Badge>
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
