import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  Eye, 
  RefreshCw, 
  Palette, 
  Image as ImageIcon, 
  Trash2, 
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Edit3,
  Save,
  Loader2
} from "lucide-react";

interface CarColor {
  id: string;
  car_id: string;
  name: string;
  hex_code: string;
  image_url: string | null;
  sort_order: number | null;
}

interface CarWithColors {
  id: string;
  name: string;
  brand: string;
  slug: string;
  colors: CarColor[];
}

interface ImportPreview {
  carName: string;
  colorName: string;
  hexCode: string;
  imageUrl: string;
  status: 'valid' | 'warning' | 'error';
  message?: string;
}

const SAMPLE_CSV = `car_slug,color_name,hex_code,image_url
maruti-swift,Pearl Arctic White,#FAFAFA,https://example.com/swift-white.jpg
maruti-swift,Midnight Blue,#1A237E,https://example.com/swift-blue.jpg
maruti-swift,Solid Fire Red,#C62828,https://example.com/swift-red.jpg
hyundai-creta,Atlas White,#F5F5F5,https://example.com/creta-white.jpg
hyundai-creta,Titan Grey,#4A4A4A,https://example.com/creta-grey.jpg
tata-nexon,Pristine White,#FFFFFF,https://example.com/nexon-white.jpg
tata-nexon,Flame Red,#D32F2F,https://example.com/nexon-red.jpg`;

