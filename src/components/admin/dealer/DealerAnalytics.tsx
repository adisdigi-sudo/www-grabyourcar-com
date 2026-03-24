import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Building2, Users, Car, TrendingUp, MapPin, Star, Phone,
} from "lucide-react";

const COLORS = ["hsl(217 91% 60%)", "hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(330 80% 60%)", "hsl(262 83% 58%)"];
const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

export default function DealerAnalytics() {
  const { data: companies = [] } = useQuery({
    queryKey: ["dealer-companies-analytics"],
    queryFn: async () => {
      const { data } = await supabase.from("dealer_companies").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const { data: reps = [] } = useQuery({
    queryKey: ["dealer-reps-analytics"],
    queryFn: async () => {
      const { data } = await supabase.from("dealer_representatives").select("*, dealer_companies(company_name, city, state)").eq("is_active", true);
      return data || [];
    },
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["dealer-inventory-analytics"],
    queryFn: async () => {
      const { data } = await supabase.from("dealer_inventory").select("*").eq("is_active", true);
      return data || [];
    },
  });

  // Stats
  const totalCompanies = companies.length;
  const totalReps = reps.length;
  const totalStock = inventory.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  const totalValue = inventory.reduce((s: number, i: any) => s + (Number(i.on_road_price || 0) * (i.quantity || 0)), 0);

  // By city
  const byCity: Record<string, number> = {};
  companies.forEach((c: any) => { const city = c.city || "Unknown"; byCity[city] = (byCity[city] || 0) + 1; });
  const cityData = Object.entries(byCity).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, value]) => ({ name, value }));

  // By type
  const byType: Record<string, number> = {};
  companies.forEach((c: any) => { const t = c.dealer_type || "other"; byType[t] = (byType[t] || 0) + 1; });
  const typeData = Object.entries(byType).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));

  // By brand (inventory)
  const byBrand: Record<string, number> = {};
  inventory.forEach((i: any) => { const b = i.brand || "Other"; byBrand[b] = (byBrand[b] || 0) + (i.quantity || 0); });
  const brandData = Object.entries(byBrand).sort(([, a], [, b]) => b - a).slice(0, 10).map(([name, value]) => ({ name, value }));

  // Top reps by inventory count
  const repInventory: Record<string, { name: string; company: string; count: number }> = {};
  inventory.forEach((i: any) => {
    if (i.dealer_rep_id) {
      if (!repInventory[i.dealer_rep_id]) {
        const rep = reps.find((r: any) => r.id === i.dealer_rep_id);
        repInventory[i.dealer_rep_id] = { name: rep?.name || "Unknown", company: (rep as any)?.dealer_companies?.company_name || "", count: 0 };
      }
      repInventory[i.dealer_rep_id].count += (i.quantity || 0);
    }
  });
  const topReps = Object.values(repInventory).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Dealer Companies", value: totalCompanies, icon: Building2, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Representatives", value: totalReps, icon: Users, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Total Stock", value: `${totalStock} units`, icon: Car, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Inventory Value", value: fmt(totalValue), icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
        ].map(kpi => (
          <Card key={kpi.label} className={`${kpi.bg} border-none shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-[10px] font-medium text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* City Distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Dealers by City</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityData} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={55} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Dealers" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Type Breakdown */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Dealer Types</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Brand Inventory */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4" /> Inventory by Brand</CardTitle></CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-[10px]" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} name="Units" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Reps */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4" /> Top Representatives</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topReps.map((rep, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] w-5 h-5 flex items-center justify-center rounded-full">{i + 1}</Badge>
                    <div>
                      <p className="text-xs font-semibold">{rep.name}</p>
                      <p className="text-[10px] text-muted-foreground">{rep.company}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{rep.count} units</Badge>
                </div>
              ))}
              {topReps.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No inventory data</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
