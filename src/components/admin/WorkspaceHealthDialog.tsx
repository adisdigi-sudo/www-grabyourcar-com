import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type CheckStatus = "pending" | "running" | "ok" | "warn" | "fail";

interface CheckResult {
  id: string;
  label: string;
  category: "Auth" | "Database" | "Storage" | "Edge Functions" | "Realtime" | "Browser";
  status: CheckStatus;
  durationMs?: number;
  message?: string;
  hint?: string;
}

interface WorkspaceHealthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INITIAL_CHECKS: CheckResult[] = [
  { id: "auth-session", label: "Authenticated session", category: "Auth", status: "pending" },
  { id: "db-business-verticals", label: "Database — business_verticals", category: "Database", status: "pending" },
  { id: "db-team-members", label: "Database — team_members", category: "Database", status: "pending" },
  { id: "db-vertical-access", label: "Database — user_vertical_access", category: "Database", status: "pending" },
  { id: "storage-buckets", label: "Storage buckets reachable", category: "Storage", status: "pending" },
  { id: "edge-ping", label: "Edge function gateway", category: "Edge Functions", status: "pending" },
  { id: "realtime-channel", label: "Realtime channel handshake", category: "Realtime", status: "pending" },
  { id: "browser-storage", label: "Browser storage (localStorage/sessionStorage)", category: "Browser", status: "pending" },
];

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; error: any; ms: number }> {
  const start = performance.now();
  try {
    const result = await fn();
    return { result, error: null, ms: Math.round(performance.now() - start) };
  } catch (error) {
    return { result: null, error, ms: Math.round(performance.now() - start) };
  }
}

