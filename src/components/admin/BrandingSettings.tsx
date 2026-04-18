import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Save, Palette, Image as ImageIcon, RefreshCw, Trash2, Eye, Move } from "lucide-react";
import { AdminImageUpload } from "./AdminImageUpload";
import { LiveWebsitePreview } from "./branding/LiveWebsitePreview";
import {
  BRANDING_QUERY_KEY,
  broadcastBrandingUpdate,
  normalizeBrandingSettings,
  useBrandingSettingsQuery,
  type BrandingSettings as BrandingSettingsData,
} from "@/hooks/useBrandingSettings";

export const BrandingSettings = () => {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const animatedLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const [formData, setFormData] = useState<BrandingSettingsData>(normalizeBrandingSettings());

  const { data: settings, isLoading } = useBrandingSettingsQuery();

  // Load settings when data changes
  useEffect(() => {
    if (settings) {
      setFormData(normalizeBrandingSettings(settings));
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: BrandingSettingsData) => {
      const jsonValue = JSON.parse(JSON.stringify(data));
      const { error } = await supabase
        .from('admin_settings')
        .upsert([{
          setting_key: 'branding_settings',
          setting_value: jsonValue,
          description: 'Brand logo and color settings',
          updated_at: new Date().toISOString(),
        }], { onConflict: 'setting_key' });
      if (error) throw error;
      return data;
    },
    onMutate: async (nextData) => {
      await queryClient.cancelQueries({ queryKey: BRANDING_QUERY_KEY });
      queryClient.setQueryData(BRANDING_QUERY_KEY, nextData);
      // Push optimistically to every other tab + the live preview iframe
      broadcastBrandingUpdate(nextData);
      return { nextData };
    },
    onSuccess: async (savedData) => {
      queryClient.setQueryData(BRANDING_QUERY_KEY, savedData);
      broadcastBrandingUpdate(savedData);
      await queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ['profileSettings'] });
      await queryClient.refetchQueries({ queryKey: BRANDING_QUERY_KEY });
      // Force the right-side iframe preview to reload so admins see the change live
      setPreviewRefreshKey((k) => k + 1);
      toast.success('Branding saved — changes are now live across the website');
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error(error);
    },
  });

  // Upload image to Supabase storage
  const uploadImage = async (file: File, bucket: string, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { 
        cacheControl: '3600',
        upsert: true 
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: keyof BrandingSettingsData
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Supabase storage so the URL persists everywhere (no fat data URLs)
      const ext = file.name.split('.').pop() || 'png';
      const path = `branding/${field}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('branding-assets')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('branding-assets').getPublicUrl(path);
      setPreviewUrl(urlData.publicUrl);
      setFormData((prev) => ({ ...prev, [field]: urlData.publicUrl }));
      toast.success('Image uploaded — click Save to apply');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" />
            Logo & Branding
          </h2>
          <p className="text-muted-foreground">
            Customize your brand identity across the website
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending || isUploading}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="logos">
        <TabsList>
          <TabsTrigger value="logos">
            <ImageIcon className="h-4 w-4 mr-2" />
            Logos
          </TabsTrigger>
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="identity">
            Brand Identity
          </TabsTrigger>
        </TabsList>

        {/* Logos Tab */}
        <TabsContent value="logos" className="space-y-6">
          {/* Side-by-side: uploaders on the left, live website preview on the right */}
          <div className="grid gap-6 xl:grid-cols-[1fr_minmax(420px,520px)]">
            <div className="space-y-6 min-w-0">
              {/* Main Logo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Main Logo</CardTitle>
                  <CardDescription>
                    Used in header and light backgrounds. The live website preview on the right
                    auto-suggests an optimal size based on your image's aspect ratio.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminImageUpload
                    value={formData.logo_url}
                    onChange={(url) => setFormData((prev) => ({ ...prev, logo_url: url }))}
                    label="Main Logo"
                    folder="branding/logo"
                    bucket="branding-assets"
                    recommendedSize="320×80"
                    previewMode="logo"
                    placeholder="/logo.png or https://..."
                  />
                </CardContent>
              </Card>

              {/* Dark Logo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dark Mode Logo</CardTitle>
                  <CardDescription>Used in footer and dark backgrounds. Optional — defaults to main logo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminImageUpload
                    value={formData.logo_dark_url}
                    onChange={(url) => setFormData((prev) => ({ ...prev, logo_dark_url: url }))}
                    label="Dark Mode Logo"
                    folder="branding/logo-dark"
                    bucket="branding-assets"
                    recommendedSize="320×80"
                    previewMode="logo"
                    placeholder="Optional - defaults to main logo"
                  />
                </CardContent>
              </Card>

            {/* Animated Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Animated Logo
                  <Badge variant="secondary" className="text-xs">GIF/Video</Badge>
                </CardTitle>
                <CardDescription>Animated logo for special effects (GIF, WebP, or video)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <Switch
                    checked={formData.use_animated_logo}
                    onCheckedChange={(v) => setFormData({ ...formData, use_animated_logo: v })}
                  />
                  <div>
                    <Label className="font-medium">Use Animated Logo</Label>
                    <p className="text-xs text-muted-foreground">Replace static logo with animated version</p>
                  </div>
                </div>
                <AdminImageUpload
                  value={formData.animated_logo_url}
                  onChange={(url) => setFormData((prev) => ({ ...prev, animated_logo_url: url }))}
                  label="Animated Logo"
                  folder="branding/animated-logo"
                  bucket="branding-assets"
                  recommendedSize="320×80"
                  previewMode="logo"
                  placeholder="https://... or /animated-logo.gif"
                />
              </CardContent>
            </Card>

            {/* Favicon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Favicon</CardTitle>
                <CardDescription>Browser tab icon (recommended: 32×32 or 64×64)</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminImageUpload
                  value={formData.favicon_url}
                  onChange={(url) => setFormData((prev) => ({ ...prev, favicon_url: url }))}
                  label="Favicon"
                  folder="branding/favicon"
                  bucket="branding-assets"
                  recommendedSize="64×64"
                  previewMode="square"
                  placeholder="/favicon.ico"
                />
              </CardContent>
            </Card>

            {/* OG Image */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Social Share Image</CardTitle>
                <CardDescription>Open Graph image for social media (1200×630)</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminImageUpload
                  value={formData.og_image_url}
                  onChange={(url) => setFormData((prev) => ({ ...prev, og_image_url: url }))}
                  label="Social Share Image"
                  folder="branding/og"
                  bucket="branding-assets"
                  recommendedSize="1200×630"
                  previewMode="hero-desktop"
                  placeholder="/og-image.png"
                />
              </CardContent>
            </Card>
            </div>

            {/* Right column: Live website preview (sticky) */}
            <div className="xl:sticky xl:top-4 xl:self-start space-y-4">
              <LogoFitPreview
                logoUrl={formData.logo_url}
                logoDarkUrl={formData.logo_dark_url}
                brandName={formData.brand_name}
                tagline={formData.tagline}
                heightHeader={formData.logo_height_header}
                heightFooter={formData.logo_height_footer}
                heightMobile={formData.logo_height_mobile}
                widthHeader={formData.logo_width_header}
                widthFooter={formData.logo_width_footer}
                widthMobile={formData.logo_width_mobile}
                positionHorizontal={formData.logo_position_horizontal}
                onApplySuggested={(s) =>
                  setFormData((prev) => ({
                    ...prev,
                    logo_height_header: s.heightHeader,
                    logo_height_footer: s.heightFooter,
                    logo_height_mobile: s.heightMobile,
                  }))
                }
              />
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || isUploading}
                className="w-full"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save & Apply to Website"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Changes appear instantly across the website after saving (header, footer, mobile menu).
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>Define your primary and secondary brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <Label>Primary Color</Label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="h-10 w-20 rounded cursor-pointer border"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      placeholder="#2563eb"
                      className="flex-1"
                    />
                  </div>
                  <div 
                    className="h-20 rounded-lg flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    Primary Button
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="h-10 w-20 rounded cursor-pointer border"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      placeholder="#7c3aed"
                      className="flex-1"
                    />
                  </div>
                  <div 
                    className="h-20 rounded-lg flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: formData.secondary_color }}
                  >
                    Secondary Element
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-semibold">Preview</Label>
                <div className="mt-4 p-6 border rounded-lg space-y-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="px-6 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      Primary CTA
                    </div>
                    <div 
                      className="px-6 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: formData.secondary_color }}
                    >
                      Secondary CTA
                    </div>
                    <div 
                      className="px-6 py-2 rounded-lg font-medium border-2"
                      style={{ 
                        borderColor: formData.primary_color,
                        color: formData.primary_color
                      }}
                    >
                      Outline Button
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Identity Tab */}
        <TabsContent value="identity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Your brand name, tagline, and logo sizing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Brand Name</Label>
                  <Input
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    placeholder="Grabyourcar"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="Your Trusted Car Partner"
                  />
                </div>
              </div>

              {/* Logo Size Settings */}
              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-4 block">Logo Dimensions</Label>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label className="font-medium">Header (Desktop)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Height (px)</Label>
                        <Input
                          type="number"
                          min={32}
                          max={120}
                          value={formData.logo_height_header}
                          onChange={(e) => setFormData({ ...formData, logo_height_header: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Width (px, 0=auto)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={400}
                          value={formData.logo_width_header}
                          onChange={(e) => setFormData({ ...formData, logo_width_header: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label className="font-medium">Footer</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Height (px)</Label>
                        <Input
                          type="number"
                          min={24}
                          max={80}
                          value={formData.logo_height_footer}
                          onChange={(e) => setFormData({ ...formData, logo_height_footer: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Width (px, 0=auto)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={300}
                          value={formData.logo_width_footer}
                          onChange={(e) => setFormData({ ...formData, logo_width_footer: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label className="font-medium">Mobile</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Height (px)</Label>
                        <Input
                          type="number"
                          min={24}
                          max={60}
                          value={formData.logo_height_mobile}
                          onChange={(e) => setFormData({ ...formData, logo_height_mobile: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Width (px, 0=auto)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={200}
                          value={formData.logo_width_mobile}
                          onChange={(e) => setFormData({ ...formData, logo_width_mobile: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo Position */}
              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-4 block flex items-center gap-2">
                  <Move className="h-4 w-4" /> Logo Position
                </Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Horizontal Position</Label>
                    <Select
                      value={formData.logo_position_horizontal}
                      onValueChange={(v: "left" | "center" | "right") => setFormData({ ...formData, logo_position_horizontal: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Vertical Position</Label>
                    <Select
                      value={formData.logo_position_vertical}
                      onValueChange={(v: "top" | "center" | "bottom") => setFormData({ ...formData, logo_position_vertical: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Controls logo placement in the header</p>
              </div>

              {/* Banner Dimensions */}
              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-4 block">Banner Dimensions</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Desktop Banner Height (px)</Label>
                    <Input
                      type="number"
                      min={200}
                      max={800}
                      value={formData.banner_height_desktop}
                      onChange={(e) => setFormData({ ...formData, banner_height_desktop: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Recommended: 350-500px</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Mobile Banner Height (px)</Label>
                    <Input
                      type="number"
                      min={150}
                      max={500}
                      value={formData.banner_height_mobile}
                      onChange={(e) => setFormData({ ...formData, banner_height_mobile: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Recommended: 250-350px</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-semibold">Preview</Label>
                <div className="mt-4 p-4 border rounded-lg bg-background flex items-center gap-3">
                  {formData.logo_url && (
                    <img 
                      src={formData.logo_url} 
                      alt="Logo" 
                      style={{ height: formData.logo_height_header }}
                      className="object-contain" 
                    />
                  )}
                  <div>
                    <div className="font-bold text-lg">{formData.brand_name}</div>
                    <div className="text-sm text-muted-foreground">{formData.tagline}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
