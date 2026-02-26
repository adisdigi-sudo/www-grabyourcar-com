import { useState } from "react";
import { useCrmAccess } from "@/hooks/useCrmAccess";
import { useFinancialDashboard, useDealAging } from "@/hooks/useFinanceEngine";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, IndianRupee, TrendingUp, TrendingDown, AlertTriangle, Wallet } from "lucide-react";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, i);
  return { value: `2026-${String(i + 1).padStart(2, "0")}`, label: d.toLocaleString("default", { month: "long" }) + " 2026" };
});
// Add current year dynamically
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();
const monthOptions = Array.from({ length: 24 }, (_, i) => {
  const year = currentYear - 1 + Math.floor((i) / 12);
  const month = i % 12;
  const d = new Date(year, month);
  return {
    value: `${year}-${String(month + 1).padStart(2, "0")}`,
    label: d.toLocaleString("default", { month: "long", year: "numeric" }),
  };
});

export default function CrmFinance() {
  const { accessibleVerticals, isAdmin } = useCrmAccess();
  const [selectedVertical, setSelectedVertical] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const { data: dashData, isLoading: dashLoading } = useFinancialDashboard(
    selectedVertical || undefined,
    selectedMonth || undefined
  );
  const { data: agingData, isLoading: agingLoading } = useDealAging(selectedVertical || undefined);

  const perVertical = dashData?.per_vertical || {};
  const grand = dashData?.grand_totals || {};
  const deals = dashData?.deals || [];
  const expenses = dashData?.expenses || [];
  const agingBuckets = agingData?.aging_buckets || {};
  const overduePayments = agingData?.overdue_payments || [];
  const execCommReport = agingData?.executive_commission_report || {};

  const isLoading = dashLoading || agingLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
          <p className="text-sm text-muted-foreground">P&L, Deals, Commissions & Expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedVertical} onValueChange={(v) => setSelectedVertical(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Verticals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              {accessibleVerticals.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Grand Total Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard icon={IndianRupee} title="Deal Value" value={formatCurrency(grand.total_deal_value || 0)} />
            <MetricCard icon={TrendingDown} title="Dealer Payout" value={formatCurrency(grand.total_dealer_payout || 0)} variant="destructive" />
            <MetricCard icon={TrendingUp} title="Revenue Margin" value={formatCurrency(grand.total_revenue_margin || 0)} variant="success" />
            <MetricCard icon={Wallet} title="Commission" value={formatCurrency(grand.total_commission || 0)} />
            <MetricCard icon={AlertTriangle} title="Expenses" value={formatCurrency(grand.total_expenses || 0)} variant="destructive" />
            <MetricCard icon={TrendingUp} title="Net Profit" value={formatCurrency(grand.net_profit || 0)} variant={grand.net_profit >= 0 ? "success" : "destructive"} />
          </div>

          {/* Per Vertical Breakdown */}
          {Object.keys(perVertical).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Per Vertical P&L</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vertical</TableHead>
                      <TableHead className="text-right">Deal Value</TableHead>
                      <TableHead className="text-right">Dealer Payout</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(perVertical).map(([vn, v]: [string, any]) => (
                      <TableRow key={vn}>
                        <TableCell className="font-medium">{vn}</TableCell>
                        <TableCell className="text-right">{formatCurrency(v.total_deal_value)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(v.total_dealer_payout)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(v.total_revenue_margin)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(v.total_commission)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(v.total_expenses)}</TableCell>
                        <TableCell className={`text-right font-semibold ${v.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(v.net_profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Deal Aging Buckets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(agingBuckets).map(([bucket, count]: [string, any]) => (
              <Card key={bucket}>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">{bucket}</p>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">active deals</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Deals Table */}
          <Card>
            <CardHeader><CardTitle className="text-base">Deals ({deals.length})</CardTitle></CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No deals found for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vertical</TableHead>
                        <TableHead className="text-right">Deal Value</TableHead>
                        <TableHead className="text-right">Payout</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.slice(0, 50).map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.vertical_name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(d.deal_value || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(d.dealer_payout || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(d.revenue_margin || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(d.commission_amount || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={d.payment_status === "received" ? "default" : d.payment_status === "partial" ? "secondary" : "outline"}>
                              {d.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={d.deal_status === "closed" ? "default" : d.deal_status === "cancelled" ? "destructive" : "secondary"}>
                              {d.deal_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{new Date(d.created_at).toLocaleDateString("en-IN")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardHeader><CardTitle className="text-base">Expenses ({expenses.length})</CardTitle></CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No expenses found for this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vertical</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.slice(0, 50).map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.vertical_name}</TableCell>
                        <TableCell>{e.category}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.description || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                        <TableCell className="text-sm">{e.expense_date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Executive Commission Report */}
          {Object.keys(execCommReport).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Executive Commission Report</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Executive</TableHead>
                      <TableHead className="text-right">Deals Closed</TableHead>
                      <TableHead className="text-right">Total Deal Value</TableHead>
                      <TableHead className="text-right">Total Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(execCommReport).map(([execId, data]: [string, any]) => (
                      <TableRow key={execId}>
                        <TableCell className="font-mono text-xs">{execId === "unassigned" ? "Unassigned" : execId.slice(0, 8)}</TableCell>
                        <TableCell className="text-right">{data.deals_closed}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.total_deal_value)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.total_commission)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Overdue Payments */}
          {overduePayments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-destructive">⚠ Overdue Payments ({overduePayments.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vertical</TableHead>
                      <TableHead className="text-right">Deal Value</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Age</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overduePayments.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.vertical_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.deal_value || 0)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.payment_received_amount || 0)}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">
                          {formatCurrency((d.deal_value || 0) - (d.payment_received_amount || 0))}
                        </TableCell>
                        <TableCell><Badge variant="destructive">{d.age_days}d</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, variant }: { icon: any; title: string; value: string; variant?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${variant === "destructive" ? "text-destructive" : variant === "success" ? "text-green-600" : "text-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        <p className={`text-lg font-bold ${variant === "destructive" ? "text-destructive" : variant === "success" ? "text-green-600" : "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
