import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Globe, Sparkles, Save, RefreshCw, Search, Eye, 
  CheckCircle, AlertCircle, Copy, Wand2, FileText 
} from "lucide-react";

interface PageSEO {
  id: string;
  page_key: string;
  title: string;
  description: string;
  keywords: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  canonical_url?: string;
  robots?: string;
  updated_at: string;
}

const defaultPages = [
  { key: 'home', name: 'Homepage', path: '/' },
  { key: 'cars', name: 'Cars Listing', path: '/cars' },
  { key: 'car_detail', name: 'Car Detail Page', path: '/cars/:slug' },
  { key: 'compare', name: 'Compare Cars', path: '/compare' },
  { key: 'car_loans', name: 'Car Loans', path: '/car-loans' },
  { key: 'car_insurance', name: 'Car Insurance', path: '/car-insurance' },
  { key: 'self_drive', name: 'Self-Drive Rentals', path: '/self-drive' },
  { key: 'hsrp', name: 'HSRP Services', path: '/hsrp' },
  { key: 'accessories', name: 'Accessories', path: '/accessories' },
  { key: 'about', name: 'About Us', path: '/about' },
  { key: 'blog', name: 'Blog', path: '/blog' },
  { key: 'contact', name: 'Contact', path: '/contact' },
  { key: 'dealers', name: 'Dealer Locator', path: '/dealers' },
  { key: 'brochures', name: 'Brochures', path: '/brochures' },
];

