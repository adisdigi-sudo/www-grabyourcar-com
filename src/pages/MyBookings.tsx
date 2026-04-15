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
  Car, Shield, Calendar, MapPin, Phone, Clock,
  CheckCircle2, XCircle, AlertCircle, Loader2,
  FileText, Upload, CreditCard, Truck, Sparkles,
  Download, PackageCheck, UserCheck, FolderOpen, Gauge,
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
  assigned_vehicle_number: string | null;
  assigned_vehicle_color: string | null;
  odometer_start: number | null;
  fuel_level_start: string | null;
  kyc_verified: boolean | null;
  documents_status: Record<string, string> | null;
  handover_at: string | null;
  returned_at: string | null;
  feedback_rating: number | null;
  created_at: string;
}

interface AgreementInfo {
  id: string;
  booking_id: string | null;
  status: string;
  share_token: string | null;
  client_signed_at: string | null;
  agreement_number: string | null;
}

// ─── 8-Step Journey ────────────────────────────────────────────────
const JOURNEY_STEPS = [
  { key: "paid", label: "Payment", icon: CreditCard, description: "Payment confirmed" },
  { key: "agreement", label: "Agreement", icon: FileText, description: "Sign rental agreement" },
  { key: "kyc", label: "KYC", icon: UserCheck, description: "Upload & verify documents" },
  { key: "ready", label: "Vehicle Ready", icon: Car, description: "Vehicle assigned & prepared" },
  { key: "handover", label: "Handover", icon: PackageCheck, description: "Collect your car" },
  { key: "active", label: "Trip Active", icon: Gauge, description: "Enjoy your ride" },
  { key: "return", label: "Return", icon: Truck, description: "Return & inspection" },
  { key: "complete", label: "Complete", icon: Sparkles, description: "Trip completed" },
];

function getJourneyStep(booking: RentalBooking, agreement?: AgreementInfo | null): number {
  const stage = booking.pipeline_stage || booking.status;
  if (stage === "trip_complete" || stage === "completed") return 8;
  if (booking.returned_at) return 7;
  if (stage === "vehicle_handover" && booking.handover_at) return 6;
  if (stage === "vehicle_handover") return 5;
  if (booking.assigned_vehicle_number) return 4;
  if (booking.kyc_verified) return 3;
  if (agreement?.client_signed_at) return 3;
  if (agreement && agreement.status !== "draft") return 2;
  if (booking.payment_status === "paid") return 1;
  return 0;
}

