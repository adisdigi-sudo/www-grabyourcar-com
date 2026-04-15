import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, Car, Clock, TrendingUp } from "lucide-react";

export function InsuranceLeadsAdmin() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-insurance-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: leads?.length || 0,
    today: leads?.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length || 0,
    withPhone: leads?.filter((l) => l.phone && l.phone !== "pending").length || 0,
    withVehicle: leads?.filter((l) => l.vehicle_number).length || 0,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.today}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withPhone}</p>
              <p className="text-xs text-muted-foreground">With Phone</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
              <Car className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withVehicle}</p>
              <p className="text-xs text-muted-foreground">With Vehicle</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance Leads</CardTitle>
          <CardDescription>All leads captured from the insurance page</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Phone</th>
                    <th className="text-left py-2 px-3 font-medium">Name</th>
                    <th className="text-left py-2 px-3 font-medium">Vehicle</th>
                    <th className="text-left py-2 px-3 font-medium">Policy</th>
                    <th className="text-left py-2 px-3 font-medium">Source</th>
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads?.map((lead) => (
                    <tr key={lead.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{lead.phone}</td>
                      <td className="py-2 px-3">{lead.customer_name || "—"}</td>
                      <td className="py-2 px-3">
                        {lead.vehicle_number ? (
                          <Badge variant="outline" className="text-xs">{lead.vehicle_number}</Badge>
                        ) : "—"}
                      </td>
                      <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">{lead.policy_type || "—"}</Badge></td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">{lead.source || "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(lead.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!leads?.length && <p className="text-sm text-muted-foreground text-center py-8">No leads yet</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
