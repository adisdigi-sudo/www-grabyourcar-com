import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity, AlertCircle, ArrowRight, Bot, CheckCircle2, FileText,
  MessageSquare, RefreshCw, Search, Sparkles, Workflow, Zap,
  ShieldCheck, Phone, Calendar, IndianRupee, Image as ImageIcon,
  Bell, Send, GitBranch, Database, Filter, Eye, ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/** Visual specification of every WhatsApp automation in the platform.
 *  Source-of-truth doc: this file. Anyone (you, future devs, ops team)
 *  can open Flow Map and instantly see what runs, when, with what data.
 */

type FlowKind = "outbound-trigger" | "inbound-bot" | "scheduled" | "document";

interface FlowSpec {
  id: string;
  kind: FlowKind;
  vertical: "insurance" | "loans" | "sales" | "hsrp" | "rentals" | "accessories" | "global";
  title: string;
  /** When does this fire? */
  event: string;
  /** What conditions must be true? */
  conditions: string[];
  /** Where does data come from? */
  dataSources: string[];
  /** What gets sent? */
  output: { type: "text" | "template" | "pdf" | "image" | "ai-reply"; detail: string };
  /** Which template name (if any) is used */
  templateName?: string;
  /** intent tag we recorded in wa_inbox_messages.intent (for live-count) */
  intentTag?: string;
  /** db trigger / edge function responsible */
  engine: string;
  /** docs link / file pointer for devs */
  source: string;
}

