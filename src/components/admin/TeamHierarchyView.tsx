import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, ChevronDown, ChevronRight, User } from "lucide-react";

interface TeamMemberNode {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  role_tier: string | null;
  reporting_to: string | null;
  is_active: boolean;
  designation: string | null;
  department: string | null;
  phone: string | null;
  roles: { role: string }[];
  children: TeamMemberNode[];
}

const tierColors: Record<string, string> = {
  manager: "bg-teal-500/10 text-teal-700 border-teal-200",
  team_leader: "bg-orange-500/10 text-orange-700 border-orange-200",
  caller: "bg-blue-500/10 text-blue-700 border-blue-200",
};

const tierLabels: Record<string, string> = {
  manager: "Manager",
  team_leader: "Team Leader",
  caller: "Caller / Executive",
};

const HierarchyNode = ({ node, depth = 0 }: { node: TeamMemberNode; depth?: number }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="w-full">
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${!node.is_active ? "opacity-50" : ""}`}
        style={{ marginLeft: `${depth * 32}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{node.display_name}</span>
            <Badge variant="outline" className={`text-xs ${tierColors[node.role_tier || "caller"]}`}>
              {tierLabels[node.role_tier || "caller"]}
            </Badge>
            {!node.is_active && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">
            {node.designation && <span>{node.designation}</span>}
            {node.designation && node.department && <span> · </span>}
            {node.department && <span>{node.department}</span>}
          </div>
        </div>
        {hasChildren && (
          <Badge variant="secondary" className="text-xs">{node.children.length} reports</Badge>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map(child => (
            <HierarchyNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const TeamHierarchyView = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["team-hierarchy"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list_users" },
      });
      if (res.error) throw res.error;
      return res.data?.users || [];
    },
  });

  const buildTree = (members: any[]): TeamMemberNode[] => {
    const map = new Map<string, TeamMemberNode>();
    members.forEach(m => {
      map.set(m.id, { ...m, children: [] });
    });

    const roots: TeamMemberNode[] = [];
    map.forEach(node => {
      if (node.reporting_to && map.has(node.reporting_to)) {
        map.get(node.reporting_to)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Sort: managers first, then team_leaders, then callers
    const tierOrder = { manager: 0, team_leader: 1, caller: 2 };
    const sortNodes = (nodes: TeamMemberNode[]) => {
      nodes.sort((a, b) => (tierOrder[a.role_tier as keyof typeof tierOrder] ?? 2) - (tierOrder[b.role_tier as keyof typeof tierOrder] ?? 2));
      nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(roots);
    return roots;
  };

  const tree = data ? buildTree(data) : [];
  const stats = {
    managers: (data || []).filter((m: any) => m.role_tier === "manager").length,
    teamLeaders: (data || []).filter((m: any) => m.role_tier === "team_leader").length,
    callers: (data || []).filter((m: any) => m.role_tier === "caller" || !m.role_tier).length,
    unassigned: (data || []).filter((m: any) => !m.reporting_to && m.role_tier !== "manager").length,
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Team Hierarchy</h2>
        <p className="text-muted-foreground text-sm">Organization structure: Manager → Team Leader → Caller (max 10 per level)</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-teal-600">{stats.managers}</div>
          <div className="text-xs text-muted-foreground">Managers</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.teamLeaders}</div>
          <div className="text-xs text-muted-foreground">Team Leaders</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.callers}</div>
          <div className="text-xs text-muted-foreground">Callers / Executives</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.unassigned}</div>
          <div className="text-xs text-muted-foreground">Unassigned</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Organization Tree</CardTitle></CardHeader>
        <CardContent>
          {tree.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No team members found. Create users and assign hierarchy in User Roles.</p>
          ) : (
            <div className="space-y-1">
              {tree.map(node => (
                <HierarchyNode key={node.id} node={node} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
