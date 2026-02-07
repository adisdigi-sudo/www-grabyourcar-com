import { useState } from "react";
import { useSiteSettings } from "@/hooks/useCMSData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Building2, Phone, Globe, Palette, Settings, Mail } from "lucide-react";

const CATEGORIES = [
  { id: 'branding', label: 'Branding', icon: Palette, description: 'Logo, colors, and site identity' },
  { id: 'contact', label: 'Contact Info', icon: Phone, description: 'Phone, email, address' },
  { id: 'social', label: 'Social Media', icon: Globe, description: 'Social media links' },
  { id: 'business', label: 'Business', icon: Building2, description: 'GST, PAN, legal info' },
  { id: 'seo', label: 'SEO', icon: Settings, description: 'Meta tags, analytics' },
  { id: 'header', label: 'Header', icon: Settings, description: 'Announcement bar, navigation' },
  { id: 'footer', label: 'Footer', icon: Settings, description: 'Footer content, copyright' },
];

export function SiteSettingsManager() {
  const [activeCategory, setActiveCategory] = useState('branding');
  const { data: settings, isLoading, updateSetting, upsertSetting } = useSiteSettings(activeCategory);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const parseValue = (setting: any): any => {
    try {
      return JSON.parse(setting.setting_value);
    } catch {
      return setting.setting_value;
    }
  };

  const handleChange = (key: string, value: any) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await updateSetting.mutateAsync({ key, value: editedValues[key] ?? parseValue(settings?.find(s => s.setting_key === key)) });
      setEditedValues(prev => {
        const newVal = { ...prev };
        delete newVal[key];
        return newVal;
      });
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const getValue = (setting: any) => {
    if (editedValues[setting.setting_key] !== undefined) {
      return editedValues[setting.setting_key];
    }
    return parseValue(setting);
  };

  const renderField = (setting: any) => {
    const value = getValue(setting);
    const hasChanges = editedValues[setting.setting_key] !== undefined;
    const fieldType = setting.field_type || 'text';

    return (
      <div key={setting.id} className="flex flex-col gap-2 p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-between">
          <Label className="font-medium">{setting.label || setting.setting_key}</Label>
          {hasChanges && (
            <Button 
              size="sm" 
              onClick={() => handleSave(setting.setting_key)}
              disabled={saving[setting.setting_key]}
            >
              {saving[setting.setting_key] ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          )}
        </div>
        
        {fieldType === 'textarea' ? (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(setting.setting_key, e.target.value)}
            rows={3}
            className="resize-none"
          />
        ) : fieldType === 'boolean' ? (
          <Switch
            checked={value === true || value === 'true'}
            onCheckedChange={(checked) => handleChange(setting.setting_key, checked)}
          />
        ) : fieldType === 'color' ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => handleChange(setting.setting_key, e.target.value)}
              className="w-12 h-10 border rounded cursor-pointer"
            />
            <Input
              value={value || ''}
              onChange={(e) => handleChange(setting.setting_key, e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        ) : fieldType === 'image' ? (
          <div className="space-y-2">
            <Input
              value={value || ''}
              onChange={(e) => handleChange(setting.setting_key, e.target.value)}
              placeholder="Image URL"
            />
            {value && (
              <img 
                src={value} 
                alt={setting.label} 
                className="h-16 object-contain rounded border bg-muted p-1"
              />
            )}
          </div>
        ) : (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(setting.setting_key, e.target.value)}
            placeholder={`Enter ${setting.label?.toLowerCase() || 'value'}`}
          />
        )}
        
        {setting.description && (
          <p className="text-xs text-muted-foreground">{setting.description}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Site Settings</h2>
          <p className="text-muted-foreground">Manage all website configuration in one place</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          Live Sync Enabled
        </Badge>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <cat.icon className="h-5 w-5" />
                  {cat.label}
                </CardTitle>
                <CardDescription>{cat.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {settings?.filter(s => s.category === cat.id).map(renderField)}
                    {settings?.filter(s => s.category === cat.id).length === 0 && (
                      <p className="col-span-2 text-center text-muted-foreground py-8">
                        No settings configured for this category yet.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default SiteSettingsManager;
