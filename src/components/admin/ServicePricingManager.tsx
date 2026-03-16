import { useState } from "react";
import { useServicePricing } from "@/hooks/useCMSData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Edit, IndianRupee, Shield, CreditCard, Car, Key } from "lucide-react";

interface PricingFormData {
  id?: string;
  service_type: string;
  category: string;
  name: string;
  base_price: number;
  gst_rate: number;
  discount_amount: number;
  description: string;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

const defaultPricing: PricingFormData = {
  service_type: 'hsrp',
  category: '4w',
  name: '',
  base_price: 0,
  gst_rate: 18,
  discount_amount: 0,
  description: '',
  features: [],
  is_active: true,
  sort_order: 0,
};

const SERVICE_TYPES = [
  { value: 'hsrp', label: 'HSRP', icon: Shield },
  { value: 'insurance', label: 'Insurance', icon: Shield },
  { value: 'loan', label: 'Car Loan', icon: CreditCard },
  { value: 'rental', label: 'Rental', icon: Car },
];

const CATEGORIES = {
  hsrp: [
    { value: '2w', label: 'Two Wheeler' },
    { value: '4w', label: 'Four Wheeler' },
    { value: 'ev', label: 'Electric Vehicle' },
    { value: 'commercial', label: 'Commercial Vehicle' },
  ],
  fastag: [
    { value: 'standard', label: 'Standard' },
    { value: 'commercial', label: 'Commercial' },
  ],
  hsrp_fastag: [
    { value: '4w', label: 'Four Wheeler Combo' },
  ],
  insurance: [
    { value: 'comprehensive', label: 'Comprehensive' },
    { value: 'third_party', label: 'Third Party' },
    { value: 'own_damage', label: 'Own Damage' },
  ],
  loan: [
    { value: 'new_car', label: 'New Car' },
    { value: 'used_car', label: 'Used Car' },
  ],
  rental: [
    { value: 'hatchback', label: 'Hatchback' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'luxury', label: 'Luxury' },
  ],
};

export function ServicePricingManager() {
  const { data: pricing, isLoading, saveMutation, deleteMutation } = useServicePricing();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<PricingFormData>(defaultPricing);
  const [activeServiceType, setActiveServiceType] = useState('hsrp');
  const [newFeature, setNewFeature] = useState('');

  const handleSave = async () => {
    await saveMutation.mutateAsync(editingPricing);
    setIsDialogOpen(false);
    setEditingPricing(defaultPricing);
  };

  const handleEdit = (item: any) => {
    setEditingPricing({
      id: item.id,
      service_type: item.service_type || 'hsrp',
      category: item.category || '',
      name: item.name || '',
      base_price: item.base_price || 0,
      gst_rate: item.gst_rate || 18,
      discount_amount: item.discount_amount || 0,
      description: item.description || '',
      features: item.features || [],
      is_active: item.is_active ?? true,
      sort_order: item.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this pricing?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setEditingPricing(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setEditingPricing(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const calculateFinalPrice = (basePrice: number, gstRate: number, discount: number) => {
    return basePrice * (1 + gstRate / 100) - discount;
  };

  const filteredPricing = pricing?.filter(p => p.service_type === activeServiceType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Service Pricing</h2>
          <p className="text-muted-foreground">Configure pricing for HSRP, Insurance, Loans, and Rentals</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingPricing({ ...defaultPricing, service_type: activeServiceType })}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pricing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPricing.id ? 'Edit Pricing' : 'Add New Pricing'}</DialogTitle>
              <DialogDescription>Configure service pricing with GST and discounts</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Service Type *</Label>
                  <Select 
                    value={editingPricing.service_type}
                    onValueChange={(value) => setEditingPricing(prev => ({ ...prev, service_type: value, category: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Category *</Label>
                  <Select 
                    value={editingPricing.category}
                    onValueChange={(value) => setEditingPricing(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES[editingPricing.service_type as keyof typeof CATEGORIES]?.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input
                  value={editingPricing.name}
                  onChange={(e) => setEditingPricing(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Four Wheeler HSRP"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Base Price (₹) *</Label>
                  <Input
                    type="number"
                    value={editingPricing.base_price}
                    onChange={(e) => setEditingPricing(prev => ({ ...prev, base_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="1100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>GST Rate (%)</Label>
                  <Input
                    type="number"
                    value={editingPricing.gst_rate}
                    onChange={(e) => setEditingPricing(prev => ({ ...prev, gst_rate: parseFloat(e.target.value) || 0 }))}
                    placeholder="18"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Discount (₹)</Label>
                  <Input
                    type="number"
                    value={editingPricing.discount_amount}
                    onChange={(e) => setEditingPricing(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Final Price:</span>
                  <span className="text-xl font-bold text-primary">
                    ₹{calculateFinalPrice(
                      editingPricing.base_price, 
                      editingPricing.gst_rate, 
                      editingPricing.discount_amount
                    ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{editingPricing.base_price} + {editingPricing.gst_rate}% GST
                  {editingPricing.discount_amount > 0 && ` - ₹${editingPricing.discount_amount} discount`}
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={editingPricing.description}
                  onChange={(e) => setEditingPricing(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the service..."
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a feature"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" onClick={addFeature} variant="outline">Add</Button>
                </div>
                {editingPricing.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingPricing.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {feature}
                        <button 
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Show this pricing</p>
                  </div>
                  <Switch
                    checked={editingPricing.is_active}
                    onCheckedChange={(checked) => setEditingPricing(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={editingPricing.sort_order}
                    onChange={(e) => setEditingPricing(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!editingPricing.name || !editingPricing.category || saveMutation.isPending}
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingPricing.id ? 'Update' : 'Create'} Pricing
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeServiceType} onValueChange={setActiveServiceType}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {SERVICE_TYPES.map((type) => {
            const Icon = type.icon;
            const count = pricing?.filter(p => p.service_type === type.value).length || 0;
            return (
              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {type.label}
                <Badge variant="secondary" className="text-xs ml-1">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SERVICE_TYPES.map((type) => (
          <TabsContent key={type.value} value={type.value} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <type.icon className="h-5 w-5" />
                  {type.label} Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPricing?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pricing configured. Add your first {type.label} pricing!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Base Price</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Final Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPricing?.map((item) => (
                        <TableRow key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {CATEGORIES[item.service_type as keyof typeof CATEGORIES]?.find(c => c.value === item.category)?.label || item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">₹{item.base_price?.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">{item.gst_rate}%</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            ₹{item.final_price?.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? 'Active' : 'Hidden'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive"
                                onClick={() => handleDelete(item.id)}
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default ServicePricingManager;
