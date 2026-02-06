import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, 
  Globe, 
  Plus, 
  Trash2, 
  Edit, 
  Upload,
  RefreshCw,
  Crown,
  Search,
  Check,
  X
} from "lucide-react";

interface Brand {
  id: string;
  name: string;
  slug: string;
  country: string;
  logo_url: string | null;
  is_active: boolean;
  is_luxury: boolean;
  sort_order: number;
  created_at: string;
}

export const BrandsManagement = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [newBrand, setNewBrand] = useState({ name: "", country: "", is_luxury: false });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch brands
  const { data: brands = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('car_brands')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Brand[];
    }
  });

  // Add single brand
  const addBrandMutation = useMutation({
    mutationFn: async (brand: { name: string; country: string; is_luxury: boolean }) => {
      const slug = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data, error } = await supabase
        .from('car_brands')
        .insert({
          name: brand.name,
          slug,
          country: brand.country,
          is_luxury: brand.is_luxury,
          sort_order: brands.length + 1
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      toast.success('Brand added successfully');
      setNewBrand({ name: "", country: "", is_luxury: false });
      setShowAddDialog(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add brand: ${error.message}`);
    }
  });

  // Bulk add brands
  const bulkAddMutation = useMutation({
    mutationFn: async (input: string) => {
      const lines = input.trim().split('\n').filter(line => line.trim());
      const brandsToAdd: Array<{ name: string; slug: string; country: string; is_luxury: boolean; sort_order: number }> = [];
      
      let sortOrder = brands.length;
      
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          const name = parts[0];
          const country = parts[1];
          const isLuxury = parts[2]?.toLowerCase() === 'true' || parts[2]?.toLowerCase() === 'luxury';
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          
          sortOrder++;
          brandsToAdd.push({
            name,
            slug,
            country,
            is_luxury: isLuxury,
            sort_order: sortOrder
          });
        }
      }

      if (brandsToAdd.length === 0) {
        throw new Error('No valid brands found in input');
      }

      const { data, error } = await supabase
        .from('car_brands')
        .upsert(brandsToAdd, { onConflict: 'name' })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      toast.success(`${data?.length || 0} brands added/updated successfully`);
      setBulkInput("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add brands: ${error.message}`);
    }
  });

  // Update brand
  const updateBrandMutation = useMutation({
    mutationFn: async (brand: Partial<Brand> & { id: string }) => {
      const { data, error } = await supabase
        .from('car_brands')
        .update(brand)
        .eq('id', brand.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      toast.success('Brand updated successfully');
      setEditingBrand(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update brand: ${error.message}`);
    }
  });

  // Delete brand
  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('car_brands')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      toast.success('Brand deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete brand: ${error.message}`);
    }
  });

  // Toggle active status
  const toggleActive = async (brand: Brand) => {
    await updateBrandMutation.mutateAsync({ id: brand.id, is_active: !brand.is_active });
  };

  // Toggle luxury status
  const toggleLuxury = async (brand: Brand) => {
    await updateBrandMutation.mutateAsync({ id: brand.id, is_luxury: !brand.is_luxury });
  };

  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const luxuryBrands = filteredBrands.filter(b => b.is_luxury);
  const mainstreamBrands = filteredBrands.filter(b => !b.is_luxury);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Car Brands Management
          </h2>
          <p className="text-muted-foreground">
            Manage car brands with country of origin
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Brand
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Brand</DialogTitle>
                <DialogDescription>Add a new car brand to the system</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Brand Name</Label>
                  <Input
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    placeholder="e.g., Maruti Suzuki"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={newBrand.country}
                    onChange={(e) => setNewBrand({ ...newBrand, country: e.target.value })}
                    placeholder="e.g., India"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newBrand.is_luxury}
                    onCheckedChange={(checked) => setNewBrand({ ...newBrand, is_luxury: checked })}
                  />
                  <Label>Luxury Brand</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button 
                  onClick={() => addBrandMutation.mutate(newBrand)}
                  disabled={!newBrand.name || !newBrand.country || addBrandMutation.isPending}
                >
                  {addBrandMutation.isPending ? "Adding..." : "Add Brand"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{brands.length}</div>
            <p className="text-xs text-muted-foreground">Total Brands</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{luxuryBrands.length}</div>
            <p className="text-xs text-muted-foreground">Luxury Brands</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-accent-foreground">{mainstreamBrands.length}</div>
            <p className="text-xs text-muted-foreground">Mainstream Brands</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">
              {brands.filter(b => b.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Active Brands</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Brand List</TabsTrigger>
          <TabsTrigger value="bulk">Quick Text Import</TabsTrigger>
        </TabsList>

        {/* Brand List Tab */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Brands</CardTitle>
                  <CardDescription>Manage car brands and their details</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search brands..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBrands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {brand.is_luxury && <Crown className="h-4 w-4 text-purple-500" />}
                            {brand.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            {brand.country}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={brand.is_luxury ? "default" : "secondary"}
                            onClick={() => toggleLuxury(brand)}
                            style={{ cursor: 'pointer' }}
                          >
                            {brand.is_luxury ? "Luxury" : "Mainstream"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={brand.is_active}
                            onCheckedChange={() => toggleActive(brand)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setEditingBrand(brand)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Delete ${brand.name}?`)) {
                                  deleteBrandMutation.mutate(brand.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredBrands.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No brands found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Import Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Quick Text Import
              </CardTitle>
              <CardDescription>
                Paste brand data in simple text format: BrandName,Country (one per line)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Format Example:</h4>
                <pre className="text-sm text-muted-foreground font-mono">
{`Maruti Suzuki,India
Hyundai,South Korea
BMW,Germany,luxury
Mercedes-Benz,Germany,luxury
Tata Motors,India`}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  Add "luxury" or "true" as third parameter to mark as luxury brand
                </p>
              </div>

              <Textarea
                placeholder={`Paste your brand data here...

Example:
Maruti Suzuki,India
Hyundai,South Korea
BMW,Germany,luxury`}
                className="min-h-[200px] font-mono text-sm"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
              />

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {bulkInput.trim().split('\n').filter(l => l.trim()).length} lines detected
                </p>
                <Button 
                  onClick={() => bulkAddMutation.mutate(bulkInput)}
                  disabled={!bulkInput.trim() || bulkAddMutation.isPending}
                >
                  {bulkAddMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Brands
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingBrand} onOpenChange={() => setEditingBrand(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
            <DialogDescription>Update brand details</DialogDescription>
          </DialogHeader>
          {editingBrand && (
            <div className="space-y-4">
              <div>
                <Label>Brand Name</Label>
                <Input
                  value={editingBrand.name}
                  onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={editingBrand.country}
                  onChange={(e) => setEditingBrand({ ...editingBrand, country: e.target.value })}
                />
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={editingBrand.logo_url || ''}
                  onChange={(e) => setEditingBrand({ ...editingBrand, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingBrand.is_luxury}
                    onCheckedChange={(checked) => setEditingBrand({ ...editingBrand, is_luxury: checked })}
                  />
                  <Label>Luxury Brand</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingBrand.is_active}
                    onCheckedChange={(checked) => setEditingBrand({ ...editingBrand, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBrand(null)}>Cancel</Button>
            <Button 
              onClick={() => editingBrand && updateBrandMutation.mutate(editingBrand)}
              disabled={updateBrandMutation.isPending}
            >
              {updateBrandMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandsManagement;
