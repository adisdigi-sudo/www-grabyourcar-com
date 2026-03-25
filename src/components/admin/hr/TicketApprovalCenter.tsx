import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Clock, Search, Filter, MessageSquare } from "lucide-react";

export const TicketApprovalCenter = () => {
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useAdminAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [actionDialog, setActionDialog] = useState<any>(null);
  const [remarks, setRemarks] = useState("");

  const isHROrAdmin = isAdmin() || isSuperAdmin();

  // Fetch tickets: managers see their team's, admins see all
  const { data: tickets = [] } = useQuery({
    queryKey: ["approval-tickets", user?.id],
    queryFn: async () => {
      let query = (supabase.from("employee_tickets") as any).select("*").order("created_at", { ascending: false });
      // Non-admins only see tickets assigned to them as manager
      if (!isHROrAdmin) {
        query = query.eq("manager_user_id", user?.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await (supabase.from("employee_tickets") as any).update({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval-tickets"] });
      toast.success("Ticket updated!");
      setActionDialog(null);
      setRemarks("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAction = (ticket: any, action: string, role: "manager" | "hr") => {
    const updates: any = {};
    if (role === "manager") {
      updates.manager_action = action;
      updates.manager_action_at = new Date().toISOString();
      updates.manager_remarks = remarks;
      updates.status = action === "approved" ? "manager_approved" : "rejected";
    } else {
      updates.hr_action = action;
      updates.hr_action_at = new Date().toISOString();
      updates.hr_remarks = remarks;
      updates.hr_user_id = user?.id;
      updates.status = action === "approved" ? "hr_approved" : "rejected";
      if (action === "approved") {
        updates.resolved_by = user?.id;
        updates.resolved_at = new Date().toISOString();
        updates.status = "resolved";
      }
    }
    updateTicket.mutate({ id: ticket.id, updates });
  };

  const pending = tickets.filter((t: any) => t.status === "pending");
  const managerApproved = tickets.filter((t: any) => t.status === "manager_approved");
  const resolved = tickets.filter((t: any) => ["resolved", "hr_approved", "rejected"].includes(t.status));

  const statusColor = (s: string) => {
    if (s === "resolved" || s === "hr_approved") return "bg-green-100 text-green-800";
    if (s === "manager_approved") return "bg-blue-100 text-blue-800";
    if (s === "rejected") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const renderTicketCard = (t: any) => {
    const canManagerApprove = t.status === "pending" && t.manager_user_id === user?.id;
    const canHRApprove = t.status === "manager_approved" && isHROrAdmin;

    return (
      <Card key={t.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{t.ticket_type.replace("_", " ")}</Badge>
              <span className="font-semibold text-sm">{t.subject}</span>
            </div>
            <Badge className={statusColor(t.status)}>{t.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t.employee_name}</p>
          {t.description && <p className="text-sm mt-1">{t.description}</p>}
          {t.leave_start_date && (
            <p className="text-xs text-muted-foreground mt-1">
              📅 {format(new Date(t.leave_start_date), "dd MMM")} — {format(new Date(t.leave_end_date || t.leave_start_date), "dd MMM")} · {t.leave_days} day(s) · {t.leave_type}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {canManagerApprove && (
              <>
                <Button size="sm" variant="default" onClick={() => setActionDialog({ ticket: t, role: "manager", action: "approved" })}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setActionDialog({ ticket: t, role: "manager", action: "rejected" })}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
              </>
            )}
            {canHRApprove && (
              <>
                <Button size="sm" variant="default" onClick={() => setActionDialog({ ticket: t, role: "hr", action: "approved" })}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> HR Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setActionDialog({ ticket: t, role: "hr", action: "rejected" })}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> HR Reject
                </Button>
              </>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{format(new Date(t.created_at), "dd MMM yyyy HH:mm")}</span>
          </div>
          {t.manager_action && (
            <p className="text-xs mt-2 text-muted-foreground">
              👤 Manager: <Badge variant="outline" className="text-xs">{t.manager_action}</Badge> {t.manager_remarks && `— "${t.manager_remarks}"`}
            </p>
          )}
          {t.hr_action && (
            <p className="text-xs mt-1 text-muted-foreground">
              🏢 HR: <Badge variant="outline" className="text-xs">{t.hr_action}</Badge> {t.hr_remarks && `— "${t.hr_remarks}"`}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const filteredTickets = (list: any[]) =>
    list.filter((t: any) => !search || t.employee_name?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Ticket & Approval Center</h2>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{managerApproved.length}</p>
          <p className="text-xs text-muted-foreground">Awaiting HR</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{resolved.length}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="awaiting_hr">Awaiting HR ({managerApproved.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
          <TabsTrigger value="all">All ({tickets.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 space-y-3">{filteredTickets(pending).map(renderTicketCard)}</TabsContent>
        <TabsContent value="awaiting_hr" className="mt-4 space-y-3">{filteredTickets(managerApproved).map(renderTicketCard)}</TabsContent>
        <TabsContent value="resolved" className="mt-4 space-y-3">{filteredTickets(resolved).map(renderTicketCard)}</TabsContent>
        <TabsContent value="all" className="mt-4 space-y-3">{filteredTickets(tickets).map(renderTicketCard)}</TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setRemarks(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "approved" ? "Approve" : "Reject"} Ticket — {actionDialog?.role === "manager" ? "Manager" : "HR"} Action
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label>Remarks (optional)</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add your remarks..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant={actionDialog?.action === "approved" ? "default" : "destructive"}
              onClick={() => actionDialog && handleAction(actionDialog.ticket, actionDialog.action, actionDialog.role)}
            >
              {actionDialog?.action === "approved" ? "Confirm Approve" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketApprovalCenter;
