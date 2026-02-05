import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { 
  Search, Plus, Edit, Trash2, Eye, RefreshCw, Car, Image as ImageIcon, 
  Filter, Download, Upload, FileText, Tags, Sparkles, Save, X, Link2
} from "lucide-react";

interface CarData {
  id: string;
  slug: string;
  name: string;
  brand: string;
  body_type: string | null;
  price_range: string | null;
  price_numeric: number | null;
  is_hot: boolean | null;
  is_new: boolean | null;
  is_upcoming: boolean | null;
  is_bestseller: boolean | null;
  overview: string | null;
  tagline: string | null;
  brochure_url: string | null;
  fuel_types: string[] | null;
  transmission_types: string[] | null;
  key_highlights: string[] | null;
  pros: string[] | null;
  cons: string[] | null;
  updated_at: string;
}

interface CarImage {
  id: string;
  car_id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
}

interface CarVariant {
  id: string;
  car_id: string;
  name: string;
  price: string;
  price_numeric: number | null;
  fuel_type: string | null;
  transmission: string | null;
  ex_showroom: number | null;
  on_road_price: number | null;
  features: string[] | null;
}

interface CarBrochure {
  id: string;
  car_id: string;
  title: string;
  url: string;
  variant_name: string | null;
  file_size: string | null;
}

interface FullCarData extends CarData {
  images: CarImage[];
  variants: CarVariant[];
  brochures: CarBrochure[];
}

