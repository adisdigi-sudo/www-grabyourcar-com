import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { invalidateCarQueries } from "@/lib/queryInvalidation";
import { format } from "date-fns";
import { Search, Plus, Eye, RefreshCw, Car, Image as ImageIcon, Trash2, Upload } from "lucide-react";

interface CarImage {
  id: string;
  car_id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
}

interface CarWithImages {
  id: string;
  name: string;
  brand: string;
  images: CarImage[];
}

export const CarImageManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCar, setSelectedCar] = useState<CarWithImages | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Fetch cars with images
  const { data: cars, isLoading, refetch } = useQuery({
    queryKey: ['adminCarImages', searchQuery],
    queryFn: async () => {
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('id, name, brand')
        .order('brand')
        .order('name');
      
      if (carsError) throw carsError;

      // Fetch images for each car
      const carsWithImages = await Promise.all(
        (carsData || []).map(async (car) => {
          const { data: images } = await supabase
            .from('car_images')
            .select('*')
            .eq('car_id', car.id)
            .order('sort_order');
          
          return {
            ...car,
            images: images || [],
          } as CarWithImages;
        })
      );

      // Filter by search query
      if (searchQuery) {
        return carsWithImages.filter(car => 
          car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          car.brand.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return carsWithImages;
    },
  });

  // Stats
  const stats = {
    totalCars: cars?.length || 0,
    carsWithImages: cars?.filter(c => c.images.length > 0).length || 0,
    carsWithoutImages: cars?.filter(c => c.images.length === 0).length || 0,
    totalImages: cars?.reduce((acc, c) => acc + c.images.length, 0) || 0,
  };

  const handleViewImages = (car: CarWithImages) => {
    setSelectedCar(car);
    setIsViewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Car Images</h2>
          <p className="text-muted-foreground">
            Manage car gallery images
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
            <div className="text-2xl font-bold text-green-600">{stats.carsWithImages}</div>
            <p className="text-xs text-muted-foreground">With Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.carsWithoutImages}</div>
            <p className="text-xs text-muted-foreground">Without Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalImages}</div>
            <p className="text-xs text-muted-foreground">Total Images</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
                  <TableHead>Images</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
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
                        <Badge variant={car.images.length > 0 ? "default" : "destructive"}>
                          {car.images.length} images
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {car.images.find(img => img.is_primary) ? (
                          <div className="h-10 w-14 rounded overflow-hidden bg-muted">
                            <img 
                              src={car.images.find(img => img.is_primary)?.url} 
                              alt={car.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No primary</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewImages(car)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No cars found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Images Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedCar?.brand} {selectedCar?.name} - Images</DialogTitle>
            <DialogDescription>
              {selectedCar?.images.length || 0} images in gallery
            </DialogDescription>
          </DialogHeader>
          
          {selectedCar && (
            <div className="space-y-4">
              {selectedCar.images.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {selectedCar.images.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={image.url} 
                          alt={image.alt_text || selectedCar.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      {image.is_primary && (
                        <Badge className="absolute top-2 left-2 bg-primary">Primary</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No images for this car</p>
                </div>
              )}

              <div className="border-t pt-4">
                <Label>Add New Image URL</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <Button disabled={!newImageUrl}>
                    <Upload className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
