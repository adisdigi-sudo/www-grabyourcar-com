import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Car, Plus, Edit, Trash2, Upload, Download, Save, RefreshCw,
  Building2, Fuel, Settings2, DollarSign, FileUp, CheckCircle,
  AlertCircle, X, GripVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface VehicleBrand {
  id: string;
  name: string;
  logo_url: string | null;
  country: string | null;
  is_active: boolean;
  sort_order: number;
}

interface VehicleBodyType {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface VehicleFuelType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface VehicleTransmission {
  id: string;
  name: string;
  full_name: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface VehiclePriceRange {
  id: string;
  label: string;
  min_price: number;
  max_price: number | null;
  is_active: boolean;
  sort_order: number;
}

type AttributeType = 'brands' | 'body_types' | 'fuel_types' | 'transmissions' | 'price_ranges';

export function VehicleAttributesManager() {
  const [activeTab, setActiveTab] = useState<AttributeType>("brands");
  const [isLoading, setIsLoading] = useState(true);
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [bodyTypes, setBodyTypes] = useState<VehicleBodyType[]>([]);
  const [fuelTypes, setFuelTypes] = useState<VehicleFuelType[]>([]);
  const [transmissions, setTransmissions] = useState<VehicleTransmission[]>([]);
  const [priceRanges, setPriceRanges] = useState<VehiclePriceRange[]>([]);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [bulkData, setBulkData] = useState("");
  const [bulkResults, setBulkResults] = useState<{success: number; failed: number; errors: string[]}>({ success: 0, failed: 0, errors: [] });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [brandsRes, bodyTypesRes, fuelTypesRes, transmissionsRes, priceRangesRes] = await Promise.all([
        supabase.from("vehicle_brands").select("*").order("sort_order"),
        supabase.from("vehicle_body_types").select("*").order("sort_order"),
        supabase.from("vehicle_fuel_types").select("*").order("sort_order"),
        supabase.from("vehicle_transmissions").select("*").order("sort_order"),
        supabase.from("vehicle_price_ranges").select("*").order("sort_order"),
      ]);

      // Check for errors
      if (brandsRes.error) console.error("Brands fetch error:", brandsRes.error);
      if (bodyTypesRes.error) console.error("Body types fetch error:", bodyTypesRes.error);
      if (fuelTypesRes.error) console.error("Fuel types fetch error:", fuelTypesRes.error);
      if (transmissionsRes.error) console.error("Transmissions fetch error:", transmissionsRes.error);
      if (priceRangesRes.error) console.error("Price ranges fetch error:", priceRangesRes.error);

      setBrands(brandsRes.data || []);
      setBodyTypes(bodyTypesRes.data || []);
      setFuelTypes(fuelTypesRes.data || []);
      setTransmissions(transmissionsRes.data || []);
      setPriceRanges(priceRangesRes.data || []);
      
      console.log("Vehicle attributes loaded:", {
        brands: brandsRes.data?.length || 0,
        bodyTypes: bodyTypesRes.data?.length || 0,
        fuelTypes: fuelTypesRes.data?.length || 0,
        transmissions: transmissionsRes.data?.length || 0,
        priceRanges: priceRangesRes.data?.length || 0
      });
    } catch (error) {
      console.error("Error fetching vehicle attributes:", error);
      toast({
        title: "Error",
        description: "Failed to load vehicle attributes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTableName = (type: AttributeType) => {
    switch (type) {
      case 'brands': return 'vehicle_brands';
      case 'body_types': return 'vehicle_body_types';
      case 'fuel_types': return 'vehicle_fuel_types';
      case 'transmissions': return 'vehicle_transmissions';
      case 'price_ranges': return 'vehicle_price_ranges';
    }
  };

  const handleAdd = async (data: any) => {
    try {
      const tableName = getTableName(activeTab);
      const { error } = await supabase.from(tableName).insert([data]);
      
      if (error) throw error;
      
      toast({ title: "Added successfully" });
      setIsAddDialogOpen(false);
      setEditingItem(null);
      fetchAllData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      const tableName = getTableName(activeTab);
      const { error } = await supabase.from(tableName).update(data).eq("id", id);
      
      if (error) throw error;
      
      toast({ title: "Updated successfully" });
      setEditingItem(null);
      fetchAllData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    
    try {
      const tableName = getTableName(activeTab);
      const { error } = await supabase.from(tableName).delete().eq("id", id);
      
      if (error) throw error;
      
      toast({ title: "Deleted successfully" });
      fetchAllData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const tableName = getTableName(activeTab);
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !currentState })
        .eq("id", id);
      
      if (error) throw error;
      fetchAllData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkData.trim()) {
      toast({ title: "Error", description: "Please enter data to upload", variant: "destructive" });
      return;
    }

    const lines = bulkData.trim().split("\n");
    const results = { success: 0, failed: 0, errors: [] as string[] };
    const tableName = getTableName(activeTab);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        let data: any = {};
        
        if (activeTab === 'brands') {
          const parts = line.split(",").map(s => s.trim());
          data = { name: parts[0], country: parts[1] || null, sort_order: i + 1 };
        } else if (activeTab === 'body_types') {
          const parts = line.split(",").map(s => s.trim());
          data = { name: parts[0], description: parts[1] || null, sort_order: i + 1 };
        } else if (activeTab === 'fuel_types') {
          const parts = line.split(",").map(s => s.trim());
          data = { name: parts[0], description: parts[1] || null, sort_order: i + 1 };
        } else if (activeTab === 'transmissions') {
          const parts = line.split(",").map(s => s.trim());
          data = { name: parts[0], full_name: parts[1] || null, description: parts[2] || null, sort_order: i + 1 };
        } else if (activeTab === 'price_ranges') {
          const parts = line.split(",").map(s => s.trim());
          data = { 
            label: parts[0], 
            min_price: parseFloat(parts[1]) || 0, 
            max_price: parts[2] ? parseFloat(parts[2]) : null,
            sort_order: i + 1 
          };
        }

        const { error } = await supabase.from(tableName).upsert([data], { onConflict: 'name' });
        
        if (error) throw error;
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    setBulkResults(results);
    toast({ 
      title: "Bulk upload complete", 
      description: `${results.success} succeeded, ${results.failed} failed` 
    });
    fetchAllData();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Skip header row if it looks like CSV headers
      const lines = content.split("\n");
      const dataLines = lines[0].toLowerCase().includes("name") ? lines.slice(1) : lines;
      setBulkData(dataLines.join("\n"));
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    let template = "";
    
    switch (activeTab) {
      case 'brands':
        template = "name,country\nMaruti Suzuki,India/Japan\nHyundai,South Korea\nTata,India";
        break;
      case 'body_types':
        template = "name,description\nHatchback,Compact cars with rear door\nSedan,Four-door passenger cars\nSUV,Sport Utility Vehicle";
        break;
      case 'fuel_types':
        template = "name,description\nPetrol,Gasoline powered\nDiesel,Diesel powered\nElectric,Battery powered";
        break;
      case 'transmissions':
        template = "name,full_name,description\nManual,Manual Transmission,Traditional gear shifting\nAutomatic,Automatic Transmission,Auto gear shifting\nCVT,Continuously Variable Transmission,Seamless gear ratio";
        break;
      case 'price_ranges':
        template = "label,min_price,max_price\nUnder ₹5 Lakh,0,500000\n₹5-10 Lakh,500000,1000000\n₹10-15 Lakh,1000000,1500000";
        break;
    }

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTabConfig = (type: AttributeType) => {
    switch (type) {
      case 'brands':
        return { label: "Brands", icon: Building2, data: brands, color: "text-blue-500" };
      case 'body_types':
        return { label: "Body Types", icon: Car, data: bodyTypes, color: "text-green-500" };
      case 'fuel_types':
        return { label: "Fuel Types", icon: Fuel, data: fuelTypes, color: "text-orange-500" };
      case 'transmissions':
        return { label: "Transmissions", icon: Settings2, data: transmissions, color: "text-purple-500" };
      case 'price_ranges':
        return { label: "Price Ranges", icon: DollarSign, data: priceRanges, color: "text-emerald-500" };
    }
  };

  const renderTable = () => {
    const config = getTabConfig(activeTab);
    const data = config.data;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Name</TableHead>
            {activeTab === 'brands' && <TableHead>Country</TableHead>}
            {activeTab === 'transmissions' && <TableHead>Full Name</TableHead>}
            {activeTab === 'price_ranges' && (
              <>
                <TableHead>Min Price</TableHead>
                <TableHead>Max Price</TableHead>
              </>
            )}
            {(activeTab === 'body_types' || activeTab === 'fuel_types') && <TableHead>Description</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                No items found. Add your first entry.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item: any, index) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{item.name || item.label}</TableCell>
                {activeTab === 'brands' && <TableCell>{item.country || "—"}</TableCell>}
                {activeTab === 'transmissions' && <TableCell>{item.full_name || "—"}</TableCell>}
                {activeTab === 'price_ranges' && (
                  <>
                    <TableCell>₹{(item.min_price / 100000).toFixed(1)}L</TableCell>
                    <TableCell>{item.max_price ? `₹${(item.max_price / 100000).toFixed(1)}L` : "No limit"}</TableCell>
                  </>
                )}
                {(activeTab === 'body_types' || activeTab === 'fuel_types') && (
                  <TableCell className="max-w-[200px] truncate">{item.description || "—"}</TableCell>
                )}
                <TableCell>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={() => handleToggleActive(item.id, item.is_active)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingItem(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  };

  const renderAddEditForm = () => {
    const isEditing = !!editingItem;
    const [formData, setFormData] = useState(editingItem || {});

    useEffect(() => {
      setFormData(editingItem || {});
    }, [editingItem]);

    const handleSubmit = () => {
      if (isEditing) {
        handleUpdate(editingItem.id, formData);
      } else {
        handleAdd(formData);
      }
    };

    return (
      <div className="space-y-4 py-4">
        {activeTab === 'brands' && (
          <>
            <div className="space-y-2">
              <Label>Brand Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Maruti Suzuki"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={formData.country || ""}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., India/Japan"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={formData.logo_url || ""}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </>
        )}

        {activeTab === 'body_types' && (
          <>
            <div className="space-y-2">
              <Label>Body Type Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., SUV"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
          </>
        )}

        {activeTab === 'fuel_types' && (
          <>
            <div className="space-y-2">
              <Label>Fuel Type Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Petrol"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
          </>
        )}

        {activeTab === 'transmissions' && (
          <>
            <div className="space-y-2">
              <Label>Short Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., CVT"
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.full_name || ""}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g., Continuously Variable Transmission"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
          </>
        )}

        {activeTab === 'price_ranges' && (
          <>
            <div className="space-y-2">
              <Label>Label *</Label>
              <Input
                value={formData.label || ""}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., ₹5-10 Lakh"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Price (₹) *</Label>
                <Input
                  type="number"
                  value={formData.min_price || ""}
                  onChange={(e) => setFormData({ ...formData, min_price: parseFloat(e.target.value) || 0 })}
                  placeholder="500000"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.max_price || ""}
                  onChange={(e) => setFormData({ ...formData, max_price: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="1000000"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setEditingItem(null); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? "Update" : "Add"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-xl">
              <Car className="h-6 w-6 text-primary" />
            </div>
            Vehicle Attributes Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage brands, body types, fuel types, transmissions, and price ranges
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAllData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['brands', 'body_types', 'fuel_types', 'transmissions', 'price_ranges'] as AttributeType[]).map((type) => {
          const config = getTabConfig(type);
          const Icon = config.icon;
          return (
            <Card 
              key={type} 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeTab === type && "ring-2 ring-primary"
              )}
              onClick={() => setActiveTab(type)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5", config.color)} />
                  <div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                    <p className="text-xl font-bold">{config.data.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const config = getTabConfig(activeTab);
              const Icon = config.icon;
              return <Icon className={cn("h-5 w-5", config.color)} />;
            })()}
            {getTabConfig(activeTab).label}
          </CardTitle>
          <CardDescription>
            Manage {activeTab.replace("_", " ")} for your vehicle catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {renderTable()}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || !!editingItem} onOpenChange={(open) => { 
        if (!open) { setIsAddDialogOpen(false); setEditingItem(null); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit" : "Add"} {getTabConfig(activeTab).label.slice(0, -1)}
            </DialogTitle>
            <DialogDescription>
              Enter the details below
            </DialogDescription>
          </DialogHeader>
          {renderAddEditForm()}
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Bulk Upload {getTabConfig(activeTab).label}
            </DialogTitle>
            <DialogDescription>
              Upload multiple entries at once using CSV format
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="space-y-2">
              <Label>Data (one entry per line, comma-separated)</Label>
              <Textarea
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                placeholder={
                  activeTab === 'brands' ? "Maruti Suzuki,India/Japan\nHyundai,South Korea" :
                  activeTab === 'body_types' ? "Hatchback,Compact cars\nSedan,Four-door" :
                  activeTab === 'fuel_types' ? "Petrol,Gasoline powered\nDiesel,Diesel powered" :
                  activeTab === 'transmissions' ? "Manual,Manual Transmission,Traditional\nAutomatic,Auto Transmission,Auto" :
                  "Under ₹5 Lakh,0,500000\n₹5-10 Lakh,500000,1000000"
                }
                rows={8}
              />
            </div>

            {bulkResults.success > 0 || bulkResults.failed > 0 ? (
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-4 mb-2">
                  <Badge className="bg-emerald-500 text-white">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {bulkResults.success} Succeeded
                  </Badge>
                  {bulkResults.failed > 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {bulkResults.failed} Failed
                    </Badge>
                  )}
                </div>
                {bulkResults.errors.length > 0 && (
                  <div className="text-sm text-destructive mt-2">
                    {bulkResults.errors.slice(0, 5).map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                    {bulkResults.errors.length > 5 && (
                      <p>...and {bulkResults.errors.length - 5} more errors</p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsBulkDialogOpen(false); setBulkData(""); setBulkResults({ success: 0, failed: 0, errors: [] }); }}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VehicleAttributesManager;
