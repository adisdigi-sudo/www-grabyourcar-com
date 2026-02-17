import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Props {
  applications: any[];
  leads: any[];
}

const COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#6366F1', '#10B981', '#059669', '#EF4444'];

export const LoanAnalytics = ({ applications, leads }: Props) => {
  // Stage distribution
  const stageData = [
    { name: 'New', count: applications.filter(a => a.stage === 'new').length },
    { name: 'Contacted', count: applications.filter(a => a.stage === 'contacted').length },
    { name: 'Docs', count: applications.filter(a => a.stage === 'documents_collected').length },
    { name: 'Bank Submitted', count: applications.filter(a => a.stage === 'bank_submitted').length },
    { name: 'Sanctioned', count: applications.filter(a => a.stage === 'sanctioned').length },
    { name: 'Disbursed', count: applications.filter(a => a.stage === 'disbursed').length },
    { name: 'Rejected', count: applications.filter(a => a.stage === 'rejected').length },
  ];

  // Lead source distribution
  const sourceCounts: Record<string, number> = {};
  leads.forEach(l => {
    const src = l.source || 'Direct';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));

  // Priority distribution
  const priorityCounts: Record<string, number> = {};
  leads.forEach(l => {
    const p = l.lead_priority || 'Unknown';
    priorityCounts[p] = (priorityCounts[p] || 0) + 1;
  });
  const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pipeline Funnel */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lead Sources */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Priority Split */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Lead Priority Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={priorityData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {priorityData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <span className="text-sm text-muted-foreground">Total Loan Leads</span>
            <span className="font-bold text-lg">{leads.length}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-3">
            <span className="text-sm text-muted-foreground">Pipeline Applications</span>
            <span className="font-bold text-lg">{applications.length}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-3">
            <span className="text-sm text-muted-foreground">Avg Loan Amount</span>
            <span className="font-bold text-lg">
              ₹{applications.length > 0
                ? (applications.reduce((s, a) => s + (Number(a.loan_amount) || 0), 0) / Math.max(applications.filter(a => a.loan_amount).length, 1) / 100000).toFixed(1)
                : '0'}L
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Sanction Rate</span>
            <span className="font-bold text-lg">
              {applications.length > 0
                ? ((applications.filter(a => ['sanctioned', 'disbursed'].includes(a.stage)).length / applications.length) * 100).toFixed(1)
                : '0'}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
