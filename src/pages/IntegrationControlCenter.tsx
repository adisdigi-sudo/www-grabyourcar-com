import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  PlayCircle,
  RefreshCw,
  MessageSquare,
  Mail,
  Brain,
  Phone,
  Database,
  ScanLine,
  CreditCard,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

type ProviderId =
  | "meta_whatsapp"
  | "lovable_ai"
  | "lovable_email"
  | "twilio_sms"
  | "supabase_db"
  | "surepass_rc"
  | "razorpay";

interface Provider {
  id: ProviderId;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  usedIn: string[];
}

const PROVIDERS: Provider[] = [
  {
    id: "meta_whatsapp",
    name: "Meta WhatsApp Cloud API",
    description: "Customer messaging, OTPs, broadcasts, lead alerts",
    icon: MessageSquare,
    usedIn: ["whatsapp-send", "whatsapp-otp", "broadcast-send", "wa-campaign-launcher"],
  },
  {
    id: "lovable_ai",
    name: "Lovable AI Gateway",
    description: "AI chat, content generation, lead scoring, blog writer",
    icon: Brain,
    usedIn: ["ai-brain", "ai-cofounder", "crm-ai-assistant", "ai-car-content", "generate-blog"],
  },
  {
    id: "lovable_email",
    name: "Email Provider (Resend)",
    description: "Transactional & marketing emails, invoices, campaigns",
    icon: Mail,
    usedIn: ["send-direct-email", "send-bulk-email", "send-invoice-email", "send-quote"],
  },
  {
    id: "twilio_sms",
    name: "Twilio SMS",
    description: "SMS fallback for OTPs and notifications",
    icon: Phone,
    usedIn: ["whatsapp-otp (fallback)", "send-alert-email (sms)"],
  },
  {
    id: "supabase_db",
    name: "Supabase Database",
    description: "Backend storage, auth, realtime, edge functions",
    icon: Database,
    usedIn: ["All CRM features", "Lead storage", "User auth"],
  },
  {
    id: "surepass_rc",
    name: "Surepass RC Verification",
    description: "Vehicle RC lookup, owner details for HSRP/Insurance",
    icon: ScanLine,
    usedIn: ["vehicle-lookup", "bulk-rc-enrichment", "HSRP booking"],
  },
  {
    id: "razorpay",
    name: "Razorpay Payment Gateway",
    description: "Payment processing for HSRP, accessories, bookings",
    icon: CreditCard,
    usedIn: ["razorpay-create-order-v2", "razorpay-verify-payment-v2", "hsrp-book-and-pay"],
  },
];

interface TestResult {
  provider: ProviderId;
  status: "success" | "failure" | "warning" | "skipped";
  message: string;
  duration_ms: number;
  details?: Record<string, unknown>;
}

interface HealthLog {
  id: string;
  provider: string;
  status: string;
  message: string | null;
  duration_ms: number | null;
  tested_by_email: string | null;
  created_at: string;
}

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" /> Not tested
      </Badge>
    );
  }
  const map = {
    success: { icon: CheckCircle2, label: "Healthy", className: "bg-green-500/15 text-green-700 border-green-300 dark:text-green-400" },
    failure: { icon: XCircle, label: "Failed", className: "bg-red-500/15 text-red-700 border-red-300 dark:text-red-400" },
    warning: { icon: AlertCircle, label: "Warning", className: "bg-yellow-500/15 text-yellow-700 border-yellow-300 dark:text-yellow-400" },
    skipped: { icon: AlertCircle, label: "Skipped", className: "bg-muted text-muted-foreground" },
  } as const;
  const cfg = map[status as keyof typeof map] ?? map.skipped;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
};

