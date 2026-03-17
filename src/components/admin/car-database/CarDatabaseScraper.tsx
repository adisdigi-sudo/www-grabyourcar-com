import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { Globe, Loader2, Car, Download, Link2, Search, FileSpreadsheet, CheckCircle2 } from "lucide-react";

const BRANDS = [
  'Maruti Suzuki','Hyundai','Tata','Mahindra','Kia','Toyota','Honda','MG',
  'Skoda','Volkswagen','Renault','Nissan','Citroen','Jeep','BMW','Mercedes-Benz','Audi'
];

export const CarDatabaseScraper = () => {
  const [mode, setMode] = useState<'single' | 'brand' | 'bulk'>('single');
  const [url, setUrl] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const scrapeSingle = async () => {
    if (!url.trim()) { toast.error('Enter a URL'); return; }
    setIsLoading(true);
    try {
      const res = await firecrawlApi.scrapeUrl(url.trim());
      if (res.success) {
        setResults([{ url, data: res.data, status: 'success' }]);
        toast.success('URL scraped successfully');
      } else {
        toast.error(res.error || 'Failed to scrape');
      }
    } catch (e: any) {
      toast.error(e.message || 'Scraping failed');
    } finally {
      setIsLoading(false);
    }
  };

  const scrapeBrand = async () => {
    if (!brand) { toast.error('Select a brand'); return; }
    setIsLoading(true);
    try {
      if (model.trim()) {
        const res = await firecrawlApi.scrapeCarModel(brand, model.trim());
        if (res.success) {
          setResults([{ url: res.url, data: res.data, brand, model, status: 'success' }]);
          toast.success(`Scraped ${brand} ${model}`);
        } else {
          toast.error(res.error || 'Failed');
        }
      } else {
        const res = await firecrawlApi.mapBrandSite(brand);
        if (res.success) {
          setResults((res.links || []).map((link: string) => ({ url: link, status: 'mapped' })));
          toast.success(`Found ${res.links?.length || 0} URLs for ${brand}`);
        } else {
          toast.error(res.error || 'Failed');
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Scraping failed');
    } finally {
      setIsLoading(false);
    }
  };

  const scrapeBulk = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(Boolean);
    if (!urls.length) { toast.error('Enter URLs (one per line)'); return; }
    setIsLoading(true);
    const newResults: any[] = [];
    for (const u of urls) {
      try {
        const res = await firecrawlApi.scrapeUrl(u);
        newResults.push({ url: u, data: res.data, status: res.success ? 'success' : 'error', error: res.error });
      } catch (e: any) {
        newResults.push({ url: u, status: 'error', error: e.message });
      }
    }
    setResults(newResults);
    const successCount = newResults.filter(r => r.status === 'success').length;
    toast.success(`Scraped ${successCount}/${urls.length} URLs`);
    setIsLoading(false);
  };

  const exportResults = () => {
    if (!results.length) return;
    const csv = results.map(r => `"${r.url}","${r.status}","${JSON.stringify(r.data || {}).replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([`"URL","Status","Data"\n${csv}`], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'scrape-results.csv'; a.click();
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2"><Globe className="h-5 w-5 text-primary" />URL Scraper for Car Data</h2>
        <p className="text-sm text-muted-foreground">Scrape OEM websites for car data — single URL, by brand, or bulk</p>
      </div>

      <Tabs value={mode} onValueChange={v => setMode(v as any)}>
        <TabsList>
          <TabsTrigger value="single" className="gap-1.5"><Link2 className="h-3.5 w-3.5" />Single URL</TabsTrigger>
          <TabsTrigger value="brand" className="gap-1.5"><Car className="h-3.5 w-3.5" />By Brand</TabsTrigger>
          <TabsTrigger value="bulk" className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" />Bulk URLs</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex gap-2">
                <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.marutisuzuki.com/swift" className="flex-1" />
                <Button onClick={scrapeSingle} disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}Scrape</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex gap-2">
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Select Brand" /></SelectTrigger>
                  <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={model} onChange={e => setModel(e.target.value)} placeholder="Model name (optional, e.g. Swift)" className="flex-1" />
                <Button onClick={scrapeBrand} disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}{model ? 'Scrape Model' : 'Map Brand'}</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Leave model empty to discover all car URLs on the brand website</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-3">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <Textarea value={bulkUrls} onChange={e => setBulkUrls(e.target.value)} placeholder={"https://www.marutisuzuki.com/swift\nhttps://www.hyundai.com/in/en/find-a-car/creta\nhttps://www.tatamotors.com/nexon"} rows={5} />
              <div className="flex justify-between items-center">
                <p className="text-[11px] text-muted-foreground">One URL per line</p>
                <Button onClick={scrapeBulk} disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}Scrape All</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Results ({results.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={exportResults}><Download className="h-3.5 w-3.5 mr-1" />Export CSV</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y">
                {results.map((r, i) => (
                  <div key={i} className="px-4 py-2 flex items-start gap-3">
                    <Badge variant={r.status === 'success' ? 'default' : r.status === 'mapped' ? 'secondary' : 'destructive'} className="mt-0.5 text-[10px] shrink-0">
                      {r.status === 'success' ? <CheckCircle2 className="h-3 w-3 mr-0.5" /> : null}
                      {r.status}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono truncate text-muted-foreground">{r.url}</p>
                      {r.data?.metadata?.title && <p className="text-xs font-medium mt-0.5">{r.data.metadata.title}</p>}
                      {r.data?.markdown && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{r.data.markdown.substring(0, 200)}...</p>}
                      {r.error && <p className="text-[11px] text-destructive mt-0.5">{r.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
