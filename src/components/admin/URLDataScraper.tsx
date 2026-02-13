import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Globe, 
  Loader2, 
  Download, 
  Car, 
  Package, 
  Key as KeyIcon,
  CheckCircle2, 
  AlertCircle,
  Link2,
  FileText,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Copy,
  Eye
} from "lucide-react";

type ScrapeTarget = "cars" | "accessories" | "self-drive" | "general";

interface ScrapedData {
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
  };
  links?: string[];
}

const URLDataScraper = () => {
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState<ScrapeTarget>("cars");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<any>(null);
  const [mapResults, setMapResults] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<"scrape" | "review" | "save">("scrape");

  const handleScrape = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setIsLoading(true);
    setScrapedData(null);
    setExtractedInfo(null);

    try {
      // Step 1: Scrape the URL using Firecrawl
      const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { 
          url: url.trim(),
          options: { 
            formats: ['markdown', 'links'],
            onlyMainContent: true 
          }
        }
      });

      if (error) throw error;
      
      const scraped = data?.data || data;
      setScrapedData(scraped);

      // Step 2: Use AI to extract structured data from the scraped content
      if (scraped?.markdown) {
        toast.loading("Analyzing content with AI...", { id: "ai-extract" });
        
        const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-generate', {
          body: {
            prompt: getExtractionPrompt(target, scraped.markdown, scraped.metadata?.title),
            type: 'extract_data'
          }
        });

        if (aiError) {
          console.error("AI extraction error:", aiError);
          toast.dismiss("ai-extract");
        } else {
          try {
            const parsed = typeof aiData?.content === 'string' 
              ? JSON.parse(aiData.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
              : aiData?.content;
            setExtractedInfo(parsed);
            toast.success("Data extracted successfully!", { id: "ai-extract" });
          } catch {
            setExtractedInfo({ raw: aiData?.content });
            toast.success("Content scraped! Review extracted data.", { id: "ai-extract" });
          }
        }
      }

      setActiveStep("review");
      toast.success("Page scraped successfully!");
    } catch (err: any) {
      console.error("Scrape error:", err);
      toast.error(err.message || "Failed to scrape URL");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapSite = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-map', {
        body: { 
          url: url.trim(),
          options: { limit: 100 }
        }
      });

      if (error) throw error;
      
      const links = data?.links || [];
      setMapResults(links);
      toast.success(`Found ${links.length} pages on the site`);
    } catch (err: any) {
      toast.error(err.message || "Failed to map site");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!extractedInfo) {
      toast.error("No extracted data to save");
      return;
    }

    setIsSaving(true);
    try {
      if (target === "cars" && extractedInfo.cars) {
        for (const car of extractedInfo.cars) {
          const slug = `${(car.brand || 'unknown').toLowerCase().replace(/\s+/g, '-')}-${(car.name || 'unknown').toLowerCase().replace(/\s+/g, '-')}`;
          
          const { data: existing } = await supabase
            .from('cars')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

          if (existing) {
            // Update existing
            await supabase.from('cars').update({
              name: car.name,
              brand: car.brand,
              body_type: car.body_type || null,
              price_range: car.price_range || null,
              price_numeric: car.price_numeric || null,
              overview: car.overview || null,
              key_highlights: car.key_highlights || null,
              fuel_types: car.fuel_types || null,
              transmission_types: car.transmission_types || null,
              updated_at: new Date().toISOString(),
            }).eq('id', existing.id);

            // Add variants if any
            if (car.variants?.length) {
              for (const v of car.variants) {
                await supabase.from('car_variants').upsert({
                  car_id: existing.id,
                  name: v.name,
                  price: v.price || 'TBD',
                  fuel_type: v.fuel_type || null,
                  transmission: v.transmission || null,
                }, { onConflict: 'car_id,name' });
              }
            }
          } else {
            // Insert new
            const { data: newCar } = await supabase.from('cars').insert({
              slug,
              name: car.name,
              brand: car.brand,
              body_type: car.body_type || null,
              price_range: car.price_range || null,
              price_numeric: car.price_numeric || null,
              overview: car.overview || null,
              key_highlights: car.key_highlights || null,
              fuel_types: car.fuel_types || null,
              transmission_types: car.transmission_types || null,
            }).select('id').single();

            if (newCar && car.variants?.length) {
              for (const v of car.variants) {
                await supabase.from('car_variants').insert({
                  car_id: newCar.id,
                  name: v.name,
                  price: v.price || 'TBD',
                  fuel_type: v.fuel_type || null,
                  transmission: v.transmission || null,
                });
              }
            }

            // Add images if any
            if (newCar && car.images?.length) {
              for (const imgUrl of car.images) {
                await supabase.from('car_images').insert({
                  car_id: newCar.id,
                  url: imgUrl,
                  alt_text: `${car.brand} ${car.name}`,
                });
              }
            }
          }
        }
        toast.success(`Saved ${extractedInfo.cars.length} cars to database!`);
      } else if (target === "accessories" && extractedInfo.accessories) {
        toast.success(`Extracted ${extractedInfo.accessories.length} accessories. Manual review recommended.`);
      } else if (target === "self-drive" && extractedInfo.vehicles) {
        toast.success(`Extracted ${extractedInfo.vehicles.length} rental vehicles. Manual review recommended.`);
      } else {
        toast.info("Data extracted. Review and save manually as needed.");
      }

      setActiveStep("save");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save data");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          URL Data Scraper
        </h2>
        <p className="text-muted-foreground mt-1">
          Paste any URL to extract and import data into your car database, accessories, or self-drive inventory
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["scrape", "review", "save"].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <Badge 
              variant={activeStep === step ? "default" : "outline"}
              className="capitalize"
            >
              {i + 1}. {step}
            </Badge>
            {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scrape URL</CardTitle>
          <CardDescription>
            Enter any manufacturer website, product page, or data source URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.tatamotors.com/cars/nexon/"
                className="text-base"
              />
            </div>
            <Select value={target} onValueChange={(v) => setTarget(v as ScrapeTarget)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cars">
                  <span className="flex items-center gap-2">
                    <Car className="h-4 w-4" /> Car Database
                  </span>
                </SelectItem>
                <SelectItem value="accessories">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" /> Accessories
                  </span>
                </SelectItem>
                <SelectItem value="self-drive">
                  <span className="flex items-center gap-2">
                    <KeyIcon className="h-4 w-4" /> Self-Drive
                  </span>
                </SelectItem>
                <SelectItem value="general">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> General
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleScrape} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Scrape & Extract
            </Button>
            <Button onClick={handleMapSite} disabled={isLoading} variant="outline" className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Map All Pages
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map Results */}
      {mapResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Discovered Pages ({mapResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-60">
              <div className="space-y-1">
                {mapResults.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 group">
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{link}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="opacity-0 group-hover:opacity-100 h-7"
                      onClick={() => { setUrl(link); toast.info("URL set! Click Scrape to extract."); }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Use
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Extracted Data Review */}
      {(scrapedData || extractedInfo) && (
        <Tabs defaultValue="extracted" className="space-y-4">
          <TabsList>
            <TabsTrigger value="extracted">
              <Sparkles className="h-4 w-4 mr-1" /> Extracted Data
            </TabsTrigger>
            <TabsTrigger value="raw">
              <Eye className="h-4 w-4 mr-1" /> Raw Content
            </TabsTrigger>
            <TabsTrigger value="metadata">
              <FileText className="h-4 w-4 mr-1" /> Metadata
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extracted">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Extracted Data
                </CardTitle>
                <CardDescription>
                  Review the data extracted by AI before saving to database
                </CardDescription>
              </CardHeader>
              <CardContent>
                {extractedInfo ? (
                  <div className="space-y-4">
                    <ScrollArea className="h-96">
                      <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(extractedInfo, null, 2)}
                      </pre>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveToDatabase} disabled={isSaving} className="gap-2">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Save to Database
                      </Button>
                      <Button variant="outline" onClick={() => setExtractedInfo(null)}>
                        <AlertCircle className="h-4 w-4 mr-1" /> Discard
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>AI extraction in progress or no data extracted yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardContent className="pt-6">
                <ScrollArea className="h-96">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                    {scrapedData?.markdown || "No content scraped yet"}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metadata">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium">Title:</span>
                    <p className="text-muted-foreground">{scrapedData?.metadata?.title || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Description:</span>
                    <p className="text-muted-foreground">{scrapedData?.metadata?.description || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Source:</span>
                    <p className="text-muted-foreground">{scrapedData?.metadata?.sourceURL || "—"}</p>
                  </div>
                  {scrapedData?.links && (
                    <div>
                      <span className="text-sm font-medium">Links Found: {scrapedData.links.length}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

function getExtractionPrompt(target: ScrapeTarget, markdown: string, title?: string): string {
  const truncated = markdown.slice(0, 8000);
  
  if (target === "cars") {
    return `Extract all car data from this webpage content. Return ONLY valid JSON in this format:
{
  "cars": [
    {
      "name": "Model Name",
      "brand": "Brand Name",
      "body_type": "SUV/Sedan/Hatchback/etc",
      "price_range": "₹X.XX - ₹X.XX Lakh",
      "price_numeric": 800000,
      "overview": "Brief description",
      "key_highlights": ["highlight1", "highlight2"],
      "fuel_types": ["Petrol", "Diesel"],
      "transmission_types": ["Manual", "Automatic"],
      "variants": [
        { "name": "Variant Name", "price": "₹X.XX Lakh", "fuel_type": "Petrol", "transmission": "Manual" }
      ],
      "images": ["url1", "url2"]
    }
  ]
}

Page title: ${title || 'Unknown'}
Content:
${truncated}`;
  }
  
  if (target === "accessories") {
    return `Extract all car accessories/products from this webpage. Return ONLY valid JSON:
{
  "accessories": [
    {
      "name": "Product Name",
      "category": "Category",
      "price": 999,
      "description": "Brief description",
      "image_url": "url",
      "compatible_cars": ["Car Model 1"]
    }
  ]
}

Content:
${truncated}`;
  }
  
  if (target === "self-drive") {
    return `Extract all rental/self-drive vehicle data from this webpage. Return ONLY valid JSON:
{
  "vehicles": [
    {
      "name": "Vehicle Name",
      "type": "SUV/Sedan/Hatchback",
      "daily_rate": 2000,
      "features": ["feature1", "feature2"],
      "image_url": "url",
      "availability": "Available"
    }
  ]
}

Content:
${truncated}`;
  }
  
  return `Extract all structured data from this webpage. Return valid JSON with key data points found.

Content:
${truncated}`;
}

export default URLDataScraper;
