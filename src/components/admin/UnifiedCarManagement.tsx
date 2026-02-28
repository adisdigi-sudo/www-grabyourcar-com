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
  Filter, Download, Upload, FileText, Tags, Sparkles, Save, X, Link2,
  Settings, IndianRupee, Gauge, Shield, Ruler, Palette
} from "lucide-react";
import { stateRates, calculateStatePriceBreakup } from "@/data/statePricing";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import { CarImageUploader } from "./CarImageUploader";
import { ExcelCarEntry } from "./car-database/ExcelCarEntry";

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

interface CarSpecification {
  id: string;
  car_id: string;
  category: string;
  label: string;
  value: string;
  sort_order: number | null;
}

interface CarColor {
  id: string;
  car_id: string;
  name: string;
  hex_code: string;
  image_url: string | null;
  sort_order: number | null;
}

interface FullCarData extends CarData {
  images: CarImage[];
  variants: CarVariant[];
  brochures: CarBrochure[];
  specifications: CarSpecification[];
  colors: CarColor[];
}

const specCategories = ['engine', 'dimensions', 'performance', 'features', 'safety'] as const;

const specCategoryLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  engine: { label: 'Engine', icon: <Gauge className="h-4 w-4" /> },
  dimensions: { label: 'Dimensions', icon: <Ruler className="h-4 w-4" /> },
  performance: { label: 'Performance', icon: <Sparkles className="h-4 w-4" /> },
  features: { label: 'Features', icon: <Settings className="h-4 w-4" /> },
  safety: { label: 'Safety', icon: <Shield className="h-4 w-4" /> },
};

