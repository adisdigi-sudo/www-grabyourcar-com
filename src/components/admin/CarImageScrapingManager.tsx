import { useState, useCallback } from "react";
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
  AlertTriangle,
  Pause
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

interface BatchProgress {
  current: number;
  total: number;
  currentCar: string;
  imagesAdded: number;
  failed: string[];
}

export const CarImageScrapingManager = () => {
  const queryClient = useQueryClient();
  const [isBatchScraping, setIsBatchScraping] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  // Fetch cars with their image counts
  const { data: carsWithStatus, isLoading, refetch } = useQuery({
    queryKey: ['admin-car-image-status'],
    queryFn: async () => {
      // Get all active cars
      const { data: cars, error } = await supabase
        .from('cars')
        .select('id, name, brand, slug, images_synced, images_synced_at')
        .eq('is_discontinued', false)
        .order('brand')
        .order('name');

      if (error) throw error;

      // Get image counts per car (only Supabase-hosted authentic images)
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
    totalImages: carsWithStatus?.reduce((sum, c) => sum + c.image_count, 0) || 0,
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

  // Sequential batch scrape (one car at a time to avoid timeout)
  const startSequentialScrape = useCallback(async () => {
    const carsWithoutImages = carsWithStatus?.filter(c => c.image_count === 0) || [];
    if (carsWithoutImages.length === 0) {
      toast.info('All cars already have images!');
      return;
    }

    setIsBatchScraping(true);
    setShouldStop(false);
    setBatchProgress({
      current: 0,
      total: Math.min(carsWithoutImages.length, 50), // Max 50 at a time
      currentCar: '',
      imagesAdded: 0,
      failed: []
    });

    const toProcess = carsWithoutImages.slice(0, 50);

    for (let i = 0; i < toProcess.length; i++) {
      if (shouldStop) {
        toast.info('Batch scrape stopped by user');
        break;
      }

      const car = toProcess[i];
      setBatchProgress(prev => prev ? {
        ...prev,
        current: i + 1,
        currentCar: `${car.brand} ${car.name}`
      } : null);

      try {
        const { data, error } = await supabase.functions.invoke('scrape-car-images', {
          body: { carId: car.id, mode: 'single' }
        });

        if (error || !data?.success) {
          setBatchProgress(prev => prev ? {
            ...prev,
            failed: [...prev.failed, `${car.brand} ${car.name}`]
          } : null);
        } else {
          setBatchProgress(prev => prev ? {
            ...prev,
            imagesAdded: prev.imagesAdded + (data.imagesAdded || 0)
          } : null);
        }
      } catch (e) {
        setBatchProgress(prev => prev ? {
          ...prev,
          failed: [...prev.failed, `${car.brand} ${car.name}`]
        } : null);
      }

      // Small delay between cars
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsBatchScraping(false);
    queryClient.invalidateQueries({ queryKey: ['admin-car-image-status'] });
    toast.success(`Batch complete: ${batchProgress?.imagesAdded || 0} images added`);
  }, [carsWithStatus, shouldStop, queryClient, batchProgress]);

  const stopBatchScrape = useCallback(() => {
    setShouldStop(true);
  }, []);

  const carsWithoutImages = carsWithStatus?.filter(c => c.image_count === 0) || [];
  const carsWithImages = carsWithStatus?.filter(c => c.image_count > 0) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            OEM Image Sync Manager
          </h2>
          <p className="text-muted-foreground">
            Fetch authentic car images directly from official manufacturer websites
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isBatchScraping}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {isBatchScraping ? (
            <Button variant="destructive" onClick={stopBatchScrape}>
              <Pause className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button 
              onClick={startSequentialScrape} 
              disabled={stats.withoutImages === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              Sync All ({Math.min(50, stats.withoutImages)})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <p className="text-xs text-muted-foreground">Need Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalImages}</div>
            <p className="text-xs text-muted-foreground">Total Images</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch Progress */}
      {isBatchScraping && batchProgress && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Syncing from OEM Sources...
            </CardTitle>
            <CardDescription>
              Processing {batchProgress.current} of {batchProgress.total} cars
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={(batchProgress.current / batchProgress.total) * 100} />
            <div className="flex justify-between text-sm">
              <span>Current: <strong>{batchProgress.currentCar}</strong></span>
              <span className="text-green-600">{batchProgress.imagesAdded} images added</span>
            </div>
            {batchProgress.failed.length > 0 && (
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded text-sm">
                <span className="text-red-600 dark:text-red-300">
                  Failed: {batchProgress.failed.slice(-3).join(', ')}
                  {batchProgress.failed.length > 3 && ` (+${batchProgress.failed.length - 3} more)`}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Batch Results Summary (after completion) */}
      {!isBatchScraping && batchProgress && batchProgress.current > 0 && (
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
                <div className="text-2xl font-bold">{batchProgress.current}</div>
                <p className="text-xs text-muted-foreground">Cars Processed</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{batchProgress.imagesAdded}</div>
                <p className="text-xs text-muted-foreground">Images Added</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{batchProgress.failed.length}</div>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cars Missing Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Cars Needing Images ({carsWithoutImages.length})
          </CardTitle>
          <CardDescription>
            Click "Sync" to fetch authentic images from official OEM websites
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
                          disabled={scrapeSingle.isPending || isBatchScraping}
                        >
                          {scrapeSingle.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <><Download className="h-4 w-4 mr-1" />Sync</>
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
            Cars With Images ({carsWithImages.length})
          </CardTitle>
          <CardDescription>
            Cars with authentic images synced from official manufacturer sources
          </CardDescription>
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
                {carsWithImages.slice(0, 30).map((car) => (
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