export function WorkspaceHealthDialog({ open, onOpenChange }: WorkspaceHealthDialogProps) {
  const [checks, setChecks] = useState<CheckResult[]>(INITIAL_CHECKS);
  const [running, setRunning] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  const updateCheck = (id: string, patch: Partial<CheckResult>) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const runHealthCheck = async () => {
    setRunning(true);
    setCompletedAt(null);
    setChecks(INITIAL_CHECKS.map((c) => ({ ...c, status: "pending" })));

    // 1) Auth session
    updateCheck("auth-session", { status: "running" });
    const sessionResp = await timed(() => supabase.auth.getSession());
    if (sessionResp.error) {
      updateCheck("auth-session", {
        status: "fail",
        durationMs: sessionResp.ms,
        message: sessionResp.error?.message || "Unable to fetch session",
        hint: "Sign out and sign back in.",
      });
    } else if (!sessionResp.result?.data.session) {
      updateCheck("auth-session", {
        status: "warn",
        durationMs: sessionResp.ms,
        message: "No active session",
        hint: "User is anonymous. Some checks may be skipped.",
      });
    } else {
      updateCheck("auth-session", {
        status: "ok",
        durationMs: sessionResp.ms,
        message: `Logged in as ${sessionResp.result.data.session.user.email || "user"}`,
      });
    }

    // 2-4) Database table pings (lightweight count head requests)
    const dbTargets: Array<{ id: string; table: "business_verticals" | "team_members" | "user_vertical_access" }> = [
      { id: "db-business-verticals", table: "business_verticals" },
      { id: "db-team-members", table: "team_members" },
      { id: "db-vertical-access", table: "user_vertical_access" },
    ];

    for (const t of dbTargets) {
      updateCheck(t.id, { status: "running" });
      const resp = await timed(() =>
        supabase.from(t.table).select("*", { count: "exact", head: true })
      );
      if (resp.error) {
        updateCheck(t.id, {
          status: "fail",
          durationMs: resp.ms,
          message: resp.error?.message || "Query failed",
          hint: "RLS policy or network issue. Check backend.",
        });
      } else {
        updateCheck(t.id, {
          status: "ok",
          durationMs: resp.ms,
          message: `Reachable (${resp.ms}ms)`,
        });
      }
    }

    // 5) Storage buckets
    updateCheck("storage-buckets", { status: "running" });
    const storageResp = await timed(() => supabase.storage.listBuckets());
    if (storageResp.error) {
      updateCheck("storage-buckets", {
        status: "fail",
        durationMs: storageResp.ms,
        message: storageResp.error?.message || "Could not list buckets",
        hint: "File uploads may be unavailable.",
      });
    } else {
      const bucketCount = storageResp.result?.data?.length || 0;
      updateCheck("storage-buckets", {
        status: bucketCount > 0 ? "ok" : "warn",
        durationMs: storageResp.ms,
        message: `${bucketCount} bucket(s) accessible`,
      });
    }

    // 6) Edge function gateway (try a known lightweight one with HEAD/OPTIONS)
    updateCheck("edge-ping", { status: "running" });
    const edgeResp = await timed(async () => {
      // Use the project-info-style function via supabase functions; fall back to a no-op invocation
      // We use 'api-gateway' if present, otherwise just attempt 'whoami'-like call by listing schemas via REST.
      const url = `${(supabase as any).supabaseUrl || ""}/functions/v1/`;
      if (!url) throw new Error("functions URL unavailable");
      // OPTIONS request — should not require auth and confirms gateway is up
      const r = await fetch(url, { method: "OPTIONS" });
      if (!r.ok && r.status !== 204 && r.status !== 401 && r.status !== 404) {
        throw new Error(`Gateway responded ${r.status}`);
      }
      return r.status;
    });
    if (edgeResp.error) {
      updateCheck("edge-ping", {
        status: "warn",
        durationMs: edgeResp.ms,
        message: edgeResp.error?.message || "Could not reach gateway",
        hint: "Edge functions may be cold-starting. Retry in a few seconds.",
      });
    } else {
      updateCheck("edge-ping", {
        status: "ok",
        durationMs: edgeResp.ms,
        message: `Gateway reachable (HTTP ${edgeResp.result})`,
      });
    }

    // 7) Realtime handshake
    updateCheck("realtime-channel", { status: "running" });
    const realtimeResp = await timed(
      () =>
        new Promise<string>((resolve, reject) => {
          const channel = supabase.channel(`health-${Date.now()}`);
          const timeout = setTimeout(() => {
            supabase.removeChannel(channel);
            reject(new Error("Realtime subscribe timeout (5s)"));
          }, 5000);
          channel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              clearTimeout(timeout);
              supabase.removeChannel(channel);
              resolve(status);
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              clearTimeout(timeout);
              supabase.removeChannel(channel);
              reject(new Error(`Channel state: ${status}`));
            }
          });
        }),
    );
    if (realtimeResp.error) {
      updateCheck("realtime-channel", {
        status: "warn",
        durationMs: realtimeResp.ms,
        message: realtimeResp.error?.message || "Realtime not connected",
        hint: "Live updates may be delayed.",
      });
    } else {
      updateCheck("realtime-channel", {
        status: "ok",
        durationMs: realtimeResp.ms,
        message: "Subscribed successfully",
      });
    }

    // 8) Browser storage
    updateCheck("browser-storage", { status: "running" });
    const storageBrowser = await timed(async () => {
      const key = "__gyc_health_probe__";
      localStorage.setItem(key, "1");
      const ok = localStorage.getItem(key) === "1";
      localStorage.removeItem(key);
      sessionStorage.setItem(key, "1");
      const ok2 = sessionStorage.getItem(key) === "1";
      sessionStorage.removeItem(key);
      if (!ok || !ok2) throw new Error("Browser storage write/read failed");
      return true;
    });
    if (storageBrowser.error) {
      updateCheck("browser-storage", {
        status: "fail",
        durationMs: storageBrowser.ms,
        message: storageBrowser.error?.message,
        hint: "Disable private/incognito mode or allow site storage.",
      });
    } else {
      updateCheck("browser-storage", {
        status: "ok",
        durationMs: storageBrowser.ms,
        message: "Read/write OK",
      });
    }

    setRunning(false);
    setCompletedAt(new Date());
  };

  // Auto-run when dialog opens
  useEffect(() => {
    if (open && !running && !completedAt) {
      void runHealthCheck();
    }
    // Reset on close so next open re-runs
    if (!open) {
      setCompletedAt(null);
      setChecks(INITIAL_CHECKS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totals = checks.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<CheckStatus, number>,
  );

  const completed = (totals.ok || 0) + (totals.warn || 0) + (totals.fail || 0);
  const progress = Math.round((completed / checks.length) * 100);

  const overall: "ok" | "warn" | "fail" | "pending" =
    running || completed < checks.length
      ? "pending"
      : (totals.fail || 0) > 0
        ? "fail"
        : (totals.warn || 0) > 0
          ? "warn"
          : "ok";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Workspace Health Check
          </DialogTitle>
          <DialogDescription>
            Quick diagnostic across auth, database, storage, edge functions, realtime, and browser
            environment.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {overall === "pending" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {overall === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {overall === "warn" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              {overall === "fail" && <XCircle className="h-4 w-4 text-destructive" />}
              <span className="text-sm font-medium">
                {overall === "pending" && "Running checks…"}
                {overall === "ok" && "All systems operational"}
                {overall === "warn" && "Minor issues detected"}
                {overall === "fail" && "Critical issues detected"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {totals.ok ? (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  {totals.ok} OK
                </Badge>
              ) : null}
              {totals.warn ? (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {totals.warn} Warn
                </Badge>
              ) : null}
              {totals.fail ? <Badge variant="destructive">{totals.fail} Fail</Badge> : null}
            </div>
          </div>
          <Progress value={progress} className="h-1.5" />
          {completedAt && (
            <p className="text-[11px] text-muted-foreground">
              Last run: {completedAt.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Check list */}
        <div className="space-y-1.5 mt-2">
          {checks.map((c) => (
            <div
              key={c.id}
              className={cn(
                "flex items-start gap-3 rounded-md border px-3 py-2 text-sm",
                c.status === "ok" && "border-emerald-500/20 bg-emerald-500/5",
                c.status === "warn" && "border-amber-500/20 bg-amber-500/5",
                c.status === "fail" && "border-destructive/30 bg-destructive/5",
                (c.status === "pending" || c.status === "running") && "border-border bg-card",
              )}
            >
              <div className="mt-0.5 shrink-0">
                {c.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                {c.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {c.status === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {c.status === "warn" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {c.status === "fail" && <XCircle className="h-4 w-4 text-destructive" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{c.label}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {c.category}
                    {typeof c.durationMs === "number" && ` · ${c.durationMs}ms`}
                  </span>
                </div>
                {c.message && (
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{c.message}</p>
                )}
                {c.hint && c.status !== "ok" && (
                  <p className="text-xs text-foreground/70 mt-0.5 italic">💡 {c.hint}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            Close
          </Button>
          <Button onClick={runHealthCheck} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {running ? "Running…" : "Re-run check"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WorkspaceHealthDialog;
