import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Image as ImageIcon, 
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Play,
  AlertTriangle
} from "lucide-react";

interface CarWithImageStatus {
  id: string;
  name: string;
  brand: string;
  slug: string;
  image_count: number;
  images_synced: boolean | null;
  images_synced_at: string | null;
}

export const CarImageScrapingManager = () => {
  const queryClient = useQueryClient();
  const [isBatchScraping, setIsBatchScraping] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState<{ processed: number; imagesAdded: number; failed: string[] } | null>(null);

  // Fetch cars with their image counts
  const { data: carsWithStatus, isLoading, refetch } = useQuery({
    queryKey: ['admin-car-image-status'],
    queryFn: async () => {
      // Get all cars
      const { data: cars, error } = await supabase
        .from('cars')
        .select('id, name, brand, slug, images_synced, images_synced_at')
        .eq('is_discontinued', false)
        .order('brand')
        .order('name');

      if (error) throw error;

      // Get image counts per car (only Supabase-hosted)
      const { data: imageCounts } = await supabase
        .from('car_images')
        .select('car_id')
        .ilike('url', '%supabase.co%');

      const countMap = new Map<string, number>();
      (imageCounts || []).forEach(img => {
        countMap.set(img.car_id, (countMap.get(img.car_id) || 0) + 1);
      });

      return (cars || []).map(car => ({
        ...car,
        image_count: countMap.get(car.id) || 0,
      })) as CarWithImageStatus[];
    },
  });

  // Stats
  const stats = {
    total: carsWithStatus?.length || 0,
    withImages: carsWithStatus?.filter(c => c.image_count > 0).length || 0,
    withoutImages: carsWithStatus?.filter(c => c.image_count === 0).length || 0,
  };

  // Scrape single car
  const scrapeSingle = useMutation({
    mutationFn: async (carId: string) => {
      const { data, error } = await supabase.functions.invoke('scrape-car-images', {
        body: { carId, mode: 'single' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Added ${data.imagesAdded} images for ${data.car}`);
      } else {
        toast.error(data.error || 'Failed to scrape images');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-car-image-status'] });
    },
    onError: (error: Error) => {
      toast.error(`Scrape failed: ${error.message}`);
    }
  });

  // Batch scrape
  const startBatchScrape = async () => {
    setIsBatchScraping(true);
    setBatchProgress(0);
    setBatchResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-car-images', {
        body: { mode: 'batch', limit: 10 }
      });

      if (error) throw error;

      if (data.success) {
        setBatchResults(data.results);
        toast.success(`Batch complete: ${data.results.imagesAdded} images added for ${data.results.processed} cars`);
      } else {
        toast.error(data.error || 'Batch scrape failed');
      }

      queryClient.invalidateQueries({ queryKey: ['admin-car-image-status'] });
    } catch (error) {
      toast.error(`Batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsBatchScraping(false);
      setBatchProgress(100);
    }
  };

  const carsWithoutImages = carsWithStatus?.filter(c => c.image_count === 0) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Image Scraping Manager
          </h2>
          <p className="text-muted-foreground">
            Scrape real car images from CarDekho, CarWale & OEM sites via Firecrawl
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={startBatchScrape} 
            disabled={isBatchScraping || stats.withoutImages === 0}
          >
            {isBatchScraping ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scraping...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" />Batch Scrape ({Math.min(10, stats.withoutImages)})</>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Cars</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.withImages}</div>
            <p className="text-xs text-muted-foreground">With Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.withoutImages}</div>
            <p className="text-xs text-muted-foreground">Missing Images</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Progress */}
      {isBatchScraping && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Batch Scraping in Progress...</CardTitle>
            <CardDescription>Scraping images from CardekHo, CarWale, and OEM websites</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Processing up to 10 cars. This may take a few minutes...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Results */}
      {batchResults && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Batch Scrape Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{batchResults.processed}</div>
                <p className="text-xs text-muted-foreground">Cars Processed</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{batchResults.imagesAdded}</div>
                <p className="text-xs text-muted-foreground">Images Added</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{batchResults.failed.length}</div>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
            {batchResults.failed.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Failed cars:</p>
                <p className="text-sm text-red-600 dark:text-red-300">{batchResults.failed.join(', ')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cars Missing Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Cars Missing Images ({carsWithoutImages.length})
          </CardTitle>
          <CardDescription>
            These cars need images scraped from external sources
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : carsWithoutImages.length > 0 ? (
                  carsWithoutImages.slice(0, 50).map((car) => (
                    <TableRow key={car.id}>
                      <TableCell className="font-medium">{car.name}</TableCell>
                      <TableCell>{car.brand}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-yellow-600">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => scrapeSingle.mutate(car.id)}
                          disabled={scrapeSingle.isPending}
                        >
                          {scrapeSingle.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <><Download className="h-4 w-4 mr-1" />Scrape</>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      All cars have images!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cars With Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Cars With Images ({stats.withImages})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Synced At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carsWithStatus?.filter(c => c.image_count > 0).slice(0, 30).map((car) => (
                  <TableRow key={car.id}>
                    <TableCell className="font-medium">{car.name}</TableCell>
                    <TableCell>{car.brand}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-600">
                        {car.image_count} images
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {car.images_synced_at 
                        ? new Date(car.images_synced_at).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
