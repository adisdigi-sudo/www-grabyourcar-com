import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2, RefreshCw, Trash2, ExternalLink } from "lucide-react";

export function InsuranceScraperAdmin() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("https://www.acko.com/car-insurance");
  const [isScraping, setIsScraping] = useState(false);

  const { data: scrapedData, isLoading } = useQuery({
    queryKey: ["admin-insurance-scraped"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_scraped_data")
        .select("*")
        .order("scraped_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: async (targetUrl: string) => {
      setIsScraping(true);
      const { data, error } = await supabase.functions.invoke("firecrawl-scrape", {
        body: { url: targetUrl, options: { formats: ["markdown"], onlyMainContent: true } },
      });
      if (error) throw error;

      // Save scraped data
      const content = data?.data || data;
      const { error: saveError } = await supabase.from("insurance_scraped_data").insert({
        source_url: targetUrl,
        source_name: new URL(targetUrl).hostname.replace("www.", ""),
        scraped_content: content,
        content_type: "page",
      });
      if (saveError) throw saveError;

      return content;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-insurance-scraped"] });
      toast.success("Page scraped and saved!");
      setIsScraping(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setIsScraping(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_scraped_data").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-insurance-scraped"] });
      toast.success("Deleted!");
    },
  });

  const quickUrls = [
    { label: "Acko Car Insurance", url: "https://www.acko.com/car-insurance" },
    { label: "Acko Comprehensive", url: "https://www.acko.com/car-insurance/comprehensive-car-insurance" },
    { label: "Acko Third Party", url: "https://www.acko.com/third-party-car-insurance" },
    { label: "Acko Zero Dep", url: "https://www.acko.com/car-insurance/zero-depreciation-car-insurance" },
    { label: "PolicyBazaar Car", url: "https://www.policybazaar.com/motor-insurance/car-insurance" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Insurance Content Scraper
          </CardTitle>
          <CardDescription>Scrape insurance content from external sources to populate your page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.acko.com/car-insurance"
              className="flex-1"
            />
            <Button onClick={() => scrapeMutation.mutate(url)} disabled={isScraping}>
              {isScraping ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Scraping...</> : <><RefreshCw className="h-4 w-4 mr-1" />Scrape</>}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickUrls.map((q) => (
              <Button
                key={q.url}
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => { setUrl(q.url); scrapeMutation.mutate(q.url); }}
                disabled={isScraping}
              >
                <ExternalLink className="h-3 w-3" />
                {q.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scraped Data History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
            <div className="space-y-3">
              {scrapedData?.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.source_name}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(item.scraped_at).toLocaleString()}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(item.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    {item.source_url}
                  </a>
                  <pre className="text-xs bg-muted p-3 rounded-lg mt-2 overflow-auto max-h-32 font-mono">
                    {typeof item.scraped_content === "string"
                      ? item.scraped_content.slice(0, 500)
                      : JSON.stringify(item.scraped_content, null, 2).slice(0, 500)}...
                  </pre>
                </div>
              ))}
              {!scrapedData?.length && <p className="text-sm text-muted-foreground text-center py-8">No scraped data yet. Click Scrape to start.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
