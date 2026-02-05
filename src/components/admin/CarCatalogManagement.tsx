import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Edit, Trash2, Eye, RefreshCw, Car, Image, Filter, Download, Upload } from "lucide-react";

interface Car {
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
  updated_at: string;
}

export const CarCatalogManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    body_type: "",
    price_range: "",
    price_numeric: "",
    overview: "",
    tagline: "",
    is_hot: false,
    is_new: false,
    is_upcoming: false,
    is_bestseller: false,
  });

  // Fetch cars
  const { data: cars, isLoading, refetch } = useQuery({
    queryKey: ['adminCarCatalog', brandFilter, searchQuery],
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
        query = query.or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Car[];
    },
  });

  // Get unique brands
  const brands = [...new Set(cars?.map(car => car.brand) || [])].sort();

  // Update car mutation
  const updateCarMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Car> }) => {
      const { error } = await supabase
        .from('cars')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCarCatalog'] });
      toast.success('Car updated successfully');
      setIsEditOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update car');
      console.error(error);
    },
  });

  const handleEdit = (car: Car) => {
    setSelectedCar(car);
    setFormData({
      name: car.name || "",
      brand: car.brand || "",
      body_type: car.body_type || "",
      price_range: car.price_range || "",
      price_numeric: car.price_numeric?.toString() || "",
      overview: car.overview || "",
      tagline: car.tagline || "",
      is_hot: car.is_hot || false,
      is_new: car.is_new || false,
      is_upcoming: car.is_upcoming || false,
      is_bestseller: car.is_bestseller || false,
    });
    setIsEditOpen(true);
  };

  const handleSave = () => {
    if (!selectedCar) return;
    
    updateCarMutation.mutate({
      id: selectedCar.id,
      updates: {
        name: formData.name,
        brand: formData.brand,
        body_type: formData.body_type,
        price_range: formData.price_range,
        price_numeric: formData.price_numeric ? parseInt(formData.price_numeric) : null,
        overview: formData.overview,
        tagline: formData.tagline,
        is_hot: formData.is_hot,
        is_new: formData.is_new,
        is_upcoming: formData.is_upcoming,
        is_bestseller: formData.is_bestseller,
      }
    });
  };

  const handleToggleFlag = (carId: string, flag: keyof Car, value: boolean) => {
    updateCarMutation.mutate({
      id: carId,
      updates: { [flag]: value }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Car Catalog</h2>
          <p className="text-muted-foreground">
            Manage all cars, prices, and specifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Car
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{cars?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total Cars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {cars?.filter(c => c.is_hot).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Hot Deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {cars?.filter(c => c.is_new).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">New Arrivals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">
              {cars?.filter(c => c.is_upcoming).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Upcoming</p>
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
                placeholder="Search cars..."
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
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
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
                  <TableHead>Body Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : cars && cars.length > 0 ? (
                  cars.map((car) => (
                    <TableRow key={car.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                            <Car className="h-5 w-5 text-muted-foreground" />
                          </div>
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
                        {car.is_upcoming ? (
                          <Badge variant="secondary">Upcoming</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {car.is_hot && <Badge variant="destructive" className="text-xs">Hot</Badge>}
                          {car.is_new && <Badge className="bg-green-600 text-xs">New</Badge>}
                          {car.is_bestseller && <Badge className="bg-yellow-600 text-xs">Bestseller</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(car.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(`/car/${car.slug}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(car)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No cars found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Car</DialogTitle>
            <DialogDescription>
              Update car information and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Car Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Body Type</Label>
                <Select 
                  value={formData.body_type} 
                  onValueChange={(v) => setFormData({ ...formData, body_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select body type" />
                  </SelectTrigger>
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
                  value={formData.price_range}
                  onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                  placeholder="₹8.5L - ₹14L"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Tagline</Label>
                <Input
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="The Perfect Family SUV"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Overview</Label>
                <Textarea
                  value={formData.overview}
                  onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                  rows={4}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Display Flags</Label>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_hot" className="cursor-pointer">🔥 Hot Deal</Label>
                  <Switch
                    id="is_hot"
                    checked={formData.is_hot}
                    onCheckedChange={(v) => setFormData({ ...formData, is_hot: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_new" className="cursor-pointer">✨ New Arrival</Label>
                  <Switch
                    id="is_new"
                    checked={formData.is_new}
                    onCheckedChange={(v) => setFormData({ ...formData, is_new: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_upcoming" className="cursor-pointer">🚀 Upcoming</Label>
                  <Switch
                    id="is_upcoming"
                    checked={formData.is_upcoming}
                    onCheckedChange={(v) => setFormData({ ...formData, is_upcoming: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_bestseller" className="cursor-pointer">⭐ Bestseller</Label>
                  <Switch
                    id="is_bestseller"
                    checked={formData.is_bestseller}
                    onCheckedChange={(v) => setFormData({ ...formData, is_bestseller: v })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateCarMutation.isPending}>
              {updateCarMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
