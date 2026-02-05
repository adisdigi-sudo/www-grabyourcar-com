import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Save, Brain, Sparkles, Car, Newspaper, BookOpen, 
  Settings, RefreshCw, Plus, Edit, Trash2, Eye, 
  Zap, Calendar, TrendingUp, Globe, Clock
} from "lucide-react";

interface AutoIntelligenceSettings {
  enabled: boolean;
  autoRefreshNews: boolean;
  newsRefreshInterval: number; // hours
  autoGenerateBlogs: boolean;
  blogGenerationFrequency: string;
  upcomingCarsEnabled: boolean;
  newsEnabled: boolean;
  blogsEnabled: boolean;
  aiModel: string;
  newsApiSource: string;
  maxNewsItems: number;
  maxUpcomingCars: number;
  featuredContentEnabled: boolean;
  defaultBlogAuthor: string;
  seoOptimization: boolean;
  contentLanguage: string;
}

interface FeaturedContent {
  id: string;
  type: "upcoming" | "news" | "blog" | "launch";
  title: string;
  subtitle: string;
  description: string;
  link: string;
  badge?: string;
  priority: number;
  isActive: boolean;
}

interface HubSection {
  id: string;
  label: string;
  description: string;
  href: string;
  badge?: string;
  isEnabled: boolean;
  sortOrder: number;
}

