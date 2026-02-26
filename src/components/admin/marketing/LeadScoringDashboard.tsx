import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Target, Flame, ThermometerSun, Snowflake, TrendingUp, 
  Mail, MessageSquare, MousePointer, Eye, FileText,
  Settings, Save, RefreshCw, Search, Filter, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LeadScore {
  id: string;
  lead_id: string;
  score: number;
  engagement_level: string;
  email_opens: number;
  email_clicks: number;
  whatsapp_replies: number;
  page_views: number;
  form_submissions: number;
  last_activity_at: string | null;
  lead?: {
    customer_name: string;
    phone: string;
    email: string | null;
    car_model: string | null;
    status: string;
  };
}

interface ScoringRule {
  action: string;
  label: string;
  icon: any;
  points: number;
  color: string;
}

const DEFAULT_SCORING_RULES: ScoringRule[] = [
  { action: "email_open", label: "Email Opened", icon: Mail, points: 5, color: "text-blue-500" },
  { action: "email_click", label: "Email Click", icon: MousePointer, points: 10, color: "text-green-500" },
  { action: "whatsapp_reply", label: "WhatsApp Reply", icon: MessageSquare, points: 15, color: "text-emerald-500" },
  { action: "page_view", label: "Page View", icon: Eye, points: 3, color: "text-purple-500" },
  { action: "form_submit", label: "Form Submitted", icon: FileText, points: 25, color: "text-orange-500" },
  { action: "brochure_download", label: "Brochure Download", icon: FileText, points: 20, color: "text-cyan-500" },
];