export default function IntegrationControlCenter() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    document.title = "Integration Control Center · GrabYourCar";
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email ?? "" });
    });
    loadLogs();
    loadLatestResults();
  }, []);

  const loadLatestResults = async () => {
    const { data } = await supabase
      .from("integration_health_logs")
      .select("provider, status, message, duration_ms, details, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!data) return;
    const latest: Record<string, TestResult> = {};
    for (const row of data) {
      if (!latest[row.provider]) {
        latest[row.provider] = {
          provider: row.provider as ProviderId,
          status: row.status as TestResult["status"],
          message: row.message ?? "",
          duration_ms: row.duration_ms ?? 0,
          details: (row.details as Record<string, unknown>) ?? undefined,
        };
      }
    }
    setResults(latest);
  };

  const loadLogs = async () => {
    const { data } = await supabase
      .from("integration_health_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data ?? []) as HealthLog[]);
  };

  const runTest = async (provider: ProviderId | "all") => {
    if (provider === "all") setTestingAll(true);
    else setTestingId(provider);
    try {
      const { data, error } = await supabase.functions.invoke("integration-health-check", {
        body: {
          provider,
          dryRun,
          recipientEmail: user?.email,
          userId: user?.id,
          userEmail: user?.email,
        },
      });
      if (error) throw error;
      const newResults = { ...results };
      for (const r of data.results as TestResult[]) {
        newResults[r.provider] = r;
      }
      setResults(newResults);
      const failed = (data.results as TestResult[]).filter((r) => r.status === "failure");
      if (failed.length === 0) toast.success(`${data.results.length} test(s) passed`);
      else toast.error(`${failed.length} of ${data.results.length} test(s) failed`);
      await loadLogs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTestingId(null);
      setTestingAll(false);
    }
  };

  const summary = {
    total: PROVIDERS.length,
    healthy: PROVIDERS.filter((p) => results[p.id]?.status === "success").length,
    failing: PROVIDERS.filter((p) => results[p.id]?.status === "failure").length,
    untested: PROVIDERS.filter((p) => !results[p.id]).length,
  };

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integration Control Center</h1>
          <p className="text-muted-foreground mt-1">
            Test and monitor all your APIs in one place. Every test logs a permanent audit entry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
            <Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
            <Label htmlFor="dry-run" className="text-sm cursor-pointer">
              Dry-run only (no real messages)
            </Label>
          </div>
          <Button onClick={() => runTest("all")} disabled={testingAll || !!testingId}>
            {testingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            Test all
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Providers</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold">{summary.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Healthy</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-600">{summary.healthy}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Failing</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-600">{summary.failing}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Untested</CardDescription></CardHeader>
          <CardContent><div className="text-3xl font-bold text-muted-foreground">{summary.untested}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="logs">Recent Logs ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4 mt-4">
          {PROVIDERS.map((p) => {
            const result = results[p.id];
            const Icon = p.icon;
            const isThisLoading = testingId === p.id || testingAll;
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{p.name}</h3>
                        <StatusBadge status={result?.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{p.description}</p>
                      {result && (
                        <p className={`text-sm mb-2 ${
                          result.status === "failure" ? "text-red-600" :
                          result.status === "warning" ? "text-yellow-600" :
                          "text-foreground"
                        }`}>
                          <strong>Last test:</strong> {result.message} <span className="text-muted-foreground">({result.duration_ms}ms)</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="text-xs text-muted-foreground mr-1">Used in:</span>
                        {p.usedIn.map((u) => (
                          <Badge key={u} variant="secondary" className="text-xs font-mono">{u}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={result?.status === "failure" ? "destructive" : "outline"}
                      onClick={() => runTest(p.id)}
                      disabled={isThisLoading || (testingAll && !isThisLoading)}
                      className="flex-shrink-0"
                    >
                      {isThisLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : result ? (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      ) : (
                        <PlayCircle className="h-4 w-4 mr-2" />
                      )}
                      {result ? "Re-test" : "Test"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Test History</CardTitle>
              <CardDescription>Last 50 health checks across all providers</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No tests yet. Click "Test all" to start.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 py-2 border-b last:border-0 text-sm">
                      <StatusBadge status={log.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold">{log.provider}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                          </span>
                          {log.duration_ms !== null && (
                            <span className="text-xs text-muted-foreground">· {log.duration_ms}ms</span>
                          )}
                          {log.tested_by_email && (
                            <span className="text-xs text-muted-foreground">· by {log.tested_by_email}</span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5">{log.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
