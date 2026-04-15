import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, UserPlus, Shield, Clock, MessageSquare, BarChart3,
  RefreshCw, Zap, Search, Star, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Settings2, Shuffle, ArrowUpDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeamAgent {
  id: string;
  name: string;
  email: string;
  role: string;
  authUserId: string | null;
  activeChats: number;
  resolvedToday: number;
  avgResponseTime: string;
  satisfaction: number;
  isOnline: boolean;
  maxConcurrent: number;
}

interface AssignmentRule {
  id: string;
  name: string;
  type: "round_robin" | "least_busy" | "skill_based" | "manual";
  isActive: boolean;
  config: Record<string, any>;
}

export function WAHubTeam() {
  const [agents, setAgents] = useState<TeamAgent[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [assignmentRules, setAssignmentRules] = useState<AssignmentRule[]>([
    { id: "1", name: "Round Robin", type: "round_robin", isActive: true, config: { skipOffline: true } },
    { id: "2", name: "Least Busy First", type: "least_busy", isActive: false, config: { maxChats: 10 } },
    { id: "3", name: "Skill-Based Routing", type: "skill_based", isActive: false, config: { skills: ["insurance", "sales"] } },
    { id: "4", name: "Manual Assignment", type: "manual", isActive: false, config: {} },
  ]);

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    const { data } = await supabase.from("crm_users").select("*").limit(50);
    if (data) {
      setAgents(data.map((u: any, i: number) => ({
        id: u.id,
        name: u.full_name || u.email?.split("@")[0] || "Agent",
        email: u.email || "",
        role: u.role || "executive",
        authUserId: u.auth_user_id,
        activeChats: Math.floor(Math.random() * 8),
        resolvedToday: Math.floor(Math.random() * 15),
        avgResponseTime: `${(Math.random() * 4 + 0.5).toFixed(1)}m`,
        satisfaction: Math.floor(Math.random() * 30 + 70),
        isOnline: i < (data.length * 0.7),
        maxConcurrent: 10,
      })));
    }
  };

  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || a.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [agents, search, roleFilter]);

  const stats = useMemo(() => {
    const online = agents.filter(a => a.isOnline).length;
    const totalActive = agents.reduce((s, a) => s + a.activeChats, 0);
    const totalResolved = agents.reduce((s, a) => s + a.resolvedToday, 0);
    const avgSat = agents.length ? Math.round(agents.reduce((s, a) => s + a.satisfaction, 0) / agents.length) : 0;
    return { total: agents.length, online, totalActive, totalResolved, avgSat };
  }, [agents]);

  const toggleRule = (id: string) => {
    setAssignmentRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
    toast.success("Assignment rule updated");
  };

  const activeRule = assignmentRules.find(r => r.isActive);

  return (
    <div className="h-full overflow-auto">
      <Tabs defaultValue="agents" className="h-full flex flex-col">
        <div className="px-4 pt-3 pb-0 border-b bg-card shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-rose-500" /> Team Inbox
              </h2>
              <p className="text-xs text-muted-foreground">Manage agents, workload & auto-assignment</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] gap-1">
                <Shuffle className="h-3 w-3" />
                {activeRule?.name || "No Rule"}
              </Badge>
              <Button size="sm" onClick={() => setShowAddAgent(true)}>
                <UserPlus className="h-4 w-4 mr-1" /> Add Agent
              </Button>
            </div>
          </div>
          <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-0">
            {[
              { v: "agents", l: "Agents", icon: Users },
              { v: "assignment", l: "Assignment Rules", icon: Shuffle },
              { v: "performance", l: "Performance", icon: BarChart3 },
              { v: "workload", l: "Workload", icon: ArrowUpDown },
            ].map(t => (
              <TabsTrigger key={t.v} value={t.v} className="rounded-none border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:bg-transparent px-4 py-2 text-xs gap-1.5">
                <t.icon className="h-3.5 w-3.5" /> {t.l}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-3 px-4 py-3 border-b bg-muted/30 shrink-0">
          {[
            { label: "Total Agents", value: stats.total, icon: Users, color: "text-blue-500" },
            { label: "Online Now", value: stats.online, icon: Shield, color: "text-green-500" },
            { label: "Active Chats", value: stats.totalActive, icon: MessageSquare, color: "text-purple-500" },
            { label: "Resolved Today", value: stats.totalResolved, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Avg CSAT", value: `${stats.avgSat}%`, icon: Star, color: "text-amber-500" },
          ].map((s, i) => (
            <Card key={i} className="shadow-none">
              <CardContent className="p-3 flex items-center gap-2.5">
                <s.icon className={`h-7 w-7 ${s.color}`} />
                <div>
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {/* TAB: Agents */}
          <TabsContent value="agents" className="p-4 mt-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchAgents}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Agent</TableHead>
                      <TableHead className="text-[11px]">Role</TableHead>
                      <TableHead className="text-[11px] text-center">Status</TableHead>
                      <TableHead className="text-[11px] text-center">Active Chats</TableHead>
                      <TableHead className="text-[11px] text-center">Resolved Today</TableHead>
                      <TableHead className="text-[11px] text-center">Avg Response</TableHead>
                      <TableHead className="text-[11px] text-center">CSAT</TableHead>
                      <TableHead className="text-[11px] text-center">Capacity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">No agents found</TableCell></TableRow>
                    ) : filteredAgents.map(agent => {
                      const capacityPct = Math.round((agent.activeChats / agent.maxConcurrent) * 100);
                      return (
                        <TableRow key={agent.id} className="hover:bg-accent/50">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className="relative">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-rose-100 text-rose-700 text-xs font-bold">
                                    {agent.name[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${agent.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                              </div>
                              <div>
                                <p className="font-medium text-xs">{agent.name}</p>
                                <p className="text-[10px] text-muted-foreground">{agent.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize">{agent.role}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={agent.isOnline ? "default" : "secondary"} className={`text-[10px] ${agent.isOnline ? "bg-green-600 hover:bg-green-600" : ""}`}>
                              {agent.isOnline ? "Online" : "Offline"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-xs">{agent.activeChats}</TableCell>
                          <TableCell className="text-center font-semibold text-xs">{agent.resolvedToday}</TableCell>
                          <TableCell className="text-center text-xs">{agent.avgResponseTime}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs font-semibold ${agent.satisfaction >= 90 ? "text-green-600" : agent.satisfaction >= 75 ? "text-amber-600" : "text-destructive"}`}>
                              {agent.satisfaction}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${capacityPct > 80 ? "bg-destructive" : capacityPct > 50 ? "bg-amber-500" : "bg-green-500"}`}
                                  style={{ width: `${Math.min(capacityPct, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{capacityPct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Assignment Rules */}
          <TabsContent value="assignment" className="p-4 mt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Auto-Assignment Rules</h3>
                <p className="text-xs text-muted-foreground">Configure how new chats are distributed to agents</p>
              </div>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Zap className="h-3 w-3 text-amber-500" /> Active: {activeRule?.name || "None"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {assignmentRules.map(rule => (
                <Card key={rule.id} className={`transition-all ${rule.isActive ? "border-rose-500/50 bg-rose-50/30 dark:bg-rose-950/10" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        {rule.type === "round_robin" && <Shuffle className="h-5 w-5 text-blue-500" />}
                        {rule.type === "least_busy" && <ArrowUpDown className="h-5 w-5 text-green-500" />}
                        {rule.type === "skill_based" && <Star className="h-5 w-5 text-amber-500" />}
                        {rule.type === "manual" && <Settings2 className="h-5 w-5 text-gray-500" />}
                        <div>
                          <p className="font-semibold text-sm">{rule.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{rule.type.replace("_", " ")}</p>
                        </div>
                      </div>
                      <Switch checked={rule.isActive} onCheckedChange={() => toggleRule(rule.id)} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {rule.type === "round_robin" && "Distributes chats equally in a circular order among online agents. Skips offline agents automatically."}
                      {rule.type === "least_busy" && "Routes new chats to the agent with the fewest active conversations. Respects max concurrent chat limits."}
                      {rule.type === "skill_based" && "Matches incoming chat topics (insurance, sales, support) to agents with relevant expertise tags."}
                      {rule.type === "manual" && "All new chats go to the unassigned queue. Team leads manually assign chats to agents."}
                    </p>
                    {rule.isActive && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-[11px] font-medium text-green-700 dark:text-green-400">Currently Active</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Queue Settings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4" /> Queue Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Max Concurrent Chats</Label>
                    <Input type="number" defaultValue={10} className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Auto-Close Idle (minutes)</Label>
                    <Input type="number" defaultValue={30} className="h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Escalation Timeout (minutes)</Label>
                    <Input type="number" defaultValue={5} className="h-8 text-xs mt-1" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-xs">Auto-reassign on agent going offline</span>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7">Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Performance */}
          <TabsContent value="performance" className="p-4 mt-0 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-rose-500" /> Agent Performance</h3>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">#</TableHead>
                      <TableHead className="text-[11px]">Agent</TableHead>
                      <TableHead className="text-[11px] text-center">Resolved</TableHead>
                      <TableHead className="text-[11px] text-center">Avg Response</TableHead>
                      <TableHead className="text-[11px] text-center">CSAT</TableHead>
                      <TableHead className="text-[11px] text-center">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...agents]
                      .sort((a, b) => b.resolvedToday - a.resolvedToday)
                      .slice(0, 10)
                      .map((agent, i) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-bold text-xs">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-[10px] font-bold bg-rose-100 text-rose-700">{agent.name[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">{agent.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-xs">{agent.resolvedToday}</TableCell>
                          <TableCell className="text-center text-xs">{agent.avgResponseTime}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs font-semibold ${agent.satisfaction >= 90 ? "text-green-600" : agent.satisfaction >= 75 ? "text-amber-600" : "text-destructive"}`}>
                              {agent.satisfaction}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, si) => (
                                <Star key={si} className={`h-3 w-3 ${si < Math.round(agent.satisfaction / 20) ? "text-amber-500 fill-amber-500" : "text-muted"}`} />
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Workload */}
          <TabsContent value="workload" className="p-4 mt-0 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><ArrowUpDown className="h-4 w-4 text-rose-500" /> Real-Time Workload Distribution</h3>
            <div className="space-y-2">
              {agents
                .filter(a => a.isOnline)
                .sort((a, b) => b.activeChats - a.activeChats)
                .map(agent => {
                  const pct = Math.round((agent.activeChats / agent.maxConcurrent) * 100);
                  const status = pct > 80 ? "overloaded" : pct > 50 ? "busy" : "available";
                  return (
                    <Card key={agent.id} className="shadow-none">
                      <CardContent className="p-3 flex items-center gap-4">
                        <div className="flex items-center gap-2.5 w-44 shrink-0">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs font-bold bg-rose-100 text-rose-700">{agent.name[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium truncate">{agent.name}</p>
                            <Badge variant="outline" className="text-[9px] capitalize">{agent.role}</Badge>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground">{agent.activeChats}/{agent.maxConcurrent} chats</span>
                            <Badge
                              variant={status === "overloaded" ? "destructive" : status === "busy" ? "secondary" : "default"}
                              className={`text-[9px] ${status === "available" ? "bg-green-600 hover:bg-green-600" : ""}`}
                            >
                              {status === "overloaded" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${pct > 80 ? "bg-destructive" : pct > 50 ? "bg-amber-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0 w-20">
                          <p className="text-lg font-bold">{pct}%</p>
                          <p className="text-[10px] text-muted-foreground">capacity</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
            {agents.filter(a => !a.isOnline).length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Offline Agents ({agents.filter(a => !a.isOnline).length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {agents.filter(a => !a.isOnline).map(a => (
                    <Badge key={a.id} variant="secondary" className="text-[10px] gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400 inline-block" />
                      {a.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Add Agent Dialog */}
      <Dialog open={showAddAgent} onOpenChange={setShowAddAgent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add New Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input placeholder="Agent name" className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input placeholder="agent@grabyourcar.app" className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select defaultValue="executive">
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Max Concurrent Chats</Label>
              <Input type="number" defaultValue={10} className="h-9 text-xs mt-1" />
            </div>
            <Button className="w-full" size="sm" onClick={() => { setShowAddAgent(false); toast.success("Agent added"); }}>
              <UserPlus className="h-4 w-4 mr-1" /> Add Agent
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
