import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, RefreshCw, RotateCcw, Sparkles, Trash2, Zap } from "lucide-react";

type Job = {
  id: string;
  brand: string;
  model_name: string;
  status: string;
  brochure_found: boolean | null;
  variants_found: number | null;
  colors_found: number | null;
  specs_found: number | null;
  error_message: string | null;
  job_batch_id: string | null;
  attempt_count: number | null;
};

type BrandStats = {
  brand: string;
  queued: number;
  running: number;
  done: number;
  failed: number;
  total: number;
  brochures: number;
};

export default function BulkEnrichment() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [enqueueing, setEnqueueing] = useState(false);
  const [running, setRunning] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [geminiRunning, setGeminiRunning] = useState(false);
  const [geminiAuto, setGeminiAuto] = useState(false);
  const [geminiLog, setGeminiLog] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from("car_scrape_jobs")
      .select("id,brand,model_name,status,brochure_found,variants_found,colors_found,specs_found,error_message,job_batch_id,attempt_count")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (!error && data) setJobs(data as Job[]);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
    const ch = supabase
      .channel("car_scrape_jobs_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "car_scrape_jobs" }, () => loadJobs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Auto-run worker every 25 sec when toggled on
  useEffect(() => {
    if (!autoRun) return;
    const interval = setInterval(() => { runWorker(true); }, 25000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  // Auto-run Gemini every 6 sec (cheap & fast)
  useEffect(() => {
    if (!geminiAuto) return;
    const interval = setInterval(() => { runGemini(true); }, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geminiAuto]);

  const enqueue = async (onlyMissing: boolean) => {
    setEnqueueing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enqueue-bulk-enrichment", {
        body: { onlyMissing },
      });
      if (error) throw error;
      toast({ title: "Enqueued", description: `${data.enqueued} cars across ${data.brands} brands queued.` });
      await loadJobs();
    } catch (e) {
      toast({ title: "Failed", description: String(e), variant: "destructive" });
    } finally {
      setEnqueueing(false);
    }
  };

  const runWorker = async (silent = false) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-car-enrichment-worker", {
        body: { batchSize: 5 },
      });
      if (error) throw error;
      if (!silent) {
        toast({
          title: "Batch processed",
          description: `${data.processed} processed, ${data.successes} ok, ${data.failures} failed.`,
        });
      }
    } catch (e) {
      if (!silent) toast({ title: "Worker error", description: String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const runGemini = async (silent = false) => {
    setGeminiRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("gemini-car-bulk-fill", {
        body: { batchSize: 8 },
      });
      if (error) throw error;
      const msg = `${data.processed ?? 0} processed · ${data.successes ?? 0} ok · ${data.failures ?? 0} failed`;
      setGeminiLog(`${new Date().toLocaleTimeString()} — ${msg}`);
      if (!silent) toast({ title: "Gemini batch", description: msg });
      if (data.processed === 0) {
        setGeminiAuto(false);
        toast({ title: "All filled", description: "No more cars need specs/variants/colors." });
      }
    } catch (e) {
      if (!silent) toast({ title: "Gemini error", description: String(e), variant: "destructive" });
    } finally {
      setGeminiRunning(false);
    }
  };

  const retryFailed = async () => {
    const { error } = await supabase
      .from("car_scrape_jobs")
      .update({ status: "queued", error_message: null })
      .eq("status", "failed");
    if (error) {
      toast({ title: "Retry failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Failed jobs re-queued" });
      await loadJobs();
    }
  };

  const clearAll = async () => {
    if (!confirm("Delete all queue entries (does not affect cars)?")) return;
    const { error } = await supabase.from("car_scrape_jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast({ title: "Clear failed", description: error.message, variant: "destructive" });
    } else {
      await loadJobs();
    }
  };

  const stats = useMemo(() => {
    const total = jobs.length;
    const done = jobs.filter(j => j.status === "done").length;
    const failed = jobs.filter(j => j.status === "failed").length;
    const running = jobs.filter(j => j.status === "running").length;
    const queued = jobs.filter(j => j.status === "queued").length;
    const brochures = jobs.filter(j => j.brochure_found).length;
    const pct = total > 0 ? Math.round(((done + failed) / total) * 100) : 0;
    return { total, done, failed, running, queued, brochures, pct };
  }, [jobs]);

  const brandStats = useMemo<BrandStats[]>(() => {
    const map = new Map<string, BrandStats>();
    for (const j of jobs) {
      const b = j.brand || "Unknown";
      if (!map.has(b)) map.set(b, { brand: b, queued: 0, running: 0, done: 0, failed: 0, total: 0, brochures: 0 });
      const s = map.get(b)!;
      s.total++;
      if (j.status === "queued") s.queued++;
      else if (j.status === "running") s.running++;
      else if (j.status === "done") s.done++;
      else if (j.status === "failed") s.failed++;
      if (j.brochure_found) s.brochures++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [jobs]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Car Enrichment</h1>
        <p className="text-muted-foreground">Background Firecrawl worker · brochure / colors / variants / specs</p>
      </div>

      {/* Gemini AI bulk-fill (specs/variants/colors) */}
      <Card className="border-2 border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            Gemini AI Fill — Specs / Variants / Colors
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Free + fast. Fills missing specs, variants, and colors using Gemini 2.5 Flash.
            Skips brochures, images, exact prices (those need Firecrawl).
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <Button
            onClick={() => runGemini()}
            disabled={geminiRunning}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {geminiRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Run 1 Gemini Batch (8 cars)
          </Button>
          <Button
            variant={geminiAuto ? "default" : "outline"}
            onClick={() => setGeminiAuto(v => !v)}
            className={geminiAuto ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${geminiAuto ? "animate-spin" : ""}`} />
            Auto-Run {geminiAuto ? "ON" : "OFF"}
          </Button>
          {geminiLog && (
            <span className="text-xs text-muted-foreground ml-2">Last: {geminiLog}</span>
          )}
        </CardContent>
      </Card>

      {/* Controls — Firecrawl */}
      <Card>
        <CardHeader><CardTitle>Firecrawl Worker (Brochure / Image scraping)</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => enqueue(true)} disabled={enqueueing}>
            {enqueueing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Enqueue Missing-Only
          </Button>
          <Button variant="outline" onClick={() => enqueue(false)} disabled={enqueueing}>
            <Play className="h-4 w-4 mr-2" /> Enqueue ALL Cars
          </Button>
          <Button variant="secondary" onClick={() => runWorker()} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Run 1 Batch (5 cars)
          </Button>
          <Button
            variant={autoRun ? "default" : "outline"}
            onClick={() => setAutoRun(v => !v)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRun ? "animate-spin" : ""}`} />
            Auto-Run {autoRun ? "ON" : "OFF"}
          </Button>
          <Button variant="outline" onClick={retryFailed}>
            <RotateCcw className="h-4 w-4 mr-2" /> Retry Failed
          </Button>
          <Button variant="ghost" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear Queue
          </Button>
        </CardContent>
      </Card>


      {/* Overall progress */}
      <Card>
        <CardHeader><CardTitle>Overall Progress</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Progress value={stats.pct} />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            <Stat label="Total" value={stats.total} />
            <Stat label="Queued" value={stats.queued} color="text-amber-600" />
            <Stat label="Running" value={stats.running} color="text-blue-600" />
            <Stat label="Done" value={stats.done} color="text-emerald-600" />
            <Stat label="Failed" value={stats.failed} color="text-red-600" />
            <Stat label="Brochures Found" value={stats.brochures} color="text-violet-600" />
          </div>
        </CardContent>
      </Card>

      {/* Per-brand breakdown */}
      <Card>
        <CardHeader><CardTitle>Per-Brand Status</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : brandStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet. Click "Enqueue Missing-Only" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2 px-2">Brand</th>
                    <th className="py-2 px-2">Total</th>
                    <th className="py-2 px-2">Queued</th>
                    <th className="py-2 px-2">Running</th>
                    <th className="py-2 px-2">Done</th>
                    <th className="py-2 px-2">Failed</th>
                    <th className="py-2 px-2">Brochures</th>
                    <th className="py-2 px-2">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {brandStats.map(s => {
                    const pct = s.total > 0 ? Math.round(((s.done + s.failed) / s.total) * 100) : 0;
                    return (
                      <tr key={s.brand} className="border-b">
                        <td className="py-2 px-2 font-medium">{s.brand}</td>
                        <td className="py-2 px-2">{s.total}</td>
                        <td className="py-2 px-2"><Badge variant="outline">{s.queued}</Badge></td>
                        <td className="py-2 px-2"><Badge className="bg-blue-600">{s.running}</Badge></td>
                        <td className="py-2 px-2"><Badge className="bg-emerald-600">{s.done}</Badge></td>
                        <td className="py-2 px-2"><Badge variant="destructive">{s.failed}</Badge></td>
                        <td className="py-2 px-2"><Badge className="bg-violet-600">{s.brochures}</Badge></td>
                        <td className="py-2 px-2 w-40"><Progress value={pct} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent failures */}
      {stats.failed > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Failures (top 20)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {jobs.filter(j => j.status === "failed").slice(0, 20).map(j => (
                <div key={j.id} className="border rounded p-2">
                  <div className="font-medium">{j.brand} — {j.model_name}</div>
                  <div className="text-xs text-muted-foreground">{j.error_message}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, color = "" }: { label: string; value: number; color?: string }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
