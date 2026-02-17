import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { LOAN_STAGES, STAGE_LABELS, type LoanStage } from "./LoanStageConfig";

interface Props {
  applications: any[];
  leads: any[];
}

const COLORS = ['#3B82F6', '#F59E0B', '#06B6D4', '#8B5CF6', '#6366F1', '#A855F7', '#F97316', '#14B8A6', '#84CC16', '#10B981', '#22C55E', '#EF4444'];

export const LoanAnalytics = ({ applications, leads }: Props) => {
  // 12-stage distribution
  const stageData = LOAN_STAGES.map(stage => ({
    name: STAGE_LABELS[stage].replace(' ', '\n'),
    count: applications.filter(a => a.stage === stage).length,
  }));

  // Lead source distribution
  const sourceCounts: Record<string, number> = {};
  applications.forEach(a => {
    const src = a.source || 'Direct';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));

  // Priority distribution
  const priorityCounts: Record<string, number> = {};
  applications.forEach(a => {
    const p = a.priority || 'medium';
    priorityCounts[p] = (priorityCounts[p] || 0) + 1;
  });
  const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

  // Conversion funnel
  const totalApps = applications.length;
  const converted = applications.filter(a => a.stage === 'converted').length;
  const lost = applications.filter(a => a.stage === 'lost').length;
  const disbursed = applications.filter(a => a.stage === 'disbursement').length;
  const approved = applications.filter(a => a.stage === 'approval').length;
  const totalDisbursedAmt = applications
    .filter(a => ['disbursement', 'converted'].includes(a.stage))
    .reduce((s, a) => s + (Number(a.disbursement_amount) || Number(a.loan_amount) || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pipeline Funnel */}
      <Card className="border-border/50 lg:col-span-2">
        <CardHeader><CardTitle className="text-base">12-Stage Pipeline Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stageData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lead Sources */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Lead Sources</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-base">Key Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center border-b border-border/50 pb-2">
            <span className="text-sm text-muted-foreground">Total Pipeline</span>
            <span className="font-bold text-lg">{totalApps}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/50 pb-2">
            <span className="text-sm text-muted-foreground">Converted</span>
            <span className="font-bold text-lg text-green-600">{converted}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/50 pb-2">
            <span className="text-sm text-muted-foreground">Lost</span>
            <span className="font-bold text-lg text-red-500">{lost}</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/50 pb-2">
            <span className="text-sm text-muted-foreground">Conversion Rate</span>
            <span className="font-bold text-lg">{totalApps > 0 ? ((converted / totalApps) * 100).toFixed(1) : 0}%</span>
          </div>
          <div className="flex justify-between items-center border-b border-border/50 pb-2">
            <span className="text-sm text-muted-foreground">Avg Loan Amount</span>
            <span className="font-bold text-lg">₹{applications.length > 0 ? (applications.reduce((s, a) => s + (Number(a.loan_amount) || 0), 0) / Math.max(applications.filter(a => a.loan_amount).length, 1) / 100000).toFixed(1) : '0'}L</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Disbursed Value</span>
            <span className="font-bold text-lg text-emerald-600">₹{(totalDisbursedAmt / 100000).toFixed(1)}L</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
