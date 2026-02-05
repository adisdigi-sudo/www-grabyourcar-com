import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface FunnelStage {
  name: string;
  count: number;
  color: string;
}

interface LeadFunnelProps {
  stages: FunnelStage[];
  isLoading: boolean;
}

export const LeadFunnel = ({ stages, isLoading }: LeadFunnelProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Funnel</CardTitle>
        <CardDescription>Lead progression through stages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-sm font-medium capitalize">{stage.name}</span>
              </div>
              <span className="text-sm font-bold">{stage.count}</span>
            </div>
            <div className="relative">
              <Progress 
                value={(stage.count / maxCount) * 100} 
                className="h-3"
                style={{ 
                  // @ts-ignore - custom CSS property
                  '--progress-background': stage.color 
                } as React.CSSProperties}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
