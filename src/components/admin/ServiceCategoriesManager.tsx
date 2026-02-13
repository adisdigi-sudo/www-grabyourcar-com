import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical, 
  Sparkles,
  Car, 
  Clock, 
  GitCompare, 
  Shield, 
  Banknote, 
  Building2, 
  CarFront, 
  Package,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";

interface CategoryItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  href: string;
  type: 'scroll' | 'navigate' | 'coming-soon';
  sort_order: number;
  is_active: boolean;
}

const iconOptions = [
  { value: "Car", label: "Car" },
  { value: "Clock", label: "Clock" },
  { value: "GitCompare", label: "Compare" },
  { value: "Shield", label: "Shield" },
  { value: "Banknote", label: "Money" },
  { value: "Building2", label: "Building" },
  { value: "CarFront", label: "Car Front" },
  { value: "Package", label: "Package" },
];

const colorOptions = [
  { value: "text-primary", label: "Primary", bg: "bg-primary/10" },
  { value: "text-accent-foreground", label: "Accent", bg: "bg-accent/50" },
  { value: "text-success", label: "Success", bg: "bg-success/10" },
  { value: "text-muted-foreground", label: "Muted", bg: "bg-muted" },
];

const typeOptions = [
  { value: "navigate", label: "Navigate to Page" },
  { value: "scroll", label: "Scroll to Section" },
  { value: "coming-soon", label: "Coming Soon" },
];

const defaultCategories: CategoryItem[] = [
  { id: "1", icon: "Car", title: "New Cars", description: "Pan-India Deals from Authorized Dealers", color: "text-primary", bgColor: "bg-primary/10", href: "#cars", type: "scroll", sort_order: 1, is_active: true },
  { id: "2", icon: "Clock", title: "Zero Waiting", description: "Ready Stock Cars Available Now", color: "text-accent-foreground", bgColor: "bg-accent/50", href: "#cars", type: "scroll", sort_order: 2, is_active: true },
  { id: "3", icon: "GitCompare", title: "Compare Offers", description: "Best Deals from Multiple Dealers", color: "text-success", bgColor: "bg-success/10", href: "/compare", type: "navigate", sort_order: 3, is_active: true },
  { id: "4", icon: "Shield", title: "Car Insurance", description: "Best Rates from Top Insurers", color: "text-primary", bgColor: "bg-primary/10", href: "/car-insurance", type: "navigate", sort_order: 4, is_active: true },
  { id: "5", icon: "Banknote", title: "Car Loans", description: "Easy Finance from Banks & NBFCs", color: "text-accent-foreground", bgColor: "bg-accent/50", href: "/car-loans", type: "navigate", sort_order: 5, is_active: true },
  { id: "6", icon: "Building2", title: "Corporate Buying", description: "Bulk Deals for Businesses", color: "text-success", bgColor: "bg-success/10", href: "/corporate", type: "navigate", sort_order: 6, is_active: true },
  { id: "7", icon: "CarFront", title: "Self-Drive Rentals", description: "Premium Cars on Rent", color: "text-primary", bgColor: "bg-primary/10", href: "/self-drive", type: "navigate", sort_order: 7, is_active: true },
  { id: "8", icon: "Package", title: "Accessories", description: "HSRP Frames & More", color: "text-accent-foreground", bgColor: "bg-accent/50", href: "/accessories", type: "navigate", sort_order: 8, is_active: true },
];

