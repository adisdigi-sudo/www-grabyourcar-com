import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Plus, Edit, Trash2, Percent, IndianRupee, Tag, 
  Settings, AlertTriangle, RefreshCw
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DiscountPreset {
  id: string;
  name: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  applicable_to: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const serviceOptions = [
  { value: 'hsrp', label: 'HSRP Services' },
  { value: 'rental', label: 'Self-Drive Rentals' },
  { value: 'accessories', label: 'Accessories' },
];

export const DiscountManagement = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DiscountPreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'fixed' as 'fixed' | 'percentage',
    discount_value: 0,
    applicable_to: ['hsrp', 'rental', 'accessories'] as string[],
    is_active: true,
  });

  // Fetch discount presets
  const { data: presets = [], isLoading, refetch } = useQuery({
    queryKey: ['discountPresets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_presets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DiscountPreset[];
    },
  });

  // Create preset mutation
  const createMutation = useMutation({
    mutationFn: async (data: Omit<DiscountPreset, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('discount_presets')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discountPresets'] });
      toast.success('Discount preset created');
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create preset');
      console.error(error);
    },
  });

  // Update preset mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DiscountPreset> & { id: string }) => {
      const { error } = await supabase
        .from('discount_presets')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discountPresets'] });
      toast.success('Discount preset updated');
      setIsEditDialogOpen(false);
      setSelectedPreset(null);
    },
    onError: (error) => {
      toast.error('Failed to update preset');
      console.error(error);
    },
  });

  // Delete preset mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discount_presets')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discountPresets'] });
      toast.success('Discount preset deleted');
      setIsDeleteDialogOpen(false);
      setSelectedPreset(null);
    },
    onError: (error) => {
      toast.error('Failed to delete preset');
      console.error(error);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      discount_type: 'fixed',
      discount_value: 0,
      applicable_to: ['hsrp', 'rental', 'accessories'],
      is_active: true,
    });
  };

  const handleEdit = (preset: DiscountPreset) => {
    setSelectedPreset(preset);
    setFormData({
      name: preset.name,
      discount_type: preset.discount_type,
      discount_value: preset.discount_value,
      applicable_to: preset.applicable_to,
      is_active: preset.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (preset: DiscountPreset) => {
    setSelectedPreset(preset);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleActive = (preset: DiscountPreset) => {
    updateMutation.mutate({ id: preset.id, is_active: !preset.is_active });
  };

  const handleApplicableToggle = (value: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_to: prev.applicable_to.includes(value)
        ? prev.applicable_to.filter(v => v !== value)
        : [...prev.applicable_to, value],
    }));
  };

  const formatDiscount = (preset: DiscountPreset) => {
    if (preset.discount_type === 'percentage') {
      return `${preset.discount_value}%`;
    }
    return `₹${preset.discount_value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Discount Management</h2>
          <p className="text-muted-foreground">
            Create and manage discount presets for quick application on bookings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Preset
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Presets</p>
                <p className="text-2xl font-bold">{presets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Percent className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Presets</p>
                <p className="text-2xl font-bold">{presets.filter(p => p.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <IndianRupee className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fixed Discounts</p>
                <p className="text-2xl font-bold">
                  {presets.filter(p => p.discount_type === 'fixed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Presets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Presets</CardTitle>
          <CardDescription>
            Quick-apply discounts when editing bookings. These are internal only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : presets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No discount presets created yet</p>
              <Button variant="link" onClick={() => setIsAddDialogOpen(true)}>
                Create your first preset
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Applicable To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presets.map((preset) => (
                  <TableRow key={preset.id}>
                    <TableCell className="font-medium">{preset.name}</TableCell>
                    <TableCell>
                      <Badge variant={preset.discount_type === 'percentage' ? 'secondary' : 'outline'}>
                        {preset.discount_type === 'percentage' ? 'Percentage' : 'Fixed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatDiscount(preset)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {preset.applicable_to.map((service) => (
                          <Badge key={service} variant="outline" className="text-xs">
                            {service.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={preset.is_active}
                        onCheckedChange={() => handleToggleActive(preset)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(preset)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => handleDelete(preset)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Discount Preset</DialogTitle>
            <DialogDescription>
              Create a new discount preset for quick application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preset Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Festival Offer - ₹100 Off"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(v) => setFormData({ ...formData, discount_type: v as 'fixed' | 'percentage' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  placeholder={formData.discount_type === 'percentage' ? '5' : '100'}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applicable To</Label>
              <div className="flex flex-wrap gap-4">
                {serviceOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={formData.applicable_to.includes(option.value)}
                      onCheckedChange={() => handleApplicableToggle(option.value)}
                    />
                    <label htmlFor={option.value} className="text-sm font-medium">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || formData.discount_value <= 0 || createMutation.isPending}
            >
              Create Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Discount Preset</DialogTitle>
            <DialogDescription>Update the discount preset details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preset Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select 
                  value={formData.discount_type} 
                  onValueChange={(v) => setFormData({ ...formData, discount_type: v as 'fixed' | 'percentage' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applicable To</Label>
              <div className="flex flex-wrap gap-4">
                {serviceOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${option.value}`}
                      checked={formData.applicable_to.includes(option.value)}
                      onCheckedChange={() => handleApplicableToggle(option.value)}
                    />
                    <label htmlFor={`edit-${option.value}`} className="text-sm font-medium">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit_is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedPreset && updateMutation.mutate({ id: selectedPreset.id, ...formData })}
              disabled={!formData.name || formData.discount_value <= 0 || updateMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Discount Preset
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPreset?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedPreset && deleteMutation.mutate(selectedPreset.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
