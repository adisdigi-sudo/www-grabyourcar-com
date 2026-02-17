import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, FileText, MessageSquare, Mail, TrendingUp, Eye, Users, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MarketingDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["marketing-dashboard-stats"],
    queryFn: async () => {
      const { count: totalPosts } = await supabase
        .from("ai_blog_posts")
        .select("*", { count: "exact", head: true });

      const { count: publishedPosts } = await supabase
        .from("ai_blog_posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "published");

      return { totalPosts: totalPosts || 0, publishedPosts: publishedPosts || 0 };
    },
  });

  const kpis = [
    { label: "Blog Posts", value: stats?.totalPosts || 0, icon: FileText, color: "text-blue-500" },
    { label: "Published", value: stats?.publishedPosts || 0, icon: Eye, color: "text-green-500" },
    { label: "Campaigns", value: "—", icon: Mail, color: "text-amber-500" },
    { label: "Engagement", value: "—", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-7 w-7 text-primary" />
          Marketing & Tech Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Website, content, SEO, and campaign management</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Content Pipeline</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Draft", "Review", "Scheduled", "Published"].map((stage, i) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm">{stage}</span>
                  <Badge variant={i === 3 ? "default" : "outline"} className="text-xs">
                    {[3, 2, 1, stats?.publishedPosts || 0][i]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {[
              { label: "Website Manager", icon: Globe },
              { label: "Blog Posts", icon: FileText },
              { label: "WhatsApp", icon: MessageSquare },
              { label: "AI Content", icon: Sparkles },
            ].map((a) => (
              <Badge key={a.label} variant="outline" className="px-4 py-2 text-sm cursor-pointer hover:bg-accent">
                <a.icon className="h-4 w-4 mr-2" />{a.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
