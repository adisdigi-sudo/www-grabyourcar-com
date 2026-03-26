import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle,
  ChevronRight,
  Calendar,
  MapPin,
  CreditCard,
  ArrowLeft,
  Download,
  FileText
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { generateInvoice } from "@/lib/generateInvoice";
import { toast } from "sonner";
import { OrderTrackingTimeline } from "@/components/OrderTrackingTimeline";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface AccessoryOrder {
  id: string;
  order_id: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_status: string;
  order_status: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  created_at: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
    case "delivered":
    case "paid":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "processing":
    case "shipped":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "pending":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "cancelled":
    case "failed":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
    case "delivered":
    case "paid":
      return <CheckCircle className="h-4 w-4" />;
    case "processing":
    case "shipped":
      return <Truck className="h-4 w-4" />;
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "cancelled":
    case "failed":
      return <XCircle className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

const MyOrders = () => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<AccessoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("accessory_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Parse items from JSON
      const parsedOrders = (data || []).map((order) => ({
        ...order,
        items: typeof order.items === "string" ? JSON.parse(order.items) : order.items,
      }));

      setOrders(parsedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
              Sign in to view your orders
            </h1>
            <p className="text-muted-foreground mb-6">
              Track your accessory purchases and order history
            </p>
            <Link to="/auth">
              <Button variant="default" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/accessories" className="hover:text-primary transition-colors">Accessories</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">My Orders</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              My Orders
            </h1>
            <p className="text-muted-foreground">
              Track and manage your accessory purchases
            </p>
          </div>
          <Link to="/accessories">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                No orders yet
              </h2>
              <p className="text-muted-foreground mb-6">
                You haven't placed any accessory orders yet. Start shopping to see your orders here.
              </p>
              <Link to="/accessories">
                <Button variant="default">
                  Browse Accessories
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-secondary/30 py-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">
                          Order #{order.order_id || order.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className={getStatusColor(order.order_status)}>
                        {getStatusIcon(order.order_status)}
                        <span className="ml-1.5 capitalize">{order.order_status}</span>
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(order.payment_status)}>
                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                        <span className="capitalize">{order.payment_status}</span>
                      </Badge>
                      {(order.payment_status === "paid" || order.order_status === "delivered" || order.order_status === "completed") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-foreground border-primary/30 hover:bg-primary/10"
                          onClick={() => {
                            try {
                              generateInvoice(order);
                              toast.success("Invoice downloaded successfully!");
                            } catch (error) {
                              console.error("Error generating invoice:", error);
                              toast.error("Failed to generate invoice");
                            }
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* Order Tracking Timeline */}
                  <OrderTrackingTimeline
                    orderStatus={order.order_status}
                    paymentStatus={order.payment_status}
                    createdAt={order.created_at}
                  />
                  {/* Order Items */}
                  <div className="p-4 border-b border-border/50">
                    <div className="space-y-3">
                      {(order.items as OrderItem[]).slice(0, expandedOrder === order.id ? undefined : 2).map((item, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity} × ₹{item.price.toLocaleString()}
                            </p>
                          </div>
                          <p className="font-semibold text-foreground text-sm">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                      {(order.items as OrderItem[]).length > 2 && expandedOrder !== order.id && (
                        <button
                          onClick={() => setExpandedOrder(order.id)}
                          className="text-sm text-foreground hover:underline"
                        >
                          +{(order.items as OrderItem[]).length - 2} more items
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="p-4 grid md:grid-cols-2 gap-4">
                    {/* Shipping Address */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Shipping Address
                      </h4>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">{order.shipping_name}</p>
                          <p className="text-muted-foreground">
                            {order.shipping_address}, {order.shipping_city}
                          </p>
                          <p className="text-muted-foreground">
                            {order.shipping_state} - {order.shipping_pincode}
                          </p>
                          <p className="text-muted-foreground">{order.shipping_phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Order Total */}
                    <div className="md:text-right">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Order Summary
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between md:justify-end md:gap-4">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="text-foreground">₹{order.subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between md:justify-end md:gap-4">
                          <span className="text-muted-foreground">Delivery:</span>
                          <span className="text-foreground">
                            {order.delivery_fee > 0 ? `₹${order.delivery_fee.toLocaleString()}` : "Free"}
                          </span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between md:justify-end md:gap-4">
                          <span className="font-semibold text-foreground">Total:</span>
                          <span className="font-bold text-foreground text-lg">
                            ₹{order.total_amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MyOrders;
