import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Car, CalendarDays, Users, MapPin, Clock, CheckCircle, IndianRupee, Truck, AlertTriangle, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const RentalDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["rental-dashboard-stats"],
    queryFn: async () => {
      const [total, confirmed, completed, cancelled] = await Promise.all([
        supabase.from("driver_bookings").select("*", { count: "exact", head: true }),
        supabase.from("driver_bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("driver_bookings").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("driver_bookings").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
      ]);
      return {
        total: total.count || 0,
        confirmed: confirmed.count || 0,
        completed: completed.count || 0,
        cancelled: cancelled.count || 0,
      };
    },
  });

  const kpis = [
    { label: "Total Bookings", value: stats?.total || 0, icon: CalendarDays, color: "text-blue-500" },
    { label: "Active Trips", value: stats?.confirmed || 0, icon: Car, color: "text-green-500" },
    { label: "Completed", value: stats?.completed || 0, icon: CheckCircle, color: "text-primary" },
    { label: "Cancelled", value: stats?.cancelled || 0, icon: AlertTriangle, color: "text-red-500" },
  ];

  const utilization = stats?.total ? Math.round(((stats.confirmed + stats.completed) / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Car className="h-7 w-7 text-primary" />
          Self-Drive Rental Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Fleet management, bookings & trip tracking</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Fleet Utilization</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{utilization}%</p>
              <p className="text-sm text-muted-foreground">Overall utilization rate</p>
            </div>
            <Progress value={utilization} className="h-3" />
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 rounded bg-muted">
                <p className="font-bold text-green-600">{stats?.confirmed || 0}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="font-bold">{stats?.completed || 0}</p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="font-bold text-red-500">{stats?.cancelled || 0}</p>
                <p className="text-[10px] text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Rental Bookings", icon: CalendarDays, desc: "View all bookings" },
                { label: "Driver Assignments", icon: Users, desc: "Manage drivers" },
                { label: "API Partners", icon: MapPin, desc: "External integrations" },
                { label: "Car Database", icon: Car, desc: "Available fleet" },
              ].map((a) => (
                <div key={a.label} className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                  <a.icon className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
