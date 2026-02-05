import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Save, Palette, Image as ImageIcon, RefreshCw, Trash2, Eye } from "lucide-react";

interface BrandingSettings {
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  og_image_url: string;
  primary_color: string;
  secondary_color: string;
  brand_name: string;
  tagline: string;
}

export const BrandingSettings = () => {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<BrandingSettings>({
    logo_url: "/logo-grabyourcar.png",
    logo_dark_url: "",
    favicon_url: "/favicon.png",
    og_image_url: "/og-image.png",
    primary_color: "#2563eb",
    secondary_color: "#7c3aed",
    brand_name: "Grabyourcar",
    tagline: "Your Trusted Car Partner",
  });

  // Fetch branding settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['brandingSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('setting_key', 'branding_settings')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    staleTime: 0,
  });

  // Load settings when data changes
  useState(() => {
    if (settings?.setting_value) {
      const value = settings.setting_value as Record<string, string>;
      setFormData({
        logo_url: value.logo_url || "/logo-grabyourcar.png",
        logo_dark_url: value.logo_dark_url || "",
        favicon_url: value.favicon_url || "/favicon.png",
        og_image_url: value.og_image_url || "/og-image.png",
        primary_color: value.primary_color || "#2563eb",
        secondary_color: value.secondary_color || "#7c3aed",
        brand_name: value.brand_name || "Grabyourcar",
        tagline: value.tagline || "Your Trusted Car Partner",
      });
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: BrandingSettings) => {
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('setting_key', 'branding_settings')
        .single();

      const jsonValue = JSON.parse(JSON.stringify(data));

      if (existing) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ 
            setting_value: jsonValue,
            updated_at: new Date().toISOString() 
          })
          .eq('setting_key', 'branding_settings');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .insert([{
            setting_key: 'branding_settings',
            setting_value: jsonValue,
            description: 'Brand logo and color settings',
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandingSettings'] });
      toast.success('Branding settings saved!');
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
    field: keyof BrandingSettings
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
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // For now, store as data URL since we need storage bucket setup
      // In production, this would upload to Supabase Storage
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      setFormData(prev => ({ ...prev, [field]: dataUrl }));
      toast.success('Image uploaded! Click Save to apply changes.');
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
          <div className="grid gap-6 md:grid-cols-2">
            {/* Main Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Main Logo</CardTitle>
                <CardDescription>Used in header and light backgrounds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-white">
                  {formData.logo_url ? (
                    <img 
                      src={formData.logo_url} 
                      alt="Logo" 
                      className="max-h-16 mx-auto object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'logo_url')}
                  />
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Or enter URL</Label>
                  <Input
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="/logo.png or https://..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dark Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dark Mode Logo</CardTitle>
                <CardDescription>Used in footer and dark backgrounds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-gray-900">
                  {formData.logo_dark_url ? (
                    <img 
                      src={formData.logo_dark_url} 
                      alt="Dark Logo" 
                      className="max-h-16 mx-auto object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-16 w-16 mx-auto text-gray-400" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={logoDarkInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'logo_dark_url')}
                  />
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => logoDarkInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Dark Logo
                  </Button>
                </div>
                <Input
                  value={formData.logo_dark_url}
                  onChange={(e) => setFormData({ ...formData, logo_dark_url: e.target.value })}
                  placeholder="Optional - defaults to main logo"
                />
              </CardContent>
            </Card>

            {/* Favicon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Favicon</CardTitle>
                <CardDescription>Browser tab icon (recommended: 32x32 or 64x64)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {formData.favicon_url ? (
                    <img 
                      src={formData.favicon_url} 
                      alt="Favicon" 
                      className="h-16 w-16 mx-auto object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground" />
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'favicon_url')}
                  />
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Favicon
                  </Button>
                </div>
                <Input
                  value={formData.favicon_url}
                  onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
                  placeholder="/favicon.ico"
                />
              </CardContent>
            </Card>

            {/* OG Image */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Social Share Image</CardTitle>
                <CardDescription>Open Graph image for social media (1200x630)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg overflow-hidden aspect-video">
                  {formData.og_image_url ? (
                    <img 
                      src={formData.og_image_url} 
                      alt="OG Image" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    ref={ogImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'og_image_url')}
                  />
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => ogImageInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload OG Image
                  </Button>
                </div>
                <Input
                  value={formData.og_image_url}
                  onChange={(e) => setFormData({ ...formData, og_image_url: e.target.value })}
                  placeholder="/og-image.png"
                />
              </CardContent>
            </Card>
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
              <CardDescription>Your brand name and tagline</CardDescription>
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

              <div className="border-t pt-6">
                <Label className="text-base font-semibold">Header Preview</Label>
                <div className="mt-4 p-4 border rounded-lg bg-white flex items-center gap-3">
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="Logo" className="h-10 object-contain" />
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
