import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Globe, FileText, MessageSquare, Mail, TrendingUp, Eye, Users, Sparkles,
  BarChart3, Zap, Rocket, Shield, Settings, Brain, Image, Palette,
  Phone, Database, Target, ArrowRight, Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface MarketingDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const MarketingDashboard = ({ onNavigate }: MarketingDashboardProps) => {
  const { data: stats } = useQuery({
    queryKey: ["marketing-dashboard-stats-v2"],
    queryFn: async () => {
      const [posts, published, cars, banners, leads] = await Promise.all([
        supabase.from("ai_blog_posts").select("*", { count: "exact", head: true }),
        supabase.from("ai_blog_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("cars").select("*", { count: "exact", head: true }),
        supabase.from("banners").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("leads").select("*", { count: "exact", head: true }),
      ]);
      return {
        totalPosts: posts.count || 0,
        publishedPosts: published.count || 0,
        totalCars: cars.count || 0,
        activeBanners: banners.count || 0,
        totalLeads: leads.count || 0,
      };
    },
  });

  const kpiCards = [
    { label: "Total Leads", value: stats?.totalLeads || 0, icon: Users, gradient: "from-blue-500 to-cyan-500", change: "+12%" },
    { label: "Cars Listed", value: stats?.totalCars || 0, icon: Database, gradient: "from-emerald-500 to-green-500", change: "+5" },
    { label: "Published Content", value: stats?.publishedPosts || 0, icon: FileText, gradient: "from-violet-500 to-purple-500", change: "+3" },
    { label: "Active Banners", value: stats?.activeBanners || 0, icon: Image, gradient: "from-amber-500 to-orange-500", change: "Live" },
  ];

  const workspaceModules = [
    { id: "website-homepage", label: "Website CMS", desc: "Homepage, banners, content", icon: Globe, color: "bg-blue-500/10 text-blue-600", badge: "Core" },
    { id: "content-blog", label: "Blog & News", desc: "Articles, auto news, launches", icon: FileText, color: "bg-violet-500/10 text-violet-600" },
    { id: "marketing-command", label: "WhatsApp Portal", desc: "Campaigns, broadcasts, automation", icon: MessageSquare, color: "bg-emerald-500/10 text-emerald-600", badge: "🔥" },
    { id: "website-seo", label: "SEO & Analytics", desc: "Meta tags, schemas, tracking", icon: TrendingUp, color: "bg-amber-500/10 text-amber-600" },
    { id: "cars-list", label: "Car Database", desc: "Listings, variants, pricing", icon: Database, color: "bg-cyan-500/10 text-cyan-600" },
    { id: "website-branding", label: "Logo & Branding", desc: "Visual identity, colors, fonts", icon: Palette, color: "bg-pink-500/10 text-pink-600" },
    { id: "content-ai", label: "AI Content Hub", desc: "AI-powered content generation", icon: Brain, color: "bg-indigo-500/10 text-indigo-600", badge: "AI" },
    { id: "automation-center", label: "Automation Center", desc: "Workflows, triggers, engines", icon: Zap, color: "bg-orange-500/10 text-orange-600", badge: "🔥" },
  ];

  const managementTools = [
    { id: "unified-crm", label: "Unified Customers", desc: "Cross-vertical customer view", icon: Users, badge: "New" },
    { id: "unified-intelligence", label: "Cross-Vertical Intel", desc: "AI-powered insights", icon: Sparkles, badge: "AI" },
    { id: "revenue-intelligence", label: "Revenue Intelligence", desc: "Financial analytics & forecasting", icon: BarChart3 },
    { id: "journey-automation", label: "Journey Automation", desc: "Customer journey orchestration", icon: Rocket },
    { id: "manager-dashboard", label: "Manager Dashboard", desc: "Team performance & targets", icon: Activity },
    { id: "roles", label: "User & Role Management", desc: "Team access & permissions", icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-6 md:p-8"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Marketing & Tech Hub</h1>
              <p className="text-muted-foreground">Website management, content, SEO, campaigns & system administration</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="relative overflow-hidden border-border/50 hover:shadow-lg transition-shadow">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-[0.04]`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.gradient} bg-opacity-10`}>
                    <kpi.icon className="h-4 w-4 text-white" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-medium">{kpi.change}</Badge>
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Workspace Modules Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Workspace Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {workspaceModules.map((mod, i) => (
            <motion.div key={mod.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Card
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group h-full"
                onClick={() => onNavigate?.(mod.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${mod.color}`}>
                      <mod.icon className="h-5 w-5" />
                    </div>
                    {mod.badge && <Badge variant="secondary" className="text-[10px]">{mod.badge}</Badge>}
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{mod.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{mod.desc}</p>
                  <div className="mt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Management & Intelligence Tools */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Management & Intelligence
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {managementTools.map((tool, i) => (
            <motion.div key={tool.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
              <Card
                className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
                onClick={() => onNavigate?.(tool.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-muted">
                    <tool.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">{tool.label}</h3>
                      {tool.badge && <Badge variant="secondary" className="text-[10px]">{tool.badge}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Content Pipeline Overview */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Content Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { stage: "Draft", count: stats?.totalPosts ? stats.totalPosts - stats.publishedPosts : 0, pct: 100, color: "bg-muted" },
              { stage: "Published", count: stats?.publishedPosts || 0, pct: stats?.totalPosts ? Math.round((stats.publishedPosts / stats.totalPosts) * 100) : 0, color: "bg-emerald-500" },
            ].map((p) => (
              <div key={p.stage} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{p.stage}</span>
                  <span className="font-medium">{p.count}</span>
                </div>
                <Progress value={p.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Quick Access</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "WhatsApp API", id: "integrations-whatsapp", icon: Phone },
                { label: "Site Settings", id: "settings", icon: Settings },
                { label: "Email Campaigns", id: "marketing-email", icon: Mail },
                { label: "Bulk Data", id: "marketing-bulk", icon: Database },
              ].map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => onNavigate?.(a.id)}
                >
                  <a.icon className="h-4 w-4 text-primary mb-1.5" />
                  <p className="text-sm font-medium">{a.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
