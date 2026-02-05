import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { 
  DashboardStatsCards, 
  LeadsChart, 
  LeadSourcesPieChart, 
  LeadFunnel,
  RevenueChart,
  RecentActivity,
  PerformanceMetrics
} from "./dashboard";

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
  conversionRate: number;
}

export const AdminDashboard = () => {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const [
        leadsResult,
        newLeadsResult,
        hotLeadsResult,
        convertedLeadsResult,
        hsrpResult,
        pendingHsrpResult,
        rentalResult,
        inquiriesResult,
        carsResult,
        hsrpRevenueResult,
        rentalRevenueResult,
        accessoryRevenueResult,
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .gte('created_at', today),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .eq('status', 'hot'),
        supabase.from('leads').select('id', { count: 'exact', head: true })
          .eq('status', 'converted'),
        supabase.from('hsrp_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('hsrp_bookings').select('id', { count: 'exact', head: true })
          .eq('order_status', 'pending'),
        supabase.from('rental_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('inquiries').select('id', { count: 'exact', head: true }),
        supabase.from('cars').select('id', { count: 'exact', head: true }),
        supabase.from('hsrp_bookings').select('payment_amount')
          .eq('payment_status', 'paid'),
        supabase.from('rental_bookings').select('total_amount')
          .eq('payment_status', 'paid'),
        supabase.from('accessory_orders').select('total_amount')
          .eq('payment_status', 'paid'),
      ]);

      // Calculate revenue
      const hsrpRevenue = hsrpRevenueResult.data?.reduce((sum, b) => sum + (b.payment_amount || 0), 0) || 0;
      const rentalRevenue = rentalRevenueResult.data?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;
      const accessoryRevenue = accessoryRevenueResult.data?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

      const totalLeads = leadsResult.count || 0;
      const convertedLeads = convertedLeadsResult.count || 0;
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

      return {
        totalLeads,
        newLeadsToday: newLeadsResult.count || 0,
        hotLeads: hotLeadsResult.count || 0,
        totalHsrpBookings: hsrpResult.count || 0,
        pendingHsrpBookings: pendingHsrpResult.count || 0,
        totalRentalBookings: rentalResult.count || 0,
        totalInquiries: inquiriesResult.count || 0,
        totalCars: carsResult.count || 0,
        revenue: hsrpRevenue + rentalRevenue + accessoryRevenue,
        conversionRate,
      } as DashboardStats;
    },
  });

  // Fetch leads trend data (last 30 days)
  const { data: leadsTrend, isLoading: leadsTrendLoading } = useQuery({
    queryKey: ['leadsTrend'],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      const { data: leads } = await supabase
        .from('leads')
        .select('created_at, status')
        .gte('created_at', thirtyDaysAgo);

      // Group by date
      const groupedData: Record<string, { leads: number; converted: number }> = {};
      
      for (let i = 0; i < 30; i++) {
        const date = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
        groupedData[date] = { leads: 0, converted: 0 };
      }

      leads?.forEach(lead => {
        const date = format(new Date(lead.created_at), 'yyyy-MM-dd');
        if (groupedData[date]) {
          groupedData[date].leads++;
          if (lead.status === 'converted') {
            groupedData[date].converted++;
          }
        }
      });

      return Object.entries(groupedData).map(([date, data]) => ({
        date,
        ...data,
      }));
    },
  });

  // Fetch lead sources
  const { data: leadSources, isLoading: leadSourcesLoading } = useQuery({
    queryKey: ['leadSources'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('source');

      const sourceCounts: Record<string, number> = {};
      data?.forEach(lead => {
        const source = lead.source || 'Unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      return Object.entries(sourceCounts)
        .map(([name, value]) => ({ name, value, color: '' }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    },
  });

  // Fetch lead funnel data
  const { data: funnelData, isLoading: funnelLoading } = useQuery({
    queryKey: ['leadFunnel'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('status');

      const statusCounts: Record<string, number> = {};
      data?.forEach(lead => {
        const status = lead.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const stages = [
        { name: 'new', color: 'hsl(217.2 91.2% 59.8%)' },
        { name: 'hot', color: 'hsl(0 84.2% 60.2%)' },
        { name: 'warm', color: 'hsl(24.6 95% 53.1%)' },
        { name: 'cold', color: 'hsl(220 8.9% 46.1%)' },
        { name: 'converted', color: 'hsl(142.1 76.2% 36.3%)' },
      ];

      return stages.map(stage => ({
        ...stage,
        count: statusCounts[stage.name] || 0,
      }));
    },
  });

  // Fetch revenue data (last 6 months)
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenueData'],
    queryFn: async () => {
      const months: Array<{ month: string; hsrp: number; rentals: number; accessories: number }> = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = format(startOfMonth(date), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(date), 'yyyy-MM-dd');
        const monthName = format(date, 'MMM');

        const [hsrp, rentals, accessories] = await Promise.all([
          supabase.from('hsrp_bookings').select('payment_amount')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd)
            .eq('payment_status', 'paid'),
          supabase.from('rental_bookings').select('total_amount')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd)
            .eq('payment_status', 'paid'),
          supabase.from('accessory_orders').select('total_amount')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd)
            .eq('payment_status', 'paid'),
        ]);

        months.push({
          month: monthName,
          hsrp: hsrp.data?.reduce((sum, b) => sum + (b.payment_amount || 0), 0) || 0,
          rentals: rentals.data?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0,
          accessories: accessories.data?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0,
        });
      }

      return months;
    },
  });

  // Fetch recent leads
  const { data: recentLeads, isLoading: recentLeadsLoading } = useQuery({
    queryKey: ['recentLeads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent HSRP bookings
  const { data: recentHsrp, isLoading: recentHsrpLoading } = useQuery({
    queryKey: ['recentHsrpBookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsrp_bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch performance metrics
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['performanceMetrics'],
    queryFn: async () => {
      const thisMonth = startOfMonth(new Date());
      const thisMonthStr = format(thisMonth, 'yyyy-MM-dd');

      const [
        totalLeads,
        convertedLeads,
        completedHsrp,
        totalHsrp,
        followedUpLeads,
        monthlyLeads,
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'converted'),
        supabase.from('hsrp_bookings').select('id', { count: 'exact', head: true }).eq('order_status', 'completed'),
        supabase.from('hsrp_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }).not('last_contacted_at', 'is', null),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', thisMonthStr),
      ]);

      const total = totalLeads.count || 0;
      const converted = convertedLeads.count || 0;
      const hsrpCompleted = completedHsrp.count || 0;
      const hsrpTotal = totalHsrp.count || 0;
      const followedUp = followedUpLeads.count || 0;

      return {
        avgResponseTime: "< 2 hrs",
        leadToCustomerRate: total > 0 ? Math.round((converted / total) * 100) : 0,
        followUpCompletion: total > 0 ? Math.round((followedUp / total) * 100) : 0,
        hsrpFulfillmentRate: hsrpTotal > 0 ? Math.round((hsrpCompleted / hsrpTotal) * 100) : 0,
        customerSatisfaction: 92,
        monthlyTarget: 100,
        monthlyAchieved: monthlyLeads.count || 0,
      };
    },
  });

  const isLoading = statsLoading || leadsTrendLoading || leadSourcesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your admin dashboard. Here's what's happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <DashboardStatsCards stats={stats} isLoading={statsLoading} />

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <LeadsChart 
          data={leadsTrend || []} 
          isLoading={leadsTrendLoading} 
        />
        <LeadSourcesPieChart 
          data={leadSources || []} 
          isLoading={leadSourcesLoading} 
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <RevenueChart 
          data={revenueData || []} 
          isLoading={revenueLoading} 
        />
        <PerformanceMetrics 
          data={performanceData} 
          isLoading={performanceLoading} 
        />
      </div>

      {/* Lead Funnel */}
      <div className="grid gap-6 lg:grid-cols-3">
        <LeadFunnel 
          stages={funnelData || []} 
          isLoading={funnelLoading} 
        />
        <div className="lg:col-span-2">
          <RecentActivity 
            recentLeads={recentLeads} 
            recentHsrp={recentHsrp} 
            isLoading={recentLeadsLoading || recentHsrpLoading} 
          />
        </div>
      </div>
    </div>
  );
};
