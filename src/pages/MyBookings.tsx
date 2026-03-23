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
  Car, Shield, Calendar, MapPin, Phone, Mail, Clock,
  CheckCircle2, XCircle, AlertCircle, Loader2,
  FileText, Upload, CreditCard, Truck, Sparkles,
  ExternalLink, Download,
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
  agreement_url: string | null;
  pipeline_stage: string | null;
  created_at: string;
}

interface RentalAgreementInfo {
  id: string;
  booking_id: string | null;
  status: string;
  share_token: string | null;
  client_signed_at: string | null;
  agreement_number: string | null;
}

// ─── Journey Steps ────────────────────────────────────────────────
const JOURNEY_STEPS = [
  { key: "paid", label: "Payment", icon: CreditCard, description: "Payment received" },
  { key: "agreement", label: "Agreement", icon: FileText, description: "Sign rental agreement" },
  { key: "kyc", label: "KYC", icon: Upload, description: "Upload documents" },
  { key: "ready", label: "Vehicle Ready", icon: Truck, description: "Vehicle prepared for you" },
  { key: "pickup", label: "Pickup", icon: Car, description: "Collect your car" },
  { key: "complete", label: "Complete", icon: Sparkles, description: "Trip completed" },
];

function getJourneyStep(booking: RentalBooking, agreement?: RentalAgreementInfo | null): number {
  const stage = booking.pipeline_stage || booking.status;
  if (stage === "completed" || stage === "trip_complete") return 6;
  if (stage === "ongoing") return 5;
  // If vehicle is assigned and agreement signed
  if (agreement?.client_signed_at && (stage === "confirmed" || stage === "booking_payment")) return 4;
  if (agreement?.client_signed_at) return 3;
  if (agreement && agreement.status !== "draft") return 2;
  if (booking.payment_status === "paid") return 1;
  return 0;
}

