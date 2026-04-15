import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Star, TrendingUp, Eye, MousePointerClick, Search,
  Loader2, RefreshCw, Award, Flame, Snowflake, Zap
} from "lucide-react";

interface ScoredSubscriber {
  id: string;
  email: string;
  name: string | null;
  engagement_score: number;
  total_opens: number;
  total_clicks: number;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  tags: string[] | null;
  subscribed: boolean | null;
  created_at: string;
}

const SCORE_TIERS = [
  { min: 80, label: "🔥 Hot", color: "bg-red-100 text-red-800", icon: Flame },
  { min: 50, label: "⚡ Warm", color: "bg-orange-100 text-orange-800", icon: Zap },
  { min: 20, label: "❄️ Cool", color: "bg-blue-100 text-blue-800", icon: Snowflake },
  { min: 0, label: "🧊 Cold", color: "bg-gray-100 text-gray-600", icon: Snowflake },
];

function getScoreTier(score: number) {
  return SCORE_TIERS.find(t => score >= t.min) || SCORE_TIERS[SCORE_TIERS.length - 1];
}

export function ContactScoringPanel() {
  const [subscribers, setSubscribers] = useState<ScoredSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => { fetchSubscribers(); }, []);

  const fetchSubscribers = async () => {
    setIsLoading(true);
    const { data } = await (supabase as any)
      .from("email_subscribers")
      .select("id, email, name, engagement_score, total_opens, total_clicks, last_opened_at, last_clicked_at, tags, subscribed, created_at")
      .order("engagement_score", { ascending: false })
      .limit(500);
    if (data) setSubscribers(data);
    setIsLoading(false);
  };

  const recalculateScores = async () => {
    setIsRecalculating(true);
    // Simple scoring: opens * 5 + clicks * 15, capped at 100
    for (const sub of subscribers) {
      const score = Math.min(100, (sub.total_opens || 0) * 5 + (sub.total_clicks || 0) * 15);
      if (score !== sub.engagement_score) {
        await (supabase as any).from("email_subscribers").update({ engagement_score: score }).eq("id", sub.id);
      }
    }
    toast.success("Scores recalculated for all contacts");
    setIsRecalculating(false);
    fetchSubscribers();
  };

  const filtered = subscribers.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.email.toLowerCase().includes(q) && !(s.name || "").toLowerCase().includes(q)) return false;
    }
    if (tierFilter !== "all") {
      const tier = getScoreTier(s.engagement_score || 0);
      if (!tier.label.toLowerCase().includes(tierFilter)) return false;
    }
    return true;
  });

  const tierStats = SCORE_TIERS.map(tier => ({
    ...tier,
    count: subscribers.filter(s => {
      const score = s.engagement_score || 0;
      const nextTier = SCORE_TIERS[SCORE_TIERS.indexOf(tier) - 1];
      return score >= tier.min && (!nextTier || score < nextTier.min);
    }).length,
  }));

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Score Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tierStats.map(tier => (
          <Card key={tier.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTierFilter(tierFilter === tier.label.split(" ")[1].toLowerCase() ? "all" : tier.label.split(" ")[1].toLowerCase())}>
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-2xl font-bold">{tier.count}</p>
                  <p className="text-xs text-muted-foreground">{tier.label}</p>
                </div>
                <Badge className={tier.color}>{tier.min}+</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button variant="outline" size="sm" onClick={recalculateScores} disabled={isRecalculating}>
          {isRecalculating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
          Recalculate Scores
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4" />Contact Engagement Scores</CardTitle>
          <CardDescription className="text-xs">Based on email opens (5pts) and clicks (15pts), max 100</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No contacts found</TableCell></TableRow>
              ) : filtered.slice(0, 50).map(sub => {
                const tier = getScoreTier(sub.engagement_score || 0);
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{sub.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{sub.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{sub.engagement_score || 0}</span>
                        <Progress value={sub.engagement_score || 0} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell><Badge className={tier.color}>{tier.label}</Badge></TableCell>
                    <TableCell className="text-sm">{sub.total_opens || 0}</TableCell>
                    <TableCell className="text-sm">{sub.total_clicks || 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.last_clicked_at ? new Date(sub.last_clicked_at).toLocaleDateString("en-IN") :
                       sub.last_opened_at ? new Date(sub.last_opened_at).toLocaleDateString("en-IN") : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(sub.tags || []).slice(0, 3).map(t => (
                          <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
