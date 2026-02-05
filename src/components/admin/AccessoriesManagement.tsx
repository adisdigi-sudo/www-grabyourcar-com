import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Eye, RefreshCw, Package, MapPin, CreditCard, Download } from "lucide-react";

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
}

const orderStatusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

export const AccessoriesManagement = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<AccessoryOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
    mutationFn: async ({ id, updates }: { id: string; updates: { order_status?: string; payment_status?: string } }) => {
      const { error } = await supabase
        .from('accessory_orders')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAccessoryOrders'] });
      toast.success('Order updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update order');
      console.error(error);
    },
  });

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrderMutation.mutate({ id: orderId, updates: { order_status: newStatus } });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = orderStatusOptions.find(s => s.value === status);
    if (!statusConfig) return <Badge>{status}</Badge>;
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  // Calculate stats
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.order_status === 'pending').length || 0,
    processing: orders?.filter(o => o.order_status === 'processing').length || 0,
    delivered: orders?.filter(o => o.order_status === 'delivered').length || 0,
    revenue: orders?.filter(o => o.payment_status === 'paid').reduce((acc, o) => acc + Number(o.total_amount), 0) || 0,
  };

  // Helper to get items array
  const getItems = (order: AccessoryOrder): OrderItem[] => {
    if (Array.isArray(order.items)) return order.items as OrderItem[];
    return [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accessories Orders</h2>
          <p className="text-muted-foreground">
            Manage accessory orders and shipments
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
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
            <div className="text-2xl font-bold text-purple-600">{stats.processing}</div>
            <p className="text-xs text-muted-foreground">Processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
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
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
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
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.order_id || order.id.slice(0, 8)}
                      </TableCell>
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
                      <TableCell className="font-medium">
                        ₹{Number(order.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.order_status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            {getStatusBadge(order.order_status)}
                          </SelectTrigger>
                          <SelectContent>
                            {orderStatusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.order_id || selectedOrder?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Items */}
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

              {/* Shipping */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shipping Address
                </h4>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedOrder.shipping_name}</p>
                  <p className="text-sm">{selectedOrder.shipping_address}</p>
                  <p className="text-sm">{selectedOrder.shipping_city}, {selectedOrder.shipping_state} - {selectedOrder.shipping_pincode}</p>
                  <p className="text-sm text-muted-foreground mt-2">📞 {selectedOrder.shipping_phone}</p>
                  {selectedOrder.shipping_email && (
                    <p className="text-sm text-muted-foreground">✉️ {selectedOrder.shipping_email}</p>
                  )}
                </div>
              </div>

              {/* Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subtotal</label>
                  <p>₹{Number(selectedOrder.subtotal).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Delivery</label>
                  <p>₹{Number(selectedOrder.delivery_fee).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total</label>
                  <p className="text-lg font-bold">₹{Number(selectedOrder.total_amount).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                  <p className="font-mono text-sm">{selectedOrder.payment_id || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
