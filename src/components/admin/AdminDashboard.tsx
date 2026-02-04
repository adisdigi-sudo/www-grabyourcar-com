import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Car, 
  CreditCard, 
  TrendingUp, 
  Calendar,
  Phone,
  Flame,
  Shield,
  MessageSquare
} from "lucide-react";
import { format, subDays } from "date-fns";

interface DashboardStats {
  totalLeads: number;
  newLeadsToday: number;
  hotLeads: number;
  totalHsrpBookings: number;
  pendingHsrpBookings: number;
  totalRentalBookings: number;
  totalInquiries: number;
  totalCars: number;
  revenue: number;
}

export const AdminDashboard = () => {
  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Parallel queries for stats
      const [
        leadsResult,
        newLeadsResult,
        hotLeadsResult,
        hsrpResult,
        pendingHsrpResult,
        rentalResult,
        inquiriesResult,
        carsResult
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .gte('created_at', today),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .eq('status', 'hot'),
        supabase.from('hsrp_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('hsrp_bookings').select('id', { count: 'exact', head: true })
          .eq('order_status', 'pending'),
        supabase.from('rental_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('inquiries').select('id', { count: 'exact', head: true }),
        supabase.from('cars').select('id', { count: 'exact', head: true }),
      ]);

      return {
        totalLeads: leadsResult.count || 0,
        newLeadsToday: newLeadsResult.count || 0,
        hotLeads: hotLeadsResult.count || 0,
        totalHsrpBookings: hsrpResult.count || 0,
        pendingHsrpBookings: pendingHsrpResult.count || 0,
        totalRentalBookings: rentalResult.count || 0,
        totalInquiries: inquiriesResult.count || 0,
        totalCars: carsResult.count || 0,
        revenue: 0, // TODO: Calculate from payments
      } as DashboardStats;
    },
  });

  // Fetch recent leads
  const { data: recentLeads } = useQuery({
    queryKey: ['recentLeads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent HSRP bookings
  const { data: recentHsrp } = useQuery({
    queryKey: ['recentHsrpBookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsrp_bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const statCards = [
    {
      title: "Total Leads",
      value: stats?.totalLeads || 0,
      change: `+${stats?.newLeadsToday || 0} today`,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Hot Leads",
      value: stats?.hotLeads || 0,
      change: "High priority",
      icon: Flame,
      color: "text-red-600",
    },
    {
      title: "HSRP Bookings",
      value: stats?.totalHsrpBookings || 0,
      change: `${stats?.pendingHsrpBookings || 0} pending`,
      icon: Shield,
      color: "text-green-600",
    },
    {
      title: "Rental Bookings",
      value: stats?.totalRentalBookings || 0,
      change: "Self-drive",
      icon: Car,
      color: "text-purple-600",
    },
    {
      title: "Car Catalog",
      value: stats?.totalCars || 0,
      change: "Active listings",
      icon: Car,
      color: "text-orange-600",
    },
    {
      title: "Inquiries",
      value: stats?.totalInquiries || 0,
      change: "From website",
      icon: MessageSquare,
      color: "text-teal-600",
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      hot: "bg-red-100 text-red-800",
      warm: "bg-orange-100 text-orange-800",
      cold: "bg-gray-100 text-gray-800",
      converted: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your admin dashboard. Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Leads
            </CardTitle>
            <CardDescription>Latest leads from all sources</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeads && recentLeads.length > 0 ? (
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{lead.customer_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                        {lead.car_brand && (
                          <span className="ml-2">• {lead.car_brand} {lead.car_model}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(lead.created_at), 'dd MMM, HH:mm')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No leads yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent HSRP Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recent HSRP Bookings
            </CardTitle>
            <CardDescription>Latest HSRP plate orders</CardDescription>
          </CardHeader>
          <CardContent>
            {recentHsrp && recentHsrp.length > 0 ? (
              <div className="space-y-4">
                {recentHsrp.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium font-mono">{booking.registration_number}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{booking.owner_name}</span>
                        <span>• {booking.vehicle_class}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getStatusColor(booking.order_status)}>
                        {booking.order_status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ₹{booking.payment_amount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No HSRP bookings yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
