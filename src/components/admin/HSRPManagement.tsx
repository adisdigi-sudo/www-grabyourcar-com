import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Phone,
  Eye,
  Edit,
  Trash2,
  Home,
  Shield,
  Settings,
  Save,
  Loader2,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";
import { HSRPBannersManagement } from "./HSRPBannersManagement";
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
  discount_amount?: number | null;
  discount_reason?: string | null;
  discount_applied_by?: string | null;
}

interface HSRPPricing {
  fourWheeler: number;
  twoWheeler: number;
  tractor: number;
  colourSticker: number;
  homeInstallationFee: number;
  evVehicle: number;
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

const defaultPricing: HSRPPricing = {
  fourWheeler: 1100,
  twoWheeler: 450,
  tractor: 600,
  colourSticker: 100,
  homeInstallationFee: 200,
  evVehicle: 1100,
};

export const HSRPManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("bookings");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<HSRPBooking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<HSRPBooking | null>(null);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [pricing, setPricing] = useState<HSRPPricing>(defaultPricing);
  const [editForm, setEditForm] = useState({
    tracking_id: "",
    scheduled_date: "",
    order_status: "",
    payment_status: "",
    owner_name: "",
    mobile: "",
    email: "",
    address: "",
    pincode: "",
    chassis_number: "",
    engine_number: "",
    discount_amount: 0,
    discount_reason: "",
  });

  // Fetch HSRP pricing from settings
  const { data: pricingData } = useQuery({
    queryKey: ['hsrp-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'hsrp_pricing')
        .single();

      if (error || !data) return defaultPricing;
      const val = data.setting_value as Record<string, number>;
      return {
        fourWheeler: val?.fourWheeler ?? defaultPricing.fourWheeler,
        twoWheeler: val?.twoWheeler ?? defaultPricing.twoWheeler,
        tractor: val?.tractor ?? defaultPricing.tractor,
        colourSticker: val?.colourSticker ?? defaultPricing.colourSticker,
        homeInstallationFee: val?.homeInstallationFee ?? defaultPricing.homeInstallationFee,
        evVehicle: val?.evVehicle ?? defaultPricing.evVehicle,
      };
    },
  });

  useEffect(() => {
    if (pricingData) {
      setPricing(pricingData);
    }
  }, [pricingData]);

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

