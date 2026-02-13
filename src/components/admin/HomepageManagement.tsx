import { useState } from "react";
import { AdminImageUpload } from "./AdminImageUpload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Image,
  GripVertical,
  Eye,
  Link,
  FileText,
  Megaphone,
  Star,
  Quote,
  ChevronRight,
  Smartphone,
  Monitor,
  ImageIcon,
} from "lucide-react";

interface HomepageContent {
  id: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const sectionTypes = [
  { value: 'hero_banner', label: 'Hero Banner', icon: Image, recommendedSize: '1920x600' },
  { value: 'promo_banner', label: 'Promo Banner', icon: Megaphone, recommendedSize: '1200x400' },
  { value: 'featured_cars', label: 'Featured Cars', icon: Star, recommendedSize: '800x600' },
  { value: 'testimonial', label: 'Testimonial', icon: FileText, recommendedSize: '200x200' },
  { value: 'cta', label: 'Call to Action', icon: Link, recommendedSize: '1200x300' },
];

const imageSizePresets = [
  { label: 'Hero Banner (1920x600)', width: 1920, height: 600 },
  { label: 'Promo Banner (1200x400)', width: 1200, height: 400 },
  { label: 'Card Image (800x600)', width: 800, height: 600 },
  { label: 'Thumbnail (400x300)', width: 400, height: 300 },
  { label: 'Avatar (200x200)', width: 200, height: 200 },
  { label: 'Custom', width: 0, height: 0 },
];

// Live Preview Components
const HeroBannerPreview = ({ data }: { data: typeof initialFormData }) => (
  <div className="relative rounded-lg overflow-hidden bg-gradient-to-r from-primary/10 to-primary/5 border">
    <div className="aspect-[16/5] relative">
      {data.image_url ? (
        <img src={data.image_url} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
        <div className="p-6 text-white max-w-md">
          <h3 className="text-xl font-bold mb-2">{data.title || 'Banner Title'}</h3>
          <p className="text-sm opacity-90 mb-3">{data.subtitle || 'Subtitle text here'}</p>
          {data.link_url && (
            <Button size="sm" className="bg-white text-black hover:bg-white/90">
              {data.link_text || 'Learn More'} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
);

const PromoBannerPreview = ({ data }: { data: typeof initialFormData }) => (
  <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-4 text-primary-foreground">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {data.image_url && (
          <img src={data.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
        )}
        <div>
          <h3 className="font-bold text-lg">{data.title || 'Promo Title'}</h3>
          <p className="text-sm opacity-90">{data.subtitle || 'Promo subtitle'}</p>
        </div>
      </div>
      {data.link_url && (
        <Button variant="secondary" size="sm">
          {data.link_text || 'View Offer'} <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  </div>
);

const FeaturedCarPreview = ({ data }: { data: typeof initialFormData }) => (
  <Card className="overflow-hidden max-w-xs">
    <div className="aspect-[4/3] relative bg-muted">
      {data.image_url ? (
        <img src={data.image_url} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
      <Badge className="absolute top-2 left-2 bg-primary">
        <Star className="h-3 w-3 mr-1" /> Featured
      </Badge>
    </div>
    <CardContent className="p-4">
      <h3 className="font-bold">{data.title || 'Car Name'}</h3>
      <p className="text-primary font-semibold text-sm">{data.subtitle || '₹X.XX Lakh'}</p>
      <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{data.description || 'Description...'}</p>
    </CardContent>
  </Card>
);

const TestimonialPreview = ({ data }: { data: typeof initialFormData }) => (
  <Card className="max-w-sm">
    <CardContent className="p-5">
      <Quote className="h-6 w-6 text-primary/30 mb-3" />
      <p className="text-muted-foreground text-sm italic mb-4">
        "{data.description || 'Customer testimonial text goes here...'}"
      </p>
      <div className="flex items-center gap-3">
        {data.image_url ? (
          <img src={data.image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}
        <div>
          <p className="font-semibold text-sm">{data.title || 'Customer Name'}</p>
          <p className="text-xs text-muted-foreground">{data.subtitle || 'Location'}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const CTAPreview = ({ data }: { data: typeof initialFormData }) => (
  <div className="bg-card border rounded-xl p-6 text-center">
    <h2 className="text-xl font-bold mb-1">{data.title || 'CTA Heading'}</h2>
    <p className="text-muted-foreground text-sm mb-4">{data.subtitle || 'Subheading text'}</p>
    {data.description && (
      <p className="text-muted-foreground text-xs mb-4 max-w-md mx-auto">{data.description}</p>
    )}
    {data.link_url && (
      <Button>
        {data.link_text || 'Get Started'} <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    )}
  </div>
);

const initialFormData = {
  section_type: 'hero_banner',
  title: '',
  subtitle: '',
  description: '',
  image_url: '',
  link_url: '',
  link_text: '',
  is_active: true,
  sort_order: 0,
  image_width: 1920,
  image_height: 600,
};

export const HomepageManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<HomepageContent | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedSizePreset, setSelectedSizePreset] = useState('Hero Banner (1920x600)');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Fetch homepage content
  const { data: contents, isLoading } = useQuery({
    queryKey: ['homepageContent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_content')
        .select('*')
        .order('section_type')
        .order('sort_order');
      
      if (error) throw error;
      return data as HomepageContent[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Omit<typeof formData, 'image_width' | 'image_height'>) => {
      const saveData = {
        section_type: data.section_type,
        title: data.title || null,
        subtitle: data.subtitle || null,
        description: data.description || null,
        image_url: data.image_url || null,
        link_url: data.link_url || null,
        link_text: data.link_text || null,
        is_active: data.is_active,
        sort_order: data.sort_order,
      };
      
      if (editingContent) {
        const { error } = await supabase
          .from('homepage_content')
          .update(saveData)
          .eq('id', editingContent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('homepage_content')
          .insert(saveData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepageContent'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success(editingContent ? 'Content updated - changes are live!' : 'Content created - now visible on homepage!');
    },
    onError: (error) => {
      toast.error('Failed to save content');
      console.error(error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('homepage_content')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepageContent'] });
      toast.success('Content deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete content');
      console.error(error);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('homepage_content')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepageContent'] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status');
      console.error(error);
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingContent(null);
    setSelectedSizePreset('Hero Banner (1920x600)');
  };

  const handleEdit = (content: HomepageContent) => {
    setEditingContent(content);
    const sectionType = sectionTypes.find(s => s.value === content.section_type);
    setFormData({
      section_type: content.section_type,
      title: content.title || '',
      subtitle: content.subtitle || '',
      description: content.description || '',
      image_url: content.image_url || '',
      link_url: content.link_url || '',
      link_text: content.link_text || '',
      is_active: content.is_active,
      sort_order: content.sort_order,
      image_width: 1920,
      image_height: 600,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleSectionTypeChange = (value: string) => {
    const section = sectionTypes.find(s => s.value === value);
    const preset = imageSizePresets.find(p => p.label.includes(section?.recommendedSize?.split('x')[0] || ''));
    setFormData(prev => ({ 
      ...prev, 
      section_type: value,
      image_width: preset?.width || 1920,
      image_height: preset?.height || 600,
    }));
  };

  const handleSizePresetChange = (label: string) => {
    setSelectedSizePreset(label);
    const preset = imageSizePresets.find(p => p.label === label);
    if (preset && preset.width > 0) {
      setFormData(prev => ({ 
        ...prev, 
        image_width: preset.width, 
        image_height: preset.height 
      }));
    }
  };

  // Group contents by section type
  const groupedContents = contents?.reduce((acc, content) => {
    if (!acc[content.section_type]) {
      acc[content.section_type] = [];
    }
    acc[content.section_type].push(content);
    return acc;
  }, {} as Record<string, HomepageContent[]>) || {};

  // Render live preview based on section type
  const renderPreview = () => {
    switch (formData.section_type) {
      case 'hero_banner':
        return <HeroBannerPreview data={formData} />;
      case 'promo_banner':
        return <PromoBannerPreview data={formData} />;
      case 'featured_cars':
        return <FeaturedCarPreview data={formData} />;
      case 'testimonial':
        return <TestimonialPreview data={formData} />;
      case 'cta':
        return <CTAPreview data={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Homepage Content</h1>
          <p className="text-muted-foreground">
            Manage banners, promotions, and featured content
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Content
        </Button>
      </div>

      {/* Section Cards */}
      {sectionTypes.map(section => {
        const sectionContents = groupedContents[section.value] || [];
        const Icon = section.icon;

        return (
          <Card key={section.value}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {section.label}
                <Badge variant="secondary">{sectionContents.length}</Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span>
                  {section.value === 'hero_banner' && 'Main hero banners displayed on the homepage'}
                  {section.value === 'promo_banner' && 'Promotional banners for offers and campaigns'}
                  {section.value === 'featured_cars' && 'Featured car highlights'}
                  {section.value === 'testimonial' && 'Customer testimonials and reviews'}
                  {section.value === 'cta' && 'Call-to-action buttons and sections'}
                </span>
                <Badge variant="outline" className="text-xs">
                  Recommended: {section.recommendedSize}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sectionContents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Preview</TableHead>
                      <TableHead className="w-12">Order</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Subtitle</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead className="w-20">Active</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectionContents.map((content) => (
                      <TableRow key={content.id}>
                        <TableCell>
                          {content.image_url ? (
                            <img 
                              src={content.image_url} 
                              alt="" 
                              className="w-14 h-10 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-14 h-10 bg-muted rounded border flex items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            {content.sort_order}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {content.title || <span className="text-muted-foreground italic">No title</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {content.subtitle || '-'}
                        </TableCell>
                        <TableCell>
                          {content.link_url ? (
                            <a 
                              href={content.link_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <Link className="h-3 w-3" />
                              {content.link_text || 'Link'}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={content.is_active}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ id: content.id, is_active: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(content)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Delete this content?')) {
                                  deleteMutation.mutate(content.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No {section.label.toLowerCase()} content yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      handleSectionTypeChange(section.value);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {section.label}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add/Edit Dialog with Live Preview */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingContent ? 'Edit Content' : 'Add New Content'}
            </DialogTitle>
            <DialogDescription>
              Configure the content details and see a live preview
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="form" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">
                <Edit className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Live Preview
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="overflow-auto max-h-[55vh] p-1">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Section Type</Label>
                    <Select
                      value={formData.section_type}
                      onValueChange={handleSectionTypeChange}
                      disabled={!!editingContent}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter title..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    value={formData.subtitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Enter subtitle..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description..."
                    rows={3}
                  />
                </div>

                {/* Image Section with Size Options */}
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Image Settings</Label>
                    <Badge variant="outline">
                      {formData.image_width} × {formData.image_height}px
                    </Badge>
                  </div>
                  
                  <AdminImageUpload
                    value={formData.image_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                    label="Image"
                    folder="homepage-content"
                    recommendedSize={`${formData.image_width}×${formData.image_height}`}
                  />

                  <div className="space-y-2">
                    <Label>Size Preset</Label>
                    <Select value={selectedSizePreset} onValueChange={handleSizePresetChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {imageSizePresets.map((preset) => (
                          <SelectItem key={preset.label} value={preset.label}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSizePreset === 'Custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Width (px)</Label>
                        <Input
                          type="number"
                          value={formData.image_width}
                          onChange={(e) => setFormData(prev => ({ ...prev, image_width: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (px)</Label>
                        <Input
                          type="number"
                          value={formData.image_height}
                          onChange={(e) => setFormData(prev => ({ ...prev, image_height: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                  )}

                  {formData.image_url && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground mb-2 block">Image Preview</Label>
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="max-h-32 rounded border object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Link URL</Label>
                    <Input
                      value={formData.link_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                      placeholder="/cars or https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link Text</Label>
                    <Input
                      value={formData.link_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, link_text: e.target.value }))}
                      placeholder="Learn More"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label>Active (visible on website)</Label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="overflow-auto max-h-[55vh] p-1">
              <div className="space-y-4">
                {/* Device Toggle */}
                <div className="flex items-center justify-between">
                  <Label>Preview Mode</Label>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                      onClick={() => setPreviewDevice('desktop')}
                    >
                      <Monitor className="h-4 w-4 mr-1" />
                      Desktop
                    </Button>
                    <Button
                      size="sm"
                      variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                      onClick={() => setPreviewDevice('mobile')}
                    >
                      <Smartphone className="h-4 w-4 mr-1" />
                      Mobile
                    </Button>
                  </div>
                </div>

                {/* Live Preview */}
                <div className={`border rounded-lg p-4 bg-background ${previewDevice === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">This is how it will appear on the homepage</span>
                  </div>
                  {renderPreview()}
                </div>

                <div className="text-center text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  <p>💡 Changes will be visible on the homepage immediately after saving</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save & Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