function JourneyTracker({ currentStep, booking, agreement }: {
  currentStep: number; booking: RentalBooking; agreement?: AgreementInfo | null;
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-4 right-4 h-0.5 bg-muted" />
        <div className="absolute top-5 left-4 h-0.5 bg-emerald-500 transition-all duration-500"
          style={{ width: `${Math.max(0, ((currentStep - 1) / (JOURNEY_STEPS.length - 1)) * 100)}%`, maxWidth: "calc(100% - 32px)" }}
        />
        {JOURNEY_STEPS.map((step, i) => {
          const Icon = step.icon;
          const stepNum = i + 1;
          const isDone = currentStep >= stepNum;
          const isActive = currentStep === stepNum;
          return (
            <div key={step.key} className="flex flex-col items-center z-10 relative">
              <div className={`
                w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2
                ${isDone ? "bg-emerald-500 border-emerald-500 text-white" : ""}
                ${isActive ? "bg-primary border-primary text-primary-foreground scale-110 ring-4 ring-primary/20" : ""}
                ${!isDone && !isActive ? "bg-background border-muted text-muted-foreground" : ""}
              `}>
                {isDone && !isActive ? <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" /> : <Icon className="h-3 w-3 sm:h-4 sm:w-4" />}
              </div>
              <span className={`text-[7px] sm:text-[9px] mt-1 font-medium text-center max-w-[45px] sm:max-w-[60px] leading-tight ${
                isActive ? "text-primary" : isDone ? "text-emerald-600" : "text-muted-foreground"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {currentStep > 0 && currentStep < 8 && (
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
            <p className="text-xs text-muted-foreground">📄 Agreement signed! KYC verification in progress.</p>
          )}
          {currentStep === 4 && (
            <p className="text-xs text-emerald-600 font-medium">🚗 Your vehicle is being prepared for pickup!</p>
          )}
          {currentStep === 5 && (
            <div className="space-y-1">
              <p className="text-xs text-emerald-600 font-medium">🔑 Vehicle ready for pickup!</p>
              {booking.assigned_vehicle_number && (
                <p className="text-sm font-mono font-bold">{booking.assigned_vehicle_number} {booking.assigned_vehicle_color ? `(${booking.assigned_vehicle_color})` : ""}</p>
              )}
            </div>
          )}
          {currentStep === 6 && (
            <p className="text-xs text-emerald-600 font-medium">🎉 Enjoy your trip! Drive safe.</p>
          )}
          {currentStep === 7 && (
            <p className="text-xs text-amber-600 font-medium">🔍 Vehicle returned. Inspection in progress.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Document Status Card ──────────────────────────────────────────
function DocumentStatusCard({ booking }: { booking: RentalBooking }) {
  const docs = booking.documents_status || {};
  const docItems = [
    { key: "dl", label: "Driving License" },
    { key: "aadhaar", label: "Aadhaar Card" },
    { key: "address_proof", label: "Address Proof" },
    { key: "selfie", label: "Customer Selfie" },
  ];
  const verified = docItems.filter(d => docs[d.key] === "verified").length;
  const allDone = verified === docItems.length;

  return (
    <div className={`rounded-lg p-3 border ${allDone ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20" : "bg-amber-50 border-amber-200 dark:bg-amber-950/20"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FolderOpen className={`h-4 w-4 ${allDone ? "text-emerald-600" : "text-amber-600"}`} />
          <span className="text-xs font-semibold">{allDone ? "KYC Complete" : "Documents Required"}</span>
        </div>
        <Badge className={`text-[9px] ${allDone ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
          {verified}/{docItems.length}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {docItems.map(d => (
          <div key={d.key} className="flex items-center gap-1.5 text-[10px]">
            {docs[d.key] === "verified" ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            ) : (
              <Clock className="h-3 w-3 text-amber-600" />
            )}
            <span className={docs[d.key] === "verified" ? "text-emerald-700" : "text-amber-700"}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
const MyBookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("rentals");

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
      return data as AgreementInfo[];
    },
    enabled: bookingIds.length > 0,
  });

  const getAgreementForBooking = (bookingId: string) => agreements?.find(a => a.booking_id === bookingId) || null;

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
      documents: { color: "bg-cyan-100 text-cyan-800", icon: FolderOpen },
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
          <p className="text-muted-foreground mt-2">Track your bookings, documents & formalities</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="rentals" className="gap-2">
              <Car className="h-4 w-4" /> Rental Bookings ({rentalBookings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="hsrp" className="gap-2">
              <Shield className="h-4 w-4" /> HSRP Bookings ({hsrpBookings?.length || 0})
            </TabsTrigger>
          </TabsList>

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
                      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Car className="h-5 w-5 text-foreground" />
                              {booking.vehicle_name}
                            </CardTitle>
                            <CardDescription>
                              {booking.vehicle_type} • {booking.total_days} days
                              {booking.assigned_vehicle_number && (
                                <span className="ml-2 font-mono font-bold text-foreground">{booking.assigned_vehicle_number}</span>
                              )}
                            </CardDescription>
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
                        {/* 8-Step Journey Tracker */}
                        {isPaid && (
                          <div className="bg-muted/30 rounded-xl p-3 border">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              Your Booking Journey
                            </h4>
                            <JourneyTracker currentStep={journeyStep} booking={booking} agreement={agreement} />
                          </div>
                        )}

                        {/* Document Status */}
                        {isPaid && <DocumentStatusCard booking={booking} />}

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

                        {/* Vehicle Details */}
                        {booking.assigned_vehicle_number && (
                          <div className="rounded-lg p-3 border bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-indigo-600" />
                              <span className="text-xs font-semibold text-indigo-700">Assigned Vehicle</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                              <div><span className="text-muted-foreground">Reg No:</span><p className="font-mono font-bold">{booking.assigned_vehicle_number}</p></div>
                              {booking.assigned_vehicle_color && <div><span className="text-muted-foreground">Color:</span><p className="font-medium">{booking.assigned_vehicle_color}</p></div>}
                              {booking.odometer_start && <div><span className="text-muted-foreground">Odometer:</span><p className="font-medium">{booking.odometer_start} KM</p></div>}
                            </div>
                          </div>
                        )}

                        {/* Price + Actions */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Amount</p>
                            <p className="text-xl font-bold text-foreground">{formatCurrency(booking.total_amount)}</p>
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

                        {/* Agreement status */}
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
                  <Button onClick={() => navigate('/self-drive')} className="gap-2">
                    <Car className="h-4 w-4" /> Browse Rental Cars
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hsrp">
            {hsrpLoading ? (
              <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>
            ) : hsrpBookings && hsrpBookings.length > 0 ? (
              <div className="space-y-4">
                {hsrpBookings.map((booking) => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-foreground" />
                            {booking.registration_number}
                          </CardTitle>
                          <CardDescription>{booking.vehicle_class} • {booking.service_type}</CardDescription>
                        </div>
                        {getStatusBadge(booking.order_status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.state}</span>
                        </div>
                        {booking.scheduled_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(booking.scheduled_date), 'dd MMM yyyy')}</span>
                          </div>
                        )}
                        {booking.tracking_id && (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-xs">{booking.tracking_id}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <p className="text-lg font-bold text-foreground">{formatCurrency(booking.payment_amount)}</p>
                        {getStatusBadge(booking.payment_status)}
                      </div>
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
                  <Button onClick={() => navigate('/hsrp')} className="gap-2">
                    <Shield className="h-4 w-4" /> Book HSRP
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
