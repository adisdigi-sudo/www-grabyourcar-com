import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  HeartHandshake, PhoneCall, MessageCircle, User, Clock,
  IndianRupee, Building2, Star
} from "lucide-react";

interface LoanAfterSalesProps {
  applications: any[];
}

export function LoanAfterSales({ applications }: LoanAfterSalesProps) {
  const disbursed = useMemo(() =>
    applications
      .filter((a: any) => a.stage === "disbursed")
      .sort((a: any, b: any) => new Date(b.disbursement_date || b.created_at).getTime() - new Date(a.disbursement_date || a.created_at).getTime()),
    [applications]
  );

  const recentlyDisbursed = useMemo(() => {
    const now = new Date();
    return disbursed.filter((a: any) => {
      const disbDate = a.disbursement_date ? new Date(a.disbursement_date) : null;
      if (!disbDate) return false;
      return differenceInDays(now, disbDate) <= 30;
    });
  }, [disbursed]);

  const formatAmount = (amt: number | null) => {
    if (!amt) return "—";
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    return `₹${(amt / 1000).toFixed(0)}K`;
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <HeartHandshake className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{disbursed.length}</p>
                <p className="text-xs text-muted-foreground">Total Disbursed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recentlyDisbursed.length}</p>
                <p className="text-xs text-muted-foreground">Last 30 Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {disbursed.filter((a: any) => a.incentive_eligible).length}
                </p>
                <p className="text-xs text-muted-foreground">Incentive Eligible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Disbursed — Follow-up List */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recently Disbursed — Follow-up Required
        </h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-[10px] font-bold uppercase w-8">#</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Customer</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Phone</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Car</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Bank</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Disbursed</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Days Ago</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentlyDisbursed.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <HeartHandshake className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No recent disbursements in last 30 days</p>
                    </TableCell></TableRow>
                  ) : recentlyDisbursed.map((app: any, idx: number) => {
                    const daysAgo = app.disbursement_date
                      ? differenceInDays(new Date(), new Date(app.disbursement_date))
                      : null;
                    return (
                      <TableRow key={app.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                              <User className="h-3 w-3 text-white" />
                            </div>
                            <span className="font-semibold">{app.customer_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{app.phone || "—"}</TableCell>
                        <TableCell className="text-xs">{app.car_model || "—"}</TableCell>
                        <TableCell>
                          {app.lender_name ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span>{app.lender_name}</span>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600">{formatAmount(app.disbursement_amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]",
                            daysAgo !== null && daysAgo <= 7 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                            daysAgo !== null && daysAgo <= 15 ? "bg-blue-100 text-blue-700 border-blue-200" :
                            "bg-muted text-muted-foreground"
                          )}>{daysAgo}d ago</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {app.phone && (
                              <>
                                <a href={`tel:${app.phone}`}><Button variant="ghost" size="icon" className="h-6 w-6"><PhoneCall className="h-3 w-3 text-primary" /></Button></a>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                  const clean = app.phone.replace(/\D/g, "");
                                  window.open(`https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}?text=${encodeURIComponent(`Hi ${app.customer_name}, congratulations on your car loan disbursement! How is your experience so far?`)}`, "_blank");
                                }}><MessageCircle className="h-3 w-3 text-green-600" /></Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for future features */}
      <Card className="border-dashed border-2 border-border/40">
        <CardContent className="p-8 text-center">
          <HeartHandshake className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">EMI Tracking & Satisfaction Surveys</p>
          <p className="text-xs text-muted-foreground mt-1">Coming soon — Track repayments, customer feedback, and cross-sell insurance</p>
        </CardContent>
      </Card>
    </div>
  );
}