export const CarColorManagement = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCar, setSelectedCar] = useState<CarWithColors | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [editingColor, setEditingColor] = useState<CarColor | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Fetch cars with colors
  const { data: cars, isLoading, refetch } = useQuery({
    queryKey: ['adminCarColors', searchQuery, selectedBrand],
    queryFn: async () => {
      let query = supabase
        .from('cars')
        .select('id, name, brand, slug')
        .order('brand')
        .order('name');
      
      if (selectedBrand && selectedBrand !== 'all') {
        query = query.eq('brand', selectedBrand);
      }
      
      const { data: carsData, error: carsError } = await query;
      
      if (carsError) throw carsError;

      // Fetch colors for each car
      const carsWithColors = await Promise.all(
        (carsData || []).map(async (car) => {
          const { data: colors } = await supabase
            .from('car_colors')
            .select('*')
            .eq('car_id', car.id)
            .order('sort_order');
          
          return {
            ...car,
            colors: colors || [],
          } as CarWithColors;
        })
      );

      // Filter by search query
      if (searchQuery) {
        return carsWithColors.filter(car => 
          car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          car.brand.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return carsWithColors;
    },
  });

  // Fetch unique brands
  const { data: brands } = useQuery({
    queryKey: ['carBrands'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cars')
        .select('brand')
        .order('brand');
      
      const uniqueBrands = [...new Set(data?.map(c => c.brand) || [])];
      return uniqueBrands;
    },
  });

  // Update color mutation
  const updateColorMutation = useMutation({
    mutationFn: async ({ colorId, imageUrl }: { colorId: string; imageUrl: string }) => {
      const { error } = await supabase
        .from('car_colors')
        .update({ image_url: imageUrl })
        .eq('id', colorId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCarColors'] });
      toast.success('Color image updated');
      setEditingColor(null);
      setNewImageUrl("");
    },
    onError: () => {
      toast.error('Failed to update color image');
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
      queryClient.invalidateQueries({ queryKey: ['adminCarColors'] });
      toast.success('Color deleted');
    },
    onError: () => {
      toast.error('Failed to delete color');
    },
  });

  // Stats
  const stats = {
    totalCars: cars?.length || 0,
    carsWithColors: cars?.filter(c => c.colors.length > 0).length || 0,
    colorsWithImages: cars?.reduce((acc, c) => acc + c.colors.filter(color => color.image_url).length, 0) || 0,
    totalColors: cars?.reduce((acc, c) => acc + c.colors.length, 0) || 0,
  };

  const handleViewColors = (car: CarWithColors) => {
    setSelectedCar(car);
    setIsViewOpen(true);
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'car_colors_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast.loading('Processing file...');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validate headers
      const requiredHeaders = ['car_slug', 'color_name', 'hex_code', 'image_url'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        toast.dismiss();
        toast.error(`Missing columns: ${missingHeaders.join(', ')}`);
        return;
      }

      // Fetch all cars for validation
      const { data: allCars } = await supabase.from('cars').select('id, slug, name, brand');
      const carsBySlug = new Map(allCars?.map(c => [c.slug, c]) || []);

      // Parse and validate data
      const preview: ImportPreview[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        const car = carsBySlug.get(row.car_slug);
        
        if (!car) {
          preview.push({
            carName: row.car_slug,
            colorName: row.color_name,
            hexCode: row.hex_code,
            imageUrl: row.image_url,
            status: 'error',
            message: 'Car not found in database',
          });
        } else if (!row.color_name || !row.hex_code) {
          preview.push({
            carName: `${car.brand} ${car.name}`,
            colorName: row.color_name || 'Missing',
            hexCode: row.hex_code || 'Missing',
            imageUrl: row.image_url,
            status: 'error',
            message: 'Color name or hex code missing',
          });
        } else if (!row.image_url) {
          preview.push({
            carName: `${car.brand} ${car.name}`,
            colorName: row.color_name,
            hexCode: row.hex_code,
            imageUrl: '',
            status: 'warning',
            message: 'No image URL provided',
          });
        } else {
          preview.push({
            carName: `${car.brand} ${car.name}`,
            colorName: row.color_name,
            hexCode: row.hex_code,
            imageUrl: row.image_url,
            status: 'valid',
          });
        }
      }

      toast.dismiss();
      setImportPreview(preview);
      setIsImportOpen(true);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to parse file');
    }
  };

  const processImport = async () => {
    const validRows = importPreview.filter(row => row.status !== 'error');
    
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Fetch all cars for matching
      const { data: allCars } = await supabase.from('cars').select('id, slug, name, brand');
      const carsByName = new Map(allCars?.map(c => [`${c.brand} ${c.name}`, c]) || []);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const car = carsByName.get(row.carName);
        
        if (car) {
          // Check if color already exists
          const { data: existingColors } = await supabase
            .from('car_colors')
            .select('id')
            .eq('car_id', car.id)
            .eq('name', row.colorName);

          if (existingColors && existingColors.length > 0) {
            // Update existing color
            const { error } = await supabase
              .from('car_colors')
              .update({ 
                hex_code: row.hexCode, 
                image_url: row.imageUrl || null 
              })
              .eq('id', existingColors[0].id);
            
            if (error) {
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            // Get max sort_order for this car
            const { data: maxOrder } = await supabase
              .from('car_colors')
              .select('sort_order')
              .eq('car_id', car.id)
              .order('sort_order', { ascending: false })
              .limit(1);
            
            const newOrder = (maxOrder?.[0]?.sort_order ?? -1) + 1;

            // Insert new color
            const { error } = await supabase
              .from('car_colors')
              .insert({
                car_id: car.id,
                name: row.colorName,
                hex_code: row.hexCode,
                image_url: row.imageUrl || null,
                sort_order: newOrder,
              });
            
            if (error) {
              errorCount++;
            } else {
              successCount++;
            }
          }
        }

        setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
      }

      toast.success(`Import complete: ${successCount} successful, ${errorCount} errors`);
      queryClient.invalidateQueries({ queryKey: ['adminCarColors'] });
      setIsImportOpen(false);
      setImportPreview([]);
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const exportColorsToCSV = async () => {
    toast.loading('Exporting...');
    
    try {
      const { data: allCars } = await supabase.from('cars').select('id, slug, name, brand');
      const { data: allColors } = await supabase.from('car_colors').select('*');
      
      const carsById = new Map(allCars?.map(c => [c.id, c]) || []);
      
      const csvRows = ['car_slug,car_name,car_brand,color_name,hex_code,image_url'];
      
      allColors?.forEach(color => {
        const car = carsById.get(color.car_id);
        if (car) {
          csvRows.push(`${car.slug},"${car.name}","${car.brand}","${color.name}",${color.hex_code},${color.image_url || ''}`);
        }
      });
      
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `car_colors_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.dismiss();
      toast.success('Colors exported');
    } catch (error) {
      toast.dismiss();
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Car Color Management
          </h2>
          <p className="text-muted-foreground">
            Manage color swatches and color-specific images for all cars
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadSampleCSV}>
            <Download className="h-4 w-4 mr-2" />
            Sample CSV
          </Button>
          <Button variant="outline" onClick={exportColorsToCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import Colors
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalCars}</div>
            <p className="text-xs text-muted-foreground">Total Cars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{stats.carsWithColors}</div>
            <p className="text-xs text-muted-foreground">With Colors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalColors}</div>
            <p className="text-xs text-muted-foreground">Total Colors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-success">{stats.colorsWithImages}</div>
            <p className="text-xs text-muted-foreground">Colors with Images</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands?.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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
                  <TableHead>Colors</TableHead>
                  <TableHead>With Images</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : cars && cars.length > 0 ? (
                  cars.map((car) => (
                    <TableRow key={car.id}>
                      <TableCell className="font-medium">{car.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{car.brand}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={car.colors.length > 0 ? "default" : "destructive"}>
                          {car.colors.length} colors
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {car.colors.filter(c => c.image_url).length}/{car.colors.length} images
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {car.colors.slice(0, 5).map((color) => (
                            <div
                              key={color.id}
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: color.hex_code }}
                              title={color.name}
                            />
                          ))}
                          {car.colors.length > 5 && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                              +{car.colors.length - 5}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewColors(car)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No cars found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View/Edit Colors Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {selectedCar?.brand} {selectedCar?.name} - Colors
            </DialogTitle>
            <DialogDescription>
              {selectedCar?.colors.length || 0} colors configured
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 max-h-[60vh]">
            {selectedCar && (
              <div className="space-y-4 pr-4">
                {selectedCar.colors.length > 0 ? (
                  <div className="grid gap-4">
                    {selectedCar.colors.map((color) => (
                      <div 
                        key={color.id} 
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                      >
                        <div
                          className="w-12 h-12 rounded-xl border-2 border-white shadow-md shrink-0"
                          style={{ backgroundColor: color.hex_code }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{color.name}</p>
                          <p className="text-sm text-muted-foreground">{color.hex_code}</p>
                        </div>
                        {color.image_url ? (
                          <div className="relative group">
                            <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted">
                              <img 
                                src={color.image_url} 
                                alt={color.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <Badge className="absolute -top-2 -right-2 bg-success">
                              <Check className="h-3 w-3" />
                            </Badge>
                          </div>
                        ) : (
                          <div className="w-20 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingColor(color);
                              setNewImageUrl(color.image_url || '');
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this color?')) {
                                deleteColorMutation.mutate(color.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No colors configured for this car</p>
                    <p className="text-sm mt-1">Import colors using CSV upload</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Edit Color Image */}
          {editingColor && (
            <div className="border-t pt-4 mt-4">
              <Label className="flex items-center gap-2 mb-2">
                <Edit3 className="h-4 w-4" />
                Edit Image URL for "{editingColor.name}"
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/car-color-image.jpg"
                />
                <Button 
                  onClick={() => updateColorMutation.mutate({ 
                    colorId: editingColor.id, 
                    imageUrl: newImageUrl 
                  })}
                  disabled={updateColorMutation.isPending}
                >
                  {updateColorMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setEditingColor(null);
                    setNewImageUrl("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Preview
            </DialogTitle>
            <DialogDescription>
              Review data before importing. {importPreview.filter(r => r.status === 'valid').length} valid, {importPreview.filter(r => r.status === 'warning').length} warnings, {importPreview.filter(r => r.status === 'error').length} errors
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[50vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Hex</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {row.status === 'valid' && (
                        <Badge className="bg-success"><Check className="h-3 w-3" /></Badge>
                      )}
                      {row.status === 'warning' && (
                        <Badge className="bg-accent"><AlertTriangle className="h-3 w-3" /></Badge>
                      )}
                      {row.status === 'error' && (
                        <Badge variant="destructive"><X className="h-3 w-3" /></Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{row.carName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: row.hexCode }}
                        />
                        {row.colorName}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.hexCode}</TableCell>
                    <TableCell>
                      {row.imageUrl ? (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Has URL
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {isImporting && (
            <div className="space-y-2 py-4">
              <Progress value={importProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Importing... {importProgress}%
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button 
              onClick={processImport} 
              disabled={isImporting || importPreview.filter(r => r.status !== 'error').length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {importPreview.filter(r => r.status !== 'error').length} Colors
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