export const UnifiedCarManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [selectedCar, setSelectedCar] = useState<FullCarData | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState("basic");
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CarData>>({});
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newBrochure, setNewBrochure] = useState({ title: "", url: "", variant_name: "" });
  const [newVariant, setNewVariant] = useState({ 
    name: "", price: "", fuel_type: "", transmission: "", ex_showroom: "", on_road_price: "" 
  });

  // Fetch cars with all related data
  const { data: cars, isLoading, refetch } = useQuery({
    queryKey: ['unifiedCarManagement', brandFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('cars')
        .select('*')
        .order('brand')
        .order('name');
      
      if (brandFilter !== 'all') {
        query = query.eq('brand', brandFilter);
      }
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`);
      }

      const { data: carsData, error } = await query;
      if (error) throw error;

      // Fetch related data for all cars
      const carsWithRelations = await Promise.all(
        (carsData || []).map(async (car) => {
          const [imagesRes, variantsRes, brochuresRes] = await Promise.all([
            supabase.from('car_images').select('*').eq('car_id', car.id).order('sort_order'),
            supabase.from('car_variants').select('*').eq('car_id', car.id).order('price_numeric'),
            supabase.from('car_brochures').select('*').eq('car_id', car.id).order('sort_order'),
          ]);

          return {
            ...car,
            images: imagesRes.data || [],
            variants: variantsRes.data || [],
            brochures: brochuresRes.data || [],
          } as FullCarData;
        })
      );

      return carsWithRelations;
    },
  });

  // Get unique brands
  const brands = [...new Set(cars?.map(car => car.brand) || [])].sort();

  // Stats
  const stats = {
    totalCars: cars?.length || 0,
    carsWithImages: cars?.filter(c => c.images.length > 0).length || 0,
    carsWithVariants: cars?.filter(c => c.variants.length > 0).length || 0,
    carsWithBrochures: cars?.filter(c => c.brochures.length > 0 || c.brochure_url).length || 0,
    totalImages: cars?.reduce((acc, c) => acc + c.images.length, 0) || 0,
    totalVariants: cars?.reduce((acc, c) => acc + c.variants.length, 0) || 0,
  };

  // Update car mutation
  const updateCarMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CarData> }) => {
      const { error } = await supabase
        .from('cars')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedCarManagement'] });
      toast.success('Car updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update car');
      console.error(error);
    },
  });

  // Add image mutation
  const addImageMutation = useMutation({
    mutationFn: async ({ carId, url, altText }: { carId: string; url: string; altText?: string }) => {
      const { error } = await supabase
        .from('car_images')
        .insert([{ car_id: carId, url, alt_text: altText, is_primary: false }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedCarManagement'] });
      toast.success('Image added');
      setNewImageUrl("");
    },
    onError: (error) => {
      toast.error('Failed to add image');
      console.error(error);
    },
  });

  // Add brochure mutation
  const addBrochureMutation = useMutation({
    mutationFn: async ({ carId, title, url, variantName }: { 
      carId: string; title: string; url: string; variantName?: string 
    }) => {
      const { error } = await supabase
        .from('car_brochures')
        .insert([{ car_id: carId, title, url, variant_name: variantName || null }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedCarManagement'] });
      toast.success('Brochure added');
      setNewBrochure({ title: "", url: "", variant_name: "" });
    },
    onError: (error) => {
      toast.error('Failed to add brochure');
      console.error(error);
    },
  });

  // Add variant mutation  
  const addVariantMutation = useMutation({
    mutationFn: async ({ carId, variant }: { carId: string; variant: typeof newVariant }) => {
      const { error } = await supabase
        .from('car_variants')
        .insert([{
          car_id: carId,
          name: variant.name,
          price: variant.price,
          fuel_type: variant.fuel_type || null,
          transmission: variant.transmission || null,
          ex_showroom: variant.ex_showroom ? parseInt(variant.ex_showroom) : null,
          on_road_price: variant.on_road_price ? parseInt(variant.on_road_price) : null,
          price_numeric: variant.ex_showroom ? parseInt(variant.ex_showroom) : null,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedCarManagement'] });
      toast.success('Variant added');
      setNewVariant({ name: "", price: "", fuel_type: "", transmission: "", ex_showroom: "", on_road_price: "" });
    },
    onError: (error) => {
      toast.error('Failed to add variant');
      console.error(error);
    },
  });

  // Delete mutations
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase.from('car_images').delete().eq('id', imageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedCarManagement'] });
      toast.success('Image deleted');
    },
  });

  const deleteBrochureMutation = useMutation({
    mutationFn: async (brochureId: string) => {
      const { error } = await supabase.from('car_brochures').delete().eq('id', brochureId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedCarManagement'] });
      toast.success('Brochure deleted');
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await supabase.from('car_variants').delete().eq('id', variantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedCarManagement'] });
      toast.success('Variant deleted');
    },
  });

  const handleEdit = (car: FullCarData) => {
    setSelectedCar(car);
    setFormData({
      name: car.name,
      brand: car.brand,
      body_type: car.body_type || "",
      price_range: car.price_range || "",
      price_numeric: car.price_numeric,
      overview: car.overview || "",
      tagline: car.tagline || "",
      brochure_url: car.brochure_url || "",
      is_hot: car.is_hot || false,
      is_new: car.is_new || false,
      is_upcoming: car.is_upcoming || false,
      is_bestseller: car.is_bestseller || false,
    });
    setActiveEditTab("basic");
    setIsEditOpen(true);
  };

  const handleSaveBasic = () => {
    if (!selectedCar) return;
    updateCarMutation.mutate({ id: selectedCar.id, updates: formData });
    setIsEditOpen(false);
  };

  const handleAddImage = () => {
    if (!selectedCar || !newImageUrl) return;
    addImageMutation.mutate({ carId: selectedCar.id, url: newImageUrl, altText: selectedCar.name });
  };

  const handleAddBrochure = () => {
    if (!selectedCar || !newBrochure.title || !newBrochure.url) return;
    addBrochureMutation.mutate({
      carId: selectedCar.id,
      title: newBrochure.title,
      url: newBrochure.url,
      variantName: newBrochure.variant_name,
    });
  };

  const handleAddVariant = () => {
    if (!selectedCar || !newVariant.name || !newVariant.price) return;
    addVariantMutation.mutate({ carId: selectedCar.id, variant: newVariant });
  };

  // Bulk upload handler
  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const cars = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const carObj: Record<string, string> = {};
        headers.forEach((header, index) => {
          carObj[header] = values[index] || '';
        });
        return carObj;
      });

      toast.loading(`Processing ${cars.length} cars...`);
      
      let success = 0;
      let failed = 0;

      for (const car of cars) {
        try {
          const slug = car.slug || `${car.brand}-${car.name}`.toLowerCase().replace(/\s+/g, '-');
          const { error } = await supabase.from('cars').upsert({
            slug,
            name: car.name,
            brand: car.brand,
            body_type: car.body_type || car.bodytype,
            price_range: car.price_range || car.price,
            tagline: car.tagline,
            overview: car.overview,
            is_hot: car.is_hot === 'true',
            is_new: car.is_new === 'true',
            is_upcoming: car.is_upcoming === 'true',
          }, { onConflict: 'slug' });
          
          if (error) throw error;
          success++;
        } catch {
          failed++;
        }
      }

      toast.dismiss();
      toast.success(`Imported ${success} cars, ${failed} failed`);
      refetch();
      setIsBulkUploadOpen(false);
    } catch (error) {
      toast.error('Failed to process file');
      console.error(error);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Car Management</h2>
          <p className="text-muted-foreground">
            Manage cars, images, variants, brochures - all in one place
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Car
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalCars}</div>
            <p className="text-xs text-muted-foreground">Total Cars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.carsWithImages}</div>
            <p className="text-xs text-muted-foreground">With Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalImages}</div>
            <p className="text-xs text-muted-foreground">Total Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{stats.carsWithVariants}</div>
            <p className="text-xs text-muted-foreground">With Variants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{stats.totalVariants}</div>
            <p className="text-xs text-muted-foreground">Total Variants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.carsWithBrochures}</div>
            <p className="text-xs text-muted-foreground">With Brochures</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cars by name, brand, or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cars Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <ImageIcon className="h-4 w-4" /> Images
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Tags className="h-4 w-4" /> Variants
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" /> Brochures
                    </div>
                  </TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : cars && cars.length > 0 ? (
                  cars.map((car) => (
                    <TableRow key={car.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {car.images[0]?.url ? (
                            <div className="h-10 w-14 rounded overflow-hidden bg-muted">
                              <img src={car.images[0].url} alt={car.name} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                              <Car className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{car.name}</p>
                            <p className="text-xs text-muted-foreground">{car.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{car.brand}</Badge>
                      </TableCell>
                      <TableCell>{car.body_type || '-'}</TableCell>
                      <TableCell>{car.price_range || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={car.images.length > 0 ? "default" : "destructive"}>
                          {car.images.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={car.variants.length > 0 ? "default" : "secondary"}>
                          {car.variants.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={car.brochures.length > 0 || car.brochure_url ? "default" : "secondary"}>
                          {car.brochures.length + (car.brochure_url ? 1 : 0)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {car.is_hot && <Badge variant="destructive" className="text-xs">Hot</Badge>}
                          {car.is_new && <Badge className="bg-green-600 text-xs">New</Badge>}
                          {car.is_upcoming && <Badge variant="secondary" className="text-xs">Soon</Badge>}
                          {car.is_bestseller && <Badge className="bg-yellow-600 text-xs">Best</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => window.open(`/cars/${car.slug}`, '_blank')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(car)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No cars found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog with Tabs */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCar?.brand} {selectedCar?.name}</DialogTitle>
            <DialogDescription>Edit all car details, images, variants, and brochures</DialogDescription>
          </DialogHeader>
          
          {selectedCar && (
            <Tabs value={activeEditTab} onValueChange={setActiveEditTab}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="basic">
                  <Car className="h-4 w-4 mr-2" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="images">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Images ({selectedCar.images.length})
                </TabsTrigger>
                <TabsTrigger value="variants">
                  <Tags className="h-4 w-4 mr-2" />
                  Variants ({selectedCar.variants.length})
                </TabsTrigger>
                <TabsTrigger value="brochures">
                  <FileText className="h-4 w-4 mr-2" />
                  Brochures ({selectedCar.brochures.length})
                </TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Car Name</Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      value={formData.brand || ""}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Body Type</Label>
                    <Select 
                      value={formData.body_type || ""} 
                      onValueChange={(v) => setFormData({ ...formData, body_type: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUV">SUV</SelectItem>
                        <SelectItem value="Sedan">Sedan</SelectItem>
                        <SelectItem value="Hatchback">Hatchback</SelectItem>
                        <SelectItem value="MUV">MUV</SelectItem>
                        <SelectItem value="Crossover">Crossover</SelectItem>
                        <SelectItem value="Coupe">Coupe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price Range</Label>
                    <Input
                      value={formData.price_range || ""}
                      onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                      placeholder="₹8.5L - ₹14L"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Tagline</Label>
                    <Input
                      value={formData.tagline || ""}
                      onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Overview</Label>
                    <Textarea
                      value={formData.overview || ""}
                      onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold">Display Flags</Label>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {[
                      { key: 'is_hot', label: '🔥 Hot Deal' },
                      { key: 'is_new', label: '✨ New Arrival' },
                      { key: 'is_upcoming', label: '🚀 Upcoming' },
                      { key: 'is_bestseller', label: '⭐ Bestseller' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="cursor-pointer">{label}</Label>
                        <Switch
                          checked={!!formData[key as keyof typeof formData]}
                          onCheckedChange={(v) => setFormData({ ...formData, [key]: v })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveBasic} disabled={updateCarMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </DialogFooter>
              </TabsContent>

              {/* Images Tab */}
              <TabsContent value="images" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {selectedCar.images.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <img src={image.url} alt={image.alt_text || ""} className="h-full w-full object-cover" />
                      </div>
                      {image.is_primary && <Badge className="absolute top-2 left-2">Primary</Badge>}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteImageMutation.mutate(image.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {selectedCar.images.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No images yet</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label>Add Image URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                    <Button onClick={handleAddImage} disabled={!newImageUrl || addImageMutation.isPending}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Variants Tab */}
              <TabsContent value="variants" className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>Fuel</TableHead>
                      <TableHead>Transmission</TableHead>
                      <TableHead>Ex-Showroom</TableHead>
                      <TableHead>On-Road</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCar.variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.name}</TableCell>
                        <TableCell><Badge variant="outline">{variant.fuel_type || '-'}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{variant.transmission || '-'}</Badge></TableCell>
                        <TableCell>{formatPrice(variant.ex_showroom || variant.price_numeric)}</TableCell>
                        <TableCell className="font-medium">{formatPrice(variant.on_road_price)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteVariantMutation.mutate(variant.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {selectedCar.variants.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No variants yet</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-4 block">Add New Variant</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      placeholder="Variant Name"
                      value={newVariant.name}
                      onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                    />
                    <Input
                      placeholder="Price (e.g., ₹12.5 Lakh)"
                      value={newVariant.price}
                      onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                    />
                    <Select value={newVariant.fuel_type} onValueChange={(v) => setNewVariant({ ...newVariant, fuel_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Fuel Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="CNG">CNG</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newVariant.transmission} onValueChange={(v) => setNewVariant({ ...newVariant, transmission: v })}>
                      <SelectTrigger><SelectValue placeholder="Transmission" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="Automatic">Automatic</SelectItem>
                        <SelectItem value="CVT">CVT</SelectItem>
                        <SelectItem value="DCT">DCT</SelectItem>
                        <SelectItem value="AMT">AMT</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Ex-Showroom (₹)"
                      value={newVariant.ex_showroom}
                      onChange={(e) => setNewVariant({ ...newVariant, ex_showroom: e.target.value })}
                    />
                    <Input
                      placeholder="On-Road (₹)"
                      value={newVariant.on_road_price}
                      onChange={(e) => setNewVariant({ ...newVariant, on_road_price: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddVariant} disabled={!newVariant.name || !newVariant.price} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </div>
              </TabsContent>

              {/* Brochures Tab */}
              <TabsContent value="brochures" className="space-y-4">
                <div className="space-y-2">
                  {selectedCar.brochures.map((brochure) => (
                    <div key={brochure.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{brochure.title}</p>
                          {brochure.variant_name && (
                            <Badge variant="outline" className="text-xs">{brochure.variant_name}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => window.open(brochure.url, '_blank')}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteBrochureMutation.mutate(brochure.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {selectedCar.brochure_url && (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Link2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Main Brochure (Legacy)</p>
                          <p className="text-xs text-muted-foreground truncate max-w-md">{selectedCar.brochure_url}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => window.open(selectedCar.brochure_url!, '_blank')}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {selectedCar.brochures.length === 0 && !selectedCar.brochure_url && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No brochures yet</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-4 block">Add New Brochure</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      placeholder="Brochure Title"
                      value={newBrochure.title}
                      onChange={(e) => setNewBrochure({ ...newBrochure, title: e.target.value })}
                    />
                    <Input
                      placeholder="PDF URL"
                      value={newBrochure.url}
                      onChange={(e) => setNewBrochure({ ...newBrochure, url: e.target.value })}
                    />
                    <Input
                      placeholder="Variant Name (optional)"
                      value={newBrochure.variant_name}
                      onChange={(e) => setNewBrochure({ ...newBrochure, variant_name: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddBrochure} disabled={!newBrochure.title || !newBrochure.url} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Brochure
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Cars</DialogTitle>
            <DialogDescription>
              Upload a CSV file with car data. Required columns: name, brand
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag & drop a CSV file or click to browse
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleBulkUpload}
                className="max-w-xs mx-auto"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">CSV Format:</p>
              <code className="text-xs bg-muted p-2 rounded block">
                name,brand,body_type,price_range,tagline,is_hot,is_new
              </code>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