function JourneyTracker({ currentStep, booking, agreement }: {
  currentStep: number; booking: RentalBooking; agreement?: RentalAgreementInfo | null;
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-muted" />
        <div className="absolute top-5 left-6 h-0.5 bg-emerald-500 transition-all duration-500"
          style={{ width: `${Math.max(0, ((currentStep - 1) / (JOURNEY_STEPS.length - 1)) * 100)}%`, maxWidth: "calc(100% - 48px)" }}
        />

        {JOURNEY_STEPS.map((step, i) => {
          const Icon = step.icon;
          const stepNum = i + 1;
          const isDone = currentStep >= stepNum;
          const isActive = currentStep === stepNum;
          return (
            <div key={step.key} className="flex flex-col items-center z-10 relative">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2
                ${isDone ? "bg-emerald-500 border-emerald-500 text-white" : ""}
                ${isActive ? "bg-primary border-primary text-primary-foreground scale-110 ring-4 ring-primary/20" : ""}
                ${!isDone && !isActive ? "bg-background border-muted text-muted-foreground" : ""}
              `}>
                {isDone && !isActive ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[9px] mt-1 font-medium text-center max-w-[60px] leading-tight ${
                isActive ? "text-primary" : isDone ? "text-emerald-600" : "text-muted-foreground"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action prompt based on current step */}
      {currentStep > 0 && currentStep < 6 && (
        <div className="mt-4 text-center">
          {currentStep === 1 && !agreement && (
            <p className="text-xs text-muted-foreground">⏳ Your rental agreement will be sent shortly via WhatsApp</p>
          )}
          {currentStep === 2 && agreement?.share_token && (
            <Button size="sm" variant="default" className="gap-1.5 text-xs" onClick={() =>
              window.open(`${window.location.origin}/agreement/${agreement.share_token}`, "_blank")
            }>
              <FileText className="h-3.5 w-3.5" /> Sign Agreement Now
            </Button>
          )}
          {currentStep === 3 && (
            <p className="text-xs text-muted-foreground">📄 Agreement signed! Upload KYC documents if not done yet</p>
          )}
          {currentStep === 4 && (
            <p className="text-xs text-emerald-600 font-medium">🚗 Your vehicle is being prepared for pickup!</p>
          )}
          {currentStep === 5 && (
            <p className="text-xs text-emerald-600 font-medium">🎉 Enjoy your trip! Drive safe.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
const MyBookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("rentals");

  // Fetch HSRP bookings
  const { data: hsrpBookings, isLoading: hsrpLoading } = useQuery({
    queryKey: ['myHsrpBookings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hsrp_bookings').select('*')
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
        .from('rental_bookings').select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RentalBooking[];
    },
    enabled: !!user?.id,
  });

  // Fetch agreements linked to user's bookings
  const bookingIds = rentalBookings?.map(b => b.id) || [];
  const { data: agreements } = useQuery({
    queryKey: ['myAgreements', bookingIds],
    queryFn: async () => {
      if (bookingIds.length === 0) return [];
      const { data, error } = await supabase
        .from('rental_agreements')
        .select('id, booking_id, status, share_token, client_signed_at, agreement_number')
        .in('booking_id', bookingIds);
      if (error) throw error;
      return data as RentalAgreementInfo[];
    },
    enabled: bookingIds.length > 0,
  });

  const getAgreementForBooking = (bookingId: string) => agreements?.find(a => a.booking_id === bookingId) || null;

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
      pending: { color: "bg-amber-100 text-amber-800", icon: Clock },
      confirmed: { color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
      ongoing: { color: "bg-emerald-100 text-emerald-800", icon: Car },
      completed: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
      cancelled: { color: "bg-red-100 text-red-800", icon: XCircle },
      processing: { color: "bg-blue-100 text-blue-800", icon: Loader2 },
      dispatched: { color: "bg-violet-100 text-violet-800", icon: Car },
      fitted: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
      paid: { color: "bg-emerald-100 text-emerald-800", icon: CreditCard },
    };
    const config = configs[status] || { color: "bg-muted text-muted-foreground", icon: AlertCircle };
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground mt-2">Track your bookings and complete formalities</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="rentals" className="gap-2">
              <Car className="h-4 w-4" />
              Rental Bookings ({rentalBookings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="hsrp" className="gap-2">
              <Shield className="h-4 w-4" />
              HSRP Bookings ({hsrpBookings?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* ═══════ RENTAL BOOKINGS ═══════ */}
          <TabsContent value="rentals">
            {rentalLoading ? (
              <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}</div>
            ) : rentalBookings && rentalBookings.length > 0 ? (
              <div className="space-y-5">
                {rentalBookings.map((booking) => {
                  const agreement = getAgreementForBooking(booking.id);
                  const journeyStep = getJourneyStep(booking, agreement);
                  const isPaid = booking.payment_status === "paid";

                  return (
                    <Card key={booking.id} className="overflow-hidden shadow-md">
                      {/* Header */}
                      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Car className="h-5 w-5 text-primary" />
                              {booking.vehicle_name}
                            </CardTitle>
                            <CardDescription>{booking.vehicle_type} • {booking.total_days} days</CardDescription>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {getStatusBadge(booking.status)}
                            {isPaid && (
                              <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                                <CreditCard className="h-3 w-3" /> Paid
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-2 space-y-4">
                        {/* Journey Tracker */}
                        {isPaid && (
                          <div className="bg-muted/30 rounded-xl p-3 border">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              Your Booking Journey
                            </h4>
                            <JourneyTracker currentStep={journeyStep} booking={booking} agreement={agreement} />
                          </div>
                        )}

                        {/* Booking Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-start gap-2">
                            <div className="w-20 text-muted-foreground shrink-0">Pickup:</div>
                            <div>
                              <p className="font-medium">{booking.pickup_location}</p>
                              <p className="text-muted-foreground text-xs">
                                {format(new Date(booking.pickup_date), 'dd MMM yyyy')} at {booking.pickup_time}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-20 text-muted-foreground shrink-0">Drop-off:</div>
                            <div>
                              <p className="font-medium">{booking.dropoff_location}</p>
                              <p className="text-muted-foreground text-xs">
                                {format(new Date(booking.dropoff_date), 'dd MMM yyyy')} at {booking.dropoff_time}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Price + Actions */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Amount</p>
                            <p className="text-xl font-bold text-primary">{formatCurrency(booking.total_amount)}</p>
                          </div>
                          <div className="flex gap-2">
                            {agreement?.share_token && !agreement.client_signed_at && (
                              <Button size="sm" className="gap-1.5" onClick={() =>
                                window.open(`${window.location.origin}/agreement/${agreement.share_token}`, "_blank")
                              }>
                                <FileText className="h-3.5 w-3.5" /> Sign Agreement
                              </Button>
                            )}
                            {agreement?.client_signed_at && (
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={() =>
                                window.open(`${window.location.origin}/agreement/${agreement.share_token}`, "_blank")
                              }>
                                <Download className="h-3.5 w-3.5" /> View Agreement
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Agreement status card */}
                        {agreement && (
                          <div className={`rounded-lg p-3 text-sm flex items-center justify-between ${
                            agreement.client_signed_at
                              ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200"
                              : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200"
                          }`}>
                            <div className="flex items-center gap-2">
                              {agreement.client_signed_at ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-600" />
                              )}
                              <div>
                                <span className="font-medium text-xs">
                                  {agreement.client_signed_at ? "Agreement Signed" : "Agreement Pending"}
                                </span>
                                <p className="text-[10px] text-muted-foreground">{agreement.agreement_number}</p>
                              </div>
                            </div>
                            {agreement.client_signed_at && (
                              <span className="text-[10px] text-emerald-600">
                                {format(new Date(agreement.client_signed_at), "dd MMM, h:mm a")}
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Car className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Rental Bookings</h3>
                  <p className="text-muted-foreground mb-4">You haven't made any self-drive rental bookings yet.</p>
                  <Button onClick={() => navigate('/self-drive')}>Browse Rental Cars</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════ HSRP BOOKINGS ═══════ */}
          <TabsContent value="hsrp">
            {hsrpLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map(i => (
                  <Card key={i}><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48" /></CardHeader>
                    <CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
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
                          <CardDescription>{booking.service_type} HSRP • {booking.vehicle_class}</CardDescription>
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
                          <MapPin className="h-4 w-4" /><span>{booking.state}, {booking.pincode}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" /><span>{format(new Date(booking.created_at), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" /><span>{booking.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" /><span className="truncate">{booking.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-lg font-bold text-primary">{formatCurrency(booking.payment_amount)}</p>
                        </div>
                        {booking.tracking_id && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Tracking ID</p>
                            <p className="font-mono text-sm">{booking.tracking_id}</p>
                          </div>
                        )}
                      </div>
                      {booking.home_installation && (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-2 rounded">
                          <CheckCircle2 className="h-4 w-4" /> Home Installation Requested
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
                  <p className="text-muted-foreground mb-4">You haven't made any HSRP bookings yet.</p>
                  <Button onClick={() => navigate('/hsrp')}>Book HSRP Now</Button>
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
