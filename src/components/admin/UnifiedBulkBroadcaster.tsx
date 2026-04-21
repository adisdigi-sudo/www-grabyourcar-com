import { useState, useRef, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Send, MessageSquare, Mail, Upload, Users, Loader2, CheckCircle2,
  Search, Megaphone, Zap, RefreshCw, Activity, ShieldCheck, AlertTriangle,
  Gauge, TrendingUp, Eye, CheckCheck, Ban, Clock, BarChart3, Sparkles, X,
} from "lucide-react";
import { parseCSV } from "@/lib/spreadsheetUtils";
import { fetchAllPages } from "@/lib/fetchAllPages";

// ─── Excel cell value → clean string (handles rich-text, formulas, hyperlinks, dates) ───
const excelCellToString = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v).trim();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("text" in v && typeof (v as any).text === "string") return String((v as any).text).trim();
    if ("result" in v && (v as any).result !== undefined) return excelCellToString((v as any).result);
    if ("hyperlink" in v && (v as any).text) return String((v as any).text).trim();
    if ("richText" in v && Array.isArray((v as any).richText)) {
      return (v as any).richText.map((r: any) => r.text || "").join("").trim();
    }
    if (Array.isArray(v)) return v.map(excelCellToString).join(" ").trim();
  }
  return String(v).trim();
};

// ─── Types ───
interface Contact {
  name: string;
  phone: string;
  email?: string;
  vertical: string;
  source_table: string;
  stage?: string;
  /** Per-row template variable values (key = variable name without braces) */
  vars?: Record<string, string>;
}

// ─── Audience source mapping (verified live tables) ───
const VERTICAL_SOURCES: {
  id: string;
  label: string;
  emoji: string;
  table: string;
  nameField: string;
  phoneField: string;
  emailField?: string;
  stageField?: string;
}[] = [
  { id: "sales_leads",     label: "Sales Leads",         emoji: "🚗", table: "leads",                     nameField: "name",          phoneField: "phone",          emailField: "email", stageField: "status" },
  { id: "sales_pipeline",  label: "Sales Pipeline",      emoji: "📈", table: "sales_pipeline",            nameField: "customer_name", phoneField: "phone",          emailField: "email", stageField: "pipeline_stage" },
  { id: "loan_leads",      label: "Loan Leads",          emoji: "💰", table: "car_loan_leads",            nameField: "name",          phoneField: "phone",          emailField: "email", stageField: "status" },
  { id: "loan_apps",       label: "Loan Applications",   emoji: "📝", table: "loan_applications",         nameField: "customer_name", phoneField: "phone",          emailField: "email", stageField: "stage" },
  { id: "insurance_c",     label: "Insurance Clients",   emoji: "🛡️", table: "insurance_clients",         nameField: "customer_name", phoneField: "phone",          emailField: "email", stageField: "pipeline_stage" },
  { id: "insurance_p",     label: "Insurance Prospects", emoji: "📋", table: "insurance_prospects",       nameField: "customer_name", phoneField: "phone",          emailField: "email", stageField: "prospect_status" },
  { id: "hsrp",            label: "HSRP / FASTag",       emoji: "🪪", table: "hsrp_bookings",             nameField: "owner_name",    phoneField: "mobile",         emailField: "email", stageField: "order_status" },
  { id: "rental",          label: "Self-Drive Rental",   emoji: "🔑", table: "rental_bookings",           nameField: "customer_name", phoneField: "phone",          emailField: "email", stageField: "status" },
  { id: "accessories",     label: "Accessories Orders",  emoji: "🛍️", table: "accessory_orders",          nameField: "shipping_name", phoneField: "shipping_phone",emailField: "shipping_email", stageField: "order_status" },
  { id: "dealer",          label: "Dealer Network",      emoji: "🏢", table: "dealer_inquiry_recipients", nameField: "rep_name",      phoneField: "phone" },
  { id: "unified",         label: "Unified Customers",   emoji: "👥", table: "unified_customers",         nameField: "customer_name", phoneField: "phone",          emailField: "email" },
];

// Type augmentation for stage support
type VerticalSource = (typeof VERTICAL_SOURCES)[number] & { stageField?: string };

// ─── Strict 10-digit Indian phone normalizer (preserves leading-9 numbers) ───
const normaliseIndianPhone = (raw: any): string => {
  if (raw === null || raw === undefined) return "";
  let s = String(raw).replace(/\D/g, "");
  if (!s) return "";
  // Strip country code ONLY if length > 10 and starts with 91
  if (s.length === 12 && s.startsWith("91")) s = s.slice(2);
  else if (s.length === 11 && s.startsWith("0")) s = s.slice(1);
  else if (s.length === 13 && s.startsWith("091")) s = s.slice(3);
  // Final guard: must be 10 digits starting with 6-9
  if (s.length !== 10 || !/^[6-9]/.test(s)) return "";
  return s;
};

