import { lazy, Suspense, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Globe,
  Palette,
  Mail,
  TrendingUp,
  Sparkles,
  Wallet,
  Users,
  Target,
  IndianRupee,
  ArrowUpRight,
  RefreshCw,
  Bot,
  BarChart3,
  FileText,
  Brain,
  Megaphone,
  ListChecks,
  LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { RequestApprovalDialog } from "./RequestApprovalDialog";

// Lazy-load tab content (keeps initial bundle small)
const WhatsAppMarketingPortal = lazy(() =>
  import("./WhatsAppMarketingPortal").then((m) => ({ default: m.WhatsAppMarketingPortal })),
);
const UnifiedMarketingHub = lazy(() =>
  import("./UnifiedMarketingHub").then((m) => ({ default: m.UnifiedMarketingHub })),
);
const MarketingCommandCenter = lazy(() =>
  import("./MarketingCommandCenter").then((m) => ({ default: m.MarketingCommandCenter })),
);
const AdSpendAnalytics = lazy(() =>
  import("./AdSpendAnalytics").then((m) => ({ default: m.AdSpendAnalytics })),
);
const AutomationCommandCenter = lazy(() =>
  import("@/components/admin/AutomationCommandCenter"),
);
const AIAutomationHub = lazy(() =>
  import("@/components/admin/automation/AIAutomationHub").then((m) => ({ default: m.AIAutomationHub })),
);
const TemplatesHub = lazy(() =>
  import("@/components/admin/templates-hub/TemplatesHub").then((m) => ({ default: m.TemplatesHub })),
);
const UnifiedCustomerProfile = lazy(() =>
  import("@/components/admin/unified/UnifiedCustomerProfile").then((m) => ({ default: m.UnifiedCustomerProfile })),
);
const RevenueIntelligenceDashboard = lazy(() =>
  import("@/components/admin/RevenueIntelligenceDashboard").then((m) => ({ default: m.RevenueIntelligenceDashboard })),
);
const JourneyAutomationPanel = lazy(() =>
  import("@/components/admin/JourneyAutomationPanel").then((m) => ({ default: m.JourneyAutomationPanel })),
);
const PromoBannerManager = lazy(() =>
  import("./PromoBannerManager").then((m) => ({ default: m.PromoBannerManager })),
);
const MarketingConversionDashboard = lazy(() =>
  import("./MarketingConversionDashboard").then((m) => ({ default: m.MarketingConversionDashboard })),
);
const MarketingAuditChecklist = lazy(() =>
  import("./MarketingAuditChecklist").then((m) => ({ default: m.MarketingAuditChecklist })),
);

const SectionFallback = () => (
  <div className="rounded-xl border border-border bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
    Loading…
  </div>
);

type Kpi = {
  label: string;
  value: string;
  icon: typeof Target;
  tone: string;
  delta?: string;
};

export function MarketingTechHub() {
  const [activeTab, setActiveTab] = useState("whatsapp");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalSpend: 0,
    leads: 0,
    cac: 0,
    roi: 0,
    profit: 0,
  });

  const fetchKpis = async () => {
    setLoading(true);
    try {
      // Pull from ad_campaigns (Meta + Google) for spend / leads
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceIso = since.toISOString();

      const [adsRes, dealsRes] = await Promise.all([
        supabase
          .from("ad_campaigns")
          .select("total_spend, leads_generated, conversions")
          .gte("created_at", sinceIso),
        supabase
          .from("deals")
          .select("payment_received_amount, deal_value, payment_status, closed_at")
          .gte("closed_at", sinceIso)
          .in("payment_status", ["received", "partial"]),
      ]);

      const ads = adsRes.data || [];
      const deals = dealsRes.data || [];

      const totalSpend = ads.reduce((s, r: any) => s + Number(r.total_spend || 0), 0);
      const leads = ads.reduce((s, r: any) => s + Number(r.leads_generated || 0), 0);
      const revenue = deals.reduce(
        (s, r: any) => s + Number(r.payment_received_amount || r.deal_value || 0),
        0,
      );
      const cac = leads > 0 ? Math.round(totalSpend / leads) : 0;
      const profit = revenue - totalSpend;
      const roi = totalSpend > 0 ? Math.round((profit / totalSpend) * 100) : 0;

      setKpis({ totalSpend, leads, cac, roi, profit });
    } catch (e) {
      console.error("[MarketingTechHub] kpi fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  const fmtINR = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n || 0);

  const kpiCards: Kpi[] = [
    {
      label: "Total Spend (30d)",
      value: fmtINR(kpis.totalSpend),
      icon: Wallet,
      tone: "from-blue-500/15 to-blue-500/5 text-blue-500",
    },
    {
      label: "Leads",
      value: new Intl.NumberFormat("en-IN").format(kpis.leads),
      icon: Users,
      tone: "from-purple-500/15 to-purple-500/5 text-purple-500",
    },
    {
      label: "CAC",
      value: fmtINR(kpis.cac),
      icon: Target,
      tone: "from-orange-500/15 to-orange-500/5 text-orange-500",
    },
    {
      label: "ROI",
      value: `${kpis.roi}%`,
      icon: TrendingUp,
      tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-500",
    },
    {
      label: "Profit (30d)",
      value: fmtINR(kpis.profit),
      icon: IndianRupee,
      tone: "from-green-500/15 to-green-500/5 text-green-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Marketing & Tech</h1>
            <p className="text-sm text-muted-foreground">
              WhatsApp · Website · Branding · Email · Ads — sab ek jagah, live KPIs ke saath.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RequestApprovalDialog
            buttonLabel="Submit for Approval"
            buttonVariant="outline"
            area="marketing_tech"
          />
          <Button variant="outline" size="sm" onClick={fetchKpis} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh KPIs
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className={cn("border-border overflow-hidden")}>
              <CardContent
                className={cn(
                  "p-4 bg-gradient-to-br",
                  k.tone.split(" ").slice(0, 2).join(" "),
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {k.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{k.value}</p>
                  </div>
                  <div
                    className={cn(
                      "p-2 rounded-lg bg-background/60",
                      k.tone.split(" ").slice(2).join(" "),
                    )}
                  >
                    <k.icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="website" className="gap-2">
            <Globe className="h-4 w-4" />
            <span>Website</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            <span>Branding</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Ads</span>
            <Badge variant="secondary" className="ml-1 hidden md:inline-flex text-[10px]">
              Google + Meta
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <Bot className="h-4 w-4" />
            <span>Automation</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Brain className="h-4 w-4" />
            <span>AI Hub</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" />
            <span>Customers</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-2">
            <Megaphone className="h-4 w-4" />
            <span>Banners</span>
          </TabsTrigger>
          <TabsTrigger value="conversions" className="gap-2">
            <LineChart className="h-4 w-4" />
            <span>Conversions</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <ListChecks className="h-4 w-4" />
            <span>Audit</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          <Suspense fallback={<SectionFallback />}>
            <WhatsAppMarketingPortal />
          </Suspense>
        </TabsContent>

        <TabsContent value="website">
          <Suspense fallback={<SectionFallback />}>
            <WebsiteTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="branding">
          <Suspense fallback={<SectionFallback />}>
            <BrandingTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="email">
          <Suspense fallback={<SectionFallback />}>
            <UnifiedMarketingHub />
          </Suspense>
        </TabsContent>

        <TabsContent value="ads">
          <Suspense fallback={<SectionFallback />}>
            <AdsTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="automation">
          <Suspense fallback={<SectionFallback />}>
            <div className="space-y-4">
              <AutomationCommandCenter />
              <JourneyAutomationPanel />
            </div>
          </Suspense>
        </TabsContent>

        <TabsContent value="ai">
          <Suspense fallback={<SectionFallback />}>
            <AIAutomationHub />
          </Suspense>
        </TabsContent>

        <TabsContent value="templates">
          <Suspense fallback={<SectionFallback />}>
            <TemplatesHub />
          </Suspense>
        </TabsContent>

        <TabsContent value="customers">
          <Suspense fallback={<SectionFallback />}>
            <UnifiedCustomerProfile />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics">
          <Suspense fallback={<SectionFallback />}>
            <RevenueIntelligenceDashboard />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Optional: keep old command center accessible at the bottom for legacy users */}
      <details className="rounded-xl border border-dashed border-border bg-card/40">
        <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
          Show Marketing Command Center (legacy view)
        </summary>
        <div className="p-4 border-t border-border">
          <Suspense fallback={<SectionFallback />}>
            <MarketingCommandCenter />
          </Suspense>
        </div>
      </details>
    </div>
  );
}

/* ---------- Lightweight inner tab wrappers ---------- */

function WebsiteTab() {
  // Re-uses existing CMS / blog / launches etc. via deep links inside admin.
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Website & Content</h3>
            <p className="text-xs text-muted-foreground">
              Blog posts, launches, SEO, auto news & landing pages.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { id: "content-blog", label: "Blog Posts", desc: "Write & publish articles" },
            { id: "content-news", label: "Auto News", desc: "AI-curated automotive news" },
            { id: "content-launches", label: "Launches & Upcoming", desc: "Upcoming car launches" },
            { id: "content-ai", label: "AI Content Hub", desc: "Generate posts with AI" },
            { id: "content-intelligence", label: "Auto Intelligence", desc: "Automation settings" },
            { id: "mkt-services", label: "Services & Pricing", desc: "Manage public service pages" },
          ].map((it) => (
            <a
              key={it.id}
              href={`?tab=${it.id}`}
              className="block rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-card/70 transition"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{it.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BrandingTab() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Branding & Identity</h3>
            <p className="text-xs text-muted-foreground">
              Logo, colors, business profile & PDF branding assets.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { id: "profile-logo", label: "Logo & Branding", desc: "Brand logo, colors, theme" },
            { id: "profile-business", label: "Business Profile", desc: "Company info, GST, address" },
            { id: "profile-contact", label: "Contact Config", desc: "Public contact channels" },
          ].map((it) => (
            <a
              key={it.id}
              href={`?tab=${it.id}`}
              className="block rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-card/70 transition"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{it.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdsTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Ads — Google & Meta</h3>
                <p className="text-xs text-muted-foreground">
                  Live spend, leads, CAC, ROI & profit across both platforms.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Live Sync
            </Badge>
          </div>
        </CardContent>
      </Card>
      <AdSpendAnalytics />
    </div>
  );
}

export default MarketingTechHub;
