import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Search, 
  RefreshCw, 
  Image as ImageIcon, 
  Download,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Sparkles
} from "lucide-react";

interface CarColorWithCar {
  id: string;
  name: string;
  hex_code: string;
  image_url: string | null;
  image_sync_status: string | null;
  image_synced_at: string | null;
  image_source: string | null;
  car_id: string;
  cars: {
    id: string;
    name: string;
    brand: string;
    slug: string;
  };
}

interface SyncResult {
  carId: string;
  colorId: string;
  colorName: string;
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export const CarImageSyncManager = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<SyncResult[]>([]);

  // Fetch car colors with car details
  const { data: carColors, isLoading, refetch } = useQuery({
    queryKey: ['adminCarColorImages', searchQuery, brandFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('car_colors')
        .select(`
          id,
          name,
          hex_code,
          image_url,
          image_sync_status,
          image_synced_at,
          image_source,
          car_id,
          cars!inner(id, name, brand, slug)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data as unknown as CarColorWithCar[];

      // Apply filters
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(q) ||
          c.cars.name.toLowerCase().includes(q) ||
          c.cars.brand.toLowerCase().includes(q)
        );
      }

      if (brandFilter !== 'all') {
        filtered = filtered.filter(c => c.cars.brand === brandFilter);
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          filtered = filtered.filter(c => !c.image_url || c.image_sync_status === 'pending');
        } else if (statusFilter === 'synced') {
          filtered = filtered.filter(c => c.image_sync_status === 'synced');
        } else if (statusFilter === 'failed') {
          filtered = filtered.filter(c => c.image_sync_status === 'failed');
        }
      }

      return filtered;
    },
  });

  // Get unique brands for filter
  const brands = [...new Set(carColors?.map(c => c.cars.brand) || [])].sort();

  // Stats
  const stats = {
    total: carColors?.length || 0,
    synced: carColors?.filter(c => c.image_sync_status === 'synced').length || 0,
    pending: carColors?.filter(c => !c.image_url || c.image_sync_status === 'pending').length || 0,
    failed: carColors?.filter(c => c.image_sync_status === 'failed').length || 0,
  };

  // Sync single color
  const syncSingleColor = useMutation({
    mutationFn: async (color: CarColorWithCar) => {
      const { data, error } = await supabase.functions.invoke('fetch-car-images', {
        body: {
          carId: color.car_id,
          colorId: color.id
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Image synced successfully');
      queryClient.invalidateQueries({ queryKey: ['adminCarColorImages'] });
    },
    onError: (error: Error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  // Batch sync
  const batchSync = async () => {
    const colorsToSync = selectedColors.length > 0
      ? carColors?.filter(c => selectedColors.includes(c.id))
      : carColors?.filter(c => !c.image_url || c.image_sync_status === 'pending');

    if (!colorsToSync || colorsToSync.length === 0) {
      toast.error('No colors to sync');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncLogs([]);

    try {
      for (let i = 0; i < colorsToSync.length; i++) {
        const color = colorsToSync[i];
        
        try {
          const { data, error } = await supabase.functions.invoke('fetch-car-images', {
            body: {
              carId: color.car_id,
              colorId: color.id
            }
          });

          const result = data?.results?.[0] || { success: false, error: error?.message };
          setSyncLogs(prev => [...prev, {
            carId: color.car_id,
            colorId: color.id,
            colorName: `${color.cars.brand} ${color.cars.name} - ${color.name}`,
            ...result
          }]);
        } catch (err) {
          setSyncLogs(prev => [...prev, {
            carId: color.car_id,
            colorId: color.id,
            colorName: `${color.cars.brand} ${color.cars.name} - ${color.name}`,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          }]);
        }

        setSyncProgress(((i + 1) / colorsToSync.length) * 100);
        
        // Delay between requests
        if (i < colorsToSync.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      toast.success('Batch sync completed');
      queryClient.invalidateQueries({ queryKey: ['adminCarColorImages'] });
    } finally {
      setIsSyncing(false);
      setSelectedColors([]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedColors.length === carColors?.length) {
      setSelectedColors([]);
    } else {
      setSelectedColors(carColors?.map(c => c.id) || []);
    }
  };

  const getStatusBadge = (status: string | null, hasImage: boolean) => {
    if (!hasImage || status === 'pending') {
      return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    if (status === 'synced') {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Synced</Badge>;
    }
    if (status === 'failed') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Image Sync
          </h2>
          <p className="text-muted-foreground">
            Auto-fetch color-wise car images using AI
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={batchSync} 
            disabled={isSyncing}
          >
            {isSyncing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Syncing...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Sync {selectedColors.length > 0 ? `Selected (${selectedColors.length})` : 'Pending'}</>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Colors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
            <p className="text-xs text-muted-foreground">Synced</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Progress */}
      {isSyncing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sync Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={syncProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">{Math.round(syncProgress)}% complete</p>
            
            {syncLogs.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                {syncLogs.map((log, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded ${log.success ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                    {log.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                    <span>{log.colorName}</span>
                    {log.error && <span className="text-red-600 ml-auto">{log.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cars or colors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Colors Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedColors.length === carColors?.length && carColors?.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : carColors && carColors.length > 0 ? (
                  carColors.map((color) => (
                    <TableRow key={color.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedColors.includes(color.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColors(prev => [...prev, color.id]);
                            } else {
                              setSelectedColors(prev => prev.filter(id => id !== color.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{color.cars.name}</div>
                          <div className="text-sm text-muted-foreground">{color.cars.brand}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: color.hex_code }}
                          />
                          <span>{color.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {color.image_url ? (
                          <div className="h-12 w-20 rounded overflow-hidden bg-muted">
                            <img 
                              src={color.image_url} 
                              alt={`${color.cars.name} ${color.name}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-20 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(color.image_sync_status, !!color.image_url)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {color.image_source || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => syncSingleColor.mutate(color)}
                          disabled={syncSingleColor.isPending}
                        >
                          {syncSingleColor.isPending ? (
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No colors found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
