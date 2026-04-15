import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReturnRequests, useUpdateReturnRequest, useReturnRules, useCreateReturnRule } from "@/hooks/useReturns";
import { RotateCcw, Package, CheckCircle2, XCircle, Clock, Truck, ClipboardCheck, Plus, Settings2, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: "bg-amber-500/20 text-amber-700", icon: Clock },
  approved: { color: "bg-blue-500/20 text-blue-700", icon: CheckCircle2 },
  pickup_scheduled: { color: "bg-purple-500/20 text-purple-700", icon: Truck },
  picked_up: { color: "bg-indigo-500/20 text-indigo-700", icon: Package },
  qc_passed: { color: "bg-emerald-500/20 text-emerald-700", icon: ClipboardCheck },
  qc_failed: { color: "bg-red-500/20 text-red-700", icon: XCircle },
  refunded: { color: "bg-emerald-600/20 text-emerald-800", icon: CheckCircle2 },
  exchanged: { color: "bg-teal-500/20 text-teal-700", icon: ArrowUpDown },
  rejected: { color: "bg-destructive/20 text-destructive", icon: XCircle },
};

export const ReturnManagementPage = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: returns, isLoading } = useReturnRequests(statusFilter);
  const updateReturn = useUpdateReturnRequest();
  const { data: rules } = useReturnRules();
  const createRule = useCreateReturnRule();
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "", return_window_days: 7, require_media: false, auto_approve: false, exchange_allowed: true, refund_allowed: true,
  });

  const stats = {
    total: returns?.length || 0,
    pending: returns?.filter((r: any) => r.status === "pending").length || 0,
    approved: returns?.filter((r: any) => ["approved", "pickup_scheduled", "picked_up"].includes(r.status)).length || 0,
    completed: returns?.filter((r: any) => ["refunded", "exchanged"].includes(r.status)).length || 0,
  };

  const handleApprove = (id: string) => {
    updateReturn.mutate({ id, status: "approved" });
    toast.success("Return approved");
  };

  const handleReject = (id: string) => {
    updateReturn.mutate({ id, status: "rejected", rejected_reason: "Does not meet return policy" });
    toast.success("Return rejected");
  };

  const handleCreateRule = async () => {
    if (!newRule.name) { toast.error("Rule name required"); return; }
    await createRule.mutateAsync(newRule);
    setRuleDialogOpen(false);
    setNewRule({ name: "", return_window_days: 7, require_media: false, auto_approve: false, exchange_allowed: true, refund_allowed: true });
    toast.success("Return rule created");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Return Management</h1>
        <p className="text-muted-foreground">Manage returns, exchanges, refunds & return policies</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Returns", value: stats.total, icon: RotateCcw, color: "text-primary" },
          { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: "In Progress", value: stats.approved, icon: Truck, color: "text-blue-500" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests"><RotateCcw className="mr-1 h-4 w-4" />Return Requests</TabsTrigger>
          <TabsTrigger value="rules"><Settings2 className="mr-1 h-4 w-4" />Return Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "approved", "pickup_scheduled", "picked_up", "refunded", "rejected"].map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="capitalize">
                {s === "all" ? "All" : s.replace("_", " ")}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading returns...</div>
          ) : !returns?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RotateCcw className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No return requests found.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.map((r: any) => {
                    const cfg = statusConfig[r.status] || statusConfig.pending;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.ecommerce_orders?.order_number || "—"}</TableCell>
                        <TableCell>{r.contact_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{r.type}</Badge></TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                        <TableCell><Badge className={cfg.color}>{r.status.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "MMM d")}</TableCell>
                        <TableCell>
                          {r.status === "pending" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleApprove(r.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                              <Button size="sm" variant="outline" onClick={() => handleReject(r.id)} className="text-destructive"><XCircle className="h-3 w-3" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Add Rule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Return Rule</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Rule Name</Label><Input value={newRule.name} onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))} placeholder="Standard Return Policy" /></div>
                  <div><Label>Return Window (days)</Label><Input type="number" value={newRule.return_window_days} onChange={(e) => setNewRule((p) => ({ ...p, return_window_days: parseInt(e.target.value) || 7 }))} /></div>
                  <div className="flex items-center justify-between"><Label>Require Photo/Video</Label><Switch checked={newRule.require_media} onCheckedChange={(v) => setNewRule((p) => ({ ...p, require_media: v }))} /></div>
                  <div className="flex items-center justify-between"><Label>Auto-Approve</Label><Switch checked={newRule.auto_approve} onCheckedChange={(v) => setNewRule((p) => ({ ...p, auto_approve: v }))} /></div>
                  <div className="flex items-center justify-between"><Label>Allow Exchange</Label><Switch checked={newRule.exchange_allowed} onCheckedChange={(v) => setNewRule((p) => ({ ...p, exchange_allowed: v }))} /></div>
                  <div className="flex items-center justify-between"><Label>Allow Refund</Label><Switch checked={newRule.refund_allowed} onCheckedChange={(v) => setNewRule((p) => ({ ...p, refund_allowed: v }))} /></div>
                  <Button onClick={handleCreateRule} disabled={createRule.isPending} className="w-full">
                    {createRule.isPending ? "Creating..." : "Create Rule"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!rules?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">No return rules configured. Add your first rule to automate return workflows.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule: any) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{rule.name}</h3>
                      <Badge variant={rule.is_active ? "default" : "outline"}>{rule.is_active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Window</span><span className="font-medium">{rule.return_window_days} days</span></div>
                      <div className="flex justify-between p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Auto-Approve</span><span className="font-medium">{rule.auto_approve ? "Yes" : "No"}</span></div>
                      <div className="flex justify-between p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Media Required</span><span className="font-medium">{rule.require_media ? "Yes" : "No"}</span></div>
                      <div className="flex justify-between p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Exchange</span><span className="font-medium">{rule.exchange_allowed ? "Yes" : "No"}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
