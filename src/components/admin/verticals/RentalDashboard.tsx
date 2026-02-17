import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CalendarDays, Users, MapPin, Clock, CheckCircle, AlertCircle, IndianRupee } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const RentalDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["rental-dashboard-stats"],
    queryFn: async () => {
      const { count: totalBookings } = await supabase
        .from("driver_bookings")
        .select("*", { count: "exact", head: true });

      const { count: activeBookings } = await supabase
        .from("driver_bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed");

      return { totalBookings: totalBookings || 0, activeBookings: activeBookings || 0 };
    },
  });

  const kpis = [
    { label: "Total Bookings", value: stats?.totalBookings || 0, icon: CalendarDays, color: "text-blue-500" },
    { label: "Active Trips", value: stats?.activeBookings || 0, icon: Car, color: "text-green-500" },
    { label: "Fleet Utilization", value: "—", icon: Clock, color: "text-amber-500" },
    { label: "Revenue", value: "—", icon: IndianRupee, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Car className="h-7 w-7 text-primary" />
          Self-Drive Rental Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Fleet management, bookings, and trip tracking</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {[
            { label: "Rental Bookings", icon: CalendarDays },
            { label: "Driver Assignments", icon: Users },
            { label: "API Partners", icon: MapPin },
          ].map((a) => (
            <Badge key={a.label} variant="outline" className="px-4 py-2 text-sm cursor-pointer hover:bg-accent">
              <a.icon className="h-4 w-4 mr-2" />{a.label}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
