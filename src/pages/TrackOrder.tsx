import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Search, Truck, MapPin, Clock, CheckCircle, Circle, Home, ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Helmet } from "react-helmet-async";

interface TrackingEvent {
  id: string;
  status: string;
  message: string;
  location: string | null;
  created_at: string;
}

interface OrderData {
  id: string;
  order_id: string | null;
  order_status: string;
  payment_status: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_city: string;
  shipping_state: string;
  shipping_address: string;
  shipping_pincode: string;
  items: any;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  tracking_number: string | null;
  courier_name: string | null;
  courier_tracking_url: string | null;
  estimated_delivery: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

const statusSteps = [
  { id: "placed", label: "Order Placed", icon: Package },
  { id: "confirmed", label: "Confirmed", icon: CheckCircle },
  { id: "processing", label: "Processing", icon: Clock },
  { id: "shipped", label: "Shipped", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Home },
];

const getStepIndex = (status: string) => {
  const map: Record<string, number> = {
    placed: 0, pending: 0, confirmed: 1, processing: 2,
    shipped: 3, out_for_delivery: 3, "out for delivery": 3,
    delivered: 4, completed: 4,
  };
  return map[status.toLowerCase()] ?? 0;
};

const TrackOrder = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [timeline, setTimeline] = useState<TrackingEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setOrder(null);
    setTimeline([]);

    try {
      // Search by order_id or phone number
      let orderQuery = supabase
        .from("accessory_orders")
        .select("*")
        .or(`order_id.eq.${trimmed},shipping_phone.eq.${trimmed}`)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: orders, error: orderErr } = await orderQuery;

      if (orderErr) throw orderErr;
      if (!orders || orders.length === 0) {
        setError("No order found. Please check your Order ID or phone number.");
        return;
      }

      const foundOrder = orders[0] as any;
      setOrder(foundOrder);

      // Fetch tracking timeline
      const { data: history } = await supabase
        .from("order_tracking_history")
        .select("*")
        .eq("order_id", foundOrder.id)
        .order("created_at", { ascending: true });

      setTimeline((history as TrackingEvent[]) || []);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? getStepIndex(order.order_status) : 0;
  const isCancelled = order?.order_status.toLowerCase() === "cancelled";

  return (
    <>
      <Helmet>
        <title>Track Your Order | GrabYourCar Accessories</title>
        <meta name="description" content="Track your accessory order status in real-time with order ID or phone number." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 sm:py-16">
          <div className="container max-w-2xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Package className="h-4 w-4" />
              Order Tracking
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Track Your Order
            </h1>
            <p className="text-muted-foreground mb-8">
              Enter your Order ID or registered phone number to check your order status
            </p>

            <div className="flex gap-2 max-w-lg mx-auto">
              <Input
                placeholder="Order ID or Phone Number"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                className="h-12 text-base"
              />
              <Button onClick={handleTrack} disabled={loading} size="lg" className="h-12 px-6">
                {loading ? (
                  <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Track
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="container max-w-3xl mx-auto px-4 py-8">
          {error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {order && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Order Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg">
                      Order {order.order_id || order.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <Badge variant={isCancelled ? "destructive" : order.order_status === "delivered" ? "default" : "secondary"}>
                      {order.order_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Placed on {format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Courier Info */}
                  {order.tracking_number && (
                    <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg text-sm">
                      <Truck className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium">{order.courier_name || "Courier"}</span>
                        <span className="text-muted-foreground mx-2">•</span>
                        <span className="font-mono">{order.tracking_number}</span>
                      </div>
                      {order.courier_tracking_url && (
                        <a href={order.courier_tracking_url} target="_blank" rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 text-xs font-medium">
                          Track <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {order.estimated_delivery && !isCancelled && order.order_status !== "delivered" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Estimated delivery: <span className="font-medium text-foreground">
                        {format(new Date(order.estimated_delivery), "dd MMM yyyy")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Progress Timeline */}
              {!isCancelled && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Order Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between relative py-4">
                      {/* Background line */}
                      <div className="absolute top-8 left-[10%] right-[10%] h-0.5 bg-border" />
                      {/* Active line */}
                      <div
                        className="absolute top-8 left-[10%] h-0.5 bg-primary transition-all duration-700"
                        style={{ width: `${(currentStep / (statusSteps.length - 1)) * 80}%` }}
                      />

                      {statusSteps.map((step, idx) => {
                        const Icon = step.icon;
                        const isCompleted = idx < currentStep;
                        const isCurrent = idx === currentStep;
                        return (
                          <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                              isCompleted && "bg-primary border-primary",
                              isCurrent && "bg-primary/20 border-primary animate-pulse",
                              !isCompleted && !isCurrent && "bg-card border-border",
                            )}>
                              {isCompleted ? (
                                <CheckCircle className="h-5 w-5 text-primary-foreground" />
                              ) : (
                                <Icon className={cn("h-5 w-5", isCurrent ? "text-primary" : "text-muted-foreground")} />
                              )}
                            </div>
                            <span className={cn(
                              "text-[10px] sm:text-xs font-medium mt-2 text-center",
                              isCompleted && "text-primary",
                              isCurrent && "text-foreground font-semibold",
                              !isCompleted && !isCurrent && "text-muted-foreground",
                            )}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Timeline */}
              {timeline.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Tracking Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-0">
                      {[...timeline].reverse().map((event, idx) => (
                        <div key={event.id} className="flex gap-3 relative">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "w-3 h-3 rounded-full mt-1.5 flex-shrink-0",
                              idx === 0 ? "bg-primary" : "bg-border",
                            )} />
                            {idx < timeline.length - 1 && (
                              <div className="w-px flex-1 bg-border" />
                            )}
                          </div>
                          <div className="pb-6">
                            <p className={cn(
                              "text-sm font-medium",
                              idx === 0 ? "text-foreground" : "text-muted-foreground",
                            )}>
                              {event.message || event.status}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.created_at), "dd MMM, hh:mm a")}
                              </span>
                              {event.location && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items & Shipping */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {Array.isArray(order.items) ? order.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.name || item.title} × {item.quantity || 1}</span>
                        <span className="font-medium">₹{item.price || item.total || 0}</span>
                      </div>
                    )) : (
                      <p className="text-muted-foreground">Items info unavailable</p>
                    )}
                    <Separator />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span><span>₹{order.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Delivery</span><span>₹{order.delivery_fee}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total</span><span>₹{order.total_amount}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Shipping To
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{order.shipping_name}</p>
                    <p className="text-muted-foreground">{order.shipping_phone}</p>
                    <p className="text-muted-foreground">
                      {order.shipping_address}, {order.shipping_city}, {order.shipping_state} — {order.shipping_pincode}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TrackOrder;
