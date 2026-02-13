import { useState } from "react";
import { AdminImageUpload } from "./AdminImageUpload";
import { useBanners } from "@/hooks/useCMSData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Edit, Eye, EyeOff, Image as ImageIcon, ExternalLink } from "lucide-react";

interface BannerFormData {
  id?: string;
  title: string;
  subtitle: string;
  image_url: string;
  mobile_image_url: string;
  link_url: string;
  link_text: string;
  position: string;
  is_active: boolean;
  sort_order: number;
}

const defaultBanner: BannerFormData = {
  title: '',
  subtitle: '',
  image_url: '',
  mobile_image_url: '',
  link_url: '',
  link_text: '',
  position: 'homepage',
  is_active: true,
  sort_order: 0,
};

const POSITIONS = [
  { value: 'homepage', label: 'Homepage Hero' },
  { value: 'cars', label: 'Cars Page' },
  { value: 'services', label: 'Services Page' },
  { value: 'hsrp', label: 'HSRP Page' },
  { value: 'insurance', label: 'Insurance Page' },
  { value: 'loans', label: 'Loans Page' },
];

export function BannersManager() {
  const { data: banners, isLoading, saveMutation, deleteMutation } = useBanners();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerFormData>(defaultBanner);
  const [filterPosition, setFilterPosition] = useState<string>('all');

  const handleSave = async () => {
    await saveMutation.mutateAsync(editingBanner);
    setIsDialogOpen(false);
    setEditingBanner(defaultBanner);
  };

  const handleEdit = (banner: any) => {
    setEditingBanner({
      id: banner.id,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      mobile_image_url: banner.mobile_image_url || '',
      link_url: banner.link_url || '',
      link_text: banner.link_text || '',
      position: banner.position || 'homepage',
      is_active: banner.is_active ?? true,
      sort_order: banner.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const filteredBanners = banners?.filter(b => 
    filterPosition === 'all' || b.position === filterPosition
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Banners & Sliders</h2>
          <p className="text-muted-foreground">Manage promotional banners across the website</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {POSITIONS.map((pos) => (
                <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingBanner(defaultBanner)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBanner.id ? 'Edit Banner' : 'Add New Banner'}</DialogTitle>
                <DialogDescription>Configure banner details and visibility settings</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Title *</Label>
                  <Input
                    value={editingBanner.title}
                    onChange={(e) => setEditingBanner(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Banner title"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Subtitle</Label>
                  <Input
                    value={editingBanner.subtitle}
                    onChange={(e) => setEditingBanner(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Optional subtitle text"
                  />
                </div>

                <AdminImageUpload
                  value={editingBanner.image_url}
                  onChange={(url) => setEditingBanner(prev => ({ ...prev, image_url: url }))}
                  label="Desktop Image *"
                  folder="banners"
                  recommendedSize="1920×600"
                />

                <AdminImageUpload
                  value={editingBanner.mobile_image_url}
                  onChange={(url) => setEditingBanner(prev => ({ ...prev, mobile_image_url: url }))}
                  label="Mobile Image (optional)"
                  folder="banners/mobile"
                  recommendedSize="768×400"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Link URL</Label>
                    <Input
                      value={editingBanner.link_url}
                      onChange={(e) => setEditingBanner(prev => ({ ...prev, link_url: e.target.value }))}
                      placeholder="/cars or https://..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Link Text</Label>
                    <Input
                      value={editingBanner.link_text}
                      onChange={(e) => setEditingBanner(prev => ({ ...prev, link_text: e.target.value }))}
                      placeholder="Explore Now"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Position</Label>
                    <Select 
                      value={editingBanner.position}
                      onValueChange={(value) => setEditingBanner(prev => ({ ...prev, position: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map((pos) => (
                          <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={editingBanner.sort_order}
                      onChange={(e) => setEditingBanner(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Show this banner on the website</p>
                  </div>
                  <Switch
                    checked={editingBanner.is_active}
                    onCheckedChange={(checked) => setEditingBanner(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={!editingBanner.title || !editingBanner.image_url || saveMutation.isPending}
                  >
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editingBanner.id ? 'Update' : 'Create'} Banner
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            All Banners ({filteredBanners?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBanners?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No banners found. Create your first banner!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBanners?.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      {banner.image_url ? (
                        <img 
                          src={banner.image_url} 
                          alt={banner.title} 
                          className="h-12 w-20 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-20 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{banner.title}</p>
                        {banner.subtitle && (
                          <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {POSITIONS.find(p => p.value === banner.position)?.label || banner.position}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={banner.is_active ? "default" : "secondary"}>
                        {banner.is_active ? (
                          <><Eye className="h-3 w-3 mr-1" />Active</>
                        ) : (
                          <><EyeOff className="h-3 w-3 mr-1" />Hidden</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{banner.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {banner.link_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => handleDelete(banner.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BannersManager;
