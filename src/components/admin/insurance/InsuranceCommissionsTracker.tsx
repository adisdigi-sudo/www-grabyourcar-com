import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, CheckCircle2 } from "lucide-react";

export function InsuranceCommissionsTracker() {
  const { data: commissions, isLoading } = useQuery({
    queryKey: ["ins-commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_commissions")
        .select("*, insurance_clients(customer_name, phone), insurance_policies(policy_number, insurer, policy_type)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: commissions?.reduce((s, c: any) => s + (c.total_earned || 0), 0) || 0,
    pending: commissions?.filter((c: any) => c.status === "pending").reduce((s, c: any) => s + (c.total_earned || 0), 0) || 0,
    paid: commissions?.filter((c: any) => c.status === "paid").reduce((s, c: any) => s + (c.total_earned || 0), 0) || 0,
    count: commissions?.length || 0,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">₹{(stats.total / 1000).toFixed(1)}K</p>
              <p className="text-[11px] text-muted-foreground">Total Commission</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-xl font-bold">₹{(stats.pending / 1000).toFixed(1)}K</p>
              <p className="text-[11px] text-muted-foreground">Pending Payout</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-xl font-bold">₹{(stats.paid / 1000).toFixed(1)}K</p>
              <p className="text-[11px] text-muted-foreground">Paid Out</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.count}</p>
              <p className="text-[11px] text-muted-foreground">Total Entries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Commission Ledger</CardTitle>
          <CardDescription>Track all insurance commissions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : commissions && commissions.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-2.5 px-3 font-medium">Client</th>
                    <th className="text-left py-2.5 px-3 font-medium">Policy</th>
                    <th className="text-left py-2.5 px-3 font-medium">Premium</th>
                    <th className="text-left py-2.5 px-3 font-medium">Commission</th>
                    <th className="text-left py-2.5 px-3 font-medium">Type</th>
                    <th className="text-left py-2.5 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c: any) => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="py-2.5 px-3">
                        <p className="text-xs font-medium">{c.insurance_clients?.customer_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{c.advisor_name || "—"}</p>
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        {c.insurance_policies?.insurer || "—"}
                        <br />
                        <span className="text-muted-foreground">{c.insurance_policies?.policy_number || ""}</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-medium">₹{c.premium_amount?.toLocaleString("en-IN") || 0}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs font-bold text-primary">₹{c.total_earned?.toLocaleString("en-IN") || 0}</span>
                        <br />
                        <span className="text-[10px] text-muted-foreground">{c.commission_percentage || 0}%</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[9px] capitalize">{c.commission_type || "new"}</Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className={`text-[10px] border-0 ${
                          c.status === "paid" ? "bg-green-100 text-green-800" :
                          c.status === "approved" ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No commissions recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
