import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Zap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface PerformanceData {
  avgResponseTime: string;
  leadToCustomerRate: number;
  followUpCompletion: number;
  hsrpFulfillmentRate: number;
  customerSatisfaction: number;
  monthlyTarget: number;
  monthlyAchieved: number;
}

interface PerformanceMetricsProps {
  data: PerformanceData | undefined;
  isLoading: boolean;
}

export const PerformanceMetrics = ({ data, isLoading }: PerformanceMetricsProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Avg. Response Time",
      value: data?.avgResponseTime || "N/A",
      icon: Clock,
      color: "text-blue-600",
    },
    {
      label: "Lead Conversion Rate",
      value: `${data?.leadToCustomerRate || 0}%`,
      progress: data?.leadToCustomerRate || 0,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "Follow-up Completion",
      value: `${data?.followUpCompletion || 0}%`,
      progress: data?.followUpCompletion || 0,
      icon: CheckCircle2,
      color: "text-purple-600",
    },
    {
      label: "HSRP Fulfillment Rate",
      value: `${data?.hsrpFulfillmentRate || 0}%`,
      progress: data?.hsrpFulfillmentRate || 0,
      icon: Zap,
      color: "text-orange-600",
    },
  ];

  const targetProgress = data?.monthlyTarget 
    ? Math.min((data.monthlyAchieved / data.monthlyTarget) * 100, 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Performance Metrics
        </CardTitle>
        <CardDescription>Key performance indicators</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Target */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Monthly Target</span>
            <span className="text-sm font-bold">
              {data?.monthlyAchieved?.toLocaleString() || 0} / {data?.monthlyTarget?.toLocaleString() || 0}
            </span>
          </div>
          <Progress value={targetProgress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {targetProgress.toFixed(1)}% of monthly goal achieved
          </p>
        </div>

        {/* Other Metrics */}
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-sm font-medium">{metric.label}</span>
              </div>
              <span className="text-sm font-bold">{metric.value}</span>
            </div>
            {metric.progress !== undefined && (
              <Progress value={metric.progress} className="h-2" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
