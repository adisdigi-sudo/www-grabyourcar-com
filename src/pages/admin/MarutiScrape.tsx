import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

// 3-car ultra-test set (Maruti Swift, Brezza, Ciaz)
const TEST_CARS = [
  {
    brand: "Maruti Suzuki",
    modelName: "Swift",
    cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Swift",
  },
  {
    brand: "Maruti Suzuki",
    modelName: "Brezza",
    cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Brezza",
  },
  {
    brand: "Maruti Suzuki",
    modelName: "Ciaz",
    cardekhoUrl: "https://www.cardekho.com/cars/Maruti_Suzuki/Ciaz",
  },
];

type ScrapeJob = {
  id: string;
  brand: string;
  model_name: string;
  status: string;
  variants_found: number;
  colors_found: number;
  specs_found: number;
  brochure_found: boolean;
  city_pricing_count: number;
  ex_showroom_delhi: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type AuditRow = {
  modelName: string;
  carId: string | null;
  variants: number;
  colors: number;
  brochures: number;
  specs: number;
  cityPricing: number;
};

export default function MarutiScrape() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");

  const loadAudit = async () => {
    const rows: AuditRow[] = [];
    for (const c of TEST_CARS) {
      const slug = `${c.brand} ${c.modelName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data: car } = await supabase.from("cars").select("id").eq("slug", slug).maybeSingle();
      const carId = car?.id ?? null;
      let variants = 0, colors = 0, brochures = 0, specs = 0, cityPricing = 0;
      if (carId) {
        const [v, col, br, sp, cp] = await Promise.all([
          supabase.from("car_variants").select("id", { count: "exact", head: true }).eq("car_id", carId),
          supabase.from("car_colors").select("id", { count: "exact", head: true }).eq("car_id", carId),
          supabase.from("car_brochures").select("id", { count: "exact", head: true }).eq("car_id", carId),
          supabase.from("car_specifications").select("id", { count: "exact", head: true }).eq("car_id", carId),
          supabase.from("car_city_pricing").select("id", { count: "exact", head: true }).eq("car_id", carId),
        ]);
        variants = v.count ?? 0; colors = col.count ?? 0; brochures = br.count ?? 0;
        specs = sp.count ?? 0; cityPricing = cp.count ?? 0;
      }
      rows.push({ modelName: c.modelName, carId, variants, colors, brochures, specs, cityPricing });
    }
    setAudit(rows);
  };

  const loadJobs = async () => {
    const { data } = await supabase
      .from("car_scrape_jobs")
      .select("*")
      .ilike("brand", "%maruti%")
      .order("created_at", { ascending: false })
      .limit(20);
    setJobs((data ?? []) as ScrapeJob[]);
  };

  useEffect(() => {
    loadAudit();
    loadJobs();
    // Realtime subscription on car_scrape_jobs
    const ch = supabase
      .channel("car_scrape_jobs_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "car_scrape_jobs" }, () => {
        loadJobs();
        loadAudit();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const runScrape = async () => {
    setRunning(true);
    try {
      for (const car of TEST_CARS) {
        setCurrentStep(`Scraping ${car.modelName}...`);
        const scrapeRes = await supabase.functions.invoke("cardekho-deep-scrape", { body: car });
        if (scrapeRes.error) {
          toast({ title: `${car.modelName} scrape failed`, description: scrapeRes.error.message, variant: "destructive" });
          continue;
        }
        const carId = (scrapeRes.data as { carId?: string })?.carId;
        if (carId) {
          setCurrentStep(`Computing 8-city pricing for ${car.modelName}...`);
          const priceRes = await supabase.functions.invoke("compute-city-pricing", { body: { carId } });
          if (priceRes.error) {
            toast({ title: `${car.modelName} pricing failed`, description: priceRes.error.message, variant: "destructive" });
          }
        }
        await loadAudit();
        await loadJobs();
      }
      toast({ title: "Scrape complete!", description: "Check audit table for results." });
    } catch (e) {
      toast({ title: "Scrape error", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
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

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Maruti Ultra-Test Scrape</h1>
          <p className="text-muted-foreground mt-1">3 cars test (Swift, Brezza, Ciaz) — CarDekho + Lovable AI extraction</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadAudit(); loadJobs(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
          <Button onClick={runScrape} disabled={running} size="lg">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {running ? "Running..." : "Run Scrape (3 cars)"}
          </Button>
        </div>
      </div>

      {currentStep && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="py-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="font-medium">{currentStep}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>📊 Live Audit — Data Quality Per Car</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="py-2 pr-4">Car</th>
                  <th className="py-2 px-2 text-center">Variants</th>
                  <th className="py-2 px-2 text-center">Colors</th>
                  <th className="py-2 px-2 text-center">Brochures</th>
                  <th className="py-2 px-2 text-center">Specs</th>
                  <th className="py-2 px-2 text-center">City Pricing</th>
                  <th className="py-2 pl-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((r) => {
                  const ok = r.variants >= 3 && r.colors >= 3 && r.cityPricing > 0;
                  return (
                    <tr key={r.modelName} className="border-b">
                      <td className="py-3 pr-4 font-medium">{r.modelName}</td>
                      <td className="py-3 px-2 text-center">{r.variants}</td>
                      <td className="py-3 px-2 text-center">{r.colors}</td>
                      <td className="py-3 px-2 text-center">{r.brochures > 0 ? "✅" : "❌"}</td>
                      <td className="py-3 px-2 text-center">{r.specs}</td>
                      <td className="py-3 px-2 text-center">
                        {r.cityPricing > 0 ? <span className="text-green-600 font-medium">{r.cityPricing}</span> : "❌"}
                      </td>
                      <td className="py-3 pl-2 text-center">
                        {ok ? <Badge className="bg-green-600">Good</Badge> : <Badge variant="secondary">Needs scrape</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🔄 Recent Scrape Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No scrape jobs yet. Click "Run Scrape" to start.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => (
                <div key={j.id} className="border rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {statusBadge(j.status)}
                    <div>
                      <div className="font-medium">{j.brand} {j.model_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {j.variants_found}V · {j.colors_found}C · {j.specs_found}S · brochure: {j.brochure_found ? "✅" : "❌"}
                        {j.ex_showroom_delhi ? ` · ex-Delhi ₹${(j.ex_showroom_delhi / 100000).toFixed(2)}L` : ""}
                      </div>
                      {j.error_message && <div className="text-xs text-red-600 mt-1">⚠️ {j.error_message}</div>}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {j.completed_at ? new Date(j.completed_at).toLocaleTimeString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
        <CardContent className="py-4 text-sm">
          <strong>💡 Quality Bar:</strong> Aim for 3+ variants, 3+ colors, brochure ✅, and 8 city pricing rows per car.
          Agar quality dikh jaye to mujhe batao — main baaki 26 brands queue kar dunga.
        </CardContent>
      </Card>
    </div>
  );
}
