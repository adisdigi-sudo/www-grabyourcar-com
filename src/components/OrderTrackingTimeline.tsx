import { CheckCircle, Circle, Package, Truck, Home, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTrackingTimelineProps {
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
}

const trackingSteps = [
  { id: "placed", label: "Order Placed", icon: Package },
  { id: "confirmed", label: "Confirmed", icon: CheckCircle },
  { id: "processing", label: "Processing", icon: Clock },
  { id: "shipped", label: "Shipped", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Home },
];

const getStepStatus = (stepId: string, orderStatus: string, paymentStatus: string) => {
  const statusLower = orderStatus.toLowerCase();
  const paymentLower = paymentStatus.toLowerCase();

  // Map order status to step completion
  const statusMap: Record<string, number> = {
    pending: 0,
    confirmed: 1,
    processing: 2,
    shipped: 3,
    "out for delivery": 3,
    delivered: 4,
    completed: 4,
  };

  const currentStep = statusMap[statusLower] ?? 0;
  const stepIndex = trackingSteps.findIndex((s) => s.id === stepId);

  // If payment failed or order cancelled, show as failed
  if (paymentLower === "failed" || statusLower === "cancelled") {
    return stepIndex === 0 ? "failed" : "pending";
  }

  // If payment is pending, only first step is active
  if (paymentLower === "pending" && stepIndex > 0) {
    return "pending";
  }

  if (stepIndex < currentStep) return "completed";
  if (stepIndex === currentStep) return "current";
  return "pending";
};

export const OrderTrackingTimeline = ({
  orderStatus,
  paymentStatus,
  createdAt,
}: OrderTrackingTimelineProps) => {
  return (
    <div className="py-4 px-4 bg-secondary/30 border-b border-border/50">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Order Tracking
      </h4>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-border hidden sm:block" />
        
        {/* Steps */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0">
          {trackingSteps.map((step, index) => {
            const status = getStepStatus(step.id, orderStatus, paymentStatus);
            const Icon = step.icon;
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex sm:flex-col items-center gap-2 sm:gap-1 relative z-10",
                  "sm:flex-1"
                )}
              >
                {/* Icon Circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                    "border-2 flex-shrink-0",
                    status === "completed" && "bg-primary border-primary",
                    status === "current" && "bg-primary/20 border-primary animate-pulse",
                    status === "pending" && "bg-card border-border",
                    status === "failed" && "bg-destructive/10 border-destructive"
                  )}
                >
                  {status === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  ) : status === "failed" ? (
                    <Circle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        status === "current" ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-xs font-medium text-center whitespace-nowrap",
                    status === "completed" && "text-primary",
                    status === "current" && "text-foreground font-semibold",
                    status === "pending" && "text-muted-foreground",
                    status === "failed" && "text-destructive"
                  )}
                >
                  {step.label}
                </span>

                {/* Mobile connector line */}
                {index < trackingSteps.length - 1 && (
                  <div
                    className={cn(
                      "hidden",
                      "sm:hidden" // Hide on both mobile and desktop, desktop uses absolute line
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Animated progress overlay for desktop */}
        <div className="absolute top-4 left-4 h-0.5 bg-primary hidden sm:block transition-all duration-500" 
          style={{
            width: `${
              (trackingSteps.findIndex(
                (s) => getStepStatus(s.id, orderStatus, paymentStatus) === "current"
              ) /
                (trackingSteps.length - 1)) *
              100
            }%`,
          }}
        />
      </div>

      {/* Status message */}
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          {orderStatus.toLowerCase() === "delivered" || orderStatus.toLowerCase() === "completed" ? (
            <span className="text-primary font-medium">Your order has been delivered! 🎉</span>
          ) : orderStatus.toLowerCase() === "shipped" ? (
            "Your order is on the way!"
          ) : orderStatus.toLowerCase() === "processing" ? (
            "Your order is being prepared for shipping."
          ) : orderStatus.toLowerCase() === "cancelled" ? (
            <span className="text-destructive">This order has been cancelled.</span>
          ) : paymentStatus.toLowerCase() === "pending" ? (
            "Awaiting payment confirmation..."
          ) : (
            "Your order has been received and is being processed."
          )}
        </p>
      </div>
    </div>
  );
};
