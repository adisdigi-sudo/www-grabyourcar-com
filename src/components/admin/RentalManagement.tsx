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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Filter, Eye, Phone, RefreshCw, Car, Calendar, MapPin, CreditCard, CheckCircle, XCircle, Clock, Plus, Edit, Trash2, Upload, Download, Image, FileSpreadsheet, AlertTriangle } from "lucide-react";
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
  discount_amount?: number | null;
  discount_reason?: string | null;
  discount_applied_by?: string | null;
}

interface RentalVehicle {
  id: number;
  name: string;
  brand: string;
  vehicleType: string;
  fuelType: string;
  transmission: string;
  seats: number;
  year: number;
  color: string;
  rent: number;
  location: string;
  available: boolean;
  image?: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'ongoing', label: 'Ongoing', color: 'bg-purple-100 text-purple-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const vehicleTypes = ['Hatchback', 'Sedan', 'SUV', 'Luxury', 'Tempo Traveller'];
const fuelTypes = ['Petrol', 'Diesel', 'CNG', 'Electric'];
const transmissionTypes = ['Manual', 'Automatic'];
const brands = ['Maruti', 'Hyundai', 'Tata', 'Toyota', 'Kia', 'Mahindra', 'Honda', 'Force'];
const locations = [
  'Delhi - Connaught Place',
  'Delhi - Rajiv Chowk',
  'Noida - Sector 18',
  'Noida - Sector 62',
  'Greater Noida - Pari Chowk',
  'Gurugram - Cyber Hub',
  'Gurugram - MG Road',
  'Gurugram - Golf Course Road',
  'Ghaziabad - Vaishali',
];

// Local storage key for vehicles (since we don't have a DB table for this yet)
const VEHICLES_STORAGE_KEY = 'gyc_rental_vehicles';

const getStoredVehicles = (): RentalVehicle[] => {
  try {
    const stored = localStorage.getItem(VEHICLES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveVehicles = (vehicles: RentalVehicle[]) => {
  localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
};

export const RentalManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("bookings");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<RentalBooking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditBookingOpen, setIsEditBookingOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<RentalBooking | null>(null);
  const [editBookingForm, setEditBookingForm] = useState({
    status: "",
    payment_status: "",
    driver_license_number: "",
    notes: "",
    discount_amount: 0,
    discount_reason: "",
  });
  
  // Vehicle management state
  const [vehicles, setVehicles] = useState<RentalVehicle[]>(getStoredVehicles);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<RentalVehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState<Partial<RentalVehicle>>({
    name: '',
    brand: 'Maruti',
    vehicleType: 'Hatchback',
    fuelType: 'Petrol',
    transmission: 'Manual',
    seats: 5,
    year: 2024,
    color: 'White',
    rent: 1500,
    location: 'Delhi - Connaught Place',
    available: true,
  });

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
      queryClient.invalidateQueries({ queryKey: ['rental-services'] });
      queryClient.invalidateQueries({ queryKey: ['rental-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-rental-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-driver-bookings'] });
      toast.success('Booking updated successfully');
      setIsEditBookingOpen(false);
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
        .from('rental_bookings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRentals'] });
      queryClient.invalidateQueries({ queryKey: ['rental-services'] });
      queryClient.invalidateQueries({ queryKey: ['rental-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-rental-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-driver-bookings'] });
      toast.success('Booking deleted');
      setIsDeleteDialogOpen(false);
      setBookingToDelete(null);
    },
    onError: (error) => {
      toast.error('Failed to delete booking');
      console.error(error);
    },
  });

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    updateBookingMutation.mutate({ id: bookingId, updates: { status: newStatus } });
  };

  const handleDeleteBooking = (booking: RentalBooking) => {
    setBookingToDelete(booking);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteBooking = () => {
    if (bookingToDelete) {
      deleteBookingMutation.mutate(bookingToDelete.id);
    }
  };

  const handleEditBooking = (booking: RentalBooking) => {
    setSelectedBooking(booking);
    setEditBookingForm({
      status: booking.status,
      payment_status: booking.payment_status,
      driver_license_number: booking.driver_license_number || "",
      notes: booking.notes || "",
      discount_amount: booking.discount_amount || 0,
      discount_reason: booking.discount_reason || "",
    });
    setIsEditBookingOpen(true);
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

  // Vehicle CRUD operations
  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({
      name: '',
      brand: 'Maruti',
      vehicleType: 'Hatchback',
      fuelType: 'Petrol',
      transmission: 'Manual',
      seats: 5,
      year: 2024,
      color: 'White',
      rent: 1500,
      location: 'Delhi - Connaught Place',
      available: true,
    });
    setIsVehicleModalOpen(true);
  };

  const handleEditVehicle = (vehicle: RentalVehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm(vehicle);
    setIsVehicleModalOpen(true);
  };

  const handleDeleteVehicle = (id: number) => {
    const updated = vehicles.filter(v => v.id !== id);
    setVehicles(updated);
    saveVehicles(updated);
    toast.success('Vehicle deleted');
  };

  const handleSaveVehicle = () => {
    if (!vehicleForm.name || !vehicleForm.rent) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingVehicle) {
      const updated = vehicles.map(v => 
        v.id === editingVehicle.id ? { ...v, ...vehicleForm } as RentalVehicle : v
      );
      setVehicles(updated);
      saveVehicles(updated);
      toast.success('Vehicle updated');
    } else {
      const newVehicle: RentalVehicle = {
        id: Date.now(),
        ...vehicleForm as RentalVehicle,
      };
      const updated = [...vehicles, newVehicle];
      setVehicles(updated);
      saveVehicles(updated);
      toast.success('Vehicle added');
    }
    
    setIsVehicleModalOpen(false);
  };

  // Bulk operations
  const handleBulkExport = () => {
    const headers = ['name', 'brand', 'vehicle_type', 'fuel_type', 'transmission', 'seats', 'year', 'color', 'rent', 'location', 'available', 'image_url'];
    const rows = vehicles.map(v => [
      v.name, v.brand, v.vehicleType, v.fuelType, v.transmission, 
      v.seats, v.year, v.color, v.rent, v.location, v.available, v.image || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rental_vehicles_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Vehicles exported successfully');
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      
      const newVehicles: RentalVehicle[] = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
          obj[header] = values[i] || '';
        });
        
        return {
          id: Date.now() + index,
          name: obj.name || 'Unknown',
          brand: obj.brand || 'Other',
          vehicleType: obj.vehicle_type || 'Hatchback',
          fuelType: obj.fuel_type || 'Petrol',
          transmission: obj.transmission || 'Manual',
          seats: parseInt(obj.seats) || 5,
          year: parseInt(obj.year) || 2024,
          color: obj.color || 'White',
          rent: parseInt(obj.rent) || 1500,
          location: obj.location || 'Delhi - Connaught Place',
          available: obj.available === 'true' || obj.available === '1',
          image: obj.image_url || undefined,
        };
      }).filter(v => v.name !== 'Unknown');

      const updated = [...vehicles, ...newVehicles];
      setVehicles(updated);
      saveVehicles(updated);
      toast.success(`Imported ${newVehicles.length} vehicles`);
    } catch (error) {
      toast.error('Failed to process file');
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleDownloadSample = () => {
    const sample = `name,brand,vehicle_type,fuel_type,transmission,seats,year,color,rent,location,available,image_url
Swift Dzire,Maruti,Sedan,Petrol,Manual,5,2024,White,1500,Delhi - Connaught Place,true,https://example.com/dzire.jpg
Hyundai Venue,Hyundai,SUV,Petrol,Automatic,5,2023,Grey,2500,Noida - Sector 18,true,
Toyota Innova,Toyota,Tempo Traveller,Diesel,Automatic,7,2024,White,4000,Gurugram - Cyber Hub,true,`;
    
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rental_vehicles_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded');
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
            Manage rental bookings and vehicle fleet
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs for Bookings and Vehicles */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Fleet</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
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
                                onClick={() => handleEditBooking(booking)}
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
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold">Vehicle Fleet</h3>
              <p className="text-sm text-muted-foreground">
                {vehicles.length} vehicles • {vehicles.filter(v => v.available).length} available
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBulkExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => document.getElementById('bulk-vehicle-upload')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
              <input
                id="bulk-vehicle-upload"
                type="file"
                accept=".csv"
                onChange={handleBulkUpload}
                className="hidden"
              />
              <Button onClick={handleAddVehicle}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </div>
          </div>

          {/* Bulk Upload Info */}
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Bulk Import Format</p>
                  <p className="text-xs text-muted-foreground">
                    CSV columns: name, brand, vehicle_type, fuel_type, transmission, seats, year, color, rent, location, available, image_url
                  </p>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleDownloadSample}>
                    Download sample CSV template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicles Grid */}
          {vehicles.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id} className="relative overflow-hidden">
                  {/* Vehicle Image */}
                  <div className="aspect-video bg-muted relative">
                    {vehicle.image ? (
                      <img 
                        src={vehicle.image} 
                        alt={vehicle.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge 
                      variant={vehicle.available ? "default" : "secondary"}
                      className="absolute top-2 right-2"
                    >
                      {vehicle.available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                  
                  <CardContent className="pt-4">
                    <div className="mb-3">
                      <h4 className="font-semibold">{vehicle.name}</h4>
                      <p className="text-sm text-muted-foreground">{vehicle.brand} • {vehicle.vehicleType}</p>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fuel/Trans</span>
                        <span>{vehicle.fuelType} / {vehicle.transmission}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Seats / Year</span>
                        <span>{vehicle.seats} seats • {vehicle.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location</span>
                        <span className="text-right text-xs max-w-[120px] truncate">{vehicle.location}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Daily Rent</span>
                        <span className="text-primary">₹{vehicle.rent.toLocaleString()}/day</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEditVehicle(vehicle)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No vehicles added</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first rental vehicle to get started
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => document.getElementById('bulk-vehicle-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Import
                  </Button>
                  <Button onClick={handleAddVehicle}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Booking Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
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
                    if (selectedBooking) {
                      handleEditBooking(selectedBooking);
                      setIsDetailOpen(false);
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Rental Booking Dialog */}
      <Dialog open={isEditBookingOpen} onOpenChange={setIsEditBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Rental Booking</DialogTitle>
            <DialogDescription>
              Update booking for {selectedBooking?.vehicle_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Booking Status</Label>
              <Select 
                value={editBookingForm.status} 
                onValueChange={(v) => setEditBookingForm({ ...editBookingForm, status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select 
                value={editBookingForm.payment_status} 
                onValueChange={(v) => setEditBookingForm({ ...editBookingForm, payment_status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Driver License Number</Label>
              <Input
                value={editBookingForm.driver_license_number}
                onChange={(e) => setEditBookingForm({ ...editBookingForm, driver_license_number: e.target.value })}
                placeholder="Enter license number"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editBookingForm.notes}
                onChange={(e) => setEditBookingForm({ ...editBookingForm, notes: e.target.value })}
                placeholder="Add notes about this booking"
                rows={3}
              />
            </div>

            {/* Discount (Admin Only) */}
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-3">
                💰 Discount (Internal Only)
                <Badge variant="outline" className="text-xs">Not shown to customer</Badge>
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Amount (₹)</Label>
                  <Input
                    type="number"
                    value={editBookingForm.discount_amount}
                    onChange={(e) => setEditBookingForm({ ...editBookingForm, discount_amount: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Reason</Label>
                  <Input
                    value={editBookingForm.discount_reason}
                    onChange={(e) => setEditBookingForm({ ...editBookingForm, discount_reason: e.target.value })}
                    placeholder="e.g., Weekend Special"
                  />
                </div>
              </div>
              {editBookingForm.discount_amount > 0 && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Final Amount: ₹{((selectedBooking?.total_amount || 0) - editBookingForm.discount_amount).toLocaleString()}
                    <span className="text-muted-foreground ml-2">(Original: ₹{selectedBooking?.total_amount?.toLocaleString()})</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditBookingOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedBooking) {
                  updateBookingMutation.mutate({
                    id: selectedBooking.id,
                    updates: {
                      status: editBookingForm.status,
                      payment_status: editBookingForm.payment_status,
                      driver_license_number: editBookingForm.driver_license_number || null,
                      notes: editBookingForm.notes || null,
                      discount_amount: editBookingForm.discount_amount || null,
                      discount_reason: editBookingForm.discount_reason || null,
                    },
                  });
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
              Delete Rental Booking
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the booking for{" "}
              <strong>{bookingToDelete?.vehicle_name}</strong>? This action cannot be undone.
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

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
            <DialogDescription>
              {editingVehicle ? 'Update vehicle details' : 'Add a new vehicle to your rental fleet'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Vehicle Name *</Label>
                <Input
                  value={vehicleForm.name || ''}
                  onChange={(e) => setVehicleForm({...vehicleForm, name: e.target.value})}
                  placeholder="e.g., Maruti Swift"
                />
              </div>
              
              <div>
                <Label>Brand</Label>
                <Select 
                  value={vehicleForm.brand} 
                  onValueChange={(v) => setVehicleForm({...vehicleForm, brand: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Vehicle Type</Label>
                <Select 
                  value={vehicleForm.vehicleType} 
                  onValueChange={(v) => setVehicleForm({...vehicleForm, vehicleType: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fuel Type</Label>
                <Select 
                  value={vehicleForm.fuelType} 
                  onValueChange={(v) => setVehicleForm({...vehicleForm, fuelType: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Transmission</Label>
                <Select 
                  value={vehicleForm.transmission} 
                  onValueChange={(v) => setVehicleForm({...vehicleForm, transmission: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transmissionTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Seats</Label>
                <Input
                  type="number"
                  value={vehicleForm.seats || 5}
                  onChange={(e) => setVehicleForm({...vehicleForm, seats: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={vehicleForm.year || 2024}
                  onChange={(e) => setVehicleForm({...vehicleForm, year: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <Label>Color</Label>
                <Input
                  value={vehicleForm.color || ''}
                  onChange={(e) => setVehicleForm({...vehicleForm, color: e.target.value})}
                  placeholder="e.g., White"
                />
              </div>

              <div>
                <Label>Daily Rent (₹) *</Label>
                <Input
                  type="number"
                  value={vehicleForm.rent || 1500}
                  onChange={(e) => setVehicleForm({...vehicleForm, rent: parseInt(e.target.value)})}
                />
              </div>

              <div className="col-span-2">
                <Label>Vehicle Image URL</Label>
                <Input
                  value={vehicleForm.image || ''}
                  onChange={(e) => setVehicleForm({...vehicleForm, image: e.target.value})}
                  placeholder="https://example.com/vehicle-image.jpg"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter a URL for the vehicle image</p>
              </div>

              <div className="col-span-2">
                <Label>Location</Label>
                <Select 
                  value={vehicleForm.location} 
                  onValueChange={(v) => setVehicleForm({...vehicleForm, location: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <Label>Available for Booking</Label>
                  <p className="text-sm text-muted-foreground">Enable if this vehicle is ready to rent</p>
                </div>
                <Switch
                  checked={vehicleForm.available}
                  onCheckedChange={(v) => setVehicleForm({...vehicleForm, available: v})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVehicleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVehicle}>
              {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