export const SEOBuilder = () => {
  const queryClient = useQueryClient();
  const [selectedPage, setSelectedPage] = useState<string>("home");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoOptimizing, setIsAutoOptimizing] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    keywords: "",
    og_title: "",
    og_description: "",
    og_image: "",
    canonical_url: "",
    robots: "index, follow",
  });

  // Fetch SEO settings from admin_settings
  const { data: seoSettings, isLoading } = useQuery({
    queryKey: ['seoSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .like('setting_key', 'seo_%');
      
      if (error) throw error;
      return data;
    },
  });

  // Load page-specific SEO when page changes or data loads
  const loadPageSEO = (pageKey: string) => {
    const setting = seoSettings?.find(s => s.setting_key === `seo_${pageKey}`);
    if (setting?.setting_value) {
      const value = setting.setting_value as Record<string, string>;
      setFormData({
        title: value.title || "",
        description: value.description || "",
        keywords: value.keywords || "",
        og_title: value.og_title || "",
        og_description: value.og_description || "",
        og_image: value.og_image || "/og-image.png",
        canonical_url: value.canonical_url || "",
        robots: value.robots || "index, follow",
      });
    } else {
      const page = defaultPages.find(p => p.key === pageKey);
      setFormData({
        title: `${page?.name || 'Page'} - Grabyourcar`,
        description: "",
        keywords: "",
        og_title: "",
        og_description: "",
        og_image: "/og-image.png",
        canonical_url: `https://grabyourcar.com${page?.path || ''}`,
        robots: "index, follow",
      });
    }
  };

  // Auto-load SEO data when settings are fetched or page changes
  useEffect(() => {
    if (seoSettings) {
      loadPageSEO(selectedPage);
    }
  }, [seoSettings, selectedPage]);

  // Save SEO mutation
  const saveSEOMutation = useMutation({
    mutationFn: async ({ pageKey, seoData }: { pageKey: string; seoData: typeof formData }) => {
      const settingKey = `seo_${pageKey}`;
      
      // Check if exists
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('setting_key', settingKey)
        .single();

      const jsonValue = JSON.parse(JSON.stringify(seoData));

      if (existing) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ 
            setting_value: jsonValue,
            updated_at: new Date().toISOString() 
          })
          .eq('setting_key', settingKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .insert([{
            setting_key: settingKey,
            setting_value: jsonValue,
            description: `SEO settings for ${pageKey}`,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seoSettings'] });
      toast.success('SEO settings saved!');
    },
    onError: (error) => {
      toast.error('Failed to save SEO settings');
      console.error(error);
    },
  });

  // Generate SEO with AI
  const generateWithAI = async (type: 'title' | 'description' | 'keywords' | 'all') => {
    setIsGenerating(true);
    try {
      const page = defaultPages.find(p => p.key === selectedPage);
      const prompt = type === 'all' 
        ? `Generate comprehensive SEO metadata for a car dealership website's ${page?.name} page. Return JSON with: title (keyword-rich, no length limit), description (detailed and keyword-rich, no length limit), keywords (extensive comma-separated list of all relevant keywords).`
        : type === 'title'
        ? `Generate a comprehensive, keyword-rich SEO title for a car dealership's ${page?.name} page. Include all relevant keywords. No character limit.`
        : type === 'description'
        ? `Generate a detailed, keyword-rich SEO meta description for a car dealership's ${page?.name} page. Include all relevant keywords, features, and value propositions. No character limit.`
        : `Generate an extensive list of SEO keywords (comma-separated) for a car dealership's ${page?.name} page. Include long-tail keywords, location-based keywords, and all relevant variations.`;

      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: { 
          prompt,
        }
      });

      if (error) throw error;

      const response = data?.content || '';
      
      if (type === 'all') {
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setFormData(prev => ({
              ...prev,
              title: parsed.title || prev.title,
              description: parsed.description || prev.description,
              keywords: parsed.keywords || prev.keywords,
            }));
          }
        } catch {
          toast.info('AI generated content - please review and adjust');
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [type]: response.replace(/^["']|["']$/g, '').trim(),
        }));
      }

      toast.success(`AI generated ${type === 'all' ? 'SEO content' : type}!`);
    } catch (error) {
      toast.error('AI generation failed - please try again');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const autoOptimizeAll = async () => {
    setIsAutoOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-agent", {
        body: { action: "optimize_all" },
      });
      if (error) throw error;
      const successCount = data?.results?.filter((r: any) => r.status === "success").length || 0;
      toast.success(`Auto-optimized ${successCount}/${defaultPages.length} pages!`);
      queryClient.invalidateQueries({ queryKey: ["seoSettings"] });
    } catch (e) {
      toast.error("Auto-optimize failed: " + (e as Error).message);
    } finally {
      setIsAutoOptimizing(false);
    }
  };

  const handlePageChange = (pageKey: string) => {
    setSelectedPage(pageKey);
  };

  const handleSave = () => {
    saveSEOMutation.mutate({ pageKey: selectedPage, seoData: formData });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const titleLength = formData.title.length;
  const descLength = formData.description.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            SEO Builder
          </h2>
          <p className="text-muted-foreground">
            Optimize your pages for search engines with AI assistance
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Page Selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {defaultPages.map((page) => {
              const hasSEO = seoSettings?.some(s => s.setting_key === `seo_${page.key}`);
              return (
                <Button
                  key={page.key}
                  variant={selectedPage === page.key ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm"
                  onClick={() => handlePageChange(page.key)}
                >
                  {hasSEO ? (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                  )}
                  {page.name}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* SEO Editor */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {defaultPages.find(p => p.key === selectedPage)?.name || 'Page'} SEO
                </CardTitle>
                <CardDescription>
                  {defaultPages.find(p => p.key === selectedPage)?.path}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => generateWithAI('all')}
                  disabled={isGenerating}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'AI Generate All'}
                </Button>
                <Button onClick={handleSave} disabled={saveSEOMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic">
              <TabsList>
                <TabsTrigger value="basic">Basic SEO</TabsTrigger>
                <TabsTrigger value="social">Social Media</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              {/* Basic SEO */}
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                    <Label>Meta Title</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {titleLength} chars
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => generateWithAI('title')}
                        disabled={isGenerating}
                      >
                        <Sparkles className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Page title for search engines — no character limit"
                  />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                    <Label>Meta Description</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {descLength} chars
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => generateWithAI('description')}
                        disabled={isGenerating}
                      >
                        <Sparkles className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description for search results — no character limit"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Keywords</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => generateWithAI('keywords')}
                      disabled={isGenerating}
                    >
                      <Sparkles className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="comma, separated, keywords"
                    rows={2}
                  />
                </div>
              </TabsContent>

              {/* Social Media */}
              <TabsContent value="social" className="space-y-4">
                <div className="space-y-2">
                  <Label>OG Title (Facebook/LinkedIn)</Label>
                  <Input
                    value={formData.og_title}
                    onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                    placeholder="Leave blank to use meta title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>OG Description</Label>
                  <Textarea
                    value={formData.og_description}
                    onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                    placeholder="Leave blank to use meta description"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>OG Image URL</Label>
                  <Input
                    value={formData.og_image}
                    onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                    placeholder="/og-image.png or full URL"
                  />
                  {formData.og_image && (
                    <div className="mt-2 border rounded-lg overflow-hidden max-w-sm">
                      <img src={formData.og_image} alt="OG Preview" className="w-full" />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Advanced */}
              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-2">
                  <Label>Canonical URL</Label>
                  <Input
                    value={formData.canonical_url}
                    onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                    placeholder="https://grabyourcar.com/page"
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps prevent duplicate content issues
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Robots Meta Tag</Label>
                  <Select 
                    value={formData.robots} 
                    onValueChange={(v) => setFormData({ ...formData, robots: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="index, follow">Index, Follow (Recommended)</SelectItem>
                      <SelectItem value="noindex, follow">No Index, Follow</SelectItem>
                      <SelectItem value="index, nofollow">Index, No Follow</SelectItem>
                      <SelectItem value="noindex, nofollow">No Index, No Follow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Preview */}
              <TabsContent value="preview" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Google Search Preview</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-white">
                      <div className="text-blue-600 text-lg hover:underline cursor-pointer">
                        {formData.title || 'Page Title'}
                      </div>
                      <div className="text-green-700 text-sm">
                        {formData.canonical_url || 'https://grabyourcar.com'}
                      </div>
                      <div className="text-gray-600 text-sm mt-1">
                        {formData.description || 'No description set. Add a meta description to improve click-through rates.'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Social Media Preview</Label>
                    <div className="mt-2 max-w-md border rounded-lg overflow-hidden bg-white">
                      {formData.og_image && (
                        <img src={formData.og_image} alt="OG" className="w-full h-48 object-cover" />
                      )}
                      <div className="p-4">
                        <div className="text-xs text-muted-foreground uppercase">
                          grabyourcar.com
                        </div>
                        <div className="font-semibold mt-1">
                          {formData.og_title || formData.title || 'Page Title'}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {formData.og_description || formData.description || 'No description'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">HTML Meta Tags</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg">
                      <pre className="text-xs overflow-x-auto">
{`<title>${formData.title}</title>
<meta name="description" content="${formData.description}" />
<meta name="keywords" content="${formData.keywords}" />
<meta name="robots" content="${formData.robots}" />
<link rel="canonical" href="${formData.canonical_url}" />
<meta property="og:title" content="${formData.og_title || formData.title}" />
<meta property="og:description" content="${formData.og_description || formData.description}" />
<meta property="og:image" content="${formData.og_image}" />`}
                      </pre>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => copyToClipboard(`<title>${formData.title}</title>\n<meta name="description" content="${formData.description}" />`)}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copy Tags
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
