import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  Car, 
  Shield, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";

interface HSRPBooking {
  id: string;
  registration_number: string;
  vehicle_class: string;
  service_type: string;
  owner_name: string;
  mobile: string;
  email: string;
  state: string;
  pincode: string;
  order_status: string;
  payment_status: string;
  payment_amount: number;
  home_installation: boolean;
  scheduled_date: string | null;
  tracking_id: string | null;
  created_at: string;
}

interface RentalBooking {
  id: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_image: string | null;
  pickup_date: string;
  pickup_time: string;
  dropoff_date: string;
  dropoff_time: string;
  pickup_location: string;
  dropoff_location: string;
  daily_rate: number;
  total_days: number;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
  confirmed: { color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  ongoing: { color: "bg-green-100 text-green-800", icon: Car },
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { color: "bg-red-100 text-red-800", icon: XCircle },
  processing: { color: "bg-blue-100 text-blue-800", icon: Loader2 },
  dispatched: { color: "bg-purple-100 text-purple-800", icon: Car },
  fitted: { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
};

const MyBookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("hsrp");

  // Fetch HSRP bookings
  const { data: hsrpBookings, isLoading: hsrpLoading } = useQuery({
    queryKey: ['myHsrpBookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsrp_bookings')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as HSRPBooking[];
    },
    enabled: !!user?.id,
  });

  // Fetch rental bookings
  const { data: rentalBookings, isLoading: rentalLoading } = useQuery({
    queryKey: ['myRentalBookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_bookings')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RentalBooking[];
    },
    enabled: !!user?.id,
  });

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800", icon: AlertCircle };
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your HSRP and rental bookings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="hsrp" className="gap-2">
              <Shield className="h-4 w-4" />
              HSRP Bookings ({hsrpBookings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="rentals" className="gap-2">
              <Car className="h-4 w-4" />
              Rental Bookings ({rentalBookings?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* HSRP Bookings Tab */}
          <TabsContent value="hsrp">
            {hsrpLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map(i => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : hsrpBookings && hsrpBookings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {hsrpBookings.map((booking) => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            {booking.registration_number}
                          </CardTitle>
                          <CardDescription>
                            {booking.service_type} HSRP • {booking.vehicle_class}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {getStatusBadge(booking.order_status)}
                          <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {booking.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{booking.state}, {booking.pincode}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(booking.created_at), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{booking.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{booking.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(booking.payment_amount)}
                          </p>
                        </div>
                        {booking.tracking_id && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Tracking ID</p>
                            <p className="font-mono text-sm">{booking.tracking_id}</p>
                          </div>
                        )}
                      </div>
                      
                      {booking.home_installation && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                          <CheckCircle2 className="h-4 w-4" />
                          Home Installation Requested
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No HSRP Bookings</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't made any HSRP bookings yet.
                  </p>
                  <Button onClick={() => navigate('/hsrp')}>
                    Book HSRP Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Rental Bookings Tab */}
          <TabsContent value="rentals">
            {rentalLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map(i => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : rentalBookings && rentalBookings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {rentalBookings.map((booking) => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Car className="h-5 w-5 text-primary" />
                            {booking.vehicle_name}
                          </CardTitle>
                          <CardDescription>
                            {booking.vehicle_type} • {booking.total_days} days
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {getStatusBadge(booking.status)}
                          <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {booking.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-20 text-muted-foreground">Pickup:</div>
                          <div>
                            <p className="font-medium">{booking.pickup_location}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(booking.pickup_date), 'dd MMM yyyy')} at {booking.pickup_time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-20 text-muted-foreground">Drop-off:</div>
                          <div>
                            <p className="font-medium">{booking.dropoff_location}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(booking.dropoff_date), 'dd MMM yyyy')} at {booking.dropoff_time}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(booking.total_amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Daily Rate</p>
                          <p className="font-medium">{formatCurrency(booking.daily_rate)}/day</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Car className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Rental Bookings</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't made any self-drive rental bookings yet.
                  </p>
                  <Button onClick={() => navigate('/self-drive')}>
                    Browse Rental Cars
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default MyBookings;