  // Delete booking mutation
  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hsrp_bookings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminHsrpBookings'] });
      toast.success('Booking deleted');
      setIsDeleteDialogOpen(false);
      setBookingToDelete(null);
    },
    onError: (error) => {
      toast.error('Failed to delete booking');
      console.error(error);
    },
  });

  const handleDeleteBooking = (booking: HSRPBooking) => {
    setBookingToDelete(booking);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteBooking = () => {
    if (bookingToDelete) {
      deleteBookingMutation.mutate(bookingToDelete.id);
    }
  };

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

  // Save pricing
  const handleSavePricing = async () => {
    setIsSavingPricing(true);
    try {
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('setting_key', 'hsrp_pricing')
        .single();

      const settingValue = JSON.parse(JSON.stringify(pricing));

      if (existing) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ setting_value: settingValue, updated_at: new Date().toISOString() })
          .eq('setting_key', 'hsrp_pricing');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .insert([{ setting_key: 'hsrp_pricing', setting_value: settingValue, description: 'HSRP service pricing' }]);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['hsrp-pricing'] });
      toast.success('Pricing saved successfully');
    } catch (error) {
      toast.error('Failed to save pricing');
      console.error(error);
    } finally {
      setIsSavingPricing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HSRP & FASTag Management</h1>
          <p className="text-muted-foreground">Manage HSRP/FASTag orders, banners, and pricing</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="bookings">Bookings ({stats.total})</TabsTrigger>
          <TabsTrigger value="banners"><ImageIcon className="h-4 w-4 mr-2" />Banners</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" />Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-6">

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
                        <div className="flex items-center gap-1">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setEditForm({
                                tracking_id: booking.tracking_id || "",
                                scheduled_date: booking.scheduled_date || "",
                                order_status: booking.order_status,
                                payment_status: booking.payment_status,
                                owner_name: booking.owner_name,
                                mobile: booking.mobile,
                                email: booking.email,
                                address: booking.address || "",
                                pincode: booking.pincode,
                                chassis_number: booking.chassis_number || "",
                                engine_number: booking.engine_number || "",
                                discount_amount: (booking as any).discount_amount || 0,
                                discount_reason: (booking as any).discount_reason || "",
                              });
                              setIsEditMode(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBooking(booking)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedBooking) {
                  handleDeleteBooking(selectedBooking);
                  setIsDetailOpen(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setEditForm({
                  tracking_id: selectedBooking?.tracking_id || "",
                  scheduled_date: selectedBooking?.scheduled_date || "",
                  order_status: selectedBooking?.order_status || "",
                  payment_status: selectedBooking?.payment_status || "",
                  owner_name: selectedBooking?.owner_name || "",
                  mobile: selectedBooking?.mobile || "",
                  email: selectedBooking?.email || "",
                  address: selectedBooking?.address || "",
                  pincode: selectedBooking?.pincode || "",
                  chassis_number: selectedBooking?.chassis_number || "",
                  engine_number: selectedBooking?.engine_number || "",
                  discount_amount: (selectedBooking as any)?.discount_amount || 0,
                  discount_reason: (selectedBooking as any)?.discount_reason || "",
                });
                setIsEditMode(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
            <Button onClick={() => window.open(`tel:${selectedBooking?.mobile}`)}>
              <Phone className="h-4 w-4 mr-2" />
              Call Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit HSRP Booking Dialog */}
      <Dialog open={isEditMode} onOpenChange={setIsEditMode}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit HSRP Booking</DialogTitle>
            <DialogDescription>
              Update details for {selectedBooking?.registration_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Owner Details */}
            <div>
              <h4 className="font-medium mb-3">Owner Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={editForm.owner_name}
                    onChange={(e) => setEditForm({ ...editForm, owner_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mobile</Label>
                  <Input
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input
                    value={editForm.pincode}
                    onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div>
              <h4 className="font-medium mb-3">Vehicle Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chassis Number</Label>
                  <Input
                    value={editForm.chassis_number}
                    onChange={(e) => setEditForm({ ...editForm, chassis_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Engine Number</Label>
                  <Input
                    value={editForm.engine_number}
                    onChange={(e) => setEditForm({ ...editForm, engine_number: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Order & Tracking */}
            <div>
              <h4 className="font-medium mb-3">Order & Tracking</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tracking ID</Label>
                  <Input
                    value={editForm.tracking_id}
                    onChange={(e) => setEditForm({ ...editForm, tracking_id: e.target.value })}
                    placeholder="Enter tracking ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    value={editForm.scheduled_date}
                    onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Order Status</Label>
                  <Select value={editForm.order_status} onValueChange={(v) => setEditForm({ ...editForm, order_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {orderStatusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
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
            </div>

            {/* Discount (Admin Only) */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                💰 Discount (Internal Only)
                <Badge variant="outline" className="text-xs">Not shown to customer</Badge>
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Amount (₹)</Label>
                  <Input
                    type="number"
                    value={editForm.discount_amount}
                    onChange={(e) => setEditForm({ ...editForm, discount_amount: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Reason</Label>
                  <Input
                    value={editForm.discount_reason}
                    onChange={(e) => setEditForm({ ...editForm, discount_reason: e.target.value })}
                    placeholder="e.g., Festival Offer, Loyalty Discount"
                  />
                </div>
              </div>
              {editForm.discount_amount > 0 && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Final Amount: ₹{((selectedBooking?.payment_amount || 0) - editForm.discount_amount).toLocaleString()}
                    <span className="text-muted-foreground ml-2">(Original: ₹{selectedBooking?.payment_amount?.toLocaleString()})</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedBooking) {
                  updateBookingMutation.mutate({
                    id: selectedBooking.id,
                    updates: {
                      tracking_id: editForm.tracking_id || null,
                      scheduled_date: editForm.scheduled_date || null,
                      order_status: editForm.order_status,
                      payment_status: editForm.payment_status,
                      owner_name: editForm.owner_name,
                      mobile: editForm.mobile,
                      email: editForm.email,
                      address: editForm.address || null,
                      pincode: editForm.pincode,
                      chassis_number: editForm.chassis_number || null,
                      engine_number: editForm.engine_number || null,
                      discount_amount: editForm.discount_amount || null,
                      discount_reason: editForm.discount_reason || null,
                    },
                  });
                  setIsEditMode(false);
                }
              }}
              disabled={updateBookingMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete HSRP Booking
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the booking for vehicle{" "}
              <strong>{bookingToDelete?.registration_number}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        {/* Banners Tab */}
        <TabsContent value="banners" className="space-y-6">
          <HSRPBannersManagement />
        </TabsContent>

        {/* Pricing Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                HSRP Service Pricing
              </CardTitle>
              <CardDescription>Configure pricing for different HSRP services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Four Wheeler (₹)</Label>
                  <Input
                    type="number"
                    value={pricing.fourWheeler}
                    onChange={(e) => setPricing({ ...pricing, fourWheeler: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Two Wheeler (₹)</Label>
                  <Input
                    type="number"
                    value={pricing.twoWheeler}
                    onChange={(e) => setPricing({ ...pricing, twoWheeler: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tractor/Trailer (₹)</Label>
                  <Input
                    type="number"
                    value={pricing.tractor}
                    onChange={(e) => setPricing({ ...pricing, tractor: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Electric Vehicle (₹)</Label>
                  <Input
                    type="number"
                    value={pricing.evVehicle}
                    onChange={(e) => setPricing({ ...pricing, evVehicle: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Colour Sticker Only (₹)</Label>
                  <Input
                    type="number"
                    value={pricing.colourSticker}
                    onChange={(e) => setPricing({ ...pricing, colourSticker: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Home Installation Fee (₹)</Label>
                  <Input
                    type="number"
                    value={pricing.homeInstallationFee}
                    onChange={(e) => setPricing({ ...pricing, homeInstallationFee: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <Button onClick={handleSavePricing} disabled={isSavingPricing}>
                {isSavingPricing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Pricing
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
