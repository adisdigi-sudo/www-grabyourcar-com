import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Eye, RefreshCw, Package, MapPin, Plus, Edit, Trash2, 
  Upload, Download, Image, Sparkles, Search, Filter, Loader2
} from "lucide-react";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface AccessoryOrder {
  id: string;
  user_id: string;
  items: OrderItem[] | unknown;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_email: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  order_id: string | null;
  payment_id: string | null;
  payment_status: string;
  order_status: string;
  notes: string | null;
  created_at: string;
  discount_amount?: number | null;
  discount_reason?: string | null;
  discount_applied_by?: string | null;
}

interface AccessoryProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  inStock: boolean;
  rating: number;
  reviews: number;
  features: string[];
  badge?: string;
}

const orderStatusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const categoryOptions = [
  'HSRP Frames', 'Car Covers', 'Seat Covers', 'Floor Mats', 
  'Air Fresheners', 'Phone Holders', 'Dash Cams', 'Other'
];

const PRODUCTS_STORAGE_KEY = 'gyc_accessory_products';

const getStoredProducts = (): AccessoryProduct[] => {
  try {
    const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveProducts = (products: AccessoryProduct[]) => {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
};

export const AccessoriesManagement = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("orders");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AccessoryOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountForm, setDiscountForm] = useState({ amount: 0, reason: "" });
  
  // Product management state
  const [products, setProducts] = useState<AccessoryProduct[]>(getStoredProducts);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AccessoryProduct | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [productForm, setProductForm] = useState<Partial<AccessoryProduct>>({
    name: '',
    description: '',
    category: 'HSRP Frames',
    price: 0,
    originalPrice: 0,
    image: '',
    inStock: true,
    rating: 4.5,
    reviews: 0,
    features: [],
    badge: '',
  });

  // Fetch orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['adminAccessoryOrders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('accessory_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('order_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AccessoryOrder[];
    },
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { order_status?: string; payment_status?: string; discount_amount?: number | null; discount_reason?: string | null } }) => {
      const { error } = await supabase
        .from('accessory_orders')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAccessoryOrders'] });
      queryClient.invalidateQueries({ queryKey: ['accessory-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-accessory-orders'] });
      queryClient.invalidateQueries({ queryKey: ['accessory-wishlist'] });
      toast.success('Order updated successfully');
      setIsEditingDiscount(false);
    },
    onError: (error) => {
      toast.error('Failed to update order');
      console.error(error);
    },
  });

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrderMutation.mutate({ id: orderId, updates: { order_status: newStatus } });
  };

  const handleSaveDiscount = () => {
    if (selectedOrder) {
      updateOrderMutation.mutate({
        id: selectedOrder.id,
        updates: {
          discount_amount: discountForm.amount || null,
          discount_reason: discountForm.reason || null,
        },
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = orderStatusOptions.find(s => s.value === status);
    if (!statusConfig) return <Badge>{status}</Badge>;
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  // Product CRUD
  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      category: 'HSRP Frames',
      price: 0,
      originalPrice: 0,
      image: '',
      inStock: true,
      rating: 4.5,
      reviews: 0,
      features: [],
      badge: '',
    });
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: AccessoryProduct) => {
    setEditingProduct(product);
    setProductForm(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (id: number) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    saveProducts(updated);
    toast.success('Product deleted');
  };

  const handleSaveProduct = () => {
    if (!productForm.name || !productForm.price) {
      toast.error('Please fill in name and price');
      return;
    }

    if (editingProduct) {
      const updated = products.map(p => 
        p.id === editingProduct.id ? { ...p, ...productForm } as AccessoryProduct : p
      );
      setProducts(updated);
      saveProducts(updated);
      toast.success('Product updated');
    } else {
      const newProduct: AccessoryProduct = {
        id: Date.now(),
        ...productForm as AccessoryProduct,
      };
      const updated = [...products, newProduct];
      setProducts(updated);
      saveProducts(updated);
      toast.success('Product added');
    }
    
    setIsProductModalOpen(false);
  };

  const handleGenerateDescription = async () => {
    if (!productForm.name) {
      toast.error('Enter product name first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-content-generate', {
        body: {
          type: 'product_description',
          topic: `${productForm.name} car accessory`,
          tone: 'professional',
          maxLength: 150,
        }
      });

      if (error) throw error;
      setProductForm(prev => ({ ...prev, description: data.content }));
      toast.success('Description generated!');
    } catch {
      toast.error('Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  // Bulk operations
  const handleBulkExport = () => {
    const headers = ['name', 'description', 'category', 'price', 'original_price', 'image', 'in_stock', 'rating', 'reviews', 'features', 'badge'];
    const rows = products.map(p => [
      p.name, p.description, p.category, p.price, p.originalPrice || '', 
      p.image, p.inStock, p.rating, p.reviews, p.features.join(';'), p.badge || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessories_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Products exported');
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/"/g, ''));
      
      const newProducts: AccessoryProduct[] = lines.slice(1).map((line, index) => {
        // Simple CSV parsing
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
          else current += char;
        }
        values.push(current.trim());

        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
          obj[header] = values[i]?.replace(/"/g, '') || '';
        });
        
        return {
          id: Date.now() + index,
          name: obj.name || 'Unknown',
          description: obj.description || '',
          category: obj.category || 'Other',
          price: parseFloat(obj.price) || 0,
          originalPrice: parseFloat(obj.original_price) || undefined,
          image: obj.image || '',
          inStock: obj.in_stock === 'true' || obj.in_stock === '1',
          rating: parseFloat(obj.rating) || 4.5,
          reviews: parseInt(obj.reviews) || 0,
          features: obj.features ? obj.features.split(';') : [],
          badge: obj.badge || undefined,
        };
      }).filter(p => p.name !== 'Unknown');

      const updated = [...products, ...newProducts];
      setProducts(updated);
      saveProducts(updated);
      toast.success(`Imported ${newProducts.length} products`);
    } catch {
      toast.error('Failed to process file');
    }
    
    event.target.value = '';
  };

  const handleDownloadSample = () => {
    const sample = `name,description,category,price,original_price,image,in_stock,rating,reviews,features,badge
"Premium HSRP Frame","High quality IND HSRP frame with chrome finish","HSRP Frames",299,399,"https://example.com/hsrp.jpg",true,4.5,120,"Chrome finish;Easy installation;Durable",Bestseller
"Car Dashboard Cover","Premium leather dashboard cover","Dash Cams",1499,1999,"",true,4.2,45,"Leather;Custom fit",`;
    
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accessories_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.order_status === 'pending').length || 0,
    processing: orders?.filter(o => o.order_status === 'processing').length || 0,
    delivered: orders?.filter(o => o.order_status === 'delivered').length || 0,
    revenue: orders?.filter(o => o.payment_status === 'paid').reduce((acc, o) => acc + Number(o.total_amount), 0) || 0,
    productCount: products.length,
  };

  const getItems = (order: AccessoryOrder): OrderItem[] => {
    if (Array.isArray(order.items)) return order.items as OrderItem[];
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accessories Management</h2>
          <p className="text-muted-foreground">Manage products and orders</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="orders">Orders ({stats.total})</TabsTrigger>
          <TabsTrigger value="products">Products ({stats.productCount})</TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Total Orders</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{stats.pending}</div><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-purple-600">{stats.processing}</div><p className="text-xs text-muted-foreground">Processing</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{stats.delivered}</div><p className="text-xs text-muted-foreground">Delivered</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</div><p className="text-xs text-muted-foreground">Revenue</p></CardContent></Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  {orderStatusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : orders && orders.length > 0 ? (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.order_id || order.id.slice(0, 8)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.shipping_name}</p>
                              <p className="text-xs text-muted-foreground">{order.shipping_phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span>{getItems(order).length} items</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">₹{Number(order.total_amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {order.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select value={order.order_status} onValueChange={(value) => handleStatusChange(order.id, value)}>
                              <SelectTrigger className="w-[130px] h-8">{getStatusBadge(order.order_status)}</SelectTrigger>
                              <SelectContent>
                                {orderStatusOptions.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(order.created_at), 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedOrder(order); setIsDetailOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".csv" className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />Import
              </Button>
              <Button variant="outline" onClick={handleBulkExport}>
                <Download className="h-4 w-4 mr-2" />Export
              </Button>
              <Button variant="outline" onClick={handleDownloadSample}>Sample CSV</Button>
              <Button onClick={handleAddProduct}>
                <Plus className="h-4 w-4 mr-2" />Add Product
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products
              .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="h-40 bg-muted flex items-center justify-center">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                      <Badge variant="outline" className="mt-1">{product.category}</Badge>
                    </div>
                    {product.badge && <Badge className="bg-primary">{product.badge}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold">₹{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through ml-2">₹{product.originalPrice}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteProduct(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className={product.inStock ? 'text-green-600' : 'text-red-600'}>
                      {product.inStock ? '● In Stock' : '○ Out of Stock'}
                    </span>
                    <span className="text-muted-foreground">⭐ {product.rating} ({product.reviews})</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {products.length === 0 && (
            <Card className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Products Yet</h3>
              <p className="text-muted-foreground mb-4">Add your first product or import from CSV</p>
              <Button onClick={handleAddProduct}><Plus className="h-4 w-4 mr-2" />Add Product</Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Order #{selectedOrder?.order_id || selectedOrder?.id.slice(0, 8)}</DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Order Items</h4>
                <div className="space-y-3">
                  {getItems(selectedOrder).map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      <div className="h-12 w-12 rounded bg-background flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2"><MapPin className="h-4 w-4" />Shipping Address</h4>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedOrder.shipping_name}</p>
                  <p className="text-sm">{selectedOrder.shipping_address}</p>
                  <p className="text-sm">{selectedOrder.shipping_city}, {selectedOrder.shipping_state} - {selectedOrder.shipping_pincode}</p>
                  <p className="text-sm text-muted-foreground mt-2">📞 {selectedOrder.shipping_phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-muted-foreground">Subtotal</label><p>₹{Number(selectedOrder.subtotal).toLocaleString()}</p></div>
                <div><label className="text-sm font-medium text-muted-foreground">Delivery</label><p>₹{Number(selectedOrder.delivery_fee).toLocaleString()}</p></div>
                <div><label className="text-sm font-medium text-muted-foreground">Total</label><p className="text-lg font-bold">₹{Number(selectedOrder.total_amount).toLocaleString()}</p></div>
                <div><label className="text-sm font-medium text-muted-foreground">Payment ID</label><p className="font-mono text-sm">{selectedOrder.payment_id || '-'}</p></div>
              </div>

              {/* Discount Section (Admin Only) */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2">
                    💰 Discount (Internal Only)
                    <Badge variant="outline" className="text-xs">Not shown to customer</Badge>
                  </Label>
                  {!isEditingDiscount && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setDiscountForm({ amount: selectedOrder.discount_amount || 0, reason: selectedOrder.discount_reason || "" });
                      setIsEditingDiscount(true);
                    }}>Edit</Button>
                  )}
                </div>
                {isEditingDiscount ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="number" placeholder="Discount ₹" value={discountForm.amount} onChange={(e) => setDiscountForm({ ...discountForm, amount: Number(e.target.value) })} />
                      <Input placeholder="Reason" value={discountForm.reason} onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveDiscount} disabled={updateOrderMutation.isPending}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingDiscount(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">{selectedOrder.discount_amount ? `₹${selectedOrder.discount_amount} - ${selectedOrder.discount_reason || 'No reason'}` : 'No discount applied'}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>Fill in the product details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={productForm.name || ''} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g., Premium HSRP Frame" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                Description
                <Button type="button" variant="ghost" size="sm" onClick={handleGenerateDescription} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  AI Generate
                </Button>
              </Label>
              <Textarea value={productForm.description || ''} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Product description..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={productForm.category} onValueChange={(v) => setProductForm({ ...productForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Badge (optional)</Label>
                <Input value={productForm.badge || ''} onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })} placeholder="e.g., Bestseller" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹) *</Label>
                <Input type="number" value={productForm.price || ''} onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Original Price (₹)</Label>
                <Input type="number" value={productForm.originalPrice || ''} onChange={(e) => setProductForm({ ...productForm, originalPrice: parseFloat(e.target.value) || undefined })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={productForm.image || ''} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} placeholder="https://..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <Input type="number" step="0.1" min="0" max="5" value={productForm.rating || 4.5} onChange={(e) => setProductForm({ ...productForm, rating: parseFloat(e.target.value) || 4.5 })} />
              </div>
              <div className="space-y-2">
                <Label>Reviews Count</Label>
                <Input type="number" value={productForm.reviews || 0} onChange={(e) => setProductForm({ ...productForm, reviews: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={productForm.inStock} onCheckedChange={(v) => setProductForm({ ...productForm, inStock: v })} />
              <Label>In Stock</Label>
            </div>

            <div className="space-y-2">
              <Label>Features (comma-separated)</Label>
              <Input value={productForm.features?.join(', ') || ''} onChange={(e) => setProductForm({ ...productForm, features: e.target.value.split(',').map(f => f.trim()).filter(Boolean) })} placeholder="Feature 1, Feature 2, Feature 3" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProduct}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
