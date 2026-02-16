import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Database, CheckCircle, AlertTriangle, Users, Phone,
  Calendar, FileText, TrendingUp, ArrowRightCircle
} from "lucide-react";

export function InsuranceDataHealth() {
  const { data: clients = [] } = useQuery({
    queryKey: ["insurance-clients-health"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insurance_clients").select("*").limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: prospects = [] } = useQuery({
    queryKey: ["insurance-prospects-health"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insurance_prospects").select("*").limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const clientStats = {
    total: clients.length,
    withExpiry: clients.filter(c => c.policy_expiry_date).length,
    withPhone: clients.filter(c => c.phone && c.phone !== "pending").length,
    withName: clients.filter(c => c.customer_name).length,
    withVehicle: clients.filter(c => c.vehicle_number).length,
    withEmail: clients.filter(c => c.email).length,
    withPolicyNumber: clients.filter(c => c.current_policy_number).length,
    withInsurer: clients.filter(c => c.current_insurer).length,
  };

  const prospectStats = {
    total: prospects.length,
    new: prospects.filter(p => p.prospect_status === "new").length,
    contacted: prospects.filter(p => p.prospect_status === "contacted").length,
    interested: prospects.filter(p => p.prospect_status === "interested").length,
    converted: prospects.filter(p => p.prospect_status === "converted").length,
    notInterested: prospects.filter(p => p.prospect_status === "not_interested").length,
    conversionRate: prospects.length ? Math.round((prospects.filter(p => p.prospect_status === "converted").length / prospects.length) * 100) : 0,
  };

  // Data source breakdown for prospects
  const sourceBreakdown = prospects.reduce((acc: Record<string, number>, p) => {
    acc[p.data_source] = (acc[p.data_source] || 0) + 1;
    return acc;
  }, {});

  const pct = (num: number, total: number) => total ? Math.round((num / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{clientStats.total}</p>
              <p className="text-[10px] text-muted-foreground">CRM Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{prospectStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Prospect Pool</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 flex items-center gap-3">
            <ArrowRightCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{prospectStats.converted}</p>
              <p className="text-[10px] text-muted-foreground">Converted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{prospectStats.conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Conversion Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CRM Data Quality */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> CRM Data Quality</CardTitle>
          <CardDescription>Completeness of client profiles in the insurance CRM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Has Phone Number", count: clientStats.withPhone, icon: Phone },
            { label: "Has Name", count: clientStats.withName, icon: Users },
            { label: "Has Expiry Date", count: clientStats.withExpiry, icon: Calendar },
            { label: "Has Vehicle Number", count: clientStats.withVehicle, icon: FileText },
            { label: "Has Policy Number", count: clientStats.withPolicyNumber, icon: FileText },
            { label: "Has Email", count: clientStats.withEmail, icon: FileText },
            { label: "Has Insurer", count: clientStats.withInsurer, icon: FileText },
          ].map(item => {
            const p = pct(item.count, clientStats.total);
            return (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{item.label}</span>
                    <span className="text-muted-foreground">{item.count}/{clientStats.total} ({p}%)</span>
                  </div>
                  <Progress value={p} className="h-2" />
                </div>
                {p >= 80 ? (
                  <Badge className="bg-green-500/10 text-green-600 text-[10px]">Good</Badge>
                ) : p >= 50 ? (
                  <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">Fair</Badge>
                ) : (
                  <Badge className="bg-red-500/10 text-red-600 text-[10px]">Low</Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Prospect Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-blue-500" /> Prospect Pipeline</CardTitle>
          <CardDescription>Status distribution of prospects in the data bank</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "New", value: prospectStats.new, color: "bg-blue-500" },
              { label: "Contacted", value: prospectStats.contacted, color: "bg-sky-500" },
              { label: "Interested", value: prospectStats.interested, color: "bg-emerald-500" },
              { label: "Converted", value: prospectStats.converted, color: "bg-green-600" },
              { label: "Not Interested", value: prospectStats.notInterested, color: "bg-red-500" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className={`w-3 h-3 rounded-full ${s.color}`} />
                <span className="text-sm flex-1">{s.label}</span>
                <span className="font-bold text-sm">{s.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Source Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Data Source Performance</CardTitle>
          <CardDescription>Which sources bring the most prospects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(sourceBreakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="text-sm flex-1 capitalize">{source.replace(/_/g, " ")}</span>
                  <Progress value={pct(count as number, prospectStats.total)} className="h-2 flex-1" />
                  <span className="text-sm font-medium w-10 text-right">{count as number}</span>
                </div>
              ))}
            {!Object.keys(sourceBreakdown).length && <p className="text-sm text-muted-foreground text-center py-4">No prospect data yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