export const AutoIntelligenceSettings = () => {
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<AutoIntelligenceSettings>({
    enabled: true,
    autoRefreshNews: true,
    newsRefreshInterval: 6,
    autoGenerateBlogs: false,
    blogGenerationFrequency: "weekly",
    upcomingCarsEnabled: true,
    newsEnabled: true,
    blogsEnabled: true,
    aiModel: "gemini-3-flash-preview",
    newsApiSource: "gnews",
    maxNewsItems: 20,
    maxUpcomingCars: 10,
    featuredContentEnabled: true,
    defaultBlogAuthor: "Grabyourcar Team",
    seoOptimization: true,
    contentLanguage: "en-IN",
  });

  const [featuredContent, setFeaturedContent] = useState<FeaturedContent[]>([
    {
      id: "1",
      type: "upcoming",
      title: "Mahindra XUV.e8 Electric",
      subtitle: "Expected: Q2 2025 | ₹25-30 Lakh",
      description: "Mahindra's flagship electric SUV with 450km range",
      link: "/upcoming-cars",
      badge: "Electric",
      priority: 1,
      isActive: true,
    },
  ]);

  const [hubSections, setHubSections] = useState<HubSection[]>([
    { id: "upcoming", label: "Upcoming Cars", description: "Latest car launches coming to India", href: "/upcoming-cars", badge: "AI-Powered", isEnabled: true, sortOrder: 1 },
    { id: "news", label: "Auto News", description: "Breaking automotive news & updates", href: "/auto-news", badge: "Live Feed", isEnabled: true, sortOrder: 2 },
    { id: "blogs", label: "Expert Blogs", description: "In-depth reviews, guides & tips", href: "/blog", badge: "Curated", isEnabled: true, sortOrder: 3 },
    { id: "launches", label: "New Launches", description: "Recently launched cars in India", href: "/cars?filter=new", badge: "Hot", isEnabled: true, sortOrder: 4 },
  ]);

  const [editingFeatured, setEditingFeatured] = useState<FeaturedContent | null>(null);
  const [featuredDialogOpen, setFeaturedDialogOpen] = useState(false);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["autoIntelligenceSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .in("setting_key", ["auto_intelligence_config", "featured_content", "hub_sections"]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      savedSettings.forEach((setting) => {
        if (setting.setting_key === "auto_intelligence_config") {
          setSettings(setting.setting_value as unknown as AutoIntelligenceSettings);
        } else if (setting.setting_key === "featured_content") {
          setFeaturedContent(setting.setting_value as unknown as FeaturedContent[]);
        } else if (setting.setting_key === "hub_sections") {
          setHubSections(setting.setting_value as unknown as HubSection[]);
        }
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from("admin_settings")
        .upsert([{ 
          setting_key: key, 
          setting_value: JSON.parse(JSON.stringify(value)),
          updated_at: new Date().toISOString()
        }], { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoIntelligenceSettings"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save"),
  });

  const refreshNewsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("auto-news", {
        body: { category: "all" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["autoNews"] });
      toast.success(`Successfully refreshed ${data?.articles?.length || 0} news articles`);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to refresh news";
      toast.error(errorMessage);
    },
  });

  const handleSaveAll = () => {
    saveMutation.mutate({ key: "auto_intelligence_config", value: settings });
    saveMutation.mutate({ key: "featured_content", value: featuredContent });
    saveMutation.mutate({ key: "hub_sections", value: hubSections });
  };

  const handleAddFeatured = () => {
    setEditingFeatured({
      id: crypto.randomUUID(),
      type: "upcoming",
      title: "",
      subtitle: "",
      description: "",
      link: "",
      priority: featuredContent.length + 1,
      isActive: true,
    });
    setFeaturedDialogOpen(true);
  };

  const handleSaveFeatured = () => {
    if (!editingFeatured) return;
    const exists = featuredContent.find(f => f.id === editingFeatured.id);
    if (exists) {
      setFeaturedContent(featuredContent.map(f => f.id === editingFeatured.id ? editingFeatured : f));
    } else {
      setFeaturedContent([...featuredContent, editingFeatured]);
    }
    setFeaturedDialogOpen(false);
    setEditingFeatured(null);
  };

  const handleDeleteFeatured = (id: string) => {
    setFeaturedContent(featuredContent.filter(f => f.id !== id));
  };

  const toggleSectionEnabled = (id: string) => {
    setHubSections(hubSections.map(s => s.id === id ? { ...s, isEnabled: !s.isEnabled } : s));
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Auto Intelligence
          </h2>
          <p className="text-muted-foreground">Configure AI-powered automotive content hub</p>
        </div>
        <Button onClick={handleSaveAll} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="general"><Settings className="h-4 w-4 mr-2" />General</TabsTrigger>
          <TabsTrigger value="sections"><Globe className="h-4 w-4 mr-2" />Sections</TabsTrigger>
          <TabsTrigger value="featured"><Sparkles className="h-4 w-4 mr-2" />Featured</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="h-4 w-4 mr-2" />AI Config</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auto Intelligence Settings</CardTitle>
              <CardDescription>Configure the main settings for the intelligence hub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="font-medium">Enable Auto Intelligence Hub</Label>
                  <p className="text-sm text-muted-foreground">Show the /auto-intelligence page</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-500" />
                    <Label>Upcoming Cars</Label>
                  </div>
                  <Switch
                    checked={settings.upcomingCarsEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, upcomingCarsEnabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-purple-500" />
                    <Label>Auto News</Label>
                  </div>
                  <Switch
                    checked={settings.newsEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, newsEnabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-500" />
                    <Label>Expert Blogs</Label>
                  </div>
                  <Switch
                    checked={settings.blogsEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, blogsEnabled: v })}
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-4 block">Content Limits</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Max News Items</Label>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={settings.maxNewsItems}
                      onChange={(e) => setSettings({ ...settings, maxNewsItems: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Upcoming Cars</Label>
                    <Input
                      type="number"
                      min={5}
                      max={30}
                      value={settings.maxUpcomingCars}
                      onChange={(e) => setSettings({ ...settings, maxUpcomingCars: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-4 block">Auto Refresh</Label>
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Switch
                    checked={settings.autoRefreshNews}
                    onCheckedChange={(v) => setSettings({ ...settings, autoRefreshNews: v })}
                  />
                  <div className="flex-1">
                    <Label>Auto-refresh news feed</Label>
                    <p className="text-sm text-muted-foreground">Automatically fetch new articles</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Every</Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      className="w-20"
                      value={settings.newsRefreshInterval}
                      onChange={(e) => setSettings({ ...settings, newsRefreshInterval: Number(e.target.value) })}
                      disabled={!settings.autoRefreshNews}
                    />
                    <span className="text-sm text-muted-foreground">hours</span>
                  </div>
                </div>
                <Button 
                  onClick={() => refreshNewsMutation.mutate()} 
                  disabled={refreshNewsMutation.isPending}
                  variant="outline"
                  className="mt-4 w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshNewsMutation.isPending ? 'animate-spin' : ''}`} />
                  {refreshNewsMutation.isPending ? 'Refreshing News...' : 'Refresh News Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hub Sections */}
        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hub Sections</CardTitle>
              <CardDescription>Configure which sections appear on the Auto Intelligence page</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hubSections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">{section.label}</TableCell>
                      <TableCell className="text-muted-foreground">{section.description}</TableCell>
                      <TableCell>
                        {section.badge && <Badge variant="secondary">{section.badge}</Badge>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{section.href}</TableCell>
                      <TableCell>
                        <Switch
                          checked={section.isEnabled}
                          onCheckedChange={() => toggleSectionEnabled(section.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Featured Content */}
        <TabsContent value="featured" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Featured Content</CardTitle>
                  <CardDescription>Manage highlighted content on the hub page</CardDescription>
                </div>
                <Button onClick={handleAddFeatured}>
                  <Plus className="h-4 w-4 mr-2" />Add Featured
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featuredContent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{item.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingFeatured(item);
                            setFeaturedDialogOpen(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteFeatured(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {featuredContent.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No featured content. Add your first highlight.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Configuration */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Configure AI model and content generation settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select
                    value={settings.aiModel}
                    onValueChange={(v) => setSettings({ ...settings, aiModel: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash (Recommended)</SelectItem>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>News API Source</Label>
                  <Select
                    value={settings.newsApiSource}
                    onValueChange={(v) => setSettings({ ...settings, newsApiSource: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gnews">GNews API (Primary)</SelectItem>
                      <SelectItem value="perplexity">Perplexity Search</SelectItem>
                      <SelectItem value="lovable-ai">Lovable AI Generation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-4 block">Blog Generation</Label>
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Switch
                    checked={settings.autoGenerateBlogs}
                    onCheckedChange={(v) => setSettings({ ...settings, autoGenerateBlogs: v })}
                  />
                  <div className="flex-1">
                    <Label>Auto-generate blog posts</Label>
                    <p className="text-sm text-muted-foreground">Use AI to create automotive content</p>
                  </div>
                  <Select
                    value={settings.blogGenerationFrequency}
                    onValueChange={(v) => setSettings({ ...settings, blogGenerationFrequency: v })}
                    disabled={!settings.autoGenerateBlogs}
                  >
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default Blog Author</Label>
                  <Input
                    value={settings.defaultBlogAuthor}
                    onChange={(e) => setSettings({ ...settings, defaultBlogAuthor: e.target.value })}
                    placeholder="Grabyourcar Team"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content Language</Label>
                  <Select
                    value={settings.contentLanguage}
                    onValueChange={(v) => setSettings({ ...settings, contentLanguage: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-IN">English (India)</SelectItem>
                      <SelectItem value="hi-IN">Hindi</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <Switch
                  checked={settings.seoOptimization}
                  onCheckedChange={(v) => setSettings({ ...settings, seoOptimization: v })}
                />
                <div>
                  <Label>SEO Optimization</Label>
                  <p className="text-sm text-muted-foreground">Auto-generate meta tags and structured data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Featured Content Dialog */}
      <Dialog open={featuredDialogOpen} onOpenChange={setFeaturedDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFeatured?.title ? "Edit Featured" : "Add Featured"}</DialogTitle>
            <DialogDescription>Configure featured content for the hub</DialogDescription>
          </DialogHeader>
          {editingFeatured && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingFeatured.title}
                  onChange={(e) => setEditingFeatured({ ...editingFeatured, title: e.target.value })}
                  placeholder="Mahindra XUV.e8 Electric"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={editingFeatured.subtitle}
                  onChange={(e) => setEditingFeatured({ ...editingFeatured, subtitle: e.target.value })}
                  placeholder="Expected: Q2 2025 | ₹25-30 Lakh"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingFeatured.description}
                  onChange={(e) => setEditingFeatured({ ...editingFeatured, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingFeatured.type}
                    onValueChange={(v: FeaturedContent["type"]) => setEditingFeatured({ ...editingFeatured, type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming Car</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="launch">New Launch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Badge (optional)</Label>
                  <Input
                    value={editingFeatured.badge || ""}
                    onChange={(e) => setEditingFeatured({ ...editingFeatured, badge: e.target.value })}
                    placeholder="Electric"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Link</Label>
                <Input
                  value={editingFeatured.link}
                  onChange={(e) => setEditingFeatured({ ...editingFeatured, link: e.target.value })}
                  placeholder="/upcoming-cars"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingFeatured.isActive}
                  onCheckedChange={(v) => setEditingFeatured({ ...editingFeatured, isActive: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeaturedDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFeatured}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
