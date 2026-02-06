import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight, 
  Users, Mail, MessageSquare, Target, DollarSign, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { motion } from "framer-motion";

interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalReach: number;
  totalConversions: number;
  conversionRate: number;
  estimatedRevenue: number;
}

export function CampaignAnalytics() {
  const [metrics, setMetrics] = useState<CampaignMetrics>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalReach: 0,
    totalConversions: 0,
    conversionRate: 0,
    estimatedRevenue: 0,
  });
  const [dateRange, setDateRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const [campaignsRes, emailLogsRes, broadcastsRes] = await Promise.all([
        supabase.from("marketing_campaigns").select("*"),
        supabase.from("email_logs").select("status, opened_at, clicked_at"),
        supabase.from("whatsapp_broadcasts").select("sent_count, reply_count"),
      ]);

      const campaigns = campaignsRes.data || [];
      const emailLogs = emailLogsRes.data || [];
      const broadcasts = broadcastsRes.data || [];

      const totalReach = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0) +
        broadcasts.reduce((sum, b) => sum + (b.sent_count || 0), 0);
      
      const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversion_count || 0), 0);

      setMetrics({
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        totalReach,
        totalConversions,
        conversionRate: totalReach > 0 ? Math.round((totalConversions / totalReach) * 100) : 0,
        estimatedRevenue: totalConversions * 50000, // Average car value attribution
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sample data for charts
  const weeklyData = [
    { day: "Mon", leads: 45, emails: 120, whatsapp: 80 },
    { day: "Tue", leads: 52, emails: 140, whatsapp: 95 },
    { day: "Wed", leads: 38, emails: 100, whatsapp: 70 },
    { day: "Thu", leads: 65, emails: 180, whatsapp: 110 },
    { day: "Fri", leads: 58, emails: 160, whatsapp: 100 },
    { day: "Sat", leads: 42, emails: 90, whatsapp: 60 },
    { day: "Sun", leads: 35, emails: 70, whatsapp: 45 },
  ];

  const channelData = [
    { name: "Email", value: 45, color: "hsl(var(--primary))" },
    { name: "WhatsApp", value: 35, color: "#25D366" },
    { name: "Website", value: 20, color: "hsl(var(--muted-foreground))" },
  ];

  const funnelData = [
    { stage: "Leads", count: 1250, color: "hsl(var(--muted-foreground))" },
    { stage: "Engaged", count: 890, color: "hsl(var(--primary))" },
    { stage: "Qualified", count: 420, color: "#f97316" },
    { stage: "Converted", count: 85, color: "#22c55e" },
  ];

  const metricCards = [
    { 
      label: "Total Campaigns", 
      value: metrics.totalCampaigns, 
      icon: Target,
      change: "+3",
      changeType: "up"
    },
    { 
      label: "Total Reach", 
      value: metrics.totalReach.toLocaleString(), 
      icon: Users,
      change: "+12%",
      changeType: "up"
    },
    { 
      label: "Conversions", 
      value: metrics.totalConversions, 
      icon: TrendingUp,
      change: "+8%",
      changeType: "up"
    },
    { 
      label: "Conversion Rate", 
      value: `${metrics.conversionRate}%`, 
      icon: BarChart3,
      change: "+2%",
      changeType: "up"
    },
    { 
      label: "Est. Revenue", 
      value: `₹${(metrics.estimatedRevenue / 100000).toFixed(1)}L`, 
      icon: DollarSign,
      change: "+15%",
      changeType: "up"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <metric.icon className="h-5 w-5 text-muted-foreground" />
                  <Badge 
                    variant="outline" 
                    className={metric.changeType === "up" ? "text-green-600 border-green-200" : "text-red-600 border-red-200"}
                  >
                    {metric.changeType === "up" ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {metric.change}
                  </Badge>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Performance
            </CardTitle>
            <CardDescription>Lead generation and engagement by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="emails" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Lead Sources
            </CardTitle>
            <CardDescription>Where your leads come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {channelData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>Lead journey from awareness to conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-4 h-[200px]">
            {funnelData.map((stage, index) => {
              const height = (stage.count / funnelData[0].count) * 100;
              return (
                <motion.div
                  key={stage.stage}
                  className="flex-1 flex flex-col items-center"
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div 
                    className="w-full rounded-t-lg transition-all"
                    style={{ 
                      height: `${height}%`,
                      backgroundColor: stage.color,
                      minHeight: '40px'
                    }}
                  />
                  <div className="text-center mt-3">
                    <p className="font-bold text-lg">{stage.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{stage.stage}</p>
                    {index > 0 && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {Math.round((stage.count / funnelData[index - 1].count) * 100)}%
                      </Badge>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
