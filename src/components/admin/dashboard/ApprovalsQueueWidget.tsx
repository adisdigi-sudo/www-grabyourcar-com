import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck,
  Check,
  X,
  Clock,
  AlertTriangle,
  IndianRupee,
  Tag,
  RefreshCw,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRealtimeTable } from "@/hooks/useRealtimeSync";

type StatusFilter = "pending" | "approved" | "rejected" | "all";

const formatINR = (n?: number | null) =>
  n
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
    : "—";

const REQUEST_TYPE_META: Record<string, { label: string; icon: typeof Tag; color: string }> = {
  discount: { label: "Discount", icon: Tag, color: "bg-blue-100 text-blue-700 border-blue-300" },
  cancellation: { label: "Cancellation", icon: X, color: "bg-red-100 text-red-700 border-red-300" },
  refund: { label: "Refund", icon: IndianRupee, color: "bg-orange-100 text-orange-700 border-orange-300" },
  manual_override: { label: "Override", icon: AlertTriangle, color: "bg-purple-100 text-purple-700 border-purple-300" },
  policy_change: { label: "Policy Change", icon: FileText, color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  other: { label: "Other", icon: FileText, color: "bg-muted text-foreground border-border" },
};

const PRIORITY_META: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export function ApprovalsQueueWidget() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const queryClient = useQueryClient();

  useRealtimeTable("approvals_queue", ["approvals-queue"]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["approvals-queue", filter],
    queryFn: async () => {
      let q = supabase.from("approvals_queue").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const counts = useMemo(() => {
    return {
      pending: items.filter((i: any) => i.status === "pending").length,
      total: items.length,
    };
  }, [items]);

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: "approve" | "reject"; notes: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const userName = userData.user?.email || "Super Admin";
      const { error } = await supabase
        .from("approvals_queue")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          reviewed_by: userId,
          reviewed_by_name: userName,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === "approve" ? "Request approved" : "Request rejected");
      queryClient.invalidateQueries({ queryKey: ["approvals-queue"] });
      setReviewItem(null);
      setReviewAction(null);
      setReviewNotes("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });

  const openReview = (item: any, action: "approve" | "reject") => {
    setReviewItem(item);
    setReviewAction(action);
    setReviewNotes("");
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Approvals Queue
            {counts.pending > 0 && (
              <Badge className="ml-1 bg-red-500 text-white">{counts.pending} pending</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
              <TabsList className="h-8">
                <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="text-xs">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs">Rejected</TabsTrigger>
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["approvals-queue"] })}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading approvals…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
            <ShieldCheck className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No {filter === "all" ? "" : filter} approval requests</p>
            <p className="text-xs text-muted-foreground">
              {filter === "pending"
                ? "All caught up. Discounts, refunds, and overrides will appear here."
                : "Switch filter to see other requests."}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {items.map((item: any) => {
              const meta = REQUEST_TYPE_META[item.request_type] || REQUEST_TYPE_META.other;
              const Icon = meta.icon;
              return (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] py-0 ${meta.color}`}>
                          <Icon className="h-2.5 w-2.5 mr-1" />
                          {meta.label}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] py-0 ${PRIORITY_META[item.priority] || ""}`}>
                          {item.priority}
                        </Badge>
                        {item.vertical_name && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            {item.vertical_name}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                        {item.customer_name && <span>👤 {item.customer_name}</span>}
                        {item.customer_phone && <span>📱 {item.customer_phone}</span>}
                        {item.amount && (
                          <span className="font-semibold text-foreground">{formatINR(Number(item.amount))}</span>
                        )}
                        {item.requested_by_name && <span>by {item.requested_by_name}</span>}
                      </div>
                      {item.reason && (
                        <p className="text-[11px] mt-1 italic text-muted-foreground">"{item.reason}"</p>
                      )}
                      {item.status !== "pending" && item.review_notes && (
                        <p className="text-[11px] mt-1 px-2 py-1 bg-muted rounded">
                          <strong>{item.reviewed_by_name}:</strong> {item.review_notes}
                        </p>
                      )}
                    </div>
                    {item.status === "pending" && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => openReview(item, "approve")}
                        >
                          <Check className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => openReview(item, "reject")}
                        >
                          <X className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    {item.status === "approved" && (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        <Check className="h-3 w-3 mr-1" /> Approved
                      </Badge>
                    )}
                    {item.status === "rejected" && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        <X className="h-3 w-3 mr-1" /> Rejected
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === "approve" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )}
              {reviewAction === "approve" ? "Approve" : "Reject"} Request
            </DialogTitle>
          </DialogHeader>
          {reviewItem && (
            <div className="space-y-3">
              <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">{reviewItem.title}</p>
                {reviewItem.description && <p className="text-xs text-muted-foreground">{reviewItem.description}</p>}
                <div className="flex items-center gap-2 text-xs flex-wrap pt-1">
                  {reviewItem.customer_name && <span>👤 {reviewItem.customer_name}</span>}
                  {reviewItem.amount && (
                    <span className="font-semibold">{formatINR(Number(reviewItem.amount))}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">
                  {reviewAction === "approve" ? "Approval notes (optional)" : "Rejection reason"}
                </label>
                <Textarea
                  placeholder={
                    reviewAction === "approve"
                      ? "e.g. Approved as one-time exception"
                      : "Why is this being rejected?"
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewItem(null)}>
              Cancel
            </Button>
            <Button
              className={
                reviewAction === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
              disabled={reviewMutation.isPending || (reviewAction === "reject" && !reviewNotes.trim())}
              onClick={() => {
                if (!reviewItem || !reviewAction) return;
                reviewMutation.mutate({ id: reviewItem.id, action: reviewAction, notes: reviewNotes });
              }}
            >
              {reviewMutation.isPending ? "Saving…" : reviewAction === "approve" ? "Confirm Approve" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
