import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, RefreshCw, Eye, Edit, Phone, MapPin, Calendar, User, Car, ExternalLink } from "lucide-react";
import { DriverBooking } from "@/hooks/useRentalServices";

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'driver_assigned', label: 'Driver Assigned', color: 'bg-purple-100 text-purple-800' },
  { value: 'ongoing', label: 'Trip Ongoing', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const tripTypeLabels: Record<string, string> = {
  local: 'Local Trip',
  outstation_one_way: 'Outstation One-Way',
  outstation_round: 'Outstation Round Trip',
  airport: 'Airport Transfer',
};

export const DriverBookingsManagement = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<DriverBooking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    payment_status: '',
    driver_name: '',
    driver_phone: '',
    discount_amount: 0,
    discount_reason: '',
  });

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['admin-driver-bookings', statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('driver_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Client-side search
      let results = data as DriverBooking[];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        results = results.filter(b => 
          b.customer_name.toLowerCase().includes(q) ||
          b.customer_phone.includes(q) ||
          b.vehicle_name?.toLowerCase().includes(q)
        );
      }
      return results;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DriverBooking> }) => {
      const { error } = await supabase
        .from('driver_bookings')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-driver-bookings'] });
      toast.success('Booking updated');
      setIsEditOpen(false);
    },
    onError: () => {
      toast.error('Failed to update booking');
    }
  });

  const handleEdit = (booking: DriverBooking) => {
    setSelectedBooking(booking);
    setEditForm({
      status: booking.status,
      payment_status: booking.payment_status,
      driver_name: booking.driver_name || '',
      driver_phone: booking.driver_phone || '',
      discount_amount: booking.discount_amount || 0,
      discount_reason: booking.discount_reason || '',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedBooking) return;
    updateMutation.mutate({
      id: selectedBooking.id,
      updates: {
        ...editForm,
        driver_assigned_at: editForm.driver_name ? new Date().toISOString() : null,
      } as Partial<DriverBooking>
    });
  };

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find(s => s.value === status);
    return <Badge className={config?.color || 'bg-gray-100'}>{config?.label || status}</Badge>;
  };

  // Stats
  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter(b => b.status === 'pending').length || 0,
    confirmed: bookings?.filter(b => b.status === 'confirmed').length || 0,
    ongoing: bookings?.filter(b => b.status === 'ongoing').length || 0,
    revenue: bookings?.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + b.total_amount, 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Driver Bookings</h2>
          <p className="text-muted-foreground">Manage chauffeur-driven bookings</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Total Bookings</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          <p className="text-xs text-muted-foreground">Confirmed</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-purple-600">{stats.ongoing}</div>
          <p className="text-xs text-muted-foreground">Ongoing</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-2xl font-bold text-green-600">₹{stats.revenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Trip Details</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                  </TableRow>
                ) : bookings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : bookings?.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{booking.customer_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {booking.customer_phone}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <Badge variant="outline" className="text-xs">
                          {tripTypeLabels[booking.trip_type] || booking.trip_type}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {booking.pickup_address.substring(0, 30)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{booking.vehicle_name || 'Not assigned'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(booking.pickup_date), 'dd MMM yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">{booking.pickup_time}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">₹{booking.total_amount.toLocaleString()}</div>
                      <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {booking.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {booking.api_partner_id ? (
                          <Badge variant="outline" className="text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            API
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{booking.source}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(booking)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedBooking.customer_name}</p>
                  <p>{selectedBooking.customer_phone}</p>
                  <p>{selectedBooking.customer_email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Trip Type</Label>
                  <p className="font-medium">{tripTypeLabels[selectedBooking.trip_type]}</p>
                  <p>{selectedBooking.duration_days} day(s)</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Pickup</Label>
                <p>{selectedBooking.pickup_date} at {selectedBooking.pickup_time}</p>
                <p className="text-muted-foreground">{selectedBooking.pickup_address}</p>
              </div>
              {selectedBooking.dropoff_address && (
                <div>
                  <Label className="text-muted-foreground">Drop</Label>
                  <p className="text-muted-foreground">{selectedBooking.dropoff_address}</p>
                </div>
              )}
              {selectedBooking.driver_name && (
                <div>
                  <Label className="text-muted-foreground">Driver</Label>
                  <p>{selectedBooking.driver_name} • {selectedBooking.driver_phone}</p>
                </div>
              )}
              <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                <div className="flex justify-between"><span>Base Amount</span><span>₹{selectedBooking.base_amount}</span></div>
                <div className="flex justify-between"><span>Driver Charges</span><span>₹{selectedBooking.driver_charges}</span></div>
                <div className="flex justify-between"><span>Taxes</span><span>₹{selectedBooking.taxes}</span></div>
                {selectedBooking.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{selectedBooking.discount_amount}</span></div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t"><span>Total</span><span>₹{selectedBooking.total_amount}</span></div>
              </div>
              {selectedBooking.special_instructions && (
                <div>
                  <Label className="text-muted-foreground">Special Instructions</Label>
                  <p>{selectedBooking.special_instructions}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={editForm.payment_status} onValueChange={(v) => setEditForm({ ...editForm, payment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input
                  value={editForm.driver_name}
                  onChange={(e) => setEditForm({ ...editForm, driver_name: e.target.value })}
                  placeholder="Assign driver"
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Phone</Label>
                <Input
                  value={editForm.driver_phone}
                  onChange={(e) => setEditForm({ ...editForm, driver_phone: e.target.value })}
                  placeholder="Driver mobile"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Amount</Label>
                <Input
                  type="number"
                  value={editForm.discount_amount}
                  onChange={(e) => setEditForm({ ...editForm, discount_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Discount Reason</Label>
                <Input
                  value={editForm.discount_reason}
                  onChange={(e) => setEditForm({ ...editForm, discount_reason: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverBookingsManagement;
