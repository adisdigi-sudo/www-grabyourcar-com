import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  amount: number;
  receipt: string;
  bookingType: "hsrp" | "rental";
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  notes?: Record<string, string>;
  onSuccess?: (paymentData: PaymentSuccessData) => void;
  onError?: (error: string) => void;
}

interface PaymentSuccessData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  booking: any;
}

export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Load Razorpay script on mount
  useEffect(() => {
    const loadScript = () => {
      if (window.Razorpay) {
        setIsScriptLoaded(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setIsScriptLoaded(true);
      script.onerror = () => {
        console.error("Failed to load Razorpay script");
        toast.error("Failed to load payment gateway");
      };
      document.body.appendChild(script);
    };

    loadScript();
  }, []);

  const initiatePayment = useCallback(
    async ({
      amount,
      receipt,
      bookingType,
      bookingId,
      customerName,
      customerEmail,
      customerPhone,
      description,
      notes = {},
      onSuccess,
      onError,
    }: RazorpayOptions) => {
      if (!isScriptLoaded) {
        toast.error("Payment gateway is still loading. Please try again.");
        onError?.("Payment gateway not loaded");
        return;
      }

      setIsLoading(true);

      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Please login to make payment");
        }

        // Create order via edge function
        const { data: orderData, error: orderError } = await supabase.functions.invoke(
          "razorpay-create-order",
          {
            body: {
              amount,
              receipt,
              bookingType,
              bookingId,
              notes,
            },
          }
        );

        if (orderError || !orderData?.success) {
          throw new Error(orderData?.error || orderError?.message || "Failed to create order");
        }

        const { order, key } = orderData;

        // Open Razorpay checkout
        const options = {
          key,
          amount: order.amount,
          currency: order.currency,
          name: "GrabYourCar",
          description,
          order_id: order.id,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          notes: {
            ...notes,
            bookingType,
            bookingId,
          },
          theme: {
            color: "#1a1a2e",
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              // Verify payment via edge function
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
                "razorpay-verify-payment",
                {
                  body: {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    bookingType,
                    bookingId,
                  },
                }
              );

              if (verifyError || !verifyData?.success) {
                throw new Error(verifyData?.error || "Payment verification failed");
              }

              toast.success("Payment successful! Booking confirmed.");
              onSuccess?.({
                ...response,
                booking: verifyData.booking,
              });
            } catch (err: any) {
              console.error("Payment verification error:", err);
              toast.error(err.message || "Payment verification failed");
              onError?.(err.message);
            } finally {
              setIsLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              toast.info("Payment cancelled");
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", (response: any) => {
          console.error("Payment failed:", response.error);
          toast.error(response.error?.description || "Payment failed");
          onError?.(response.error?.description || "Payment failed");
          setIsLoading(false);
        });
        razorpay.open();
      } catch (err: any) {
        console.error("Payment initiation error:", err);
        toast.error(err.message || "Failed to initiate payment");
        onError?.(err.message);
        setIsLoading(false);
      }
    },
    [isScriptLoaded]
  );

  return {
    initiatePayment,
    isLoading,
    isScriptLoaded,
  };
};
