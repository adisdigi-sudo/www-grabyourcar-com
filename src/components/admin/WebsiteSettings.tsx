import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, RefreshCw, Globe, Palette, Settings, MessageSquare, Shield } from "lucide-react";

interface AdminSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, unknown>;
  description: string | null;
}

export const WebsiteSettings = () => {
  const queryClient = useQueryClient();
  
  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*');
      
      if (error) throw error;
      return data as AdminSetting[];
    },
  });

  // State for various settings
  const [seoSettings, setSeoSettings] = useState({
    site_title: "Grabyourcar - New Car Deals in India",
    meta_description: "Find the best new car deals, prices, and offers. Compare cars, get insurance, and finance options.",
    og_image: "/og-image.png",
    google_analytics: "",
    facebook_pixel: "",
  });

  const [contactSettings, setContactSettings] = useState({
    phone: "+91 98559 24442",
    whatsapp: "919855924442",
    email: "hello@grabyourcar.com",
    address: "MS 228, 2nd Floor, DT Mega Mall, Sector 28, Gurugram, Haryana – 122001",
  });

  const [socialSettings, setSocialSettings] = useState({
    facebook: "",
    instagram: "",
    twitter: "",
    youtube: "",
    linkedin: "",
  });

  // Update mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: Record<string, string>; description?: string }) => {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('setting_key', key)
        .single();

      const jsonValue = JSON.parse(JSON.stringify(value));

      if (existing) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ setting_value: jsonValue, updated_at: new Date().toISOString() })
          .eq('setting_key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .insert([{ setting_key: key, setting_value: jsonValue, description }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error(error);
    },
  });

  const handleSaveSEO = () => {
    updateSettingMutation.mutate({
      key: 'seo_settings',
      value: seoSettings,
      description: 'SEO and meta tag settings',
    });
  };

  const handleSaveContact = () => {
    updateSettingMutation.mutate({
      key: 'contact_settings',
      value: contactSettings,
      description: 'Contact information',
    });
  };

  const handleSaveSocial = () => {
    updateSettingMutation.mutate({
      key: 'social_settings',
      value: socialSettings,
      description: 'Social media links',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Website Settings</h2>
        <p className="text-muted-foreground">
          Configure global website settings and SEO
        </p>
      </div>

      <Tabs defaultValue="seo" className="space-y-6">
        <TabsList>
          <TabsTrigger value="seo" className="gap-2">
            <Globe className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Settings className="h-4 w-4" />
            Social
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* SEO Settings */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>
                Configure meta tags and search engine optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Site Title</Label>
                <Input
                  value={seoSettings.site_title}
                  onChange={(e) => setSeoSettings({ ...seoSettings, site_title: e.target.value })}
                  placeholder="Your Site Title"
                />
                <p className="text-xs text-muted-foreground">This appears in browser tabs and search results</p>
              </div>

              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={seoSettings.meta_description}
                  onChange={(e) => setSeoSettings({ ...seoSettings, meta_description: e.target.value })}
                  placeholder="Describe your website..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Keep it under 160 characters for best results</p>
              </div>

              <div className="space-y-2">
                <Label>OG Image URL</Label>
                <Input
                  value={seoSettings.og_image}
                  onChange={(e) => setSeoSettings({ ...seoSettings, og_image: e.target.value })}
                  placeholder="/og-image.png"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Google Analytics ID</Label>
                  <Input
                    value={seoSettings.google_analytics}
                    onChange={(e) => setSeoSettings({ ...seoSettings, google_analytics: e.target.value })}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Facebook Pixel ID</Label>
                  <Input
                    value={seoSettings.facebook_pixel}
                    onChange={(e) => setSeoSettings({ ...seoSettings, facebook_pixel: e.target.value })}
                    placeholder="123456789"
                  />
                </div>
              </div>

              <Button onClick={handleSaveSEO} disabled={updateSettingMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save SEO Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Settings */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Update contact details displayed across the website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={contactSettings.phone}
                    onChange={(e) => setContactSettings({ ...contactSettings, phone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number (without +)</Label>
                  <Input
                    value={contactSettings.whatsapp}
                    onChange={(e) => setContactSettings({ ...contactSettings, whatsapp: e.target.value })}
                    placeholder="919XXXXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={contactSettings.email}
                  onChange={(e) => setContactSettings({ ...contactSettings, email: e.target.value })}
                  placeholder="info@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={contactSettings.address}
                  onChange={(e) => setContactSettings({ ...contactSettings, address: e.target.value })}
                  rows={2}
                />
              </div>

              <Button onClick={handleSaveContact} disabled={updateSettingMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Contact Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Settings */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Connect your social media profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Facebook</Label>
                  <Input
                    value={socialSettings.facebook}
                    onChange={(e) => setSocialSettings({ ...socialSettings, facebook: e.target.value })}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input
                    value={socialSettings.instagram}
                    onChange={(e) => setSocialSettings({ ...socialSettings, instagram: e.target.value })}
                    placeholder="https://instagram.com/yourpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter</Label>
                  <Input
                    value={socialSettings.twitter}
                    onChange={(e) => setSocialSettings({ ...socialSettings, twitter: e.target.value })}
                    placeholder="https://twitter.com/yourpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label>YouTube</Label>
                  <Input
                    value={socialSettings.youtube}
                    onChange={(e) => setSocialSettings({ ...socialSettings, youtube: e.target.value })}
                    placeholder="https://youtube.com/c/yourchannel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input
                    value={socialSettings.linkedin}
                    onChange={(e) => setSocialSettings({ ...socialSettings, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/company/yourcompany"
                  />
                </div>
              </div>

              <Button onClick={handleSaveSocial} disabled={updateSettingMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Social Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Require Email Verification</p>
                  <p className="text-sm text-muted-foreground">Users must verify email before accessing features</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security for admin users</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">Show maintenance page to visitors</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
