import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Plus, Minus, Trash2, ShoppingBag, CreditCard, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useAuth } from "@/hooks/useAuth";
import { triggerWhatsApp } from "@/lib/whatsappTrigger";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ShippingDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export const CartSheet = () => {
  const { items, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart();
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const handleInputChange = (field: keyof ShippingDetails, value: string) => {
    setShippingDetails(prev => ({ ...prev, [field]: value }));
  };

  const validateShippingDetails = () => {
    const { name, phone, address, city, state, pincode } = shippingDetails;
    if (!name || !phone || !address || !city || !state || !pincode) {
      toast.error("Please fill all required fields");
      return false;
    }
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return false;
    }
    if (pincode.length !== 6) {
      toast.error("Please enter a valid 6-digit pincode");
      return false;
    }
    return true;
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    if (!user) {
      toast.error("Please login to checkout");
      navigate("/auth");
      return;
    }

    // Pre-fill email if available
    setShippingDetails(prev => ({
      ...prev,
      email: user.email || "",
    }));
    
    setIsCheckoutOpen(true);
  };

  const handlePayment = async () => {
    if (!validateShippingDetails()) return;
    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    setIsCreatingOrder(true);

    try {
      // Create order in database first
      const orderItems = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      }));

      const { data: order, error: orderError } = await supabase
        .from("accessory_orders")
        .insert({
          user_id: user.id,
          items: orderItems,
          subtotal: totalPrice,
          delivery_fee: 0,
          total_amount: totalPrice,
          shipping_name: shippingDetails.name,
          shipping_phone: shippingDetails.phone,
          shipping_email: shippingDetails.email || null,
          shipping_address: shippingDetails.address,
          shipping_city: shippingDetails.city,
          shipping_state: shippingDetails.state,
          shipping_pincode: shippingDetails.pincode,
        })
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
        throw new Error("Failed to create order");
      }

      // Initiate Razorpay payment
      await initiatePayment({
        amount: totalPrice,
        receipt: `ACC_${order.id.substring(0, 8)}`,
        bookingType: "accessories",
        bookingId: order.id,
        customerName: shippingDetails.name,
        customerEmail: shippingDetails.email || user.email || "",
        customerPhone: shippingDetails.phone,
        description: `Accessories Order - ${items.length} item(s)`,
        notes: {
          itemCount: String(items.length),
          city: shippingDetails.city,
        },
        onSuccess: () => {
          triggerWhatsApp({
            event: "accessory_order_placed",
            phone: shippingDetails.phone,
            name: shippingDetails.name,
            data: { items: String(items.length), amount: String(totalPrice) },
          });
          clearCart();
          setIsCheckoutOpen(false);
          setShippingDetails({
            name: "",
            phone: "",
            email: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
          });
          toast.success("Order placed successfully!");
        },
        onError: (error) => {
          console.error("Payment error:", error);
        },
      });
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to process checkout");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleWhatsAppCheckout = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    
    const orderSummary = items.map(item => `${item.name} x${item.quantity}`).join(', ');
    const message = `Hi, I'd like to order the following accessories:\n\n${orderSummary}\n\nTotal: ₹${totalPrice.toLocaleString()}`;
    const whatsappUrl = `https://wa.me/919876543210?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success("Redirecting to WhatsApp for order confirmation");
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary"
              >
                {totalItems}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Your Cart ({totalItems} items)
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <ShoppingCart className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Your cart is empty</h3>
                <p className="text-muted-foreground">Add some accessories to get started</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                      <p className="text-foreground font-semibold mt-1">₹{item.price.toLocaleString()}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-foreground">₹{totalPrice.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button onClick={handleCheckout} className="w-full" size="lg">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleWhatsAppCheckout} 
                    className="w-full"
                  >
                    Checkout via WhatsApp
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={clearCart} 
                    className="w-full text-muted-foreground"
                  >
                    Clear Cart
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipping Details</DialogTitle>
            <DialogDescription>
              Enter your shipping information to complete the order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={shippingDetails.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  placeholder="10-digit mobile"
                  value={shippingDetails.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Optional"
                  value={shippingDetails.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="House/Flat No., Street, Locality"
                value={shippingDetails.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={shippingDetails.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={shippingDetails.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                placeholder="6-digit pincode"
                value={shippingDetails.pincode}
                onChange={(e) => handleInputChange("pincode", e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-2 bg-secondary/50 p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{totalItems} item(s)</span>
                <span>₹{totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-green-600">Free</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-foreground">₹{totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <Button 
              onClick={handlePayment} 
              className="w-full" 
              size="lg"
              disabled={isCreatingOrder || isPaymentLoading}
            >
              {(isCreatingOrder || isPaymentLoading) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{totalPrice.toLocaleString()}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
