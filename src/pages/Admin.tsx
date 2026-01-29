import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDatabaseStatus, useMigrateData, useEnhanceCarAI } from "@/hooks/useCars";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Database, 
  RefreshCw, 
  Sparkles, 
  Car as CarIcon, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Zap
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
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: hasData, isLoading: statusLoading, refetch: refetchStatus } = useDatabaseStatus();
  const migrateMutation = useMigrateData();
  const enhanceMutation = useEnhanceCarAI();
  
  const [selectedCar, setSelectedCar] = useState<string>("");
  const [enhanceType, setEnhanceType] = useState<string>("overview");

  // Fetch cars from database
  const { data: dbCars, isLoading: carsLoading, refetch: refetchCars } = useQuery({
    queryKey: ['adminCars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('id, slug, name, brand, body_type, price_range, is_hot, is_new, is_upcoming, updated_at')
        .order('brand')
        .order('name');
      
      if (error) throw error;
      return data as DbCar[];
    }
  });

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const handleMigrate = async () => {
    toast.loading('Migrating data to database...', { id: 'migrate' });
    
    try {
      const result = await migrateMutation.mutateAsync();
      
      if (result.success) {
        toast.success(
          `Migration complete! ${result.results?.success} cars migrated, ${result.results?.failed} failed.`,
          { id: 'migrate' }
        );
        refetchStatus();
        refetchCars();
      } else {
        toast.error(result.error || 'Migration failed', { id: 'migrate' });
      }
    } catch (error) {
      toast.error('Migration failed', { id: 'migrate' });
    }
  };

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
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="cars">Cars ({dbCars?.length || 0})</TabsTrigger>
            <TabsTrigger value="enhance">AI Enhance</TabsTrigger>
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

            {/* Migration Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Data Migration
                </CardTitle>
                <CardDescription>
                  Migrate all static car data from TypeScript files to the database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={handleMigrate}
                    disabled={migrateMutation.isPending}
                    className="min-w-[200px]"
                  >
                    {migrateMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Migrate Static Data
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    This will migrate all 75+ cars from static files to the database
                  </span>
                </div>
                
                {migrateMutation.data?.results && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">Migration Results:</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li className="text-green-600">
                        ✓ {migrateMutation.data.results.success} cars migrated successfully
                      </li>
                      {migrateMutation.data.results.failed > 0 && (
                        <li className="text-red-600">
                          ✗ {migrateMutation.data.results.failed} cars failed
                        </li>
                      )}
                    </ul>
                  </div>
                )}
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
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
