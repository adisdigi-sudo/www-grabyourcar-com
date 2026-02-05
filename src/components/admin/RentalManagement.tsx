import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Filter, Eye, Phone, RefreshCw, Car, Calendar, MapPin, CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";

interface RentalBooking {
  id: string;
  user_id: string;
  vehicle_name: string;
  vehicle_type: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_date: string;
  dropoff_time: string;
  dropoff_location: string;
  total_days: number;
  daily_rate: number;
  subtotal: number;
  security_deposit: number | null;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_id: string | null;
  driver_license_number: string | null;
  notes: string | null;
  created_at: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-purple-100 text-purple-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

export const RentalManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<RentalBooking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch rental bookings
  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['adminRentals', statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('rental_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RentalBooking[];
    },
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RentalBooking> }) => {
      const { error } = await supabase
        .from('rental_bookings')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRentals'] });
      toast.success('Booking updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update booking');
      console.error(error);
    },
  });

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    updateBookingMutation.mutate({ id: bookingId, updates: { status: newStatus } });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    if (!statusConfig) return <Badge>{status}</Badge>;
    
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
  };

  // Calculate stats
  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter(b => b.status === 'pending').length || 0,
    ongoing: bookings?.filter(b => b.status === 'ongoing').length || 0,
    completed: bookings?.filter(b => b.status === 'completed').length || 0,
    revenue: bookings?.filter(b => b.payment_status === 'paid').reduce((acc, b) => acc + b.total_amount, 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Self-Drive Rentals</h2>
          <p className="text-muted-foreground">
            Manage all self-drive car rental bookings
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
            <p className="text-xs text-muted-foreground">Total Bookings</p>
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
            <div className="text-2xl font-bold text-purple-600">{stats.ongoing}</div>
            <p className="text-xs text-muted-foreground">Ongoing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
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
                placeholder="Search by vehicle or customer..."
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
                {statusOptions.map((status) => (
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
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Dropoff</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
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
                ) : bookings && bookings.length > 0 ? (
                  bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                            <Car className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{booking.vehicle_name}</p>
                            <p className="text-xs text-muted-foreground">{booking.vehicle_type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(booking.pickup_date), 'dd MMM')} {booking.pickup_time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {booking.pickup_location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(booking.dropoff_date), 'dd MMM')} {booking.dropoff_time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {booking.dropoff_location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{booking.total_days} days</span>
                        <p className="text-xs text-muted-foreground">₹{booking.daily_rate}/day</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">₹{booking.total_amount.toLocaleString()}</span>
                        {booking.security_deposit && (
                          <p className="text-xs text-muted-foreground">
                            +₹{booking.security_deposit.toLocaleString()} deposit
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{getPaymentBadge(booking.payment_status)}</TableCell>
                      <TableCell>
                        <Select
                          value={booking.status}
                          onValueChange={(value) => handleStatusChange(booking.id, value)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            {getStatusBadge(booking.status)}
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No rental bookings found
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View complete rental booking information
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vehicle</label>
                  <p className="font-medium">{selectedBooking.vehicle_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p>{selectedBooking.vehicle_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pickup</label>
                  <p>{format(new Date(selectedBooking.pickup_date), 'dd MMM yyyy')} at {selectedBooking.pickup_time}</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.pickup_location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dropoff</label>
                  <p>{format(new Date(selectedBooking.dropoff_date), 'dd MMM yyyy')} at {selectedBooking.dropoff_time}</p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.dropoff_location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <p>{selectedBooking.total_days} days × ₹{selectedBooking.daily_rate}/day</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                  <p className="font-bold text-lg">₹{selectedBooking.total_amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
                  <div className="mt-1">{getPaymentBadge(selectedBooking.payment_status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Booking Status</label>
                  <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                </div>
                {selectedBooking.driver_license_number && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">License Number</label>
                    <p className="font-mono">{selectedBooking.driver_license_number}</p>
                  </div>
                )}
                {selectedBooking.notes && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
