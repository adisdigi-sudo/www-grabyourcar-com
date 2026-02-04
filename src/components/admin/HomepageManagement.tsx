import { useState } from "react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plus,
  Edit,
  Trash2,
  Image,
  GripVertical,
  Eye,
  EyeOff,
  Link,
  Type,
  FileText,
  Megaphone,
  Star,
  ArrowUpDown,
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
  { value: 'hero_banner', label: 'Hero Banner', icon: Image },
  { value: 'promo_banner', label: 'Promo Banner', icon: Megaphone },
  { value: 'featured_cars', label: 'Featured Cars', icon: Star },
  { value: 'testimonial', label: 'Testimonial', icon: FileText },
  { value: 'cta', label: 'Call to Action', icon: Link },
];

export const HomepageManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<HomepageContent | null>(null);
  const [formData, setFormData] = useState({
    section_type: 'hero_banner',
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    link_url: '',
    link_text: '',
    is_active: true,
    sort_order: 0,
  });

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
    mutationFn: async (data: typeof formData) => {
      if (editingContent) {
        const { error } = await supabase
          .from('homepage_content')
          .update(data)
          .eq('id', editingContent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('homepage_content')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepageContent'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success(editingContent ? 'Content updated' : 'Content created');
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
    setFormData({
      section_type: 'hero_banner',
      title: '',
      subtitle: '',
      description: '',
      image_url: '',
      link_url: '',
      link_text: '',
      is_active: true,
      sort_order: 0,
    });
    setEditingContent(null);
  };

  const handleEdit = (content: HomepageContent) => {
    setEditingContent(content);
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
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const getSectionIcon = (type: string) => {
    const section = sectionTypes.find(s => s.value === type);
    return section ? section.icon : FileText;
  };

  const getSectionLabel = (type: string) => {
    const section = sectionTypes.find(s => s.value === type);
    return section ? section.label : type;
  };

  // Group contents by section type
  const groupedContents = contents?.reduce((acc, content) => {
    if (!acc[content.section_type]) {
      acc[content.section_type] = [];
    }
    acc[content.section_type].push(content);
    return acc;
  }, {} as Record<string, HomepageContent[]>) || {};

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
              <CardDescription>
                {section.value === 'hero_banner' && 'Main hero banners displayed on the homepage'}
                {section.value === 'promo_banner' && 'Promotional banners for offers and campaigns'}
                {section.value === 'featured_cars' && 'Featured car highlights'}
                {section.value === 'testimonial' && 'Customer testimonials and reviews'}
                {section.value === 'cta' && 'Call-to-action buttons and sections'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sectionContents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      setFormData(prev => ({ ...prev, section_type: section.value }));
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingContent ? 'Edit Content' : 'Add New Content'}
            </DialogTitle>
            <DialogDescription>
              Configure the content details for the homepage section
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Section Type</Label>
                <Select
                  value={formData.section_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, section_type: value }))}
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

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