// ─── Live Meta Limits Card ───
function MetaLimitsCard({ onRefresh }: { onRefresh: () => void }) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["meta-account-status-live"],
    queryFn: async () => {
      // 1) Cached row first (fast paint)
      const { data: cached } = await supabase
        .from("wa_meta_account_status")
        .select("*")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2) Live Meta call (refresh cache)
      try {
        const { data: live } = await supabase.functions.invoke("meta-templates", {
          body: { action: "get_status" },
        });
        if (live?.phone) {
          const tier = live.phone.messaging_limit_tier || live.waba?.messaging_limit_tier || "TIER_NOT_SET";
          const dailyMap: Record<string, number> = {
            TIER_50: 50, TIER_250: 250, TIER_1K: 1000, TIER_10K: 10000,
            TIER_100K: 100000, TIER_UNLIMITED: 999999,
          };
          const payload = {
            phone_number_id: live.phone.id,
            display_phone_number: live.phone.display_phone_number,
            verified_name: live.phone.verified_name,
            quality_rating: live.phone.quality_rating,
            messaging_limit_tier: tier,
            daily_conversation_limit: dailyMap[tier] ?? null,
            account_review_status: live.waba?.account_review_status,
            business_verification_status: live.waba?.business_verification_status,
            raw_payload: live,
            fetched_at: new Date().toISOString(),
          };
          await supabase.from("wa_meta_account_status").insert(payload as any);
          return payload;
        }
      } catch (err) {
        console.warn("Live Meta status failed, using cache:", err);
      }
      return cached;
    },
    refetchInterval: 60000, // refresh every 60s
    staleTime: 30000,
  });

  const tierLabel = (data as any)?.messaging_limit_tier?.replace("TIER_", "") || "—";
  const daily = (data as any)?.daily_conversation_limit;
  const quality = (data as any)?.quality_rating || "UNKNOWN";
  const qColor =
    quality === "GREEN" ? "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30" :
    quality === "YELLOW" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" :
    quality === "RED" ? "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" :
    "bg-muted text-muted-foreground";

  return (
    <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            Live Meta Limits
            {isFetching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => { refetch(); onRefresh(); }}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-0">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Daily Limit</p>
          <p className="text-lg font-bold text-foreground">{daily ? daily.toLocaleString() : "—"}</p>
          <p className="text-[10px] text-muted-foreground">conversations / 24h</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tier</p>
          <Badge variant="outline" className="text-xs font-bold mt-0.5">{tierLabel}</Badge>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Quality</p>
          <Badge variant="outline" className={`text-xs font-bold mt-0.5 ${qColor}`}>{quality}</Badge>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Number</p>
          <p className="text-xs font-mono mt-0.5">{(data as any)?.display_phone_number || "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Real-time Campaign Metrics ───
function RealTimeMetrics() {
  const { data } = useQuery({
    queryKey: ["broadcast-realtime-metrics"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [{ data: queue }, { data: logs }, { data: optouts }] = await Promise.all([
        supabase.from("wa_message_queue").select("status").gte("created_at", since),
        supabase.from("wa_message_logs").select("status, created_at").gte("created_at", since).limit(5000),
        supabase.from("wa_opt_outs").select("phone").limit(5000),
      ]);
      const q = queue || [];
      const l = logs || [];
      const counts = {
        pending: q.filter((x: any) => x.status === "queued").length,
        processing: q.filter((x: any) => x.status === "processing").length,
        sent: l.filter((x: any) => x.status === "sent").length,
        delivered: l.filter((x: any) => x.status === "delivered").length,
        read: l.filter((x: any) => x.status === "read").length,
        failed: l.filter((x: any) => x.status === "failed").length,
        replied: l.filter((x: any) => x.status === "replied").length,
        blocked: (optouts || []).length,
      };
      const throughputPerMin = 30; // conservative est
      const etaMin = counts.pending > 0 ? Math.ceil(counts.pending / throughputPerMin) : 0;
      return { ...counts, etaMin };
    },
    refetchInterval: 10000,
  });

  const items = [
    { label: "Pending", val: data?.pending || 0, icon: Clock, color: "text-amber-600" },
    { label: "Sent", val: data?.sent || 0, icon: Send, color: "text-blue-600" },
    { label: "Delivered", val: data?.delivered || 0, icon: CheckCheck, color: "text-emerald-600" },
    { label: "Read", val: data?.read || 0, icon: Eye, color: "text-violet-600" },
    { label: "Replied", val: data?.replied || 0, icon: MessageSquare, color: "text-cyan-600" },
    { label: "Failed", val: data?.failed || 0, icon: AlertTriangle, color: "text-red-600" },
    { label: "Blocked", val: data?.blocked || 0, icon: Ban, color: "text-rose-600" },
    { label: "ETA", val: data?.etaMin ? `${data.etaMin}m` : "—", icon: Gauge, color: "text-foreground" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Real-Time Performance (last 24h)
          <Badge variant="outline" className="text-[10px] gap-1 ml-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-4 md:grid-cols-8 gap-2 pt-0">
        {items.map((i) => (
          <div key={i.label} className="text-center p-2 rounded-lg bg-muted/40">
            <i.icon className={`h-3.5 w-3.5 mx-auto ${i.color}`} />
            <p className="text-base font-bold mt-0.5">{typeof i.val === "number" ? i.val.toLocaleString() : i.val}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{i.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Variable extraction helper ───
function extractTemplateVars(body: string | null | undefined): string[] {
  if (!body) return [];
  const matches = Array.from(body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g));
  return Array.from(new Set(matches.map((m) => m[1])));
}

// ═══════════════════════════════════════════════════════
//   MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export const UnifiedBulkBroadcaster = () => {
  const [channel, setChannel] = useState<"whatsapp" | "email" | "both">("whatsapp");
  const [selectedVerticals, setSelectedVerticals] = useState<Set<string>>(new Set());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [onlySelectedView, setOnlySelectedView] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingAudience, setIsLoadingAudience] = useState(false);
  // Per-vertical stage filter (empty string = all stages)
  const [stageFilter, setStageFilter] = useState<Record<string, string>>({});
  // Discovered stage values per vertical (auto-populated after load)
  const [stageOptions, setStageOptions] = useState<Record<string, string[]>>({});

  // ─── Diagnostics (per-vertical breakdown of last load) ───
  interface VerticalDiag {
    label: string;
    table: string;
    columns: string[];
    stageField?: string;
    appliedStage?: string;
    fetched: number;        // raw rows from DB before any filtering
    invalidPhone: number;   // dropped (phone normalisation failed)
    duplicates: number;     // dropped within-vertical duplicates (by id)
    deduped: number;        // valid rows after phone + dedupe, before stage filter
    stageMatched: number;   // rows matching selected stage(s)
    accepted: number;       // contributed to merged list after stage filtering
    error?: string;
  }
  const [diagnostics, setDiagnostics] = useState<VerticalDiag[]>([]);
  const [loadSummary, setLoadSummary] = useState<{
    totalFetched: number;
    afterDedup: number;
    stageFiltered: number;
    afterChannelFilter: number;
    stageFilterActive: boolean;
    runAt: string;
  } | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // WhatsApp config
  const [useMetaTemplate, setUseMetaTemplate] = useState(true);
  const [metaTemplateName, setMetaTemplateName] = useState("");
  const [waMessage, setWaMessage] = useState("");

  // Email
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailFrom, setEmailFrom] = useState("sales@notify.grabyourcar.com");

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [showResult, setShowResult] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Fetch APPROVED Meta templates with full body for variable detection ───
  const { data: metaTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ["wa-templates-broadcast-pro"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wa_templates")
        .select("name, display_name, status, category, body, variables, header_type")
        .eq("status", "approved")
        .order("display_name", { ascending: true });
      return (data || []);
    },
    refetchInterval: 30000, // live sync with Meta-synced template store
  });

  const selectedTemplate = useMemo(
    () => metaTemplates?.find((t: any) => t.name === metaTemplateName),
    [metaTemplates, metaTemplateName],
  );

  const templateVars = useMemo(() => {
    if (!selectedTemplate) return [];
    const fromBody = extractTemplateVars((selectedTemplate as any).body);
    const explicit = ((selectedTemplate as any).variables || []) as string[];
    return Array.from(new Set([...fromBody, ...explicit.map((v) => v.replace(/[{}]/g, ""))]));
  }, [selectedTemplate]);

  // ─── Toggle a vertical (auto-discover stages on first add) ───
  const toggleVertical = async (id: string) => {
    setSelectedVerticals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    // Pre-load distinct stages for this vertical (so dropdown is ready BEFORE Load contacts)
    const v = VERTICAL_SOURCES.find((x) => x.id === id);
    if (!v || !v.stageField) return;
    if (stageOptions[id] && stageOptions[id].length > 0) return; // already loaded
    try {
      const rows = await fetchAllPages<any>(async (from, to) =>
        (supabase as any).from(v.table).select(v.stageField).not(v.stageField, "is", null).range(from, to)
      );
      const set = new Set<string>();
      rows.forEach((r: any) => {
        const s = String(r[v.stageField!] || "").trim();
        if (s) set.add(s);
      });
      setStageOptions((prev) => ({ ...prev, [id]: Array.from(set).sort() }));
    } catch (err) {
      console.warn(`[stage-discover ${v.label}]`, err);
    }
  };

  // ─── Bulk-load ALL contacts (paginated, no cap) from selected verticals ───
  const loadAllSelected = async () => {
    if (selectedVerticals.size === 0) {
      toast.error("Pehle ek ya zyada vertical select karo");
      return;
    }
    setIsLoadingAudience(true);
    const merged: Contact[] = [];
    const seenKeys = new Set<string>();
    const perVerticalCounts: Record<string, number> = {};
    const stagesPerVertical: Record<string, Set<string>> = {};
    const errors: string[] = [];
    const diags: VerticalDiag[] = [];
    let stageFilterActive = false;

    try {
      for (const v of VERTICAL_SOURCES) {
        if (!selectedVerticals.has(v.id)) continue;
        const colsArr = ["id", v.nameField, v.phoneField, v.emailField, v.stageField].filter(Boolean) as string[];
        const cols = colsArr.join(", ");
        const wantedStage = stageFilter[v.id]?.trim();
        if (wantedStage) stageFilterActive = true;

        const diag: VerticalDiag = {
          label: v.label,
          table: v.table,
          columns: colsArr,
          stageField: v.stageField,
          appliedStage: wantedStage || undefined,
          fetched: 0,
          invalidPhone: 0,
          duplicates: 0,
          deduped: 0,
          stageMatched: 0,
          accepted: 0,
        };

        let allRows: any[] = [];
        try {
          allRows = await fetchAllPages<any>(async (from, to) =>
            (supabase as any)
              .from(v.table)
              .select(cols)
              .not(v.phoneField, "is", null)
              .range(from, to)
          );
        } catch (err: any) {
          console.warn(`[${v.label}] load failed:`, err?.message || err);
          errors.push(`${v.label}: ${err?.message || "load failed"}`);
          diag.error = err?.message || "load failed";
          diags.push(diag);
          continue;
        }

        diag.fetched = allRows.length;
        const stageSet: Set<string> = stagesPerVertical[v.id] || new Set<string>();
        const dedupedVerticalContacts: Contact[] = [];

        allRows.forEach((r: any, index: number) => {
          const phone = normaliseIndianPhone(r[v.phoneField]);
          if (!phone) {
            diag.invalidPhone++;
            return;
          }
          const name = String(r[v.nameField] || "Customer").trim() || "Customer";
          const stage = v.stageField ? String(r[v.stageField] || "").trim() : "";
          if (stage) stageSet.add(stage);
          const rowId = r.id ? String(r.id) : `${phone}|${name.toLowerCase()}|${index}`;
          const key = `${v.id}|${rowId}`;
          if (seenKeys.has(key)) {
            diag.duplicates++;
            return;
          }
          seenKeys.add(key);
          dedupedVerticalContacts.push({
            name,
            phone,
            email: v.emailField ? String(r[v.emailField] || "").trim() : "",
            vertical: v.label,
            source_table: v.table,
            stage: stage || undefined,
          });
        });

        diag.deduped = dedupedVerticalContacts.length;
        const stageMatchedContacts = wantedStage
          ? dedupedVerticalContacts.filter((contact) => (contact.stage || "") === wantedStage)
          : dedupedVerticalContacts;

        diag.stageMatched = stageMatchedContacts.length;
        diag.accepted = stageMatchedContacts.length;
        merged.push(...stageMatchedContacts);
        stagesPerVertical[v.id] = stageSet;
        perVerticalCounts[v.label] = stageMatchedContacts.length;
        diags.push(diag);
      }

      const totalFetched = diags.reduce((sum, d) => sum + d.fetched, 0);
      const afterDedup = diags.reduce((sum, d) => sum + d.deduped, 0);
      const stageFiltered = diags.reduce((sum, d) => sum + d.stageMatched, 0);
      const readyToSend = merged.filter((c) => (channel === "email" ? !!c.email : c.phone.length === 10));

      setContacts(readyToSend);
      setSelectedContacts(new Set(readyToSend.map((_, i) => i)));
      setDiagnostics(diags);
      setLoadSummary({
        totalFetched,
        afterDedup,
        stageFiltered,
        afterChannelFilter: readyToSend.length,
        stageFilterActive,
        runAt: new Date().toLocaleTimeString(),
      });
      setStageOptions((prev) => {
        const next = { ...prev };
        Object.entries(stagesPerVertical).forEach(([id, set]) => {
          next[id] = Array.from(set).sort();
        });
        return next;
      });
      const breakdown = Object.entries(perVerticalCounts).map(([k, v]) => `${k}: ${v}`).join(" • ");
      toast.success(`Loaded ${readyToSend.length} ready contacts`, {
        description: `Total ${totalFetched} • Deduped ${afterDedup} • Stage ${stageFiltered}${breakdown ? ` • ${breakdown}` : ""}` ,
      });
      if (errors.length) toast.warning(`${errors.length} source(s) had errors`, { description: errors.join("; ") });
    } catch (err: any) {
      toast.error("Audience load failed: " + (err.message || ""));
    } finally {
      setIsLoadingAudience(false);
    }
  };

  // ─── Download a smart Excel template that exactly matches selected variables ───
  const downloadSmartTemplate = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Contacts");

      // Always include name + phone, then every variable (deduped, name/phone removed)
      const baseCols = ["name", "phone"];
      const extras = templateVars
        .map((v) => v.toLowerCase())
        .filter((v) => !baseCols.includes(v) && v !== "1");
      const headers = [...baseCols, ...extras];

      ws.addRow(headers);
      // One example row so user understands format
      const example = headers.map((h) => {
        if (h === "name") return "Rahul Sharma";
        if (h === "phone") return "9876543210";
        if (h === "expiry_date") return "31-12-2026";
        if (h === "quote_amount" || h === "amount") return "12500";
        if (h === "policy_number") return "POL12345";
        return `<${h}>`;
      });
      ws.addRow(example);

      // Bold + width
      ws.getRow(1).font = { bold: true };
      headers.forEach((_, i) => {
        ws.getColumn(i + 1).width = 18;
      });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const tmplName = (selectedTemplate as any)?.name || "broadcast";
      a.href = url;
      a.download = `${tmplName}_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("📥 Smart template downloaded", {
        description: `Columns: ${headers.join(", ")}`,
      });
    } catch (err: any) {
      toast.error("Template download failed: " + (err?.message || ""));
    }
  };

  // ─── CSV / Excel upload (robust + template-aware validation) ───
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let rows: string[][] = [];
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const ws = wb.worksheets[0];
        if (!ws) throw new Error("No worksheet in workbook");
        // includeEmpty:false skips fully blank rows; iterate ALL rows including header
        ws.eachRow({ includeEmpty: false }, (row) => {
          const vals = row.values as any[];
          // ExcelJS row.values is 1-indexed; index 0 is undefined
          const cells = vals.slice(1).map(excelCellToString);
          if (cells.some((c) => c !== "")) rows.push(cells);
        });
        console.log(`[Excel] Parsed ${rows.length} rows from ${file.name}`);
      } else {
        rows = parseCSV(await file.text()).filter((r) => r.some((c) => c.trim()));
      }
      if (rows.length < 2) {
        toast.error(`File me kam se kam header + 1 data row chahiye (mila: ${rows.length})`);
        return;
      }
      const hdrs = rows[0].map((h) => String(h ?? "").toLowerCase().trim());
      const nameIdx = hdrs.findIndex((h) => h === "name" || h.includes("name") || h.includes("customer"));
      const phoneIdx = hdrs.findIndex(
        (h) => h.includes("phone") || h.includes("mobile") || h.includes("contact") || h.includes("whatsapp") || h === "no" || h === "number"
      );
      const emailIdx = hdrs.findIndex((h) => h.includes("email") || h.includes("mail"));

      if (phoneIdx < 0 && channel !== "email") {
        toast.error(`Phone column nahi mila. Headers: ${hdrs.join(", ")}`);
        return;
      }

      // ─── STRICT: if a Meta template is chosen, file MUST contain every variable column ───
      const requiredVars = templateVars
        .map((v) => v.toLowerCase())
        .filter((v) => v !== "name" && v !== "customer_name" && v !== "phone" && v !== "1");
      const varIdxMap: Record<string, number> = {};
      const missingVars: string[] = [];
      if (useMetaTemplate && metaTemplateName && requiredVars.length > 0) {
        for (const v of requiredVars) {
          const idx = hdrs.findIndex((h) => h === v || h.replace(/\s+/g, "_") === v);
          if (idx < 0) missingVars.push(v);
          else varIdxMap[v] = idx;
        }
        if (missingVars.length > 0) {
          toast.error(`❌ File me ye required columns missing hain: ${missingVars.join(", ")}`, {
            description: "Pehle 'Download Smart Template' use karo, fill karo, phir upload karo.",
            duration: 8000,
          });
          // reset file input so user can re-upload after fixing
          if (fileRef.current) fileRef.current.value = "";
          return;
        }
      } else {
        // Even without template, capture any extra columns as vars
        hdrs.forEach((h, i) => {
          if (i !== nameIdx && i !== phoneIdx && i !== emailIdx && h) varIdxMap[h] = i;
        });
      }

      let invalidPhones = 0;
      const missingVarRows: number[] = [];
      const mapped: Contact[] = rows.slice(1).map((r, rowIdx) => {
        const rawPhone = phoneIdx >= 0 ? String(r[phoneIdx] ?? "") : "";
        const phone = normaliseIndianPhone(rawPhone);
        if (!phone && rawPhone) invalidPhones++;
        const vars: Record<string, string> = {};
        Object.entries(varIdxMap).forEach(([key, idx]) => {
          vars[key] = String(r[idx] ?? "").trim();
        });
        // Track rows that have empty required vars
        if (requiredVars.length > 0) {
          const blanks = requiredVars.filter((v) => !vars[v]);
          if (blanks.length > 0) missingVarRows.push(rowIdx + 2);
        }
        return {
          name: String((nameIdx >= 0 ? r[nameIdx] : "") ?? "").trim() || "Customer",
          phone,
          email: emailIdx >= 0 ? String(r[emailIdx] ?? "").trim() : "",
          vertical: "Custom Upload",
          source_table: "custom_upload",
          vars,
        };
      }).filter((c) => c.phone.length === 10 || (channel === "email" && c.email));

      setContacts(mapped);
      setSelectedContacts(new Set(mapped.map((_, i) => i)));

      const descParts: string[] = [];
      if (invalidPhones > 0) descParts.push(`${invalidPhones} rows skipped (invalid phone)`);
      if (missingVarRows.length > 0) descParts.push(`⚠ ${missingVarRows.length} rows have empty variable values`);
      if (requiredVars.length > 0) descParts.push(`Variables loaded: ${requiredVars.join(", ")}`);

      toast.success(`✅ Loaded ${mapped.length} contacts — ready to shoot!`, {
        description: descParts.join(" • ") || undefined,
        duration: 6000,
      });
    } catch (err: any) {
      console.error("[Upload] Parse failed:", err);
      toast.error("Parse failed: " + (err?.message || "unknown error"));
    }
  };

  const filteredContacts = useMemo(() => {
    let list = contacts;
    // 1) Show-only-selected filter (current view)
    if (onlySelectedView) {
      list = list.filter((_, i) => selectedContacts.has(i));
    }
    // 2) Search term
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(t) ||
        c.phone.includes(t) ||
        (c.email || "").toLowerCase().includes(t) ||
        c.vertical.toLowerCase().includes(t),
      );
    }
    return list;
  }, [contacts, searchTerm, onlySelectedView, selectedContacts]);

  const selectedList = contacts.filter((_, i) => selectedContacts.has(i));

  // ─── Send WhatsApp ───
  const sendWhatsApp = async () => {
    const targets = selectedList.filter((c) => c.phone.length >= 10);
    if (targets.length === 0) { toast.error("No valid phone numbers"); return; }
    if (useMetaTemplate && !metaTemplateName) { toast.error("Approved Meta template select karo"); return; }
    if (!useMetaTemplate && !waMessage.trim()) { toast.error("Message likho ya template choose karo"); return; }

    setIsSending(true);
    setSendProgress(0);
    let sent = 0, failed = 0;

    for (let i = 0; i < targets.length; i++) {
      const c = targets[i];
      const phone = `91${c.phone}`;
      try {
        if (useMetaTemplate && metaTemplateName) {
          const params = templateVars.map((v) => {
            const key = v.toLowerCase();
            if (c.vars && c.vars[key]) return c.vars[key];
            if (v === "name" || v === "customer_name" || v === "1") return c.name;
            if (v === "phone") return c.phone;
            return c.name;
          });
          await supabase.functions.invoke("whatsapp-send", {
            body: { to: phone, type: "template", template_name: metaTemplateName, template_params: params },
          });
        } else {
          const personalised = waMessage.replace(/\{name\}/gi, c.name).replace(/\{phone\}/gi, c.phone);
          await supabase.functions.invoke("whatsapp-send", { body: { to: phone, type: "text", message: personalised } });
        }
        sent++;
      } catch {
        failed++;
      }
      setSendProgress(Math.round(((i + 1) / targets.length) * 100));
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 400));
    }

    setSendResult({ sent, failed });
    setShowResult(true);
    setIsSending(false);
    toast.success(`WhatsApp: ${sent} sent, ${failed} failed`);
  };

  // ─── Send Email ───
  const sendEmail = async () => {
    const targets = selectedList.filter((c) => c.email);
    if (targets.length === 0) { toast.error("No valid emails"); return; }
    setIsSending(true);
    setSendProgress(0);
    let sent = 0, failed = 0;
    const batchSize = 50;
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      try {
        const { error } = await supabase.functions.invoke("send-bulk-email", {
          body: {
            recipients: batch.map((c) => ({ email: c.email, name: c.name })),
            subject: emailSubject,
            html_body: emailBody.replace(/\n/g, "<br/>"),
            from_email: emailFrom,
          },
        });
        if (error) throw error;
        sent += batch.length;
      } catch { failed += batch.length; }
      setSendProgress(Math.round(((i + batchSize) / targets.length) * 100));
    }
    setSendResult({ sent, failed });
    setShowResult(true);
    setIsSending(false);
    toast.success(`Email: ${sent} sent, ${failed} failed`);
  };

  const handleSend = () => {
    if (channel === "whatsapp") sendWhatsApp();
    else if (channel === "email") sendEmail();
    else { sendWhatsApp().then(() => sendEmail()); }
  };

  // Quick "Select All Verticals"
  const selectAllVerticals = () => setSelectedVerticals(new Set(VERTICAL_SOURCES.map((v) => v.id)));
  const clearAllVerticals = () => { setSelectedVerticals(new Set()); setContacts([]); };

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Bulk Broadcaster Pro
          </h1>
          <p className="text-xs text-muted-foreground">All 11 verticals · Live Meta limits · Real-time analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 text-xs">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> {(metaTemplates || []).length} approved templates
          </Badge>
        </div>
      </div>

      {/* Live Meta Limits */}
      <MetaLimitsCard onRefresh={() => refetchTemplates()} />

      {/* Real-time metrics */}
      <RealTimeMetrics />

      {/* Channel selector */}
      <div className="flex gap-2">
        {([
          { id: "whatsapp" as const, label: "WhatsApp Only", icon: MessageSquare, color: "text-emerald-500" },
          { id: "email" as const, label: "Email Only", icon: Mail, color: "text-blue-500" },
          { id: "both" as const, label: "Both Channels", icon: Zap, color: "text-violet-500" },
        ]).map((ch) => (
          <Button
            key={ch.id}
            variant={channel === ch.id ? "default" : "outline"}
            onClick={() => setChannel(ch.id)}
            className="flex-1"
            size="sm"
          >
            <ch.icon className={`h-4 w-4 mr-2 ${channel === ch.id ? "" : ch.color}`} />
            {ch.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT — Audience */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Audience
                {selectedVerticals.size > 0 && <Badge variant="secondary">{selectedVerticals.size} verticals</Badge>}
                {contacts.length > 0 && <Badge>{selectedContacts.size}/{contacts.length}</Badge>}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllVerticals}>All 11</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAllVerticals}>Clear</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Vertical chips — multi-select */}
            <div className="grid grid-cols-2 gap-1.5">
              {VERTICAL_SOURCES.map((v) => {
                const active = selectedVerticals.has(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => toggleVertical(v.id)}
                    className={`text-left text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                      active
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "bg-card border-border hover:border-emerald-500/50"
                    }`}
                  >
                    <span className="mr-1.5">{v.emoji}</span>{v.label}
                  </button>
                );
              })}
            </div>

            {/* Stage filter — only for selected verticals that have a stage column */}
            {Array.from(selectedVerticals).some((id) => VERTICAL_SOURCES.find((v) => v.id === id)?.stageField) && (
              <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Stage filter (optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {VERTICAL_SOURCES.filter((v) => selectedVerticals.has(v.id) && v.stageField).map((v) => {
                    const opts = stageOptions[v.id] || [];
                    return (
                      <div key={v.id} className="flex items-center gap-1.5">
                        <span className="text-[10px] truncate w-24">{v.emoji} {v.label}</span>
                        <Select
                          value={stageFilter[v.id] || "__all__"}
                          onValueChange={(val) => {
                            const newVal = val === "__all__" ? "" : val;
                            setStageFilter((prev) => ({ ...prev, [v.id]: newVal }));
                            // Auto-reload so user instantly sees the filtered set (no "stuck" feeling)
                            setTimeout(() => { loadAllSelected(); }, 50);
                          }}
                        >
                          <SelectTrigger className="h-7 text-[10px] flex-1">
                            <SelectValue placeholder="All stages" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">All stages</SelectItem>
                            {opts.length === 0 && (
                              <SelectItem value="__hint__" disabled>Loading stages…</SelectItem>
                            )}
                            {opts.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">Stage chuno → "Load contacts" dabao → sirf usi stage ke clients aayenge → Select All → Send.</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={loadAllSelected}
                disabled={isLoadingAudience || selectedVerticals.size === 0}
                className="flex-1 gap-2"
                size="sm"
              >
                {isLoadingAudience ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Load contacts ({selectedVerticals.size})
              </Button>
              {useMetaTemplate && metaTemplateName && templateVars.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={downloadSmartTemplate}
                  className="gap-1.5"
                  title={`Download Excel with columns: name, phone, ${templateVars.join(", ")}`}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Download Smart Template
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5"
                title={
                  useMetaTemplate && metaTemplateName && templateVars.length > 0
                    ? `Required columns: name, phone, ${templateVars.join(", ")}`
                    : "Upload contacts (name, phone, email)"
                }
              >
                <Upload className="h-3.5 w-3.5" /> Upload Filled Excel
              </Button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCSVUpload} />
            </div>

            {/* ─── Load Summary + Diagnostics ─── */}
            {loadSummary && (
              <div className="rounded-md border bg-muted/30 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    Last load summary
                    <span className="text-[10px] font-normal text-muted-foreground">@ {loadSummary.runAt}</span>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => setShowDiagnostics((s) => !s)}
                  >
                    {showDiagnostics ? "Hide" : "Show"} diagnostics
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <div className="bg-card border rounded p-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Total records</p>
                    <p className="text-sm font-bold">{loadSummary.totalFetched}</p>
                  </div>
                  <div className="bg-card border rounded p-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Deduped records</p>
                    <p className="text-sm font-bold">{loadSummary.afterDedup}</p>
                  </div>
                  <div className="bg-card border rounded p-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Stage filtered</p>
                    <p className="text-sm font-bold">{loadSummary.stageFiltered}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-1.5">
                    <p className="text-[9px] text-emerald-700 dark:text-emerald-300 uppercase">Ready to send</p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{loadSummary.afterChannelFilter}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Total {loadSummary.totalFetched} → Deduped {loadSummary.afterDedup} → {loadSummary.stageFilterActive ? "Selected stage" : "All stages"} {loadSummary.stageFiltered} → Ready {loadSummary.afterChannelFilter}
                </p>

                {showDiagnostics && diagnostics.length > 0 && (
                  <div className="border rounded bg-background overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] h-7">Vertical</TableHead>
                          <TableHead className="text-[10px] h-7">Table</TableHead>
                          <TableHead className="text-[10px] h-7">Columns</TableHead>
                          <TableHead className="text-[10px] h-7">Stage</TableHead>
                          <TableHead className="text-[10px] h-7 text-right">Fetched</TableHead>
                          <TableHead className="text-[10px] h-7 text-right">Bad ph</TableHead>
                          <TableHead className="text-[10px] h-7 text-right">Dup</TableHead>
                          <TableHead className="text-[10px] h-7 text-right">Deduped</TableHead>
                          <TableHead className="text-[10px] h-7 text-right">Stage match</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diagnostics.map((d) => (
                          <TableRow key={d.label} className={d.error ? "bg-destructive/10" : ""}>
                            <TableCell className="text-[10px] py-1 font-medium">{d.label}</TableCell>
                            <TableCell className="text-[10px] py-1 font-mono text-muted-foreground">{d.table}</TableCell>
                            <TableCell className="text-[10px] py-1 font-mono text-muted-foreground">{d.columns.join(", ")}</TableCell>
                            <TableCell className="text-[10px] py-1">
                              {d.appliedStage ? (
                                <Badge variant="outline" className="text-[9px] h-4">{d.appliedStage}</Badge>
                              ) : (
                                <span className="text-muted-foreground">all</span>
                              )}
                            </TableCell>
                            <TableCell className="text-[10px] py-1 text-right font-bold">{d.fetched}</TableCell>
                            <TableCell className="text-[10px] py-1 text-right text-amber-600">{d.invalidPhone || "—"}</TableCell>
                            <TableCell className="text-[10px] py-1 text-right text-muted-foreground">{d.duplicates || "—"}</TableCell>
                            <TableCell className="text-[10px] py-1 text-right font-bold">{d.deduped}</TableCell>
                            <TableCell className="text-[10px] py-1 text-right font-bold text-emerald-600">{d.stageMatched}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {diagnostics.some((d) => d.error) && (
                      <div className="p-1.5 bg-destructive/10 border-t">
                        {diagnostics.filter((d) => d.error).map((d) => (
                          <p key={d.label} className="text-[10px] text-destructive">⚠ {d.label}: {d.error}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Search + table */}
            {contacts.length > 0 && (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                    <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search…" className="pl-7 h-8 text-xs" />
                  </div>
                  <Button
                    variant="outline" size="sm" className="h-8 text-xs"
                    onClick={() => {
                      if (selectedContacts.size === contacts.length) setSelectedContacts(new Set());
                      else setSelectedContacts(new Set(contacts.map((_, i) => i)));
                    }}
                  >
                    {selectedContacts.size === contacts.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <SelectionFilterToolbar
                  selectedCount={selectedContacts.size}
                  totalCount={contacts.length}
                  onlySelected={onlySelectedView}
                  onToggleOnlySelected={() => setOnlySelectedView((v) => !v)}
                  onClearSelection={() => {
                    setSelectedContacts(new Set());
                    setOnlySelectedView(false);
                  }}
                  itemNoun="contacts"
                />
                <ScrollArea className="h-[320px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead className="text-[11px]">Name</TableHead>
                        <TableHead className="text-[11px]">Phone</TableHead>
                        <TableHead className="text-[11px]">Vertical</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.slice(0, 500).map((c) => {
                        const realIdx = contacts.indexOf(c);
                        return (
                          <TableRow key={realIdx}>
                            <TableCell className="py-1.5">
                              <Checkbox
                                checked={selectedContacts.has(realIdx)}
                                onCheckedChange={(checked) => {
                                  const next = new Set(selectedContacts);
                                  checked ? next.add(realIdx) : next.delete(realIdx);
                                  setSelectedContacts(next);
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-xs py-1.5">{c.name}</TableCell>
                            <TableCell className="text-xs py-1.5 font-mono">{c.phone}</TableCell>
                            <TableCell className="py-1.5">
                              <Badge variant="outline" className="text-[10px]">{c.vertical}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredContacts.length > 500 && (
                    <p className="text-[10px] text-center py-2 text-muted-foreground">Showing first 500 of {filteredContacts.length}</p>
                  )}
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>

        {/* RIGHT — Message */}
        <div className="space-y-4">
          {(channel === "whatsapp" || channel === "both") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-500" /> WhatsApp Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={useMetaTemplate} onCheckedChange={setUseMetaTemplate} />
                  <Label className="text-xs">Use approved Meta template (recommended for bulk)</Label>
                </div>

                {useMetaTemplate ? (
                  <>
                    <Select value={metaTemplateName} onValueChange={setMetaTemplateName}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select an approved template…" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(metaTemplates || []).map((t: any) => (
                          <SelectItem key={t.name} value={t.name}>
                            <span className="font-medium">{t.display_name || t.name}</span>
                            <Badge variant="outline" className="ml-2 text-[10px]">{t.category}</Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedTemplate && (
                      <div className="p-2.5 rounded-md bg-muted/40 border space-y-1.5">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Preview</p>
                        <p className="text-xs whitespace-pre-wrap">{(selectedTemplate as any).body}</p>
                        {templateVars.length > 0 && (
                          <div className="flex gap-1 flex-wrap pt-1">
                            <span className="text-[10px] text-muted-foreground">Variables:</span>
                            {templateVars.map((v) => (
                              <Badge key={v} variant="secondary" className="text-[10px]">{`{{${v}}}`}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <Textarea
                    value={waMessage}
                    onChange={(e) => setWaMessage(e.target.value)}
                    placeholder="Free text… use {name} for personalization (only works in 24h reply window)"
                    rows={5}
                    className="text-sm"
                  />
                )}
              </CardContent>
            </Card>
          )}

          {(channel === "email" || channel === "both") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" /> Email Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select value={emailFrom} onValueChange={setEmailFrom}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales@notify.grabyourcar.com">sales@notify.grabyourcar.com</SelectItem>
                    <SelectItem value="founder@notify.grabyourcar.com">founder@notify.grabyourcar.com</SelectItem>
                    <SelectItem value="insurance@notify.grabyourcar.com">insurance@notify.grabyourcar.com</SelectItem>
                    <SelectItem value="marketing@notify.grabyourcar.com">marketing@notify.grabyourcar.com</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Subject" className="h-8 text-xs" />
                <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Body (use {name})" rows={5} className="text-xs" />
              </CardContent>
            </Card>
          )}

          {/* Send */}
          <Card>
            <CardContent className="py-3">
              {isSending ? (
                <div className="space-y-2 text-center">
                  <Loader2 className="h-7 w-7 mx-auto animate-spin text-primary" />
                  <Progress value={sendProgress} />
                  <p className="text-xs text-muted-foreground">Sending… {sendProgress}%</p>
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSend}
                  disabled={
                    selectedContacts.size === 0 ||
                    (channel !== "email" && useMetaTemplate && !metaTemplateName) ||
                    (channel !== "email" && !useMetaTemplate && !waMessage) ||
                    (channel !== "whatsapp" && (!emailSubject || !emailBody))
                  }
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send to {selectedContacts.size} via {channel === "both" ? "WhatsApp + Email" : channel === "whatsapp" ? "WhatsApp" : "Email"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Result */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Broadcast Complete
            </DialogTitle>
          </DialogHeader>
          {sendResult && (
            <div className="flex gap-8 justify-center py-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-600">{sendResult.sent}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-red-500">{sendResult.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
};

export default UnifiedBulkBroadcaster;
