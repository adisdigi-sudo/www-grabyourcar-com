import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  Home,
  CreditCard,
  Shield,
} from "lucide-react";

interface HSRPBooking {
  id: string;
  registration_number: string;
  chassis_number: string | null;
  engine_number: string | null;
  vehicle_class: string;
  state: string;
  owner_name: string;
  mobile: string;
  email: string;
  address: string | null;
  pincode: string;
  service_type: string;
  service_price: number;
  home_installation: boolean;
  home_installation_fee: number | null;
  payment_amount: number;
  payment_status: string;
  payment_id: string | null;
  order_status: string;
  order_id: string | null;
  tracking_id: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const orderStatusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  { value: 'dispatched', label: 'Dispatched', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'fitted', label: 'Fitted', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

export const HSRPManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<HSRPBooking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch HSRP bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['adminHsrpBookings', statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('hsrp_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('order_status', statusFilter);
      }
      
      if (searchQuery) {
        query = query.or(`registration_number.ilike.%${searchQuery}%,owner_name.ilike.%${searchQuery}%,mobile.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as HSRPBooking[];
    },
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HSRPBooking> }) => {
      const { error } = await supabase
        .from('hsrp_bookings')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminHsrpBookings'] });
      toast.success('Booking updated');
    },
    onError: (error) => {
      toast.error('Failed to update booking');
      console.error(error);
    },
  });

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    const updates: Partial<HSRPBooking> = { order_status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    updateBookingMutation.mutate({ id: bookingId, updates });
  };

  const getStatusBadge = (status: string) => {
    const config = orderStatusOptions.find(s => s.value === status);
    if (!config) return <Badge>{status}</Badge>;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    return (
      <Badge variant={status === 'paid' ? 'default' : 'secondary'}>
        {status === 'paid' ? 'Paid' : 'Pending'}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Stats
  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter(b => b.order_status === 'pending').length || 0,
    processing: bookings?.filter(b => ['confirmed', 'processing', 'dispatched'].includes(b.order_status)).length || 0,
    completed: bookings?.filter(b => b.order_status === 'completed').length || 0,
    revenue: bookings?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.payment_amount, 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HSRP Bookings</h1>
          <p className="text-muted-foreground">
            Manage HSRP plate orders and installations
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.revenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by registration, name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {orderStatusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Service</TableHead>
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
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading bookings...
                    </TableCell>
                  </TableRow>
                ) : bookings && bookings.length > 0 ? (
                  bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono font-medium">
                        {booking.registration_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.owner_name}</p>
                          <p className="text-xs text-muted-foreground">{booking.mobile}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{booking.vehicle_class}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{booking.service_type}</span>
                          {booking.home_installation && (
                            <Home className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(booking.payment_amount)}
                      </TableCell>
                      <TableCell>
                        {getPaymentBadge(booking.payment_status)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={booking.order_status}
                          onValueChange={(value) => handleStatusChange(booking.id, value)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            {getStatusBadge(booking.order_status)}
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
                        {format(new Date(booking.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedBooking(booking);
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
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      No HSRP bookings found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Booking Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>HSRP Booking Details</DialogTitle>
            <DialogDescription>
              Order #{selectedBooking?.registration_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registration Number</label>
                  <p className="font-mono font-medium">{selectedBooking.registration_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vehicle Class</label>
                  <p>{selectedBooking.vehicle_class}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Chassis Number</label>
                  <p className="font-mono">{selectedBooking.chassis_number || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Engine Number</label>
                  <p className="font-mono">{selectedBooking.engine_number || '-'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Owner Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p>{selectedBooking.owner_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Mobile</label>
                    <p>{selectedBooking.mobile}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p>{selectedBooking.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p>{selectedBooking.state}, {selectedBooking.pincode}</p>
                  </div>
                </div>
                {selectedBooking.address && (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p>{selectedBooking.address}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Service Type</label>
                    <p>{selectedBooking.service_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Service Price</label>
                    <p>{formatCurrency(selectedBooking.service_price)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Home Installation</label>
                    <p>{selectedBooking.home_installation ? `Yes (+${formatCurrency(selectedBooking.home_installation_fee || 0)})` : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                    <p className="text-lg font-bold text-primary">{formatCurrency(selectedBooking.payment_amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
                    <div className="mt-1">{getPaymentBadge(selectedBooking.payment_status)}</div>
                  </div>
                  {selectedBooking.payment_id && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                      <p className="font-mono text-sm">{selectedBooking.payment_id}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Order Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Status</label>
                    <div className="mt-1">{getStatusBadge(selectedBooking.order_status)}</div>
                  </div>
                  {selectedBooking.tracking_id && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tracking ID</label>
                      <p className="font-mono">{selectedBooking.tracking_id}</p>
                    </div>
                  )}
                  {selectedBooking.scheduled_date && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Scheduled Date</label>
                      <p>{format(new Date(selectedBooking.scheduled_date), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                  {selectedBooking.completed_at && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Completed At</label>
                      <p>{format(new Date(selectedBooking.completed_at), 'dd MMM yyyy HH:mm')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            <Button onClick={() => window.open(`tel:${selectedBooking?.mobile}`)}>
              <Phone className="h-4 w-4 mr-2" />
              Call Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
