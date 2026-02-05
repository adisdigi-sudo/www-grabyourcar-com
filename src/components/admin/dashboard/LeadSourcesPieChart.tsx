import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface LeadSourceData {
  name: string;
  value: number;
  color: string;
}

interface LeadSourcesPieChartProps {
  data: LeadSourceData[];
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142.1 76.2% 36.3%)',
  'hsl(47.9 95.8% 53.1%)',
  'hsl(12.6 75.2% 54.1%)',
  'hsl(262.1 83.3% 57.8%)',
  'hsl(199.4 95.5% 53.1%)',
];

export const LeadSourcesPieChart = ({ data, isLoading }: LeadSourcesPieChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
        <CardDescription>Where your leads come from</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithColors}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {dataWithColors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} leads`, '']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-4">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-sm text-muted-foreground">Total Leads</p>
        </div>
      </CardContent>
    </Card>
  );
};
