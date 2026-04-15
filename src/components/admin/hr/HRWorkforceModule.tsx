import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, Briefcase, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

export const HRWorkforceModule = () => {
  const { data: employees = [] } = useQuery({
    queryKey: ["hr-workforce"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hr_team_directory").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const active = employees.filter((e: any) => e.is_active !== false);
  const deptData = active.reduce((acc: Record<string, number>, e: any) => { acc[e.department || "Unassigned"] = (acc[e.department || "Unassigned"] || 0) + 1; return acc; }, {});
  const deptChartData = Object.entries(deptData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const typeData = active.reduce((acc: Record<string, number>, e: any) => { acc[e.employment_type || "full_time"] = (acc[e.employment_type || "full_time"] || 0) + 1; return acc; }, {});
  const typeChartData = Object.entries(typeData).map(([name, value]) => ({ name: name.replace("_", " "), value }));

  const designationData = active.reduce((acc: Record<string, number>, e: any) => { acc[e.designation || "Unassigned"] = (acc[e.designation || "Unassigned"] || 0) + 1; return acc; }, {});
  const designationChartData = Object.entries(designationData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  const cityData = active.reduce((acc: Record<string, number>, e: any) => { acc[e.city || "Unknown"] = (acc[e.city || "Unknown"] || 0) + 1; return acc; }, {});
  const cityChartData = Object.entries(cityData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const avgCTC = active.filter((e: any) => e.salary_ctc).length > 0 
    ? Math.round(active.filter((e: any) => e.salary_ctc).reduce((s: number, e: any) => s + Number(e.salary_ctc || 0), 0) / active.filter((e: any) => e.salary_ctc).length) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-8 w-8 text-blue-500" /><div><p className="text-xs text-muted-foreground">Total Active</p><p className="text-2xl font-bold">{active.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Building2 className="h-8 w-8 text-green-500" /><div><p className="text-xs text-muted-foreground">Departments</p><p className="text-2xl font-bold">{Object.keys(deptData).length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Briefcase className="h-8 w-8 text-purple-500" /><div><p className="text-xs text-muted-foreground">Designations</p><p className="text-2xl font-bold">{Object.keys(designationData).length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="h-8 w-8 text-orange-500" /><div><p className="text-xs text-muted-foreground">Avg CTC</p><p className="text-2xl font-bold">₹{(avgCTC / 100000).toFixed(1)}L</p></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Exited</p><p className="text-2xl font-bold text-red-600">{employees.length - active.length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Department Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} angle={-30} textAnchor="end" height={60} /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Employment Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={typeChartData} cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} dataKey="value">
                {typeChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Designations</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={designationChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" fontSize={11} width={120} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Location Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cityChartData.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-muted" style={{ width: 100 }}>
                      <div className="h-2 rounded-full" style={{ width: `${(c.value / active.length) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                    <Badge variant="secondary" className="text-xs">{c.value}</Badge>
                  </div>
                </div>
              ))}
              {cityChartData.length === 0 && <p className="text-center text-muted-foreground py-8">No data</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HRWorkforceModule;
