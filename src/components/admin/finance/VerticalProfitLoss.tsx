
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, IndianRupee, Plus, Car, Shield, Banknote,
  CreditCard, ShoppingBag, Truck, Settings, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Download
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const VERTICAL_ICONS: Record<string, React.ElementType> = {
  "car-sales": Car, insurance: Shield, loans: Banknote, hsrp: CreditCard,
  accessories: ShoppingBag, "self-drive": Truck,
};

const VERTICAL_COLORS: Record<string, string> = {
  "car-sales": "#3b82f6", insurance: "#10b981", loans: "#f59e0b",
  hsrp: "#8b5cf6", accessories: "#ec4899", "self-drive": "#06b6d4",
};

const fmt = (v: number) => `Rs. ${Math.round(v || 0).toLocaleString("en-IN")}`;

export const VerticalProfitLoss = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedVertical, setSelectedVertical] = useState("all");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [dateRange, setDateRange] = useState("all");

  // Fetch configs
  const { data: configs = [] } = useQuery({
    queryKey: ["vertical-profit-configs"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("vertical_profit_config").select("*").order("vertical_name");
      return data || [];
    },
  });

  // Fetch entries
  const { data: entries = [] } = useQuery({
    queryKey: ["vertical-pl-entries", selectedVertical, dateRange],
    queryFn: async () => {
      let query = (supabase as any).from("vertical_pl_entries").select("*").order("entry_date", { ascending: false });
      if (selectedVertical !== "all") query = query.eq("vertical_slug", selectedVertical);
      if (dateRange === "this-month") {
        const start = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
        query = query.gte("entry_date", start);
      } else if (dateRange === "last-3") {
        const d = new Date(); d.setMonth(d.getMonth() - 3);
        query = query.gte("entry_date", format(d, "yyyy-MM-dd"));
      }
      const { data } = await query;
      return data || [];
    },
  });

  // Add entry mutation
  const addEntry = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await (supabase.from("vertical_pl_entries") as any).insert(entry);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vertical-pl-entries"] });
      toast.success("P&L entry added");
      setShowAddEntry(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Aggregate stats
  const stats = useMemo(() => {
    const totalRevenue = entries.reduce((s: number, e: any) => s + Number(e.gross_revenue || 0), 0);
    const totalCost = entries.reduce((s: number, e: any) => s + Number(e.cost_of_service || 0), 0);
    const totalGST = entries.reduce((s: number, e: any) => s + Number(e.gst_amount || 0), 0);
    const totalProfit = entries.reduce((s: number, e: any) => s + Number(e.profit || 0), 0);
    const avgMargin = entries.length > 0 ? entries.reduce((s: number, e: any) => s + Number(e.margin_percentage || 0), 0) / entries.length : 0;

    // Per-vertical breakdown
    const byVertical: Record<string, { revenue: number; profit: number; count: number; cost: number }> = {};
    entries.forEach((e: any) => {
      if (!byVertical[e.vertical_slug]) byVertical[e.vertical_slug] = { revenue: 0, profit: 0, count: 0, cost: 0 };
      byVertical[e.vertical_slug].revenue += Number(e.gross_revenue || 0);
      byVertical[e.vertical_slug].profit += Number(e.profit || 0);
      byVertical[e.vertical_slug].cost += Number(e.cost_of_service || 0);
      byVertical[e.vertical_slug].count++;
    });

    // Monthly trend
    const monthly: Record<string, { month: string; revenue: number; profit: number; cost: number }> = {};
    entries.forEach((e: any) => {
      const m = e.month_year || e.entry_date?.substring(0, 7);
      if (!monthly[m]) monthly[m] = { month: m, revenue: 0, profit: 0, cost: 0 };
      monthly[m].revenue += Number(e.gross_revenue || 0);
      monthly[m].profit += Number(e.profit || 0);
      monthly[m].cost += Number(e.cost_of_service || 0);
    });

    return {
      totalRevenue, totalCost, totalGST, totalProfit, avgMargin,
      byVertical,
      monthlyTrend: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
    };
  }, [entries]);

  const verticalPieData = Object.entries(stats.byVertical).map(([slug, d]) => ({
    name: configs.find((c: any) => c.vertical_slug === slug)?.vertical_name || slug,
    value: d.profit,
    slug,
  }));

  const verticalBarData = Object.entries(stats.byVertical).map(([slug, d]) => ({
    name: configs.find((c: any) => c.vertical_slug === slug)?.vertical_name || slug,
    revenue: d.revenue,
    profit: d.profit,
    cost: d.cost,
    slug,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Profit & Loss by Vertical</h2>
          <p className="text-sm text-muted-foreground">Track revenue, cost & margin across every business line</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-3">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedVertical} onValueChange={setSelectedVertical}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              {configs.map((c: any) => (
                <SelectItem key={c.vertical_slug} value={c.vertical_slug}>{c.vertical_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowAddEntry(true)}>
            <Plus className="h-4 w-4 mr-1" /> Record Entry
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Gross Revenue</p>
            <p className="text-lg font-bold">{fmt(stats.totalRevenue)}</p>
            <span className="text-xs text-muted-foreground">{entries.length} transactions</span>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Cost of Service</p>
            <p className="text-lg font-bold text-red-600">{fmt(stats.totalCost)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">GST Collected</p>
            <p className="text-lg font-bold text-orange-600">{fmt(stats.totalGST)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
            <p className={`text-lg font-bold ${stats.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(stats.totalProfit)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Margin</p>
            <p className="text-lg font-bold text-purple-600">{stats.avgMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vertical-breakdown">Vertical Breakdown</TabsTrigger>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="margin-settings">Margin Settings</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Revenue vs Profit</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Profit Share by Vertical</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={verticalPieData} cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} dataKey="value">
                      {verticalPieData.map((entry, i) => (
                        <Cell key={i} fill={VERTICAL_COLORS[entry.slug] || "#64748b"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Per Vertical Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((cfg: any) => {
              const vd = stats.byVertical[cfg.vertical_slug] || { revenue: 0, profit: 0, count: 0, cost: 0 };
              const Icon = VERTICAL_ICONS[cfg.vertical_slug] || TrendingUp;
              const margin = vd.revenue > 0 ? (vd.profit / vd.revenue * 100) : 0;
              return (
                <Card key={cfg.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${VERTICAL_COLORS[cfg.vertical_slug]}20` }}>
                        <Icon className="h-5 w-5" style={{ color: VERTICAL_COLORS[cfg.vertical_slug] }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{cfg.vertical_name}</p>
                        <p className="text-xs text-muted-foreground">{vd.count} deals</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="font-medium">{fmt(vd.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Profit</p>
                        <p className={`font-medium ${vd.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(vd.profit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cost</p>
                        <p className="font-medium text-red-500">{fmt(vd.cost)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Margin</p>
                        <p className="font-medium">{margin.toFixed(1)}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">{cfg.margin_description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* VERTICAL BREAKDOWN TAB */}
        <TabsContent value="vertical-breakdown" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue vs Profit vs Cost</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={verticalBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="cost" name="Cost" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Per-unit earnings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((cfg: any) => {
              const vd = stats.byVertical[cfg.vertical_slug] || { revenue: 0, profit: 0, count: 0 };
              const perUnit = vd.count > 0 ? vd.profit / vd.count : 0;
              const Icon = VERTICAL_ICONS[cfg.vertical_slug] || TrendingUp;
              return (
                <Card key={cfg.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${VERTICAL_COLORS[cfg.vertical_slug]}15` }}>
                      <Icon className="h-6 w-6" style={{ color: VERTICAL_COLORS[cfg.vertical_slug] }} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Per {cfg.vertical_slug === "insurance" ? "Policy" : cfg.vertical_slug === "loans" ? "Disbursement" : cfg.vertical_slug === "hsrp" ? "Plate" : "Deal"}</p>
                      <p className="text-lg font-bold">{fmt(perUnit)}</p>
                      <p className="text-xs text-muted-foreground">{cfg.vertical_name} • {vd.count} entries</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TRANSACTIONS TAB */}
        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Vertical</th>
                      <th className="text-left p-3 font-medium">Customer</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium">Revenue</th>
                      <th className="text-right p-3 font-medium">Cost</th>
                      <th className="text-right p-3 font-medium">GST</th>
                      <th className="text-right p-3 font-medium">Profit</th>
                      <th className="text-right p-3 font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 && (
                      <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No P&L entries recorded yet. Click "Record Entry" to add.</td></tr>
                    )}
                    {entries.map((e: any) => {
                      const Icon = VERTICAL_ICONS[e.vertical_slug] || TrendingUp;
                      return (
                        <tr key={e.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">{e.entry_date ? format(new Date(e.entry_date), "dd MMM yy") : "-"}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs gap-1">
                              <Icon className="h-3 w-3" />{configs.find((c: any) => c.vertical_slug === e.vertical_slug)?.vertical_name || e.vertical_slug}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium">{e.customer_name || "-"}</td>
                          <td className="p-3 text-muted-foreground max-w-[200px] truncate">{e.description || "-"}</td>
                          <td className="p-3 text-right">{fmt(e.gross_revenue)}</td>
                          <td className="p-3 text-right text-red-600">{fmt(e.cost_of_service)}</td>
                          <td className="p-3 text-right text-orange-600">{fmt(e.gst_amount)}</td>
                          <td className={`p-3 text-right font-medium ${Number(e.profit) >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(e.profit)}</td>
                          <td className="p-3 text-right">{Number(e.margin_percentage).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MARGIN SETTINGS TAB */}
        <TabsContent value="margin-settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Vertical Margin Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {configs.map((cfg: any) => {
                  const Icon = VERTICAL_ICONS[cfg.vertical_slug] || TrendingUp;
                  const configJson = cfg.config_json || {};
                  return (
                    <div key={cfg.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${VERTICAL_COLORS[cfg.vertical_slug]}20` }}>
                        <Icon className="h-5 w-5" style={{ color: VERTICAL_COLORS[cfg.vertical_slug] }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{cfg.vertical_name}</p>
                          <Badge variant="outline" className="text-xs">{cfg.margin_type}</Badge>
                          {cfg.margin_value > 0 && <Badge className="text-xs">{cfg.margin_type === "fixed" ? `Rs.${cfg.margin_value}` : `${cfg.margin_value}%`}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{cfg.margin_description}</p>
                        {cfg.vertical_slug === "insurance" && (
                          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                            <span>Motor: {configJson.motor_margin_min}-{configJson.motor_margin_max}%</span>
                            <span>Bus: {configJson.bus_margin}%</span>
                            <span>GST: {configJson.gst}%</span>
                          </div>
                        )}
                        {cfg.vertical_slug === "loans" && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Commission Range: {configJson.min_margin}-{configJson.max_margin}% of disbursement
                          </div>
                        )}
                        {cfg.vertical_slug === "self-drive" && (
                          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                            <span>Partner: {configJson.partner_margin}%</span>
                            <span>Own Car: {configJson.own_car_margin}%</span>
                          </div>
                        )}
                        {cfg.vertical_slug === "car-sales" && configJson.components && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {configJson.components.map((c: string) => (
                              <Badge key={c} variant="secondary" className="text-xs">{c.replace(/_/g, " ")}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <AddEntryDialog
        open={showAddEntry}
        onOpenChange={setShowAddEntry}
        configs={configs}
        onSubmit={(entry: any) => addEntry.mutate(entry)}
      />
    </div>
  );
};

// Add Entry Dialog Component
function AddEntryDialog({ open, onOpenChange, configs, onSubmit }: any) {
  const [form, setForm] = useState({
    vertical_slug: "", customer_name: "", description: "",
    gross_revenue: "", cost_of_service: "", gst_amount: "",
    entry_date: format(new Date(), "yyyy-MM-dd"),
    reference_type: "", reference_id: "",
  });

  const profit = Number(form.gross_revenue || 0) - Number(form.cost_of_service || 0) - Number(form.gst_amount || 0);
  const margin = Number(form.gross_revenue) > 0 ? (profit / Number(form.gross_revenue)) * 100 : 0;

  const handleSubmit = () => {
    if (!form.vertical_slug || !form.gross_revenue) {
      toast.error("Select vertical and enter revenue"); return;
    }
    onSubmit({
      ...form,
      gross_revenue: Number(form.gross_revenue),
      cost_of_service: Number(form.cost_of_service || 0),
      gst_amount: Number(form.gst_amount || 0),
      net_revenue: Number(form.gross_revenue) - Number(form.gst_amount || 0),
      profit,
      margin_percentage: margin,
    });
    setForm({ vertical_slug: "", customer_name: "", description: "", gross_revenue: "", cost_of_service: "", gst_amount: "", entry_date: format(new Date(), "yyyy-MM-dd"), reference_type: "", reference_id: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record P&L Entry</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vertical *</Label>
              <Select value={form.vertical_slug} onValueChange={v => setForm(f => ({ ...f, vertical_slug: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {configs.map((c: any) => <SelectItem key={c.vertical_slug} value={c.vertical_slug}>{c.vertical_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Customer Name</Label>
            <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Customer or deal name" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Deal details, breakdown..." rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Gross Revenue *</Label>
              <Input type="number" value={form.gross_revenue} onChange={e => setForm(f => ({ ...f, gross_revenue: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Cost of Service</Label>
              <Input type="number" value={form.cost_of_service} onChange={e => setForm(f => ({ ...f, cost_of_service: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">GST Amount</Label>
              <Input type="number" value={form.gst_amount} onChange={e => setForm(f => ({ ...f, gst_amount: e.target.value }))} placeholder="0" />
            </div>
          </div>

          {/* Live Calculation */}
          <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className={`text-lg font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(profit)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className="text-lg font-bold">{margin.toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Reference Type</Label>
              <Select value={form.reference_type} onValueChange={v => setForm(f => ({ ...f, reference_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deal">Car Deal</SelectItem>
                  <SelectItem value="policy">Insurance Policy</SelectItem>
                  <SelectItem value="loan">Loan Disbursement</SelectItem>
                  <SelectItem value="hsrp">HSRP Order</SelectItem>
                  <SelectItem value="accessory_order">Accessory Order</SelectItem>
                  <SelectItem value="rental">Rental Booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Reference ID</Label>
              <Input value={form.reference_id} onChange={e => setForm(f => ({ ...f, reference_id: e.target.value }))} placeholder="Deal/Policy #" />
            </div>
          </div>

          <Button className="w-full" onClick={handleSubmit}>
            <Plus className="h-4 w-4 mr-1" /> Record Entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VerticalProfitLoss;