export const UnifiedCarManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [selectedCar, setSelectedCar] = useState<FullCarData | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddCarOpen, setIsAddCarOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState("basic");
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CarData>>({});
  const [newCarForm, setNewCarForm] = useState({
    name: "",
    brand: "Maruti",
    body_type: "Hatchback",
    price_range: "",
    tagline: "",
    overview: "",
    is_hot: false,
    is_new: true,
    is_upcoming: false,
    is_bestseller: false,
  });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newBrochure, setNewBrochure] = useState({ title: "", url: "", variant_name: "" });
  const [newVariant, setNewVariant] = useState({ 
    name: "", price: "", fuel_type: "", transmission: "", ex_showroom: "", on_road_price: "" 
  });
  const [newSpec, setNewSpec] = useState({ category: "engine", label: "", value: "" });
  const [newColor, setNewColor] = useState({ name: "", hex_code: "#000000", image_url: "" });
  const [editingColorId, setEditingColorId] = useState<string | null>(null);
  const [editingColorData, setEditingColorData] = useState<{ name: string; hex_code: string; image_url: string } | null>(null);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [priceBreakupState, setPriceBreakupState] = useState("DL");

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
          const [imagesRes, variantsRes, brochuresRes, specsRes, colorsRes] = await Promise.all([
            supabase.from('car_images').select('*').eq('car_id', car.id).order('sort_order'),
            supabase.from('car_variants').select('*').eq('car_id', car.id).order('price_numeric'),
            supabase.from('car_brochures').select('*').eq('car_id', car.id).order('sort_order'),
            supabase.from('car_specifications').select('*').eq('car_id', car.id).order('sort_order'),
            supabase.from('car_colors').select('*').eq('car_id', car.id).order('sort_order'),
          ]);

          return {
            ...car,
            images: imagesRes.data || [],
            variants: variantsRes.data || [],
            brochures: brochuresRes.data || [],
            specifications: specsRes.data || [],
            colors: colorsRes.data || [],
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
      invalidateCarQueries(queryClient);
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
      invalidateCarQueries(queryClient);
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
      invalidateCarQueries(queryClient);
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
      invalidateCarQueries(queryClient);
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
      const { error, count } = await supabase.from('car_images').delete().eq('id', imageId).select();
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Image deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete image: ' + error.message);
      console.error('[Delete Image]', error);
    },
  });

  const deleteBrochureMutation = useMutation({
    mutationFn: async (brochureId: string) => {
      const { error } = await supabase.from('car_brochures').delete().eq('id', brochureId).select();
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Brochure deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete brochure: ' + error.message);
      console.error('[Delete Brochure]', error);
    },
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await supabase.from('car_variants').delete().eq('id', variantId).select();
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Variant deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete variant: ' + error.message);
      console.error('[Delete Variant]', error);
    },
  });

  // Specification mutations
  const addSpecMutation = useMutation({
    mutationFn: async ({ carId, category, label, value }: { carId: string; category: string; label: string; value: string }) => {
      const { error } = await supabase
        .from('car_specifications')
        .insert([{ car_id: carId, category, label, value }]);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Specification added');
    },
    onError: () => {
      toast.error('Failed to add specification');
    },
  });

  const deleteSpecMutation = useMutation({
    mutationFn: async (specId: string) => {
      const { error } = await supabase.from('car_specifications').delete().eq('id', specId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Specification deleted');
    },
  });

  // Update variant price breakup
  const updateVariantPriceMutation = useMutation({
    mutationFn: async ({ variantId, updates }: { variantId: string; updates: Partial<CarVariant> }) => {
      const { error } = await supabase
        .from('car_variants')
        .update(updates)
        .eq('id', variantId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Pricing updated');
    },
    onError: () => {
      toast.error('Failed to update pricing');
    },
  });

  // Add color mutation
  const addColorMutation = useMutation({
    mutationFn: async ({ carId, color }: { carId: string; color: typeof newColor }) => {
      const maxOrder = selectedCar?.colors.reduce((max, c) => Math.max(max, c.sort_order || 0), 0) || 0;
      const { error } = await supabase
        .from('car_colors')
        .insert([{
          car_id: carId,
          name: color.name,
          hex_code: color.hex_code,
          image_url: color.image_url || null,
          sort_order: maxOrder + 1,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Color added');
      setNewColor({ name: "", hex_code: "#000000", image_url: "" });
    },
    onError: () => {
      toast.error('Failed to add color');
    },
  });

  // Delete color mutation
  const deleteColorMutation = useMutation({
    mutationFn: async (colorId: string) => {
      const { error } = await supabase
        .from('car_colors')
        .delete()
        .eq('id', colorId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Color deleted');
    },
  });

  // Update color mutation
  const updateColorMutation = useMutation({
    mutationFn: async ({ colorId, updates }: { colorId: string; updates: { name?: string; hex_code?: string; image_url?: string | null } }) => {
      const { error } = await supabase
        .from('car_colors')
        .update(updates)
        .eq('id', colorId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Color updated');
      setEditingColorId(null);
      setEditingColorData(null);
    },
    onError: () => {
      toast.error('Failed to update color');
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

  // Add new car mutation
  const addCarMutation = useMutation({
    mutationFn: async (carData: typeof newCarForm) => {
      const slug = `${carData.brand}-${carData.name}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const { error } = await supabase
        .from('cars')
        .insert([{
          slug,
          name: carData.name,
          brand: carData.brand,
          body_type: carData.body_type,
          price_range: carData.price_range,
          tagline: carData.tagline,
          overview: carData.overview,
          is_hot: carData.is_hot,
          is_new: carData.is_new,
          is_upcoming: carData.is_upcoming,
          is_bestseller: carData.is_bestseller,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Car added successfully');
      setIsAddCarOpen(false);
      setNewCarForm({
        name: "",
        brand: "Maruti",
        body_type: "Hatchback",
        price_range: "",
        tagline: "",
        overview: "",
        is_hot: false,
        is_new: true,
        is_upcoming: false,
        is_bestseller: false,
      });
    },
    onError: (error) => {
      toast.error('Failed to add car');
      console.error(error);
    },
  });

  // Delete car mutation
  const deleteCarMutation = useMutation({
    mutationFn: async (carId: string) => {
      // Delete related data first
      await supabase.from('car_images').delete().eq('car_id', carId);
      await supabase.from('car_variants').delete().eq('car_id', carId);
      await supabase.from('car_brochures').delete().eq('car_id', carId);
      const { error } = await supabase.from('cars').delete().eq('id', carId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCarQueries(queryClient);
      toast.success('Car deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete car');
      console.error(error);
    },
  });

  const handleAddCar = () => {
    if (!newCarForm.name || !newCarForm.brand) {
      toast.error('Please fill in car name and brand');
      return;
    }
    addCarMutation.mutate(newCarForm);
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
          <Button onClick={() => setIsAddCarOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
            <FileText className="h-4 w-4 mr-2" />
            Excel Entry
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              if (confirm(`Delete ${car.brand} ${car.name}? This will also delete all images, variants, and brochures.`)) {
                                deleteCarMutation.mutate(car.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
              <TabsList className="w-full grid grid-cols-7">
                <TabsTrigger value="basic" className="text-xs px-1">
                  <Car className="h-3 w-3 mr-1" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="images" className="text-xs px-1">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  Images
                </TabsTrigger>
                <TabsTrigger value="colors" className="text-xs px-1">
                  <Palette className="h-3 w-3 mr-1" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="variants" className="text-xs px-1">
                  <Tags className="h-3 w-3 mr-1" />
                  Variants
                </TabsTrigger>
                <TabsTrigger value="specs" className="text-xs px-1">
                  <Settings className="h-3 w-3 mr-1" />
                  Specs
                </TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs px-1">
                  <IndianRupee className="h-3 w-3 mr-1" />
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="brochures" className="text-xs px-1">
                  <FileText className="h-3 w-3 mr-1" />
                  Docs
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
                <CarImageUploader
                  carId={selectedCar.id}
                  carName={selectedCar.name}
                  carBrand={selectedCar.brand}
                  images={selectedCar.images}
                  onImagesChanged={() => refetch()}
                />
              </TabsContent>

              {/* Colors Tab */}
              <TabsContent value="colors" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedCar.colors.map((color) => (
                    <div key={color.id} className="relative group border rounded-lg p-4 hover:shadow-md transition-shadow">
                      {editingColorId === color.id ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={editingColorData?.hex_code || color.hex_code}
                              onChange={(e) => setEditingColorData(prev => prev ? { ...prev, hex_code: e.target.value } : null)}
                              className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={editingColorData?.name || ""}
                              onChange={(e) => setEditingColorData(prev => prev ? { ...prev, name: e.target.value } : null)}
                              placeholder="Color Name"
                              className="flex-1"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Color-Specific Image URL</Label>
                            <Input
                              value={editingColorData?.image_url || ""}
                              onChange={(e) => setEditingColorData(prev => prev ? { ...prev, image_url: e.target.value } : null)}
                              placeholder="https://example.com/car-in-color.jpg"
                            />
                          </div>
                          {editingColorData?.image_url && (
                            <div className="h-20 rounded-md overflow-hidden bg-muted">
                              <img 
                                src={editingColorData.image_url} 
                                alt="Preview" 
                                className="w-full h-full object-cover"
                                onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                              />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (editingColorData) {
                                  updateColorMutation.mutate({
                                    colorId: color.id,
                                    updates: {
                                      name: editingColorData.name,
                                      hex_code: editingColorData.hex_code,
                                      image_url: editingColorData.image_url || null,
                                    }
                                  });
                                }
                              }}
                              disabled={updateColorMutation.isPending}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingColorId(null);
                                setEditingColorData(null);
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-10 h-10 rounded-full border-2 border-border shadow-inner flex-shrink-0"
                              style={{ backgroundColor: color.hex_code }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{color.name}</p>
                              <p className="text-xs text-muted-foreground">{color.hex_code}</p>
                            </div>
                          </div>
                          {color.image_url ? (
                            <div className="h-24 rounded-md overflow-hidden bg-muted mt-2 relative group/img">
                              <img src={color.image_url} alt={color.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <Badge variant="secondary" className="text-xs">Color Image</Badge>
                              </div>
                            </div>
                          ) : (
                            <div className="h-24 rounded-md bg-muted/50 border-2 border-dashed border-muted-foreground/30 mt-2 flex items-center justify-center text-xs text-muted-foreground">
                              <ImageIcon className="h-4 w-4 mr-1" />
                              No color image
                            </div>
                          )}
                          <div className="flex gap-1 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setEditingColorId(color.id);
                                setEditingColorData({
                                  name: color.name,
                                  hex_code: color.hex_code,
                                  image_url: color.image_url || ""
                                });
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteColorMutation.mutate(color.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {selectedCar.colors.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No colors added yet</p>
                    <p className="text-sm">Add color options available for this car</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-4 block">Add New Color</Label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Color Name</Label>
                      <Input
                        value={newColor.name}
                        onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                        placeholder="e.g., Pearl White"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hex Code</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={newColor.hex_code}
                          onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
                          className="w-14 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={newColor.hex_code}
                          onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
                          placeholder="#FFFFFF"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Color-Specific Image URL</Label>
                      <Input
                        value={newColor.image_url}
                        onChange={(e) => setNewColor({ ...newColor, image_url: e.target.value })}
                        placeholder="https://example.com/car-white.jpg"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          if (selectedCar && newColor.name && newColor.hex_code) {
                            addColorMutation.mutate({ carId: selectedCar.id, color: newColor });
                          }
                        }}
                        disabled={!newColor.name || !newColor.hex_code || addColorMutation.isPending}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Color
                      </Button>
                    </div>
                  </div>
                  {newColor.image_url && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground">Image Preview</Label>
                      <div className="h-24 w-40 rounded-md overflow-hidden bg-muted mt-1">
                        <img 
                          src={newColor.image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.svg'}
                        />
                      </div>
                    </div>
                  )}
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

              {/* Specifications Tab */}
              <TabsContent value="specs" className="space-y-4">
                <Accordion type="multiple" defaultValue={["engine"]} className="w-full">
                  {specCategories.map((category) => {
                    const categorySpecs = selectedCar.specifications.filter(s => s.category === category);
                    const catInfo = specCategoryLabels[category];
                    return (
                      <AccordionItem key={category} value={category}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            {catInfo.icon}
                            <span>{catInfo.label}</span>
                            <Badge variant="secondary" className="ml-2">{categorySpecs.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {categorySpecs.map((spec) => (
                              <div key={spec.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <div className="flex-1">
                                  <span className="font-medium text-sm">{spec.label}</span>
                                  <span className="text-muted-foreground mx-2">:</span>
                                  <span className="text-sm">{spec.value}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => deleteSpecMutation.mutate(spec.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ))}
                            {categorySpecs.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-2">No specifications added</p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-4 block">Add Specification</Label>
                  <div className="grid grid-cols-4 gap-4">
                    <Select value={newSpec.category} onValueChange={(v) => setNewSpec({ ...newSpec, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {specCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{specCategoryLabels[cat].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Label (e.g., Engine Type)"
                      value={newSpec.label}
                      onChange={(e) => setNewSpec({ ...newSpec, label: e.target.value })}
                    />
                    <Input
                      placeholder="Value (e.g., 1.5L Turbo Petrol)"
                      value={newSpec.value}
                      onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })}
                    />
                    <Button 
                      onClick={() => {
                        if (!newSpec.label || !newSpec.value) return;
                        addSpecMutation.mutate({ 
                          carId: selectedCar.id, 
                          category: newSpec.category, 
                          label: newSpec.label, 
                          value: newSpec.value 
                        });
                        setNewSpec({ ...newSpec, label: "", value: "" });
                      }}
                      disabled={!newSpec.label || !newSpec.value}
                    >
                      <Plus className="h-4 w-4 mr-2" />Add
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Price Breakup Tab */}
              <TabsContent value="pricing" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Variant-wise Pricing</h4>
                    <p className="text-sm text-muted-foreground">Manage ex-showroom and on-road prices for each variant</p>
                  </div>
                  <Select value={priceBreakupState} onValueChange={setPriceBreakupState}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {stateRates.map((state) => (
                        <SelectItem key={state.code} value={state.code}>{state.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCar.variants.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCar.variants.map((variant) => {
                      const breakup = calculateStatePriceBreakup(variant.ex_showroom || variant.price_numeric || 0, priceBreakupState);
                      return (
                        <Card key={variant.id} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h5 className="font-semibold">{variant.name}</h5>
                              <div className="flex gap-2 mt-1">
                                {variant.fuel_type && <Badge variant="outline">{variant.fuel_type}</Badge>}
                                {variant.transmission && <Badge variant="secondary">{variant.transmission}</Badge>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">₹{breakup.onRoadPrice.toLocaleString('en-IN')}</p>
                              <p className="text-xs text-muted-foreground">On-road in {stateRates.find(s => s.code === priceBreakupState)?.name}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-muted-foreground text-xs">Ex-Showroom</p>
                              <p className="font-medium">₹{(variant.ex_showroom || variant.price_numeric || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-muted-foreground text-xs">RTO + Road Tax</p>
                              <p className="font-medium">₹{(breakup.rto + breakup.roadTax).toLocaleString('en-IN')}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-muted-foreground text-xs">Insurance</p>
                              <p className="font-medium">₹{breakup.insurance.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="bg-muted/50 p-2 rounded">
                              <p className="text-muted-foreground text-xs">Others</p>
                              <p className="font-medium">₹{(breakup.fastag + breakup.registration + breakup.handling + breakup.tcs).toLocaleString('en-IN')}</p>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-3">
                            <Input
                              type="number"
                              placeholder="Update Ex-Showroom"
                              className="max-w-[200px]"
                              defaultValue={variant.ex_showroom || variant.price_numeric || ""}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (val && val !== (variant.ex_showroom || variant.price_numeric)) {
                                  updateVariantPriceMutation.mutate({
                                    variantId: variant.id,
                                    updates: { ex_showroom: val, price_numeric: val }
                                  });
                                }
                              }}
                            />
                            <Button variant="outline" size="sm" onClick={() => {
                              const newOnRoad = calculateStatePriceBreakup(variant.ex_showroom || variant.price_numeric || 0, priceBreakupState).onRoadPrice;
                              updateVariantPriceMutation.mutate({
                                variantId: variant.id,
                                updates: { on_road_price: newOnRoad }
                              });
                            }}>
                              <Save className="h-4 w-4 mr-1" />
                              Save On-Road
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No variants to price. Add variants first in the Variants tab.</p>
                  </div>
                )}
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

      {/* Excel-Style Add Car Dialog */}
      <Dialog open={isAddCarOpen} onOpenChange={setIsAddCarOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[85vh] p-0 overflow-hidden">
          <ExcelCarEntry onClose={() => setIsAddCarOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