export const ServiceCategoriesManager = () => {
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<CategoryItem[]>(defaultCategories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch categories
  const { data: savedCategories, isLoading } = useQuery({
    queryKey: ['service-categories-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('setting_key', 'service_categories')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const parsed = data.setting_value as { categories?: CategoryItem[] };
        return parsed?.categories || defaultCategories;
      }
      return defaultCategories;
    },
  });

  useEffect(() => {
    if (savedCategories) {
      setCategories(savedCategories);
    }
  }, [savedCategories]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newCategories: CategoryItem[]) => {
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('setting_key', 'service_categories')
        .single();

      const settingValue = JSON.parse(JSON.stringify({ categories: newCategories }));

      if (existing) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ 
            setting_value: settingValue,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'service_categories');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .insert([{
            setting_key: 'service_categories',
            setting_value: settingValue,
            description: 'Homepage service category banners'
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] });
      queryClient.invalidateQueries({ queryKey: ['service-categories-admin'] });
      toast.success('Categories saved successfully');
    },
    onError: () => {
      toast.error('Failed to save categories');
    }
  });

  const handleSave = () => {
    saveMutation.mutate(categories);
  };

  const handleAddNew = () => {
    setEditingCategory({
      id: Date.now().toString(),
      title: "",
      description: "",
      icon: "Car",
      color: "text-primary",
      bgColor: "bg-primary/10",
      href: "/",
      type: "navigate",
      sort_order: categories.length + 1,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (category: CategoryItem) => {
    setEditingCategory({ ...category });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setCategories(prev => 
      prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c)
    );
  };

  const handleSaveCategory = () => {
    if (!editingCategory) return;

    if (categories.find(c => c.id === editingCategory.id)) {
      setCategories(prev => 
        prev.map(c => c.id === editingCategory.id ? editingCategory : c)
      );
    } else {
      setCategories(prev => [...prev, editingCategory]);
    }
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleGenerateDescription = async () => {
    if (!editingCategory?.title) {
      toast.error('Enter a title first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-content-generate', {
        body: {
          type: 'ad_copy',
          topic: editingCategory.title,
          tone: 'professional',
          
        }
      });

      if (error) throw error;
      
      setEditingCategory(prev => prev ? { ...prev, description: data.content } : null);
      toast.success('Description generated!');
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newCategories = [...categories];
    [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
    newCategories.forEach((c, i) => c.sort_order = i + 1);
    setCategories(newCategories);
  };

  const handleMoveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
    newCategories.forEach((c, i) => c.sort_order = i + 1);
    setCategories(newCategories);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Service Category Banners</h2>
          <p className="text-muted-foreground">Manage homepage service category cards</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories ({categories.length})</CardTitle>
          <CardDescription>Drag to reorder, toggle visibility, or edit details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Order</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.sort((a, b) => a.sort_order - b.sort_order).map((category, index) => (
                <TableRow key={category.id} className={!category.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === categories.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{category.title}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{category.description}</TableCell>
                  <TableCell className="font-mono text-xs">{category.href}</TableCell>
                  <TableCell>
                    <Badge variant={category.type === 'coming-soon' ? 'secondary' : 'default'}>
                      {category.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleToggleActive(category.id)}
                    >
                      {category.is_active ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(category.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id && categories.find(c => c.id === editingCategory.id) 
                ? 'Edit Category' 
                : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              Configure the service category banner
            </DialogDescription>
          </DialogHeader>

          {editingCategory && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingCategory.title}
                  onChange={(e) => setEditingCategory({ ...editingCategory, title: e.target.value })}
                  placeholder="e.g., Self-Drive Rentals"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  Description
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    AI Generate
                  </Button>
                </Label>
                <Input
                  value={editingCategory.description}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="e.g., Premium Cars on Rent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select
                    value={editingCategory.icon}
                    onValueChange={(v) => setEditingCategory({ ...editingCategory, icon: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Color Theme</Label>
                  <Select
                    value={editingCategory.color}
                    onValueChange={(v) => {
                      const colorOpt = colorOptions.find(c => c.value === v);
                      setEditingCategory({ 
                        ...editingCategory, 
                        color: v, 
                        bgColor: colorOpt?.bg || 'bg-primary/10' 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link / Href</Label>
                  <Input
                    value={editingCategory.href}
                    onChange={(e) => setEditingCategory({ ...editingCategory, href: e.target.value })}
                    placeholder="/self-drive or #section"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editingCategory.type}
                    onValueChange={(v: 'scroll' | 'navigate' | 'coming-soon') => 
                      setEditingCategory({ ...editingCategory, type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingCategory.is_active}
                  onCheckedChange={(v) => setEditingCategory({ ...editingCategory, is_active: v })}
                />
                <Label>Active (visible on homepage)</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory}>Save Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