const FLOWS: FlowSpec[] = [
  // ──────────────── INBOUND BOT ────────────────
  {
    id: "inbound-ai-brain",
    kind: "inbound-bot",
    vertical: "global",
    title: "AI Auto-Reply Brain",
    event: "Customer sends ANY incoming WhatsApp message",
    conditions: [
      "No active sales engine session",
      "Chatbot rule didn't match",
      "Human takeover OFF (auto-resets after 2h inactivity)",
      "Within 24h service window (else falls back to template)",
    ],
    dataSources: ["wa_conversations", "ai-brain edge function (Gemini)"],
    output: { type: "ai-reply", detail: "Context-aware reply with handoff to agent on keyword 'agent', 'human', 'representative'" },
    intentTag: "ai_reply",
    engine: "whatsapp-webhook → ai-brain",
    source: "supabase/functions/whatsapp-webhook/index.ts (line 860+)",
  },
  {
    id: "inbound-chatbot-rules",
    kind: "inbound-bot",
    vertical: "global",
    title: "Smart Triggers (Keyword → Action)",
    event: "Incoming message matches a keyword rule (e.g. 'policy', 'invoice', 'brochure')",
    conditions: [
      "Rule is_active = true",
      "Keyword matched (Hinglish + typo variants supported)",
      "If document intent → identity fields (vehicle_number / phone) extracted",
    ],
    dataSources: ["wa_chatbot_rules", "insurance_policies / invoices / cars (auto-fetched from DB)"],
    output: { type: "pdf", detail: "Auto-fetches PDF from DB and sends via WhatsApp + text reply" },
    intentTag: "manual_chat",
    engine: "whatsapp-webhook (chatbot rules step)",
    source: "WAHubSmartTriggers.tsx + webhook line 870+",
  },
  {
    id: "inbound-sales-engine",
    kind: "inbound-bot",
    vertical: "global",
    title: "Sales Engine Router",
    event: "Customer is in active sales sequence (auto-started on first lead reply)",
    conditions: [
      "sales_engine_session active for this phone",
      "Vertical engine is_active = true",
    ],
    dataSources: ["sales_engines", "sales_engine_steps", "sales_engine_sessions"],
    output: { type: "template", detail: "Next step in pre-defined sequence (text / template / media)" },
    intentTag: "sales_engine",
    engine: "sales-engine-router",
    source: "supabase/functions/sales-engine-router/",
  },

  // ──────────────── OUTBOUND TRIGGERS — INSURANCE ────────────────
  {
    id: "insurance-policy-pdf",
    kind: "document",
    vertical: "insurance",
    title: "Policy PDF Auto-Send",
    event: "New active insurance_policies row inserted (status='active')",
    conditions: [
      "Client phone is valid (10+ digits)",
      "Policy is freshly issued (not renewal cancellation)",
    ],
    dataSources: ["insurance_policies", "insurance_clients"],
    output: { type: "pdf", detail: "Branded policy PDF + utility template message" },
    templateName: "policy_document_share",
    intentTag: "policy_document",
    engine: "DB trigger → wa-pdf-dispatcher",
    source: "dispatch_policy_pdf_on_issuance() → wa-pdf-dispatcher",
  },
  {
    id: "insurance-feedback",
    kind: "outbound-trigger",
    vertical: "insurance",
    title: "Insurance Won → Feedback",
    event: "Policy issued (status changes to 'active')",
    conditions: ["First-time issue (not duplicate fire)", "Customer phone present"],
    dataSources: ["insurance_clients", "insurance_policies"],
    output: { type: "template", detail: "Strict UTILITY feedback template (₹0.12) with v1 marketing fallback" },
    templateName: "feedback_insurance_won_v2 → feedback_insurance_won",
    intentTag: "feedback",
    engine: "tg_feedback_insurance_won() → wa-feedback-dispatcher",
    source: "DB function tg_feedback_insurance_won",
  },
  {
    id: "insurance-renewal",
    kind: "scheduled",
    vertical: "insurance",
    title: "Renewal Reminder (30/15/7/1 days)",
    event: "Daily cron — checks insurance_renewal_tracking",
    conditions: [
      "days_until_expiry IN (30, 15, 7, 1)",
      "outcome IS NULL (not yet renewed)",
    ],
    dataSources: ["insurance_renewal_tracking", "insurance_policies"],
    output: { type: "template", detail: "Renewal reminder template with policy details" },
    templateName: "insurance_renewal_reminder",
    intentTag: "renewal_reminder",
    engine: "insurance-renewal-engine (cron)",
    source: "supabase/functions/insurance-renewal-engine/",
  },
  {
    id: "insurance-quote",
    kind: "outbound-trigger",
    vertical: "insurance",
    title: "Quote Share via WhatsApp",
    event: "Manual send from Insurance CRM 'Share Quote' button",
    conditions: ["Quote PDF generated", "Customer phone present"],
    dataSources: ["quote_share_history", "insurance_clients"],
    output: { type: "pdf", detail: "Quote PDF with shareable link (auto-expires)" },
    intentTag: "quote_share",
    engine: "send-quote → wa-pdf-dispatcher",
    source: "supabase/functions/send-quote/",
  },

  // ──────────────── LOANS ────────────────
  {
    id: "loan-disbursed-feedback",
    kind: "outbound-trigger",
    vertical: "loans",
    title: "Loan Disbursed → Feedback",
    event: "loan_applications.stage changes to 'disbursed'",
    conditions: ["Phone present", "First disbursement event"],
    dataSources: ["loan_applications"],
    output: { type: "template", detail: "Utility feedback template" },
    templateName: "feedback_loan_disbursed_v2",
    intentTag: "feedback",
    engine: "tg_feedback_loan_disbursed() → wa-feedback-dispatcher",
    source: "DB trigger",
  },
  {
    id: "loan-sanction-letter",
    kind: "document",
    vertical: "loans",
    title: "Sanction Letter Auto-Send",
    event: "loan_applications.sanction_letter_url populated",
    conditions: ["PDF URL valid", "Phone valid"],
    dataSources: ["loan_applications"],
    output: { type: "pdf", detail: "EMI sanction letter with bank breakdown" },
    intentTag: "policy_document",
    engine: "wa-pdf-dispatcher",
    source: "wa-pdf-dispatcher",
  },

  // ──────────────── SALES (CARS) ────────────────
  {
    id: "sales-delivered-feedback",
    kind: "outbound-trigger",
    vertical: "sales",
    title: "Car Delivered → Feedback",
    event: "deals.deal_status='closed' AND payment_status='received'",
    conditions: ["Vertical is sales / car_sales", "First-time fire"],
    dataSources: ["deals", "customers"],
    output: { type: "template", detail: "Car delivery feedback template" },
    templateName: "feedback_sales_delivered_v2",
    intentTag: "feedback",
    engine: "tg_feedback_sales_delivered() → wa-feedback-dispatcher",
    source: "DB trigger",
  },
  {
    id: "sales-invoice",
    kind: "document",
    vertical: "sales",
    title: "Auto Invoice on Payment",
    event: "Payment received on deal/order/booking",
    conditions: ["Total amount > 0", "Not already invoiced"],
    dataSources: ["invoices (auto-generated)", "deals/orders/bookings"],
    output: { type: "pdf", detail: "GST invoice via WhatsApp + email" },
    intentTag: "policy_document",
    engine: "auto_generate_invoice_on_payment() → wa-pdf-dispatcher",
    source: "DB trigger",
  },

  // ──────────────── HSRP ────────────────
  {
    id: "hsrp-delivered-feedback",
    kind: "outbound-trigger",
    vertical: "hsrp",
    title: "HSRP Delivered → Feedback",
    event: "hsrp_bookings.order_status='delivered'",
    conditions: ["Mobile present", "First-time fire"],
    dataSources: ["hsrp_bookings"],
    output: { type: "template", detail: "HSRP plate feedback template" },
    templateName: "feedback_hsrp_delivered_v2",
    intentTag: "feedback",
    engine: "tg_feedback_hsrp_delivered() → wa-feedback-dispatcher",
    source: "DB trigger",
  },
  {
    id: "hsrp-status-updates",
    kind: "outbound-trigger",
    vertical: "hsrp",
    title: "HSRP Status Updates (placed → shipped → delivered)",
    event: "hsrp_bookings.order_status changes",
    conditions: ["Status changed (not duplicate)"],
    dataSources: ["hsrp_bookings", "order_tracking_history"],
    output: { type: "template", detail: "Status update with courier + tracking link" },
    intentTag: "manual_chat",
    engine: "hsrp-status-notifier",
    source: "supabase/functions/hsrp-status-notifier/",
  },

  // ──────────────── RENTALS ────────────────
  {
    id: "rental-confirmation",
    kind: "outbound-trigger",
    vertical: "rentals",
    title: "Booking Confirmation",
    event: "rental_bookings inserted with payment_status='paid'",
    conditions: ["Phone present"],
    dataSources: ["rental_bookings"],
    output: { type: "template", detail: "Rental confirmation with car + dates + pickup" },
    intentTag: "manual_chat",
    engine: "wa-feedback-dispatcher (rental flow)",
    source: "DB trigger",
  },

  // ──────────────── GLOBAL FOLLOWUPS ────────────────
  {
    id: "auto-followup-engine",
    kind: "scheduled",
    vertical: "global",
    title: "Auto Follow-Up (cold leads)",
    event: "Daily cron — leads with no activity 3/7/14 days",
    conditions: [
      "Lead status NOT in (won, lost, converted)",
      "No outbound message in last 48h",
      "Within 24h window OR template available",
    ],
    dataSources: ["leads", "insurance_clients", "loan_applications", "sales_pipeline"],
    output: { type: "template", detail: "Vertical-specific follow-up template" },
    intentTag: "followup",
    engine: "auto-followup-engine (cron)",
    source: "supabase/functions/auto-followup-engine/",
  },
  {
    id: "drip-sequences",
    kind: "scheduled",
    vertical: "global",
    title: "Drip Sequences",
    event: "Lead enrolled in drip campaign",
    conditions: ["Drip is_active", "User not unsubscribed"],
    dataSources: ["wa_drip_sequences", "wa_drip_enrollments"],
    output: { type: "template", detail: "Multi-step nurture campaign" },
    intentTag: "marketing",
    engine: "wa-drip-processor (cron)",
    source: "supabase/functions/wa-drip-processor/",
  },
];

