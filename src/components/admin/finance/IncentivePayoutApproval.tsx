import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CheckCircle2, XCircle, Clock, IndianRupee, Download, Send, Eye, Calculator
} from "lucide-react";

const fmt = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  paid: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

export const IncentivePayoutApproval = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currentMonth = format(new Date(), "yyyy-MM");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showDetail, setShowDetail] = useState<any>(null);

  // Fetch payouts
  const { data: payouts = [] } = useQuery({
    queryKey: ["incentive-payouts", selectedMonth],
    queryFn: async () => {
      const { data, error } = await (supabase.from("incentive_payouts") as any)
        .select("*").eq("month_year", selectedMonth).order("employee_name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch summaries to generate payouts
  const { data: summaries = [] } = useQuery({
    queryKey: ["incentive-summaries-payout", selectedMonth],
    queryFn: async () => {
      const { data, error } = await (supabase.from("incentive_monthly_summary") as any)
        .select("*").eq("month_year", selectedMonth).in("status", ["approved", "calculated"]);
      if (error) throw error;
      return data || [];
    },
  });

  // Generate payouts from approved summaries
  const generatePayouts = useMutation({
    mutationFn: async () => {
      // Group summaries by user
      const byUser: Record<string, any[]> = {};
      for (const s of summaries) {
        if (!byUser[s.user_id]) byUser[s.user_id] = [];
        byUser[s.user_id].push(s);
      }

      const payoutRecords = Object.entries(byUser).map(([userId, userSummaries]) => ({
        user_id: userId,
        employee_name: userSummaries[0].employee_name,
        vertical_name: userSummaries.map((s: any) => s.vertical_name).join(", "),
        month_year: selectedMonth,
        total_incentive: userSummaries.reduce((s: number, su: any) => s + Number(su.total_incentive || 0), 0),
        bonus_amount: userSummaries.reduce((s: number, su: any) => s + Number(su.slab_bonus || 0), 0),
        deductions: 0,
        net_payout: userSummaries.reduce((s: number, su: any) => s + Number(su.total_incentive || 0), 0),
        status: "pending",
      }));

      for (const p of payoutRecords) {
        const { error } = await (supabase.from("incentive_payouts") as any).upsert(p, { onConflict: "id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incentive-payouts"] });
      toast.success("Payouts generated for approval");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Approve/Reject payout
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from("incentive_payouts") as any).update({
        status,
        approved_by: user?.id,
        approved_at: status === "approved" ? new Date().toISOString() : null,
        paid_at: status === "paid" ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incentive-payouts"] });
      toast.success("Payout status updated");
    },
  });

  const totalPending = payouts.filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + Number(p.net_payout || 0), 0);
  const totalApproved = payouts.filter((p: any) => p.status === "approved").reduce((s: number, p: any) => s + Number(p.net_payout || 0), 0);
  const totalPaid = payouts.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.net_payout || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Incentive Payout Approval</h2>
          <p className="text-sm text-muted-foreground">Review and approve monthly payouts</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={() => generatePayouts.mutate()}>
            <Calculator className="h-4 w-4 mr-2" /> Generate Payouts
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> Pending</div>
            <p className="text-2xl font-bold text-yellow-600">{fmt(totalPending)}</p>
            <p className="text-xs text-muted-foreground">{payouts.filter((p: any) => p.status === "pending").length} employees</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Approved</div>
            <p className="text-2xl font-bold text-green-600">{fmt(totalApproved)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><IndianRupee className="h-4 w-4" /> Paid</div>
            <p className="text-2xl font-bold text-emerald-600">{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Verticals</TableHead>
                <TableHead>Incentive</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Net Payout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.employee_name}</TableCell>
                  <TableCell className="text-sm">{p.vertical_name}</TableCell>
                  <TableCell>{fmt(p.total_incentive)}</TableCell>
                  <TableCell>{fmt(p.bonus_amount)}</TableCell>
                  <TableCell className="font-bold">{fmt(p.net_payout)}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[p.status] || "bg-gray-100 text-gray-800"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.status === "pending" && (
                        <>
                          <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: p.id, status: "approved" })}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: p.id, status: "rejected" })}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {p.status === "approved" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: p.id, status: "paid" })}>
                          <IndianRupee className="h-3.5 w-3.5 mr-1" /> Mark Paid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {payouts.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No payouts for {selectedMonth}. Click "Generate Payouts" to create from approved incentives.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncentivePayoutApproval;
