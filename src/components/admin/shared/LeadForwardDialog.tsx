import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Send, ArrowRight, Clock, CheckCircle2, History } from "lucide-react";

interface LeadForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadTable: string;
  leadName: string;
  leadPhone: string;
  currentVerticalId?: string;
}

export function LeadForwardDialog({
  open, onOpenChange, leadId, leadTable, leadName, leadPhone, currentVerticalId,
}: LeadForwardDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [targetVertical, setTargetVertical] = useState("");
  const [taskNote, setTaskNote] = useState("");

  const { data: verticals = [] } = useQuery({
    queryKey: ["forward-verticals"],
    queryFn: async () => {
      const { data } = await supabase.from("business_verticals").select("id, name, slug").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: forwardHistory = [] } = useQuery({
    queryKey: ["lead-forward-history", leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_forwards")
        .select("*, lead_forward_history(*)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: open,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["forward-team-members"],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("id, name, user_id, email").eq("is_active", true);
      return data || [];
    },
  });

  const forwardMutation = useMutation({
    mutationFn: async () => {
      const targetV = verticals.find(v => v.id === targetVertical);
      const { data: forward, error } = await supabase.from("lead_forwards").insert({
        lead_id: leadId,
        lead_table: leadTable,
        lead_name: leadName,
        lead_phone: leadPhone,
        from_vertical_id: currentVerticalId || null,
        to_vertical_id: targetVertical,
        from_user_id: user?.id || "",
        from_user_name: user?.email?.split("@")[0] || "Unknown",
        task_note: taskNote,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Add history entry
      await supabase.from("lead_forward_history").insert({
        forward_id: forward.id,
        action: "forwarded",
        action_by: user?.id,
        action_by_name: user?.email?.split("@")[0] || "Unknown",
        details: `Forwarded to ${targetV?.name || "Unknown"}: ${taskNote}`,
      });

      return forward;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-forward-history"] });
      toast.success("Lead forwarded successfully! 🚀");
      onOpenChange(false);
      setTaskNote("");
      setTargetVertical("");
    },
    onError: () => toast.error("Failed to forward lead"),
  });

  const availableVerticals = verticals.filter(v => v.id !== currentVerticalId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Forward Lead to Another Team
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lead Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="font-medium">{leadName}</p>
            <p className="text-sm text-muted-foreground">{leadPhone}</p>
          </div>

          {/* Target Vertical */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Forward To</label>
            <Select value={targetVertical} onValueChange={setTargetVertical}>
              <SelectTrigger>
                <SelectValue placeholder="Select team/vertical" />
              </SelectTrigger>
              <SelectContent>
                {availableVerticals.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Task / Note for Team</label>
            <Textarea
              placeholder="E.g., Customer interested in car loan, already quoted insurance..."
              value={taskNote}
              onChange={e => setTaskNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Forward History */}
          {forwardHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <History className="h-4 w-4" /> Forward History
              </p>
              <ScrollArea className="max-h-40">
                <div className="space-y-2">
                  {forwardHistory.map((fw: any) => (
                    <div key={fw.id} className="border rounded-lg p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{fw.from_user_name} → {verticals.find(v => v.id === fw.to_vertical_id)?.name}</span>
                        <Badge variant={fw.status === "completed" ? "default" : "secondary"} className="text-[9px]">
                          {fw.status}
                        </Badge>
                      </div>
                      {fw.task_note && <p className="text-muted-foreground">{fw.task_note}</p>}
                      <p className="text-muted-foreground">{format(new Date(fw.created_at), "dd MMM yy, hh:mm a")}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => forwardMutation.mutate()}
            disabled={!targetVertical || forwardMutation.isPending}
          >
            <Send className="h-4 w-4 mr-1" />
            {forwardMutation.isPending ? "Forwarding..." : "Forward Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Badge component to show forwarding status on lead rows
export function ForwardedBadge({ leadId }: { leadId: string }) {
  const { data: forwards } = useQuery({
    queryKey: ["lead-forwards-badge", leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_forwards")
        .select("id, status, to_vertical_id, from_user_name, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1);
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: verticals = [] } = useQuery({
    queryKey: ["forward-verticals"],
    queryFn: async () => {
      const { data } = await supabase.from("business_verticals").select("id, name").eq("is_active", true);
      return data || [];
    },
    staleTime: 60000,
  });

  if (!forwards?.length) return null;

  const latest = forwards[0];
  const targetName = verticals.find(v => v.id === latest.to_vertical_id)?.name || "Team";

  return (
    <Badge variant="outline" className="text-[9px] border-primary/30 text-primary gap-1">
      <ArrowRight className="h-2.5 w-2.5" />
      Shared → {targetName}
      {latest.status === "pending" && <Clock className="h-2.5 w-2.5 text-yellow-500" />}
      {latest.status === "completed" && <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />}
    </Badge>
  );
}
