import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UserCheck, Users, Zap, History, Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LeadAssignmentPanelProps {
  leadIds: string[];
  verticalId?: string;
  onAssigned?: () => void;
  mode?: "single" | "bulk";
}

interface TeamMemberWithCount {
  user_id: string;
  display_name: string;
  username: string;
  designation: string | null;
  active_count: number;
}

export function LeadAssignmentPanel({ leadIds, verticalId, onAssigned, mode = "single" }: LeadAssignmentPanelProps) {
  const { user } = useAuth();
  const { activeVertical, isManagerInVertical } = useVerticalAccess();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<string>("");
  const effectiveVerticalId = verticalId || activeVertical?.id;

  // Fetch team members in this vertical with their active assignment counts
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["vertical-team-members", effectiveVerticalId],
    queryFn: async () => {
      if (!effectiveVerticalId) return [];

      const { data: access, error: accessErr } = await supabase
        .from("user_vertical_access")
        .select("user_id")
        .eq("vertical_id", effectiveVerticalId);
      if (accessErr) throw accessErr;

      const userIds = access?.map(a => a.user_id) || [];
      if (!userIds.length) return [];

      const { data: members, error: memberErr } = await supabase
        .from("team_members")
        .select("user_id, display_name, username, designation")
        .in("user_id", userIds)
        .eq("is_active", true);
      if (memberErr) throw memberErr;

      // Get active assignment counts
      const { data: counts } = await supabase
        .from("lead_assignments")
        .select("assigned_to_user_id")
        .eq("vertical_id", effectiveVerticalId)
        .eq("status", "active");

      const countMap: Record<string, number> = {};
      (counts || []).forEach(c => {
        countMap[c.assigned_to_user_id] = (countMap[c.assigned_to_user_id] || 0) + 1;
      });

      return (members || []).map(m => ({
        ...m,
        active_count: countMap[m.user_id] || 0,
      })) as TeamMemberWithCount[];
    },
    enabled: !!effectiveVerticalId,
  });

  // Fetch assignment history for single lead
  const { data: assignmentHistory = [] } = useQuery({
    queryKey: ["lead-assignment-history", leadIds[0]],
    queryFn: async () => {
      if (!leadIds[0]) return [];
      const { data, error } = await supabase
        .from("lead_assignments")
        .select("*")
        .eq("lead_id", leadIds[0])
        .order("assigned_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: mode === "single" && leadIds.length === 1,
  });

  // Manual assign mutation
  const assignMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      for (const leadId of leadIds) {
        // Deactivate old assignments
        await supabase
          .from("lead_assignments")
          .update({ status: "reassigned" })
          .eq("lead_id", leadId)
          .eq("status", "active");

        // Insert new
        const { error } = await supabase
          .from("lead_assignments")
          .insert({
            lead_id: leadId,
            assigned_to_user_id: targetUserId,
            assigned_by_user_id: user?.id,
            vertical_id: effectiveVerticalId,
            assignment_type: "manual",
            status: "active",
          });
        if (error) throw error;

        // Update lead
        await supabase.from("leads").update({ assigned_to: targetUserId }).eq("id", leadId);
      }
    },
    onSuccess: () => {
      const member = teamMembers.find(m => m.user_id === selectedMember);
      toast.success(`${leadIds.length} lead(s) assigned to ${member?.display_name || "team member"}`);
      queryClient.invalidateQueries({ queryKey: ["lead-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      queryClient.invalidateQueries({ queryKey: ["fresh-leads"] });
      queryClient.invalidateQueries({ queryKey: ["vertical-team-members"] });
      onAssigned?.();
    },
    onError: () => toast.error("Failed to assign leads"),
  });

  // Auto-assign round-robin mutation
  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveVerticalId) throw new Error("No vertical selected");
      for (const leadId of leadIds) {
        const { error } = await supabase.rpc("auto_assign_lead_round_robin", {
          p_vertical_id: effectiveVerticalId,
          p_lead_id: leadId,
          p_assigned_by: user?.id || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`${leadIds.length} lead(s) auto-assigned via round-robin`);
      queryClient.invalidateQueries({ queryKey: ["lead-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["adminLeads"] });
      queryClient.invalidateQueries({ queryKey: ["fresh-leads"] });
      queryClient.invalidateQueries({ queryKey: ["vertical-team-members"] });
      onAssigned?.();
    },
    onError: () => toast.error("Auto-assignment failed"),
  });

  const handleManualAssign = () => {
    if (!selectedMember) return toast.error("Select a team member");
    assignMutation.mutate(selectedMember);
  };

  if (!effectiveVerticalId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground">
          Select a vertical to assign leads
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Assign to Person */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Assign to Person {mode === "bulk" && `(${leadIds.length} leads)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger>
              <SelectValue placeholder="Select team member..." />
            </SelectTrigger>
            <SelectContent>
              {membersLoading ? (
                <SelectItem value="_loading" disabled>Loading...</SelectItem>
              ) : teamMembers.length === 0 ? (
                <SelectItem value="_none" disabled>No team members in this vertical</SelectItem>
              ) : (
                teamMembers.map(m => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    <div className="flex items-center gap-2">
                      <span>{m.display_name}</span>
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {m.active_count} active
                      </Badge>
                      {m.designation && (
                        <span className="text-[10px] text-muted-foreground">· {m.designation}</span>
                      )}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleManualAssign}
              disabled={!selectedMember || assignMutation.isPending}
              className="flex-1"
            >
              {assignMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
              Assign
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => autoAssignMutation.mutate()}
              disabled={autoAssignMutation.isPending || teamMembers.length === 0}
              className="flex-1"
            >
              {autoAssignMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
              Auto-Assign
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Workload */}
      {teamMembers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamMembers
                .sort((a, b) => a.active_count - b.active_count)
                .map(m => (
                  <div key={m.user_id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{m.display_name}</span>
                    <Badge variant={m.active_count === 0 ? "default" : "secondary"} className="text-[10px]">
                      {m.active_count} leads
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment History (single lead only) */}
      {mode === "single" && assignmentHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Assignment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-40">
              <div className="space-y-2">
                {assignmentHistory.map(h => {
                  const member = teamMembers.find(m => m.user_id === h.assigned_to_user_id);
                  return (
                    <div key={h.id} className="text-xs border-l-2 border-border pl-3 py-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{member?.display_name || "Unknown"}</span>
                        <Badge variant="outline" className="text-[9px]">{h.assignment_type}</Badge>
                        <Badge variant={h.status === "active" ? "default" : "secondary"} className="text-[9px]">{h.status}</Badge>
                      </div>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(h.assigned_at), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
