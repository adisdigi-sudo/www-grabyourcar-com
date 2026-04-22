import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShieldCheck, Send } from "lucide-react";
import { toast } from "sonner";

const PRIORITIES = ["low", "medium", "high", "critical"];

export function RequestApprovalDialog({
  defaultTitle = "",
  buttonLabel = "Request Approval",
  buttonVariant = "outline",
  area = "marketing_tech",
}: {
  defaultTitle?: string;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost";
  area?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("medium");
  const [amount, setAmount] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("approvals_queue").insert({
        request_type: "marketing_tech",
        vertical_name: area,
        title: title.trim(),
        description: description || null,
        reason: reason || null,
        amount: amount ? Number(amount) : null,
        priority,
        status: "pending",
        requested_by: u.user?.id,
        requested_by_name: u.user?.email || "User",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Approval request submitted");
      setOpen(false);
      setTitle(defaultTitle);
      setDescription("");
      setReason("");
      setAmount("");
    },
    onError: (e: any) => toast.error(e.message || "Submission failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Submit Marketing & Tech Approval
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              placeholder="e.g. Launch Diwali Meta campaign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder="What is being requested?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Budget / Amount (₹)</Label>
              <Input
                type="number"
                placeholder="optional"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Justification</Label>
            <Textarea
              placeholder="Why is this needed?"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || !title.trim()}>
            <Send className="h-3.5 w-3.5 mr-1" />
            {submitMutation.isPending ? "Submitting…" : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RequestApprovalDialog;
