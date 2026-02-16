import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, CheckCircle2, Clock, AlertTriangle, Circle, Calendar } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_ICONS: Record<string, any> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

export function InsuranceTasksManager() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["ins-tasks", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("insurance_tasks")
        .select("*, insurance_clients(customer_name, phone)")
        .order("due_date", { ascending: true })
        .limit(100);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["ins-clients-for-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone")
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("insurance_tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-tasks"] });
      toast.success("Task updated");
    },
  });

  const addTask = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("insurance_tasks").insert({
        client_id: form.client_id || null,
        title: form.title,
        description: form.description || null,
        task_type: form.task_type,
        priority: form.priority || "medium",
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        assigned_name: form.assigned_name || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ins-tasks"] });
      toast.success("Task created");
      setShowAdd(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Title *</Label><Input id="t-title" /></div>
              <div>
                <Label className="text-xs">Type *</Label>
                <Select>
                  <SelectTrigger id="t-type"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="renewal_call">Renewal Call</SelectItem>
                    <SelectItem value="document_collection">Document Collection</SelectItem>
                    <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                    <SelectItem value="claim_assist">Claim Assist</SelectItem>
                    <SelectItem value="cross_sell">Cross Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Medium" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Due Date</Label><Input type="date" id="t-due" /></div>
              </div>
              <div>
                <Label className="text-xs">Client</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.customer_name || c.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Description</Label><Textarea id="t-desc" rows={2} /></div>
              <Button className="w-full" onClick={() => {
                const title = (document.getElementById("t-title") as HTMLInputElement)?.value;
                if (!title) return toast.error("Title required");
                addTask.mutate({ title, task_type: "follow_up", priority: "medium" });
              }}>Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
        ) : tasks?.map((t: any) => {
          const Icon = STATUS_ICONS[t.status] || Circle;
          const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed";
          return (
            <Card key={t.id} className={`hover:shadow-sm transition-all ${isOverdue ? "border-destructive/50" : ""}`}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateTask.mutate({
                      id: t.id,
                      status: t.status === "completed" ? "pending" : t.status === "pending" ? "in_progress" : "completed"
                    })}
                    className="shrink-0"
                  >
                    <Icon className={`h-5 w-5 ${t.status === "completed" ? "text-green-500" : isOverdue ? "text-destructive" : "text-muted-foreground"}`} />
                  </button>
                  <div>
                    <p className={`text-sm font-medium ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.insurance_clients?.customer_name && (
                        <span className="text-[10px] text-muted-foreground">{t.insurance_clients.customer_name}</span>
                      )}
                      <Badge className={`${PRIORITY_COLORS[t.priority] || ""} text-[9px] border-0 py-0`}>{t.priority}</Badge>
                      <Badge variant="outline" className="text-[9px] py-0 capitalize">{t.task_type?.replace("_", " ")}</Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {t.due_date && (
                    <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      <Calendar className="h-3 w-3" />
                      {new Date(t.due_date).toLocaleDateString("en-IN")}
                    </span>
                  )}
                  {t.is_automated && <Badge variant="outline" className="text-[9px] mt-0.5">Auto</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!tasks || !tasks.length) && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
        )}
      </div>
    </div>
  );
}
