import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Rocket, TrendingUp, Users, Mail, MessageSquare, Target, 
  Zap, BarChart3, Bell, Clock, CheckCircle, Play, Pause,
  PlusCircle, Settings, RefreshCw, ArrowUpRight, Flame,
  ThermometerSun, Snowflake, Star, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Sub-components
import { LeadScoringDashboard } from "./LeadScoringDashboard";
import { JourneyBuilder } from "./JourneyBuilder";
import { WhatsAppMarketingPortal } from "./WhatsAppMarketingPortal";
import { CampaignAnalytics } from "./CampaignAnalytics";
import { MarketingAlerts } from "./MarketingAlerts";
import { EmailCampaignBuilder } from "./EmailCampaignBuilder";

interface MarketingStats {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  activeJourneys: number;
  totalEnrolled: number;
  emailsSent: number;
  emailOpenRate: number;
  whatsappSent: number;
  whatsappReplyRate: number;
  activeCampaigns: number;
  conversionRate: number;
}

export function MarketingCommandCenter() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<MarketingStats>({
    totalLeads: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    activeJourneys: 0,
    totalEnrolled: 0,
    emailsSent: 0,
    emailOpenRate: 0,
    whatsappSent: 0,
    whatsappReplyRate: 0,
    activeCampaigns: 0,
    conversionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch all stats in parallel
      const [
        leadsRes,
        scoresRes,
        journeysRes,
        emailLogsRes,
        campaignsRes,
        broadcastsRes
      ] = await Promise.all([
        supabase.from("leads").select("id, status, priority", { count: "exact" }),
        supabase.from("lead_scores").select("engagement_level", { count: "exact" }),
        supabase.from("journey_automations").select("id, is_active, total_enrolled"),
        supabase.from("email_logs").select("id, status, opened_at", { count: "exact" }),
        supabase.from("marketing_campaigns").select("id, status"),
        supabase.from("whatsapp_broadcasts").select("id, sent_count, reply_count"),
      ]);

      // Calculate stats
      const totalLeads = leadsRes.count || 0;
      const scores = scoresRes.data || [];
      const hotLeads = scores.filter(s => s.engagement_level === 'hot').length;
      const warmLeads = scores.filter(s => s.engagement_level === 'warm').length;
      const coldLeads = scores.filter(s => s.engagement_level === 'cold').length;
      
      const journeys = journeysRes.data || [];
      const activeJourneys = journeys.filter(j => j.is_active).length;
      const totalEnrolled = journeys.reduce((sum, j) => sum + (j.total_enrolled || 0), 0);
      
      const emailLogs = emailLogsRes.data || [];
      const emailsSent = emailLogs.filter(e => e.status === 'sent').length;
      const emailOpens = emailLogs.filter(e => e.opened_at).length;
      const emailOpenRate = emailsSent > 0 ? Math.round((emailOpens / emailsSent) * 100) : 0;
      
      const campaigns = campaignsRes.data || [];
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      
      const broadcasts = broadcastsRes.data || [];
      const whatsappSent = broadcasts.reduce((sum, b) => sum + (b.sent_count || 0), 0);
      const whatsappReplies = broadcasts.reduce((sum, b) => sum + (b.reply_count || 0), 0);
      const whatsappReplyRate = whatsappSent > 0 ? Math.round((whatsappReplies / whatsappSent) * 100) : 0;

      setStats({
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        activeJourneys,
        totalEnrolled,
        emailsSent,
        emailOpenRate,
        whatsappSent,
        whatsappReplyRate,
        activeCampaigns,
        conversionRate: totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0,
      });

    } catch (error) {
      console.error("Error fetching marketing stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { 
      label: "Total Leads", 
      value: stats.totalLeads, 
      icon: Users, 
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      change: "+12%"
    },
    { 
      label: "Hot Leads", 
      value: stats.hotLeads, 
      icon: Flame, 
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      change: "+8%"
    },
    { 
      label: "Warm Leads", 
      value: stats.warmLeads, 
      icon: ThermometerSun, 
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      change: "+15%"
    },
    { 
      label: "Active Journeys", 
      value: stats.activeJourneys, 
      icon: Zap, 
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      change: ""
    },
    { 
      label: "Email Open Rate", 
      value: `${stats.emailOpenRate}%`, 
      icon: Mail, 
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      change: "+3%"
    },
    { 
      label: "WhatsApp Replies", 
      value: `${stats.whatsappReplyRate}%`, 
      icon: MessageSquare, 
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      change: "+5%"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            Marketing Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Lead generation engine with email, WhatsApp, and journey automation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className={cn("absolute top-2 right-2 p-1.5 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.change && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      {stat.change}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="lead-scoring" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Lead Scoring</span>
          </TabsTrigger>
          <TabsTrigger value="journeys" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Journeys</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <CampaignAnalytics />
        </TabsContent>

        {/* Lead Scoring Tab */}
        <TabsContent value="lead-scoring">
          <LeadScoringDashboard />
        </TabsContent>

        {/* Journeys Tab */}
        <TabsContent value="journeys">
          <JourneyBuilder />
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <EmailCampaignBuilder />
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <WhatsAppMarketingPortal />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <MarketingAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MarketingCommandCenter;
