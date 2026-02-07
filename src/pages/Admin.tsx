import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDatabaseStatus, useEnhanceCarAI } from "@/hooks/useCars";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Database, 
  RefreshCw, 
  Sparkles, 
  Car as CarIcon, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Zap,
  ShieldCheck,
  FileText,
  TrendingUp,
  Clock
} from "lucide-react";

interface DbCar {
  id: string;
  slug: string;
  name: string;
  brand: string;
  body_type: string;
  price_range: string;
  is_hot: boolean;
  is_new: boolean;
  is_upcoming: boolean;
  updated_at: string;
  data_freshness_score?: number;
  last_verified_at?: string;
}

interface ValidationResult {
  carId: string;
  carName: string;
  issues: string[];
  freshnessScore: number;
  needsUpdate: boolean;
}

interface ValidationSummary {
  totalCars: number;
  carsNeedingUpdate: number;
  averageFreshnessScore: number;
  criticalIssues: number;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  cars_processed: number | null;
  cars_enhanced: number | null;
  errors: string[] | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: hasData, isLoading: statusLoading, refetch: refetchStatus } = useDatabaseStatus();
  const enhanceMutation = useEnhanceCarAI();
  
  const [selectedCar, setSelectedCar] = useState<string>("");
  const [enhanceType, setEnhanceType] = useState<string>("overview");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const queryClient = useQueryClient();

  // Fetch cars from database
  const { data: dbCars, isLoading: carsLoading, refetch: refetchCars } = useQuery({
    queryKey: ['adminCars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('id, slug, name, brand, body_type, price_range, is_hot, is_new, is_upcoming, updated_at, data_freshness_score, last_verified_at')
        .order('brand')
        .order('name');
      
      if (error) throw error;
      return data as DbCar[];
    }
  });

  // Fetch sync logs
  const { data: syncLogs, isLoading: syncLogsLoading, refetch: refetchSyncLogs } = useQuery({
    queryKey: ['syncLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as SyncLog[];
    }
  });

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('validate-car-data', {
        body: { action: 'validate-all' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setValidationResults(data.results || []);
        setValidationSummary(data.summary || null);
        toast.success(`Validation complete! ${data.summary?.carsNeedingUpdate || 0} cars need attention.`);
        refetchCars();
      }
    },
    onError: (error) => {
      toast.error(`Validation failed: ${error.message}`);
    }
  });

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  // NOTE: Migration removed - database is the single source of truth
  // Use Firecrawl scraping via fetch-car-images for real data

  const handleEnhance = async () => {
    if (!selectedCar || !enhanceType) {
      toast.error('Please select a car and enhancement type');
      return;
    }

    toast.loading(`Enhancing ${enhanceType}...`, { id: 'enhance' });
    
    try {
      const result = await enhanceMutation.mutateAsync({
        carId: selectedCar,
        enhanceType: enhanceType as 'overview' | 'highlights' | 'pros_cons' | 'tagline'
      });
      
      if (result.success) {
        toast.success('Enhancement complete!', { id: 'enhance' });
        refetchCars();
      } else {
        toast.error(result.error || 'Enhancement failed', { id: 'enhance' });
      }
    } catch (error) {
      toast.error('Enhancement failed', { id: 'enhance' });
    }
  };

  const isLoading = authLoading || statusLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Car Data Admin</h1>
          <p className="text-muted-foreground mt-2">
            Manage car data, migrate static data to database, and enhance with AI
          </p>
        </div>

        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="cars">Cars ({dbCars?.length || 0})</TabsTrigger>
            <TabsTrigger value="validation">
              <ShieldCheck className="h-4 w-4 mr-1" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="enhance">AI Enhance</TabsTrigger>
            <TabsTrigger value="sync-logs">
              <Clock className="h-4 w-4 mr-1" />
              Sync Logs
            </TabsTrigger>
          </TabsList>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Database Status Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Database Status</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  ) : hasData ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                      <span className="text-2xl font-bold">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-6 w-6 text-yellow-500" />
                      <span className="text-2xl font-bold">Empty</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {hasData ? 'Database has car data' : 'No cars in database yet'}
                  </p>
                </CardContent>
              </Card>

              {/* Cars Count Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Cars in Database</CardTitle>
                  <CarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dbCars?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total cars stored in database
                  </p>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={() => refetchCars()} 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Database-Only Mode Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Real-Time Data Sync
                </CardTitle>
                <CardDescription>
                  All car data is sourced from OEM websites and CarDekho via Firecrawl. 
                  Use the Image Sync Manager in the admin panel for real images.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Database-Only Mode
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Static data fallback disabled for 100% accuracy
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cars Tab */}
          <TabsContent value="cars">
            <Card>
              <CardHeader>
                <CardTitle>Cars in Database</CardTitle>
                <CardDescription>
                  View and manage all cars stored in the database
                </CardDescription>
              </CardHeader>
              <CardContent>
                {carsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : dbCars && dbCars.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Body Type</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dbCars.map((car) => (
                          <TableRow key={car.id}>
                            <TableCell className="font-medium">{car.name}</TableCell>
                            <TableCell>{car.brand}</TableCell>
                            <TableCell>{car.body_type}</TableCell>
                            <TableCell>{car.price_range}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {car.is_hot && <Badge variant="destructive">Hot</Badge>}
                                {car.is_new && <Badge variant="default">New</Badge>}
                                {car.is_upcoming && <Badge variant="secondary">Upcoming</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(car.updated_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No cars in database yet.</p>
                    <p className="text-sm">Use the Migration tool to import static data.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Enhance Tab */}
          <TabsContent value="enhance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Data Enhancement
                </CardTitle>
                <CardDescription>
                  Use AI to generate or improve car data like overviews, highlights, and pros/cons
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Car</label>
                    <Select value={selectedCar} onValueChange={setSelectedCar}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a car..." />
                      </SelectTrigger>
                      <SelectContent>
                        {dbCars?.map((car) => (
                          <SelectItem key={car.id} value={car.id}>
                            {car.brand} - {car.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enhancement Type</label>
                    <Select value={enhanceType} onValueChange={setEnhanceType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="overview">Overview (description)</SelectItem>
                        <SelectItem value="highlights">Key Highlights</SelectItem>
                        <SelectItem value="pros_cons">Pros & Cons</SelectItem>
                        <SelectItem value="tagline">Tagline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleEnhance}
                  disabled={!selectedCar || enhanceMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {enhanceMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Enhance with AI
                    </>
                  )}
                </Button>

                {!dbCars?.length && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ No cars in database. Please migrate static data first before using AI enhancement.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">How it works:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Overview:</strong> Generates a compelling 150-200 word description</li>
                    <li>• <strong>Key Highlights:</strong> Creates 5-6 selling points for the car</li>
                    <li>• <strong>Pros & Cons:</strong> Generates balanced advantages and disadvantages</li>
                    <li>• <strong>Tagline:</strong> Creates a catchy 3-6 word marketing tagline</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Data Validation & Freshness Check
                </CardTitle>
                <CardDescription>
                  Automatically detect stale data, missing information, and potential issues
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4 items-center">
                  <Button
                    onClick={() => validateMutation.mutate()}
                    disabled={validateMutation.isPending || !dbCars?.length}
                  >
                    {validateMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Run Validation
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Checks all cars for data freshness, missing information, and potential issues
                  </span>
                </div>

                {validationSummary && (
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{validationSummary.totalCars}</div>
                        <p className="text-xs text-muted-foreground">Total Cars</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-yellow-600">
                          {validationSummary.carsNeedingUpdate}
                        </div>
                        <p className="text-xs text-muted-foreground">Need Updates</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold">{validationSummary.averageFreshnessScore}%</div>
                          <Progress 
                            value={validationSummary.averageFreshnessScore} 
                            className="w-16 h-2"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Avg. Freshness</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">
                          {validationSummary.criticalIssues}
                        </div>
                        <p className="text-xs text-muted-foreground">Critical Issues</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {validationResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Cars Needing Attention:</h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Car</TableHead>
                            <TableHead>Freshness Score</TableHead>
                            <TableHead>Issues</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validationResults.map((result) => (
                            <TableRow key={result.carId}>
                              <TableCell className="font-medium">{result.carName}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={result.freshnessScore} 
                                    className={`w-16 h-2 ${
                                      result.freshnessScore < 50 ? 'bg-red-100' : 
                                      result.freshnessScore < 70 ? 'bg-yellow-100' : ''
                                    }`}
                                  />
                                  <span className={`text-sm ${
                                    result.freshnessScore < 50 ? 'text-red-600' : 
                                    result.freshnessScore < 70 ? 'text-yellow-600' : ''
                                  }`}>
                                    {result.freshnessScore}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <ul className="text-sm text-muted-foreground">
                                  {result.issues.slice(0, 3).map((issue, i) => (
                                    <li key={i}>• {issue}</li>
                                  ))}
                                  {result.issues.length > 3 && (
                                    <li className="text-xs">+{result.issues.length - 3} more</li>
                                  )}
                                </ul>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Validation Checks:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Data Age:</strong> Flags cars with data older than 30/60/90 days</li>
                    <li>• <strong>Missing Prices:</strong> Detects cars without numeric pricing</li>
                    <li>• <strong>Upcoming Cars:</strong> Alerts on past launch dates for upcoming models</li>
                    <li>• <strong>Price Anomalies:</strong> Flags unusually high or low prices</li>
                    <li>• <strong>Verification Status:</strong> Tracks when data was last manually verified</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Logs Tab */}
          <TabsContent value="sync-logs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Sync History
                  </CardTitle>
                  <CardDescription>
                    View recent data sync and enhancement operations
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchSyncLogs()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {syncLogsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : syncLogs && syncLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Processed</TableHead>
                          <TableHead>Enhanced</TableHead>
                          <TableHead>Errors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="outline">{log.sync_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  log.status === 'completed' ? 'default' : 
                                  log.status === 'failed' ? 'destructive' : 'secondary'
                                }
                              >
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(log.started_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.completed_at ? new Date(log.completed_at).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell>{log.cars_processed || 0}</TableCell>
                            <TableCell>{log.cars_enhanced || 0}</TableCell>
                            <TableCell>
                              {log.errors && log.errors.length > 0 ? (
                                <Badge variant="destructive">{log.errors.length}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sync logs yet.</p>
                    <p className="text-sm">Logs will appear here after running sync or scheduled operations.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
