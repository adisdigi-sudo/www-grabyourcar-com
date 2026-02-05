import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Car, 
  Flame,
  Shield,
  MessageSquare,
  TrendingUp,
  IndianRupee,
  CalendarCheck
} from "lucide-react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  change: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

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

interface DashboardStatsCardsProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}

const StatCard = ({ title, value, change, icon: Icon, trend = "neutral" }: StatCardProps) => {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs mt-1 flex items-center gap-1 ${trendColors[trend]}`}>
          {trend === "up" && <TrendingUp className="h-3 w-3" />}
          {change}
        </p>
      </CardContent>
    </Card>
  );
};

export const DashboardStatsCards = ({ stats, isLoading }: DashboardStatsCardsProps) => {
  const statCards = [
    {
      title: "Total Leads",
      value: stats?.totalLeads || 0,
      change: `+${stats?.newLeadsToday || 0} today`,
      icon: Users,
      trend: (stats?.newLeadsToday || 0) > 0 ? "up" as const : "neutral" as const,
    },
    {
      title: "Hot Leads",
      value: stats?.hotLeads || 0,
      change: "High priority",
      icon: Flame,
      trend: "neutral" as const,
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate || 0}%`,
      change: "Lead to customer",
      icon: TrendingUp,
      trend: (stats?.conversionRate || 0) > 10 ? "up" as const : "neutral" as const,
    },
    {
      title: "Revenue",
      value: `₹${((stats?.revenue || 0) / 1000).toFixed(1)}K`,
      change: "From all services",
      icon: IndianRupee,
      trend: (stats?.revenue || 0) > 0 ? "up" as const : "neutral" as const,
    },
    {
      title: "HSRP Bookings",
      value: stats?.totalHsrpBookings || 0,
      change: `${stats?.pendingHsrpBookings || 0} pending`,
      icon: Shield,
      trend: "neutral" as const,
    },
    {
      title: "Rental Bookings",
      value: stats?.totalRentalBookings || 0,
      change: "Self-drive rentals",
      icon: CalendarCheck,
      trend: "neutral" as const,
    },
    {
      title: "Car Catalog",
      value: stats?.totalCars || 0,
      change: "Active listings",
      icon: Car,
      trend: "neutral" as const,
    },
    {
      title: "Inquiries",
      value: stats?.totalInquiries || 0,
      change: "From website",
      icon: MessageSquare,
      trend: "neutral" as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
};