const KIND_META: Record<FlowKind, { label: string; color: string; icon: any }> = {
  "outbound-trigger": { label: "Auto-Trigger", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300", icon: Zap },
  "inbound-bot": { label: "Inbound Bot", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300", icon: Bot },
  "scheduled": { label: "Scheduled", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300", icon: Calendar },
  "document": { label: "Document", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300", icon: FileText },
};

const VERTICAL_META: Record<string, string> = {
  insurance: "🛡️ Insurance",
  loans: "💰 Loans",
  sales: "🚗 Sales",
  hsrp: "🔢 HSRP",
  rentals: "🔑 Rentals",
  accessories: "🛍️ Accessories",
  global: "🌐 Global",
};

export function WAHubFlowMap() {
  const [search, setSearch] = useState("");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [selected, setSelected] = useState<FlowSpec | null>(null);

  // Live counts per intent over last 24h
  const { data: liveCounts, refetch } = useQuery({
    queryKey: ["wa-flow-live-counts"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("wa_inbox_messages")
        .select("intent, status")
        .gte("created_at", since)
        .eq("direction", "outbound");
      const counts: Record<string, { total: number; delivered: number; failed: number }> = {};
      (data || []).forEach((m: any) => {
        const k = m.intent || "untagged";
        counts[k] = counts[k] || { total: 0, delivered: 0, failed: 0 };
        counts[k].total++;
        if (m.status === "delivered" || m.status === "read") counts[k].delivered++;
        if (m.status === "failed") counts[k].failed++;
      });
      return counts;
    },
    refetchInterval: 30000,
  });

  // Last sample message per intent (for "see live example")
  const { data: lastSamples } = useQuery({
    queryKey: ["wa-flow-last-samples"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_inbox_messages")
        .select("intent, content, status, created_at, conversation_id")
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(200);
      const samples: Record<string, any> = {};
      (data || []).forEach((m: any) => {
        const k = m.intent || "untagged";
        if (!samples[k]) samples[k] = m;
      });
      return samples;
    },
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    return FLOWS.filter((f) => {
      if (verticalFilter !== "all" && f.vertical !== verticalFilter) return false;
      if (kindFilter !== "all" && f.kind !== kindFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.title.toLowerCase().includes(q) ||
          f.event.toLowerCase().includes(q) ||
          f.engine.toLowerCase().includes(q) ||
          (f.templateName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, verticalFilter, kindFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, FlowSpec[]> = {};
    filtered.forEach((f) => {
      g[f.vertical] = g[f.vertical] || [];
      g[f.vertical].push(f);
    });
    return g;
  }, [filtered]);

  const totalActive = FLOWS.length;
  const totalSent24h = Object.values(liveCounts || {}).reduce((s, c) => s + c.total, 0);
  const totalFailed24h = Object.values(liveCounts || {}).reduce((s, c) => s + c.failed, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Workflow className="h-5 w-5 text-emerald-600" />
              WhatsApp Automation Flow Map
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Single source of truth · Every auto-message, trigger, AI reply, PDF send, and follow-up
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-9">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <StatCard icon={Workflow} label="Active flows" value={totalActive} color="emerald" />
          <StatCard icon={Send} label="Sent (24h)" value={totalSent24h} color="blue" />
          <StatCard icon={CheckCircle2} label="Delivered" value={Object.values(liveCounts || {}).reduce((s, c) => s + c.delivered, 0)} color="green" />
          <StatCard icon={AlertCircle} label="Failed (24h)" value={totalFailed24h} color="rose" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search flow, trigger, template…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Tabs value={kindFilter} onValueChange={setKindFilter}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="outbound-trigger" className="text-xs">Auto-Trigger</TabsTrigger>
              <TabsTrigger value="inbound-bot" className="text-xs">Bot</TabsTrigger>
              <TabsTrigger value="scheduled" className="text-xs">Scheduled</TabsTrigger>
              <TabsTrigger value="document" className="text-xs">Documents</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={verticalFilter} onValueChange={setVerticalFilter}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">All verticals</TabsTrigger>
              <TabsTrigger value="insurance" className="text-xs">Insurance</TabsTrigger>
              <TabsTrigger value="loans" className="text-xs">Loans</TabsTrigger>
              <TabsTrigger value="sales" className="text-xs">Sales</TabsTrigger>
              <TabsTrigger value="hsrp" className="text-xs">HSRP</TabsTrigger>
              <TabsTrigger value="global" className="text-xs">Global</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {Object.entries(grouped).map(([vertical, flows]) => (
            <section key={vertical}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>{VERTICAL_META[vertical]}</span>
                <Badge variant="secondary" className="text-[10px] h-5">{flows.length}</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {flows.map((flow) => (
                  <FlowCard
                    key={flow.id}
                    flow={flow}
                    counts={flow.intentTag ? liveCounts?.[flow.intentTag] : undefined}
                    sample={flow.intentTag ? lastSamples?.[flow.intentTag] : undefined}
                    onClick={() => setSelected(flow)}
                  />
                ))}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No flows match your filters.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Detail drawer */}
      {selected && (
        <FlowDetailDrawer flow={selected} onClose={() => setSelected(null)} counts={selected.intentTag ? liveCounts?.[selected.intentTag] : undefined} />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    green: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  };
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        <div className="text-lg font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
}

function FlowCard({ flow, counts, sample, onClick }: { flow: FlowSpec; counts?: any; sample?: any; onClick: () => void }) {
  const meta = KIND_META[flow.kind];
  const Icon = meta.icon;
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow group" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center border ${meta.color} shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm leading-tight truncate">{flow.title}</CardTitle>
          </div>
          <Badge variant="outline" className={`text-[9px] h-5 px-1.5 ${meta.color} border-0 shrink-0`}>
            {meta.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {/* Flow visual: trigger → output */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Zap className="h-3 w-3 text-amber-500 shrink-0" />
          <span className="truncate">{flow.event}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Database className="h-3 w-3 text-blue-500 shrink-0" />
          <span className="truncate">{flow.dataSources[0]}{flow.dataSources.length > 1 && ` +${flow.dataSources.length - 1}`}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          <ArrowRight className="h-3 w-3 text-emerald-600 shrink-0" />
          <span className="truncate">{flow.output.detail}</span>
        </div>

        {/* Live stats */}
        {counts && (
          <div className="pt-2 border-t flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-muted-foreground">24h:</span>
              <span className="font-semibold">{counts.total}</span>
              <span className="text-emerald-600">✓ {counts.delivered}</span>
              {counts.failed > 0 && <span className="text-rose-600">✗ {counts.failed}</span>}
            </div>
            {sample && (
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(sample.created_at), { addSuffix: true })}
              </span>
            )}
          </div>
        )}
        {!counts && flow.intentTag && (
          <div className="pt-2 border-t text-[10px] text-muted-foreground">
            No sends in last 24h
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FlowDetailDrawer({ flow, onClose, counts }: { flow: FlowSpec; onClose: () => void; counts?: any }) {
  const meta = KIND_META[flow.kind];
  const Icon = meta.icon;

  // Sample of last 10 sends for this intent
  const { data: recentSends } = useQuery({
    queryKey: ["wa-flow-recent", flow.intentTag],
    queryFn: async () => {
      if (!flow.intentTag) return [];
      const { data } = await supabase
        .from("wa_inbox_messages")
        .select("id, content, status, created_at, conversation_id, wa_conversations!inner(phone, customer_name)")
        .eq("direction", "outbound")
        .eq("intent", flow.intentTag)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!flow.intentTag,
  });

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${meta.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{flow.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] h-5">{VERTICAL_META[flow.vertical]}</Badge>
                <Badge variant="outline" className={`text-[10px] h-5 ${meta.color} border-0`}>{meta.label}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="space-y-4 pt-4">
            <Section icon={Zap} label="When does it fire?">
              <p className="text-sm">{flow.event}</p>
            </Section>

            <Section icon={Filter} label="Conditions">
              <ul className="space-y-1">
                {flow.conditions.map((c, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section icon={Database} label="Data sources (where info is fetched from)">
              <div className="flex flex-wrap gap-1.5">
                {flow.dataSources.map((d) => (
                  <Badge key={d} variant="secondary" className="text-[11px] font-mono">{d}</Badge>
                ))}
              </div>
            </Section>

            <Section icon={Send} label="What gets sent">
              <p className="text-sm font-medium">{flow.output.detail}</p>
              <Badge variant="outline" className="mt-1.5 text-[10px]">Type: {flow.output.type}</Badge>
              {flow.templateName && (
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Template: </span>
                  <code className="px-1.5 py-0.5 bg-muted rounded font-mono">{flow.templateName}</code>
                </div>
              )}
            </Section>

            <Section icon={Workflow} label="Engine (where logic lives)">
              <code className="text-xs px-2 py-1 bg-muted rounded block font-mono">{flow.engine}</code>
              <p className="text-[11px] text-muted-foreground mt-1.5">📁 {flow.source}</p>
            </Section>

            {counts && (
              <Section icon={Activity} label="Live stats (last 24h)">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded border">
                    <div className="text-lg font-bold">{counts.total}</div>
                    <div className="text-[10px] text-muted-foreground">Total sent</div>
                  </div>
                  <div className="text-center p-2 rounded border">
                    <div className="text-lg font-bold text-emerald-600">{counts.delivered}</div>
                    <div className="text-[10px] text-muted-foreground">Delivered</div>
                  </div>
                  <div className="text-center p-2 rounded border">
                    <div className="text-lg font-bold text-rose-600">{counts.failed}</div>
                    <div className="text-[10px] text-muted-foreground">Failed</div>
                  </div>
                </div>
              </Section>
            )}

            {recentSends && recentSends.length > 0 && (
              <Section icon={Eye} label="Last 10 sends (live examples)">
                <div className="space-y-1.5">
                  {recentSends.map((m: any) => (
                    <div key={m.id} className="text-xs p-2 rounded border bg-muted/30">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium truncate">
                          {m.wa_conversations?.customer_name || m.wa_conversations?.phone}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] h-4 px-1 ${
                            m.status === "delivered" || m.status === "read" ? "bg-emerald-50 text-emerald-700 border-0" :
                            m.status === "failed" ? "bg-rose-50 text-rose-700 border-0" :
                            "bg-amber-50 text-amber-700 border-0"
                          }`}
                        >
                          {m.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">{m.content}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}

function Section({ icon: Icon, label, children }: any) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {children}
    </div>
  );
}
