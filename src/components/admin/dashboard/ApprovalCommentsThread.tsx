import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, History } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  approvalId: string;
}

export function ApprovalCommentsThread({ approvalId }: Props) {
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["approval-comments", approvalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_comments")
        .select("*")
        .eq("approval_id", approvalId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("approval_comments").insert({
        approval_id: approvalId,
        author_id: u.user?.id,
        author_name: u.user?.email || "User",
        comment: comment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["approval-comments", approvalId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to add comment"),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <History className="h-3 w-3" />
        Status history & comments
      </div>
      <div className="border rounded-lg bg-muted/20 max-h-[200px] overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2 italic">
            No comments yet — add the first one below.
          </p>
        ) : (
          items.map((c: any) => (
            <div key={c.id} className="text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold">{c.author_name}</span>
                {c.status_change && (
                  <Badge variant="outline" className="text-[9px] py-0">
                    → {c.status_change}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>
              {c.comment && (
                <p className="text-foreground mt-0.5 whitespace-pre-wrap">{c.comment}</p>
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          placeholder="Add a comment…"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="text-sm"
        />
        <Button
          size="sm"
          onClick={() => addMutation.mutate()}
          disabled={addMutation.isPending || !comment.trim()}
        >
          <Send className="h-3 w-3 mr-1" /> Post
        </Button>
      </div>
    </div>
  );
}

export default ApprovalCommentsThread;