export function LeadScoringDashboard() {
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>(DEFAULT_SCORING_RULES);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeadScores();
  }, []);

  const fetchLeadScores = async () => {
    setIsLoading(true);
    try {
      // Fetch lead scores (no FK to leads, so fetch separately)
      const { data: scores, error } = await supabase
        .from("lead_scores")
        .select("*")
        .order("score", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch associated leads
      const leadIds = (scores || []).map(s => s.lead_id).filter(Boolean);
      let leadsMap: Record<string, any> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from("leads")
          .select("id, customer_name, phone, email, car_model, status")
          .in("id", leadIds);
        (leads || []).forEach(l => { leadsMap[l.id] = l; });
      }
      
      const enriched = (scores || []).map(s => ({
        ...s,
        lead: leadsMap[s.lead_id] || undefined,
      }));
      
      setLeadScores(enriched as any);
    } catch (error) {
      console.error("Error fetching lead scores:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateScore = async (leadId: string) => {
    try {
      // Fetch all activities for the lead
      const { data: activities, error } = await supabase
        .from("lead_activities")
        .select("activity_type")
        .eq("lead_id", leadId);

      if (error) throw error;

      let totalScore = 0;
      let breakdown: Record<string, number> = {};

      activities?.forEach((activity: any) => {
        const rule = scoringRules.find(r => r.action === activity.activity_type);
        const points = rule?.points || 0;
        totalScore += points;
        breakdown[activity.activity_type] = (breakdown[activity.activity_type] || 0) + points;
      });

      // Determine engagement level
      let engagementLevel = 'cold';
      if (totalScore >= 100) engagementLevel = 'qualified';
      else if (totalScore >= 50) engagementLevel = 'hot';
      else if (totalScore >= 20) engagementLevel = 'warm';

      // Upsert score
      await supabase
        .from("lead_scores")
        .upsert({
          lead_id: leadId,
          score: totalScore,
          score_breakdown: breakdown,
          engagement_level: engagementLevel,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'lead_id' });

      toast({ title: "Score updated", description: `Lead score: ${totalScore}` });
      fetchLeadScores();
    } catch (error) {
      console.error("Error calculating score:", error);
      toast({ title: "Error", description: "Failed to calculate score", variant: "destructive" });
    }
  };

  const getEngagementBadge = (level: string) => {
    switch (level) {
      case 'qualified':
        return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white"><Flame className="w-3 h-3 mr-1" /> Qualified</Badge>;
      case 'hot':
        return <Badge className="bg-red-500 text-white"><Flame className="w-3 h-3 mr-1" /> Hot</Badge>;
      case 'warm':
        return <Badge className="bg-orange-500 text-white"><ThermometerSun className="w-3 h-3 mr-1" /> Warm</Badge>;
      default:
        return <Badge variant="secondary"><Snowflake className="w-3 h-3 mr-1" /> Cold</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 100) return "text-amber-500";
    if (score >= 50) return "text-red-500";
    if (score >= 20) return "text-orange-500";
    return "text-muted-foreground";
  };

  const filteredScores = leadScores.filter(score => {
    const matchesSearch = 
      score.lead?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      score.lead?.phone?.includes(searchQuery) ||
      score.lead?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterLevel === "all" || score.engagement_level === filterLevel;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalScored: leadScores.length,
    qualified: leadScores.filter(s => s.engagement_level === 'qualified').length,
    hot: leadScores.filter(s => s.engagement_level === 'hot').length,
    warm: leadScores.filter(s => s.engagement_level === 'warm').length,
    cold: leadScores.filter(s => s.engagement_level === 'cold').length,
    avgScore: leadScores.length > 0 ? Math.round(leadScores.reduce((sum, s) => sum + s.score, 0) / leadScores.length) : 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Scored</p>
                <p className="text-xl font-bold">{stats.totalScored}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Score</p>
                <p className="text-xl font-bold">{stats.avgScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Qualified</p>
                <p className="text-xl font-bold text-amber-500">{stats.qualified}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Hot</p>
                <p className="text-xl font-bold text-red-500">{stats.hot}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ThermometerSun className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Warm</p>
                <p className="text-xl font-bold text-orange-500">{stats.warm}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">Cold</p>
                <p className="text-xl font-bold">{stats.cold}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scoring Rules Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Scoring Rules
            </CardTitle>
            <CardDescription>Points awarded for each engagement action</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {scoringRules.map((rule) => (
              <div key={rule.action} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <rule.icon className={cn("h-5 w-5", rule.color)} />
                <div>
                  <p className="text-sm font-medium">{rule.label}</p>
                  <p className="text-lg font-bold text-primary">+{rule.points} pts</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lead Scores Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Lead Engagement Scores</CardTitle>
              <CardDescription>Leads ranked by engagement score</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search leads..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={fetchLeadScores}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Filter Pills */}
          <div className="flex gap-2 mt-4">
            {["all", "qualified", "hot", "warm", "cold"].map((level) => (
              <Button
                key={level}
                variant={filterLevel === level ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterLevel(level)}
                className="capitalize"
              >
                {level === "all" ? "All" : level}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No scored leads found. Engage with leads to build scores.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScores.map((score, index) => (
                    <TableRow key={score.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{score.lead?.customer_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{score.lead?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-2xl font-bold", getScoreColor(score.score))}>
                            {score.score}
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {getEngagementBadge(score.engagement_level)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-blue-500" />
                            {score.email_opens}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-green-500" />
                            {score.whatsapp_replies}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-purple-500" />
                            {score.page_views}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{score.lead?.car_model || "General"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {score.last_activity_at 
                          ? new Date(score.last_activity_at).toLocaleDateString()
                          : "No activity"
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Scoring Rules Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Scoring Rules</DialogTitle>
            <DialogDescription>
              Adjust point values for each engagement action
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {scoringRules.map((rule, index) => (
              <div key={rule.action} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-48">
                  <rule.icon className={cn("h-5 w-5", rule.color)} />
                  <span className="font-medium">{rule.label}</span>
                </div>
                <Slider
                  value={[rule.points]}
                  max={50}
                  step={1}
                  className="flex-1"
                  onValueChange={(value) => {
                    const updated = [...scoringRules];
                    updated[index].points = value[0];
                    setScoringRules(updated);
                  }}
                />
                <span className="w-16 text-right font-bold text-primary">
                  +{rule.points} pts
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({ title: "Settings saved", description: "Scoring rules updated" });
              setIsSettingsOpen(false);
            }}>
              <Save className="h-4 w-4 mr-2" />
              Save Rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
