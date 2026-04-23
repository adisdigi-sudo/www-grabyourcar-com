import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, RefreshCw, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import { BRAND_CATALOG, getModelsForBrand, type ModelEntry } from "@/data/brandCatalog";

type ScrapeJob = {
  id: string;
  brand: string;
  model_name: string;
  status: string;
  variants_found: number;
  colors_found: number;
  specs_found: number;
  brochure_found: boolean;
  ex_showroom_delhi: number | null;
  error_message: string | null;
  completed_at: string | null;
  created_at: string;
};

export default function BrandScrape() {
  const { toast } = useToast();
  const [brand, setBrand] = useState<string>("Kia");
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [doneCount, setDoneCount] = useState(0);
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);

  const models: ModelEntry[] = useMemo(() => getModelsForBrand(brand), [brand]);

  const loadJobs = async () => {
    const { data } = await supabase
      .from("car_scrape_jobs")
      .select("*")
      .ilike("brand", `%${brand}%`)
      .order("created_at", { ascending: false })
      .limit(50);
    setJobs((data ?? []) as ScrapeJob[]);
  };

  useEffect(() => {
    loadJobs();
    const ch = supabase
      .channel(`brand_scrape_${brand}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "car_scrape_jobs" }, () => loadJobs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  const runBrandScrape = async () => {
    setRunning(true);
    setDoneCount(0);
    let okCount = 0;
    let failCount = 0;
    try {
      for (let i = 0; i < models.length; i++) {
        const m = models[i];
        setCurrentStep(`(${i + 1}/${models.length}) Scraping ${m.modelName}...`);
        const res = await supabase.functions.invoke("cardekho-deep-scrape", {
          body: { brand, modelName: m.modelName, cardekhoUrl: m.cardekhoUrl },
        });
        if (res.error) {
          failCount++;
          toast({ title: `${m.modelName} failed`, description: res.error.message, variant: "destructive" });
        } else {
          okCount++;
          const carId = (res.data as { carId?: string })?.carId;
          if (carId) {
            setCurrentStep(`(${i + 1}/${models.length}) Computing city pricing for ${m.modelName}...`);
            await supabase.functions.invoke("compute-city-pricing", { body: { carId } });

            setCurrentStep(`(${i + 1}/${models.length}) Fetching brochure for ${m.modelName}...`);
            const broc = await supabase.functions.invoke("scrape-brochure-url", {
              body: { brand, modelName: m.modelName, carId },
            });
            const brocOk = !broc.error && (broc.data as { success?: boolean })?.success;
            if (brocOk) {
              // mark brochure_found on latest job row for this model
              const { data: latest } = await supabase
                .from("car_scrape_jobs")
                .select("id")
                .eq("car_id", carId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (latest?.id) {
                await supabase.from("car_scrape_jobs").update({ brochure_found: true }).eq("id", latest.id);
              }
            }
          }
        }
        setDoneCount(i + 1);
        await loadJobs();
      }
      toast({ title: "Brand scrape complete", description: `${okCount} done · ${failCount} failed` });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    } finally {
      setRunning(false);
      setCurrentStep("");
    }
  };

  const statusBadge = (s: string) => {
    if (s === "done") return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Done</Badge>;
    if (s === "failed") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    if (s === "running") return <Badge className="bg-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const progress = models.length > 0 ? (doneCount / models.length) * 100 : 0;
  const stats = jobs.reduce(
    (acc, j) => {
      if (j.status === "done") acc.done++;
      else if (j.status === "failed") acc.failed++;
      acc.variants += j.variants_found || 0;
      acc.colors += j.colors_found || 0;
      acc.brochures += j.brochure_found ? 1 : 0;
      return acc;
    },
    { done: 0, failed: 0, variants: 0, colors: 0, brochures: 0 }
  );

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Zap className="w-7 h-7 text-yellow-500" />Brand Bulk Scraper</h1>
          <p className="text-muted-foreground mt-1">Ek brand select karo → saare models ek saath Firecrawl + AI se scrape</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Select Brand</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="text-sm font-medium mb-1 block">Brand</label>
            <Select value={brand} onValueChange={setBrand} disabled={running}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRAND_CATALOG.map((b) => (
                  <SelectItem key={b.brand} value={b.brand}>
                    {b.brand} ({b.models.length} models)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runBrandScrape} disabled={running || models.length === 0} size="lg">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {running ? "Scraping..." : `Scrape ${models.length} models`}
          </Button>
          <Button variant="outline" size="sm" onClick={loadJobs} disabled={running}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
        </CardContent>
      </Card>

      {running && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              {currentStep}
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground">{doneCount} / {models.length} models done</div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold text-green-600">{stats.done}</div><div className="text-xs text-muted-foreground">Done</div></CardContent></Card>
        <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold text-red-600">{stats.failed}</div><div className="text-xs text-muted-foreground">Failed</div></CardContent></Card>
        <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold">{stats.variants}</div><div className="text-xs text-muted-foreground">Total Variants</div></CardContent></Card>
        <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold">{stats.colors}</div><div className="text-xs text-muted-foreground">Total Colors</div></CardContent></Card>
        <Card><CardContent className="py-4 text-center"><div className="text-2xl font-bold">{stats.brochures}</div><div className="text-xs text-muted-foreground">Brochures</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>📋 Models in {brand}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 px-2 text-center">Status</th>
                  <th className="py-2 px-2 text-center">Variants</th>
                  <th className="py-2 px-2 text-center">Colors</th>
                  <th className="py-2 px-2 text-center">Specs</th>
                  <th className="py-2 px-2 text-center">Brochure</th>
                  <th className="py-2 px-2 text-center">Ex-Delhi</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => {
                  const j = jobs.find((x) => x.model_name === m.modelName);
                  return (
                    <tr key={m.modelName} className="border-b">
                      <td className="py-3 pr-4 font-medium">{m.modelName}</td>
                      <td className="py-3 px-2 text-center">{j ? statusBadge(j.status) : <Badge variant="outline">—</Badge>}</td>
                      <td className="py-3 px-2 text-center">{j?.variants_found ?? "—"}</td>
                      <td className="py-3 px-2 text-center">{j?.colors_found ?? "—"}</td>
                      <td className="py-3 px-2 text-center">{j?.specs_found ?? "—"}</td>
                      <td className="py-3 px-2 text-center">{j?.brochure_found ? "✅" : "—"}</td>
                      <td className="py-3 px-2 text-center text-xs">
                        {j?.ex_showroom_delhi ? `₹${(j.ex_showroom_delhi / 100000).toFixed(2)}L` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {jobs.some((j) => j.error_message) && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardHeader><CardTitle className="text-red-700 dark:text-red-400">⚠️ Errors</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {jobs.filter((j) => j.error_message).map((j) => (
              <div key={j.id}><strong>{j.model_name}:</strong> {j.error_message}</div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
